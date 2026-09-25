import { describe, expect, it } from "vitest";
import {
  requireLocalPostgresTestUrl,
  requireLocalPostgresTestUrlFromEnv,
} from "@/tests/postgres/local-target";

describe("PostgreSQL integration target guard", () => {
  it("requires a dedicated test URL", () => {
    expect(() => requireLocalPostgresTestUrl(undefined)).toThrow(
      "INTRAI_TEST_DATABASE_URL is required for PostgreSQL integration tests."
    );
  });

  it("ignores DATABASE_URL and reads only the dedicated test URL", () => {
    expect(() =>
      requireLocalPostgresTestUrlFromEnv({
        DATABASE_URL: "postgres://remote.example/intrai_db",
      })
    ).toThrow("INTRAI_TEST_DATABASE_URL is required for PostgreSQL integration tests.");

    expect(
      requireLocalPostgresTestUrlFromEnv({
        DATABASE_URL: "postgres://remote.example/intrai_db",
        INTRAI_TEST_DATABASE_URL: "postgres://localhost:5432/intrai_db",
      })
    ).toBe("postgres://localhost:5432/intrai_db");
  });

  it.each([
    "postgres://localhost:5432/intrai_db",
    "postgres://127.0.0.2:5432/intrai_db",
    "postgres://[::1]:5432/intrai_db",
    "postgresql:///intrai_db?host=%2Fvar%2Frun%2Fpostgresql",
  ])("accepts local PostgreSQL target %s", (url) => {
    expect(requireLocalPostgresTestUrl(url)).toBe(url);
  });

  it("rejects remote hosts and other databases without echoing the URL", () => {
    const remoteUrl = "postgres://db.example.test:5432/intrai_db";
    expect(() => requireLocalPostgresTestUrl(remoteUrl)).toThrow(
      "PostgreSQL integration tests may only use a local database target."
    );
    expect(() => requireLocalPostgresTestUrl("postgres://localhost:5432/other_db")).toThrow(
      "The PostgreSQL integration database must be named intrai_db."
    );
  });
});
