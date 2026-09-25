import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  withTransaction: vi.fn(),
  clientQuery: vi.fn(),
  filterJobsForRule: vi.fn(),
}));

vi.mock("@/lib/postgres", () => ({ withTransaction: mocks.withTransaction }));
vi.mock("@/server/rules-jobs.service", () => ({ filterJobsForRule: mocks.filterJobsForRule }));

import { getSettings, updateSettingsAndFilterNewRules } from "@/server/settings.service";
const testClient = { query: mocks.clientQuery };

const now = new Date("2026-09-24T10:30:00.000Z");
const originalRule = {
  id: "rule-existing",
  name: "Existing",
  enabled: true,
  conditions: [{ id: "c1", field: "title", operator: "contains", value: "React" }],
  action: "FILTER" as const,
};
const concurrentRule = {
  id: "rule-concurrent",
  name: "Concurrent",
  enabled: true,
  conditions: [{ id: "c3", field: "company", operator: "contains", value: "Acme" }],
  action: "FILTER" as const,
};
const temporalRule = {
  id: "rule-old",
  name: "Older than 30 days",
  enabled: true,
  conditions: [{ id: "c2", field: "createdAt", operator: "olderThan", value: 30 }],
  action: "FILTER" as const,
};

function settingsRow(rules: unknown[] = [originalRule]) {
  return {
    settingsKey: 1,
    mongoId: "507f1f77bcf86cd799439011",
    whitelist: ["React"],
    blacklist: ["Stage"],
    rules,
    deduplicateCrossRegion: false,
    aiAnalysisEnabled: true,
    updatedAt: now,
  };
}

describe("PostgreSQL settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withTransaction.mockImplementation(async (operation) => operation(testClient));
    mocks.filterJobsForRule.mockResolvedValue(3);
  });

  it("locks the singleton, filters new temporal rules, and persists them in the same transaction", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values: unknown[] = []) => {
      if (sql.includes("SELECT settings_key AS")) return { rows: [{ settingsKey: 1 }], rowCount: 1 };
      if (sql.includes("FROM public.settings") && sql.includes("FOR UPDATE")) {
        return { rows: [settingsRow([originalRule, concurrentRule])], rowCount: 1 };
      }
      if (sql.startsWith("UPDATE public.settings")) {
        const updates = JSON.parse(String(values[0]));
        return {
          rows: [{ ...settingsRow(JSON.parse(String(values[1]))), whitelist: updates }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const result = await updateSettingsAndFilterNewRules({
      whitelist: ["React", "Node.js"],
      rules: [originalRule, temporalRule],
      removedRuleIds: [],
    }, now);

    expect(mocks.withTransaction).toHaveBeenCalledOnce();
    expect(mocks.filterJobsForRule).toHaveBeenCalledOnce();
    expect(mocks.filterJobsForRule.mock.calls[0][0]).toBe(testClient);
    expect(mocks.filterJobsForRule.mock.calls[0][1]).toEqual(temporalRule);
    expect(mocks.filterJobsForRule.mock.calls[0][2]).toBe(now);
    expect(result.filteredCount).toBe(3);
    expect(result.settings.rules).toEqual([originalRule, temporalRule, concurrentRule]);

    const update = mocks.clientQuery.mock.calls.find(([sql]) => String(sql).startsWith("UPDATE public.settings"));
    expect(update?.[0]).not.toContain("source_ejson");
    expect(update?.[0]).toContain("whitelist = $1::jsonb");
    expect(update?.[0]).toContain("rules = $2::jsonb");
  });

  it("creates a missing singleton with an ID string and archive JSONB", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT settings_key AS")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("INSERT INTO public.settings")) return { rows: [], rowCount: 1 };
      if (sql.includes("FROM public.settings")) return { rows: [settingsRow([])], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    });

    const result = await getSettings();
    const insert = mocks.clientQuery.mock.calls.find(([sql]) => String(sql).startsWith("INSERT INTO public.settings"));
    const archive = JSON.parse(String(insert?.[1]?.[7]));

    expect(result.rules).toEqual([]);
    expect(insert?.[0]).toContain("ON CONFLICT (settings_key) DO NOTHING");
    expect(archive._id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(archive.updatedAt.$date.$numberLong).toBeTruthy();
    expect(insert?.[0]).toContain("source_ejson");
  });
});
