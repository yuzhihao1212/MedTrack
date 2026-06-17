const express = require("express");
const pool = require("../config/mysql");

const router = express.Router();

// fetch one failure with device and manufacturer details
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

// GET /api/failures
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

// GET /api/failures/summary
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

// GET /api/failures/above-average-devices
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

// POST /api/failures
// create failure record
router.post("/", async (req, res) => {
  const {
    device_id,
    failure_event_count = 0,
    downtime_hours = null,
    severity = "Low",
    report_status = "Open"
  } = req.body;

  if (!device_id) {
    return res.status(400).json({
      success: false,
      message: "device_id is required"
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO failure_reports
        (device_id, failure_event_count, downtime_hours, severity, report_status)
       VALUES (?, ?, ?, ?, ?)`,
      [device_id, failure_event_count, downtime_hours, severity, report_status]
    );

    const failure = await fetchFailureById(pool, result.insertId);

    res.status(201).json({
      success: true,
      message: "Failure record created",
      data: failure
    });
  } catch (error) {
    res.status(error.code === "ER_NO_REFERENCED_ROW_2" ? 400 : 500).json({
      success: false,
      message: "Failed to create failure record",
      error: error.message
    });
  }
});

// PUT /api/failures/:id
// update failure record
router.put("/:id", async (req, res) => {
  try {
    const existing = await fetchFailureById(pool, req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Failure record not found"
      });
    }

    const next = {
      device_id: req.body.device_id ?? existing.device_id,
      failure_event_count: req.body.failure_event_count ?? existing.failure_event_count,
      downtime_hours: req.body.downtime_hours ?? existing.downtime_hours,
      severity: req.body.severity ?? existing.severity,
      report_status: req.body.report_status ?? existing.report_status
    };

    await pool.query(
      `UPDATE failure_reports
       SET device_id = ?,
           failure_event_count = ?,
           downtime_hours = ?,
           severity = ?,
           report_status = ?
       WHERE failure_id = ?`,
      [
        next.device_id,
        next.failure_event_count,
        next.downtime_hours,
        next.severity,
        next.report_status,
        req.params.id
      ]
    );

    const failure = await fetchFailureById(pool, req.params.id);

    res.json({
      success: true,
      message: "Failure record updated",
      data: failure
    });
  } catch (error) {
    res.status(error.code === "ER_NO_REFERENCED_ROW_2" ? 400 : 500).json({
      success: false,
      message: "Failed to update failure record",
      error: error.message
    });
  }
});

// PATCH /api/failures/:id/status
// update failure report status
router.patch("/:id/status", async (req, res) => {
  const { report_status } = req.body;

  if (!report_status) {
    return res.status(400).json({
      success: false,
      message: "report_status is required"
    });
  }

  try {
    const [result] = await pool.query(
      `UPDATE failure_reports
       SET report_status = ?
       WHERE failure_id = ?`,
      [report_status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Failure record not found"
      });
    }

    const failure = await fetchFailureById(pool, req.params.id);

    res.json({
      success: true,
      message: "Failure status updated",
      data: failure
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update failure status",
      error: error.message
    });
  }
});

// GET /api/failures/:id
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

// DELETE /api/failures/:id
// delete failure record
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await pool.query(
      `DELETE FROM failure_reports WHERE failure_id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Failure record not found"
      });
    }

    res.json({
      success: true,
      message: "Failure record deleted"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete failure record",
      error: error.message
    });
  }
});

module.exports = router;
