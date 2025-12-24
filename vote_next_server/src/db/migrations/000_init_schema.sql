-- =========================================
-- Vote Next – Initial Database Schema
-- =========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- TABLE: admins (login for backend only)
-- =========================================
CREATE TABLE IF NOT EXISTS admins (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- TABLE: shows (รายการแข่งขัน)
-- =========================================
CREATE TABLE IF NOT EXISTS shows (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    created_by      UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- TABLE: contestants (ผู้เข้าแข่งขัน)
-- =========================================
CREATE TABLE IF NOT EXISTS contestants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id         UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    stage_name      VARCHAR(255) NOT NULL,
    image_url       TEXT,
    order_number    INT,  -- ลำดับการขึ้นโชว์
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contestants_show_id
ON contestants(show_id);

-- =========================================
-- TABLE: ...............

unds (รอบโหวต)
-- =========================================
CREATE TABLE IF NOT EXISTS rounds (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id             UUID NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    
    round_name          VARCHAR(255) NOT NULL,
    description         TEXT,

    start_time          TIMESTAMPTZ,
    end_time            TIMESTAMPTZ,
แล้
    status              VARCHAR(50) NOT NULL DEFAULT 'pending'
    -- pending | voting | closed

    ,created_by         UUID REFERENCES admins(id),
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rounds_show_id
ON rounds(show_id);

-- =========================================
-- TABLE: online_votes (โหวตออนไลน์)
-- 1 email = 1 vote / round
-- =========================================
CREATE TABLE IF NOT EXISTS online_votes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id        UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id   UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,

    voter_email     VARCHAR(255) NOT NULL,

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (round_id, voter_email)   -- 1 email ต่อรอบ
);

CREATE INDEX IF NOT EXISTS idx_online_votes_round
ON online_votes(round_id);

CREATE INDEX IF NOT EXISTS idx_online_votes_contestant
ON online_votes(contestant_id);

-- =========================================
-- TABLE: remote_devices (device ลงทะเบียนในสตู)
-- 1 device = 1 remote control
-- =========================================
CREATE TABLE IF NOT EXISTS remote_devices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id       VARCHAR(255) UNIQUE NOT NULL, -- เช่น MAC address

    owner_label     VARCHAR(255),                 -- เช่น Seat A1, Staff #3

    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================
-- TABLE: remote_votes (โหวตผ่าน remote)
-- 1 device = 1 vote / round
-- =========================================
CREATE TABLE IF NOT EXISTS remote_votes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id        UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id   UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,

    remote_device_id UUID NOT NULL REFERENCES remote_devices(id) ON DELETE CASCADE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (round_id, remote_device_id)
);

CREATE INDEX IF NOT EXISTS idx_remote_votes_round
ON remote_votes(round_id);

-- =========================================
-- TABLE: judge_scores (คะแนนกรรมการ)
-- Admin จะกรอกคะแนนรวมทีเดียวหลังจบโหวต
-- อนาคตเพิ่มกรรมการหลายคนก็ได้
-- =========================================
CREATE TABLE IF NOT EXISTS judge_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id        UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id   UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,

    score           NUMERIC(5,2) NOT NULL CHECK (score >= 0),

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(round_id, contestant_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_scores_round
ON judge_scores(round_id);

-- =========================================
-- TABLE: round_results (ผลรวมคะแนนแต่ละรอบ)
-- คิดคะแนนที่ backend แล้วเก็บลงฐานข้อมูล
-- remote_pct / online_pct / judge_pct เป็นเปอร์เซ็นต์
-- final_score = คำนวณจริง เช่น (40/30/30)
-- =========================================
CREATE TABLE IF NOT EXISTS round_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id        UUID NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id   UUID NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,

    online_raw      INT DEFAULT 0,
    remote_raw      INT DEFAULT 0,
    judge_raw       NUMERIC(10,2) DEFAULT 0,

    online_pct      NUMERIC(5,2) DEFAULT 0,
    remote_pct      NUMERIC(5,2) DEFAULT 0,
    judge_pct       NUMERIC(5,2) DEFAULT 0,

    final_score     NUMERIC(7,3) DEFAULT 0,

    created_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(round_id, contestant_id)
);

CREATE INDEX IF NOT EXISTS idx_round_results_round
ON round_results(round_id);

-- =========================================
-- END OF SCHEMA
-- =========================================
