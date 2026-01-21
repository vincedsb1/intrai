const { MongoClient } = require('mongodb');

const uri = "mongodb://intrai_user:z98h4kvOiN8ENVzVEgOtdSuEphc6PtPR@5.250.176.153:27017/intrai";

async function flushJobs() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    
    // Suppression de TOUS les documents dans 'jobs'
    const result = await db.collection('jobs').deleteMany({});
    
    console.log(`🧹 Collection 'jobs' vidée. ${result.deletedCount} offres supprimées.`);
    console.log("Vous pouvez renvoyer vos emails, ils seront traités comme nouveaux.");

  } finally {
    await client.close();
  }
}

flushJobs();
