# MedTrack – MongoDB Collection Design

MedTrack uses a **hybrid database architecture**: MySQL handles the structured, relational core of the system (devices, manufacturers, technicians, failure reports, maintenance records), while **MongoDB handles all semi-structured and high-velocity operational data** that would be awkward or wasteful to normalise into fixed SQL tables.

---

## Collections Overview

| Collection | Purpose |
|---|---|
| `device_event_logs` | Real-time event records from device activity |
| `technician_notes` | Free-text observations written by technicians |
| `sensor_snapshots` | Periodic sensor readings (varies by device type) |
| `alert_history` | Generated alerts when a device crosses a risk threshold |
| `audit_logs` | User action trail for every write operation |

---

## Collection 1: `device_event_logs`

Stores flexible, schema-variable event records emitted by devices during normal operation, failures, and maintenance activity.

Each device type (ventilator, dialysis machine, infusion pump, etc.) may produce events with different metadata shapes, which is why a document model is preferred over a fixed SQL row.

### Schema

```json
{
  "_id": ObjectId,
  "device_code": "MD-1002",           // FK reference to SQL devices.device_code
  "event_type": "failure_alert",      // e.g. failure_alert | maintenance_update | system_check
  "severity": "Critical",             // Low | Medium | High | Critical
  "event_message": "string",
  "metadata": {                       // variable sub-document per event_type
    "failure_event_count": 5,
    "downtime_hours": 30.75
  },
  "created_at": ISODate
}
```

### Indexes
- `{ device_code: 1, created_at: -1 }` — common query: latest events for a device
- `{ severity: 1 }` — filter by severity for dashboards

---

## Collection 2: `technician_notes`

Stores unstructured free-text observations, inspection notes, and recommendations written by technicians during or after a maintenance visit.

Notes are highly variable in content and length — they do not map well to fixed columns. Embedding a `tags` array enables flexible keyword search without a full-text search engine.

### Schema

```json
{
  "_id": ObjectId,
  "device_code": "MD-1004",
  "technician_name": "Ethan Wong",
  "note": "string",                   // free-text, no length constraint
  "tags": ["battery", "replacement"], // optional keyword tags
  "related_failure_id": 4,            // FK reference to SQL failure_reports.failure_id
  "created_at": ISODate,
  "updated_at": ISODate               // present only if the note was edited
}
```

### Indexes
- `{ device_code: 1 }` — fetch all notes for a device
- `{ related_failure_id: 1 }` — join notes to a specific failure report

---

## Collection 3: `sensor_snapshots`

Stores periodic sensor readings captured from each device. Different device types expose entirely different sensor fields (e.g., a ventilator has `airflow_pressure` but a dialysis machine has `fluid_pressure`), making a fixed SQL schema impractical.

### Schema

```json
{
  "_id": ObjectId,
  "device_code": "MD-1002",
  "device_type": "Ventilator",
  "readings": {                           // variable sub-document per device_type
    "temperature_celsius": 38.4,
    "airflow_pressure": 72.5,
    "usage_hours": 18420
  },
  "created_at": ISODate
}
```

### Indexes
- `{ device_code: 1, created_at: -1 }` — time-series queries per device
- `{ device_type: 1 }` — aggregate across a device class

---

## Collection 4: `alert_history`

Stores alerts generated automatically when a device's computed risk status crosses a threshold (e.g., failure count exceeds limit, maintenance is overdue). Alerts are resolved by technicians after investigation.

### Schema

```json
{
  "_id": ObjectId,
  "device_code": "MD-1002",
  "alert_type": "Risk Status Update",     // e.g. Risk Status Update | Repeated Failure Warning | Overdue Maintenance
  "risk_status": "Critical",              // Low | Medium | High | Critical
  "alert_message": "string",
  "resolved": false,
  "resolved_by": null,                    // username, set when resolved
  "resolved_at": null,                    // ISODate, set when resolved
  "created_at": ISODate
}
```

### Indexes
- `{ device_code: 1, resolved: 1 }` — fetch open alerts per device
- `{ risk_status: 1, resolved: 1 }` — dashboard: all unresolved critical alerts

---

## Collection 5: `audit_logs`

Stores an immutable trail of every user-initiated write action across both the SQL and MongoDB layers. This collection is append-only — documents are never updated or deleted.

### Schema

```json
{
  "_id": ObjectId,
  "username": "admin01",
  "action": "CREATE_FAILURE_REPORT",    // CREATE | UPDATE | DELETE prefixed with target
  "target_collection": "failure_reports",
  "target_id": 11,                      // SQL integer ID or MongoDB ObjectId string
  "ip_address": "192.168.1.10",         // optional, captured from Express req
  "timestamp": ISODate
}
```

### Indexes
- `{ username: 1, timestamp: -1 }` — user activity timeline
- `{ target_collection: 1, target_id: 1 }` — full history for a specific record

---

## Design Decisions

### Why embed `readings` and `metadata` as sub-documents?
Different device types expose completely different sensor and event fields. Storing them as a sub-document lets each document carry only the fields relevant to its device type, avoiding the NULL columns and ALTER TABLE pain that a SQL approach would require.

### Why reference `device_code` instead of embedding device details?
The canonical device record (name, type, manufacturer, purchase date) lives in MySQL. MongoDB documents reference `device_code` as a soft foreign key, keeping a single source of truth in the relational layer while allowing MongoDB to store operational data independently.

### Why are `audit_logs` in MongoDB and not SQL?
Audit logs are high-volume append-only writes. MongoDB's write throughput and flexible schema (each action can carry a different `details` payload) makes it a better fit than adding rows to a SQL table that would grow unboundedly.
