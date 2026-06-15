const { getDB } = require("../config/mongodb");

const COLLECTION = "audit_logs";

/**
 * Append an audit log entry. This collection is append-only.
 * @param {string} username
 * @param {string} action             - e.g. "CREATE_FAILURE_REPORT"
 * @param {string} target_collection  - e.g. "failure_reports"
 * @param {*}      target_id          - SQL int or MongoDB ObjectId string
 * @param {string} ip_address         - req.ip
 */
async function logAction(username, action, target_collection, target_id, ip_address) {
  const db = getDB();
  await db.collection(COLLECTION).insertOne({
    username,
    action,
    target_collection,
    target_id,
    ip_address: ip_address || null,
    timestamp: new Date()
  });
}

async function findAuditLogs(filter = {}, limit = 100) {
  const db = getDB();
  return db
    .collection(COLLECTION)
    .find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .toArray();
}

module.exports = { logAction, findAuditLogs };
