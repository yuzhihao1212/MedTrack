const { getDB } = require("../config/mongodb");

const COLLECTION = "technician_notes";

async function createNote(data) {
  const db = getDB();
  const doc = {
    device_code:       data.device_code,
    technician_name:   data.technician_name,
    note:              data.note,
    tags:              Array.isArray(data.tags) ? data.tags : [],
    related_failure_id: data.related_failure_id || null,
    created_at:        new Date()
  };
  const result = await db.collection(COLLECTION).insertOne(doc);
  return { _id: result.insertedId, ...doc };
}

async function findNotes(filter = {}, limit = 50) {
  const db = getDB();
  return db
    .collection(COLLECTION)
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
}

async function updateNote(id, updates) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const result = await db.collection(COLLECTION).updateOne(
    { _id: new ObjectId(id) },
    { $set: { ...updates, updated_at: new Date() } }
  );
  return result.matchedCount > 0;
}

async function deleteNote(id) {
  const { ObjectId } = require("mongodb");
  const db = getDB();
  const result = await db.collection(COLLECTION).deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount > 0;
}

module.exports = { createNote, findNotes, updateNote, deleteNote };
