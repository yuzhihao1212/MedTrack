const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME   = process.env.MONGO_DB   || "medtrack_nosql";

let db = null;

/**
 * Connect to MongoDB and cache the db handle.
 * Call this once at server startup.
 */
async function connectMongoDB() {
  if (db) return db;

  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`[MongoDB] Connected to database: ${DB_NAME}`);
  return db;
}

/**
 * Return the cached db handle.
 * Throws if connectMongoDB() has not been called yet.
 */
function getDB() {
  if (!db) {
    throw new Error("MongoDB not connected. Call connectMongoDB() first.");
  }
  return db;
}

module.exports = { connectMongoDB, getDB };
