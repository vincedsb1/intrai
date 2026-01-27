import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  // Optimisations pour environnement Serverless (Vercel) + VPS
  maxPoolSize: 1, 
  minPoolSize: 0,
  // Ferme les connexions inactives après 20s. 
  // Essentiel sur Vercel : évite de réutiliser un socket tué par le firewall du VPS pendant le gel du lambda.
  maxIdleTimeMS: 20000,
  serverSelectionTimeoutMS: 5000, // Réduit à 5s (fail fast) pour éviter de bloquer l'UI trop longtemps
  socketTimeoutMS: 45000, // Légèrement supérieur au timeout standard
  connectTimeoutMS: 10000, // 10s pour établir la connexion initiale
  directConnection: true, // FORCE la connexion directe (essentiel pour VPS unique)
  family: 4, // Force IPv4 pour éviter les timeouts de résolution IPv6
  retryWrites: true,
  w: "majority",
};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  let globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    console.log("[MONGO] 🟡 (Dev) Creating new MongoDB client & connecting...");
    const timeStart = Date.now();
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect()
      .then((c) => {
        console.log(`[MONGO] 🟢 (Dev) Connected successfully in ${Date.now() - timeStart}ms`);
        return c;
      })
      .catch((err) => {
        console.error("[MONGO] 🔴 (Dev) Connection FAILED:", err);
        throw err;
      });
  } else {
    console.log("[MONGO] 🔵 (Dev) Reusing existing global client promise");
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode
  console.log("[MONGO] 🟡 (Prod) Creating new MongoDB client & connecting...");
  const timeStart = Date.now();
  client = new MongoClient(uri, options);
  
  // On attache des logs aux événements du client pour voir s'il perd la connexion
  client.on("serverDescriptionChanged", (event) => console.log("[MONGO] ℹ️ Topology change:", event.newDescription.type));
  client.on("serverHeartbeatFailed", (event) => console.error("[MONGO] ⚠️ Heartbeat failed:", event.failure));
  
  clientPromise = client.connect()
    .then((c) => {
      console.log(`[MONGO] 🟢 (Prod) Connected successfully in ${Date.now() - timeStart}ms`);
      return c;
    })
    .catch((err) => {
      console.error("[MONGO] 🔴 (Prod) Connection FAILED:", err);
      throw err;
    });
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

/**
 * Helper to get the database instance
 */
export async function getDb() {
  const client = await clientPromise;
  return client.db();
}

/**
 * Helper to get a specific collection
 */
export async function getCollection<T extends Document>(name: string) {
  const db = await getDb();
  return db.collection(name);
}
