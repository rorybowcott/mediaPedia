import Database from "@tauri-apps/plugin-sql";
import type { TitleRecord, TrendingSeed } from "./types";

let dbPromise: Promise<Database> | null = null;

export async function getDb() {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:mediapedia.db");
  }
  return dbPromise;
}

export async function upsertTitle(title: TitleRecord) {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await db.execute(
    `INSERT INTO titles (id, imdb_id, tmdb_id, title, year, type, runtime, rating, votes, poster_url, backdrop_url, genres, plot, cast, director, country, language, rotten_tomatoes_score, metacritic_score, popularity, source, tmdb_rank, tmdb_trending_at, created_at, updated_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       imdb_id=excluded.imdb_id,
       tmdb_id=excluded.tmdb_id,
       title=excluded.title,
       year=excluded.year,
       type=excluded.type,
       runtime=excluded.runtime,
       rating=excluded.rating,
       votes=excluded.votes,
       poster_url=excluded.poster_url,
       backdrop_url=excluded.backdrop_url,
       genres=excluded.genres,
       plot=excluded.plot,
       cast=excluded.cast,
       director=excluded.director,
       country=excluded.country,
       language=excluded.language,
       rotten_tomatoes_score=excluded.rotten_tomatoes_score,
       metacritic_score=excluded.metacritic_score,
       popularity=excluded.popularity,
       source=excluded.source,
       tmdb_rank=excluded.tmdb_rank,
       tmdb_trending_at=excluded.tmdb_trending_at,
       updated_at=excluded.updated_at,
       expires_at=excluded.expires_at`,
    [
      title.id,
      title.imdbId ?? null,
      title.tmdbId ?? null,
      title.title,
      title.year ?? null,
      title.type,
      title.runtime ?? null,
      title.rating ?? null,
      title.votes ?? null,
      title.posterUrl ?? null,
      title.backdropUrl ?? null,
      title.genres ? JSON.stringify(title.genres) : null,
      title.plot ?? null,
      title.cast ?? null,
      title.director ?? null,
      title.country ?? null,
      title.language ?? null,
      title.rottenTomatoesScore ?? null,
      title.metacriticScore ?? null,
      title.popularity ?? null,
      title.source ?? null,
      title.tmdbRank ?? null,
      title.tmdbTrendingAt ?? null,
      now,
      now,
      title.expiresAt ?? null
    ]
  );
}

export async function getTitleById(id: string): Promise<TitleRecord | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>("SELECT * FROM titles WHERE id = ?", [id]);
  if (!rows.length) return null;
  return mapTitleRow(rows[0]);
}

export async function listTitles(): Promise<TitleRecord[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>("SELECT * FROM titles", []);
  return rows.map(mapTitleRow);
}

export async function listRecentSearches(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT query FROM recent_searches ORDER BY created_at DESC LIMIT 10",
    []
  );
  return rows.map((row) => String(row.query));
}

export async function addRecentSearch(query: string) {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await db.execute("DELETE FROM recent_searches WHERE query = ?", [query]);
  await db.execute(
    "INSERT INTO recent_searches (query, created_at, updated_at) VALUES (?, ?, ?)",
    [query, now, now]
  );
  await db.execute(
    "DELETE FROM recent_searches WHERE id NOT IN (SELECT id FROM recent_searches ORDER BY created_at DESC LIMIT 10)",
    []
  );
}

export async function setSetting(key: string, value: string) {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await db.execute(
    "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    [key, value, now, now]
  );
}

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>("SELECT value FROM settings WHERE key = ?", [key]);
  if (!rows.length) return null;
  return rows[0].value ? String(rows[0].value) : null;
}

export async function upsertTrendingSeed(items: TrendingSeed[]) {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);
  await db.execute("DELETE FROM trending_seed", []);
  for (const item of items) {
    await db.execute(
      "INSERT INTO trending_seed (id, title, year, type, poster_url, tmdb_rank, popularity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        item.id,
        item.title,
        item.year ?? null,
        item.type,
        item.posterUrl ?? null,
        item.tmdbRank ?? null,
        item.popularity ?? null,
        now,
        now
      ]
    );
  }
}

export async function listTrendingSeeds(): Promise<TrendingSeed[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM trending_seed ORDER BY tmdb_rank ASC",
    []
  );
  return rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    year: row.year ? String(row.year) : null,
    type: (row.type as TrendingSeed["type"]) ?? "movie",
    posterUrl: row.poster_url ? String(row.poster_url) : null,
    tmdbRank: row.tmdb_rank ? Number(row.tmdb_rank) : null,
    popularity: row.popularity ? Number(row.popularity) : null
  }));
}

function mapTitleRow(row: Record<string, unknown>): TitleRecord {
  return {
    id: String(row.id),
    imdbId: row.imdb_id ? String(row.imdb_id) : null,
    tmdbId: row.tmdb_id ? Number(row.tmdb_id) : null,
    title: String(row.title),
    year: row.year ? String(row.year) : null,
    type: (row.type as TitleRecord["type"]) ?? "other",
    runtime: row.runtime ? String(row.runtime) : null,
    rating: row.rating ? String(row.rating) : null,
    votes: row.votes ? Number(row.votes) : null,
    posterUrl: row.poster_url ? String(row.poster_url) : null,
    backdropUrl: row.backdrop_url ? String(row.backdrop_url) : null,
    genres: row.genres ? (JSON.parse(String(row.genres)) as string[]) : null,
    plot: row.plot ? String(row.plot) : null,
    cast: row.cast ? String(row.cast) : null,
    director: row.director ? String(row.director) : null,
    country: row.country ? String(row.country) : null,
    language: row.language ? String(row.language) : null,
    rottenTomatoesScore: row.rotten_tomatoes_score ? String(row.rotten_tomatoes_score) : null,
    metacriticScore: row.metacritic_score ? String(row.metacritic_score) : null,
    popularity: row.popularity ? Number(row.popularity) : null,
    source: (row.source as TitleRecord["source"]) ?? null,
    tmdbRank: row.tmdb_rank ? Number(row.tmdb_rank) : null,
    tmdbTrendingAt: row.tmdb_trending_at ? Number(row.tmdb_trending_at) : null,
    lastUpdatedAt: row.updated_at ? Number(row.updated_at) : null,
    expiresAt: row.expires_at ? Number(row.expires_at) : null
  };
}
