INSERT INTO admins (email, password_hash, full_name)
VALUES ('admin@votenext.com', 'changeme', 'Default Admin')
ON CONFLICT DO NOTHING;
