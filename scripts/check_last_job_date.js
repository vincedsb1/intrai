const { MongoClient } = require('mongodb');

// URI avec le bon mot de passe
const uri = "mongodb://intrai_user:z98h4kvOiN8ENVzVEgOtdSuEphc6PtPR@5.250.176.153:27017/intrai";

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
