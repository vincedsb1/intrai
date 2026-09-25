import { isIP } from "node:net";
import { parse as parseConnectionString } from "pg-connection-string";

function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const normalized = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (normalized.startsWith("/")) return true;

  const ipVersion = isIP(normalized);
  if (ipVersion === 4) return Number(normalized.split(".")[0]) === 127;
  return ipVersion === 6 && (normalized === "::1" || normalized === "0:0:0:0:0:0:0:1");
}

export function requireLocalPostgresTestUrl(value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error("INTRAI_TEST_DATABASE_URL is required for PostgreSQL integration tests.");
  }

  let parsed: ReturnType<typeof parseConnectionString>;
  try {
    parsed = parseConnectionString(value);
  } catch {
    throw new Error("INTRAI_TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (parsed.database !== "intrai_db") {
    throw new Error("The PostgreSQL integration database must be named intrai_db.");
  }
  if (!isLocalHost(parsed.host)) {
    throw new Error("PostgreSQL integration tests may only use a local database target.");
  }

  return value;
}

export function requireLocalPostgresTestUrlFromEnv(
  environment: Record<string, string | undefined> = process.env
): string {
  return requireLocalPostgresTestUrl(environment.INTRAI_TEST_DATABASE_URL);
}
