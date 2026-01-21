const { MongoClient } = require('mongodb');

const uri = "mongodb://intrai_user:z98h4kvOiN8ENVzVEgOtdSuEphc6PtPR@5.250.176.153:27017/intrai";

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
