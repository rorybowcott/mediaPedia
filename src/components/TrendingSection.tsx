import { SuggestionsList } from "./SuggestionsList";
import { useAppStore } from "../store/useAppStore";
import { mapSuggestion } from "../lib/search";

export function TrendingSection() {
  const trending = useAppStore((state) => state.trending);
  const selectionIndex = useAppStore((state) => state.selectionIndex);
  const selectSuggestion = useAppStore((state) => state.selectSuggestion);

  if (!trending.length) return null;

  const suggestions = trending.map((item) =>
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

  return (
    <section>
      <div className="px-5 pb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Trending</div>
      <SuggestionsList suggestions={suggestions} selectionIndex={selectionIndex} onSelect={selectSuggestion} />
    </section>
  );
}
