import "server-only";
import OpenAI from "openai";
import { createRecordId } from "@/lib/ids";
import { mapCompanyAnalysisRow, mapLocationAnalysisRow } from "@/lib/row-mappers";
import { query } from "@/lib/postgres";
import { stringifySourceEjson } from "@/lib/source-ejson";
import type { AIAnalysis, CompanyAnalysis, LocationAnalysis } from "@/lib/types";

let openaiClient: OpenAI | undefined;

function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for AI analysis.");
  openaiClient ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function uniqueTrimmed(values: (string | null)[]): string[] {
  return Array.from(new Set(
    values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim())
  ));
}

function cacheErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UNKNOWN_ERROR";
}

function companyProjection(): string {
  return `id, company_name AS "companyName", is_platform_or_agency AS "isPlatformOrAgency",
          type, reason, created_at AS "createdAt"`;
}

function locationProjection(): string {
  return `id, raw_location AS "rawLocation", country, created_at AS "createdAt"`;
}

export async function resolveCompanyAnalyses(companies: (string | null)[]): Promise<Map<string, AIAnalysis>> {
  const uniqueCompanies = uniqueTrimmed(companies);
  const resultsMap = new Map<string, AIAnalysis>();
  if (uniqueCompanies.length === 0) return resultsMap;

  const cached = await query<Record<string, unknown>>(
    `SELECT ${companyProjection()}
     FROM public.company_analyses
     WHERE company_name = ANY($1::text[])`,
    [uniqueCompanies]
  );
  const foundCompanies = new Set<string>();
  for (const row of cached.rows) {
    const analysis = mapCompanyAnalysisRow(row);
    resultsMap.set(analysis.companyName, {
      isPlatformOrAgency: analysis.isPlatformOrAgency,
      type: analysis.type,
      reason: analysis.reason,
      createdAt: analysis.createdAt,
    });
    foundCompanies.add(analysis.companyName);
  }

  const missingCompanies = uniqueCompanies.filter((company) => !foundCompanies.has(company));
  if (missingCompanies.length === 0) return resultsMap;

  const analyzed = await analyzeCompaniesBatch(missingCompanies);
  for (const analysis of analyzed) {
    if (!missingCompanies.includes(analysis.company)) continue;
    const persisted = await persistCompanyAnalysis(analysis);
    if (!persisted) continue;
    resultsMap.set(persisted.companyName, {
      isPlatformOrAgency: persisted.isPlatformOrAgency,
      type: persisted.type,
      reason: persisted.reason,
      createdAt: persisted.createdAt,
    });
  }
  return resultsMap;
}

async function persistCompanyAnalysis(input: BatchAnalysisResult): Promise<CompanyAnalysis | null> {
  const id = createRecordId();
  const createdAt = new Date();
  const sourceEjson = stringifySourceEjson({
    _id: id,
    companyName: input.company,
    isPlatformOrAgency: input.isPlatformOrAgency,
    type: input.type,
    reason: input.reason,
    createdAt,
  });
  const inserted = await query<Record<string, unknown>>(
    `INSERT INTO public.company_analyses
       (id, company_name, is_platform_or_agency, type, reason, created_at, source_ejson)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
     ON CONFLICT (company_name) DO NOTHING
     RETURNING ${companyProjection()}`,
    [id, input.company, input.isPlatformOrAgency, input.type, input.reason, createdAt, sourceEjson]
  );
  const row = inserted.rows[0] ?? (await query<Record<string, unknown>>(
    `SELECT ${companyProjection()} FROM public.company_analyses WHERE company_name = $1 LIMIT 1`,
    [input.company]
  )).rows[0];
  return row ? mapCompanyAnalysisRow(row) : null;
}

export async function resolveLocationAnalyses(locations: (string | null)[]): Promise<Map<string, string>> {
  const uniqueLocations = uniqueTrimmed(locations);
  const resultsMap = new Map<string, string>();
  if (uniqueLocations.length === 0) return resultsMap;

  const cached = await query<Record<string, unknown>>(
    `SELECT ${locationProjection()}
     FROM public.location_analyses
     WHERE raw_location = ANY($1::text[])`,
    [uniqueLocations]
  );
  const foundLocations = new Set<string>();
  for (const row of cached.rows) {
    const analysis = mapLocationAnalysisRow(row);
    resultsMap.set(analysis.rawLocation, analysis.country);
    foundLocations.add(analysis.rawLocation);
  }

  const missingLocations = uniqueLocations.filter((location) => !foundLocations.has(location));
  if (missingLocations.length === 0) return resultsMap;

  const analyzed = await analyzeLocationsBatch(missingLocations);
  for (const analysis of analyzed) {
    if (!missingLocations.includes(analysis.raw)) continue;
    const persisted = await persistLocationAnalysis(analysis);
    if (persisted) resultsMap.set(persisted.rawLocation, persisted.country);
  }
  return resultsMap;
}

async function persistLocationAnalysis(input: LocationBatchResult): Promise<LocationAnalysis | null> {
  const id = createRecordId();
  const createdAt = new Date();
  const sourceEjson = stringifySourceEjson({
    _id: id,
    rawLocation: input.raw,
    country: input.country,
    createdAt,
  });
  const inserted = await query<Record<string, unknown>>(
    `INSERT INTO public.location_analyses
       (id, raw_location, country, created_at, source_ejson)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     ON CONFLICT (raw_location) DO NOTHING
     RETURNING ${locationProjection()}`,
    [id, input.raw, input.country, createdAt, sourceEjson]
  );
  const row = inserted.rows[0] ?? (await query<Record<string, unknown>>(
    `SELECT ${locationProjection()} FROM public.location_analyses WHERE raw_location = $1 LIMIT 1`,
    [input.raw]
  )).rows[0];
  return row ? mapLocationAnalysisRow(row) : null;
}

interface BatchAnalysisResult {
  company: string;
  isPlatformOrAgency: boolean;
  type: string;
  reason: string;
}

async function analyzeCompaniesBatch(companies: string[]): Promise<BatchAnalysisResult[]> {
  const prompt = `Analyses la liste des entreprises suivantes et détermine pour chacune si c'est un Intermédiaire (ESN, Cabinet, Plateforme de freelance) ou une Entreprise Finale (Client qui recrute pour son propre produit/service).

Liste : ${JSON.stringify(companies)}

Définitions :
- "Entreprise Finale" : Recrute pour elle-même, édite son propre logiciel/produit (ex: Google, Kraken, Qonto, Startups SaaS).
- "ESN" : Entreprise de Services Numériques (ex: Capgemini, Sopra).
- "Cabinet de Recrutement" : Chasseur de tête (ex: Michael Page).
- "Plateforme Freelance" : Marketplace de mise en relation (ex: Malt, Toptal, Upwork).

Réponds UNIQUEMENT avec ce JSON exact :
{
  "results": [
    {
      "company": "Nom Exact",
      "isPlatformOrAgency": boolean (true si ESN/Cabinet/Plateforme, false si Entreprise Finale),
      "type": "Entreprise Finale" | "ESN" | "Cabinet de Recrutement" | "Plateforme Freelance",
      "reason": "Explication courte"
    }
  ]
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message.content;
    if (!content) return [];
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null || !("results" in parsed) || !Array.isArray(parsed.results)) {
      return [];
    }
    return parsed.results.filter(isBatchAnalysisResult);
  } catch (error) {
    console.error("AI Batch Analysis failed.", cacheErrorName(error));
    return [];
  }
}

function isBatchAnalysisResult(value: unknown): value is BatchAnalysisResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return typeof result.company === "string" &&
    typeof result.isPlatformOrAgency === "boolean" &&
    typeof result.type === "string" &&
    typeof result.reason === "string";
}

interface LocationBatchResult {
  raw: string;
  country: string;
}

async function analyzeLocationsBatch(locations: string[]): Promise<LocationBatchResult[]> {
  const prompt = `Normalise la liste des localisations suivantes en Pays (en Français).

Règles :
- Ville/Région -> Pays (ex: "Nantes" -> "France", "Texas" -> "États-Unis").
- "Union européenne", "EMEA", "Monde", "Global" -> "International".
- "Remote", "À distance", "Télétravail" (seuls) -> "International" (si pas de lieu précis).
- Si ambigu ou non géographique -> "Autre".

Liste : ${JSON.stringify(locations)}

Réponds UNIQUEMENT avec ce JSON exact :
{
  "results": [
    { "raw": "Nom Brut", "country": "Pays Normalisé" }
  ]
}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message.content;
    if (!content) return [];
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null || !("results" in parsed) || !Array.isArray(parsed.results)) {
      return [];
    }
    return parsed.results.filter(isLocationBatchResult);
  } catch (error) {
    console.error("AI Location Analysis failed.", cacheErrorName(error));
    return [];
  }
}

function isLocationBatchResult(value: unknown): value is LocationBatchResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  return typeof result.raw === "string" && typeof result.country === "string";
}

export async function analyzeJobAuthor(
  title: string,
  company: string
): Promise<Omit<AIAnalysis, "createdAt">> {
  const prompt = `Analyses cette offre d'emploi et détermine si l'auteur est une entreprise finale ou un intermédiaire (ESN, Cabinet de recrutement, Plateforme).
  
  Titre: ${title}
  Entreprise: ${company}

  Réponds uniquement au format JSON suivant :
  {
    "isPlatformOrAgency": boolean,
    "type": "Entreprise Finale" | "ESN" | "Cabinet de Recrutement" | "Plateforme",
    "reason": "Une explication courte en une phrase"
  }`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("Empty response from OpenAI");
    const parsed: unknown = JSON.parse(content);
    if (typeof parsed !== "object" || parsed === null) throw new TypeError("Invalid AI response.");
    const result = parsed as Record<string, unknown>;
    if (typeof result.isPlatformOrAgency !== "boolean" || typeof result.type !== "string" || typeof result.reason !== "string") {
      throw new TypeError("Invalid AI response.");
    }
    return {
      isPlatformOrAgency: result.isPlatformOrAgency,
      type: result.type,
      reason: result.reason,
    };
  } catch (error) {
    console.error("AI Analysis failed.", cacheErrorName(error));
    return {
      isPlatformOrAgency: false,
      type: "Analyse impossible",
      reason: "L'IA n'a pas pu répondre.",
    };
  }
}
