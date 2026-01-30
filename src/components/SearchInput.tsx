import { useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppStore } from "../store/useAppStore";

export function SearchInput() {
  const query = useAppStore((state) => state.query);
  const setQuery = useAppStore((state) => state.setQuery);
  const keysValid = useAppStore((state) => state.keysValid);
  const openSettings = useAppStore((state) => state.openSettings);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = () => inputRef.current?.focus();
    window.addEventListener("focus-search", handler);
    return () => window.removeEventListener("focus-search", handler);
  }, []);

  return (
    <div className="px-5">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={keysValid ? "Search films, TV shows, documentaries…" : "Add keys to unlock search"}
          disabled={!keysValid}
          aria-label="Search titles"
          aria-autocomplete="list"
          data-search-input="true"
        />
        <Button
          variant="ghost"
          className="h-10 w-10 shrink-0 p-0"
          onClick={openSettings}
          title="Settings (Cmd/Ctrl+,)"
          aria-keyshortcuts="Control+, Meta+,"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Operators:</span>
        <span>type:movie|series|documentary</span>
        <span>year:2020 or year:2010-2020</span>
        <span>country:uk</span>
        <span>lang:en</span>
      </div>
    </div>
  );
}
