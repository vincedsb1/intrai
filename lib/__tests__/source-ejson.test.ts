import { describe, expect, it } from "vitest";
import { stringifySourceEjson, toSourceEjson } from "@/lib/source-ejson";

describe("source_ejson serialization", () => {
  it("preserves text IDs and encodes dates as canonical Extended JSON", () => {
    const createdAt = new Date("2026-09-24T10:30:00.123Z");
    const result = toSourceEjson({
      _id: "507f1f77bcf86cd799439011",
      createdAt,
      aiAnalysis: { createdAt },
      tags: ["react", "remote"],
    });

    expect(result).toEqual({
      _id: "507f1f77bcf86cd799439011",
      createdAt: { $date: { $numberLong: String(createdAt.getTime()) } },
      aiAnalysis: { createdAt: { $date: { $numberLong: String(createdAt.getTime()) } } },
      tags: ["react", "remote"],
    });
    expect(stringifySourceEjson({ id: "507f1f77bcf86cd799439011" })).not.toContain("$oid");
  });

  it("omits undefined object fields and rejects invalid dates", () => {
    expect(toSourceEjson({ id: "new-id", absent: undefined })).toEqual({ id: "new-id" });
    expect(() => toSourceEjson({ createdAt: new Date(Number.NaN) })).toThrow(
      "source_ejson cannot contain invalid dates."
    );
  });

  it("rejects cyclic source records", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    expect(() => toSourceEjson(cyclic)).toThrow("source_ejson cannot contain circular references.");
  });
});
