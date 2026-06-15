// ============================================================
// MedTrack – MongoDB CRUD Examples
// Run in MongoDB Shell (mongosh) or adapt for Node.js backend.
// ============================================================

use("medtrack_nosql");

// ============================================================
// COLLECTION: device_event_logs
// ============================================================

// CREATE – log a new failure event
db.device_event_logs.insertOne({
  device_code: "MD-1002",
  event_type: "failure_alert",
  severity: "Critical",
  event_message: "Ventilator requires urgent airflow inspection.",
  metadata: {
    failure_event_count: 5,
    downtime_hours: 30.75
  },
  created_at: new Date()
});

// CREATE – log a system check event (different metadata shape)
db.device_event_logs.insertOne({
  device_code: "MD-1003",
  event_type: "system_check",
  severity: "Low",
  event_message: "Cardiac monitor passed routine self-diagnostic check.",
  metadata: {
    check_passed: true,
    battery_level_pct: 87
  },
  created_at: new Date()
});

// READ – fetch all events for a specific device, newest first
db.device_event_logs.find(
  { device_code: "MD-1002" }
).sort({ created_at: -1 });

// READ – fetch all critical-severity events across all devices
db.device_event_logs.find(
  { severity: "Critical" },
  { device_code: 1, event_message: 1, created_at: 1 }  // projection
);

// UPDATE – update the event message for a specific event
db.device_event_logs.updateOne(
  { device_code: "MD-1002", event_type: "failure_alert" },
  {
    $set: {
      event_message: "Ventilator airflow inspection completed. Valve cleared.",
      severity: "Medium"
    }
  }
);

// DELETE – remove a specific event by device_code and event_type
db.device_event_logs.deleteOne({
  device_code: "MD-1002",
  event_type: "system_check"
});


// ============================================================
// COLLECTION: technician_notes
// ============================================================

// CREATE – add a technician note linked to a failure report
db.technician_notes.insertOne({
  device_code: "MD-1004",
  technician_name: "Ethan Wong",
  note: "Defibrillator battery module inspected. Replacement recommended within 2 weeks. Current charge capacity at 61% of rated spec.",
  tags: ["battery", "replacement", "defibrillator"],
  related_failure_id: 4,
  created_at: new Date()
});

// READ – fetch all notes for a specific device
db.technician_notes.find(
  { device_code: "MD-1004" }
).sort({ created_at: -1 });

// READ – fetch all notes related to a specific failure report
db.technician_notes.find(
  { related_failure_id: 4 }
);

// READ – fetch notes containing a specific tag
db.technician_notes.find(
  { tags: "battery" }
);

// UPDATE – append an update to an existing note
db.technician_notes.updateOne(
  { device_code: "MD-1004", technician_name: "Ethan Wong" },
  {
    $set: {
      note: "Defibrillator battery module replacement completed. Device returned to service.",
      updated_at: new Date()
    },
    $push: { tags: "completed" }
  }
);

// DELETE – remove a note by its ObjectId
// db.technician_notes.deleteOne({ _id: ObjectId("<insert_id_here>") });

// DELETE – remove all notes for a decommissioned device
db.technician_notes.deleteMany({ device_code: "MD-1004" });


// ============================================================
// COLLECTION: sensor_snapshots
// ============================================================

// CREATE – insert a snapshot from a ventilator
db.sensor_snapshots.insertOne({
  device_code: "MD-1002",
  device_type: "Ventilator",
  readings: {
    temperature_celsius: 38.4,
    airflow_pressure_cmh2o: 72.5,
    usage_hours: 18420,
    tidal_volume_ml: 480
  },
  created_at: new Date()
});

// CREATE – insert a snapshot from a dialysis machine (different fields)
db.sensor_snapshots.insertOne({
  device_code: "MD-1005",
  device_type: "Dialysis Machine",
  readings: {
    temperature_celsius: 41.2,
    fluid_pressure_mmhg: 89.7,
    usage_hours: 22110,
    flow_rate_ml_per_min: 295
  },
  created_at: new Date()
});

// READ – fetch the latest snapshot for a specific device
db.sensor_snapshots.find(
  { device_code: "MD-1002" }
).sort({ created_at: -1 }).limit(1);

// READ – fetch all snapshots for devices with temperature above 40°C
db.sensor_snapshots.find(
  { "readings.temperature_celsius": { $gt: 40 } },
  { device_code: 1, device_type: 1, "readings.temperature_celsius": 1 }
);

// UPDATE – update the latest reading for a device
db.sensor_snapshots.updateOne(
  { device_code: "MD-1005" },
  {
    $set: {
      "readings.temperature_celsius": 39.5,
      "readings.flow_rate_ml_per_min": 310
    }
  }
);

// DELETE – remove all snapshots older than 90 days
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
db.sensor_snapshots.deleteMany({
  created_at: { $lt: ninetyDaysAgo }
});


// ============================================================
// COLLECTION: alert_history
// ============================================================

// CREATE – generate an alert for a critical device
db.alert_history.insertOne({
  device_code: "MD-1002",
  alert_type: "Risk Status Update",
  risk_status: "Critical",
  alert_message: "Device MD-1002 has exceeded the critical failure threshold.",
  resolved: false,
  resolved_by: null,
  resolved_at: null,
  created_at: new Date()
});

// READ – fetch all unresolved alerts
db.alert_history.find(
  { resolved: false }
).sort({ created_at: -1 });

// READ – fetch all unresolved critical alerts
db.alert_history.find(
  { risk_status: "Critical", resolved: false }
);

// UPDATE – mark an alert as resolved
db.alert_history.updateOne(
  { device_code: "MD-1002", resolved: false },
  {
    $set: {
      resolved: true,
      resolved_by: "tech01",
      resolved_at: new Date()
    }
  }
);

// DELETE – remove resolved alerts older than 1 year (archival cleanup)
const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
db.alert_history.deleteMany({
  resolved: true,
  resolved_at: { $lt: oneYearAgo }
});


// ============================================================
// COLLECTION: audit_logs
// ============================================================

// CREATE – log a user action (append-only; never update or delete audit logs)
db.audit_logs.insertOne({
  username: "admin01",
  action: "CREATE_FAILURE_REPORT",
  target_collection: "failure_reports",
  target_id: 11,
  ip_address: "192.168.1.10",
  timestamp: new Date()
});

// READ – fetch all actions by a specific user, newest first
db.audit_logs.find(
  { username: "admin01" }
).sort({ timestamp: -1 });

// READ – fetch full audit trail for a specific record
db.audit_logs.find(
  { target_collection: "maintenance_records", target_id: 2 }
).sort({ timestamp: 1 });
