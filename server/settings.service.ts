import { withMongo } from "@/lib/mongo";
import { Settings } from "@/lib/types";

const SETTINGS_COLLECTION = "settings";

export async function getSettings(): Promise<Settings> {
  return await withMongo(async (db) => {
    const settings = await db.collection(SETTINGS_COLLECTION).findOne({});

    if (!settings) {
      // Initialisation par défaut si absent
      const defaultSettings: Settings = {
        whitelist: ["React", "Node.js", "TypeScript"],
        blacklist: ["Stage", "Alternance", "ESN"],
        updatedAt: new Date(),
      };
      await db.collection(SETTINGS_COLLECTION).insertOne(defaultSettings);
      return defaultSettings;
    }

    return settings as unknown as Settings;
  });
}

export async function updateSettings(
  updates: Partial<Pick<Settings, "whitelist" | "blacklist">>
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

    // Réutilisation interne de getSettings, qui utilise aussi withMongo.
    // Attention: withMongo est réentrant (il réutilise le client si actif), donc pas de double connexion.
    return getSettings();
  });
}
