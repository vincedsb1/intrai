import { withMongo } from "@/lib/mongo";
import { Job, JobStatus, JobCategory, GetJobsResult, Settings, SmartRule } from "@/lib/types";
import { getSettings, updateSettings } from "./settings.service";
import { evaluateRule } from "./rules.engine";
import { ObjectId } from "mongodb";
import { INBOX_PAGE_SIZE } from "@/lib/constants";

const JOBS_COLLECTION = "jobs";

export async function getJobs(filters: {
  status?: JobStatus;
  category?: JobCategory;
  workMode?: string;
  isEasyApply?: boolean;
  country?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<GetJobsResult> {
  const start = Date.now();

  const rawPage = filters.page ?? 1;
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit = filters.limit ?? INBOX_PAGE_SIZE;
  const skip = (page - 1) * limit;

  console.log(
    `[JOBS] 🟡 Fetching jobs page=${page} limit=${limit} filters: ${JSON.stringify({
      ...filters,
      q: filters.q ? "[redacted]" : undefined,
      page: undefined,
      limit: undefined,
    })}`
  );

  try {
    const { items, total } = await withMongo(async (db) => {
      const query: Record<string, unknown> = {};
      if (filters.status) query.status = filters.status;
      if (filters.status === "INBOX" && !filters.category) {
        query.category = { $ne: "FILTERED" };
      } else if (filters.category) {
        query.category = filters.category;
      }
      if (filters.workMode && filters.workMode !== "all") query.workMode = filters.workMode;
      if (filters.isEasyApply === true) query.isEasyApply = true;
      if (filters.country && filters.country !== "all") query.country = filters.country;
      if (filters.q?.trim()) {
        const trimmed = filters.q.trim().slice(0, 200);
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(escaped, "i");
        query.$or = [{ title: regex }, { company: regex }];
      }

      const [rawItems, total] = await Promise.all([
        db
          .collection(JOBS_COLLECTION)
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection(JOBS_COLLECTION).countDocuments(query),
      ]);

      const items = rawItems.map((item) => {
        const { _id, createdAt, visitedAt, updatedAt, aiAnalysis, ...rest } = item;
        return {
          ...rest,
          id: _id.toString(),
          createdAt: createdAt ? new Date(createdAt).toISOString() : null,
          updatedAt: updatedAt ? new Date(updatedAt).toISOString() : null,
          visitedAt: visitedAt ? new Date(visitedAt).toISOString() : null,
          aiAnalysis: aiAnalysis
            ? {
                ...aiAnalysis,
                createdAt: aiAnalysis.createdAt
                  ? new Date(aiAnalysis.createdAt).toISOString()
                  : null,
              }
            : null,
        };
      }) as unknown as Job[];

      return { items, total };
    });

    const duration = Date.now() - start;
    console.log(`[JOBS] 🟢 Fetched ${items.length}/${total} jobs in ${duration}ms`);

    return { items, total };
  } catch (error) {
    console.error("[JOBS] 🔴 Error fetching jobs:", error);
    throw error;
  }
}

export async function getAvailableCountries(filters: {
  status?: JobStatus;
  workMode?: string;
  q?: string;
  isEasyApply?: boolean;
}): Promise<string[]> {
  return await withMongo(async (db) => {
    const query: Record<string, unknown> = {};
    if (filters.status) query.status = filters.status;
    if (filters.status === "INBOX") query.category = { $ne: "FILTERED" };
    if (filters.workMode && filters.workMode !== "all") query.workMode = filters.workMode;
    if (filters.isEasyApply === true) query.isEasyApply = true;
    if (filters.q?.trim()) {
      const trimmed = filters.q.trim().slice(0, 200);
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { title: new RegExp(escaped, "i") },
        { company: new RegExp(escaped, "i") },
      ];
    }
    const countries = await db
      .collection(JOBS_COLLECTION)
      .distinct("country", query);
    return countries
      .filter((c): c is string => typeof c === "string" && c.length > 0)
      .sort();
  });
}

export async function updateJobStatus(id: string, status: JobStatus) {
  await withMongo(async (db) => {
    await db.collection(JOBS_COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );
  });
}

export async function banAuthor(company: string) {
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
  await withMongo(async (db) => {
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
  });
}

export async function restoreJob(id: string) {
  await withMongo(async (db) => {
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
  });
}

export async function toggleJobVisited(id: string, visited: boolean) {
  await withMongo(async (db) => {
    await db.collection(JOBS_COLLECTION).updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          visitedAt: visited ? new Date() : null,
          updatedAt: new Date() 
        } 
      }
    );
  });
}

/**
 * Logique de tri à l'ingestion
 */
export async function ingestJob(jobData: Partial<Job>) {
  const settings = await getSettings();
  
  return await withMongo(async (db) => {
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

    // 0.5. CROSS-REGION DEDUPLICATION (Title + Company check for last 30 days)
    if (settings.deduplicateCrossRegion && jobData.title && jobData.company) {
       const thirtyDaysAgo = new Date();
       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

       // Case-insensitive check using Regex
       // Note: This might be slow on huge datasets without proper indexing, but fine for now.
       const duplicate = await db.collection(JOBS_COLLECTION).findOne({
         title: { $regex: new RegExp(`^${jobData.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
         company: { $regex: new RegExp(`^${jobData.company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i") },
         createdAt: { $gte: thirtyDaysAgo }
       });

       if (duplicate) {
          console.log(`[INGEST] 🟠 Cross-region duplicate found: "${jobData.title}" at "${jobData.company}". Filtering.`);
          category = "FILTERED";
          matchedKeyword = "Doublon (Titre/Entreprise)";
       }
    }

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

    // 1.5 Smart Rules Check (if not filtered by Blacklist)
    if (category !== "FILTERED" && settings.rules) {
      for (const rule of settings.rules) {
        if (evaluateRule(jobData, rule)) {
          category = "FILTERED";
          matchedKeyword = `Règle : ${rule.name}`;
          break;
        }
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
  });
}

// Count jobs matching olderThan rule (read-only, for estimation in dialog)
export async function countJobsMatchingOlderThan(days: number): Promise<number> {
  return await withMongo(async (db) => {
    const jobs = await db
      .collection(JOBS_COLLECTION)
      .find({
        status: "INBOX",
        category: { $ne: "FILTERED" },
      })
      .toArray();

    const tempRule: SmartRule = {
      id: "temp",
      name: "temp",
      enabled: true,
      conditions: [
        {
          id: "temp",
          field: "createdAt",
          operator: "olderThan",
          value: days,
        },
      ],
      action: "FILTER",
    };

    const jobsMatching = jobs.filter((job) => evaluateRule(job as unknown as Job, tempRule));
    return jobsMatching.length;
  });
}

// Evaluate and filter jobs matching a SmartRule (createdAt/olderThan)
// Returns count of jobs marked as FILTERED
export async function evaluateAndFilterOldJobs(newRule: SmartRule): Promise<number> {
  return await withMongo(async (db) => {
    const jobs = await db
      .collection(JOBS_COLLECTION)
      .find({
        status: "INBOX",
        category: { $ne: "FILTERED" },
      })
      .toArray();

    const jobsToFilter = jobs.filter((job) => evaluateRule(job as unknown as Job, newRule));

    if (jobsToFilter.length > 0) {
      const idsToFilter = jobsToFilter.map((j) => new ObjectId(j._id));
      await db.collection(JOBS_COLLECTION).updateMany(
        { _id: { $in: idsToFilter } },
        {
          $set: {
            category: "FILTERED",
            matchedKeyword: newRule.name,
            updatedAt: new Date(),
          },
        }
      );
    }

    return jobsToFilter.length;
  });
}

export async function getJobCounts() {
  return await withMongo(async (db) => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [inboxCount, processedToday, filteredToday] = await Promise.all([
      // Inbox: Total actuel (comme avant)
      db.collection(JOBS_COLLECTION).countDocuments({
        status: "INBOX",
        category: { $ne: "FILTERED" }
      }),
      // Processed: Traités (Saved/Trash) aujourd'hui
      db.collection(JOBS_COLLECTION).countDocuments({
        status: { $in: ["SAVED", "TRASH"] },
        createdAt: { $gte: startOfDay }
      }),
      // Filtered: Filtrés aujourd'hui
      db.collection(JOBS_COLLECTION).countDocuments({
        category: "FILTERED",
        createdAt: { $gte: startOfDay }
      })
    ]);

    return {
      inbox: inboxCount,
      processedToday,
      filteredToday
    };
  });
}