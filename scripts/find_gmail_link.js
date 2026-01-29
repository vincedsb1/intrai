const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// URI via env
const uri = process.env.MONGODB_URI;

async function findGmailLink() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const jobs = db.collection('jobs');

    // On cherche le dernier job ingéré
    const lastJob = await jobs.find().sort({ createdAt: -1 }).limit(1).toArray();

    if (lastJob.length === 0) {
      console.log("Aucun job trouvé.");
      return;
    }

    const job = lastJob[0];
    console.log("--- DERNIER JOB ---");
    console.log("Titre:", job.title);
    console.log("RawString (extrait):", job.rawString ? job.rawString.substring(0, 500) : "Vide");
    
    // Recherche du lien Google
    const linkRegex = /https:\/\/mail(-settings)?\.google\.com\/[^ \n"']+/g;
    const links = (job.rawString || "").match(linkRegex);

    if (links && links.length > 0) {
      console.log("\n--- LIEN GMAIL TROUVÉ ! ---");
      console.log(links[0]);
    } else {
      console.log("\nPas de lien Google trouvé dans le rawString.");
      // On affiche aussi le code s'il y en a un
      const codeRegex = /\b\d{9}\b/;
      const code = (job.rawString || "").match(codeRegex);
      if (code) console.log("Code de validation trouvé :", code[0]);
    }

  } finally {
    await client.close();
  }
}

findGmailLink();
