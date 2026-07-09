const express = require("express");
const pool = require("../config/mysql");
const { success, created, badRequest, notFound, serverError } = require("../utils/apiResponse");
const { requireRole } = require("../middleware/auth");
const {
  requireFields,
  validatePositiveId,
  validateField,
  isNonNegativeNumber
} = require("../utils/validation");

const router = express.Router();

//match values in sql file
const SEVERITIES = ["Low", "Medium", "High", "Critical"];
const REPORT_STATUSES = ["Open", "In Progress", "Resolved"];

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
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load failure records", error);
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
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load failure records", error);
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
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load failure records", error);
  }
});

// POST /api/failures
// create failure record
router.post("/", requireRole("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  const {
    device_id,
    failure_event_count = 0,
    downtime_hours = null,
    severity = "Low",
    report_status = "Open"
  } = req.body;

  const missing = requireFields(req.body, ["device_id"]);

  if (missing) {
    return badRequest(res, missing);
  }

  let validationError =
    validatePositiveId(device_id, "device_id") ||
    validateField(severity, "severity", SEVERITIES) ||
    validateField(report_status, "report_status", REPORT_STATUSES);

  if (validationError) {
    return badRequest(res, validationError);
  }

  if (!isNonNegativeNumber(failure_event_count)) {
    return badRequest(res, "failure_event_count must be a non-negative number");
  }

  if (!isNonNegativeNumber(downtime_hours)) {
    return badRequest(res, "downtime_hours must be a non-negative number");
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO failure_reports
        (device_id, failure_event_count, downtime_hours, severity, report_status)
       VALUES (?, ?, ?, ?, ?)`,
      [device_id, failure_event_count, downtime_hours, severity, report_status]
    );

    const failure = await fetchFailureById(pool, result.insertId);

    created(res, failure, "Failure record created");
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return badRequest(res, "Invalid device_id", error.message);
    }

    serverError(res, "Failed to create failure record", error);
  }
});

// PUT /api/failures/:id
// update failure record
router.put("/:id", requireRole("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  try {
    const idError = validatePositiveId(req.params.id, "failure_id");

    if (idError) {
      return badRequest(res, idError);
    }

    if (req.body.device_id !== undefined) {
      const validationError = validatePositiveId(req.body.device_id, "device_id");
      if (validationError) return badRequest(res, validationError);
    }

    if (req.body.failure_event_count !== undefined && !isNonNegativeNumber(req.body.failure_event_count)) {
      return badRequest(res, "failure_event_count must be a non-negative number");
    }

    if (req.body.downtime_hours !== undefined && !isNonNegativeNumber(req.body.downtime_hours)) {
      return badRequest(res, "downtime_hours must be a non-negative number");
    }

    if (req.body.severity !== undefined) {
      const validationError = validateField(req.body.severity, "severity", SEVERITIES);
      if (validationError) return badRequest(res, validationError);
    }

    if (req.body.report_status !== undefined) {
      const validationError = validateField(req.body.report_status, "report_status", REPORT_STATUSES);
      if (validationError) return badRequest(res, validationError);
    }


    const existing = await fetchFailureById(pool, req.params.id);

    if (!existing) {
      return notFound(res, "Failure record not found");
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

    success(res, failure, "Failure record updated");
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return badRequest(res, "Invalid device_id", error.message);
    }
    serverError(res, "Failed to update failure record", error);
  }
});

// PATCH /api/failures/:id/status
// update failure report status
router.patch("/:id/status", requireRole("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  const { report_status } = req.body;
  const idError = validatePositiveId(req.params.id, "failure_id");

  if (idError) {
    return badRequest(res, idError);
  }

  const missing = requireFields(req.body, ["report_status"]);
  if (missing) {
    return badRequest(res, missing);
  }
  const validationError = validateField(report_status, "report_status", REPORT_STATUSES);
  if (validationError) {
    return badRequest(res, validationError);
  }

  try {
    const [result] = await pool.query(
      `UPDATE failure_reports
       SET report_status = ?
       WHERE failure_id = ?`,
      [report_status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return notFound(res, "Failure record not found");
    }

    const failure = await fetchFailureById(pool, req.params.id);

    success(res, failure, "Failure status updated");
  } catch (error) {
    serverError(res, "Failed to update failure status", error);
  }
});

// GET /api/failures/:id
// single failure lookup
router.get("/:id", async (req, res) => {
  try {
    const idError = validatePositiveId(req.params.id, "failure_id");
    if (idError) {
      return badRequest(res, idError);
    }
    const failure = await fetchFailureById(pool, req.params.id);

    if (!failure) {
      return notFound(res, "Failure record not found");
    }

    success(res, failure);
  } catch (error) {
    serverError(res, "Failed to load failure record", error);
  }
});

// DELETE /api/failures/:id
// delete failure record
router.delete("/:id", requireRole("bme_admin"), async (req, res) => {
  try {
    const idError = validatePositiveId(req.params.id, "failure_id");

    if (idError) {
      return badRequest(res, idError);
    }
    const [result] = await pool.query(
      `DELETE FROM failure_reports WHERE failure_id = ?`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return notFound(res, "Failure record not found");
    }

    success(res, undefined, "Failure record deleted");
  } catch (error) {
    serverError(res, "Failed to delete failure record", error);
  }
});

module.exports = router;
