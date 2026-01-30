import { useEffect, useRef } from "react";
import { Input } from "./ui/input";
import { useAppStore } from "../store/useAppStore";

export function SearchInput() {
  const query = useAppStore((state) => state.query);
  const setQuery = useAppStore((state) => state.setQuery);
  const keysValid = useAppStore((state) => state.keysValid);
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
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={keysValid ? "Search films, TV shows, documentaries…" : "Add keys to unlock search"}
        disabled={!keysValid}
      />
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
