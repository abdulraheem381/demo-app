CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  environment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);