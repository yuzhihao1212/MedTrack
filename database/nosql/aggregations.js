// ============================================================
// MedTrack – MongoDB Aggregation Queries
// Run in MongoDB Shell (mongosh) or adapt for Node.js backend.
// ============================================================

use("medtrack_nosql");

// ------------------------------------------------------------
// AGGREGATION 1: Count event logs grouped by severity
// Use case: Dashboard summary – how many events at each severity level?
// ------------------------------------------------------------
db.device_event_logs.aggregate([
  {
    $group: {
      _id: "$severity",
      total_events: { $sum: 1 },
      affected_devices: { $addToSet: "$device_code" }   // unique devices per severity
    }
  },
  {
    $project: {
      severity: "$_id",
      total_events: 1,
      device_count: { $size: "$affected_devices" },
      _id: 0
    }
  },
  {
    $sort: { total_events: -1 }
  }
]);


// ------------------------------------------------------------
// AGGREGATION 2: Alert summary – count by risk status, split resolved vs open
// Use case: Operations dashboard – how many alerts are still open at each risk level?
// ------------------------------------------------------------
db.alert_history.aggregate([
  {
    $group: {
      _id: "$risk_status",
      total_alerts: { $sum: 1 },
      open_alerts: {
        $sum: { $cond: [{ $eq: ["$resolved", false] }, 1, 0] }
      },
      resolved_alerts: {
        $sum: { $cond: [{ $eq: ["$resolved", true] }, 1, 0] }
      }
    }
  },
  {
    $project: {
      risk_status: "$_id",
      total_alerts: 1,
      open_alerts: 1,
      resolved_alerts: 1,
      _id: 0
    }
  },
  {
    $sort: { open_alerts: -1 }
  }
]);


// ------------------------------------------------------------
// AGGREGATION 3: Average usage hours and max temperature per device type (from sensor snapshots)
// Use case: Understand which device types are accumulating the most hours and heat stress.
// ------------------------------------------------------------
db.sensor_snapshots.aggregate([
  {
    $group: {
      _id: "$device_type",
      avg_usage_hours: { $avg: "$readings.usage_hours" },
      max_temperature_celsius: { $max: "$readings.temperature_celsius" },
      snapshot_count: { $sum: 1 }
    }
  },
  {
    $project: {
      device_type: "$_id",
      avg_usage_hours: { $round: ["$avg_usage_hours", 1] },
      max_temperature_celsius: 1,
      snapshot_count: 1,
      _id: 0
    }
  },
  {
    $sort: { avg_usage_hours: -1 }
  }
]);


// ------------------------------------------------------------
// AGGREGATION 4: Technician notes for devices with unresolved Critical alerts
// Use case: Assign technicians to critical devices that still have open investigations.
// Uses $lookup to join technician_notes with alert_history.
// ------------------------------------------------------------
db.technician_notes.aggregate([
  {
    $lookup: {
      from: "alert_history",
      localField: "device_code",
      foreignField: "device_code",
      as: "device_alerts"
    }
  },
  {
    $addFields: {
      critical_open_alerts: {
        $filter: {
          input: "$device_alerts",
          as: "alert",
          cond: {
            $and: [
              { $eq: ["$$alert.risk_status", "Critical"] },
              { $eq: ["$$alert.resolved", false] }
            ]
          }
        }
      }
    }
  },
  {
    $match: {
      "critical_open_alerts.0": { $exists: true }   // at least one open critical alert
    }
  },
  {
    $project: {
      device_code: 1,
      technician_name: 1,
      note: 1,
      created_at: 1,
      open_critical_alert_count: { $size: "$critical_open_alerts" },
      _id: 0
    }
  },
  {
    $sort: { open_critical_alert_count: -1 }
  }
]);


// ------------------------------------------------------------
// AGGREGATION 5: Top 5 devices by total event count (all-time activity ranking)
// Use case: Identify which devices generate the most operational noise.
// ------------------------------------------------------------
db.device_event_logs.aggregate([
  {
    $group: {
      _id: "$device_code",
      total_events: { $sum: 1 },
      critical_events: {
        $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] }
      },
      last_event_at: { $max: "$created_at" }
    }
  },
  {
    $project: {
      device_code: "$_id",
      total_events: 1,
      critical_events: 1,
      last_event_at: 1,
      _id: 0
    }
  },
  {
    $sort: { total_events: -1 }
  },
  {
    $limit: 5
  }
]);


// ------------------------------------------------------------
// AGGREGATION 6: Daily event count for the last 7 days (time-series trend)
// Use case: Spot spikes in device failures day by day.
// ------------------------------------------------------------
const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

db.device_event_logs.aggregate([
  {
    $match: {
      created_at: { $gte: sevenDaysAgo }
    }
  },
  {
    $group: {
      _id: {
        year:  { $year: "$created_at" },
        month: { $month: "$created_at" },
        day:   { $dayOfMonth: "$created_at" }
      },
      event_count: { $sum: 1 },
      critical_count: {
        $sum: { $cond: [{ $eq: ["$severity", "Critical"] }, 1, 0] }
      }
    }
  },
  {
    $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
  }
]);


// ------------------------------------------------------------
// AGGREGATION 7: User audit activity summary
// Use case: Compliance report – how many actions did each user perform, and what types?
// ------------------------------------------------------------
db.audit_logs.aggregate([
  {
    $group: {
      _id: "$username",
      total_actions: { $sum: 1 },
      action_types: { $addToSet: "$action" },
      last_action_at: { $max: "$timestamp" }
    }
  },
  {
    $project: {
      username: "$_id",
      total_actions: 1,
      distinct_action_count: { $size: "$action_types" },
      action_types: 1,
      last_action_at: 1,
      _id: 0
    }
  },
  {
    $sort: { total_actions: -1 }
  }
]);
