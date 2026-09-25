import { describe, expect, it } from "vitest";
import { assertSupportedRecordId, createRecordId, isSupportedRecordId } from "@/lib/ids";

describe("text record IDs", () => {
  it("generates UUIDs that remain ordinary text values", () => {
    const id = createRecordId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(isSupportedRecordId(id)).toBe(true);
  });

  it("accepts imported 24-character hexadecimal IDs without changing their spelling", () => {
    const importedId = "507F1F77BCF86CD799439011";
    assertSupportedRecordId(importedId);
    expect(importedId).toBe("507F1F77BCF86CD799439011");
  });

  it("rejects malformed IDs", () => {
    expect(() => assertSupportedRecordId("not-an-id")).toThrow("Invalid record ID.");
  });
});
