import { useEffect, useRef } from "react";
import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";
import { register, unregisterAll } from "@tauri-apps/plugin-global-shortcut";
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
const appWindow = getCurrentWindow();
const SNAP_THRESHOLD = 20;

function App() {
  const init = useAppStore((state) => state.init);
  const view = useAppStore((state) => state.view);
  const shortcuts = useAppStore((state) => state.shortcuts);
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
  const isAdjustingResize = useRef(false);
  const lastBounds = useRef<{ x: number; y: number; w: number; h: number } | null>(null);

  const matchesShortcut = (event: KeyboardEvent, shortcut: string) => {
    const parts = shortcut.split("+").map((part) => part.trim().toLowerCase()).filter(Boolean);
    if (!parts.length) return false;
    const key = parts[parts.length - 1];
    const modifiers = new Set(parts.slice(0, -1));

    const wantsMod =
      modifiers.has("commandorcontrol") ||
      modifiers.has("cmdorctrl") ||
      modifiers.has("mod");
    const wantsCtrl = modifiers.has("ctrl") || modifiers.has("control");
    const wantsCmd = modifiers.has("cmd") || modifiers.has("command");
    const wantsAlt = modifiers.has("alt") || modifiers.has("option");
    const wantsShift = modifiers.has("shift");

    const modOk = !wantsMod || event.metaKey || event.ctrlKey;
    const ctrlOk = !wantsCtrl || event.ctrlKey;
    const cmdOk = !wantsCmd || event.metaKey;
    const altOk = !wantsAlt || event.altKey;
    const shiftOk = !wantsShift || event.shiftKey;
    const keyOk = event.key.toLowerCase() === key.toLowerCase();

    return modOk && ctrlOk && cmdOk && altOk && shiftOk && keyOk;
  };

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
    if (shortcuts.globalSearch?.trim()) {
      register(shortcuts.globalSearch, handler);
    }
    return () => {
      unregisterAll();
    };
  }, [shortcuts.globalSearch]);

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

      if (matchesShortcut(event, shortcuts.togglePinned)) {
        event.preventDefault();
        togglePinned();
      }
      if (matchesShortcut(event, shortcuts.refreshDetails)) {
        event.preventDefault();
        refreshDetails();
      }
      if (matchesShortcut(event, shortcuts.openImdb)) {
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
    const onPointerRelease = async () => {
      try {
        const monitor = await appWindow.currentMonitor();
        const position = await appWindow.outerPosition();
        const size = await appWindow.outerSize();

        if (!monitor || !position || !size) return;

        const centerX = Math.round((monitor.position.x + monitor.size.width / 2) - size.width / 2);
        const centerY = Math.round((monitor.position.y + monitor.size.height / 2) - size.height / 2);

        const snapX = Math.abs(position.x - centerX) <= SNAP_THRESHOLD;
        const snapY = Math.abs(position.y - centerY) <= SNAP_THRESHOLD;

        if (snapX || snapY) {
          await appWindow.setPosition(
            new LogicalPosition(snapX ? centerX : position.x, snapY ? centerY : position.y)
          );
        }
      } catch {
        // best-effort snapping only
      }
    };

    window.addEventListener("mouseup", onPointerRelease);
    window.addEventListener("touchend", onPointerRelease);
    return () => {
      window.removeEventListener("mouseup", onPointerRelease);
      window.removeEventListener("touchend", onPointerRelease);
    };
  }, []);

  useEffect(() => {
    const setup = async () => {
      try {
        const position = await appWindow.outerPosition();
        const size = await appWindow.outerSize();
        lastBounds.current = { x: position.x, y: position.y, w: size.width, h: size.height };
      } catch {
        lastBounds.current = null;
      }
    };

    setup();

    const unlistenPromise = appWindow.onResized(async () => {
      if (isAdjustingResize.current) return;
      try {
        const position = await appWindow.outerPosition();
        const size = await appWindow.outerSize();
        const prev = lastBounds.current;
        if (!prev) {
          lastBounds.current = { x: position.x, y: position.y, w: size.width, h: size.height };
          return;
        }

        const deltaW = size.width - prev.w;
        const deltaH = size.height - prev.h;
        let nextX = Math.round(prev.x - deltaW / 2);
        let nextY = Math.round(prev.y - deltaH / 2);

        const monitor = await appWindow.currentMonitor();
        if (monitor) {
          const minX = monitor.position.x;
          const minY = monitor.position.y;
          const maxX = monitor.position.x + monitor.size.width - size.width;
          const maxY = monitor.position.y + monitor.size.height - size.height;
          nextX = Math.min(Math.max(nextX, minX), maxX);
          nextY = Math.min(Math.max(nextY, minY), maxY);
        }

        if (nextX !== position.x || nextY !== position.y) {
          isAdjustingResize.current = true;
          await appWindow.setPosition(new LogicalPosition(nextX, nextY));
          isAdjustingResize.current = false;
        }

        lastBounds.current = { x: nextX, y: nextY, w: size.width, h: size.height };
      } catch {
        isAdjustingResize.current = false;
      }
    });

    return () => {
      void unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    const debounced = debounce(() => {
      fetchRemoteSuggestions();
    }, REMOTE_SEARCH_DEBOUNCE);
    debounced();
  }, [query, fetchRemoteSuggestions]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <Header />
      {view !== "detail" ? (
        <>
          <SearchInput />
          {errorMessage ? <p className="px-5 py-2 text-sm text-red-400">{errorMessage}</p> : null}
        </>
      ) : null}
      <ScrollArea className="mt-3 flex-1">
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
