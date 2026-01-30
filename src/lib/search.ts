import Fuse from "fuse.js";
import type { ParsedQuery, Suggestion, TitleRecord } from "./types";

export function buildFuseIndex(items: TitleRecord[]) {
  return new Fuse(items, {
    keys: ["title"],
    threshold: 0.35,
    includeScore: true
  });
}

function matchesFilters(item: TitleRecord, filters: ParsedQuery["filters"]) {
  if (filters.type) {
    if (filters.type === "documentary") {
      const genres = item.genres?.join(" ").toLowerCase() ?? "";
      if (item.type === "documentary") return true;
      if (!genres) return true;
      if (!genres.includes("documentary")) return false;
    } else if (item.type !== filters.type) {
      return false;
    }
  }
  if (filters.yearExact) {
    if (Number(item.year) !== filters.yearExact) return false;
  }
  if (filters.yearRange) {
    const year = Number(item.year);
    if (!year || year < filters.yearRange.start || year > filters.yearRange.end) return false;
  }
  if (filters.country) {
    const country = item.country?.toLowerCase() ?? "";
    if (country && !country.includes(filters.country)) return false;
  }
  if (filters.lang) {
    const language = item.language?.toLowerCase() ?? "";
    if (language && !language.includes(filters.lang)) return false;
  }
  return true;
}

function scoreMatch(title: string, query: string) {
  const lowerTitle = title.toLowerCase();
  const lowerQuery = query.toLowerCase();
  if (!lowerQuery) return 1;
  if (lowerTitle.startsWith(lowerQuery)) return 3;
  if (lowerTitle.includes(lowerQuery)) return 2;
  return 1;
}

export function rankSuggestions(
  query: ParsedQuery,
  items: TitleRecord[],
  limit = 5
): Suggestion[] {
  const filtered = items.filter((item) => matchesFilters(item, query.filters));
  const scored = filtered.map((item) => {
    const matchScore = scoreMatch(item.title, query.freeText);
    const popularityBoost = (item.popularity ?? 0) / 100;
    const voteBoost = (item.votes ?? 0) / 100000;
    const rankBoost = item.tmdbRank ? (50 - item.tmdbRank) / 50 : 0;
    return {
      item,
      score: matchScore + popularityBoost + voteBoost + rankBoost
    };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ item }) => mapSuggestion(item));
}

export function applyFuse(
  fuse: Fuse<TitleRecord> | null,
  query: ParsedQuery,
  items: TitleRecord[]
): TitleRecord[] {
  if (!query.freeText) return items;
  if (!fuse) return items;
  return fuse.search(query.freeText).map((result) => result.item);
}

export function mapSuggestion(item: TitleRecord): Suggestion {
  return {
    id: item.id,
    title: item.title,
    year: item.year ?? null,
    type: item.type,
    runtime: item.runtime ?? null,
    rating: item.rating ?? null,
    posterUrl: item.posterUrl ?? null,
    popularity: item.popularity ?? null,
    votes: item.votes ?? null,
    tmdbRank: item.tmdbRank ?? null
  };
}
