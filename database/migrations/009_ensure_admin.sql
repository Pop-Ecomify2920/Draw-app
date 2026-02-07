-- Ensure admin user has is_admin = true (run if admin dashboard shows "Admin access required")
UPDATE users SET is_admin = true WHERE email = 'ollie.bryant08@icloud.com';
