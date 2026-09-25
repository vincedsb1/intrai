export type SourceEjson =
  | null
  | boolean
  | number
  | string
  | SourceEjson[]
  | { [key: string]: SourceEjson };

function convertValue(value: unknown, ancestors: WeakSet<object>): SourceEjson | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("source_ejson cannot contain non-finite numbers.");
    return value;
  }
  if (typeof value === "bigint") return { $numberLong: value.toString() };
  if (value instanceof Date) {
    const epochMilliseconds = value.getTime();
    if (!Number.isFinite(epochMilliseconds)) throw new TypeError("source_ejson cannot contain invalid dates.");
    return { $date: { $numberLong: String(epochMilliseconds) } };
  }
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }
  if (typeof value !== "object") throw new TypeError("source_ejson contains an unsupported value.");
  if (ancestors.has(value)) throw new TypeError("source_ejson cannot contain circular references.");

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item) => convertValue(item, ancestors) ?? null);
    }

    const result: Record<string, SourceEjson> = {};
    for (const [key, item] of Object.entries(value)) {
      const converted = convertValue(item, ancestors);
      if (converted !== undefined) result[key] = converted;
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

export function toSourceEjson(value: Record<string, unknown>): Record<string, SourceEjson> {
  const converted = convertValue(value, new WeakSet());
  if (!converted || Array.isArray(converted) || typeof converted !== "object") {
    throw new TypeError("source_ejson must serialize to a JSON object.");
  }
  return converted;
}

export function stringifySourceEjson(value: Record<string, unknown>): string {
  return JSON.stringify(toSourceEjson(value));
}
