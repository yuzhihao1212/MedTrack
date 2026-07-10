USE medtrack;

-- Snowflake schema variant of the device dimension.
-- Run this after olap_warehouse.sql (it copies from dw_dim_device).
--
-- The star schema's dw_dim_device denormalises manufacturer_name and
-- type_name directly into the device row — one wide table, no joins needed
-- to filter/group by manufacturer or device type. This file normalises that
-- same information one level further (the textbook "snowflake refinement"):
-- manufacturer and device type each get their own dimension table, and
-- dw_dim_device_snowflake references them by foreign key instead of
-- embedding the text. Trade-off: smaller dimension rows and no update
-- anomalies if a manufacturer is renamed, at the cost of extra joins on
-- every query that needs the name.
--
-- dw_dim_device_snowflake reuses the exact same device_key values as the
-- star schema's dw_dim_device, so the two can be compared directly —
-- dw_dim_device_snowflake_view (below) reconstructs the identical flattened
-- shape as dw_dim_device via joins, and should return identical data.

DROP VIEW IF EXISTS dw_dim_device_snowflake_view;
DROP TABLE IF EXISTS dw_dim_device_snowflake;
DROP TABLE IF EXISTS dw_dim_device_type;
DROP TABLE IF EXISTS dw_dim_manufacturer;

CREATE TABLE dw_dim_manufacturer (
    manufacturer_key INT PRIMARY KEY AUTO_INCREMENT,
    manufacturer_id INT NOT NULL UNIQUE,
    manufacturer_name VARCHAR(100) NOT NULL
);

CREATE TABLE dw_dim_device_type (
    device_type_key INT PRIMARY KEY AUTO_INCREMENT,
    device_type_id INT NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    risk_category VARCHAR(50)
);

CREATE TABLE dw_dim_device_snowflake (
    device_key INT PRIMARY KEY,
    device_id INT NOT NULL UNIQUE,
    device_code VARCHAR(50) NOT NULL,
    manufacturer_key INT NOT NULL,
    device_type_key INT NOT NULL,
    model VARCHAR(100),
    country VARCHAR(100),
    purchase_date DATE,
    age_years INT,
    risk_status ENUM('Low', 'Medium', 'High', 'Critical') NOT NULL,

    CONSTRAINT fk_dw_device_sf_manufacturer
        FOREIGN KEY (manufacturer_key)
        REFERENCES dw_dim_manufacturer(manufacturer_key),

    CONSTRAINT fk_dw_device_sf_type
        FOREIGN KEY (device_type_key)
        REFERENCES dw_dim_device_type(device_type_key)
);

INSERT INTO dw_dim_manufacturer (manufacturer_id, manufacturer_name)
SELECT manufacturer_id, manufacturer_name FROM manufacturers;

INSERT INTO dw_dim_device_type (device_type_id, type_name, risk_category)
SELECT device_type_id, type_name, risk_category FROM device_types;

INSERT INTO dw_dim_device_snowflake (
    device_key, device_id, device_code, manufacturer_key, device_type_key,
    model, country, purchase_date, age_years, risk_status
)
SELECT
    dd.device_key,
    dd.device_id,
    dd.device_code,
    dm.manufacturer_key,
    dtp.device_type_key,
    dd.model,
    dd.country,
    dd.purchase_date,
    dd.age_years,
    dd.risk_status
FROM dw_dim_device dd
JOIN dw_dim_manufacturer dm ON dm.manufacturer_id = dd.manufacturer_id
JOIN dw_dim_device_type dtp ON dtp.type_name = dd.type_name;

CREATE INDEX idx_dw_dim_device_sf_manufacturer ON dw_dim_device_snowflake(manufacturer_key);
CREATE INDEX idx_dw_dim_device_sf_type ON dw_dim_device_snowflake(device_type_key);

-- Reconstructs the same flattened shape as the star schema's dw_dim_device,
-- for apples-to-apples querying/comparison against the snowflake tables.
CREATE VIEW dw_dim_device_snowflake_view AS
SELECT
    ds.device_key,
    ds.device_id,
    ds.device_code,
    dtp.type_name,
    dm.manufacturer_name,
    ds.model,
    ds.country,
    ds.purchase_date,
    ds.age_years,
    ds.risk_status
FROM dw_dim_device_snowflake ds
JOIN dw_dim_manufacturer dm ON dm.manufacturer_key = ds.manufacturer_key
JOIN dw_dim_device_type dtp ON dtp.device_type_key = ds.device_type_key;

-- Verification (run manually): should return 0 rows if star and snowflake disagree.
-- SELECT COUNT(*) FROM dw_dim_device d
-- JOIN dw_dim_device_snowflake_view v ON v.device_key = d.device_key
-- WHERE d.manufacturer_name <> v.manufacturer_name OR d.type_name <> v.type_name;

-- Join-cost comparison (run manually):
-- EXPLAIN SELECT manufacturer_name, COUNT(*) FROM dw_dim_device GROUP BY manufacturer_name;
-- EXPLAIN SELECT dm.manufacturer_name, COUNT(*) FROM dw_dim_device_snowflake ds
--   JOIN dw_dim_manufacturer dm ON dm.manufacturer_key = ds.manufacturer_key
--   GROUP BY dm.manufacturer_name;
