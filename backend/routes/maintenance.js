const express = require("express");
const { pool } = require("../config/mysql");

const router = express.Router();

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
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load maintenance records",
      error: error.message
    });
  }
});

router.get("/dashboard", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM maintenance_dashboard_view"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load maintenance dashboard",
      error: error.message
    });
  }
});

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
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load maintenance cost by manufacturer",
      error: error.message
    });
  }
});

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
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load technician workload",
      error: error.message
    });
  }
});

router.get("/technicians", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT technician_id, full_name, email, specialisation
       FROM technicians
       ORDER BY full_name ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load technicians",
      error: error.message
    });
  }
});

router.get("/parts", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT part_id, part_name, unit_cost, stock_quantity
       FROM parts
       ORDER BY part_name ASC`
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load parts",
      error: error.message
    });
  }
});

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
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load pending maintenance",
      error: error.message
    });
  }
});

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
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load parts usage summary",
      error: error.message
    });
  }
});

// record parts
router.get("/:id/parts", async (req, res) => {
  try {
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

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to load maintenance parts",
      error: error.message
    });
  }
});

// single maintenance lookup
router.get("/:id", async (req, res) => {
  try {
    const record = await fetchMaintenanceById(pool, req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Maintenance record not found" });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load maintenance record", error: error.message });
  }
});

// create maintenance record
router.post("/", async (req, res) => {
  const {
    device_id,
    technician_id = null,
    maintenance_frequency = null,
    maintenance_class = null,
    maintenance_priority = "Medium",
    maintenance_cost = null,
    repair_status = "Pending"
  } = req.body;

  if (!device_id) {
    return res.status(400).json({ success: false, message: "device_id is required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO maintenance_records
        (device_id, technician_id, maintenance_frequency, maintenance_class, maintenance_priority, maintenance_cost, repair_status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [device_id, technician_id, maintenance_frequency, maintenance_class, maintenance_priority, maintenance_cost, repair_status]
    );

    const record = await fetchMaintenanceById(pool, result.insertId);
    res.status(201).json({ success: true, message: "Maintenance record created", data: record });
  } catch (error) {
    res.status(error.code === "ER_NO_REFERENCED_ROW_2" ? 400 : 500).json({
      success: false,
      message: "Failed to create maintenance record",
      error: error.message
    });
  }
});

// update maintenance record
router.put("/:id", async (req, res) => {
  try {
    const existing = await fetchMaintenanceById(pool, req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Maintenance record not found" });
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
    res.json({ success: true, message: "Maintenance record updated", data: record });
  } catch (error) {
    res.status(error.code === "ER_NO_REFERENCED_ROW_2" ? 400 : 500).json({
      success: false,
      message: "Failed to update maintenance record",
      error: error.message
    });
  }
});

// update maintenance status
router.patch("/:id/status", async (req, res) => {
  const { repair_status } = req.body;
  if (!repair_status) {
    return res.status(400).json({ success: false, message: "repair_status is required" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE maintenance_records SET repair_status = ? WHERE maintenance_id = ?`,
      [repair_status, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Maintenance record not found" });
    }

    const record = await fetchMaintenanceById(pool, req.params.id);
    res.json({ success: true, message: "Maintenance status updated", data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update maintenance status", error: error.message });
  }
});

// add record part
router.post("/:id/parts", async (req, res) => {
  const maintenanceId = req.params.id;
  const { part_id, quantity_used = 1 } = req.body;

  if (!part_id) {
    return res.status(400).json({ success: false, message: "part_id is required" });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO maintenance_parts (maintenance_id, part_id, quantity_used)
       VALUES (?, ?, ?)`,
      [maintenanceId, part_id, quantity_used]
    );

    res.status(201).json({
      success: true,
      message: "Maintenance part added",
      data: { maintenance_id: maintenanceId, part_id, quantity_used }
    });
  } catch (error) {
    const status = error.code === "ER_DUP_ENTRY" ? 409 : 500;
    res.status(status).json({
      success: false,
      message: "Failed to add maintenance part",
      error: error.message
    });
  }
});

// update record part
router.put("/:maintenanceId/parts/:partId", async (req, res) => {
  const { maintenanceId, partId } = req.params;
  const { quantity_used = 1 } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE maintenance_parts
       SET quantity_used = ?
       WHERE maintenance_id = ? AND part_id = ?`,
      [quantity_used, maintenanceId, partId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Maintenance part link not found" });
    }

    res.json({
      success: true,
      message: "Maintenance part updated",
      data: { maintenance_id: maintenanceId, part_id: Number(partId), quantity_used }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update maintenance part",
      error: error.message
    });
  }
});

// delete maintenance record and dependencies
router.delete("/:id", async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const existing = await fetchMaintenanceById(connection, req.params.id);
    if (!existing) {
      connection.release();
      return res.status(404).json({ success: false, message: "Maintenance record not found" });
    }

    await connection.beginTransaction();
    await connection.query("DELETE FROM maintenance_parts WHERE maintenance_id = ?", [req.params.id]);
    await connection.query("DELETE FROM maintenance_records WHERE maintenance_id = ?", [req.params.id]);
    await connection.commit();
    connection.release();

    res.json({ success: true, message: "Maintenance record deleted" });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ success: false, message: "Failed to delete maintenance record", error: error.message });
  }
});

// delete parts
router.delete("/:maintenanceId/parts/:partId", async (req, res) => {
  const { maintenanceId, partId } = req.params;

  try {
    const [result] = await pool.query(
      `DELETE FROM maintenance_parts WHERE maintenance_id = ? AND part_id = ?`,
      [maintenanceId, partId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Maintenance part link not found" });
    }

    res.json({ success: true, message: "Maintenance part deleted" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete maintenance part",
      error: error.message
    });
  }
});

module.exports = router;
