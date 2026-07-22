CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  latitude REAL,
  longitude REAL,
  accuracy REAL NOT NULL DEFAULT 25,
  vertical_accuracy REAL NOT NULL DEFAULT 30,
  altitude REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_updated_at ON devices(updated_at DESC);
