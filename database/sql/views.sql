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
WHERE d.risk_status + 0 >= 3;


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


CREATE OR REPLACE VIEW device_risk_score_view AS
SELECT
    ranked.device_id,
    ranked.device_code,
    ranked.type_name,
    ranked.manufacturer_name,
    ranked.model,
    ranked.country,
    ranked.age_years,
    ranked.current_risk_status,
    ranked.failure_event_count,
    ranked.downtime_hours,
    ranked.severity,
    ranked.maintenance_frequency,
    ranked.maintenance_priority,
    ranked.maintenance_cost,
    ranked.risk_score,

    CASE
        WHEN ranked.risk_score >= 120 THEN 'Critical'
        WHEN ranked.risk_score >= 80 THEN 'High'
        WHEN ranked.risk_score >= 45 THEN 'Medium'
        ELSE 'Low'
    END AS predicted_risk_level,

    CASE
        WHEN ranked.risk_score >= 120 THEN 'Immediate engineering review required'
        WHEN ranked.risk_score >= 80 THEN 'Prioritise preventive maintenance'
        WHEN ranked.risk_score >= 45 THEN 'Monitor during next maintenance cycle'
        ELSE 'Normal monitoring'
    END AS recommended_action

FROM (
    SELECT
        d.device_id,
        d.device_code,
        dt.type_name,
        m.manufacturer_name,
        d.model,
        d.country,
        COALESCE(d.age_years, 0) AS age_years,
        d.risk_status AS current_risk_status,

        COALESCE(fr.failure_event_count, 0) AS failure_event_count,
        COALESCE(fr.downtime_hours, 0) AS downtime_hours,
        COALESCE(fr.severity, 'Low') AS severity,

        COALESCE(mr.maintenance_frequency, 0) AS maintenance_frequency,
        COALESCE(mr.maintenance_priority, 'Low') AS maintenance_priority,
        COALESCE(mr.maintenance_cost, 0) AS maintenance_cost,

        ROUND(
            COALESCE(fr.failure_event_count, 0) * 10
            + COALESCE(fr.downtime_hours, 0) * 0.6
            + COALESCE(mr.maintenance_frequency, 0) * 6
            + COALESCE(d.age_years, 0) * 2
            + LEAST(COALESCE(mr.maintenance_cost, 0) / 1000, 25)

            + CASE COALESCE(fr.severity + 0, 1)
                WHEN 4 THEN 35
                WHEN 3 THEN 25
                WHEN 2 THEN 12
                ELSE 0
              END

            + CASE COALESCE(mr.maintenance_priority + 0, 1)
                WHEN 4 THEN 25
                WHEN 3 THEN 16
                WHEN 2 THEN 8
                ELSE 0
              END

            + CASE COALESCE(d.risk_status + 0, 1)
                WHEN 4 THEN 30
                WHEN 3 THEN 20
                WHEN 2 THEN 8
                ELSE 0
              END
        , 2) AS risk_score

    FROM devices d
    JOIN device_types dt ON d.device_type_id = dt.device_type_id
    JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
    LEFT JOIN failure_reports fr ON d.device_id = fr.device_id
    LEFT JOIN maintenance_records mr ON d.device_id = mr.device_id
) ranked;