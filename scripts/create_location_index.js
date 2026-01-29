const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function createLocationIndexes() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const analyses = db.collection('location_analyses');

    console.log("Création de l'index unique sur 'rawLocation'...");
    const result = await analyses.createIndex({ rawLocation: 1 }, { unique: true });
    console.log(`Index créé : ${result}`);

  } catch (err) {
    console.error("Erreur index location_analyses:", err);
  } finally {
    await client.close();
  }
}

createLocationIndexes();
