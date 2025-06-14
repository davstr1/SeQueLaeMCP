-- Create users table
CREATE TABLE IF NOT EXISTS users_test_sql_agent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts_test_sql_agent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users_test_sql_agent(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_posts_test_sql_agent_user_id ON posts_test_sql_agent(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_test_sql_agent_published ON posts_test_sql_agent(published) WHERE published = true;