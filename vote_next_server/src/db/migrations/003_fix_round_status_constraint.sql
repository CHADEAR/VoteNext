-- 003_fix_round_status_constraint.sql

BEGIN;

-- ลบ constraint เดิม (ถ้ามี)
ALTER TABLE rounds
DROP CONSTRAINT IF EXISTS valid_round_status;

-- ใส่ constraint ใหม่ที่ถูกต้อง
ALTER TABLE rounds
ADD CONSTRAINT valid_round_status
CHECK (status IN ('pending', 'voting', 'closed'));

COMMIT;
