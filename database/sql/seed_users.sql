USE medtrack;

-- Login users for the JWT auth + RBAC feature (backend/routes/auth.js).
-- Run this after schema.sql regardless of whether you loaded device data via
-- seed.sql (fictional dataset) or database/loader.js (real dataset) — neither
-- of those touches the users table.
--
-- Demo credentials (dev only, do not reuse in production):
--   admin01    / Admin@123   (role: admin)
--   tech01     / Tech@123    (role: technician)
--   viewer01   / Viewer@123  (role: viewer)
--
-- Hashes generated with bcryptjs (10 rounds); see backend/utils/auth.js

INSERT INTO users (username, password_hash, role) VALUES
('admin01', '$2a$10$HDI/TtZ9zm3TdScUmSXMcOXfrAT88REbxqjFf8cg2/Is2CMXoHUF6', 'admin'),
('tech01', '$2a$10$OfWOacrCCIXkGIyNYy.xZ.fLuv9CqbxdDnLb9ZH6Zx8m0.cVYvQU6', 'technician'),
('viewer01', '$2a$10$ub3/ZmVJhLXjSy.uIaG5Q.EGR/s2FqXiXkXFlFu8sO.Y9UwbAPHdq', 'viewer');
