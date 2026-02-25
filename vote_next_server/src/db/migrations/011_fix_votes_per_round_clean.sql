-- Clean migration to fix votes table for round-level voting
-- This handles existing constraints and columns gracefully

-- Make show_id nullable since we now track by round_id
ALTER TABLE public.votes ALTER COLUMN show_id DROP NOT NULL;

-- Drop existing foreign key if it exists
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_round_id_fkey;

-- Drop existing unique constraint if it exists
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS votes_round_id_email_key;

-- Re-add foreign key constraint for round_id
ALTER TABLE public.votes 
ADD CONSTRAINT votes_round_id_fkey FOREIGN KEY (round_id)
    REFERENCES public.rounds (id)
    ON DELETE CASCADE;

-- Create new unique constraint on (round_id, email) - one vote per round per email
ALTER TABLE public.votes 
ADD CONSTRAINT votes_round_id_email_key UNIQUE (round_id, email);

-- Create index for round_id if it doesn't exist
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
