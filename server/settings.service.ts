import "server-only";
import type { PoolClient } from "pg";
import { createRecordId } from "@/lib/ids";
import { mapSettingsRow } from "@/lib/row-mappers";
import { stringifySourceEjson } from "@/lib/source-ejson";
import { withTransaction } from "@/lib/postgres";
import type { Settings, SmartRule } from "@/lib/types";
import { filterJobsForRule } from "./rules-jobs.service";

type MutableSettings = Pick<
  Settings,
  "whitelist" | "blacklist" | "rules" | "deduplicateCrossRegion" | "aiAnalysisEnabled"
>;
type SettingsUpdates = Partial<MutableSettings>;
type SettingsRow = Record<string, unknown>;

const DEFAULT_SETTINGS: MutableSettings = {
  whitelist: ["React", "Node.js", "TypeScript"],
  blacklist: ["Stage", "Alternance", "ESN"],
  rules: [],
  deduplicateCrossRegion: false,
  aiAnalysisEnabled: true,
};

const SETTINGS_PROJECTION = `
  settings_key AS "settingsKey",
  mongo_id AS "mongoId",
  whitelist,
  blacklist,
  rules,
  deduplicate_cross_region AS "deduplicateCrossRegion",
  ai_analysis_enabled AS "aiAnalysisEnabled",
  updated_at AS "updatedAt"`;

async function ensureSettingsRow(client: PoolClient): Promise<void> {
  const exists = await client.query<{ settingsKey: number }>(
    "SELECT settings_key AS \"settingsKey\" FROM public.settings WHERE settings_key = 1"
  );
  if (exists.rows.length > 0) return;

  const mongoId = createRecordId();
  const updatedAt = new Date();
  const sourceDocument = { _id: mongoId, ...DEFAULT_SETTINGS, updatedAt };
  await client.query(
    `INSERT INTO public.settings
       (settings_key, mongo_id, whitelist, blacklist, rules,
        deduplicate_cross_region, ai_analysis_enabled, updated_at, source_ejson)
     VALUES (1, $1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6, $7, $8::jsonb)
     ON CONFLICT (settings_key) DO NOTHING`,
    [
      mongoId,
      JSON.stringify(DEFAULT_SETTINGS.whitelist),
      JSON.stringify(DEFAULT_SETTINGS.blacklist),
      JSON.stringify(DEFAULT_SETTINGS.rules),
      DEFAULT_SETTINGS.deduplicateCrossRegion,
      DEFAULT_SETTINGS.aiAnalysisEnabled,
      updatedAt,
      stringifySourceEjson(sourceDocument),
    ]
  );
}

export async function readSettingsWithClient(
  client: PoolClient,
  lock = false
): Promise<Settings & { _id?: string }> {
  await ensureSettingsRow(client);
  const result = await client.query<SettingsRow>(
    `SELECT ${SETTINGS_PROJECTION}
     FROM public.settings
     WHERE settings_key = 1${lock ? " FOR UPDATE" : ""}`
  );
  const row = result.rows[0];
  if (!row) throw new Error("The PostgreSQL settings singleton could not be initialized.");
  return mapSettingsRow(row);
}

async function writeSettings(client: PoolClient, updates: SettingsUpdates): Promise<Settings & { _id?: string }> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const add = (column: string, value: unknown, cast?: string) => {
    values.push(cast ? JSON.stringify(value) : value);
    clauses.push(`${column} = $${values.length}${cast ? `::${cast}` : ""}`);
  };

  if (updates.whitelist !== undefined) add("whitelist", updates.whitelist, "jsonb");
  if (updates.blacklist !== undefined) add("blacklist", updates.blacklist, "jsonb");
  if (updates.rules !== undefined) add("rules", updates.rules, "jsonb");
  if (updates.deduplicateCrossRegion !== undefined) {
    add("deduplicate_cross_region", updates.deduplicateCrossRegion);
  }
  if (updates.aiAnalysisEnabled !== undefined) add("ai_analysis_enabled", updates.aiAnalysisEnabled);

  const updatedAt = new Date();
  values.push(updatedAt);
  clauses.push(`updated_at = $${values.length}`);
  values.push(1);

  const result = await client.query<SettingsRow>(
    `UPDATE public.settings
     SET ${clauses.join(", ")}
     WHERE settings_key = $${values.length}
     RETURNING ${SETTINGS_PROJECTION}`,
    values
  );
  const row = result.rows[0];
  if (!row) throw new Error("The PostgreSQL settings singleton could not be updated.");
  return mapSettingsRow(row);
}

function getUpdates(value: unknown): SettingsUpdates {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const updates: SettingsUpdates = {};
  if (Array.isArray(input.whitelist) && input.whitelist.every((item) => typeof item === "string")) {
    updates.whitelist = input.whitelist;
  }
  if (Array.isArray(input.blacklist) && input.blacklist.every((item) => typeof item === "string")) {
    updates.blacklist = input.blacklist;
  }
  if (Array.isArray(input.rules) && input.rules.every(isSmartRule)) updates.rules = input.rules;
  if (typeof input.deduplicateCrossRegion === "boolean") {
    updates.deduplicateCrossRegion = input.deduplicateCrossRegion;
  }
  if (typeof input.aiAnalysisEnabled === "boolean") updates.aiAnalysisEnabled = input.aiAnalysisEnabled;
  return updates;
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

function isTemporalFilterRule(rule: SmartRule): boolean {
  return rule.enabled && rule.action === "FILTER" && rule.conditions.some(
    (condition) => condition.field === "createdAt" && condition.operator === "olderThan"
  );
}

export async function getSettings(): Promise<Settings> {
  return withTransaction(async (client) => readSettingsWithClient(client));
}

export async function updateSettings(value: unknown): Promise<Settings> {
  const updates = getUpdates(value);
  return withTransaction(async (client) => {
    await readSettingsWithClient(client, true);
    return writeSettings(client, updates);
  });
}

/** Saves settings and applies newly added temporal rules in the same transaction. */
export async function updateSettingsAndFilterNewRules(
  value: unknown,
  now = new Date()
): Promise<{ settings: Settings; filteredCount: number }> {
  const updates = getUpdates(value);
  const input = typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  const removedRuleIds = new Set(
    Array.isArray(input.removedRuleIds)
      ? input.removedRuleIds.filter((id): id is string => typeof id === "string")
      : []
  );
  const explicitRemovalList = Array.isArray(input.removedRuleIds);
  return withTransaction(async (client) => {
    const current = await readSettingsWithClient(client, true);
    const incomingRuleIds = new Set((updates.rules ?? []).map((rule) => rule.id));
    const existingRuleIds = new Set(current.rules.map((rule) => rule.id));
    const isAddingRule = [...incomingRuleIds].some((id) => !existingRuleIds.has(id));
    const preserveConcurrentRules = explicitRemovalList || isAddingRule;
    const newRules = updates.rules === undefined
      ? current.rules
      : [
          ...updates.rules,
          ...(preserveConcurrentRules
            ? current.rules.filter((rule) => !incomingRuleIds.has(rule.id) && !removedRuleIds.has(rule.id))
            : []),
        ];
    const newlyAddedTemporalRules = newRules.filter(
      (rule) => !existingRuleIds.has(rule.id) && isTemporalFilterRule(rule)
    );

    let filteredCount = 0;
    for (const rule of newlyAddedTemporalRules) {
      filteredCount += await filterJobsForRule(client, rule, now);
    }

    return {
      settings: await writeSettings(client, { ...updates, ...(updates.rules ? { rules: newRules } : {}) }),
      filteredCount,
    };
  });
}
