import { getDb } from "@/lib/mongo";
import { Job, JobStatus, JobCategory, Settings } from "@/lib/types";
import { getSettings, updateSettings } from "./settings.service";
import { ObjectId } from "mongodb";

const JOBS_COLLECTION = "jobs";

export async function getJobs(filters: { status?: JobStatus; category?: JobCategory }) {
  const start = Date.now();
  console.log(`[JOBS] 🟡 Fetching jobs with filters: ${JSON.stringify(filters)}`);

  try {
    const db = await getDb();
    const query: any = {};
    if (filters.status) query.status = filters.status;
    if (filters.category) query.category = filters.category;

    const items = await db
        .collection(JOBS_COLLECTION)
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
    
    const duration = Date.now() - start;
    console.log(`[JOBS] 🟢 Fetched ${items.length} jobs in ${duration}ms`);

    return items.map((item) => {
    const { _id, createdAt, visitedAt, updatedAt, aiAnalysis, ...rest } = item;
    return {
      ...rest,
      id: _id.toString(),
      createdAt: createdAt ? new Date(createdAt).toISOString() : null,
      updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
      visitedAt: visitedAt ? new Date(visitedAt).toISOString() : null,
      aiAnalysis: aiAnalysis ? {
        ...aiAnalysis,
        createdAt: aiAnalysis.createdAt ? new Date(aiAnalysis.createdAt).toISOString() : null
      } : null
    };
  }) as unknown as Job[];
  } catch (error) {
    console.error("[JOBS] 🔴 Error fetching jobs:", error);
    throw error;
  }
}

export async function updateJobStatus(id: string, status: JobStatus) {
  const db = await getDb();
  await db.collection(JOBS_COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } }
  );
}

export async function banAuthor(company: string) {
  const db = await getDb();
  
  // 1. Ajouter à la blacklist (évite doublons via Set ou check existant, mais updateSettings gère le remplacement)
  // On récupère d'abord pour ne pas écraser
  const currentSettings = await getSettings();
  if (!currentSettings.blacklist.includes(company)) {
    await updateSettings({
      blacklist: [...currentSettings.blacklist, company]
    });
  }

  // 2. Passer tous les jobs de cet auteur en FILTERED (et pourquoi pas TRASH ou INBOX? Spec dit category=FILTERED)
  // On garde le status actuel ou on le change ? Spec: "Déplace le job en category=FILTERED".
  // Souvent on veut aussi le sortir de l'Inbox visible, donc category=FILTERED suffit si l'inbox filtre dessus.
  await db.collection(JOBS_COLLECTION).updateMany(
    { company: company }, // Case sensitive ici, attention. Idéalement regex insensible.
    { 
      $set: { 
        category: "FILTERED", 
        matchedKeyword: company,
        updatedAt: new Date() 
      } 
    }
  );
}

export async function restoreJob(id: string) {
  const db = await getDb();
  await db.collection(JOBS_COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        status: "INBOX", 
        category: "EXPLORE", 
        matchedKeyword: null, // On nettoie la raison du filtre
        updatedAt: new Date() 
      } 
    }
  );
}

export async function toggleJobVisited(id: string, visited: boolean) {
  const db = await getDb();
  await db.collection(JOBS_COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { 
      $set: { 
        visitedAt: visited ? new Date() : null,
        updatedAt: new Date() 
      } 
    }
  );
}

/**
 * Logique de tri à l'ingestion
 */
export async function ingestJob(jobData: Partial<Job>) {
  const settings = await getSettings();
  const db = await getDb();

  // 0. DUPLICATE CHECK (URL)
  if (jobData.url) {
    const existingJob = await db.collection(JOBS_COLLECTION).findOne({ url: jobData.url });
    if (existingJob) {
      console.log(`[INGEST] 🟡 Duplicate URL found: ${jobData.url}. Updating timestamp only.`);
      // On met à jour la date de dernière vue, mais ON NE CHANGE PAS LE STATUS (INBOX/TRASH/SAVED)
      await db.collection(JOBS_COLLECTION).updateOne(
        { _id: existingJob._id },
        { $set: { updatedAt: new Date() } }
      );
      // On retourne l'existant formaté
      const { _id, ...rest } = existingJob;
      return { ...rest, id: _id.toString() } as unknown as Job;
    }
  }

  let category: JobCategory = "EXPLORE";
  let matchedKeyword: string | null = null;

  // 1. Blacklist check
  const company = jobData.company?.toLowerCase() || "";
  const title = jobData.title?.toLowerCase() || "";

  for (const term of settings.blacklist) {
    const lowerTerm = term.toLowerCase();
    if (company.includes(lowerTerm) || title.includes(lowerTerm)) {
      category = "FILTERED";
      matchedKeyword = term;
      break;
    }
  }

  // 2. Whitelist check (si pas déjà blacklisté)
  if (category !== "FILTERED") {
    for (const term of settings.whitelist) {
      if (title.includes(term.toLowerCase())) {
        category = "TARGET";
        matchedKeyword = term;
        break;
      }
    }
  }

  const newJob = {
    ...jobData,
    status: "INBOX",
    category,
    matchedKeyword,
    createdAt: new Date(),
  };

  const result = await db.collection(JOBS_COLLECTION).insertOne(newJob);
  return { ...newJob, id: result.insertedId.toString() };
}