const express = require("express");
const { pool } = require("../config/mysql");

const router = express.Router();

// dashboard KPI endpoint
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM devices) AS total_devices,
        (SELECT COUNT(*) FROM failure_reports WHERE report_status != 'Resolved') AS unresolved_failures,
        (SELECT COUNT(*) FROM devices WHERE risk_status IN ('High', 'Critical')) AS high_risk_devices,
        (SELECT COUNT(*) FROM maintenance_records WHERE repair_status = 'Completed') AS completed_maintenance,
        (SELECT ROUND(AVG(maintenance_cost), 2) FROM maintenance_records) AS avg_maintenance_cost`
    );

    res.json({
      success: true,
      data: rows[0] || {
        total_devices: 0,
        unresolved_failures: 0,
        high_risk_devices: 0,
        completed_maintenance: 0,
        avg_maintenance_cost: 0
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

module.exports = router;
