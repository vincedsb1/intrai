const { MongoClient } = require('mongodb');

const uri = "mongodb://intrai_user:z98h4kvOiN8ENVzVEgOtdSuEphc6PtPR@5.250.176.153:27017/intrai";

const newTerms = [
  "Toptal", "Turing", "Crossover", "Proxify", "Braintrust", "Andela", 
  "Lemon.io", "Twine", "Freelancer", "Upwork", "Fiverr", "Malt", 
  "Mercor", "Collective.work", "Jobgether", "Haystack", "Joinrs", 
  "Code Compass", "Sonia", "Copyfy", "DARE DONE", "Pareto", "Highbrow", 
  "Cloudable", "BrainRocket", "Creator Group", "Talent Tree", 
  "Chapter One", "CorpGlobal", "HJL"
];

async function updateBlacklist() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const settingsColl = db.collection('settings');

    const settings = await settingsColl.findOne({});
    let currentBlacklist = settings ? settings.blacklist || [] : [];

    // Fusionner et dédoublonner
    const updatedBlacklist = Array.from(new Set([...currentBlacklist, ...newTerms]));

    await settingsColl.updateOne(
      {},
      { 
        $set: { 
          blacklist: updatedBlacklist,
          updatedAt: new Date() 
        } 
      },
      { upsert: true }
    );

    console.log(`Blacklist mise à jour. Total: ${updatedBlacklist.length} termes.`);
  } finally {
    await client.close();
  }
}

updateBlacklist();
