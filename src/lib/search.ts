import Fuse from "fuse.js";
import type { Suggestion, TitleRecord } from "./types";

export function buildFuseIndex(items: TitleRecord[]) {
  return new Fuse(items, {
    keys: ["title"],
    threshold: 0.35,
    includeScore: true
  });
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
  query: string,
  items: TitleRecord[],
  limit = 5
): Suggestion[] {
  const scored = items.map((item) => {
    const matchScore = scoreMatch(item.title, query);
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
  query: string,
  items: TitleRecord[]
): TitleRecord[] {
  if (!query) return items;
  if (!fuse) return items;
  return fuse.search(query).map((result) => result.item);
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
