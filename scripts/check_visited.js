const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function checkVisited() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const jobs = db.collection('jobs');

    // Cherche un job avec visitedAt
    const visitedJob = await jobs.findOne({ visitedAt: { $ne: null } });

    if (visitedJob) {
      console.log("Succès : J'ai trouvé un job visité en base !");
      console.log("ID:", visitedJob._id);
      console.log("VisitedAt:", visitedJob.visitedAt);
    } else {
      console.log("Échec : Aucun job n'a le champ visitedAt rempli en base.");
    }

  } finally {
    await client.close();
  }
}

checkVisited();
