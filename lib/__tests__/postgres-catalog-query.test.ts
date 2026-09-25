import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { MockPool, query } = vi.hoisted(() => {
  const query = vi.fn().mockResolvedValue({ rows: [] });
  const client = { query, release: vi.fn() };
  class MockPool {
    connect = vi.fn().mockResolvedValue(client);
    on = vi.fn();
  }
  return { MockPool, query };
});

vi.mock("pg", () => ({ Pool: MockPool }));

import { withTransaction } from "@/lib/postgres";

type PostgresPoolGlobal = typeof globalThis & {
  __intraiPostgresPool?: { end?: () => Promise<void> };
};

const postgresGlobal = globalThis as PostgresPoolGlobal;

describe("PostgreSQL unique-key catalog query", () => {
  beforeEach(() => {
    query.mockReset().mockResolvedValue({ rows: [] });
    process.env.DATABASE_URL = "postgres://localhost:5432/intrai_db?sslmode=verify-full";
    delete postgresGlobal.__intraiPostgresPool;
  });

  afterEach(async () => {
    await postgresGlobal.__intraiPostgresPool?.end?.();
    delete postgresGlobal.__intraiPostgresPool;
    delete process.env.DATABASE_URL;
  });

  it("casts catalog name values to text before aggregating columns", async () => {
    await expect(withTransaction(async () => undefined)).rejects.toThrow(
      "PostgreSQL schema contract mismatch:"
    );

    const uniqueKeyQuery = query.mock.calls[1]?.[0];
    expect(uniqueKeyQuery).toContain("attribute.attname::text AS column_name");
  });
});
