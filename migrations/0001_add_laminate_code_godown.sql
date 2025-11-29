CREATE TABLE IF NOT EXISTS laminate_code_godown (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  inner_code VARCHAR(255),
  supplier VARCHAR(255),
  thickness VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_laminate_code_godown_code ON laminate_code_godown(code);
