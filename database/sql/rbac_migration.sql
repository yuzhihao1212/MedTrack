USE medtrack;

-- Upgrade older role names to the current Biomedical Engineering RBAC model.
-- Safe to run more than once.

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
WHERE username IN ('admin01', 'tech01', 'viewer01', 'bme_manager01')
   OR role = 'bme_manager';

ALTER TABLE users
MODIFY role ENUM('bme_admin', 'bme_engineer', 'bme_analyst') NOT NULL;
