import { randomUUID } from "node:crypto";

const importedIdPattern = /^[0-9a-f]{24}$/i;
const generatedIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createRecordId(): string {
  return randomUUID();
}

export function isSupportedRecordId(id: string): boolean {
  return importedIdPattern.test(id) || generatedIdPattern.test(id);
}

export function assertSupportedRecordId(id: string): void {
  if (!isSupportedRecordId(id)) throw new Error("Invalid record ID.");
}
