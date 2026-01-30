import { SuggestionsList } from "./SuggestionsList";
import type { Suggestion } from "../lib/types";

interface TrendingSectionProps {
  suggestions: Suggestion[];
  selectionIndex: number;
  selectionOffset: number;
  onSelect: (id: string) => void;
}

export function TrendingSection({
  suggestions,
  selectionIndex,
  selectionOffset,
  onSelect
}: TrendingSectionProps) {
  if (!suggestions.length) return null;

  return (
    <section>
      <div className="px-5 pb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">Trending</div>
      <SuggestionsList
        suggestions={suggestions}
        selectionIndex={selectionIndex}
        selectionOffset={selectionOffset}
        onSelect={onSelect}
        listId="trending-results"
        listLabel="Trending titles"
      />
    </section>
  );
}
