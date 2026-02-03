-- =========================================
-- 008_FINAL_DEMO.sql (VoteNext)
-- Flattened final schema for DEMO
-- Mode: Idempotent
-- Seed: none
-- =========================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- 1) admins
-- ============================
CREATE TABLE IF NOT EXISTS public.admins
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 2) remote_devices
-- ============================
CREATE TABLE IF NOT EXISTS public.remote_devices
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(255) NOT NULL UNIQUE,
    owner_label VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================
-- 3) shows
-- ============================
CREATE TABLE IF NOT EXISTS public.shows
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    created_by uuid REFERENCES admins(id) ON DELETE SET NULL ON UPDATE NO ACTION,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Final lineup (004)
ALTER TABLE shows
    ADD COLUMN IF NOT EXISTS finalized BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS final_lineup UUID[];

COMMENT ON COLUMN shows.finalized IS
    'Indicates if the show has been finalized (no more rounds can be created)';
COMMENT ON COLUMN shows.final_lineup IS
    'Array of contestant IDs in the final debut lineup, in order of ranking';

CREATE INDEX IF NOT EXISTS idx_shows_finalized
    ON shows (finalized) WHERE finalized = true;

-- ============================
-- 4) rounds
-- ============================
CREATE TABLE IF NOT EXISTS public.rounds
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id uuid NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    round_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_by uuid REFERENCES admins(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    vote_mode VARCHAR(20) NOT NULL DEFAULT 'online',
    public_slug VARCHAR(50) UNIQUE,
    counter_type VARCHAR(20) NOT NULL DEFAULT 'manual'
);

-- Fix round_status (003)
ALTER TABLE rounds
    DROP CONSTRAINT IF EXISTS valid_round_status;

ALTER TABLE rounds
    ADD CONSTRAINT valid_round_status
        CHECK (status IN ('pending','voting','closed'));

-- computed results flag (006)
ALTER TABLE rounds
    ADD COLUMN IF NOT EXISTS results_computed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN rounds.results_computed IS
    'Indicates if round results have been computed (scores and ranks frozen)';

CREATE INDEX IF NOT EXISTS idx_rounds_results_computed
    ON rounds (results_computed) WHERE results_computed = true;

-- vote mode constraint
ALTER TABLE rounds
    DROP CONSTRAINT IF EXISTS valid_vote_mode;

ALTER TABLE rounds
    ADD CONSTRAINT valid_vote_mode
        CHECK (vote_mode IN ('online','remote','hybrid'));

-- counter type constraint
ALTER TABLE rounds
    DROP CONSTRAINT IF EXISTS valid_counter_type;

ALTER TABLE rounds
    ADD CONSTRAINT valid_counter_type
        CHECK (counter_type IN ('manual','auto'));

CREATE INDEX IF NOT EXISTS idx_rounds_public_slug
    ON rounds (public_slug);

CREATE INDEX IF NOT EXISTS idx_rounds_show_id
    ON rounds (show_id);

-- ============================
-- 5) contestants
-- ============================
CREATE TABLE IF NOT EXISTS public.contestants
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    show_id uuid NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    image_url TEXT,
    order_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contestants
    ADD COLUMN IF NOT EXISTS description TEXT;

CREATE INDEX IF NOT EXISTS idx_contestants_show_id
    ON contestants (show_id);

-- ============================
-- 6) round_contestants (002 + 005)
-- ============================
CREATE TABLE IF NOT EXISTS round_contestants
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id uuid NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (round_id, contestant_id)
);

CREATE INDEX IF NOT EXISTS idx_round_contestants_round_id
    ON round_contestants (round_id);

CREATE INDEX IF NOT EXISTS idx_round_contestants_contestant_id
    ON round_contestants (contestant_id);

-- computed fields (005)
ALTER TABLE round_contestants
    ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS online_votes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remote_votes INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS judge_score NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_score NUMERIC(10,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS rank INTEGER,
    ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;

COMMENT ON COLUMN round_contestants.total_score IS 'computed total (online+remote+judge)';

CREATE INDEX IF NOT EXISTS idx_round_contestants_score
    ON round_contestants (round_id, total_score DESC);

-- ============================
-- 7) judge_scores
-- ============================
CREATE TABLE IF NOT EXISTS public.judge_scores
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id uuid NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (round_id, contestant_id)
);

CREATE INDEX IF NOT EXISTS idx_judge_scores_round
    ON judge_scores (round_id);

-- ============================
-- 8) online_votes
-- ============================
CREATE TABLE IF NOT EXISTS public.online_votes
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id uuid NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    voter_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (round_id, voter_email)
);

CREATE INDEX IF NOT EXISTS idx_online_votes_round
    ON online_votes (round_id);

CREATE INDEX IF NOT EXISTS idx_online_votes_contestant
    ON online_votes (contestant_id);

-- ============================
-- 9) remote_votes
-- ============================
CREATE TABLE IF NOT EXISTS public.remote_votes
(
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
    contestant_id uuid NOT NULL REFERENCES contestants(id) ON DELETE CASCADE,
    remote_device_id uuid NOT NULL REFERENCES remote_devices(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (round_id, remote_device_id)
);

CREATE INDEX IF NOT EXISTS idx_remote_votes_round
    ON remote_votes (round_id);

-- ============================
-- Legacy Cleanup
-- ============================
DROP TABLE IF EXISTS public.round_results CASCADE;

-- Done
