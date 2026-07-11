USE medtrack;

-- Default login users for the JWT auth + BME RBAC feature.
-- Run after schema.sql and rbac_migration.sql. Device-data loaders do not
-- touch the users table, so this file is safe to re-run.
--
-- Demo credentials (dev only, do not reuse in production):
--   bme_admin01     / BmeAdmin@123     (role: bme_admin)
--   bme_engineer01  / BmeEngineer@123  (role: bme_engineer)
--   bme_analyst01   / BmeAnalyst@123   (role: bme_analyst)
--
-- Hashes generated with bcryptjs (10 rounds); see backend/utils/auth.js

DELETE FROM users
WHERE username IN ('admin01', 'tech01', 'viewer01', 'bme_manager01');

INSERT INTO users (username, password_hash, role) VALUES
('bme_admin01', '$2a$10$9hAWhndph7wNOAs7sCvcWuwcjPOv1cj.oQNf2IZBECGbsNyaZgLNi', 'bme_admin'),
('bme_engineer01', '$2a$10$OLW1RH0kSx0YCDeCLd9HauVGndVpd80l0aHweITz5RqQp6mSwDQsW', 'bme_engineer'),
('bme_analyst01', '$2a$10$p5vOTCOrx89561STNP8DHOFlo/QDLTMU7WP5vEeFL/cfJncMIukbK', 'bme_analyst')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role);
