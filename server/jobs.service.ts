import { getDb } from "@/lib/mongo";
import { Job, JobStatus, JobCategory, Settings } from "@/lib/types";
import { getSettings, updateSettings } from "./settings.service";
import { ObjectId } from "mongodb";

const JOBS_COLLECTION = "jobs";

export async function getJobs(filters: { status?: JobStatus; category?: JobCategory }) {
  const db = await getDb();
  const query: any = {};
  if (filters.status) query.status = filters.status;
  if (filters.category) query.category = filters.category;

  const items = await db
    .collection(JOBS_COLLECTION)
    .find(query)
    .sort({ createdAt: -1 })
    .toArray();

  return items.map((item) => {
    const { _id, ...rest } = item;
    return {
      ...rest,
      id: _id.toString(),
    };
  }) as unknown as Job[];
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

/**
 * Logique de tri à l'ingestion
 */
export async function ingestJob(jobData: Partial<Job>) {
  const settings = await getSettings();
  const db = await getDb();

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