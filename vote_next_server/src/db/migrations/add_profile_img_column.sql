-- Add profile_img column to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_img VARCHAR(500);
