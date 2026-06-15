const express = require("express");
const { pool } = require("../config/mysql");

const router = express.Router();

async function fetchFailureById(connection, failureId) {
  const [rows] = await connection.query(
    `SELECT
      fr.failure_id,
      fr.device_id,
      d.device_code,
      dt.type_name,
      m.manufacturer_name,
      fr.failure_event_count,
      fr.downtime_hours,
      fr.severity,
      fr.report_status,
      fr.created_at
    FROM failure_reports fr
    JOIN devices d ON fr.device_id = d.device_id
    JOIN device_types dt ON d.device_type_id = dt.device_type_id
    JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
    WHERE fr.failure_id = ?`,
    [failureId]
  );

  return rows[0] || null;
}

// failure list
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        fr.failure_id,
        fr.device_id,
        d.device_code,
        fr.failure_event_count,
        fr.downtime_hours,
        fr.severity,
        fr.report_status,
        fr.created_at
      FROM failure_reports fr
      JOIN devices d ON fr.device_id = d.device_id
      ORDER BY fr.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load failure summary",
      error: error.message
    });
  }
});

// failure summary
router.get("/summary", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        dt.type_name,
        COUNT(fr.failure_id) AS total_failure_reports,
        SUM(fr.failure_event_count) AS total_failure_events,
        ROUND(AVG(fr.downtime_hours), 2) AS avg_downtime_hours
      FROM failure_reports fr
      JOIN devices d ON fr.device_id = d.device_id
      JOIN device_types dt ON d.device_type_id = dt.device_type_id
      GROUP BY dt.type_name
      ORDER BY total_failure_events DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load failure summary",
      error: error.message
    });
  }
});

// above-average failure devices
router.get("/above-average-devices", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
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
      ORDER BY fr.failure_event_count DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load above-average failure devices",
      error: error.message
    });
  }
});

// single failure lookup
router.get("/:id", async (req, res) => {
  try {
    const failure = await fetchFailureById(pool, req.params.id);

    if (!failure) {
      return res.status(404).json({
        success: false,
        message: "Failure record not found"
      });
    }

    res.json({ success: true, data: failure });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load failure record",
      error: error.message
    });
  }
});

module.exports = router;
