import type { Suggestion, TrendingSeed } from "./types";
import { mapSuggestion } from "./search";

export function buildTrendingSuggestions(trending: TrendingSeed[]): Suggestion[] {
  return trending.map((item) =>
    mapSuggestion({
      id: item.id,
      title: item.title,
      year: item.year ?? null,
      type: item.type,
      posterUrl: item.posterUrl ?? null,
      popularity: item.popularity ?? null,
      tmdbRank: item.tmdbRank ?? null
    })
  );
}
