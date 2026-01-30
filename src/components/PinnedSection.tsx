import { useMemo } from "react";
import { useAppStore } from "../store/useAppStore";
import { SuggestionsList } from "./SuggestionsList";

export function PinnedSection() {
  const pinnedIds = useAppStore((state) => state.pinnedIds);
  const localTitles = useAppStore((state) => state.localTitles);
  const selectionIndex = useAppStore((state) => state.selectionIndex);
  const selectSuggestion = useAppStore((state) => state.selectSuggestion);

  const suggestions = useMemo(() => {
    return pinnedIds
      .map((id) => localTitles.find((title) => title.id === id))
      .filter(Boolean)
      .map((item) => ({
        id: item!.id,
        title: item!.title,
        year: item!.year ?? null,
        type: item!.type,
        runtime: item!.runtime ?? null,
        rating: item!.rating ?? null,
        posterUrl: item!.posterUrl ?? null,
        popularity: item!.popularity ?? null,
        votes: item!.votes ?? null,
        tmdbRank: item!.tmdbRank ?? null
      }));
  }, [pinnedIds, localTitles]);

  if (!suggestions.length) return null;

  return (
    <section>
      <div className="px-5 pb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Pinned</div>
      <SuggestionsList suggestions={suggestions} selectionIndex={selectionIndex} onSelect={selectSuggestion} />
    </section>
  );
}
