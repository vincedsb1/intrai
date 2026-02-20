import { NextResponse } from "next/server";
import { parseEmail } from "@/server/email-parser.service";
import { ingestJob } from "@/server/jobs.service";
import { resolveCompanyAnalyses, resolveLocationAnalyses } from "@/server/ai.service";
import { getDb } from "@/lib/mongo";
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

    // --- DEBUG LOGOS ---
    for (const j of jobs) {
      console.log(`[Email Ingest DEBUG] Job: "${j.title}" | Company: "${j.company}" | logoUrl: ${j.logoUrl ? j.logoUrl.substring(0, 150) : 'NULL'} | Grade: ${j.parserGrade}`);
    }
    // --- FIN DEBUG ---

    // 4.5 Analyse IA (Entreprises + Localisations) en parallèle
    const uniqueCompanies = jobs.map(j => j.company);
    const uniqueLocations = jobs.map(j => j.location);

    const [analysesMap, locationsMap] = await Promise.all([
      resolveCompanyAnalyses(uniqueCompanies),
      resolveLocationAnalyses(uniqueLocations)
    ]);

    // 5. Boucle d'ingestion
    const ingestedIds = [];
    
    for (const job of jobs) {
      // Enrichissement AI Entreprise
      if (job.company && analysesMap.has(job.company)) {
        (job as any).aiAnalysis = analysesMap.get(job.company);
      }

      // Enrichissement AI Pays
      if (job.location && locationsMap.has(job.location)) {
        (job as any).country = locationsMap.get(job.location);
      }

      // On enrichit avec le messageId si l'URL est générée (fallback)
      if (!job.url) {
        job.url = `https://missing-url.com/${messageId}-${Date.now()}`;
      }

      // 6. Appel au service d'ingestion (Routing Blacklist/Whitelist)
      // Note: ingestJob gère déjà l'insertion DB. 
      // Si l'URL existe déjà (index unique), MongoDB lèvera une erreur E11000.
      // Il faut le gérer ici pour ne pas planter toute la boucle.
      try {
        const result = await ingestJob(job);
        ingestedIds.push(result.id);
      } catch (err: any) {
        if (err.code === 11000) {
          console.warn(`[Email Ingest] Duplicate URL skipped: ${job.url}`);
        } else {
          console.error(`[Email Ingest] Error saving job ${job.title}:`, err);
        }
      }
    }

    console.log(`[Email Ingest] Successfully ingested ${ingestedIds.length}/${jobs.length} jobs.`);

    // Toujours 200 OK pour CloudMailin
    return NextResponse.json({ success: true, count: ingestedIds.length, ids: ingestedIds });

  } catch (error) {
    console.error("[Email Ingest] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Error handled" }, { status: 200 });
  }
}
