INSERT INTO admins (email, password_hash, full_name)
VALUES ('admin@votenext.com', '12345', 'Default Admin')
ON CONFLICT DO NOTHING;
