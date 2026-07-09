USE medtrack;

-- Database-level access control (DCL: GRANT / REVOKE / CREATE ROLE / CREATE USER).
-- This is the DB-layer counterpart to the app-level JWT RBAC in
-- backend/middleware/auth.js — the three roles below map 1:1 to the
-- `users.role` values ('viewer', 'technician', 'admin').
--
-- Requires MySQL 8.0+ or MariaDB 10.4+ (role support). Written and verified
-- against MariaDB 12.2 — this project's actual DB engine, despite the
-- "MySQL" naming throughout the rest of the codebase. Safe to re-run.

-- ── Roles (privilege templates) ────────────────────────────────────────────

CREATE ROLE IF NOT EXISTS 'medtrack_viewer', 'medtrack_technician', 'medtrack_admin';

-- Viewer: read-only. Matches "guest" access — dashboards and reports only.
GRANT SELECT ON medtrack.* TO 'medtrack_viewer';

-- Technician: can read and write day-to-day operational data (devices,
-- failures, maintenance), but cannot delete rows, touch the users table,
-- or change schema. Granted table-by-table (least privilege) rather than
-- "GRANT ALL then REVOKE", since REVOKE on a single table cannot undo a
-- database-wide wildcard grant. The users table is simply never granted.
GRANT SELECT, INSERT, UPDATE ON medtrack.devices             TO 'medtrack_technician';
GRANT SELECT, INSERT, UPDATE ON medtrack.failure_reports      TO 'medtrack_technician';
GRANT SELECT, INSERT, UPDATE ON medtrack.maintenance_records   TO 'medtrack_technician';
GRANT SELECT, INSERT, UPDATE ON medtrack.maintenance_parts     TO 'medtrack_technician';
GRANT SELECT              ON medtrack.manufacturers          TO 'medtrack_technician';
GRANT SELECT              ON medtrack.device_types           TO 'medtrack_technician';
GRANT SELECT              ON medtrack.technicians            TO 'medtrack_technician';
GRANT SELECT              ON medtrack.parts                  TO 'medtrack_technician';

-- This mirrors the app-level rule that only 'admin' may call the DELETE
-- routes: technician was never granted DELETE anywhere, so no REVOKE needed.
-- REVOKE is still demonstrated below where it *does* apply cleanly — undoing
-- part of a database-wide grant at the same (database-wide) scope it was
-- granted at.

-- Admin: full control, including schema changes and granting to others.
GRANT ALL PRIVILEGES ON medtrack.* TO 'medtrack_admin' WITH GRANT OPTION;

-- Demonstrate REVOKE at matching scope: even admins should not drop the
-- database outright from the app-facing role — keep DROP DATABASE reserved
-- for a human with direct root access.
REVOKE DROP ON medtrack.* FROM 'medtrack_admin';

-- ── DB user accounts (login credentials, separate from app-level users) ────
-- Change these passwords before using outside local development.

CREATE USER IF NOT EXISTS 'medtrack_app_viewer'@'%'     IDENTIFIED BY 'ChangeMe_Viewer1!';
CREATE USER IF NOT EXISTS 'medtrack_app_technician'@'%' IDENTIFIED BY 'ChangeMe_Tech1!';
CREATE USER IF NOT EXISTS 'medtrack_app_admin'@'%'      IDENTIFIED BY 'ChangeMe_Admin1!';

GRANT 'medtrack_viewer'     TO 'medtrack_app_viewer'@'%';
GRANT 'medtrack_technician' TO 'medtrack_app_technician'@'%';
GRANT 'medtrack_admin'      TO 'medtrack_app_admin'@'%';

-- MariaDB syntax: SET DEFAULT ROLE role FOR user (MySQL uses "TO" instead of "FOR").
SET DEFAULT ROLE 'medtrack_viewer'     FOR 'medtrack_app_viewer'@'%';
SET DEFAULT ROLE 'medtrack_technician' FOR 'medtrack_app_technician'@'%';
SET DEFAULT ROLE 'medtrack_admin'      FOR 'medtrack_app_admin'@'%';

FLUSH PRIVILEGES;

-- ── Verification (run manually) ─────────────────────────────────────────────
-- SHOW GRANTS FOR 'medtrack_technician';
-- SHOW GRANTS FOR 'medtrack_app_technician'@'%';
-- SELECT CURRENT_ROLE(); -- run after connecting as medtrack_app_technician

-- Note: the running app currently connects with the single MYSQL_USER
-- configured in backend/.env (see backend/config/mysql.js), so this script
-- is a standalone demonstration of DCL rather than wired into the live
-- connection pool. To use it for real, point MYSQL_USER/MYSQL_PASSWORD at
-- one of the medtrack_app_* accounts above — most naturally
-- medtrack_app_admin, since the app already enforces the finer-grained
-- viewer/technician/admin distinction itself via JWT roles.
