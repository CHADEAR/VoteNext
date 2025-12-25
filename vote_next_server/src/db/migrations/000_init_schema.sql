-- =========================
-- 1) admins
-- =========================
CREATE TABLE IF NOT EXISTS public.admins
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT admins_pkey PRIMARY KEY (id),
    CONSTRAINT admins_email_key UNIQUE (email)
);

ALTER TABLE IF EXISTS public.admins OWNER TO postgres;

-- =========================
-- 2) remote_devices
-- =========================
CREATE TABLE IF NOT EXISTS public.remote_devices
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    device_id character varying(255) NOT NULL,
    owner_label character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT remote_devices_pkey PRIMARY KEY (id),
    CONSTRAINT remote_devices_device_id_key UNIQUE (device_id)
);

ALTER TABLE IF EXISTS public.remote_devices OWNER TO postgres;

-- =========================
-- 3) shows
-- =========================
CREATE TABLE IF NOT EXISTS public.shows
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title character varying(255) NOT NULL,
    description text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT shows_pkey PRIMARY KEY (id),
    CONSTRAINT shows_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES public.admins (id)
        ON UPDATE NO ACTION
        ON DELETE SET NULL
);

ALTER TABLE IF EXISTS public.shows OWNER TO postgres;

-- =========================
-- 4) rounds
-- =========================
CREATE TABLE IF NOT EXISTS public.rounds
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    show_id uuid NOT NULL,
    round_name character varying(255) NOT NULL,
    description text,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status character varying(50) NOT NULL DEFAULT 'pending',
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    vote_mode character varying(20) NOT NULL DEFAULT 'online',
    public_slug character varying(50),
    counter_type character varying(20) NOT NULL DEFAULT 'manual',
    CONSTRAINT rounds_pkey PRIMARY KEY (id),
    CONSTRAINT rounds_public_slug_key UNIQUE (public_slug),
    CONSTRAINT rounds_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES public.admins (id),
    CONSTRAINT rounds_show_id_fkey FOREIGN KEY (show_id)
        REFERENCES public.shows (id)
        ON DELETE CASCADE,
    CONSTRAINT valid_counter_type CHECK (counter_type::text = ANY (ARRAY['manual','auto'])),
    CONSTRAINT valid_vote_mode CHECK (vote_mode::text = ANY (ARRAY['online','remote','hybrid'])),
    CONSTRAINT check_auto_counter_times CHECK (
        counter_type::text = 'manual'
        OR (
            counter_type::text = 'auto'
            AND start_time IS NOT NULL
            AND end_time IS NOT NULL
            AND end_time > start_time
        )
    ),
    CONSTRAINT valid_round_status CHECK (status::text = ANY (ARRAY['pending','voting','closed']))
);

ALTER TABLE IF EXISTS public.rounds OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_rounds_public_slug
    ON public.rounds (public_slug);

CREATE INDEX IF NOT EXISTS idx_rounds_show_id
    ON public.rounds (show_id);

-- =========================
-- 5) contestants
-- =========================
CREATE TABLE IF NOT EXISTS public.contestants
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    show_id uuid NOT NULL,
    stage_name character varying(255) NOT NULL,
    image_url text,
    order_number integer,
    created_at timestamp with time zone DEFAULT now(),
    description text,
    CONSTRAINT contestants_pkey PRIMARY KEY (id),
    CONSTRAINT contestants_show_id_fkey FOREIGN KEY (show_id)
        REFERENCES public.shows (id)
        ON DELETE CASCADE
);

ALTER TABLE IF EXISTS public.contestants OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_contestants_show_id
    ON public.contestants (show_id);

-- =========================
-- 6) round_contestants
-- =========================
CREATE TABLE IF NOT EXISTS public.round_contestants
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT round_contestants_pkey PRIMARY KEY (id),
    CONSTRAINT round_contestants_round_id_contestant_id_key UNIQUE (round_id, contestant_id),
    CONSTRAINT round_contestants_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id)
        ON DELETE CASCADE,
    CONSTRAINT round_contestants_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id)
        ON DELETE CASCADE
);

ALTER TABLE IF EXISTS public.round_contestants OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_round_contestants_round_id
    ON public.round_contestants (round_id);

CREATE INDEX IF NOT EXISTS idx_round_contestants_contestant_id
    ON public.round_contestants (contestant_id);

-- =========================
-- 7) judge_scores
-- =========================
CREATE TABLE IF NOT EXISTS public.judge_scores
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    score numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT judge_scores_pkey PRIMARY KEY (id),
    CONSTRAINT judge_scores_round_id_contestant_id_key UNIQUE (round_id, contestant_id),
    CONSTRAINT judge_scores_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id)
        ON DELETE CASCADE,
    CONSTRAINT judge_scores_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id)
        ON DELETE CASCADE,
    CONSTRAINT judge_scores_score_check CHECK (score >= 0)
);

ALTER TABLE IF EXISTS public.judge_scores OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_judge_scores_round
    ON public.judge_scores (round_id);

-- =========================
-- 8) online_votes
-- =========================
CREATE TABLE IF NOT EXISTS public.online_votes
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    voter_email character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT online_votes_pkey PRIMARY KEY (id),
    CONSTRAINT online_votes_round_id_voter_email_key UNIQUE (round_id, voter_email),
    CONSTRAINT online_votes_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id)
        ON DELETE CASCADE,
    CONSTRAINT online_votes_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id)
        ON DELETE CASCADE
);

ALTER TABLE IF EXISTS public.online_votes OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_online_votes_round
    ON public.online_votes (round_id);

CREATE INDEX IF NOT EXISTS idx_online_votes_contestant
    ON public.online_votes (contestant_id);

-- =========================
-- 9) remote_votes
-- =========================
CREATE TABLE IF NOT EXISTS public.remote_votes
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    remote_device_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT remote_votes_pkey PRIMARY KEY (id),
    CONSTRAINT remote_votes_round_id_remote_device_id_key UNIQUE (round_id, remote_device_id),
    CONSTRAINT remote_votes_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id)
        ON DELETE CASCADE,
    CONSTRAINT remote_votes_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id)
        ON DELETE CASCADE,
    CONSTRAINT remote_votes_remote_device_id_fkey FOREIGN KEY (remote_device_id)
        REFERENCES public.remote_devices (id)
        ON DELETE CASCADE
);

ALTER TABLE IF EXISTS public.remote_votes OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_remote_votes_round
    ON public.remote_votes (round_id);

-- =========================
-- 10) round_results
-- =========================
CREATE TABLE IF NOT EXISTS public.round_results
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    online_raw integer DEFAULT 0,
    remote_raw integer DEFAULT 0,
    judge_raw numeric(10,2) DEFAULT 0,
    online_pct numeric(5,2) DEFAULT 0,
    remote_pct numeric(5,2) DEFAULT 0,
    judge_pct numeric(5,2) DEFAULT 0,
    final_score numeric(7,3) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT round_results_pkey PRIMARY KEY (id),
    CONSTRAINT round_results_round_id_contestant_id_key UNIQUE (round_id, contestant_id),
    CONSTRAINT round_results_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id)
        ON DELETE CASCADE,
    CONSTRAINT round_results_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id)
        ON DELETE CASCADE
);

ALTER TABLE IF EXISTS public.round_results OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_round_results_round
    ON public.round_results (round_id);
