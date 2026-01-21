const { MongoClient } = require('mongodb');

// URI avec le bon mot de passe
const uri = "mongodb://intrai_user:z98h4kvOiN8ENVzVEgOtdSuEphc6PtPR@5.250.176.153:27017/intrai";

async function getLatestEmailHtml() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('intrai');
    const jobs = db.collection('jobs');

    // On cherche le dernier job (qui contient le rawString/HTML du mail transféré)
    const lastJob = await jobs.find().sort({ createdAt: -1 }).limit(1).toArray();

    if (lastJob.length === 0) {
      console.log("Aucun job trouvé.");
      return;
    }

    const job = lastJob[0];
    console.log("--- DERNIER JOB REÇU ---");
    console.log("ID:", job._id);
    console.log("Titre:", job.title);
    // On ne log pas tout le HTML pour ne pas spammer, mais on sauvegarde dans un fichier temporaire si besoin
    // Ici on va juste afficher un extrait pour confirmer que c'est le bon mail
    console.log("Extrait rawString:", job.rawString ? job.rawString.substring(0, 200) : "Vide");
    
    // Le HTML n'est PAS stocké dans le modèle Job actuel (on ne stocke que rawString = subject + plain).
    // Aïe ! Si on n'a pas stocké le HTML, on ne peut pas analyser la structure DOM maintenant.
    // Vérification du modèle actuel dans le code :
    // app/api/ingest/email/route.ts -> parseEmail -> ne retourne pas le HTML complet.
    // server/jobs.service.ts -> ingestJob -> ne stocke que jobData.
    
    // MAIS, attendez : dans `app/api/ingest/email/route.ts`, on a reçu `html` du formData.
    // Est-ce qu'on l'a stocké ?
    // Regardons `server/email-parser.service.ts` : rawString = cleanSubject + plainBody.
    // Le HTML est PERDU lors de l'ingestion actuelle.
    
    console.log("ALERTE : Le HTML n'est pas stocké en base actuellement. Seul le plain text l'est.");

  } finally {
    await client.close();
  }
}

getLatestEmailHtml();
