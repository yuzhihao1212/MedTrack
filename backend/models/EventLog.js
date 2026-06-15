const { getDB } = require("../config/mongodb");

const COLLECTION = "device_event_logs";

/**
 * Insert a new event log document.
 * @param {object} data - { device_code, event_type, severity, event_message, metadata }
 */
async function createEventLog(data) {
  const db = getDB();
  const doc = {
    device_code:   data.device_code,
    event_type:    data.event_type,
    severity:      data.severity,
    event_message: data.event_message,
    metadata:      data.metadata || {},
    created_at:    new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

/**
 * Find event logs, optionally filtered.
 * @param {object} filter - MongoDB query filter (e.g. { device_code, severity })
 * @param {number} limit  - Max documents to return (default 50)
 */
async function findEventLogs(filter = {}, limit = 50) {
  const db = getDB();
  return db
    .collection(COLLECTION)
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

/**
 * Update a single event log by _id.
 * @param {string} id      - ObjectId string
 * @param {object} updates - Fields to $set
 */
async function updateEventLog(id, updates) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );
  return result.matchedCount > 0;
}

/**
 * Delete a single event log by _id.
 * @param {string} id - ObjectId string
 */
async function deleteEventLog(id) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

module.exports = { createEventLog, findEventLogs, updateEventLog, deleteEventLog };
