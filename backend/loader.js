/**
 * MedTrack data loader
 *
 * Reads cleaned_medtrack_dataset.csv and populates:
 *   MySQL  — manufacturers, device_types, technicians, parts, devices,
 *            failure_reports, maintenance_records, maintenance_parts
 *   MongoDB — technician_notes (one doc per device, keyed by device_code)
 *
 * Usage:
 *   node database/loader.js
 *
 * Env vars (all optional, defaults match backend/config/*):
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   MONGO_URI, MONGO_DB
 */

'use strict';

const fs    = require('fs');
const path  = require('path');
const rl    = require('readline');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

// ── Config ──────────────────────────────────────────────────────────────────

const MYSQL_CONFIG = {
  host:     process.env.MYSQL_HOST     || 'localhost',
  port:     parseInt(process.env.MYSQL_PORT || '3306'),
  user:     process.env.MYSQL_USER     || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'medtrack',
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB  = process.env.MONGO_DB  || 'medtrack_nosql';

const CSV_PATH = path.join(__dirname, '../database/cleaned', 'cleaned_medtrack_dataset.csv');

// ── Static seed data ─────────────────────────────────────────────────────────

const TECHNICIANS = [
  { full_name: 'Daniel Tan',   email: 'daniel.tan@medtrack.local',   specialisation: 'CT & MRI Systems'       },
  { full_name: 'Aisha Lim',    email: 'aisha.lim@medtrack.local',    specialisation: 'Infusion Devices'        },
  { full_name: 'Marcus Lee',   email: 'marcus.lee@medtrack.local',   specialisation: 'Patient Monitoring'      },
  { full_name: 'Priya Nair',   email: 'priya.nair@medtrack.local',   specialisation: 'Defibrillator Systems'   },
  { full_name: 'Ethan Wong',   email: 'ethan.wong@medtrack.local',   specialisation: 'General Biomedical'      },
  { full_name: 'Sarah Kim',    email: 'sarah.kim@medtrack.local',    specialisation: 'PET & Nuclear Medicine'  },
  { full_name: 'James Patel',  email: 'james.patel@medtrack.local',  specialisation: 'Radiology Equipment'     },
  { full_name: 'Linda Cruz',   email: 'linda.cruz@medtrack.local',   specialisation: 'X-Ray & Imaging Systems' },
];

const PARTS = [
  { part_name: 'Battery Module',   unit_cost: 180.00, stock_quantity: 25  },
  { part_name: 'Pressure Sensor',  unit_cost:  95.00, stock_quantity: 40  },
  { part_name: 'Control Board',    unit_cost: 350.00, stock_quantity: 12  },
  { part_name: 'Tubing Connector', unit_cost:  25.00, stock_quantity: 100 },
  { part_name: 'Display Panel',    unit_cost: 220.00, stock_quantity: 15  },
  { part_name: 'Imaging Detector', unit_cost: 480.00, stock_quantity:  8  },
  { part_name: 'Power Adapter',    unit_cost:  75.00, stock_quantity: 30  },
  { part_name: 'Flow Sensor',      unit_cost: 130.00, stock_quantity: 18  },
  { part_name: 'Filter Cartridge', unit_cost:  45.00, stock_quantity: 60  },
  { part_name: 'Pump Motor',       unit_cost: 280.00, stock_quantity: 10  },
];

// Risk category per device type
const DEVICE_TYPE_RISK = {
  'CT Scanner':    'High',
  'Defibrillator': 'High',
  'Infusion Pump': 'High',
  'MRI Scanner':   'High',
  'PET Scanner':   'Medium',
  'X-Ray Machine': 'Medium',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

// Split a CSV line into exactly `numCols` fields.
// Any overflow on the last field (commas inside maintenance_report) is rejoined.
function splitCSVLine(line, numCols) {
  const parts = line.split(',');
  if (parts.length <= numCols) return parts;
  const fixed = parts.slice(0, numCols - 1);
  fixed.push(parts.slice(numCols - 1).join(','));
  return fixed;
}

function parseCsv(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    let headers = null;
    const reader = rl.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
    reader.on('line', line => {
      if (!line.trim()) return;
      if (!headers) {
        headers = line.split(',').map(h => h.trim());
        return;
      }
      const values = splitCSVLine(line, headers.length);
      const row = {};
      headers.forEach((h, i) => { row[h] = (values[i] || '').trim(); });
      rows.push(row);
    });
    reader.on('close', () => resolve(rows));
    reader.on('error', reject);
  });
}

// Derive failure severity from event count — matches trigger thresholds
function severityFromCount(count) {
  if (count >= 5) return 'Critical';
  if (count >= 3) return 'High';
  if (count >= 2) return 'Medium';
  return 'Low';
}

function reportStatusFromSeverity(severity) {
  if (severity === 'Critical' || severity === 'High') return 'Open';
  if (severity === 'Medium') return 'In Progress';
  return 'Resolved';
}

// Map CSV priority labels to schema ENUM
function normalisePriority(raw) {
  const map = { Urgent: 'High', Scheduled: 'Medium', Routine: 'Low' };
  return map[raw] || 'Medium';
}

function repairStatusFromPriority(csvPriority) {
  if (csvPriority === 'Urgent')    return 'In Progress';
  return 'Completed';
}

function extractTags(note) {
  const keywords = [
    'battery', 'sensor', 'software', 'component', 'pressure',
    'voltage', 'overheating', 'calibration', 'replacement', 'emergency',
    'data loss', 'shutdown', 'upgrade', 'inspection',
  ];
  const lower = note.toLowerCase();
  return keywords.filter(k => lower.includes(k));
}

// Deterministic pseudo-random pick to keep the script idempotent
function pick(arr, seed) {
  return arr[seed % arr.length];
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('[loader] Reading CSV…');
  const rows = await parseCsv(CSV_PATH);
  console.log(`[loader] ${rows.length} rows loaded`);

  const manufacturerNames = [...new Set(rows.map(r => r.manufacturer))].sort();
  const deviceTypeNames   = [...new Set(rows.map(r => r.device_type))].sort();
  console.log('[loader] Manufacturers:', manufacturerNames.join(', '));
  console.log('[loader] Device types: ', deviceTypeNames.join(', '));

  const conn = await mysql.createConnection(MYSQL_CONFIG);
  const mongoClient = new MongoClient(MONGO_URI);
  await mongoClient.connect();
  const mongoDB = mongoClient.db(MONGO_DB);

  try {
    await conn.beginTransaction();

    // ── Manufacturers ──────────────────────────────────────────────────────
    const manufacturerIds = {};
    for (const name of manufacturerNames) {
      const [res] = await conn.execute(
        `INSERT INTO manufacturers (manufacturer_name)
         VALUES (?)
         ON DUPLICATE KEY UPDATE manufacturer_id = LAST_INSERT_ID(manufacturer_id)`,
        [name]
      );
      manufacturerIds[name] = res.insertId;
    }
    console.log(`[loader] ${Object.keys(manufacturerIds).length} manufacturers ready`);

    // ── Device types ───────────────────────────────────────────────────────
    const deviceTypeIds = {};
    for (const typeName of deviceTypeNames) {
      const rc = DEVICE_TYPE_RISK[typeName] || 'Medium';
      const [res] = await conn.execute(
        `INSERT INTO device_types (type_name, risk_category)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE device_type_id = LAST_INSERT_ID(device_type_id)`,
        [typeName, rc]
      );
      deviceTypeIds[typeName] = res.insertId;
    }
    console.log(`[loader] ${Object.keys(deviceTypeIds).length} device types ready`);

    // ── Technicians ────────────────────────────────────────────────────────
    const techIds = [];
    for (const t of TECHNICIANS) {
      const [res] = await conn.execute(
        `INSERT INTO technicians (full_name, email, specialisation)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE technician_id = LAST_INSERT_ID(technician_id)`,
        [t.full_name, t.email, t.specialisation]
      );
      techIds.push(res.insertId);
    }
    console.log(`[loader] ${techIds.length} technicians ready`);

    // ── Parts ──────────────────────────────────────────────────────────────
    const partIds = [];
    for (const p of PARTS) {
      const [res] = await conn.execute(
        `INSERT INTO parts (part_name, unit_cost, stock_quantity) VALUES (?, ?, ?)`,
        [p.part_name, p.unit_cost, p.stock_quantity]
      );
      partIds.push(res.insertId);
    }
    console.log(`[loader] ${partIds.length} parts ready`);

    // ── Devices, failure reports, maintenance records ───────────────────────
    let deviceCount = 0;
    let skipped     = 0;
    const techNotes = [];

    for (const row of rows) {
      const failureCount = parseInt(row.failure_event_count) || 0;
      const severity     = severityFromCount(failureCount);

      // Insert device
      let deviceId;
      try {
        const [dRes] = await conn.execute(
          `INSERT INTO devices
             (device_code, device_type_id, manufacturer_id, model, country, purchase_date, age_years, risk_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            row.device_code,
            deviceTypeIds[row.device_type],
            manufacturerIds[row.manufacturer],
            row.model     || null,
            row.country   || null,
            row.purchase_date || null,
            parseInt(row.age_years) || null,
            row.risk_status || 'Low',
          ]
        );
        deviceId = dRes.insertId;
      } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') { skipped++; continue; }
        throw err;
      }

      // Failure report — trigger will recalculate devices.risk_status
      await conn.execute(
        `INSERT INTO failure_reports
           (device_id, failure_event_count, downtime_hours, severity, report_status)
         VALUES (?, ?, ?, ?, ?)`,
        [
          deviceId,
          failureCount,
          parseFloat(row.downtime_hours) || 0,
          severity,
          reportStatusFromSeverity(severity),
        ]
      );

      // Maintenance record
      const csvPriority = row.maintenance_priority || 'Routine';
      const [mRes] = await conn.execute(
        `INSERT INTO maintenance_records
           (device_id, technician_id, maintenance_frequency, maintenance_class,
            maintenance_priority, maintenance_cost, repair_status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          deviceId,
          pick(techIds, deviceId),
          parseInt(row.maintenance_frequency) || 1,
          parseInt(row.maintenance_class)     || 1,
          normalisePriority(csvPriority),
          parseFloat(row.maintenance_cost_clean) || 0,
          repairStatusFromPriority(csvPriority),
        ]
      );
      const maintenanceId = mRes.insertId;

      // 1–3 parts per maintenance record (deterministic, no duplicates)
      const numParts = 1 + (deviceId % 3);
      const usedIdx  = new Set();
      for (let i = 0; i < numParts; i++) {
        const idx = (deviceId * 3 + i * 7) % partIds.length;
        if (!usedIdx.has(idx)) {
          usedIdx.add(idx);
          await conn.execute(
            `INSERT INTO maintenance_parts (maintenance_id, part_id, quantity_used) VALUES (?, ?, ?)`,
            [maintenanceId, partIds[idx], 1 + (i % 2)]
          );
        }
      }

      // Queue MongoDB technician note
      const noteText = row.maintenance_report ? row.maintenance_report.trim() : '';
      if (noteText) {
        techNotes.push({
          device_code:     row.device_code,
          technician_name: pick(TECHNICIANS, deviceId).full_name,
          note:            noteText,
          tags:            extractTags(noteText),
          created_at:      new Date(),
        });
      }

      deviceCount++;
      if (deviceCount % 500 === 0) {
        console.log(`[loader]   …${deviceCount} devices inserted`);
      }
    }

    await conn.commit();
    console.log(`[loader] MySQL done — ${deviceCount} devices inserted, ${skipped} skipped (duplicates)`);

    // ── MongoDB technician_notes ───────────────────────────────────────────
    const col = mongoDB.collection('technician_notes');
    await col.deleteMany({});
    if (techNotes.length > 0) {
      await col.insertMany(techNotes);
      await col.createIndex({ device_code: 1 });
    }
    console.log(`[loader] MongoDB done — ${techNotes.length} technician_notes inserted`);

  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    await conn.end();
    await mongoClient.close();
  }

  console.log('[loader] All done.');
}

main().catch(err => {
  console.error('[loader] Fatal error:', err.message);
  process.exit(1);
});
