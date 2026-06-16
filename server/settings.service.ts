import { withMongo } from "@/lib/mongo";
import { Settings, SmartRule } from "@/lib/types";

const SETTINGS_COLLECTION = "settings";

export async function getSettings(): Promise<Settings> {
  return await withMongo(async (db) => {
    const settings = await db.collection(SETTINGS_COLLECTION).findOne({});

    if (!settings) {
      // Initialisation par défaut si absent
      const defaultSettings: Settings = {
        whitelist: ["React", "Node.js", "TypeScript"],
        blacklist: ["Stage", "Alternance", "ESN"],
        rules: [],
        deduplicateCrossRegion: false,
        updatedAt: new Date(),
      };
      await db.collection(SETTINGS_COLLECTION).insertOne(defaultSettings);
      return defaultSettings;
    }

    return settings as unknown as Settings;
  });
}

export async function updateSettings(
  updates: Partial<Pick<Settings, "whitelist" | "blacklist" | "rules" | "deduplicateCrossRegion">>
): Promise<Settings> {
  return await withMongo(async (db) => {
    await db.collection(SETTINGS_COLLECTION).updateOne(
      {},
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return getSettings();
  });
}

// Atomic append rule using $push (prevents concurrent edit loss)
export async function addSmartRule(rule: SmartRule): Promise<Settings> {
  return await withMongo(async (db) => {
    await db.collection(SETTINGS_COLLECTION).updateOne(
      {},
      {
        $push: { rules: rule },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    return getSettings();
  });
}
