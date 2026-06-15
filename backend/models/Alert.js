const { getDB } = require("../config/mongodb");

const COLLECTION = "alert_history";

async function createAlert(data) {
  const db = getDB();
  const doc = {
    device_code:   data.device_code,
    alert_type:    data.alert_type,
    risk_status:   data.risk_status,
    alert_message: data.alert_message,
    resolved:      false,
    resolved_by:   null,
    resolved_at:   null,
    created_at:    new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

async function findAlerts(filter = {}, limit = 50) {
  const db = getDB();
  return db
    .collection(COLLECTION)
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

async function resolveAlert(id, username) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        resolved:    true,
        resolved_by: username,
        resolved_at: new Date()
      }
    }
  );
  return result.matchedCount > 0;
}

async function deleteAlert(id) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

module.exports = { createAlert, findAlerts, resolveAlert, deleteAlert };
