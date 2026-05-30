// MedTrack MongoDB CRUD Examples
// Run in MongoDB Shell or adapt for backend integration.

use("medtrack_nosql");

// CREATE
db.technician_notes.insertOne({
  device_code: "MD-1004",
  technician_name: "Ethan Wong",
  note: "Defibrillator battery module inspected. Replacement recommended within 2 weeks.",
  related_failure_id: 4,
  created_at: new Date()
});

// READ
db.technician_notes.find({
  device_code: "MD-1004"
});

// UPDATE
db.technician_notes.updateOne(
  { device_code: "MD-1004" },
  {
    $set: {
      note: "Defibrillator battery module inspected. Replacement completed.",
      updated_at: new Date()
    }
  }
);

// DELETE
db.technician_notes.deleteOne({
  device_code: "MD-1004"
});

// CREATE EVENT LOG
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

// READ EVENT LOGS
db.device_event_logs.find({
  severity: "Critical"
});