USE medtrack;

-- Demonstration script for the project's B+ tree index feature.
-- InnoDB uses B+ tree structures for normal primary and secondary indexes.
-- Run these after indexes.sql and olap_warehouse.sql to show index usage.

SHOW INDEX FROM devices;
SHOW INDEX FROM failure_reports;
SHOW INDEX FROM maintenance_records;
SHOW INDEX FROM dw_fact_maintenance;
SHOW INDEX FROM dw_fact_failure;

EXPLAIN
SELECT
    d.device_code,
    d.risk_status,
    d.age_years
FROM devices d
FORCE INDEX (idx_devices_risk_status_age)
WHERE d.risk_status = 'Critical'
ORDER BY d.risk_status, d.age_years;

EXPLAIN
SELECT
    mr.repair_status,
    mr.maintenance_priority,
    SUM(mr.maintenance_cost) AS total_maintenance_cost
FROM maintenance_records mr
WHERE mr.repair_status IN ('Pending', 'In Progress')
GROUP BY mr.repair_status, mr.maintenance_priority;

EXPLAIN
SELECT
    dd.manufacturer_name,
    dd.type_name,
    SUM(fm.maintenance_cost) AS total_maintenance_cost
FROM dw_fact_maintenance fm
JOIN dw_dim_device dd ON dd.device_key = fm.device_key
GROUP BY dd.manufacturer_name, dd.type_name;
