import { MongoClient, MongoClientOptions } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options: MongoClientOptions = {
  // Optimisations pour environnement Serverless (Vercel) + VPS
  maxPoolSize: 1, 
  minPoolSize: 0,
  serverSelectionTimeoutMS: 10000, // On laisse 10s pour trouver le serveur (tolérance latence)
  socketTimeoutMS: 45000, // Timeout opérations longues
  connectTimeoutMS: 20000, // Timeout initial de connexion TCP plus large
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
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
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
