-- Table to enforce one vote per (show_id, email) - กันโหวตซ้ำใน show เดียวกัน
CREATE TABLE IF NOT EXISTS public.votes
(
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    show_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT votes_pkey PRIMARY KEY (id),
    CONSTRAINT votes_show_id_email_key UNIQUE (show_id, email),
    CONSTRAINT votes_show_id_fkey FOREIGN KEY (show_id)
        REFERENCES public.shows (id)
        ON DELETE CASCADE
);

ALTER TABLE IF EXISTS public.votes OWNER TO postgres;

CREATE INDEX IF NOT EXISTS idx_votes_show_id ON public.votes (show_id);
CREATE INDEX IF NOT EXISTS idx_votes_email ON public.votes (email);
