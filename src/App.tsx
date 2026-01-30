import { useEffect } from "react";
import { appWindow } from "@tauri-apps/api/window";
import { register, unregisterAll } from "@tauri-apps/api/globalShortcut";
import { useAppStore } from "./store/useAppStore";
import { SearchInput } from "./components/SearchInput";
import { SuggestionsList } from "./components/SuggestionsList";
import { PinnedSection } from "./components/PinnedSection";
import { TrendingSection } from "./components/TrendingSection";
import { DetailView } from "./components/DetailView";
import { SettingsModal } from "./components/SettingsModal";
import { ScrollArea } from "./components/ui/scroll-area";
import { Header } from "./components/Header";
import { debounce } from "./lib/utils";

const REMOTE_SEARCH_DEBOUNCE = 250;

function App() {
  const init = useAppStore((state) => state.init);
  const view = useAppStore((state) => state.view);
  const suggestions = useAppStore((state) => state.suggestions);
  const selectionIndex = useAppStore((state) => state.selectionIndex);
  const setSelectionIndex = useAppStore((state) => state.setSelectionIndex);
  const selectSuggestion = useAppStore((state) => state.selectSuggestion);
  const query = useAppStore((state) => state.query);
  const refreshDetails = useAppStore((state) => state.refreshDetails);
  const togglePinned = useAppStore((state) => state.togglePinned);
  const openImdb = useAppStore((state) => state.openImdb);
  const errorMessage = useAppStore((state) => state.errorMessage);
  const fetchRemoteSuggestions = useAppStore((state) => state.fetchRemoteSuggestions);
  const refreshTrending = useAppStore((state) => state.refreshTrending);
  const backToList = useAppStore((state) => state.backToList);

  useEffect(() => {
    init();
    const interval = window.setInterval(() => refreshTrending(), 1000 * 60 * 60 * 24);
    return () => window.clearInterval(interval);
  }, [init, refreshTrending]);

  useEffect(() => {
    const handler = async () => {
      await appWindow.show();
      await appWindow.setFocus();
      window.dispatchEvent(new Event("focus-search"));
    };
    register("CommandOrControl+K", handler);
    return () => {
      unregisterAll();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (view === "detail") {
          backToList();
        } else {
          appWindow.hide();
        }
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectionIndex(Math.min(selectionIndex + 1, suggestions.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectionIndex(Math.max(selectionIndex - 1, 0));
      }
      if (event.key === "Enter") {
        const selected = suggestions[selectionIndex];
        if (selected) {
          selectSuggestion(selected.id);
        }
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        togglePinned();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "r") {
        event.preventDefault();
        refreshDetails();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "o") {
        event.preventDefault();
        openImdb();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    suggestions,
    selectionIndex,
    selectSuggestion,
    setSelectionIndex,
    togglePinned,
    refreshDetails,
    openImdb,
    view,
    backToList
  ]);

  useEffect(() => {
    const debounced = debounce(() => {
      fetchRemoteSuggestions();
    }, REMOTE_SEARCH_DEBOUNCE);
    debounced();
  }, [query, fetchRemoteSuggestions]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <Header />
      <SearchInput />
      {errorMessage ? <p className="px-5 py-2 text-sm text-red-400">{errorMessage}</p> : null}
      <ScrollArea className="mt-3 h-[300px]">
        {view === "detail" ? (
          <DetailView />
        ) : query.trim() ? (
          <SuggestionsList suggestions={suggestions} selectionIndex={selectionIndex} onSelect={selectSuggestion} />
        ) : (
          <div className="space-y-6 pb-6">
            <PinnedSection />
            <TrendingSection />
          </div>
        )}
      </ScrollArea>
      <SettingsModal />
    </div>
  );
}

export default App;
