-- Fix votes table to track votes per round instead of per show
-- This allows users to vote again in new rounds of the same show

-- Drop the existing unique constraint on (show_id, email)
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_show_id_email_key;

-- Make show_id nullable since we now track by round_id
ALTER TABLE public.votes ALTER COLUMN show_id DROP NOT NULL;

-- Add round_id column to votes table
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS round_id uuid;

-- Add foreign key constraint for round_id
ALTER TABLE public.votes 
ADD CONSTRAINT votes_round_id_fkey FOREIGN KEY (round_id)
    REFERENCES public.rounds (id)
    ON DELETE CASCADE;

-- Create new unique constraint on (round_id, email) - one vote per round per email
ALTER TABLE public.votes 
ADD CONSTRAINT votes_round_id_email_key UNIQUE (round_id, email);

-- Create index for round_id
CREATE INDEX IF NOT EXISTS idx_votes_round_id ON public.votes (round_id);

-- Update existing records to have round_id based on their show_id
-- This is a one-time migration for existing data
-- Link to the most recent round for each show
UPDATE public.votes v
SET round_id = r.id
FROM public.rounds r
WHERE v.round_id IS NULL 
  AND v.show_id = r.show_id
  AND r.id = (
    SELECT id FROM public.rounds 
    WHERE show_id = v.show_id 
    ORDER BY created_at DESC 
    LIMIT 1
  );

-- Make round_id NOT NULL after updating existing records
ALTER TABLE public.votes ALTER COLUMN round_id SET NOT NULL;
