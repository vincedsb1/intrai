import { NextResponse } from "next/server";
import { parseEmail } from "@/server/email-parser.service";
import { ingestJob } from "@/server/jobs.service";
import { resolveCompanyAnalyses, resolveLocationAnalyses } from "@/server/ai.service";
import { getSettings } from "@/server/settings.service";
import { logDatabaseError, postgresErrorCode, safeErrorSummary } from "@/lib/postgres";
import type { Job } from "@/lib/types";
import fs from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  // 1. Sécurité Hybride (Header OU Query Param)
  const url = new URL(req.url);
  const secretQuery = url.searchParams.get("secret");
  const secretHeader = req.headers.get("x-webhook-secret");

  if (
    secretQuery !== process.env.WEBHOOK_SECRET &&
    secretHeader !== process.env.WEBHOOK_SECRET
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 2. Parsing Multipart
    const formData = await req.formData();
    
    // CloudMailin Normalized keys
    const plain = (formData.get("plain") as string) || "";
    const html = (formData.get("html") as string) || "";
    const subject = (formData.get("headers[subject]") as string) || "";
    const messageId = (formData.get("headers[message_id]") as string) || `no-id-${Date.now()}`;

    // --- DEBUG TEMPORAIRE : Sauvegarde du HTML pour analyse Cheerio ---
    if (process.env.NODE_ENV === "development") {
        try {
        const debugDir = path.join(process.cwd(), "debug_emails");
        await fs.mkdir(debugDir, { recursive: true });
        await fs.writeFile(path.join(debugDir, "last_email.html"), html);
        console.log("[Email Ingest] HTML saved to debug_emails/last_email.html");
        } catch (err) {
        console.error("[Email Ingest] Failed to save debug HTML:", err);
        }
    }
    // -----------------------------------------------------------------

    // 3. Déduplication (Optionnel mais recommandé)
    // On pourrait checker si messageId existe déjà dans une collection "ingestion_logs"
    // Pour l'instant on fait simple: on laisse l'ingestJob gérer ou on log juste.
    
    // 4. Parsing Métier
    const parseResult = parseEmail(subject, plain, html);
    const jobs = parseResult.jobs;

    console.log(`[Email Ingest] Strategy: ${parseResult.source}, Found ${jobs.length} jobs`);

    // 4.5 Analyse IA (Entreprises + Localisations) en parallèle
    const settings = await getSettings();
    const uniqueCompanies = jobs.map(j => j.company);
    const uniqueLocations = jobs.map(j => j.location);

    const [analysesMap, locationsMap] = settings.aiAnalysisEnabled
      ? await Promise.all([
          resolveCompanyAnalyses(uniqueCompanies),
          resolveLocationAnalyses(uniqueLocations)
        ])
      : [new Map(), new Map()];

    // 5. Boucle d'ingestion
    const ingestedIds = [];
    
    for (const job of jobs) {
      const jobToIngest: Partial<Job> = {
        ...job,
        aiAnalysis: job.company ? analysesMap.get(job.company) : undefined,
        country: job.location ? locationsMap.get(job.location) : undefined,
        url: job.url || `https://missing-url.com/${messageId}-${Date.now()}`,
      };

      // 6. Appel au service d'ingestion (classement et dédoublonnage PostgreSQL)
      try {
        const result = await ingestJob(jobToIngest);
        ingestedIds.push(result.id);
      } catch (error) {
        if (postgresErrorCode(error) === "23505") {
          console.warn("[Email Ingest] Duplicate job ignored by a PostgreSQL uniqueness constraint.");
        } else {
          logDatabaseError("[Email Ingest] Job persistence failed.", error);
        }
      }
    }

    console.log(`[Email Ingest] Successfully ingested ${ingestedIds.length}/${jobs.length} jobs.`);

    // Toujours 200 OK pour CloudMailin
    return NextResponse.json({ success: true, count: ingestedIds.length, ids: ingestedIds });

  } catch (error) {
    console.error("[Email Ingest] Request failed.", safeErrorSummary(error));
    return NextResponse.json({ success: false, error: "Internal Error handled" }, { status: 200 });
  }
}
