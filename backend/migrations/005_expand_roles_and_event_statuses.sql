-- ===================================
-- EXPAND USER ROLES + EVENT STATUSES
-- ===================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

UPDATE users
SET role = 'user'
WHERE role NOT IN ('admin', 'user', 'security');

ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'user', 'security'));

ALTER TABLE abandoned_events DROP CONSTRAINT IF EXISTS abandoned_events_status_check;

UPDATE abandoned_events
SET status = 'resolved'
WHERE status NOT IN ('pending', 'confirmed', 'false_alarm', 'resolved', 'processing', 'dismissed');

ALTER TABLE abandoned_events
ADD CONSTRAINT abandoned_events_status_check
CHECK (status IN ('pending', 'confirmed', 'false_alarm', 'resolved', 'processing', 'dismissed'));
