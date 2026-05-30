# MedTrack NoSQL Collection Design

MedTrack uses MongoDB for flexible and semi-structured data that may not fit cleanly into fixed SQL tables.

## Why MongoDB is Used

SQL is used for structured records such as devices, manufacturers, failure reports, and maintenance records.

MongoDB is used for flexible records such as:
- technician notes
- device event logs
- sensor snapshots
- alert history
- audit logs

These records may contain different fields depending on the device type, failure situation, or maintenance activity.

---

## Collection 1: device_event_logs

Stores flexible event logs related to device failures, repairs, and system events.

Example fields:
- device_code
- event_type
- severity
- event_message
- timestamp
- metadata

---

## Collection 2: technician_notes

Stores unstructured technician comments and observations.

Example fields:
- device_code
- technician_name
- note
- related_failure_id
- created_at

---

## Collection 3: sensor_snapshots

Stores flexible sensor-style readings.

Example fields:
- device_code
- temperature
- battery_level
- usage_hours
- pressure_reading
- created_at

---

## Collection 4: alert_history

Stores generated alerts when a device becomes high-risk or critical.

Example fields:
- device_code
- alert_type
- risk_status
- alert_message
- created_at
- resolved

---

## Collection 5: audit_logs

Stores user activity logs.

Example fields:
- username
- action
- target_table
- target_id
- timestamp