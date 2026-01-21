import { getDb } from "@/lib/mongo";
import { Settings } from "@/lib/types";

const SETTINGS_COLLECTION = "settings";

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
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
}

export async function updateSettings(
  updates: Partial<Pick<Settings, "whitelist" | "blacklist">>
): Promise<Settings> {
  const db = await getDb();
  
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
}
