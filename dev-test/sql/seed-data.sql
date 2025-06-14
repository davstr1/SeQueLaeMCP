-- Insert test users
INSERT INTO users_test_sql_agent (email, name) VALUES
  ('alice@example.com', 'Alice Johnson'),
  ('bob@example.com', 'Bob Smith'),
  ('charlie@example.com', 'Charlie Brown')
ON CONFLICT (email) DO NOTHING;

-- Insert test posts
INSERT INTO posts_test_sql_agent (user_id, title, content, published)
SELECT 
  u.id,
  'First post by ' || u.name,
  'This is a test post content for ' || u.name,
  true
FROM users_test_sql_agent u
WHERE NOT EXISTS (
  SELECT 1 FROM posts_test_sql_agent p WHERE p.user_id = u.id
);