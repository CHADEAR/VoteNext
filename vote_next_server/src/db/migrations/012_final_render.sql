-- Table: public.admins

-- DROP TABLE IF EXISTS public.admins;

CREATE TABLE IF NOT EXISTS public.admins
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    password_hash character varying(255) COLLATE pg_catalog."default" NOT NULL,
    full_name character varying(255) COLLATE pg_catalog."default",
    created_at timestamp with time zone DEFAULT now(),
    profile_img character varying(500) COLLATE pg_catalog."default",
    CONSTRAINT admins_pkey PRIMARY KEY (id),
    CONSTRAINT admins_email_key UNIQUE (email)
)

TABLESPACE pg_default;

-- Table: public.shows

-- DROP TABLE IF EXISTS public.shows;

CREATE TABLE IF NOT EXISTS public.shows
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    title character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    finalized boolean NOT NULL DEFAULT false,
    final_lineup uuid[],
    CONSTRAINT shows_pkey PRIMARY KEY (id),
    CONSTRAINT shows_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES public.admins (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE SET NULL
)

TABLESPACE pg_default;

COMMENT ON COLUMN public.shows.finalized
    IS 'Indicates if the show has been finalized (no more rounds can be created)';

COMMENT ON COLUMN public.shows.final_lineup
    IS 'Array of contestant IDs in the final debut lineup, in order of ranking';
-- Index: idx_shows_finalized

-- DROP INDEX IF EXISTS public.idx_shows_finalized;

CREATE INDEX IF NOT EXISTS idx_shows_finalized
    ON public.shows USING btree
    (finalized ASC NULLS LAST)
    TABLESPACE pg_default
    WHERE finalized = true;

-- Table: public.remote_devices

-- DROP TABLE IF EXISTS public.remote_devices;

CREATE TABLE IF NOT EXISTS public.remote_devices
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    device_id character varying(255) COLLATE pg_catalog."default" NOT NULL,
    owner_label character varying(255) COLLATE pg_catalog."default",
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT remote_devices_pkey PRIMARY KEY (id),
    CONSTRAINT remote_devices_device_id_key UNIQUE (device_id)
)

TABLESPACE pg_default;

-- Table: public.rounds

-- DROP TABLE IF EXISTS public.rounds;

CREATE TABLE IF NOT EXISTS public.rounds
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    show_id uuid NOT NULL,
    round_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    description text COLLATE pg_catalog."default",
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    status character varying(50) COLLATE pg_catalog."default" NOT NULL DEFAULT 'pending'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    public_slug character varying(50) COLLATE pg_catalog."default",
    vote_mode character varying(20) COLLATE pg_catalog."default" DEFAULT 'online'::character varying,
    counter_type character varying(10) COLLATE pg_catalog."default" DEFAULT 'manual'::character varying,
    results_computed boolean NOT NULL DEFAULT false,
    CONSTRAINT rounds_pkey PRIMARY KEY (id),
    CONSTRAINT rounds_created_by_fkey FOREIGN KEY (created_by)
        REFERENCES public.admins (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION,
    CONSTRAINT rounds_show_id_fkey FOREIGN KEY (show_id)
        REFERENCES public.shows (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT rounds_counter_type_check CHECK (counter_type::text = ANY (ARRAY['manual'::character varying, 'auto'::character varying]::text[])),
    CONSTRAINT valid_round_status CHECK (status::text = ANY (ARRAY['pending'::character varying, 'voting'::character varying, 'closed'::character varying]::text[]))
)

TABLESPACE pg_default;

COMMENT ON COLUMN public.rounds.results_computed
    IS 'Indicates if round results have been computed (scores and ranks frozen)';
-- Index: idx_rounds_public_slug

-- DROP INDEX IF EXISTS public.idx_rounds_public_slug;

CREATE INDEX IF NOT EXISTS idx_rounds_public_slug
    ON public.rounds USING btree
    (public_slug COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_rounds_results_computed

-- DROP INDEX IF EXISTS public.idx_rounds_results_computed;

CREATE INDEX IF NOT EXISTS idx_rounds_results_computed
    ON public.rounds USING btree
    (results_computed ASC NULLS LAST)
    TABLESPACE pg_default
    WHERE results_computed = true;
-- Index: idx_rounds_show_id

-- DROP INDEX IF EXISTS public.idx_rounds_show_id;

CREATE INDEX IF NOT EXISTS idx_rounds_show_id
    ON public.rounds USING btree
    (show_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.contestants

-- DROP TABLE IF EXISTS public.contestants;

CREATE TABLE IF NOT EXISTS public.contestants
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    show_id uuid NOT NULL,
    stage_name character varying(255) COLLATE pg_catalog."default" NOT NULL,
    image_url text COLLATE pg_catalog."default",
    order_number integer,
    created_at timestamp with time zone DEFAULT now(),
    description text COLLATE pg_catalog."default",
    CONSTRAINT contestants_pkey PRIMARY KEY (id),
    CONSTRAINT contestants_show_id_fkey FOREIGN KEY (show_id)
        REFERENCES public.shows (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

-- Index: idx_contestants_show_id

-- DROP INDEX IF EXISTS public.idx_contestants_show_id;

CREATE INDEX IF NOT EXISTS idx_contestants_show_id
    ON public.contestants USING btree
    (show_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.judge_scores

-- DROP TABLE IF EXISTS public.judge_scores;

CREATE TABLE IF NOT EXISTS public.judge_scores
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    score numeric(5,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT judge_scores_pkey PRIMARY KEY (id),
    CONSTRAINT judge_scores_round_id_contestant_id_key UNIQUE (round_id, contestant_id),
    CONSTRAINT judge_scores_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT judge_scores_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT judge_scores_score_check CHECK (score >= 0::numeric)
)

TABLESPACE pg_default;

-- Index: idx_judge_scores_round

-- DROP INDEX IF EXISTS public.idx_judge_scores_round;

CREATE INDEX IF NOT EXISTS idx_judge_scores_round
    ON public.judge_scores USING btree
    (round_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.online_votes

-- DROP TABLE IF EXISTS public.online_votes;

CREATE TABLE IF NOT EXISTS public.online_votes
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    voter_email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT online_votes_pkey PRIMARY KEY (id),
    CONSTRAINT online_votes_round_id_voter_email_key UNIQUE (round_id, voter_email),
    CONSTRAINT online_votes_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT online_votes_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

-- Index: idx_online_votes_contestant

-- DROP INDEX IF EXISTS public.idx_online_votes_contestant;

CREATE INDEX IF NOT EXISTS idx_online_votes_contestant
    ON public.online_votes USING btree
    (contestant_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_online_votes_round

-- DROP INDEX IF EXISTS public.idx_online_votes_round;

CREATE INDEX IF NOT EXISTS idx_online_votes_round
    ON public.online_votes USING btree
    (round_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.remote_votes

-- DROP TABLE IF EXISTS public.remote_votes;

CREATE TABLE IF NOT EXISTS public.remote_votes
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    remote_device_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT remote_votes_pkey PRIMARY KEY (id),
    CONSTRAINT remote_votes_round_id_remote_device_id_key UNIQUE (round_id, remote_device_id),
    CONSTRAINT remote_votes_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT remote_votes_remote_device_id_fkey FOREIGN KEY (remote_device_id)
        REFERENCES public.remote_devices (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT remote_votes_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

-- Index: idx_remote_votes_round

-- DROP INDEX IF EXISTS public.idx_remote_votes_round;

CREATE INDEX IF NOT EXISTS idx_remote_votes_round
    ON public.remote_votes USING btree
    (round_id ASC NULLS LAST)
    TABLESPACE pg_default;

-- Table: public.round_contestants

-- DROP TABLE IF EXISTS public.round_contestants;

CREATE TABLE IF NOT EXISTS public.round_contestants
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    round_id uuid NOT NULL,
    contestant_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    score integer DEFAULT 0,
    rank integer,
    computed_at timestamp with time zone,
    online_votes integer DEFAULT 0,
    remote_votes integer DEFAULT 0,
    judge_score numeric(10,2) DEFAULT 0,
    total_score numeric(10,2) DEFAULT 0,
    CONSTRAINT round_contestants_pkey PRIMARY KEY (id),
    CONSTRAINT round_contestants_round_id_contestant_id_key UNIQUE (round_id, contestant_id),
    CONSTRAINT round_contestants_contestant_id_fkey FOREIGN KEY (contestant_id)
        REFERENCES public.contestants (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT round_contestants_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

COMMENT ON COLUMN public.round_contestants.score
    IS 'The computed score for the contestant in this round';

COMMENT ON COLUMN public.round_contestants.rank
    IS 'The ranking of the contestant in this round (1 = highest score)';

COMMENT ON COLUMN public.round_contestants.computed_at
    IS 'When the score and rank were last computed';

COMMENT ON COLUMN public.round_contestants.online_votes
    IS 'The computed online votes for the contestant in this round';

COMMENT ON COLUMN public.round_contestants.remote_votes
    IS 'The computed remote votes for the contestant in this round';

COMMENT ON COLUMN public.round_contestants.judge_score
    IS 'The computed judge score for the contestant in this round';

COMMENT ON COLUMN public.round_contestants.total_score
    IS 'The computed total score (online + remote + judge) for the contestant in this round';
-- Index: idx_round_contestants_contestant_id

-- DROP INDEX IF EXISTS public.idx_round_contestants_contestant_id;

CREATE INDEX IF NOT EXISTS idx_round_contestants_contestant_id
    ON public.round_contestants USING btree
    (contestant_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_round_contestants_round_id

-- DROP INDEX IF EXISTS public.idx_round_contestants_round_id;

CREATE INDEX IF NOT EXISTS idx_round_contestants_round_id
    ON public.round_contestants USING btree
    (round_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_round_contestants_score

-- DROP INDEX IF EXISTS public.idx_round_contestants_score;

CREATE INDEX IF NOT EXISTS idx_round_contestants_score
    ON public.round_contestants USING btree
    (round_id ASC NULLS LAST, score DESC NULLS FIRST)
    TABLESPACE pg_default; 

-- Table: public.votes

-- DROP TABLE IF EXISTS public.votes;

CREATE TABLE IF NOT EXISTS public.votes
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    show_id uuid,
    email character varying(255) COLLATE pg_catalog."default" NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    round_id uuid NOT NULL,
    CONSTRAINT votes_pkey PRIMARY KEY (id),
    CONSTRAINT votes_round_id_email_key UNIQUE (round_id, email),
    CONSTRAINT votes_round_id_fkey FOREIGN KEY (round_id)
        REFERENCES public.rounds (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE,
    CONSTRAINT votes_show_id_fkey FOREIGN KEY (show_id)
        REFERENCES public.shows (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE CASCADE
)

TABLESPACE pg_default;

-- Index: idx_votes_email

-- DROP INDEX IF EXISTS public.idx_votes_email;

CREATE INDEX IF NOT EXISTS idx_votes_email
    ON public.votes USING btree
    (email COLLATE pg_catalog."default" ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_votes_round_id

-- DROP INDEX IF EXISTS public.idx_votes_round_id;

CREATE INDEX IF NOT EXISTS idx_votes_round_id
    ON public.votes USING btree
    (round_id ASC NULLS LAST)
    TABLESPACE pg_default;
-- Index: idx_votes_show_id

-- DROP INDEX IF EXISTS public.idx_votes_show_id;

CREATE INDEX IF NOT EXISTS idx_votes_show_id
    ON public.votes USING btree
    (show_id ASC NULLS LAST)
    TABLESPACE pg_default;