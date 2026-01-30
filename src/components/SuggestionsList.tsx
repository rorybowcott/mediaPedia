import { useEffect } from "react";
import { cn, formatRuntime, formatYear } from "../lib/utils";
import type { Suggestion } from "../lib/types";

interface SuggestionsListProps {
  suggestions: Suggestion[];
  selectionIndex: number;
  selectionOffset?: number;
  onSelect: (id: string) => void;
  listId?: string;
  listLabel?: string;
}

export function SuggestionsList({
  suggestions,
  selectionIndex,
  selectionOffset = 0,
  onSelect,
  listId = "suggestions",
  listLabel = "Search results"
}: SuggestionsListProps) {
  useEffect(() => {
    if (!suggestions.length) return;
    const localIndex = selectionIndex - selectionOffset;
    if (localIndex < 0 || localIndex >= suggestions.length) return;
    const target = document.getElementById(`${listId}-item-${localIndex}`);
    if (target) {
      target.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [selectionIndex, selectionOffset, suggestions.length, listId]);

  if (!suggestions.length) {
    return <p className="px-5 py-6 text-sm text-muted-foreground">No results yet.</p>;
  }

  return (
    <div className="space-y-2 px-3" role="listbox" aria-label={listLabel} id={listId}>
      {suggestions.map((item, index) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          role="option"
          aria-selected={selectionIndex === selectionOffset + index}
          data-selected={selectionIndex === selectionOffset + index ? "true" : "false"}
          id={`${listId}-item-${index}`}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition",
            selectionIndex === selectionOffset + index && "border-accent bg-accent/10"
          )}
        >
          <div className="h-14 w-10 overflow-hidden rounded-md bg-muted">
            {item.posterUrl ? (
              <img
                src={item.posterUrl}
                alt={item.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{item.title}</p>
              {item.rating ? (
                <span className="text-xs text-muted-foreground">⭐ {item.rating}</span>
              ) : null}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatYear(item.year)}</span>
              <span>•</span>
              <span>{item.type}</span>
              {item.runtime ? (
                <>
                  <span>•</span>
                  <span>{formatRuntime(item.runtime)}</span>
                </>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
