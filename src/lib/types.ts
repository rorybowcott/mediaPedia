export type TitleType = "movie" | "series" | "documentary" | "other";

export interface TitleRecord {
  id: string;
  imdbId?: string | null;
  tmdbId?: number | null;
  title: string;
  year?: string | null;
  type: TitleType;
  runtime?: string | null;
  rating?: string | null;
  votes?: number | null;
  posterUrl?: string | null;
  backdropUrl?: string | null;
  genres?: string[] | null;
  plot?: string | null;
  cast?: string | null;
  director?: string | null;
  country?: string | null;
  language?: string | null;
  rottenTomatoesScore?: string | null;
  metacriticScore?: string | null;
  omdbRatings?: { source: string; value: string }[] | null;
  popularity?: number | null;
  source?: "omdb" | "tmdb" | "cache" | "mixed";
  lastUpdatedAt?: number | null;
  expiresAt?: number | null;
  tmdbRank?: number | null;
  tmdbTrendingAt?: number | null;
  fallbackLabel?: string | null;
}

export interface SearchOperatorFilters {
  type?: TitleType | "movie" | "series" | "documentary";
  yearExact?: number;
  yearRange?: { start: number; end: number };
  country?: string;
  lang?: string;
}

export interface ParsedQuery {
  freeText: string;
  filters: SearchOperatorFilters;
}

export interface Suggestion {
  id: string;
  title: string;
  year?: string | null;
  type: TitleType;
  runtime?: string | null;
  rating?: string | null;
  posterUrl?: string | null;
  popularity?: number | null;
  votes?: number | null;
  tmdbRank?: number | null;
}

export interface TrendingSeed {
  id: string;
  title: string;
  year?: string | null;
  type: TitleType;
  posterUrl?: string | null;
  tmdbRank?: number | null;
  popularity?: number | null;
}

export interface AppKeys {
  omdbKey?: string | null;
  tmdbKey?: string | null;
}

export interface AppShortcuts {
  globalSearch: string;
  refreshDetails: string;
  openImdb: string;
}

export interface ProviderStatus {
  ok: boolean;
  message?: string;
}
