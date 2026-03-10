-- Insert admin user with plain password (will be hashed by application)
-- Password: admin123
INSERT INTO public.admins (email, password_hash, full_name, profile_img)
VALUES (
    'admin@votenext.com',
    '123456', 
    'System Administrator',
    NULL
)
ON CONFLICT (email) DO NOTHING;
