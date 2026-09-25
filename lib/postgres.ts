import "server-only";
import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { parse as parseConnectionString, type ConnectionOptions } from "pg-connection-string";

type GlobalWithPostgresPool = typeof globalThis & {
  __intraiPostgresPool?: Pool;
};

const globalWithPostgresPool = globalThis as GlobalWithPostgresPool;
let productionPool: Pool | undefined;
const validatedClients = new WeakSet<PoolClient>();

const REQUIRED_COLUMNS: Record<string, Record<string, { udtName: string; notNull?: boolean }>> = {
  jobs: {
    id: { udtName: "text", notNull: true },
    created_at: { udtName: "timestamptz" },
    updated_at: { udtName: "timestamptz" },
    title: { udtName: "text" },
    company: { udtName: "text" },
    location: { udtName: "text" },
    country: { udtName: "text" },
    url: { udtName: "text" },
    logo_url: { udtName: "text" },
    raw_string: { udtName: "text" },
    parser_grade: { udtName: "text" },
    category: { udtName: "text" },
    status: { udtName: "text" },
    matched_keyword: { udtName: "text" },
    work_mode: { udtName: "text" },
    salary: { udtName: "text" },
    is_active_recruiting: { udtName: "bool" },
    is_easy_apply: { udtName: "bool" },
    is_high_match: { udtName: "bool" },
    visited_at: { udtName: "timestamptz" },
    ai_analysis: { udtName: "jsonb" },
    tags: { udtName: "jsonb" },
    source_ejson: { udtName: "jsonb", notNull: true },
  },
  settings: {
    settings_key: { udtName: "int4", notNull: true },
    mongo_id: { udtName: "text" },
    whitelist: { udtName: "jsonb" },
    blacklist: { udtName: "jsonb" },
    rules: { udtName: "jsonb" },
    deduplicate_cross_region: { udtName: "bool" },
    ai_analysis_enabled: { udtName: "bool" },
    updated_at: { udtName: "timestamptz" },
    source_ejson: { udtName: "jsonb", notNull: true },
  },
  company_analyses: {
    id: { udtName: "text", notNull: true },
    company_name: { udtName: "text", notNull: true },
    is_platform_or_agency: { udtName: "bool" },
    type: { udtName: "text" },
    reason: { udtName: "text" },
    created_at: { udtName: "timestamptz" },
    source_ejson: { udtName: "jsonb", notNull: true },
  },
  location_analyses: {
    id: { udtName: "text", notNull: true },
    raw_location: { udtName: "text", notNull: true },
    country: { udtName: "text" },
    created_at: { udtName: "timestamptz" },
    source_ejson: { udtName: "jsonb", notNull: true },
  },
};

const REQUIRED_UNIQUE_KEYS: Record<string, string[]> = {
  jobs: ["id"],
  settings: ["settings_key"],
  company_analyses: ["id", "company_name"],
  location_analyses: ["id", "raw_location"],
};

async function validateSchema(client: PoolClient): Promise<void> {
  if (validatedClients.has(client)) return;

  const columns = await client.query<{
    tableName: string;
    columnName: string;
    udtName: string;
    notNull: boolean;
  }>(
    `SELECT table_name AS "tableName", column_name AS "columnName",
            udt_name AS "udtName", is_nullable = 'NO' AS "notNull"
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = ANY($1::text[])`,
    [Object.keys(REQUIRED_COLUMNS)]
  );

  const observed = new Map(
    columns.rows.map((column) => [`${column.tableName}.${column.columnName}`, column])
  );
  const problems: string[] = [];
  for (const [tableName, requirements] of Object.entries(REQUIRED_COLUMNS)) {
    for (const [columnName, requirement] of Object.entries(requirements)) {
      const column = observed.get(`${tableName}.${columnName}`);
      if (!column) {
        problems.push(`${tableName}.${columnName} is missing`);
        continue;
      }
      if (column.udtName !== requirement.udtName) {
        problems.push(`${tableName}.${columnName} must use ${requirement.udtName}`);
      }
      if (requirement.notNull && !column.notNull) {
        problems.push(`${tableName}.${columnName} must be NOT NULL`);
      }
    }
  }

  const keys = await client.query<{ tableName: string; columns: string[] }>(
    `SELECT table_name AS "tableName", array_agg(column_name ORDER BY ordinal_position) AS columns
     FROM (
       SELECT table_class.relname AS table_name, index_info.indexrelid AS index_id, attribute.attname::text AS column_name,
              key_column.ordinality AS ordinal_position
       FROM pg_index index_info
       JOIN pg_class table_class ON table_class.oid = index_info.indrelid
       JOIN pg_namespace schema_info ON schema_info.oid = table_class.relnamespace
       JOIN LATERAL unnest(index_info.indkey) WITH ORDINALITY AS key_column(attnum, ordinality) ON true
       JOIN pg_attribute attribute ON attribute.attrelid = table_class.oid AND attribute.attnum = key_column.attnum
       WHERE schema_info.nspname = 'public'
         AND index_info.indisunique
         AND index_info.indpred IS NULL
         AND index_info.indexprs IS NULL
         AND key_column.ordinality <= index_info.indnkeyatts
     ) unique_keys
     GROUP BY table_name, index_id`
  );
  const uniqueKeys = new Set(keys.rows.map(({ tableName, columns }) => `${tableName}:${columns.join(",")}`));
  for (const [tableName, requiredKeys] of Object.entries(REQUIRED_UNIQUE_KEYS)) {
    for (const key of requiredKeys) {
      if (!uniqueKeys.has(`${tableName}:${key}`)) {
        problems.push(`${tableName} requires a unique key on (${key})`);
      }
    }
  }

  const settingsKeyColumn = observed.get("settings.settings_key");
  if (settingsKeyColumn?.udtName === "int4") {
    const unexpectedSettingsKey = await client.query(
      "SELECT 1 FROM public.settings WHERE settings_key <> 1 LIMIT 1"
    );
    if (unexpectedSettingsKey.rows.length > 0) {
      problems.push("settings contains a row whose settings_key is not 1");
    }
  }

  if (problems.length > 0) {
    throw new Error(`PostgreSQL schema contract mismatch: ${problems.join("; ")}.`);
  }
  validatedClients.add(client);
}

function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.trim()) {
    throw new Error("DATABASE_URL is required to access PostgreSQL.");
  }

  let parsed: ConnectionOptions;
  try {
    parsed = parseConnectionString(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection string.");
  }

  if (parsed.ssl === false) {
    throw new Error("DATABASE_URL must enable TLS for PostgreSQL connections.");
  }
  if (parsed.database !== "intrai_db") {
    throw new Error("DATABASE_URL must target the intrai_db database.");
  }

  const parsedSsl = parsed.ssl;
  const sslOptions =
    typeof parsedSsl === "object" && parsedSsl !== null
      ? {
          ...parsedSsl,
          ca: parsedSsl.ca ?? undefined,
          cert: parsedSsl.cert ?? undefined,
          key: parsedSsl.key ?? undefined,
        }
      : {};

  const pool = new Pool({
    ...parsed,
    host: parsed.host ?? undefined,
    port: parsed.port ? Number(parsed.port) : undefined,
    database: parsed.database ?? undefined,
    max: 1,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
    ssl: {
      ...sslOptions,
      rejectUnauthorized: true,
    },
  });

  pool.on("error", (error) => {
    console.error("[PostgreSQL] Idle client error", {
      code: postgresErrorCode(error) ?? "UNKNOWN",
    });
  });

  return pool;
}

export function getPool(): Pool {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required to access PostgreSQL.");
  }

  if (process.env.NODE_ENV === "production") {
    productionPool ??= createPool();
    return productionPool;
  }

  globalWithPostgresPool.__intraiPostgresPool ??= createPool();
  return globalWithPostgresPool.__intraiPostgresPool;
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await validateSchema(client);
  } catch (error) {
    client.release();
    throw error;
  }
  return runWithTransaction(client, operation);
}

export async function runWithTransaction<T>(
  client: PoolClient,
  operation: (client: PoolClient) => Promise<T>
): Promise<T> {
  let transactionStarted = false;
  let clientReleased = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;
    const result = await operation(client);
    await client.query("COMMIT");
    transactionStarted = false;
    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        const code =
          typeof rollbackError === "object" && rollbackError !== null && "code" in rollbackError
            ? String(rollbackError.code)
            : "UNKNOWN";
        console.error("[PostgreSQL] Transaction rollback failed", { code });
        client.release(rollbackError instanceof Error ? rollbackError : new Error("Rollback failed"));
        clientReleased = true;
        throw error;
      }
    }
    throw error;
  } finally {
    if (!clientReleased) client.release();
  }
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  values: readonly unknown[] = []
): Promise<QueryResult<T>> {
  const client = await getPool().connect();
  try {
    await validateSchema(client);
    return await client.query<T>(sql, [...values]);
  } finally {
    client.release();
  }
}

export function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = error.code;
  return typeof code === "string" ? code : undefined;
}

export function safeDatabaseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("DATABASE_URL ")) return error.message;
  const code = postgresErrorCode(error);
  return code ? `PostgreSQL operation failed (${code}).` : "PostgreSQL operation failed.";
}

export function safeErrorSummary(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("DATABASE_URL ")) return error.message;
  const code = postgresErrorCode(error);
  if (code) return `Database operation failed (${code}).`;
  return error instanceof Error ? error.name : "UNKNOWN_ERROR";
}

export function logDatabaseError(context: string, error: unknown): void {
  console.error(context, safeDatabaseErrorMessage(error));
}
