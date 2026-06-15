const { getDB } = require("../config/mongodb");

const COLLECTION = "sensor_snapshots";

async function createSnapshot(data) {
  const db = getDB();
  const doc = {
    device_code: data.device_code,
    device_type: data.device_type,
    readings:    data.readings || {},
    created_at:  new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

async function findSnapshots(filter = {}, limit = 50) {
  const db = getDB();
  return db
    .collection(COLLECTION)
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

async function updateSnapshot(id, readings) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const setFields = {};
  for (const [k, v] of Object.entries(readings)) {
    setFields[`readings.${k}`] = v;
  }
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: setFields }
  );
  return result.matchedCount > 0;
}

async function deleteSnapshot(id) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

module.exports = { createSnapshot, findSnapshots, updateSnapshot, deleteSnapshot };
