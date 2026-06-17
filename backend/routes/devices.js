const express = require("express");
const pool = require("../config/mysql");

const router = express.Router();

// fetch one device with lookup details
async function fetchDeviceById(connection, deviceId) {
  const [rows] = await connection.query(
    `SELECT
      d.device_id,
      d.device_code,
      d.device_type_id,
      d.manufacturer_id,
      d.model,
      d.purchase_date,
      d.age_years,
      d.risk_status,
      dt.type_name,
      dt.risk_category,
      m.manufacturer_name,
      m.country,
      d.created_at
    FROM devices d
    JOIN device_types dt ON dt.device_type_id = d.device_type_id
    JOIN manufacturers m ON m.manufacturer_id = d.manufacturer_id
    WHERE d.device_id = ?`,
    [deviceId]
  );

  return rows[0] || null;
}

// GET /api/devices
// device list
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        d.device_id,
        d.device_code,
        d.device_type_id,
        d.manufacturer_id,
        d.model,
        d.purchase_date,
        d.age_years,
        d.risk_status,
        dt.type_name,
        dt.risk_category,
        m.manufacturer_name,
        m.country,
        d.created_at
      FROM devices d
      JOIN device_types dt ON dt.device_type_id = d.device_type_id
      JOIN manufacturers m ON m.manufacturer_id = d.manufacturer_id
      ORDER BY d.created_at DESC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load devices",
      error: error.message
    });
  }
});

// GET /api/devices/high-risk
// high-risk devices
router.get("/high-risk", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        d.device_code,
        dt.type_name,
        m.manufacturer_name,
        d.model,
        d.age_years,
        d.risk_status
      FROM devices d
      JOIN device_types dt ON d.device_type_id = dt.device_type_id
      JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
      WHERE d.risk_status IN ('High', 'Critical')
      ORDER BY d.risk_status DESC, d.age_years DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load high-risk devices",
      error: error.message
    });
  }
});

// GET /api/devices/manufacturers
// manufacturer lookup
router.get("/manufacturers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT manufacturer_id, manufacturer_name, country
       FROM manufacturers
       ORDER BY manufacturer_name ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load manufacturers",
      error: error.message
    });
  }
});

// GET /api/devices/device-types
// device type lookup
router.get("/device-types", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT device_type_id, type_name, risk_category
       FROM device_types
       ORDER BY type_name ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load device types",
      error: error.message
    });
  }
});

// GET /api/devices/:id
// single device lookup
router.get("/:id", async (req, res) => {
  try {
    const device = await fetchDeviceById(pool, req.params.id);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load device",
      error: error.message
    });
  }
});

// POST /api/devices
// create device
router.post("/", async (req, res) => {
  const {
    device_code,
    device_type_id,
    manufacturer_id,
    model = null,
    purchase_date = null,
    age_years = null,
    risk_status = "Low"
  } = req.body;

  if (!device_code || !device_type_id || !manufacturer_id) {
    return res.status(400).json({
      success: false,
      message: "device_code, device_type_id, and manufacturer_id are required"
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO devices
        (device_code, device_type_id, manufacturer_id, model, purchase_date, age_years, risk_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [device_code, device_type_id, manufacturer_id, model, purchase_date, age_years, risk_status]
    );

    const device = await fetchDeviceById(pool, result.insertId);

    res.status(201).json({
      success: true,
      message: "Device created",
      data: device
    });
  } catch (error) {
    const status = error.code === "ER_DUP_ENTRY" ? 409 : 500;
    res.status(status).json({
      success: false,
      message: "Failed to create device",
      error: error.message
    });
  }
});

// PUT /api/devices/:id
// update device
router.put("/:id", async (req, res) => {
  try {
    const existing = await fetchDeviceById(pool, req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    const next = {
      device_code: req.body.device_code ?? existing.device_code,
      device_type_id: req.body.device_type_id ?? existing.device_type_id,
      manufacturer_id: req.body.manufacturer_id ?? existing.manufacturer_id,
      model: req.body.model ?? existing.model,
      purchase_date: req.body.purchase_date ?? existing.purchase_date,
      age_years: req.body.age_years ?? existing.age_years,
      risk_status: req.body.risk_status ?? existing.risk_status
    };

    await pool.query(
      `UPDATE devices
       SET device_code = ?,
           device_type_id = ?,
           manufacturer_id = ?,
           model = ?,
           purchase_date = ?,
           age_years = ?,
           risk_status = ?
       WHERE device_id = ?`,
      [
        next.device_code,
        next.device_type_id,
        next.manufacturer_id,
        next.model,
        next.purchase_date,
        next.age_years,
        next.risk_status,
        req.params.id
      ]
    );

    const device = await fetchDeviceById(pool, req.params.id);

    res.json({
      success: true,
      message: "Device updated",
      data: device
    });
  } catch (error) {
    const status = error.code === "ER_DUP_ENTRY" ? 409 : 500;
    res.status(status).json({
      success: false,
      message: "Failed to update device",
      error: error.message
    });
  }
});

// DELETE /api/devices/:id
// delete device and dependencies
router.delete("/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const existing = await fetchDeviceById(connection, req.params.id);

    if (!existing) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: "Device not found"
      });
    }

    await connection.beginTransaction();

    await connection.query(
      `DELETE mp
       FROM maintenance_parts mp
       JOIN maintenance_records mr ON mr.maintenance_id = mp.maintenance_id
       WHERE mr.device_id = ?`,
      [req.params.id]
    );

    await connection.query(
      "DELETE FROM maintenance_records WHERE device_id = ?",
      [req.params.id]
    );

    await connection.query(
      "DELETE FROM failure_reports WHERE device_id = ?",
      [req.params.id]
    );

    await connection.query("DELETE FROM devices WHERE device_id = ?", [
      req.params.id
    ]);

    await connection.commit();
    connection.release();

    res.json({
      success: true,
      message: "Device deleted"
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({
      success: false,
      message: "Failed to delete device",
      error: error.message
    });
  }
});

module.exports = router;
