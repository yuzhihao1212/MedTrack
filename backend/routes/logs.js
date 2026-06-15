/**
 * /api/logs – Device Event Logs (MongoDB)
 *
 * GET    /api/logs                  – List event logs (filter: ?device_code, ?severity)
 * POST   /api/logs                  – Create a new event log
 * PUT    /api/logs/:id              – Update an event log
 * DELETE /api/logs/:id              – Delete an event log
 *
 * GET    /api/logs/notes            – List technician notes (?device_code, ?failure_id)
 * POST   /api/logs/notes            – Create a technician note
 * PUT    /api/logs/notes/:id        – Update a technician note
 * DELETE /api/logs/notes/:id        – Delete a technician note
 *
 * GET    /api/logs/snapshots        – List sensor snapshots (?device_code, ?device_type)
 * POST   /api/logs/snapshots        – Create a sensor snapshot
 * PUT    /api/logs/snapshots/:id    – Update snapshot readings
 * DELETE /api/logs/snapshots/:id    – Delete a snapshot
 *
 * GET    /api/logs/alerts           – List alerts (?device_code, ?risk_status, ?resolved)
 * POST   /api/logs/alerts           – Create an alert
 * PATCH  /api/logs/alerts/:id/resolve – Resolve an alert
 * DELETE /api/logs/alerts/:id       – Delete an alert
 *
 * GET    /api/logs/audit            – List audit logs (?username, ?target_collection)
 *
 * GET    /api/logs/aggregations/:type – Run a named aggregation
 */

const express = require("express");
const router  = express.Router();
const { ObjectId } = require("mongodb");

const EventLog      = require("../models/EventLog");
const TechNote      = require("../models/TechnicianNote");
const Snapshot      = require("../models/SensorSnapshot");
const Alert         = require("../models/Alert");
const AuditLog      = require("../models/AuditLog");
const { getDB }     = require("../config/mongodb");

// ─── Helpers ────────────────────────────────────────────────

function ok(res, data)         { res.json({ success: true, data }); }
function created(res, data)    { res.status(201).json({ success: true, data }); }
function notFound(res, msg)    { res.status(404).json({ success: false, error: msg }); }
function badRequest(res, msg)  { res.status(400).json({ success: false, error: msg }); }
function serverError(res, err) { res.status(500).json({ success: false, error: err.message }); }

// ─── EVENT LOGS ─────────────────────────────────────────────

// GET /api/logs
router.get("/", async (req, res) => {
  try {
    const filter = {};
    if (req.query.device_code) filter.device_code = req.query.device_code;
    if (req.query.severity)    filter.severity    = req.query.severity;
    const logs = await EventLog.findEventLogs(filter);
    ok(res, logs);
  } catch (err) { serverError(res, err); }
});

// POST /api/logs
router.post("/", async (req, res) => {
  try {
    const { device_code, event_type, severity, event_message, metadata } = req.body;
    if (!device_code || !event_type || !severity || !event_message)
      return badRequest(res, "device_code, event_type, severity, event_message are required.");
    const doc = await EventLog.createEventLog({ device_code, event_type, severity, event_message, metadata });
    await AuditLog.logAction(req.user?.username || "system", "CREATE_EVENT_LOG", "device_event_logs", doc._id.toString(), req.ip);
    created(res, doc);
  } catch (err) { serverError(res, err); }
});

// PUT /api/logs/:id
router.put("/:id", async (req, res) => {
  try {
    const updated = await EventLog.updateEventLog(req.params.id, req.body);
    if (!updated) return notFound(res, "Event log not found.");
    await AuditLog.logAction(req.user?.username || "system", "UPDATE_EVENT_LOG", "device_event_logs", req.params.id, req.ip);
    ok(res, { updated: true });
  } catch (err) { serverError(res, err); }
});

// DELETE /api/logs/:id
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await EventLog.deleteEventLog(req.params.id);
    if (!deleted) return notFound(res, "Event log not found.");
    await AuditLog.logAction(req.user?.username || "system", "DELETE_EVENT_LOG", "device_event_logs", req.params.id, req.ip);
    ok(res, { deleted: true });
  } catch (err) { serverError(res, err); }
});


// ─── TECHNICIAN NOTES ───────────────────────────────────────

// GET /api/logs/notes
router.get("/notes", async (req, res) => {
  try {
    const filter = {};
    if (req.query.device_code) filter.device_code        = req.query.device_code;
    if (req.query.failure_id)  filter.related_failure_id = parseInt(req.query.failure_id);
    if (req.query.tag)         filter.tags               = req.query.tag;
    const notes = await TechNote.findNotes(filter);
    ok(res, notes);
  } catch (err) { serverError(res, err); }
});

// POST /api/logs/notes
router.post("/notes", async (req, res) => {
  try {
    const { device_code, technician_name, note } = req.body;
    if (!device_code || !technician_name || !note)
      return badRequest(res, "device_code, technician_name, note are required.");
    const doc = await TechNote.createNote(req.body);
    await AuditLog.logAction(req.user?.username || technician_name, "CREATE_TECHNICIAN_NOTE", "technician_notes", doc._id.toString(), req.ip);
    created(res, doc);
  } catch (err) { serverError(res, err); }
});

// PUT /api/logs/notes/:id
router.put("/notes/:id", async (req, res) => {
  try {
    const updated = await TechNote.updateNote(req.params.id, req.body);
    if (!updated) return notFound(res, "Technician note not found.");
    await AuditLog.logAction(req.user?.username || "system", "UPDATE_TECHNICIAN_NOTE", "technician_notes", req.params.id, req.ip);
    ok(res, { updated: true });
  } catch (err) { serverError(res, err); }
});

// DELETE /api/logs/notes/:id
router.delete("/notes/:id", async (req, res) => {
  try {
    const deleted = await TechNote.deleteNote(req.params.id);
    if (!deleted) return notFound(res, "Technician note not found.");
    await AuditLog.logAction(req.user?.username || "system", "DELETE_TECHNICIAN_NOTE", "technician_notes", req.params.id, req.ip);
    ok(res, { deleted: true });
  } catch (err) { serverError(res, err); }
});


// ─── SENSOR SNAPSHOTS ───────────────────────────────────────

// GET /api/logs/snapshots
router.get("/snapshots", async (req, res) => {
  try {
    const filter = {};
    if (req.query.device_code) filter.device_code = req.query.device_code;
    if (req.query.device_type) filter.device_type = req.query.device_type;
    const snaps = await Snapshot.findSnapshots(filter);
    ok(res, snaps);
  } catch (err) { serverError(res, err); }
});

// POST /api/logs/snapshots
router.post("/snapshots", async (req, res) => {
  try {
    const { device_code, device_type, readings } = req.body;
    if (!device_code || !device_type || !readings)
      return badRequest(res, "device_code, device_type, readings are required.");
    const doc = await Snapshot.createSnapshot(req.body);
    created(res, doc);
  } catch (err) { serverError(res, err); }
});

// PUT /api/logs/snapshots/:id
router.put("/snapshots/:id", async (req, res) => {
  try {
    const updated = await Snapshot.updateSnapshot(req.params.id, req.body.readings || req.body);
    if (!updated) return notFound(res, "Snapshot not found.");
    ok(res, { updated: true });
  } catch (err) { serverError(res, err); }
});

// DELETE /api/logs/snapshots/:id
router.delete("/snapshots/:id", async (req, res) => {
  try {
    const deleted = await Snapshot.deleteSnapshot(req.params.id);
    if (!deleted) return notFound(res, "Snapshot not found.");
    ok(res, { deleted: true });
  } catch (err) { serverError(res, err); }
});


// ─── ALERT HISTORY ──────────────────────────────────────────

// GET /api/logs/alerts
router.get("/alerts", async (req, res) => {
  try {
    const filter = {};
    if (req.query.device_code) filter.device_code = req.query.device_code;
    if (req.query.risk_status) filter.risk_status = req.query.risk_status;
    if (req.query.resolved !== undefined) filter.resolved = req.query.resolved === "true";
    const alerts = await Alert.findAlerts(filter);
    ok(res, alerts);
  } catch (err) { serverError(res, err); }
});

// POST /api/logs/alerts
router.post("/alerts", async (req, res) => {
  try {
    const { device_code, alert_type, risk_status, alert_message } = req.body;
    if (!device_code || !alert_type || !risk_status || !alert_message)
      return badRequest(res, "device_code, alert_type, risk_status, alert_message are required.");
    const doc = await Alert.createAlert(req.body);
    await AuditLog.logAction(req.user?.username || "system", "CREATE_ALERT", "alert_history", doc._id.toString(), req.ip);
    created(res, doc);
  } catch (err) { serverError(res, err); }
});

// PATCH /api/logs/alerts/:id/resolve
router.patch("/alerts/:id/resolve", async (req, res) => {
  try {
    const username = req.body.resolved_by || req.user?.username || "system";
    const resolved = await Alert.resolveAlert(req.params.id, username);
    if (!resolved) return notFound(res, "Alert not found.");
    await AuditLog.logAction(username, "RESOLVE_ALERT", "alert_history", req.params.id, req.ip);
    ok(res, { resolved: true });
  } catch (err) { serverError(res, err); }
});

// DELETE /api/logs/alerts/:id
router.delete("/alerts/:id", async (req, res) => {
  try {
    const deleted = await Alert.deleteAlert(req.params.id);
    if (!deleted) return notFound(res, "Alert not found.");
    ok(res, { deleted: true });
  } catch (err) { serverError(res, err); }
});


// ─── AUDIT LOGS ─────────────────────────────────────────────

// GET /api/logs/audit
router.get("/audit", async (req, res) => {
  try {
    const filter = {};
    if (req.query.username)           filter.username           = req.query.username;
    if (req.query.target_collection)  filter.target_collection  = req.query.target_collection;
    const logs = await AuditLog.findAuditLogs(filter);
    ok(res, logs);
  } catch (err) { serverError(res, err); }
});


// ─── AGGREGATIONS ────────────────────────────────────────────

/**
 * GET /api/logs/aggregations/:type
 *
 * type options:
 *   event_severity_summary  – events grouped by severity
 *   alert_status_summary    – alerts grouped by risk status, open vs resolved
 *   sensor_avg_by_type      – avg usage hours + max temp per device type
 *   top_devices             – top 5 devices by event count
 *   daily_event_trend       – event count per day (last 7 days)
 *   audit_user_summary      – actions per user
 */
router.get("/aggregations/:type", async (req, res) => {
  try {
    const db = getDB();
    let result;

    switch (req.params.type) {

      case "event_severity_summary":
        result = await db.collection("device_event_logs").aggregate([
          { $group: {
              _id: "$severity",
              total_events: { $sum: 1 },
              affected_devices: { $addToSet: "$device_code" }
          }},
          { $project: {
              severity: "$_id",
              total_events: 1,
              device_count: { $size: "$affected_devices" },
              _id: 0
          }},
          { $sort: { total_events: -1 } }
        ]).toArray();
        break;

      case "alert_status_summary":
        result = await db.collection("alert_history").aggregate([
          { $group: {
              _id: "$risk_status",
              total_alerts: { $sum: 1 },
              open_alerts:     { $sum: { $cond: [{ $eq: ["$resolved", false] }, 1, 0] } },
              resolved_alerts: { $sum: { $cond: [{ $eq: ["$resolved", true]  }, 1, 0] } }
          }},
          { $project: {
              risk_status: "$_id",
              total_alerts: 1, open_alerts: 1, resolved_alerts: 1, _id: 0
          }},
          { $sort: { open_alerts: -1 } }
        ]).toArray();
        break;

      case "sensor_avg_by_type":
        result = await db.collection("sensor_snapshots").aggregate([
          { $group: {
              _id: "$device_type",
              avg_usage_hours:        { $avg: "$readings.usage_hours" },
              max_temperature_celsius: { $max: "$readings.temperature_celsius" },
              snapshot_count:         { $sum: 1 }
          }},
          { $project: {
              device_type: "$_id",
              avg_usage_hours: { $round: ["$avg_usage_hours", 1] },
              max_temperature_celsius: 1,
              snapshot_count: 1,
              _id: 0
          }},
          { $sort: { avg_usage_hours: -1 } }
        ]).toArray();
        break;

      case "top_devices":
        result = await db.collection("device_event_logs").aggregate([
          { $group: {
              _id: "$device_code",
              total_events:    { $sum: 1 },
              critical_events: { $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] } },
              last_event_at:   { $max: "$created_at" }
          }},
          { $project: { device_code: "$_id", total_events: 1, critical_events: 1, last_event_at: 1, _id: 0 } },
          { $sort: { total_events: -1 } },
          { $limit: 5 }
        ]).toArray();
        break;

      case "daily_event_trend": {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        result = await db.collection("device_event_logs").aggregate([
          { $match: { created_at: { $gte: sevenDaysAgo } } },
          { $group: {
              _id: {
                year:  { $year: "$created_at" },
                month: { $month: "$created_at" },
                day:   { $dayOfMonth: "$created_at" }
              },
              event_count:    { $sum: 1 },
              critical_count: { $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] } }
          }},
          { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
        ]).toArray();
        break;
      }

      case "audit_user_summary":
        result = await db.collection("audit_logs").aggregate([
          { $group: {
              _id: "$username",
              total_actions:  { $sum: 1 },
              action_types:   { $addToSet: "$action" },
              last_action_at: { $max: "$timestamp" }
          }},
          { $project: {
              username: "$_id",
              total_actions: 1,
              distinct_action_count: { $size: "$action_types" },
              action_types: 1,
              last_action_at: 1,
              _id: 0
          }},
          { $sort: { total_actions: -1 } }
        ]).toArray();
        break;

      default:
        return badRequest(res, `Unknown aggregation type: ${req.params.type}. Valid types: event_severity_summary, alert_status_summary, sensor_avg_by_type, top_devices, daily_event_trend, audit_user_summary`);
    }

    ok(res, result);
  } catch (err) { serverError(res, err); }
});

module.exports = router;
