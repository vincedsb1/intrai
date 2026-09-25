import type { AIAnalysis, CompanyAnalysis, Job, LocationAnalysis, Settings, SmartRule } from "@/lib/types";

function parseJsonb(value: unknown, field: string): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new TypeError(`PostgreSQL returned invalid JSONB for ${field}.`);
  }
}

function toIsoString(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  const dateValue = unwrapExtendedJsonDate(value);
  const date = dateValue instanceof Date ? dateValue : new Date(String(dateValue));
  if (!Number.isFinite(date.getTime())) throw new TypeError(`PostgreSQL returned an invalid timestamp for ${field}.`);
  return date.toISOString();
}

function unwrapExtendedJsonDate(value: unknown): unknown {
  if (typeof value !== "object" || value === null || value instanceof Date || Array.isArray(value)) {
    return value;
  }
  const record = value as Record<string, unknown>;
  if (!("$date" in record)) return value;
  const encodedDate = record.$date;
  if (typeof encodedDate === "object" && encodedDate !== null && "$numberLong" in encodedDate) {
    return new Date(Number((encodedDate as Record<string, unknown>).$numberLong));
  }
  return encodedDate;
}

function toRecord(value: unknown, field: string): Record<string, unknown> | null {
  const parsed = parseJsonb(value, field);
  if (parsed === null || parsed === undefined) return null;
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`PostgreSQL returned an invalid JSON object for ${field}.`);
  }
  return parsed as Record<string, unknown>;
}

function mapAiAnalysis(value: unknown): AIAnalysis | null {
  const analysis = toRecord(value, "ai_analysis");
  if (!analysis) return null;
  if (typeof analysis.isPlatformOrAgency !== "boolean") {
    throw new TypeError("PostgreSQL returned an invalid AI analysis flag.");
  }
  if (typeof analysis.type !== "string" || typeof analysis.reason !== "string") {
    throw new TypeError("PostgreSQL returned an invalid AI analysis result.");
  }
  return {
    isPlatformOrAgency: analysis.isPlatformOrAgency,
    type: analysis.type,
    reason: analysis.reason,
    createdAt: toIsoString(analysis.createdAt, "ai_analysis.createdAt"),
  };
}

function mapTags(value: unknown): string[] | undefined {
  const parsed = parseJsonb(value, "tags");
  if (parsed === null || parsed === undefined) return undefined;
  if (!Array.isArray(parsed) || parsed.some((tag) => typeof tag !== "string")) {
    throw new TypeError("PostgreSQL returned an invalid tags array.");
  }
  return parsed;
}

export function mapCompanyAnalysisRow(row: Record<string, unknown>): CompanyAnalysis {
  const id = requireText(row.id, "company_analyses.id");
  const companyName = requireText(row.companyName, "company_analyses.company_name");
  const isPlatformOrAgency = row.isPlatformOrAgency;
  if (typeof isPlatformOrAgency !== "boolean") {
    throw new TypeError("PostgreSQL returned an invalid company analysis flag.");
  }
  const createdAt = toIsoString(row.createdAt, "company_analyses.created_at");
  if (createdAt === null) throw new TypeError("PostgreSQL returned a null company analysis timestamp.");

  return {
    id,
    companyName,
    isPlatformOrAgency,
    type: requireText(row.type, "company_analyses.type"),
    reason: requireText(row.reason, "company_analyses.reason"),
    createdAt,
  };
}

export function mapLocationAnalysisRow(row: Record<string, unknown>): LocationAnalysis {
  const createdAt = toIsoString(row.createdAt, "location_analyses.created_at");
  if (createdAt === null) throw new TypeError("PostgreSQL returned a null location analysis timestamp.");

  return {
    id: requireText(row.id, "location_analyses.id"),
    rawLocation: requireText(row.rawLocation, "location_analyses.raw_location"),
    country: requireText(row.country, "location_analyses.country"),
    createdAt,
  };
}

export function mapJobRow(row: Record<string, unknown>): Job {
  const safeRow = { ...row };
  delete safeRow.source_ejson;

  const id = safeRow.id;
  if (typeof id !== "string") throw new TypeError("PostgreSQL returned a non-text job ID.");

  const { createdAt, updatedAt, visitedAt, aiAnalysis, tags, ...fields } = safeRow;
  return {
    ...fields,
    id,
    createdAt: toIsoString(createdAt, "jobs.created_at"),
    updatedAt: toIsoString(updatedAt, "jobs.updated_at"),
    visitedAt: toIsoString(visitedAt, "jobs.visited_at"),
    aiAnalysis: mapAiAnalysis(aiAnalysis),
    ...(tags === undefined ? {} : { tags: mapTags(tags) }),
  } as Job;
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== "string") throw new TypeError(`PostgreSQL returned a non-text value for ${field}.`);
  return value;
}

export function mapSettingsRow(row: Record<string, unknown>): Settings & { _id?: string } {
  const rulesValue = parseJsonb(row.rules, "settings.rules");
  const whitelistValue = parseJsonb(row.whitelist, "settings.whitelist");
  const blacklistValue = parseJsonb(row.blacklist, "settings.blacklist");
  if (!Array.isArray(rulesValue) || !rulesValue.every(isSmartRule)) {
    throw new TypeError("PostgreSQL returned an invalid settings rules array.");
  }
  if (!isStringArray(whitelistValue) || !isStringArray(blacklistValue)) {
    throw new TypeError("PostgreSQL returned invalid settings lists.");
  }

  const updatedAt = toIsoString(row.updatedAt, "settings.updated_at");
  if (updatedAt === null) throw new TypeError("PostgreSQL returned a null settings update timestamp.");
  const mongoId = row.mongoId;

  return {
    ...(typeof mongoId === "string" ? { _id: mongoId } : {}),
    whitelist: whitelistValue,
    blacklist: blacklistValue,
    rules: rulesValue,
    deduplicateCrossRegion: typeof row.deduplicateCrossRegion === "boolean" ? row.deduplicateCrossRegion : undefined,
    aiAnalysisEnabled: typeof row.aiAnalysisEnabled === "boolean" ? row.aiAnalysisEnabled : undefined,
    updatedAt,
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isSmartRule(value: unknown): value is SmartRule {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const rule = value as Record<string, unknown>;
  return (
    typeof rule.id === "string" &&
    typeof rule.name === "string" &&
    typeof rule.enabled === "boolean" &&
    Array.isArray(rule.conditions) &&
    rule.action === "FILTER"
  );
}
