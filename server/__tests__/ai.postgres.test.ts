import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), create: vi.fn() }));

vi.mock("@/lib/postgres", () => ({ query: mocks.query }));
vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: mocks.create } };
    constructor() {}
  },
}));

import { resolveCompanyAnalyses, resolveLocationAnalyses } from "@/server/ai.service";

const originalOpenAiKey = process.env.OPENAI_API_KEY;

describe("PostgreSQL AI cache service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-only-key";
  });

  afterAll(() => {
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
  });

  it("reads cache hits and inserts company analyses with IDs and source archive", async () => {
    mocks.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ results: [{
        company: "Acme",
        isPlatformOrAgency: false,
        type: "Entreprise Finale",
        reason: "Produit propre",
      }] }) } }],
    });
    mocks.query.mockImplementation(async (sql: string, values: unknown[] = []) => {
      if (sql.startsWith("SELECT") && sql.includes("company_analyses")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("INSERT INTO public.company_analyses")) {
        const [id, companyName, isPlatformOrAgency, type, reason, createdAt] = values;
        return {
          rows: [{ id, companyName, isPlatformOrAgency, type, reason, createdAt }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const results = await resolveCompanyAnalyses([" Acme ", "Acme"]);
    const insert = mocks.query.mock.calls.find(([sql]) => String(sql).startsWith("INSERT INTO public.company_analyses"));
    const archive = JSON.parse(String(insert?.[1]?.[6]));

    expect(results.get("Acme")).toMatchObject({ isPlatformOrAgency: false, type: "Entreprise Finale" });
    expect(mocks.create).toHaveBeenCalledOnce();
    expect(insert?.[1]?.[0]).toMatch(/^[0-9a-f-]{36}$/i);
    expect(archive._id).toBe(insert?.[1]?.[0]);
    expect(archive.createdAt.$date.$numberLong).toBeTruthy();
    expect(insert?.[0]).toContain("ON CONFLICT (company_name) DO NOTHING");
    expect(mocks.query.mock.calls.every(([sql]) => !String(sql).includes("SELECT source_ejson"))).toBe(true);
  });

  it("uses the winning concurrent location cache row after a unique conflict", async () => {
    mocks.create.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ results: [{ raw: "Paris", country: "France" }] }) } }],
    });
    mocks.query.mockImplementation(async (sql: string) => {
      if (sql.startsWith("SELECT") && sql.includes("location_analyses") && sql.includes("ANY")) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.startsWith("INSERT INTO public.location_analyses")) return { rows: [], rowCount: 0 };
      if (sql.startsWith("SELECT") && sql.includes("location_analyses")) {
        return {
          rows: [{
            id: "507f1f77bcf86cd799439011",
            rawLocation: "Paris",
            country: "France",
            createdAt: new Date("2026-09-24T10:30:00.000Z"),
          }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    });

    const results = await resolveLocationAnalyses(["Paris"]);
    const insert = mocks.query.mock.calls.find(([sql]) => String(sql).startsWith("INSERT INTO public.location_analyses"));
    const archive = JSON.parse(String(insert?.[1]?.[4]));

    expect(results.get("Paris")).toBe("France");
    expect(archive._id).toBe(insert?.[1]?.[0]);
    expect(archive.rawLocation).toBe("Paris");
    expect(archive.createdAt.$date.$numberLong).toBeTruthy();
  });
});
