-- Add description column to contestants if not present
ALTER TABLE IF EXISTS contestants
ADD COLUMN IF NOT EXISTS description TEXT;

