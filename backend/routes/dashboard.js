const express = require("express");
const pool = require("../config/mysql");
const Alert = require("../models/Alert");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// GET /api/dashboard
// Dashboard KPI summary
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM devices) AS total_devices,
        (SELECT COUNT(*) FROM failure_reports WHERE report_status + 0 <> 3) AS unresolved_failures,
        (SELECT COUNT(*) FROM devices WHERE risk_status + 0 >= 3) AS high_risk_devices,
        (SELECT COUNT(*) FROM maintenance_records WHERE repair_status + 0 = 3) AS completed_maintenance,
        (SELECT ROUND(AVG(maintenance_cost), 2) FROM maintenance_records) AS avg_maintenance_cost,
        (SELECT COUNT(*) FROM device_risk_score_view WHERE risk_score >= 80) AS predictive_high_risk_devices`
    );

    res.json({
      success: true,
      data: rows[0] || {
        total_devices: 0,
        unresolved_failures: 0,
        high_risk_devices: 0,
        completed_maintenance: 0,
        avg_maintenance_cost: 0,
        predictive_high_risk_devices: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard data",
      error: error.message
    });
  }
});

// GET /api/dashboard/risk-ranking
// Top high-risk device ranking from MySQL risk scoring view
router.get("/risk-ranking", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 25);

    const [rows] = await pool.query(
      `SELECT
        device_id,
        device_code,
        type_name,
        manufacturer_name,
        model,
        current_risk_status,
        failure_event_count,
        downtime_hours,
        severity,
        maintenance_frequency,
        maintenance_priority,
        maintenance_cost,
        risk_score,
        predicted_risk_level,
        recommended_action
      FROM device_risk_score_view
      ORDER BY risk_score DESC
      LIMIT ?`,
      [limit]
    );

    res.json({
      success: true,
      data: rows
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load risk ranking data",
      error: error.message
    });
  }
});

// POST /api/dashboard/risk-alerts/sync
// Create MongoDB alert history records for top high-risk devices
router.post("/risk-alerts/sync", authenticate, authorize("admin", "technician"), async (req, res) => {
  try {
    const limit = Math.min(Number(req.body?.limit) || 10, 25);

    const [riskRows] = await pool.query(
      `SELECT
        device_code,
        type_name,
        manufacturer_name,
        risk_score,
        predicted_risk_level,
        recommended_action
      FROM device_risk_score_view
      WHERE risk_score >= 80
      ORDER BY risk_score DESC
      LIMIT ?`,
      [limit]
    );

    let createdCount = 0;
    let skippedCount = 0;
    const createdAlerts = [];

    for (const row of riskRows) {
      const existingAlerts = await Alert.findAlerts({
        device_code: row.device_code,
        alert_type: "Predictive Maintenance Risk Alert",
        resolved: false
      }, 1);

      if (existingAlerts.length > 0) {
        skippedCount++;
        continue;
      }

      const alert = await Alert.createAlert({
        device_code: row.device_code,
        alert_type: "Predictive Maintenance Risk Alert",
        risk_status: row.predicted_risk_level,
        alert_message:
          `${row.device_code} has a predictive risk score of ${row.risk_score}. ` +
          `${row.recommended_action}. Device type: ${row.type_name}. Manufacturer: ${row.manufacturer_name}.`
      });

      createdCount++;
      createdAlerts.push(alert);
    }

    res.json({
      success: true,
      message: "Risk alerts synced successfully",
      data: {
        scanned_devices: riskRows.length,
        created_alerts: createdCount,
        skipped_existing_alerts: skippedCount,
        alerts: createdAlerts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to sync predictive risk alerts",
      error: error.message
    });
  }
});

module.exports = router;