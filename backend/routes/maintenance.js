const express = require("express");
const pool = require("../config/mysql");
const { success, created, badRequest, notFound, conflict, serverError } = require("../utils/apiResponse");
const {
  requireFields,
  validatePositiveId,
  validateField,
  isNonNegativeNumber
} = require("../utils/validation");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
// match values in sql script
const MAINTENANCE_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const REPAIR_STATUSES = ["Pending", "In Progress", "Completed"];

// fetch one maintenance record with technician lookup
async function fetchMaintenanceById(connection, maintenanceId) {
  const [rows] = await connection.query(
    `SELECT
      mr.maintenance_id,
      mr.device_id,
      d.device_code,
      mr.technician_id,
      t.full_name AS technician_name,
      mr.maintenance_frequency,
      mr.maintenance_class,
      mr.maintenance_priority,
      mr.maintenance_cost,
      mr.repair_status,
      mr.created_at
    FROM maintenance_records mr
    JOIN devices d ON d.device_id = mr.device_id
    LEFT JOIN technicians t ON t.technician_id = mr.technician_id
    WHERE mr.maintenance_id = ?`,
    [maintenanceId]
  );

  return rows[0] || null;
}

// GET /api/maintenance
// maintenance list
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        mr.maintenance_id,
        mr.device_id,
        d.device_code,
        mr.technician_id,
        t.full_name AS technician_name,
        mr.maintenance_frequency,
        mr.maintenance_class,
        mr.maintenance_priority,
        mr.maintenance_cost,
        mr.repair_status,
        mr.created_at
      FROM maintenance_records mr
      JOIN devices d ON d.device_id = mr.device_id
      LEFT JOIN technicians t ON t.technician_id = mr.technician_id
      ORDER BY mr.created_at DESC`
    );
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load maintenance records", error);
  }
});

// GET /api/maintenance/dashboard
// maintenance dashboard view
router.get("/dashboard", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM maintenance_dashboard_view"
    );
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load maintenance dashboard", error);
  }
});

// GET /api/maintenance/cost-by-manufacturer
// cost by manufacturer
router.get("/cost-by-manufacturer", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        m.manufacturer_name,
        COUNT(mr.maintenance_id) AS total_maintenance_records,
        SUM(mr.maintenance_cost) AS total_maintenance_cost,
        ROUND(AVG(mr.maintenance_cost), 2) AS avg_maintenance_cost
      FROM maintenance_records mr
      JOIN devices d ON mr.device_id = d.device_id
      JOIN manufacturers m ON d.manufacturer_id = m.manufacturer_id
      GROUP BY m.manufacturer_name
      ORDER BY total_maintenance_cost DESC`
    );
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load maintenance cost by manufacturer", error);
  }
});

// GET /api/maintenance/workload
// technician workload
router.get("/workload", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        t.full_name,
        t.specialisation,
        COUNT(mr.maintenance_id) AS assigned_jobs,
        SUM(mr.maintenance_cost) AS total_repair_cost,
        ROUND(AVG(mr.maintenance_cost), 2) AS avg_repair_cost
      FROM technicians t
      LEFT JOIN maintenance_records mr ON t.technician_id = mr.technician_id
      GROUP BY t.technician_id, t.full_name, t.specialisation
      ORDER BY assigned_jobs DESC`
    );
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load technician workload", error);
  }
});

// GET /api/maintenance/technicians
// technician lookup
router.get("/technicians", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT technician_id, full_name, email, specialisation
       FROM technicians
       ORDER BY full_name ASC`
    );

    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load technicians", error);
  }
});

// GET /api/maintenance/parts
// part lookup
router.get("/parts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT part_id, part_name, unit_cost, stock_quantity
       FROM parts
       ORDER BY part_name ASC`
    );

    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load parts", error);
  }
});

// GET /api/maintenance/pending
// pending maintenance
router.get("/pending", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        d.device_code,
        dt.type_name,
        mr.maintenance_priority,
        mr.repair_status,
        mr.maintenance_cost
      FROM maintenance_records mr
      JOIN devices d ON mr.device_id = d.device_id
      JOIN device_types dt ON d.device_type_id = dt.device_type_id
      WHERE mr.repair_status IN ('Pending', 'In Progress')
      ORDER BY
        FIELD(mr.maintenance_priority, 'Critical', 'High', 'Medium', 'Low'),
        mr.maintenance_cost DESC`
    );
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load pending maintenance", error);
  }
});

// GET /api/maintenance/parts-usage
// parts usage summary
router.get("/parts-usage", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
        p.part_name,
        SUM(mp.quantity_used) AS total_quantity_used,
        p.stock_quantity,
        p.unit_cost,
        SUM(mp.quantity_used * p.unit_cost) AS estimated_parts_cost
      FROM maintenance_parts mp
      JOIN parts p ON mp.part_id = p.part_id
      GROUP BY p.part_id, p.part_name, p.stock_quantity, p.unit_cost
      ORDER BY total_quantity_used DESC`
    );
    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load parts usage summary", error);
  }
});

// GET /api/maintenance/:id/parts
// maintenance parts by maintenance id
router.get("/:id/parts", async (req, res) => {
  try {
    const idError = validatePositiveId(req.params.id, "maintenance_id");
    if (idError) {
      return badRequest(res, idError);
    }
    const [rows] = await pool.query(
      `SELECT
        mp.maintenance_id,
        mp.part_id,
        p.part_name,
        p.unit_cost,
        mp.quantity_used
      FROM maintenance_parts mp
      JOIN parts p ON p.part_id = mp.part_id
      WHERE mp.maintenance_id = ?
      ORDER BY p.part_name ASC`,
      [req.params.id]
    );

    success(res, rows);
  } catch (error) {
    serverError(res, "Failed to load maintenance parts", error);
  }
});

// GET /api/maintenance/:id
// single maintenance lookup
router.get("/:id", async (req, res) => {
  try {
    const idError = validatePositiveId(req.params.id, "maintenance_id");

    if (idError) {
      return badRequest(res, idError);
    }
    const record = await fetchMaintenanceById(pool, req.params.id);
    if (!record) {
      return notFound(res, "Maintenance record not found");
    }
    success(res, record);
  } catch (error) {
    serverError(res, "Failed to load maintenance record", error);
  }
});

// POST /api/maintenance
// create maintenance record
router.post("/", authenticate, authorize("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  const {
    device_id,
    technician_id = null,
    maintenance_frequency = null,
    maintenance_class = null,
    maintenance_priority = "Medium",
    maintenance_cost = null,
    repair_status = "Pending"
  } = req.body;

  const missing = requireFields(req.body, ["device_id"]);

  if (missing) {
    return badRequest(res, missing);
  }

  let validationError = validatePositiveId(device_id, "device_id");

  if (validationError) {
    return badRequest(res, validationError);
  }

  if (technician_id !== null) {
    validationError = validatePositiveId(technician_id, "technician_id");
    if (validationError) return badRequest(res, validationError);
  }

  if (maintenance_frequency !== null && !isNonNegativeNumber(maintenance_frequency)) {
    return badRequest(res, "maintenance_frequency must be a non-negative number");
  }

  if (maintenance_class !== null && !isNonNegativeNumber(maintenance_class)) {
    return badRequest(res, "maintenance_class must be a non-negative number");
  }

  if (maintenance_cost !== null && !isNonNegativeNumber(maintenance_cost)) {
    return badRequest(res, "maintenance_cost must be a non-negative number");
  }

  validationError =
    validateField(maintenance_priority, "maintenance_priority", MAINTENANCE_PRIORITIES) ||
    validateField(repair_status, "repair_status", REPAIR_STATUSES);

  if (validationError) {
    return badRequest(res, validationError);
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO maintenance_records
        (device_id, technician_id, maintenance_frequency, maintenance_class, maintenance_priority, maintenance_cost, repair_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [device_id, technician_id, maintenance_frequency, maintenance_class, maintenance_priority, maintenance_cost, repair_status]
    );

    const record = await fetchMaintenanceById(pool, result.insertId);
    created(res, record, "Maintenance record created");
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return badRequest(res, "Invalid device_id or technician_id", error.message);
    }
    serverError(res, "Failed to create maintenance record", error);
  }
});

// PUT /api/maintenance/:id
// update maintenance record
router.put("/:id", authenticate, authorize("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  try {
    const idError = validatePositiveId(req.params.id, "maintenance_id");

    if (idError) {
      return badRequest(res, idError);
    }

    if (req.body.device_id !== undefined) {
      const validationError = validatePositiveId(req.body.device_id, "device_id");
      if (validationError) return badRequest(res, validationError);
    }

    if (req.body.technician_id !== undefined && req.body.technician_id !== null) {
      const validationError = validatePositiveId(req.body.technician_id, "technician_id");
      if (validationError) return badRequest(res, validationError);
    }

    if (req.body.maintenance_frequency !== undefined && req.body.maintenance_frequency !== null && !isNonNegativeNumber(req.body.maintenance_frequency)) {
      return badRequest(res, "maintenance_frequency must be a non-negative number");
    }

    if (req.body.maintenance_class !== undefined && req.body.maintenance_class !== null && !isNonNegativeNumber(req.body.maintenance_class)) {
      return badRequest(res, "maintenance_class must be a non-negative number");
    }

    if (req.body.maintenance_cost !== undefined && req.body.maintenance_cost !== null && !isNonNegativeNumber(req.body.maintenance_cost)) {
      return badRequest(res, "maintenance_cost must be a non-negative number");
    }

    if (req.body.maintenance_priority !== undefined) {
      const validationError = validateField(req.body.maintenance_priority, "maintenance_priority", MAINTENANCE_PRIORITIES);
      if (validationError) return badRequest(res, validationError);
    }

    if (req.body.repair_status !== undefined) {
      const validationError = validateField(req.body.repair_status, "repair_status", REPAIR_STATUSES);
      if (validationError) return badRequest(res, validationError);
    }
    const existing = await fetchMaintenanceById(pool, req.params.id);
    if (!existing) {
      return notFound(res, "Maintenance record not found");
    }

    const next = {
      device_id: req.body.device_id ?? existing.device_id,
      technician_id: req.body.technician_id ?? existing.technician_id,
      maintenance_frequency: req.body.maintenance_frequency ?? existing.maintenance_frequency,
      maintenance_class: req.body.maintenance_class ?? existing.maintenance_class,
      maintenance_priority: req.body.maintenance_priority ?? existing.maintenance_priority,
      maintenance_cost: req.body.maintenance_cost ?? existing.maintenance_cost,
      repair_status: req.body.repair_status ?? existing.repair_status
    };

    await pool.query(
      `UPDATE maintenance_records
       SET device_id = ?,
           technician_id = ?,
           maintenance_frequency = ?,
           maintenance_class = ?,
           maintenance_priority = ?,
           maintenance_cost = ?,
           repair_status = ?
       WHERE maintenance_id = ?`,
      [
        next.device_id,
        next.technician_id,
        next.maintenance_frequency,
        next.maintenance_class,
        next.maintenance_priority,
        next.maintenance_cost,
        next.repair_status,
        req.params.id
      ]
    );

    const record = await fetchMaintenanceById(pool, req.params.id);
    success(res, record, "Maintenance record updated");
  } catch (error) {
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return badRequest(res, "Invalid device_id or technician_id", error.message);
    }

    serverError(res, "Failed to update maintenance record", error);
  }
});

// PATCH /api/maintenance/:id/status
// update maintenance status
router.patch("/:id/status", authenticate, authorize("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  const { repair_status } = req.body;
  const idError = validatePositiveId(req.params.id, "maintenance_id");
  if (idError) {
    return badRequest(res, idError);
  }
  const missing = requireFields(req.body, ["repair_status"]);

  if (missing) {
    return badRequest(res, missing);
  }

  const validationError = validateField(repair_status, "repair_status", REPAIR_STATUSES);

  if (validationError) {
    return badRequest(res, validationError);
  }

  try {
    const [result] = await pool.query(
      `UPDATE maintenance_records SET repair_status = ? WHERE maintenance_id = ?`,
      [repair_status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return notFound(res, "Maintenance record not found");
    }

    const record = await fetchMaintenanceById(pool, req.params.id);
    success(res, record, "Maintenance status updated");
  } catch (error) {
    serverError(res, "Failed to update maintenance status", error);
  }
});

// POST /api/maintenance/:id/parts
// add maintenance part
router.post("/:id/parts", authenticate, authorize("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  const maintenanceId = req.params.id;
  const { part_id, quantity_used = 1 } = req.body;

  const idError = validatePositiveId(maintenanceId, "maintenance_id");

  if (idError) {
    return badRequest(res, idError);
  }

  const missing = requireFields(req.body, ["part_id"]);

  if (missing) {
    return badRequest(res, missing);
  }

  const partIdError = validatePositiveId(part_id, "part_id");

  if (partIdError) {
    return badRequest(res, partIdError);
  }

  const quantityError = validatePositiveId(quantity_used, "quantity_used");

  if (quantityError) {
    return badRequest(res, quantityError);
  }

  try {
    await pool.query(
      `INSERT INTO maintenance_parts (maintenance_id, part_id, quantity_used)
       VALUES (?, ?, ?)`,
      [maintenanceId, part_id, quantity_used]
    );

    created(
      res,
      {
        maintenance_id: Number(maintenanceId),
        part_id: Number(part_id),
        quantity_used: Number(quantity_used)
      },
      "Maintenance part added"
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return conflict(res, "This part is already linked to the maintenance record", error.message);
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return badRequest(res, "Invalid maintenance_id or part_id", error.message);
    }

    serverError(res, "Failed to add maintenance part", error);
  }
});

// PUT /api/maintenance/:maintenanceId/parts/:partId
// update maintenance part
router.put("/:maintenanceId/parts/:partId", authenticate, authorize("bme_admin", "bme_manager", "bme_engineer"), async (req, res) => {
  const { maintenanceId, partId } = req.params;
  const { quantity_used = 1 } = req.body;

  const maintenanceIdError = validatePositiveId(maintenanceId, "maintenance_id");

  if (maintenanceIdError) {
    return badRequest(res, maintenanceIdError);
  }

  const partIdError = validatePositiveId(partId, "part_id");

  if (partIdError) {
    return badRequest(res, partIdError);
  }

  const quantityError = validatePositiveId(quantity_used, "quantity_used");

  if (quantityError) {
    return badRequest(res, quantityError);
  }

  try {
    const [result] = await pool.query(
      `UPDATE maintenance_parts
       SET quantity_used = ?
       WHERE maintenance_id = ? AND part_id = ?`,
      [quantity_used, maintenanceId, partId]
    );

    if (result.affectedRows === 0) {
      return notFound(res, "Maintenance part link not found");
    }

    success(
      res,
      {
        maintenance_id: Number(maintenanceId),
        part_id: Number(partId),
        quantity_used: Number(quantity_used)
      },
      "Maintenance part updated"
    );
  } catch (error) {
    serverError(res, "Failed to update maintenance part", error);
  }
});

// DELETE /api/maintenance/:id
// delete maintenance record and dependencies
router.delete("/:id", authenticate, authorize("bme_admin"), async (req, res) => {
  const idError = validatePositiveId(req.params.id, "maintenance_id");
  if (idError) {
    return badRequest(res, idError);
  }
  const connection = await pool.getConnection();

  try {
    const existing = await fetchMaintenanceById(connection, req.params.id);
    if (!existing) {
      connection.release();
      return notFound(res, "Maintenance record not found");
    }

    await connection.beginTransaction();
    await connection.query("DELETE FROM maintenance_parts WHERE maintenance_id = ?", [req.params.id]);
    await connection.query("DELETE FROM maintenance_records WHERE maintenance_id = ?", [req.params.id]);
    await connection.commit();
    connection.release();

    success(res, undefined, "Maintenance record deleted");
  } catch (error) {
    await connection.rollback();
    connection.release();
    serverError(res, "Failed to delete maintenance record", error);
  }
});

// DELETE /api/maintenance/:maintenanceId/parts/:partId
// delete maintenance part
router.delete("/:maintenanceId/parts/:partId", authenticate, authorize("bme_admin"), async (req, res) => {
  const { maintenanceId, partId } = req.params;
  const maintenanceIdError = validatePositiveId(maintenanceId, "maintenance_id");

  if (maintenanceIdError) {
    return badRequest(res, maintenanceIdError);
  }

  const partIdError = validatePositiveId(partId, "part_id");

  if (partIdError) {
    return badRequest(res, partIdError);
  }

  try {
    const [result] = await pool.query(
      `DELETE FROM maintenance_parts WHERE maintenance_id = ? AND part_id = ?`,
      [maintenanceId, partId]
    );

    if (result.affectedRows === 0) {
      return notFound(res, "Maintenance part link not found");
    }

    success(res, undefined, "Maintenance part deleted");
  } catch (error) {
    serverError(res, "Failed to delete maintenance part", error);
  }
});

module.exports = router;
