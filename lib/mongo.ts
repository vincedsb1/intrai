import { MongoClient, MongoClientOptions, Db } from "mongodb";

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

let clientPromise: Promise<MongoClient> | null = null;
let activeClient: MongoClient | null = null;

/**
 * Gestion du Singleton Client
 * Gère la connexion et la reconnexion si nécessaire.
 */
async function getClient(): Promise<MongoClient> {
  if (clientPromise) {
    return clientPromise;
  }

  // En dev, on utilise global pour éviter le HMR spam
  if (process.env.NODE_ENV === "development") {
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };
    if (!globalWithMongo._mongoClientPromise) {
      console.log("[MONGO] 🟡 (Dev) Connecting...");
      activeClient = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = activeClient.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
    return clientPromise;
  }

  // En Prod
  console.log("[MONGO] 🟡 (Prod) Connecting...");
  activeClient = new MongoClient(uri, options);
  
  // Monitoring basique
  activeClient.on("serverHeartbeatFailed", (e) => console.warn(`[MONGO] ⚠️ Heartbeat failed: ${e.failure}`));
  
  clientPromise = activeClient.connect()
    .then(c => {
      console.log("[MONGO] 🟢 Connected");
      return c;
    })
    .catch(err => {
      console.error("[MONGO] 🔴 Connect Error:", err);
      clientPromise = null; // Reset pour permettre un retry
      throw err;
    });

  return clientPromise;
}

/**
 * Wrapper de Résilience (Retry Pattern)
 * Exécute une opération DB. Si elle échoue à cause d'une erreur réseau/connexion,
 * on force la fermeture du client, on reconnecte, et on réessaie UNE fois.
 */
export async function withMongo<T>(operation: (db: Db) => Promise<T>): Promise<T> {
  try {
    const client = await getClient();
    return await operation(client.db());
  } catch (error: any) {
    // Liste des erreurs qui méritent un Retry (Socket closed, Topology destroyed, etc.)
    const isNetworkError = 
      error.name === "MongoNetworkError" || 
      error.name === "MongoServerSelectionError" || 
      error.message?.includes("topology") ||
      error.message?.includes("socket") ||
      error.message?.includes("buffering timed out");

    if (isNetworkError) {
      console.warn(`[MONGO] ⚠️ Network error detected (${error.name}). Resetting connection and retrying...`);
      
      // 1. Force Reset
      if (activeClient) {
        try { await activeClient.close(true); } catch (e) { /* ignore */ }
      }
      activeClient = null;
      clientPromise = null;
      
      if (process.env.NODE_ENV === "development") {
         (global as any)._mongoClientPromise = null;
      }

      // 2. Retry Logic
      try {
        const newClient = await getClient();
        return await operation(newClient.db());
      } catch (retryError) {
        console.error("[MONGO] 🔴 Retry failed:", retryError);
        throw retryError; // Si ça rate 2 fois, on abandonne
      }
    }

    throw error; // Autres erreurs (Validation, Duplicate key...)
  }
}

/**
 * @deprecated Use `withMongo` instead for resilience.
 * Helper legacy pour compatibilité, mais moins résilient.
 */
export async function getDb() {
  const client = await getClient();
  return client.db();
}

export default getClient;
