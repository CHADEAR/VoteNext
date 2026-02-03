-- Add results_computed field to rounds table
ALTER TABLE rounds
ADD COLUMN IF NOT EXISTS results_computed BOOLEAN NOT NULL DEFAULT false;

-- Update existing records to set default value
UPDATE rounds 
SET results_computed = false 
WHERE results_computed IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN rounds.results_computed IS 'Indicates if round results have been computed (scores and ranks frozen)';

-- Create index for faster lookups on computed rounds
CREATE INDEX IF NOT EXISTS idx_rounds_results_computed ON rounds (results_computed) WHERE results_computed = true;
