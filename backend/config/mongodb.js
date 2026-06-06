const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const mongoDbName = process.env.MONGO_DB_NAME || "medtrack_nosql";

const client = new MongoClient(mongoUri);

let database;

async function connectMongo() {
  if (!database) {
    await client.connect();
    database = client.db(mongoDbName);
  }
  return database;
}

async function testMongoConnection() {
  // ping the database so startup fails fast on connection issues
  const db = await connectMongo();
  await db.command({ ping: 1 });
}

function getMongoDb() {
  if (!database) {
    throw new Error("MongoDB is not connected yet!");
  }
  return database;
}

module.exports = {
  connectMongo,
  testMongoConnection,
  getMongoDb
};
