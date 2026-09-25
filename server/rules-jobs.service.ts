import "server-only";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";
import { query } from "@/lib/postgres";
import type { Job, SmartRule } from "@/lib/types";
import { evaluateRule } from "./rules.engine";

const BATCH_SIZE = 500;
const OLDER_THAN_SQL = "CEIL(EXTRACT(EPOCH FROM ($1::timestamptz - created_at)) / 86400.0) >= $2";

interface RuleJobRow extends QueryResultRow {
  id: string;
  title: string | null;
  company: string | null;
  location: string | null;
  workMode: string | null;
  rawString: string | null;
  createdAt: Date | null;
}

export async function filterJobsForRule(
  client: PoolClient,
  rule: SmartRule,
  now: Date
): Promise<number> {
  if (!rule.enabled || rule.action !== "FILTER") return 0;

  const temporalConditions = rule.conditions.filter(
    (condition) => condition.field === "createdAt" && condition.operator === "olderThan"
  );
  if (temporalConditions.length === 0) return 0;

  if (rule.conditions.length === 1 && temporalConditions.length === 1) {
    const result = await client.query(
      `UPDATE public.jobs
       SET category = 'FILTERED', matched_keyword = $3, updated_at = $1
       WHERE status = 'INBOX'
         AND category IS DISTINCT FROM 'FILTERED'
         AND created_at IS NOT NULL
         AND ${OLDER_THAN_SQL}
       RETURNING id`,
      [now, temporalConditions[0].value, rule.name]
    );
    return result.rowCount ?? 0;
  }

  if (temporalConditions.some((condition) => typeof condition.value !== "number")) return 0;
  const oldestThreshold = Math.max(...temporalConditions.map((condition) => condition.value as number));
  let lastId: string | null = null;
  let filteredCount = 0;

  while (true) {
    const batch: QueryResult<RuleJobRow> = await client.query<RuleJobRow>(
      `SELECT id, title, company, location,
              work_mode AS "workMode", raw_string AS "rawString",
              created_at AS "createdAt"
       FROM public.jobs
       WHERE status = 'INBOX'
         AND category IS DISTINCT FROM 'FILTERED'
         AND created_at IS NOT NULL
         AND ${OLDER_THAN_SQL}
         AND ($3::text IS NULL OR id > $3)
       ORDER BY id
       LIMIT $4
       FOR UPDATE`,
      [now, oldestThreshold, lastId, BATCH_SIZE]
    );
    if (batch.rows.length === 0) break;

    const ids = batch.rows
      .filter((row) => evaluateRule({
        id: row.id,
        title: row.title,
        company: row.company,
        location: row.location,
        workMode: row.workMode as Job["workMode"],
        rawString: row.rawString ?? undefined,
        createdAt: row.createdAt,
      }, rule, now))
      .map((row) => row.id);

    lastId = batch.rows[batch.rows.length - 1].id;
    if (ids.length === 0) continue;

    const updated = await client.query(
      `UPDATE public.jobs
       SET category = 'FILTERED', matched_keyword = $2, updated_at = $3
       WHERE id = ANY($1::text[])
         AND status = 'INBOX'
         AND category IS DISTINCT FROM 'FILTERED'
       RETURNING id`,
      [ids, rule.name, now]
    );
    filteredCount += updated.rowCount ?? 0;
  }

  return filteredCount;
}

export async function countJobsMatchingOlderThan(days: number, now: Date): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT count(*)::text AS count
     FROM public.jobs
     WHERE status = 'INBOX'
       AND category IS DISTINCT FROM 'FILTERED'
       AND created_at IS NOT NULL
       AND ${OLDER_THAN_SQL}`,
    [now, days]
  );
  return Number(result.rows[0]?.count ?? 0);
}
