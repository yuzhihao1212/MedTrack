USE medtrack;

-- OLAP star schema for analytical queries.
-- Run this after schema.sql, loader.js, views.sql, triggers.sql, and indexes.sql.
-- The warehouse co-exists with the OLTP tables by using dw_* names.

DROP TABLE IF EXISTS dw_fact_maintenance;
DROP TABLE IF EXISTS dw_fact_failure;
DROP TABLE IF EXISTS dw_dim_technician;
DROP TABLE IF EXISTS dw_dim_device;
DROP TABLE IF EXISTS dw_dim_date;

CREATE TABLE dw_dim_date (
    date_key INT PRIMARY KEY,
    full_date DATE NOT NULL UNIQUE,
    year_number INT NOT NULL,
    quarter_number INT NOT NULL,
    month_number INT NOT NULL,
    month_name VARCHAR(20) NOT NULL,
    day_of_month INT NOT NULL
);

CREATE TABLE dw_dim_device (
    device_key INT PRIMARY KEY AUTO_INCREMENT,
    device_id INT NOT NULL UNIQUE,
    device_code VARCHAR(50) NOT NULL,
    device_type_id INT NOT NULL,
    type_name VARCHAR(100) NOT NULL,
    manufacturer_id INT NOT NULL,
    manufacturer_name VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    country VARCHAR(100),
    purchase_date DATE,
    age_years INT,
    risk_status ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL
);

CREATE TABLE dw_dim_technician (
    technician_key INT PRIMARY KEY AUTO_INCREMENT,
    technician_id INT NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    specialisation VARCHAR(100)
);

CREATE TABLE dw_fact_failure (
    failure_key INT PRIMARY KEY AUTO_INCREMENT,
    failure_id INT NOT NULL UNIQUE,
    device_key INT NOT NULL,
    date_key INT,
    failure_event_count INT NOT NULL,
    downtime_hours DECIMAL(10,2) NOT NULL,
    severity ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
    report_status ENUM('Open', 'In Progress', 'Resolved') NOT NULL,

    CONSTRAINT fk_dw_failure_device
        FOREIGN KEY (device_key)
        REFERENCES dw_dim_device(device_key),

    CONSTRAINT fk_dw_failure_date
        FOREIGN KEY (date_key)
        REFERENCES dw_dim_date(date_key)
);

CREATE TABLE dw_fact_maintenance (
    maintenance_key INT PRIMARY KEY AUTO_INCREMENT,
    maintenance_id INT NOT NULL UNIQUE,
    device_key INT NOT NULL,
    technician_key INT,
    date_key INT,
    maintenance_frequency INT NOT NULL,
    maintenance_class INT,
    maintenance_cost DECIMAL(10,2) NOT NULL,
    maintenance_priority ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,
    repair_status ENUM('Pending', 'In Progress', 'Completed') NOT NULL,

    CONSTRAINT fk_dw_maintenance_device
        FOREIGN KEY (device_key)
        REFERENCES dw_dim_device(device_key),

    CONSTRAINT fk_dw_maintenance_technician
        FOREIGN KEY (technician_key)
        REFERENCES dw_dim_technician(technician_key),

    CONSTRAINT fk_dw_maintenance_date
        FOREIGN KEY (date_key)
        REFERENCES dw_dim_date(date_key)
);

INSERT INTO dw_dim_date (
    date_key,
    full_date,
    year_number,
    quarter_number,
    month_number,
    month_name,
    day_of_month
)
SELECT DISTINCT
    CAST(DATE_FORMAT(d.purchase_date, '%Y%m%d') AS UNSIGNED) AS date_key,
    d.purchase_date AS full_date,
    YEAR(d.purchase_date) AS year_number,
    QUARTER(d.purchase_date) AS quarter_number,
    MONTH(d.purchase_date) AS month_number,
    MONTHNAME(d.purchase_date) AS month_name,
    DAY(d.purchase_date) AS day_of_month
FROM devices d
WHERE d.purchase_date IS NOT NULL;

INSERT INTO dw_dim_device (
    device_id,
    device_code,
    device_type_id,
    type_name,
    manufacturer_id,
    manufacturer_name,
    model,
    country,
    purchase_date,
    age_years,
    risk_status
)
SELECT
    d.device_id,
    d.device_code,
    d.device_type_id,
    dt.type_name,
    d.manufacturer_id,
    m.manufacturer_name,
    d.model,
    d.country,
    d.purchase_date,
    d.age_years,
    d.risk_status
FROM devices d
JOIN device_types dt ON dt.device_type_id = d.device_type_id
JOIN manufacturers m ON m.manufacturer_id = d.manufacturer_id;

INSERT INTO dw_dim_technician (
    technician_id,
    full_name,
    specialisation
)
SELECT
    technician_id,
    full_name,
    specialisation
FROM technicians;

INSERT INTO dw_fact_failure (
    failure_id,
    device_key,
    date_key,
    failure_event_count,
    downtime_hours,
    severity,
    report_status
)
SELECT
    fr.failure_id,
    dd.device_key,
    CAST(DATE_FORMAT(dd.purchase_date, '%Y%m%d') AS UNSIGNED) AS date_key,
    COALESCE(fr.failure_event_count, 0),
    COALESCE(fr.downtime_hours, 0),
    fr.severity,
    fr.report_status
FROM failure_reports fr
JOIN dw_dim_device dd ON dd.device_id = fr.device_id;

INSERT INTO dw_fact_maintenance (
    maintenance_id,
    device_key,
    technician_key,
    date_key,
    maintenance_frequency,
    maintenance_class,
    maintenance_cost,
    maintenance_priority,
    repair_status
)
SELECT
    mr.maintenance_id,
    dd.device_key,
    dt.technician_key,
    CAST(DATE_FORMAT(dd.purchase_date, '%Y%m%d') AS UNSIGNED) AS date_key,
    COALESCE(mr.maintenance_frequency, 0),
    mr.maintenance_class,
    COALESCE(mr.maintenance_cost, 0),
    mr.maintenance_priority,
    mr.repair_status
FROM maintenance_records mr
JOIN dw_dim_device dd ON dd.device_id = mr.device_id
LEFT JOIN dw_dim_technician dt ON dt.technician_id = mr.technician_id;

-- B+ tree-backed indexes for OLAP joins, rollups, and dashboard aggregation.
CREATE INDEX idx_dw_dim_date_year_quarter_month
ON dw_dim_date(year_number, quarter_number, month_number);

CREATE INDEX idx_dw_dim_device_type_manufacturer
ON dw_dim_device(type_name, manufacturer_name);

CREATE INDEX idx_dw_dim_device_country_risk
ON dw_dim_device(country, risk_status);

CREATE INDEX idx_dw_fact_failure_device_date
ON dw_fact_failure(device_key, date_key);

CREATE INDEX idx_dw_fact_failure_date_severity
ON dw_fact_failure(date_key, severity);

CREATE INDEX idx_dw_fact_maintenance_device_date
ON dw_fact_maintenance(device_key, date_key);

CREATE INDEX idx_dw_fact_maintenance_technician_status
ON dw_fact_maintenance(technician_key, repair_status);

CREATE INDEX idx_dw_fact_maintenance_priority_cost
ON dw_fact_maintenance(maintenance_priority, maintenance_cost);

CREATE OR REPLACE VIEW dw_maintenance_cost_cube_view AS
SELECT
    dd.manufacturer_name,
    dd.type_name,
    dd.country,
    dt.year_number,
    dt.quarter_number,
    COUNT(fm.maintenance_key) AS maintenance_records,
    SUM(fm.maintenance_cost) AS total_maintenance_cost,
    ROUND(AVG(fm.maintenance_cost), 2) AS avg_maintenance_cost,
    SUM(fm.maintenance_frequency) AS total_maintenance_frequency
FROM dw_fact_maintenance fm
JOIN dw_dim_device dd ON dd.device_key = fm.device_key
LEFT JOIN dw_dim_date dt ON dt.date_key = fm.date_key
GROUP BY
    dd.manufacturer_name,
    dd.type_name,
    dd.country,
    dt.year_number,
    dt.quarter_number;

CREATE OR REPLACE VIEW dw_failure_cube_view AS
SELECT
    dd.manufacturer_name,
    dd.type_name,
    dd.country,
    dt.year_number,
    dt.quarter_number,
    ff.severity,
    COUNT(ff.failure_key) AS failure_reports,
    SUM(ff.failure_event_count) AS total_failure_events,
    ROUND(SUM(ff.downtime_hours), 2) AS total_downtime_hours,
    ROUND(AVG(ff.downtime_hours), 2) AS avg_downtime_hours
FROM dw_fact_failure ff
JOIN dw_dim_device dd ON dd.device_key = ff.device_key
LEFT JOIN dw_dim_date dt ON dt.date_key = ff.date_key
GROUP BY
    dd.manufacturer_name,
    dd.type_name,
    dd.country,
    dt.year_number,
    dt.quarter_number,
    ff.severity;
