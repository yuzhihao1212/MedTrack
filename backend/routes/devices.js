const express = require("express");
const pool = require("../config/mysql");
const { success, created, badRequest, notFound, serverError, conflict } = require("../utils/apiResponse");
const {
  requireFields,
  validatePositiveId,
  validateField,
  isNonNegativeNumber,
  isDateString
} = require("../utils/validation");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
//must match values defined in sql script
const RISK_STATUSES = ["Low", "Medium", "High", "Critical"];

// fetch one device with lookup details
async function fetchDeviceById(connection, deviceId) {
  const [rows] = await connection.query(
    `SELECT
      d.device_id,
      d.device_code,
      d.device_type_id,
      d.manufacturer_id,
      d.model,
      d.country,
      d.purchase_date,
      d.age_years,
      d.risk_status,
      dt.type_name,
      dt.risk_category,
      m.manufacturer_name,
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
        d.country,
        d.purchase_date,
        d.age_years,
        d.risk_status,
        dt.type_name,
        dt.risk_category,
        m.manufacturer_name,
        d.created_at
      FROM devices d
      JOIN device_types dt ON dt.device_type_id = d.device_type_id
      JOIN manufacturers m ON m.manufacturer_id = d.manufacturer_id
      ORDER BY d.created_at DESC`
    );

    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load devices", error);
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
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load high-risk devices", error);
  }
});

// GET /api/devices/manufacturers
// manufacturer lookup
router.get("/manufacturers", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT manufacturer_id, manufacturer_name
       FROM manufacturers
       ORDER BY manufacturer_name ASC`
    );

    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load manufacturers", error);
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

    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load device types", error);
  }
});

// GET /api/devices/:id
// single device lookup
router.get("/:id", async (req, res) => {
  try {
    const idError = validatePositiveId(req.params.id, "device_id");
    if (idError) {
      return badRequest(res, idError);
    }

    const device = await fetchDeviceById(pool, req.params.id);

    if (!device) {
      return notFound(res, "Device not found");
    }

    success(res, device);
  } catch (error) {
    serverError(res, "Failed to load device", error);
  }
});

// POST /api/devices
// create device
router.post("/", authenticate, authorize("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  const {
    device_code,
    device_type_id,
    manufacturer_id,
    model = null,
    purchase_date = null,
    age_years = null,
    risk_status = "Low"
  } = req.body;

  const missing = requireFields(req.body, [
    "device_code",
    "device_type_id",
    "manufacturer_id"
  ]);

  if (missing) {
    return badRequest(res, missing);
  }

  let validationError =
    validatePositiveId(device_type_id, "device_type_id") ||
    validatePositiveId(manufacturer_id, "manufacturer_id");

  if (validationError) {
    return badRequest(res, validationError);
  }

  if (age_years !== null && !isNonNegativeNumber(age_years)) {
    return badRequest(res, "age_years must be a non-negative number");
  }

  if (!isDateString(purchase_date)) {
    return badRequest(res, "purchase_date must use YYYY-MM-DD format");
  }

  validationError = validateField(risk_status, "risk_status", RISK_STATUSES);

  if (validationError) {
    return badRequest(res, validationError);
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO devices
        (device_code, device_type_id, manufacturer_id, model, purchase_date, age_years, risk_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [device_code, device_type_id, manufacturer_id, model, purchase_date, age_years, risk_status]
    );

    const device = await fetchDeviceById(pool, result.insertId);

    //success
    created(res, device, "Device created");

  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return conflict(res, "Device code already exists", error.message);
    }

    serverError(res, "Failed to create device", error);
  }
});

// PUT /api/devices/:id
// update device
router.put("/:id", authenticate, authorize("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  // validate before fetch device by id
  try {
    const idError = validatePositiveId(req.params.id, "device_id");

    if (idError) {
      return badRequest(res, idError);
    }
    if (req.body.device_type_id !== undefined) {
      const validationError = validatePositiveId(req.body.device_type_id, "device_type_id");
      if (validationError) return badRequest(res, validationError);
    }

    if (req.body.manufacturer_id !== undefined) {
      const validationError = validatePositiveId(req.body.manufacturer_id, "manufacturer_id");
      if (validationError) return badRequest(res, validationError);
    }

    if (req.body.age_years !== undefined && req.body.age_years !== null && !isNonNegativeNumber(req.body.age_years)) {
      return badRequest(res, "age_years must be a non-negative number");
    }

    if (req.body.purchase_date !== undefined && !isDateString(req.body.purchase_date)) {
      return badRequest(res, "purchase_date must use YYYY-MM-DD format");
    }

    if (req.body.risk_status !== undefined) {
      const validationError = validateField(req.body.risk_status, "risk_status", RISK_STATUSES);
      if (validationError) return badRequest(res, validationError);
    }

    const existing = await fetchDeviceById(pool, req.params.id);

    if (!existing) {
      return notFound(res, "Device not found");
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

    success(res, device, "Device updated");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return conflict(res, "Device code already exists", error.message);
    }

    serverError(res, "Failed to update device", error);
  }
});

// DELETE /api/devices/:id
// delete device and dependencies
router.delete("/:id", authenticate, authorize("bme_admin", "bme_manager"), async (req, res) => {
  //validate id before get connection
  const idError = validatePositiveId(req.params.id, "device_id");

  if (idError) {
    return badRequest(res, idError);
  }

  const connection = await pool.getConnection();

  try {
    const existing = await fetchDeviceById(connection, req.params.id);

    if (!existing) {
      connection.release();
      return notFound(res, "Device not found");
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

    success(res, undefined, "Device deleted");
  } catch (error) {
    await connection.rollback();
    connection.release();
    serverError(res, "Failed to delete device", error);
  }
});

module.exports = router;
