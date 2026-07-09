USE medtrack;

ALTER TABLE users
MODIFY role ENUM(
  'admin',
  'technician',
  'viewer',
  'bme_admin',
  'bme_manager',
  'bme_engineer',
  'bme_analyst'
) NOT NULL;

UPDATE users
SET role = CASE role
  WHEN 'admin' THEN 'bme_admin'
  WHEN 'technician' THEN 'bme_engineer'
  WHEN 'viewer' THEN 'bme_analyst'
  ELSE role
END;

DELETE FROM users
WHERE username IN ('admin01', 'tech01', 'viewer01');

INSERT INTO users (username, password_hash, role) VALUES
('bme_admin01', 'hashed_password_1', 'bme_admin'),
('bme_manager01', 'hashed_password_2', 'bme_manager'),
('bme_engineer01', 'hashed_password_3', 'bme_engineer'),
('bme_analyst01', 'hashed_password_4', 'bme_analyst')
ON DUPLICATE KEY UPDATE
  password_hash = VALUES(password_hash),
  role = VALUES(role);

ALTER TABLE users
MODIFY role ENUM('bme_admin', 'bme_manager', 'bme_engineer', 'bme_analyst') NOT NULL;
