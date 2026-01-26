-- Add final lineup and finalized status to shows table
ALTER TABLE shows
ADD COLUMN IF NOT EXISTS finalized BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS final_lineup UUID[];

-- Add comment for documentation
COMMENT ON COLUMN shows.finalized IS 'Indicates if the show has been finalized (no more rounds can be created)';
COMMENT ON COLUMN shows.final_lineup IS 'Array of contestant IDs in the final debut lineup, in order of ranking';

-- Create index for faster lookups on finalized shows
CREATE INDEX IF NOT EXISTS idx_shows_finalized ON shows (finalized) WHERE finalized = true;
