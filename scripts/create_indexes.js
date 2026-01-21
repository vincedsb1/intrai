const { MongoClient } = require('mongodb');

const uri = "mongodb://intrai_user:z98h4kvOiN8ENVzVEgOtdSuEphc6PtPR@5.250.176.153:27017/intrai";

async function cleanupAndCreateIndex() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const jobs = db.collection('jobs');

    console.log("Recherche et suppression des doublons d'URL...");
    
    // Agrégation pour trouver les doublons
    const duplicates = await jobs.aggregate([
      { $group: { _id: "$url", count: { $sum: 1 }, ids: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    console.log(`Trouvé ${duplicates.length} URLs en double.`);

    for (const dup of duplicates) {
      // On garde le premier ID et on supprime les autres
      const [keepId, ...deleteIds] = dup.ids;
      await jobs.deleteMany({ _id: { $in: deleteIds } });
      console.log(`Nettoyé URL: ${dup._id} (${deleteIds.length} supprimés)`);
    }

    console.log("Création de l'index unique sur 'url'...");
    await jobs.createIndex({ url: 1 }, { unique: true });
    console.log("Index unique créé avec succès.");

  } catch (err) {
    console.error("Erreur critique:", err);
  } finally {
    await client.close();
  }
}

cleanupAndCreateIndex();