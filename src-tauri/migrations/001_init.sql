CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY,
  imdb_id TEXT,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  year TEXT,
  type TEXT NOT NULL,
  runtime TEXT,
  rating TEXT,
  votes INTEGER,
  poster_url TEXT,
  backdrop_url TEXT,
  genres TEXT,
  plot TEXT,
  cast TEXT,
  director TEXT,
  country TEXT,
  language TEXT,
  popularity REAL,
  source TEXT,
  tmdb_rank INTEGER,
  tmdb_trending_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER
);

CREATE TABLE IF NOT EXISTS pinned (
  title_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS recent_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS trending_seed (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  year TEXT,
  type TEXT NOT NULL,
  poster_url TEXT,
  tmdb_rank INTEGER,
  popularity REAL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
