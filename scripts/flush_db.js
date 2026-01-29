const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

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
