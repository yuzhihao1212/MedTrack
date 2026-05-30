USE medtrack;

CREATE OR REPLACE VIEW high_risk_devices_view AS
SELECT 
    d.device_id,
    d.device_code,
    dt.type_name,
    m.manufacturer_name,
    d.model,
    d.age_years,
    d.risk_status,
    fr.failure_event_count,
    fr.downtime_hours,
    fr.severity,
    mr.maintenance_priority,
    mr.repair_status
FROM devices d
JOIN device_types dt ON d.device_type_id = dt.device_type_id
JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
LEFT JOIN failure_reports fr ON d.device_id = fr.device_id
LEFT JOIN maintenance_records mr ON d.device_id = mr.device_id
WHERE d.risk_status IN ('High', 'Critical');


CREATE OR REPLACE VIEW maintenance_dashboard_view AS
SELECT
    d.device_code,
    dt.type_name,
    m.manufacturer_name,
    mr.maintenance_priority,
    mr.repair_status,
    mr.maintenance_cost,
    t.full_name AS technician_name
FROM maintenance_records mr
JOIN devices d ON mr.device_id = d.device_id
JOIN device_types dt ON d.device_type_id = dt.device_type_id
JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
LEFT JOIN technicians t ON mr.technician_id = t.technician_id;