USE medtrack;

-- Database-level access control (DCL: GRANT / REVOKE / CREATE ROLE / CREATE USER).
-- This is the DB-layer counterpart to the app-level JWT RBAC in
-- backend/middleware/auth.js. The three roles below map to the current
-- `users.role` values: bme_analyst, bme_engineer, bme_admin.
--
-- Requires MySQL 8.0+ or MariaDB 10.4+ (role support). Written and verified
-- against MariaDB 12.2 — this project's actual DB engine, despite the
-- "MySQL" naming throughout the rest of the codebase. Safe to re-run.

-- ── Roles (privilege templates) ────────────────────────────────────────────

CREATE ROLE IF NOT EXISTS
  'medtrack_bme_analyst',
  'medtrack_bme_engineer',
  'medtrack_bme_admin';

DROP USER IF EXISTS 'medtrack_db_manager'@'%';
DROP ROLE IF EXISTS 'medtrack_bme_manager';

-- Analyst: read-only. Intended for dashboard, OLAP, and report review.
GRANT SELECT ON medtrack.* TO 'medtrack_bme_analyst';

-- Engineer: can read and write day-to-day operational data (devices,
-- failures, maintenance), but cannot delete rows, touch the users table,
-- or change schema. Granted table-by-table (least privilege) rather than
-- "GRANT ALL then REVOKE", since REVOKE on a single table cannot undo a
-- database-wide wildcard grant. The users table is simply never granted.
GRANT SELECT, INSERT, UPDATE ON medtrack.devices             TO 'medtrack_bme_engineer';
GRANT SELECT, INSERT, UPDATE ON medtrack.failure_reports      TO 'medtrack_bme_engineer';
GRANT SELECT, INSERT, UPDATE ON medtrack.maintenance_records  TO 'medtrack_bme_engineer';
GRANT SELECT, INSERT, UPDATE ON medtrack.maintenance_parts    TO 'medtrack_bme_engineer';
GRANT SELECT              ON medtrack.manufacturers          TO 'medtrack_bme_engineer';
GRANT SELECT              ON medtrack.device_types           TO 'medtrack_bme_engineer';
GRANT SELECT              ON medtrack.technicians            TO 'medtrack_bme_engineer';
GRANT SELECT              ON medtrack.parts                  TO 'medtrack_bme_engineer';

-- This mirrors the app-level rule that engineers may create/update operational
-- records but not delete records. Deletes are reserved for admins.
-- REVOKE is still demonstrated below where it *does* apply cleanly — undoing
-- part of a database-wide grant at the same (database-wide) scope it was
-- granted at.

-- Admin: full control, including schema changes and granting to others.
GRANT ALL PRIVILEGES ON medtrack.* TO 'medtrack_bme_admin' WITH GRANT OPTION;

-- Demonstrate REVOKE at matching scope: even admins should not drop the
-- database outright from the app-facing role — keep DROP DATABASE reserved
-- for a human with direct root access.
REVOKE DROP ON medtrack.* FROM 'medtrack_bme_admin';

-- ── DB user accounts (login credentials, separate from app-level users) ────
-- Change these passwords before using outside local development.

CREATE USER IF NOT EXISTS 'medtrack_db_analyst'@'%'  IDENTIFIED BY 'ChangeMe_Analyst1!';
CREATE USER IF NOT EXISTS 'medtrack_db_engineer'@'%' IDENTIFIED BY 'ChangeMe_Engineer1!';
CREATE USER IF NOT EXISTS 'medtrack_db_admin'@'%'    IDENTIFIED BY 'ChangeMe_Admin1!';

GRANT 'medtrack_bme_analyst'  TO 'medtrack_db_analyst'@'%';
GRANT 'medtrack_bme_engineer' TO 'medtrack_db_engineer'@'%';
GRANT 'medtrack_bme_admin'    TO 'medtrack_db_admin'@'%';

-- MariaDB syntax: SET DEFAULT ROLE role FOR user (MySQL uses "TO" instead of "FOR").
SET DEFAULT ROLE 'medtrack_bme_analyst'  FOR 'medtrack_db_analyst'@'%';
SET DEFAULT ROLE 'medtrack_bme_engineer' FOR 'medtrack_db_engineer'@'%';
SET DEFAULT ROLE 'medtrack_bme_admin'    FOR 'medtrack_db_admin'@'%';

FLUSH PRIVILEGES;

-- ── Verification (run manually) ─────────────────────────────────────────────
-- SHOW GRANTS FOR 'medtrack_bme_engineer';
-- SHOW GRANTS FOR 'medtrack_db_engineer'@'%';
-- SELECT CURRENT_ROLE(); -- run after connecting as medtrack_db_engineer

-- Note: the running app currently connects with the single MYSQL_USER
-- configured in backend/.env (see backend/config/mysql.js), so this script
-- is a standalone demonstration of DCL rather than wired into the live
-- connection pool. To use it for real, point MYSQL_USER/MYSQL_PASSWORD at
-- one of the medtrack_db_* accounts above — most naturally medtrack_db_admin,
-- since the app already enforces the finer-grained BME role distinction itself
-- via JWT roles.
