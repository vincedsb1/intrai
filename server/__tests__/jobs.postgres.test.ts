import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  withTransaction: vi.fn(),
  clientQuery: vi.fn(),
}));

vi.mock("@/lib/postgres", () => ({
  query: mocks.query,
  withTransaction: mocks.withTransaction,
}));

vi.mock("@/server/rules-jobs.service", () => ({
  countJobsMatchingOlderThan: vi.fn(),
}));

import { getJobs, ingestJob, updateJobStatus } from "@/server/jobs.service";

describe("PostgreSQL job service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.withTransaction.mockImplementation(async (operation) => operation({ query: mocks.clientQuery }));
  });

  it("preserves inbox filters, literal case-insensitive search, paging, and archive-free projections", async () => {
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.includes("count(*)")) return { rows: [{ count: "1" }], rowCount: 1 };
      return {
        rows: [{
          id: "507f1f77bcf86cd799439011",
          createdAt: new Date("2026-09-24T10:30:00.000Z"),
          title: "C++ Engineer",
          aiAnalysis: null,
        }],
        rowCount: 1,
      };
    });

    const result = await getJobs({
      status: "INBOX",
      workMode: "remote",
      isEasyApply: true,
      country: "France",
      q: " C++ 100%_! ",
      page: 2,
      limit: 10,
    });

    const itemQuery = mocks.query.mock.calls.find(([sql]) => String(sql).includes("ORDER BY created_at DESC"));
    expect(itemQuery?.[0]).toContain("category IS DISTINCT FROM 'FILTERED'");
    expect(itemQuery?.[0]).toContain("ILIKE");
    expect(itemQuery?.[0]).toContain("ESCAPE '!'");
    expect(itemQuery?.[0]).not.toContain("source_ejson");
    expect(itemQuery?.[1]).toEqual(["INBOX", "remote", "France", "%C++ 100!%!_!!%", 10, 10]);
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe("507f1f77bcf86cd799439011");
  });

  it("inserts jobs with an ID string and a non-null Extended JSON archive", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string, values: unknown[] = []) => {
      if (sql.includes("SELECT settings_key AS")) return { rows: [{ settingsKey: 1 }], rowCount: 1 };
      if (sql.includes("FROM public.settings")) {
        return {
          rows: [{
            settingsKey: 1,
            mongoId: "507f1f77bcf86cd799439011",
            whitelist: ["React"],
            blacklist: ["Stage"],
            rules: [],
            deduplicateCrossRegion: false,
            aiAnalysisEnabled: true,
            updatedAt: new Date("2026-09-24T10:30:00.000Z"),
          }],
          rowCount: 1,
        };
      }
      if (sql.includes("WHERE url = $1")) return { rows: [], rowCount: 0 };
      if (sql.includes("INSERT INTO public.jobs")) {
        const [id, createdAt, title, company, location, country, url, logoUrl, rawString,
          parserGrade, category, status, matchedKeyword, workMode, salary, isActiveRecruiting,
          isEasyApply, isHighMatch, tags, visitedAt, aiAnalysis] = values;
        return {
          rows: [{
            id, createdAt, updatedAt: null, title, company, location, country, url, logoUrl,
            rawString, parserGrade, category, status, matchedKeyword, workMode, salary,
            isActiveRecruiting, isEasyApply, isHighMatch, tags: JSON.parse(String(tags)),
            visitedAt, aiAnalysis: aiAnalysis ? JSON.parse(String(aiAnalysis)) : null,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const result = await ingestJob({
      url: "https://example.test/jobs/1",
      title: "React Engineer",
      company: "Acme",
      location: "Paris",
      parserGrade: "A",
      rawString: "source offer",
      aiAnalysis: {
        isPlatformOrAgency: false,
        type: "Entreprise Finale",
        reason: "Produit propre",
        createdAt: new Date("2026-09-24T10:00:00.000Z"),
      },
    });

    const insert = mocks.clientQuery.mock.calls.find(([sql]) => String(sql).includes("INSERT INTO public.jobs"));
    const archive = JSON.parse(String(insert?.[1]?.[21]));
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(result.category).toBe("TARGET");
    expect(result.matchedKeyword).toBe("React");
    expect(archive._id).toBe(result.id);
    expect(archive.createdAt).toEqual({
      $date: { $numberLong: String(new Date(result.createdAt as string).getTime()) },
    });
    expect(archive.aiAnalysis.createdAt.$date.$numberLong).toBe(
      String(new Date("2026-09-24T10:00:00.000Z").getTime())
    );
    expect(insert?.[0]).toContain("source_ejson");
    expect(insert?.[0]).not.toContain("RETURNING source_ejson");
  });

  it("keeps imported IDs as text in status updates", async () => {
    mocks.query.mockResolvedValue({ rows: [], rowCount: 0 });
    await updateJobStatus("507f1f77bcf86cd799439011", "SAVED");
    expect(mocks.query.mock.calls[0][1][0]).toBe("507f1f77bcf86cd799439011");
  });

  it("refreshes only the timestamp for an existing URL and preserves its status", async () => {
    mocks.clientQuery.mockImplementation(async (sql: string) => {
      if (sql.includes("SELECT settings_key AS")) return { rows: [{ settingsKey: 1 }], rowCount: 1 };
      if (sql.includes("FROM public.settings")) {
        return {
          rows: [{
            settingsKey: 1,
            mongoId: "507f1f77bcf86cd799439011",
            whitelist: [], blacklist: [], rules: [],
            deduplicateCrossRegion: false, aiAnalysisEnabled: true,
            updatedAt: new Date("2026-09-24T10:30:00.000Z"),
          }],
          rowCount: 1,
        };
      }
      if (sql.includes("WHERE url = $1")) {
        return {
          rows: [{
            id: "507f1f77bcf86cd799439011",
            createdAt: new Date("2026-09-20T10:30:00.000Z"),
            updatedAt: null,
            title: "Saved role",
            company: "Acme",
            url: "https://example.test/jobs/saved",
            status: "SAVED",
            category: "TARGET",
            aiAnalysis: null,
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const result = await ingestJob({ url: "https://example.test/jobs/saved", title: "New title" });

    expect(result.id).toBe("507f1f77bcf86cd799439011");
    expect(result.status).toBe("SAVED");
    expect(result.title).toBe("Saved role");
    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).startsWith("INSERT INTO public.jobs"))).toBe(false);
    expect(mocks.clientQuery.mock.calls.some(([sql]) => String(sql).startsWith("UPDATE public.jobs SET updated_at"))).toBe(true);
  });
});
