USE medtrack;

CREATE INDEX idx_devices_risk_status
ON devices(risk_status);

CREATE INDEX idx_failure_reports_device_id
ON failure_reports(device_id);

CREATE INDEX idx_failure_reports_severity
ON failure_reports(severity);

CREATE INDEX idx_maintenance_records_device_id
ON maintenance_records(device_id);

CREATE INDEX idx_maintenance_records_repair_status
ON maintenance_records(repair_status);

CREATE INDEX idx_maintenance_records_priority
ON maintenance_records(maintenance_priority);