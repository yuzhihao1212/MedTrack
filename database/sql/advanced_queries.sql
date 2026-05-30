USE medtrack;

-- 1. High-risk and critical devices
SELECT 
    d.device_code,
    dt.type_name,
    m.manufacturer_name,
    d.model,
    d.age_years,
    d.risk_status
FROM devices d
JOIN device_types dt ON d.device_type_id = dt.device_type_id
JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
WHERE d.risk_status IN ('High', 'Critical')
ORDER BY d.risk_status DESC, d.age_years DESC;


-- 2. Failure summary by device type
SELECT
    dt.type_name,
    COUNT(fr.failure_id) AS total_failure_reports,
    SUM(fr.failure_event_count) AS total_failure_events,
    ROUND(AVG(fr.downtime_hours), 2) AS avg_downtime_hours
FROM failure_reports fr
JOIN devices d ON fr.device_id = d.device_id
JOIN device_types dt ON d.device_type_id = dt.device_type_id
GROUP BY dt.type_name
ORDER BY total_failure_events DESC;


-- 3. Maintenance cost by manufacturer
SELECT
    m.manufacturer_name,
    COUNT(mr.maintenance_id) AS total_maintenance_records,
    SUM(mr.maintenance_cost) AS total_maintenance_cost,
    ROUND(AVG(mr.maintenance_cost), 2) AS avg_maintenance_cost
FROM maintenance_records mr
JOIN devices d ON mr.device_id = d.device_id
JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
GROUP BY m.manufacturer_name
ORDER BY total_maintenance_cost DESC;


-- 4. Devices with failure count above the overall average
SELECT
    d.device_code,
    dt.type_name,
    fr.failure_event_count,
    d.risk_status
FROM failure_reports fr
JOIN devices d ON fr.device_id = d.device_id
JOIN device_types dt ON d.device_type_id = dt.device_type_id
WHERE fr.failure_event_count > (
    SELECT AVG(failure_event_count)
    FROM failure_reports
)
ORDER BY fr.failure_event_count DESC;


-- 5. Technician workload summary
SELECT
    t.full_name,
    t.specialisation,
    COUNT(mr.maintenance_id) AS assigned_jobs,
    SUM(mr.maintenance_cost) AS total_repair_cost,
    ROUND(AVG(mr.maintenance_cost), 2) AS avg_repair_cost
FROM technicians t
LEFT JOIN maintenance_records mr ON t.technician_id = mr.technician_id
GROUP BY t.technician_id, t.full_name, t.specialisation
ORDER BY assigned_jobs DESC;


-- 6. Devices with pending or in-progress maintenance
SELECT
    d.device_code,
    dt.type_name,
    mr.maintenance_priority,
    mr.repair_status,
    mr.maintenance_cost
FROM maintenance_records mr
JOIN devices d ON mr.device_id = d.device_id
JOIN device_types dt ON d.device_type_id = dt.device_type_id
WHERE mr.repair_status IN ('Pending', 'In Progress')
ORDER BY 
    FIELD(mr.maintenance_priority, 'Critical', 'High', 'Medium', 'Low'),
    mr.maintenance_cost DESC;


-- 7. Parts usage summary
SELECT
    p.part_name,
    SUM(mp.quantity_used) AS total_quantity_used,
    p.stock_quantity,
    p.unit_cost,
    SUM(mp.quantity_used * p.unit_cost) AS estimated_parts_cost
FROM maintenance_parts mp
JOIN parts p ON mp.part_id = p.part_id
GROUP BY p.part_id, p.part_name, p.stock_quantity, p.unit_cost
ORDER BY total_quantity_used DESC;


-- 8. Dashboard summary query
SELECT
    (SELECT COUNT(*) FROM devices) AS total_devices,
    (SELECT COUNT(*) FROM failure_reports WHERE report_status != 'Resolved') AS unresolved_failures,
    (SELECT COUNT(*) FROM devices WHERE risk_status IN ('High', 'Critical')) AS high_risk_devices,
    (SELECT COUNT(*) FROM maintenance_records WHERE repair_status = 'Completed') AS completed_maintenance,
    (SELECT ROUND(AVG(maintenance_cost), 2) FROM maintenance_records) AS avg_maintenance_cost;