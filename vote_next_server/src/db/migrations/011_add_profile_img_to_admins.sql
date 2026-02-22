-- Add profile_img to admins (ถ้าไม่มีแล้ว)
ALTER TABLE IF EXISTS public.admins
  ADD COLUMN IF NOT EXISTS profile_img VARCHAR(500);
