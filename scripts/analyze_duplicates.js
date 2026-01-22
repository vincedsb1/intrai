const { MongoClient } = require('mongodb');

const uri = "mongodb://intrai_user:z98h4kvOiN8ENVzVEgOtdSuEphc6PtPR@5.250.176.153:27017/intrai";

async function findDuplicates() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const jobs = db.collection('jobs');

    // On cherche les doublons basés sur (Title + Company)
    const duplicates = await jobs.aggregate([
      {
        $group: {
          _id: { title: "$title", company: "$company" },
          count: { $sum: 1 },
          urls: { $push: "$url" }
        }
      },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    console.log(`Trouvé ${duplicates.length} groupes de doublons potentiels (Titre + Entreprise identiques).`);

    duplicates.forEach(dup => {
      console.log(`\n--- DOUBLON : ${dup._id.title} chez ${dup._id.company} ---`);
      dup.urls.forEach(u => console.log(`- ${u}`));
    });

  } finally {
    await client.close();
  }
}

findDuplicates();
