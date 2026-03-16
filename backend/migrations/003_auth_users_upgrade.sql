-- ===================================
-- AUTH UPGRADE FOR USERS TABLE
-- ===================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);

UPDATE users
SET email = LOWER(username) || '@robot.local'
WHERE email IS NULL;

ALTER TABLE users
ALTER COLUMN email SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);

ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users
SET role = 'user'
WHERE role NOT IN ('admin', 'user');

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user'));

ALTER TABLE users
ALTER COLUMN role SET DEFAULT 'user';

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
