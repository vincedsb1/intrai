import { describe, expect, it, vi } from "vitest";
import type { PoolClient } from "pg";
import { runWithTransaction } from "@/lib/postgres";

function makeClient(queryImplementation?: (sql: string) => Promise<unknown>) {
  const query = vi.fn(async (sql: string) => queryImplementation?.(sql));
  const release = vi.fn();
  return { client: { query, release } as unknown as PoolClient, query, release };
}

describe("PostgreSQL transaction boundary", () => {
  it("commits once and releases the client after success", async () => {
    const { client, query, release } = makeClient();
    const result = await runWithTransaction(client, async () => "committed");

    expect(result).toBe("committed");
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back a failed operation and does not retry it", async () => {
    const { client, query, release } = makeClient();
    const operation = vi.fn(async () => {
      throw new Error("operation failed");
    });

    await expect(runWithTransaction(client, operation)).rejects.toThrow("operation failed");
    expect(operation).toHaveBeenCalledOnce();
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "ROLLBACK"]);
    expect(release).toHaveBeenCalledOnce();
  });

  it("does not replay a write after an uncertain commit", async () => {
    const commitError = new Error("commit connection lost");
    const { client, query, release } = makeClient(async (sql) => {
      if (sql === "COMMIT") throw commitError;
    });
    const operation = vi.fn(async () => "written");

    await expect(runWithTransaction(client, operation)).rejects.toBe(commitError);
    expect(operation).toHaveBeenCalledOnce();
    expect(query.mock.calls.map(([sql]) => sql)).toEqual(["BEGIN", "COMMIT", "ROLLBACK"]);
    expect(release).toHaveBeenCalledOnce();
  });
});
