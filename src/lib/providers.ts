import { z } from "zod";
import type { TitleRecord, TitleType, WatchProviders } from "./types";

const omdbSearchSchema = z.object({
  Search: z.array(
    z.object({
      Title: z.string(),
      Year: z.string(),
      imdbID: z.string(),
      Type: z.string(),
      Poster: z.string().optional()
    })
  ).optional(),
  Response: z.string(),
  Error: z.string().optional()
});

const omdbDetailSchema = z.object({
  Title: z.string(),
  Year: z.string().optional(),
  imdbID: z.string().optional(),
  Type: z.string().optional(),
  Runtime: z.string().optional(),
  imdbRating: z.string().optional(),
  imdbVotes: z.string().optional(),
  Metascore: z.string().optional(),
  Genre: z.string().optional(),
  Plot: z.string().optional(),
  Actors: z.string().optional(),
  Director: z.string().optional(),
  Country: z.string().optional(),
  Language: z.string().optional(),
  Poster: z.string().optional(),
  tomatoMeter: z.string().optional(),
  Ratings: z
    .array(
      z.object({
        Source: z.string(),
        Value: z.string()
      })
    )
    .optional(),
  Response: z.string().optional(),
  Error: z.string().optional()
});

const tmdbSearchSchema = z.object({
  results: z.array(
    z.object({
      id: z.number(),
      title: z.string().optional(),
      name: z.string().optional(),
      media_type: z.string().optional(),
      release_date: z.string().optional(),
      first_air_date: z.string().optional(),
      poster_path: z.string().nullable().optional(),
      popularity: z.number().optional()
    })
  )
});

const tmdbDetailSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  overview: z.string().optional(),
  runtime: z.number().optional(),
  genres: z.array(z.object({ name: z.string() })).optional(),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional(),
  production_countries: z.array(z.object({ iso_3166_1: z.string(), name: z.string() })).optional(),
  spoken_languages: z.array(z.object({ iso_639_1: z.string(), name: z.string() })).optional(),
  popularity: z.number().optional(),
  release_date: z.string().optional(),
  first_air_date: z.string().optional()
});

const tmdbExternalSchema = z.object({
  imdb_id: z.string().nullable().optional()
});

const tmdbWatchProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string().nullable().optional(),
  display_priority: z.number().optional()
});

const tmdbWatchProvidersSchema = z.object({
  results: z.record(
    z.object({
      link: z.string().optional(),
      flatrate: z.array(tmdbWatchProviderSchema).optional(),
      rent: z.array(tmdbWatchProviderSchema).optional(),
      buy: z.array(tmdbWatchProviderSchema).optional()
    })
  ).optional()
});

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_LOGO_BASE = "https://image.tmdb.org/t/p/w92";

function mapProviders(list?: z.infer<typeof tmdbWatchProviderSchema>[]) {
  if (!list?.length) return null;
  return [...list]
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
    .map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logoUrl: provider.logo_path ? `${TMDB_LOGO_BASE}${provider.logo_path}` : null,
      priority: provider.display_priority ?? null
    }));
}

function mapType(value?: string | null): TitleType {
  if (!value) return "other";
  const lowered = value.toLowerCase();
  if (lowered.includes("movie")) return "movie";
  if (lowered.includes("tv") || lowered.includes("series")) return "series";
  return "other";
}

function normalizeOmdbValue(value?: string | null) {
  if (!value) return null;
  if (value.trim().toLowerCase() === "n/a") return null;
  return value;
}

function parseOmdbVotes(value?: string | null) {
  const cleaned = normalizeOmdbValue(value);
  if (!cleaned) return null;
  const parsed = Number(cleaned.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function mapOmdbDetail(data: z.infer<typeof omdbDetailSchema>, fallbackImdbId?: string | null) {
  const genres = normalizeOmdbValue(data.Genre)
    ?.split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);
  const ratings = data.Ratings ?? [];
  const tomatoMeter = normalizeOmdbValue(data.tomatoMeter);
  const rottenTomatoesScore = normalizeOmdbValue(
    ratings.find((rating) => rating.Source === "Rotten Tomatoes")?.Value ??
      (tomatoMeter ? `${tomatoMeter}%` : null)
  );
  const metacriticScore = normalizeOmdbValue(
    ratings.find((rating) => rating.Source === "Metacritic")?.Value ?? data.Metascore
  );
  const omdbRatings = ratings.length
    ? ratings.map((rating) => ({ source: rating.Source, value: rating.Value }))
    : null;
  return {
    imdbId: normalizeOmdbValue(data.imdbID) ?? fallbackImdbId ?? null,
    title: data.Title,
    year: normalizeOmdbValue(data.Year),
    type: mapType(data.Type),
    runtime: normalizeOmdbValue(data.Runtime),
    rating: normalizeOmdbValue(data.imdbRating),
    votes: parseOmdbVotes(data.imdbVotes),
    genres,
    plot: normalizeOmdbValue(data.Plot),
    cast: normalizeOmdbValue(data.Actors),
    director: normalizeOmdbValue(data.Director),
    country: normalizeOmdbValue(data.Country),
    language: normalizeOmdbValue(data.Language),
    rottenTomatoesScore,
    metacriticScore,
    omdbRatings,
    posterUrl: normalizeOmdbValue(data.Poster),
    source: "omdb"
  } satisfies Partial<TitleRecord>;
}

export async function validateOmdbKey(key: string) {
  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&t=Inception`;
  const res = await fetch(url);
  const data = omdbDetailSchema.safeParse(await res.json());
  if (!data.success) {
    return { ok: false, message: "Unexpected OMDb response." };
  }
  if (data.data.Error) {
    return { ok: false, message: data.data.Error };
  }
  return { ok: true };
}

export async function validateTmdbKey(key: string) {
  const res = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`);
  if (!res.ok) {
    return { ok: false, message: `TMDB error: ${res.status}` };
  }
  return { ok: true };
}

export async function searchOmdb(query: string, key: string): Promise<TitleRecord[]> {
  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&s=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = omdbSearchSchema.safeParse(await res.json());
  if (!data.success || !data.data.Search) return [];

  return data.data.Search.map((item) => ({
    id: item.imdbID,
    imdbId: item.imdbID,
    title: item.Title,
    year: item.Year,
    type: mapType(item.Type),
    posterUrl: item.Poster && item.Poster !== "N/A" ? item.Poster : null,
    source: "omdb"
  }));
}

export async function searchTmdb(query: string, key: string): Promise<TitleRecord[]> {
  const url = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(key)}&query=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = tmdbSearchSchema.safeParse(await res.json());
  if (!data.success) return [];

  return data.data.results.map((item) => {
    const isMovie = item.media_type === "movie";
    const isTv = item.media_type === "tv";
    const title = item.title ?? item.name ?? "";
    const year = isMovie ? item.release_date?.slice(0, 4) : item.first_air_date?.slice(0, 4);
    return {
      id: `tmdb:${item.id}`,
      tmdbId: item.id,
      title,
      year: year ?? null,
      type: isTv ? "series" : "movie",
      posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      popularity: item.popularity ?? null,
      source: "tmdb"
    };
  });
}

export async function fetchOmdbDetails(imdbId: string, key: string) {
  const url = `https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&i=${encodeURIComponent(imdbId)}&plot=full&tomatoes=true`;
  const res = await fetch(url);
  const data = omdbDetailSchema.safeParse(await res.json());
  if (!data.success || data.data.Error) return null;
  return mapOmdbDetail(data.data, imdbId);
}

export async function fetchOmdbDetailsByTitle(
  title: string,
  key: string,
  year?: string | number | null,
  type?: "movie" | "series" | null
) {
  const base = `https://www.omdbapi.com/?apikey=${encodeURIComponent(key)}&t=${encodeURIComponent(title)}&plot=full&tomatoes=true`;
  const withYear = year ? `${base}&y=${encodeURIComponent(String(year))}` : base;
  const url = type ? `${withYear}&type=${encodeURIComponent(type)}` : withYear;
  const res = await fetch(url);
  const data = omdbDetailSchema.safeParse(await res.json());
  if (!data.success || data.data.Error) return null;
  return mapOmdbDetail(data.data);
}

export async function fetchTmdbDetails(tmdbId: number, key: string, type: "movie" | "tv") {
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = tmdbDetailSchema.safeParse(await res.json());
  if (!data.success) return null;
  return {
    tmdbId: data.data.id,
    title: data.data.title ?? data.data.name ?? "",
    year: (data.data.release_date ?? data.data.first_air_date)?.slice(0, 4) ?? null,
    runtime: data.data.runtime ? `${data.data.runtime} min` : null,
    genres: data.data.genres?.map((genre) => genre.name) ?? null,
    plot: data.data.overview ?? null,
    posterUrl: data.data.poster_path ? `${TMDB_IMAGE_BASE}${data.data.poster_path}` : null,
    backdropUrl: data.data.backdrop_path ? `${TMDB_IMAGE_BASE}${data.data.backdrop_path}` : null,
    country: data.data.production_countries?.map((country) => country.name).join(", ") ?? null,
    language: data.data.spoken_languages?.map((lang) => lang.name).join(", ") ?? null,
    popularity: data.data.popularity ?? null,
    source: "tmdb"
  } satisfies Partial<TitleRecord>;
}

export async function fetchTmdbWatchProviders(
  tmdbId: number,
  key: string,
  type: "movie" | "tv",
  preferredRegion?: string | null
): Promise<WatchProviders | null> {
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/watch/providers?api_key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = tmdbWatchProvidersSchema.safeParse(await res.json());
  if (!data.success || !data.data.results) return null;
  const results = data.data.results;
  const normalizedPreferred = preferredRegion?.trim().toUpperCase();
  const preferredRegions = [
    ...(normalizedPreferred ? [normalizedPreferred] : []),
    "US",
    "CA",
    "GB",
    "AU"
  ];
  let regionKey = preferredRegions.find((region) => results[region]);
  if (!regionKey) {
    regionKey = Object.keys(results)[0];
  }
  if (!regionKey) return null;
  const region = results[regionKey];
  return {
    country: regionKey,
    link: region.link ?? null,
    flatrate: mapProviders(region.flatrate),
    rent: mapProviders(region.rent),
    buy: mapProviders(region.buy)
  };
}

export async function resolveImdbId(tmdbId: number, key: string, type: "movie" | "tv") {
  const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/external_ids?api_key=${encodeURIComponent(key)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = tmdbExternalSchema.safeParse(await res.json());
  if (!data.success) return null;
  return data.data.imdb_id ?? null;
}

export async function fetchTrending(key: string) {
  const res = await fetch(`https://api.themoviedb.org/3/trending/all/day?api_key=${encodeURIComponent(key)}`);
  if (!res.ok) return [] as TitleRecord[];
  const data = tmdbSearchSchema.safeParse(await res.json());
  if (!data.success) return [];
  return data.data.results.map((item, index) => {
    const isTv = item.media_type === "tv";
    const title = item.title ?? item.name ?? "";
    const year = isTv ? item.first_air_date?.slice(0, 4) : item.release_date?.slice(0, 4);
    return {
      id: `tmdb:${item.id}`,
      tmdbId: item.id,
      title,
      year: year ?? null,
      type: isTv ? "series" : "movie",
      posterUrl: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
      popularity: item.popularity ?? null,
      tmdbRank: index + 1,
      source: "tmdb"
    };
  });
}
