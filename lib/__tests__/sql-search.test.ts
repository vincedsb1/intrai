import { describe, expect, it } from "vitest";
import { toLiteralLikePattern } from "@/lib/sql-search";

describe("literal PostgreSQL search patterns", () => {
  it("trims the query and escapes SQL LIKE wildcards using a fixed escape character", () => {
    expect(toLiteralLikePattern("  100%_!\\  ")).toBe("%100!%!_!!\\%");
  });

  it("limits a non-empty search to 200 characters without accent normalization", () => {
    expect(toLiteralLikePattern(`${"é".repeat(201)} `)).toBe(`%${"é".repeat(200)}%`);
  });

  it("does not add a search predicate for an empty trimmed query", () => {
    expect(toLiteralLikePattern("  \t ")).toBeNull();
    expect(toLiteralLikePattern(undefined)).toBeNull();
  });
});
