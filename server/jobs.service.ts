import "server-only";
import type { PoolClient, QueryResultRow } from "pg";
import { INBOX_PAGE_SIZE } from "@/lib/constants";
import { assertSupportedRecordId, createRecordId } from "@/lib/ids";
import { mapJobRow } from "@/lib/row-mappers";
import { query, withTransaction } from "@/lib/postgres";
import { stringifySourceEjson } from "@/lib/source-ejson";
import { toLiteralLikePattern } from "@/lib/sql-search";
import type { GetJobsResult, Job, JobCategory, JobStatus, Settings } from "@/lib/types";
import { evaluateRule } from "./rules.engine";
import { countJobsMatchingOlderThan as countOlderThan } from "./rules-jobs.service";
import { readSettingsWithClient } from "./settings.service";

type JobRow = QueryResultRow & Record<string, unknown>;

const JOB_PROJECTION = `
  id,
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  title,
  company,
  location,
  country,
  url,
  logo_url AS "logoUrl",
  raw_string AS "rawString",
  parser_grade AS "parserGrade",
  category,
  status,
  matched_keyword AS "matchedKeyword",
  work_mode AS "workMode",
  salary,
  is_active_recruiting AS "isActiveRecruiting",
  is_easy_apply AS "isEasyApply",
  is_high_match AS "isHighMatch",
  tags,
  visited_at AS "visitedAt",
  ai_analysis AS "aiAnalysis"`;

interface JobFilters {
  status?: JobStatus;
  category?: JobCategory;
  workMode?: string;
  isEasyApply?: boolean;
  country?: string;
  q?: string;
}

type AvailableCountryFilters = Pick<JobFilters, "status" | "workMode" | "isEasyApply" | "q">;

function buildJobWhere(filters: JobFilters, options: { country?: boolean } = {}): {
  clause: string;
  values: unknown[];
} {
  const conditions: string[] = [];
  const values: unknown[] = [];
  const add = (condition: (placeholder: string) => string, value: unknown) => {
    values.push(value);
    conditions.push(condition(`$${values.length}`));
  };

  if (filters.status) add((placeholder) => `status = ${placeholder}`, filters.status);
  if (filters.status === "INBOX" && !filters.category) {
    conditions.push("category IS DISTINCT FROM 'FILTERED'");
  } else if (filters.category) {
    add((placeholder) => `category = ${placeholder}`, filters.category);
  }
  if (filters.workMode && filters.workMode !== "all") {
    add((placeholder) => `work_mode = ${placeholder}`, filters.workMode);
  }
  if (filters.isEasyApply === true) conditions.push("is_easy_apply IS TRUE");
  if (options.country !== false && filters.country && filters.country !== "all") {
    add((placeholder) => `country = ${placeholder}`, filters.country);
  }

  const pattern = toLiteralLikePattern(filters.q);
  if (pattern) {
    values.push(pattern);
    const placeholder = `$${values.length}`;
    conditions.push(`(title ILIKE ${placeholder} ESCAPE '!' OR company ILIKE ${placeholder} ESCAPE '!')`);
  }

  return { clause: conditions.length > 0 ? conditions.join(" AND ") : "TRUE", values };
}

export async function getJobs(filters: JobFilters & { page?: number; limit?: number }): Promise<GetJobsResult> {
  const rawPage = filters.page ?? 1;
  const page = !Number.isFinite(rawPage) || rawPage < 1 ? 1 : Math.floor(rawPage);
  const rawLimit = filters.limit ?? INBOX_PAGE_SIZE;
  const limit = !Number.isFinite(rawLimit) || rawLimit < 1 ? INBOX_PAGE_SIZE : Math.floor(rawLimit);
  const offset = (page - 1) * limit;
  const { clause, values } = buildJobWhere(filters);
  const [itemsResult, countResult] = await Promise.all([
    query<JobRow>(
      `SELECT ${JOB_PROJECTION}
       FROM public.jobs
       WHERE ${clause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    ),
    query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.jobs WHERE ${clause}`,
      values
    ),
  ]);

  return {
    items: itemsResult.rows.map((row) => mapJobRow(row)),
    total: Number(countResult.rows[0]?.count ?? 0),
  };
}

export async function getAvailableCountries(filters: AvailableCountryFilters): Promise<string[]> {
  const { clause, values } = buildJobWhere(filters, { country: false });
  const result = await query<{ country: unknown }>(
    `SELECT DISTINCT country
     FROM public.jobs
     WHERE ${clause}
       AND country IS NOT NULL
       AND country <> ''
     ORDER BY country`,
    values
  );
  return result.rows.flatMap(({ country }) => typeof country === "string" ? [country] : []);
}

export async function getJobForAnalysis(id: string): Promise<Pick<Job, "id" | "title" | "company"> | null> {
  assertSupportedRecordId(id);
  const result = await query<{ id: string; title: string | null; company: string | null }>(
    `SELECT id, title, company FROM public.jobs WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function persistJobAnalysis(id: string, analysis: Job["aiAnalysis"]): Promise<void> {
  assertSupportedRecordId(id);
  await query(
    `UPDATE public.jobs SET ai_analysis = $2::jsonb WHERE id = $1`,
    [id, analysis === null || analysis === undefined ? null : JSON.stringify(analysis)]
  );
}

export async function updateJobStatus(id: string, status: JobStatus): Promise<void> {
  assertSupportedRecordId(id);
  await query("UPDATE public.jobs SET status = $2, updated_at = $3 WHERE id = $1", [id, status, new Date()]);
}

export async function banAuthor(company: string): Promise<void> {
  await withTransaction(async (client) => {
    const settings = await readSettingsWithClient(client, true);
    if (!settings.blacklist.includes(company)) {
      const blacklist = [...settings.blacklist, company];
      await client.query(
        `UPDATE public.settings
         SET blacklist = $1::jsonb, updated_at = $2
         WHERE settings_key = 1`,
        [JSON.stringify(blacklist), new Date()]
      );
    }

    const now = new Date();
    await client.query(
      `UPDATE public.jobs
       SET category = 'FILTERED', matched_keyword = $2, updated_at = $3
       WHERE company = $1`,
      [company, company, now]
    );
  });
}

export async function restoreJob(id: string): Promise<void> {
  assertSupportedRecordId(id);
  await query(
    `UPDATE public.jobs
     SET status = 'INBOX', category = 'EXPLORE', matched_keyword = NULL, updated_at = $2
     WHERE id = $1`,
    [id, new Date()]
  );
}

export async function toggleJobVisited(id: string, visited: boolean): Promise<void> {
  assertSupportedRecordId(id);
  const now = new Date();
  await query(
    `UPDATE public.jobs
     SET visited_at = $2, updated_at = $3
     WHERE id = $1`,
    [id, visited ? now : null, now]
  );
}

function classifyJob(
  job: Partial<Job>,
  settings: Settings,
  crossRegionDuplicate: boolean
): { category: JobCategory; matchedKeyword: string | null } {
  let category: JobCategory = crossRegionDuplicate ? "FILTERED" : "EXPLORE";
  let matchedKeyword: string | null = crossRegionDuplicate ? "Doublon (Titre/Entreprise)" : null;

  const company = job.company?.toLowerCase() ?? "";
  const title = job.title?.toLowerCase() ?? "";
  for (const term of settings.blacklist) {
    const lowerTerm = term.toLowerCase();
    if (company.includes(lowerTerm) || title.includes(lowerTerm)) {
      category = "FILTERED";
      matchedKeyword = term;
      break;
    }
  }

  if (category !== "FILTERED") {
    for (const rule of settings.rules) {
      if (evaluateRule(job, rule)) {
        category = "FILTERED";
        matchedKeyword = `Règle : ${rule.name}`;
        break;
      }
    }
  }

  if (category !== "FILTERED") {
    for (const term of settings.whitelist) {
      if (title.includes(term.toLowerCase())) {
        category = "TARGET";
        matchedKeyword = term;
        break;
      }
    }
  }

  return { category, matchedKeyword };
}

function jobArchive(job: Job): Record<string, unknown> {
  const aiAnalysis = job.aiAnalysis
    ? {
        ...job.aiAnalysis,
        createdAt: job.aiAnalysis.createdAt ? new Date(job.aiAnalysis.createdAt) : null,
      }
    : job.aiAnalysis;
  return {
    _id: job.id,
    createdAt: job.createdAt,
    title: job.title,
    company: job.company,
    location: job.location,
    country: job.country,
    url: job.url,
    logoUrl: job.logoUrl,
    rawString: job.rawString,
    parserGrade: job.parserGrade,
    category: job.category,
    status: job.status,
    matchedKeyword: job.matchedKeyword,
    workMode: job.workMode,
    salary: job.salary,
    isActiveRecruiting: job.isActiveRecruiting,
    isEasyApply: job.isEasyApply,
    isHighMatch: job.isHighMatch,
    tags: job.tags,
    visitedAt: job.visitedAt,
    aiAnalysis,
  };
}

async function lockIngestionKey(client: PoolClient, key: string): Promise<void> {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [key]);
}

async function selectJobByUrl(client: PoolClient, url: string): Promise<Job | null> {
  const result = await client.query<JobRow>(
    `SELECT ${JOB_PROJECTION} FROM public.jobs WHERE url = $1 LIMIT 1 FOR UPDATE`,
    [url]
  );
  return result.rows[0] ? mapJobRow(result.rows[0]) : null;
}

async function refreshDuplicate(client: PoolClient, job: Job, now: Date): Promise<Job> {
  await client.query("UPDATE public.jobs SET updated_at = $2 WHERE id = $1", [job.id, now]);
  return job;
}

export async function ingestJob(jobData: Partial<Job>): Promise<Job> {
  if (typeof jobData.url !== "string" || jobData.url.length === 0) {
    throw new TypeError("A job URL is required for PostgreSQL ingestion.");
  }
  const url = jobData.url;

  return withTransaction(async (client) => {
    const settings = await readSettingsWithClient(client);
    await lockIngestionKey(client, `ingest:url:${url}`);

    const existingByUrl = await selectJobByUrl(client, url);
    if (existingByUrl) return refreshDuplicate(client, existingByUrl, new Date());

    if (settings.deduplicateCrossRegion && jobData.title && jobData.company) {
      const titleCompanyKey = JSON.stringify([jobData.title.toLowerCase(), jobData.company.toLowerCase()]);
      await lockIngestionKey(client, `ingest:title-company:${titleCompanyKey}`);
    }

    let crossRegionDuplicate = false;
    if (settings.deduplicateCrossRegion && jobData.title && jobData.company) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const duplicate = await client.query(
        `SELECT 1 FROM public.jobs
         WHERE lower(title) = lower($1)
           AND lower(company) = lower($2)
           AND created_at >= $3
         LIMIT 1`,
        [jobData.title, jobData.company, thirtyDaysAgo]
      );
      crossRegionDuplicate = duplicate.rowCount !== null && duplicate.rowCount > 0;
    }

    const classified = classifyJob(jobData, settings, crossRegionDuplicate);

    const now = new Date();
    const job: Job = {
      ...jobData,
      id: createRecordId(),
      createdAt: now,
      updatedAt: null,
      title: jobData.title ?? null,
      company: jobData.company ?? null,
      location: jobData.location ?? null,
      country: jobData.country ?? null,
      url,
      logoUrl: jobData.logoUrl ?? null,
      rawString: jobData.rawString ?? "",
      parserGrade: jobData.parserGrade ?? "C",
      category: classified.category,
      status: "INBOX",
      matchedKeyword: classified.matchedKeyword,
      workMode: jobData.workMode ?? null,
      salary: jobData.salary ?? null,
      isActiveRecruiting: jobData.isActiveRecruiting ?? false,
      isEasyApply: jobData.isEasyApply ?? false,
      isHighMatch: jobData.isHighMatch ?? false,
      tags: jobData.tags ?? [],
      visitedAt: null,
      aiAnalysis: jobData.aiAnalysis ?? null,
    };

    const sourceEjson = stringifySourceEjson(jobArchive(job));
    const values = [
      job.id,
      now,
      job.title,
      job.company,
      job.location,
      job.country,
      job.url,
      job.logoUrl,
      job.rawString,
      job.parserGrade,
      job.category,
      job.status,
      job.matchedKeyword,
      job.workMode,
      job.salary,
      job.isActiveRecruiting,
      job.isEasyApply,
      job.isHighMatch,
      JSON.stringify(job.tags),
      job.visitedAt,
      job.aiAnalysis === null ? null : JSON.stringify(job.aiAnalysis),
      sourceEjson,
    ];

    await client.query("SAVEPOINT intrai_job_insert");
    try {
      const inserted = await client.query<JobRow>(
        `INSERT INTO public.jobs
           (id, created_at, title, company, location, country, url, logo_url, raw_string,
            parser_grade, category, status, matched_keyword, work_mode, salary,
            is_active_recruiting, is_easy_apply, is_high_match, tags, visited_at,
            ai_analysis, source_ejson)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                 $16, $17, $18, $19::jsonb, $20, $21::jsonb, $22::jsonb)
         RETURNING ${JOB_PROJECTION}`,
        values
      );
      await client.query("RELEASE SAVEPOINT intrai_job_insert");
      const insertedJob = inserted.rows[0];
      if (!insertedJob) throw new Error("PostgreSQL did not return the inserted job.");
      return mapJobRow(insertedJob);
    } catch (error) {
      await client.query("ROLLBACK TO SAVEPOINT intrai_job_insert");
      await client.query("RELEASE SAVEPOINT intrai_job_insert");
      if (getPostgresErrorCode(error) === "23505") {
        const duplicateByUrl = await selectJobByUrl(client, job.url);
        if (duplicateByUrl) return refreshDuplicate(client, duplicateByUrl, now);
      }
      throw error;
    }
  });
}

function getPostgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

export async function countJobsMatchingOlderThan(days: number): Promise<number> {
  return countOlderThan(days, new Date());
}

export async function getJobCounts(): Promise<{
  inbox: number;
  processedToday: number;
  filteredToday: number;
}> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const result = await query<{
    inbox: string;
    processedToday: string;
    filteredToday: string;
  }>(
    `SELECT
       count(*) FILTER (WHERE status = 'INBOX' AND category IS DISTINCT FROM 'FILTERED')::text AS inbox,
       count(*) FILTER (WHERE status IN ('SAVED', 'TRASH') AND created_at >= $1)::text AS "processedToday",
       count(*) FILTER (WHERE category = 'FILTERED' AND created_at >= $1)::text AS "filteredToday"
     FROM public.jobs`,
    [startOfDay]
  );
  const row = result.rows[0];
  return {
    inbox: Number(row?.inbox ?? 0),
    processedToday: Number(row?.processedToday ?? 0),
    filteredToday: Number(row?.filteredToday ?? 0),
  };
}
