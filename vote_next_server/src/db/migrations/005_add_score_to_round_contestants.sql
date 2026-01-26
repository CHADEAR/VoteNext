-- Add score and rank columns to round_contestants table
ALTER TABLE round_contestants
ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS online_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS remote_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS judge_score NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_score NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank INTEGER,
ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN round_contestants.score IS 'The computed score for the contestant in this round';
COMMENT ON COLUMN round_contestants.online_votes IS 'The computed online votes for the contestant in this round';
COMMENT ON COLUMN round_contestants.remote_votes IS 'The computed remote votes for the contestant in this round';
COMMENT ON COLUMN round_contestants.judge_score IS 'The computed judge score for the contestant in this round';
COMMENT ON COLUMN round_contestants.total_score IS 'The computed total score (online + remote + judge) for the contestant in this round';
COMMENT ON COLUMN round_contestants.rank IS 'The ranking of the contestant in this round (1 = highest score)';
COMMENT ON COLUMN round_contestants.computed_at IS 'When the score and rank were last computed';

-- Create index for faster lookups by score
CREATE INDEX IF NOT EXISTS idx_round_contestants_score ON round_contestants (round_id, total_score DESC);
