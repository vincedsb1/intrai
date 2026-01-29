const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function analyzeJobs() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    
    // On prend les 10 derniers jobs pour voir le lot complet
    const jobs = await db.collection('jobs')
      .find()
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    console.log(`--- ANALYSE DES ${jobs.length} DERNIERS JOBS ---`);
    
    jobs.forEach((job, i) => {
      console.log(`\nJOB #${i+1}`);
      console.log(`Title: "${job.title}"`);
      console.log(`Company: "${job.company}"`);
      console.log(`LogoURL: ${job.logoUrl ? "PRÉSENT" : "MANQUANT"}`);
      if (job.logoUrl) console.log(` -> ${job.logoUrl.substring(0, 50)}...`);
      console.log(`ParserGrade: ${job.parserGrade}`);
      console.log(`URL: ${job.url.substring(0, 50)}...`);
    });

  } finally {
    await client.close();
  }
}

analyzeJobs();

