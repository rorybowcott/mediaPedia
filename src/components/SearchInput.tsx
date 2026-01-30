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
      <div className="relative">
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={keysValid ? "Search films, TV shows, documentaries…" : "Add keys to unlock search"}
          disabled={!keysValid}
          aria-label="Search titles"
          aria-autocomplete="list"
          data-search-input="true"
          className="pr-12"
        />
        <Button
          variant="ghost"
          className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 p-0"
          onClick={openSettings}
          title="Settings (Cmd/Ctrl+,)"
          aria-keyshortcuts="Control+, Meta+,"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
