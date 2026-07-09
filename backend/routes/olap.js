const express = require("express");
const pool = require("../config/mysql");
const { success, serverError } = require("../utils/apiResponse");

const router = express.Router();

const INDEX_TABLES = [
  "devices",
  "failure_reports",
  "maintenance_records",
  "dw_dim_device",
  "dw_fact_failure",
  "dw_fact_maintenance"
];

function handleOlapError(res, message, error) {
  if (error.code === "ER_NO_SUCH_TABLE") {
    return res.status(500).json({
      success: false,
      message: `${message}. Run database/sql/olap_warehouse.sql after loading the dataset.`,
      details: error.message
    });
  }

  return serverError(res, message, error);
}

function normaliseLimit(value, fallback = 20, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

// GET /api/olap/summary
// Warehouse-level KPI summary built from star-schema fact and dimension tables.
router.get("/summary", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM dw_dim_device) AS warehouse_devices,
        (SELECT COUNT(*) FROM dw_dim_date) AS date_dimension_rows,
        (SELECT COUNT(*) FROM dw_fact_failure) AS failure_fact_rows,
        (SELECT COUNT(*) FROM dw_fact_maintenance) AS maintenance_fact_rows,
        (SELECT ROUND(SUM(maintenance_cost), 2) FROM dw_fact_maintenance) AS total_maintenance_cost,
        (SELECT ROUND(AVG(maintenance_cost), 2) FROM dw_fact_maintenance) AS avg_maintenance_cost,
        (SELECT SUM(failure_event_count) FROM dw_fact_failure) AS total_failure_events,
        (SELECT ROUND(SUM(downtime_hours), 2) FROM dw_fact_failure) AS total_downtime_hours`
    );

    success(res, rows[0] || {});
  } catch (error) {
    handleOlapError(res, "Failed to load OLAP warehouse summary", error);
  }
});

// GET /api/olap/maintenance-cost
// Drill-down style maintenance cost analysis by manufacturer and device type.
router.get("/maintenance-cost", async (req, res) => {
  try {
    const limit = normaliseLimit(req.query.limit, 20, 100);

    const [rows] = await pool.query(
      `SELECT
        manufacturer_name,
        type_name,
        SUM(maintenance_records) AS maintenance_records,
        ROUND(SUM(total_maintenance_cost), 2) AS total_maintenance_cost,
        ROUND(SUM(total_maintenance_cost) / NULLIF(SUM(maintenance_records), 0), 2) AS avg_maintenance_cost,
        SUM(total_maintenance_frequency) AS total_maintenance_frequency
      FROM dw_maintenance_cost_cube_view
      GROUP BY manufacturer_name, type_name
      ORDER BY total_maintenance_cost DESC
      LIMIT ?`,
      [limit]
    );

    success(res, rows);
  } catch (error) {
    handleOlapError(res, "Failed to load OLAP maintenance cost analysis", error);
  }
});

// GET /api/olap/failure-cube
// Failure cube grouped by manufacturer, device type, year, quarter, and severity.
router.get("/failure-cube", async (req, res) => {
  try {
    const limit = normaliseLimit(req.query.limit, 50, 200);

    const [rows] = await pool.query(
      `SELECT
        manufacturer_name,
        type_name,
        year_number,
        quarter_number,
        severity,
        SUM(failure_reports) AS failure_reports,
        SUM(total_failure_events) AS total_failure_events,
        ROUND(SUM(total_downtime_hours), 2) AS total_downtime_hours,
        ROUND(SUM(total_downtime_hours) / NULLIF(SUM(failure_reports), 0), 2) AS avg_downtime_hours
      FROM dw_failure_cube_view
      GROUP BY manufacturer_name, type_name, year_number, quarter_number, severity
      ORDER BY total_failure_events DESC, total_downtime_hours DESC
      LIMIT ?`,
      [limit]
    );

    success(res, rows);
  } catch (error) {
    handleOlapError(res, "Failed to load OLAP failure cube", error);
  }
});

// GET /api/olap/failure-trend
// Time-series rollup for line chart visualisation.
router.get("/failure-trend", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        dt.year_number,
        dt.quarter_number,
        COUNT(ff.failure_key) AS failure_reports,
        SUM(ff.failure_event_count) AS total_failure_events,
        ROUND(SUM(ff.downtime_hours), 2) AS total_downtime_hours
      FROM dw_fact_failure ff
      JOIN dw_dim_date dt ON dt.date_key = ff.date_key
      GROUP BY dt.year_number, dt.quarter_number
      ORDER BY dt.year_number ASC, dt.quarter_number ASC`
    );

    success(res, rows);
  } catch (error) {
    handleOlapError(res, "Failed to load OLAP failure trend", error);
  }
});

// GET /api/olap/risk-matrix
// Cross-analysis between device risk, maintenance priority, failures, downtime, and cost.
router.get("/risk-matrix", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        dd.risk_status,
        fm.maintenance_priority,
        COUNT(DISTINCT dd.device_key) AS devices,
        COUNT(DISTINCT fm.maintenance_key) AS maintenance_records,
        ROUND(SUM(fm.maintenance_cost), 2) AS total_maintenance_cost,
        SUM(ff.failure_event_count) AS total_failure_events,
        ROUND(SUM(ff.downtime_hours), 2) AS total_downtime_hours
      FROM dw_dim_device dd
      JOIN dw_fact_maintenance fm ON fm.device_key = dd.device_key
      LEFT JOIN dw_fact_failure ff ON ff.device_key = dd.device_key
      GROUP BY dd.risk_status, fm.maintenance_priority
      ORDER BY
        FIELD(dd.risk_status, 'Critical', 'High', 'Medium', 'Low'),
        FIELD(fm.maintenance_priority, 'Critical', 'High', 'Medium', 'Low')`
    );

    success(res, rows);
  } catch (error) {
    handleOlapError(res, "Failed to load OLAP risk matrix", error);
  }
});

// GET /api/olap/btree-indexes
// Lists OLTP and OLAP indexes used to demonstrate MySQL/InnoDB B+ tree access.
router.get("/btree-indexes", async (_req, res) => {
  try {
    const indexResults = {};

    for (const tableName of INDEX_TABLES) {
      const [rows] = await pool.query(`SHOW INDEX FROM ${tableName}`);
      indexResults[tableName] = rows.map(row => ({
        table_name: row.Table,
        index_name: row.Key_name,
        column_name: row.Column_name,
        sequence: row.Seq_in_index,
        unique: row.Non_unique === 0,
        index_type: row.Index_type
      }));
    }

    success(res, {
      storage_engine_note:
        "MySQL InnoDB uses B+ tree structures for normal primary and secondary indexes.",
      tables: indexResults
    });
  } catch (error) {
    handleOlapError(res, "Failed to load B+ tree index metadata", error);
  }
});

module.exports = router;
