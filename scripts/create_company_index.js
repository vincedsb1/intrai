const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function createCompanyIndexes() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const analyses = db.collection('company_analyses');

    console.log("Création de l'index unique sur 'companyName'...");
    // Normalisation: on stocke souvent le nom brut, mais l'index unique est utile
    const result = await analyses.createIndex({ companyName: 1 }, { unique: true });
    console.log(`Index créé : ${result}`);

  } catch (err) {
    console.error("Erreur index company_analyses:", err);
  } finally {
    await client.close();
  }
}

createCompanyIndexes();
