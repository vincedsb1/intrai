import { describe, expect, it } from "vitest";
import { mapCompanyAnalysisRow, mapJobRow, mapLocationAnalysisRow, mapSettingsRow } from "@/lib/row-mappers";

describe("PostgreSQL row mapping", () => {
  it("keeps a text job ID, normalizes dates, and never exposes source_ejson", () => {
    const createdAt = new Date("2026-09-24T10:30:00.000Z");
    const job = mapJobRow({
      id: "507f1f77bcf86cd799439011",
      createdAt,
      updatedAt: null,
      visitedAt: null,
      aiAnalysis: { isPlatformOrAgency: false, type: "Finale", reason: "Direct", createdAt },
      tags: ["react"],
      source_ejson: { privateArchive: true },
      title: "Engineer",
    });

    expect(job.id).toBe("507f1f77bcf86cd799439011");
    expect(job.createdAt).toBe("2026-09-24T10:30:00.000Z");
    expect(job.aiAnalysis?.createdAt).toBe("2026-09-24T10:30:00.000Z");
    expect(job.tags).toEqual(["react"]);
    expect(job).not.toHaveProperty("source_ejson");
  });

  it("preserves the settings API ID and validates JSONB values", () => {
    const settings = mapSettingsRow({
      mongoId: "507f1f77bcf86cd799439011",
      whitelist: ["React"],
      blacklist: ["Stage"],
      rules: [],
      deduplicateCrossRegion: false,
      aiAnalysisEnabled: true,
      updatedAt: new Date("2026-09-24T10:30:00.000Z"),
      source_ejson: { archived: true },
    });

    expect(settings._id).toBe("507f1f77bcf86cd799439011");
    expect(settings.updatedAt).toBe("2026-09-24T10:30:00.000Z");
    expect(settings).not.toHaveProperty("source_ejson");
    expect(() => mapSettingsRow({ ...settings, rules: { unexpected: true } })).toThrow(
      "PostgreSQL returned an invalid settings rules array."
    );
  });

  it("maps company and location cache rows without their archive columns", () => {
    const createdAt = new Date("2026-09-24T10:30:00.000Z");
    const company = mapCompanyAnalysisRow({
      id: "company-cache-id",
      companyName: "Acme",
      isPlatformOrAgency: false,
      type: "Finale",
      reason: "Éditeur",
      createdAt,
      source_ejson: { archived: true },
    });
    const location = mapLocationAnalysisRow({
      id: "location-cache-id",
      rawLocation: "Paris",
      country: "France",
      createdAt,
      source_ejson: { archived: true },
    });

    expect(company.id).toBe("company-cache-id");
    expect(location.id).toBe("location-cache-id");
    expect(company).not.toHaveProperty("source_ejson");
    expect(location).not.toHaveProperty("source_ejson");
  });

  it("reads an Extended JSON analysis date without exposing the source archive", () => {
    const job = mapJobRow({
      id: "507f1f77bcf86cd799439011",
      createdAt: null,
      aiAnalysis: {
        isPlatformOrAgency: false,
        type: "Finale",
        reason: "Direct",
        createdAt: { $date: { $numberLong: "1790245800000" } },
      },
    });

    expect(job.aiAnalysis?.createdAt).toBe(new Date(1790245800000).toISOString());
  });
});
