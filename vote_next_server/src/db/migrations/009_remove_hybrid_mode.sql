-- Remove hybrid mode from vote_mode constraint
ALTER TABLE rounds
    DROP CONSTRAINT IF EXISTS valid_vote_mode;

ALTER TABLE rounds
    ADD CONSTRAINT valid_vote_mode
        CHECK (vote_mode IN ('online','remote'));
