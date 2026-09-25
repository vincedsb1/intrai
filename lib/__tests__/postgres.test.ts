import { afterEach, describe, expect, it } from "vitest";
import { getPool, safeDatabaseErrorMessage, safeErrorSummary } from "@/lib/postgres";

type PoolGlobal = typeof globalThis & { __intraiPostgresPool?: { end: () => Promise<void> } };
const testGlobal = globalThis as PoolGlobal;
const originalDatabaseUrl = process.env.DATABASE_URL;

afterEach(async () => {
  await testGlobal.__intraiPostgresPool?.end();
  delete testGlobal.__intraiPostgresPool;
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
  else process.env.DATABASE_URL = originalDatabaseUrl;
});

describe("PostgreSQL pool configuration", () => {
  it("fails clearly on first access when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    expect(() => getPool()).toThrow("DATABASE_URL is required to access PostgreSQL.");
  });

  it("requires verified TLS and uses a single-connection serverless pool", () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/intrai_db?sslmode=verify-full";
    const pool = getPool();

    expect(pool.options.max).toBe(1);
    expect(pool.options.idleTimeoutMillis).toBe(20_000);
    expect(pool.options.connectionTimeoutMillis).toBe(10_000);
    expect(pool.options.ssl).toMatchObject({ rejectUnauthorized: true });
  });

  it("rejects a connection string that disables TLS without echoing its contents", () => {
    const connectionString = "postgres://localhost:5432/intrai_db?sslmode=disable";
    process.env.DATABASE_URL = connectionString;

    try {
      getPool();
      throw new Error("Expected getPool to reject sslmode=disable.");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe("DATABASE_URL must enable TLS for PostgreSQL connections.");
      expect((error as Error).message).not.toContain(connectionString);
    }
  });

  it("rejects a URL targeting a different database", () => {
    process.env.DATABASE_URL = "postgres://localhost:5432/other_db?sslmode=verify-full";
    expect(() => getPool()).toThrow("DATABASE_URL must target the intrai_db database.");
  });

  it("reports missing configuration clearly while redacting database error details", () => {
    expect(safeErrorSummary(new Error("DATABASE_URL is required to access PostgreSQL."))).toBe(
      "DATABASE_URL is required to access PostgreSQL."
    );
    expect(safeDatabaseErrorMessage({ code: "23505", detail: "private row value" })).toBe(
      "PostgreSQL operation failed (23505)."
    );
  });
});
