// MedTrack MongoDB Aggregation Queries

use("medtrack_nosql");

// 1. Count event logs by severity
db.device_event_logs.aggregate([
  {
    $group: {
      _id: "$severity",
      total_events: { $sum: 1 }
    }
  },
  {
    $sort: { total_events: -1 }
  }
]);

// 2. Count alerts by risk status
db.alert_history.aggregate([
  {
    $group: {
      _id: "$risk_status",
      total_alerts: { $sum: 1 },
      unresolved_alerts: {
        $sum: {
          $cond: [{ $eq: ["$resolved", false] }, 1, 0]
        }
      }
    }
  }
]);

// 3. Find average usage hours from sensor snapshots
db.sensor_snapshots.aggregate([
  {
    $group: {
      _id: "$device_type",
      avg_usage_hours: { $avg: "$readings.usage_hours" },
      max_temperature: { $max: "$readings.temperature_celsius" }
    }
  },
  {
    $sort: { avg_usage_hours: -1 }
  }
]);

// 4. Retrieve all notes for critical-risk devices
db.technician_notes.aggregate([
  {
    $lookup: {
      from: "alert_history",
      localField: "device_code",
      foreignField: "device_code",
      as: "related_alerts"
    }
  },
  {
    $match: {
      "related_alerts.risk_status": "Critical"
    }
  }
]);