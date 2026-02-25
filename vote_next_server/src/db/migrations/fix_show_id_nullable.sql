-- Fix show_id to be nullable
ALTER TABLE public.votes ALTER COLUMN show_id DROP NOT NULL;
