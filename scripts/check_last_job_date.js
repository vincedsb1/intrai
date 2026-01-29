const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function checkLastJobDate() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const jobs = db.collection('jobs');

    const lastJobs = await jobs.find().sort({ createdAt: -1 }).limit(5).toArray();

    if (lastJobs.length === 0) {
      console.log("Aucun job trouvé.");
      return;
    }

    console.log(`--- 5 DERNIERS JOBS ---`);
    lastJobs.forEach(job => {
        console.log(`[${job.createdAt}] ${job.title} (${job.url.substring(0, 30)}...)`);
    });

  } finally {
    await client.close();
  }
}

checkLastJobDate();
