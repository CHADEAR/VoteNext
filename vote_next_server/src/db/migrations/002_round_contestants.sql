-- =========================================
-- Migration: 002_round_contestants
-- Purpose:
-- 1) รองรับ multi-round + elimination
-- 2) map ผู้เข้าแข่งขันต่อรอบ
-- 3) migrate ข้อมูล round เดิม (Round 1)
-- =========================================

BEGIN;

-- 1️⃣ สร้างตาราง round_contestants
CREATE TABLE IF NOT EXISTS round_contestants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    round_id UUID NOT NULL
        REFERENCES rounds(id)
        ON DELETE CASCADE,

    contestant_id UUID NOT NULL
        REFERENCES contestants(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (round_id, contestant_id)
);

-- index สำหรับ query หน้าโหวต / result
CREATE INDEX IF NOT EXISTS idx_round_contestants_round_id
ON round_contestants(round_id);

CREATE INDEX IF NOT EXISTS idx_round_contestants_contestant_id
ON round_contestants(contestant_id);

-- 2️⃣ migrate ข้อมูลเดิม
-- สำหรับทุก round ที่มีอยู่แล้ว
-- ใส่ contestants ทั้งหมดของ show นั้นเป็น Round 1
INSERT INTO round_contestants (round_id, contestant_id)
SELECT
    r.id  AS round_id,
    c.id  AS contestant_id
FROM rounds r
JOIN contestants c
  ON c.show_id = r.show_id
LEFT JOIN round_contestants rc
  ON rc.round_id = r.id
 AND rc.contestant_id = c.id
WHERE rc.id IS NULL;

COMMIT;

-- =========================================
-- END MIGRATION
-- =========================================
