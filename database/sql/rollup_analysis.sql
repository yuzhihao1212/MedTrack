USE medtrack;

-- OLAP roll-up demonstration (GROUP BY ... WITH ROLLUP).
-- Run this after olap_warehouse.sql.
--
-- Roll-up climbs a dimension hierarchy to produce subtotal rows alongside the
-- detail rows, in a single query: manufacturer -> device type -> grand total,
-- and year -> quarter -> grand total. Since manufacturer_name/type_name and
-- year_number/quarter_number are all NOT NULL columns, any NULL that shows up
-- in the result set is guaranteed to be a ROLLUP-generated super-aggregate
-- row rather than real data.
--
-- Note: this MariaDB build does not support the GROUPING() function, and a
-- compound `col_a IS NULL AND col_b IS NOT NULL` expression over rolled-up
-- columns evaluates incorrectly here (reproducible even inside CASE WHEN) —
-- so subtotal-vs-grand-total classification beyond rollup_label is done in
-- the API layer (backend/routes/olap.js) by checking the raw NULLs, not in
-- SQL. rollup_label itself only needs single-column IS NULL checks, which
-- evaluate correctly.

DROP VIEW IF EXISTS dw_maintenance_cost_rollup_view;
DROP VIEW IF EXISTS dw_failure_rollup_view;

CREATE VIEW dw_maintenance_cost_rollup_view AS
SELECT
    dd.manufacturer_name,
    dd.type_name,
    CASE
        WHEN dd.manufacturer_name IS NULL THEN 'Grand Total'
        WHEN dd.type_name IS NULL THEN CONCAT(dd.manufacturer_name, ' — Subtotal')
        ELSE CONCAT(dd.manufacturer_name, ' / ', dd.type_name)
    END AS rollup_label,
    COUNT(fm.maintenance_key) AS maintenance_records,
    ROUND(SUM(fm.maintenance_cost), 2) AS total_maintenance_cost,
    ROUND(AVG(fm.maintenance_cost), 2) AS avg_maintenance_cost
FROM dw_fact_maintenance fm
JOIN dw_dim_device dd ON dd.device_key = fm.device_key
GROUP BY dd.manufacturer_name, dd.type_name WITH ROLLUP;

CREATE VIEW dw_failure_rollup_view AS
SELECT
    dt.year_number,
    dt.quarter_number,
    CASE
        WHEN dt.year_number IS NULL THEN 'Grand Total'
        WHEN dt.quarter_number IS NULL THEN CONCAT(dt.year_number, ' — Subtotal')
        ELSE CONCAT(dt.year_number, ' Q', dt.quarter_number)
    END AS rollup_label,
    COUNT(ff.failure_key) AS failure_reports,
    SUM(ff.failure_event_count) AS total_failure_events,
    ROUND(SUM(ff.downtime_hours), 2) AS total_downtime_hours
FROM dw_fact_failure ff
JOIN dw_dim_date dt ON dt.date_key = ff.date_key
GROUP BY dt.year_number, dt.quarter_number WITH ROLLUP;

-- Example ad-hoc rollups (run manually to explore further):
--
-- Cost rolled up from country up to grand total:
-- SELECT dd.country, COUNT(*) AS records, ROUND(SUM(fm.maintenance_cost), 2) AS total_cost
-- FROM dw_fact_maintenance fm
-- JOIN dw_dim_device dd ON dd.device_key = fm.device_key
-- GROUP BY dd.country WITH ROLLUP;
