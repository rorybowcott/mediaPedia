import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useAppStore } from "../store/useAppStore";
import type { AppShortcuts } from "../lib/types";
import { Check, CornerDownLeft, X } from "lucide-react";

const DEFAULT_SHORTCUTS: AppShortcuts = {
  globalSearch: "CommandOrControl+K",
  refreshDetails: "CommandOrControl+R",
  openImdb: "CommandOrControl+O"
};

export function SettingsModal() {
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const closeSettings = useAppStore((state) => state.closeSettings);
  const keys = useAppStore((state) => state.keys);
  const keysError = useAppStore((state) => state.keysError);
  const saveKeys = useAppStore((state) => state.saveKeys);
  const shortcuts = useAppStore((state) => state.shortcuts);
  const setShortcuts = useAppStore((state) => state.setShortcuts);
  const showTrending = useAppStore((state) => state.showTrending);
  const setShowTrending = useAppStore((state) => state.setShowTrending);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const metadataLinkTarget = useAppStore((state) => state.metadataLinkTarget);
  const setMetadataLinkTarget = useAppStore((state) => state.setMetadataLinkTarget);

  const [omdbKey, setOmdbKey] = useState(keys.omdbKey ?? "");
  const [tmdbKey, setTmdbKey] = useState(keys.tmdbKey ?? "");
  const [keysSavedAt, setKeysSavedAt] = useState<number | null>(null);
  const [shortcutDraft, setShortcutDraft] = useState<AppShortcuts>(DEFAULT_SHORTCUTS);
  const [recordingKey, setRecordingKey] = useState<keyof AppShortcuts | null>(null);
  const [showOmdbKey, setShowOmdbKey] = useState(false);
  const [showTmdbKey, setShowTmdbKey] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      setOmdbKey(keys.omdbKey ?? "");
      setTmdbKey(keys.tmdbKey ?? "");
      setKeysSavedAt(null);
      setShortcutDraft(shortcuts);
    }
  }, [keys, settingsOpen, shortcuts]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handle = window.setTimeout(async () => {
      if (!omdbKey && !tmdbKey) return;
      await saveKeys({ omdbKey, tmdbKey }, { close: false });
      setKeysSavedAt(Date.now());
    }, 700);
    return () => window.clearTimeout(handle);
  }, [omdbKey, tmdbKey, saveKeys, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handle = window.setTimeout(async () => {
      await setShortcuts(shortcutDraft);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [shortcutDraft, setShortcuts, settingsOpen]);

  useEffect(() => {
    if (!recordingKey) return;
    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        setRecordingKey(null);
        return;
      }

      const parts: string[] = [];
      if (event.metaKey) parts.push("Command");
      if (event.ctrlKey) parts.push(event.metaKey ? "Control" : "CommandOrControl");
      if (event.altKey) parts.push("Alt");
      if (event.shiftKey) parts.push("Shift");

      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
      const ignore = ["Shift", "Meta", "Control", "Alt"].includes(event.key);
      if (ignore) return;

      const combo = [...parts, key].join("+");
      setShortcutDraft((prev) => ({ ...prev, [recordingKey]: combo }));
      setRecordingKey(null);
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [recordingKey]);

  const renderShortcut = (shortcut: string, isRecording: boolean) => {
    const parts = shortcut.split("+").map((part) => part.trim()).filter(Boolean);
    const mapPart = (part: string) => {
      const key = part.toLowerCase();
      if (key === "commandorcontrol" || key === "cmdorctrl" || key === "mod") return "⌘";
      if (key === "command" || key === "cmd") return "⌘";
      if (key === "control" || key === "ctrl") return "⌃";
      if (key === "option" || key === "alt") return "⌥";
      if (key === "shift") return "⇧";
      if (key === "enter" || key === "return") return "⏎";
      if (key === "backspace") return "⌫";
      if (key === "delete") return "⌦";
      return part;
    };
    if (isRecording) {
      return (
        <KbdGroup className="border-0 bg-transparent p-0">
          <Kbd>Press keys…</Kbd>
        </KbdGroup>
      );
    }

    if (!parts.length) {
      return (
        <KbdGroup className="border-0 bg-transparent p-0">
          <Kbd className="text-muted-foreground">Blank</Kbd>
        </KbdGroup>
      );
    }

    return (
      <KbdGroup className="border-0 bg-transparent p-0">
        {parts.map((part, index) => (
          <div key={`${shortcut}-${part}`} className="flex items-center gap-1">
            <Kbd>{mapPart(part)}</Kbd>
            {index < parts.length - 1 ? (
              <span className="px-1 text-xs text-muted-foreground">+</span>
            ) : null}
          </div>
        ))}
      </KbdGroup>
    );
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={(open) => (!open ? closeSettings() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          <section className="rounded-2xl border border-border/70 bg-card/60 p-4 shadow-lg">
            <div className="text-sm font-semibold">API Keys</div>
            <DialogDescription className="mt-1">
              Paste your OMDb and TMDB keys to unlock search and trending. Keys are stored securely in the
              OS keychain.
            </DialogDescription>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-xs pt-2 text-muted-foreground">OMDb API Key</label>
                  {keysError?.omdb && omdbKey ? (
                    <X className="h-3.5 w-3.5 text-red-400" />
                  ) : keysSavedAt && !keysError?.omdb && omdbKey ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    type={showOmdbKey ? "text" : "password"}
                    value={omdbKey}
                    onChange={(event) => {
                      setOmdbKey(event.target.value);
                      setKeysSavedAt(null);
                    }}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="none"
                    className="pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOmdbKey((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    {showOmdbKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">TMDB API Key</label>
                  {keysError?.tmdb && tmdbKey ? (
                    <X className="h-3.5 w-3.5 text-red-400" />
                  ) : keysSavedAt && !keysError?.tmdb && tmdbKey ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : null}
                </div>
                <div className="relative">
                  <Input
                    type={showTmdbKey ? "text" : "password"}
                    value={tmdbKey}
                    onChange={(event) => {
                      setTmdbKey(event.target.value);
                      setKeysSavedAt(null);
                    }}
                    spellCheck={false}
                    autoCorrect="off"
                    autoCapitalize="none"
                    className="pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowTmdbKey((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    {showTmdbKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>
          </section>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 px-3 py-3">
            <div>
              <div className="text-sm font-semibold">Trending panel</div>
              <div className="text-xs text-muted-foreground">Show trending suggestions on the home view.</div>
            </div>
            <button
              type="button"
              onClick={() => setShowTrending(!showTrending)}
              className="rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
              aria-pressed={showTrending}
            >
              {showTrending ? "On" : "Off"}
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 px-3 py-3">
            <div>
              <div className="text-sm font-semibold">Theme</div>
              <div className="text-xs text-muted-foreground">Switch between light and dark.</div>
            </div>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full border border-border/70 bg-background/50 px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
              aria-pressed={theme === "dark"}
            >
              {theme === "dark" ? "Dark" : "Light"}
            </button>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 px-3 py-3">
            <div>
              <div className="text-sm font-semibold">Metadata links</div>
              <div className="text-xs text-muted-foreground">
                Choose where pills and metadata clicks should open.
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(
                [
                  ["imdb", "IMDb"],
                  ["rotten", "Rotten"],
                  ["metacritic", "Metacritic"]
                ] as Array<["imdb" | "rotten" | "metacritic", string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMetadataLinkTarget(value)}
                  className={`rounded-full border border-border/70 px-3 py-1 text-xs transition ${
                    metadataLinkTarget === value
                      ? "bg-foreground/10 text-foreground"
                      : "bg-background/50 text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={metadataLinkTarget === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">Keyboard Shortcuts</div>
            <div className="mt-3 space-y-2">
              {(
                [
                  ["globalSearch", "Global Search"],
                  ["refreshDetails", "Refresh Details"],
                  ["openImdb", "Open Title"]
                ] as Array<[keyof AppShortcuts, string]>
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-card/50 px-3 py-3"
                >
                  <div className="text-sm">{label}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShortcutDraft((prev) => ({ ...prev, [key]: "" }))}
                      className="rounded-lg border border-border/70 bg-background/40 px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                      aria-label={`Clear ${label} shortcut`}
                    >
                      ✕
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecordingKey(key)}
                      className="rounded-lg border border-border/70 bg-background/40 px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                      aria-label={`Edit ${label} shortcut`}
                    >
                      {renderShortcut(shortcutDraft[key], recordingKey === key)}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={closeSettings} className="h-8 gap-1 px-5 text-sm">
            Cancel
          </Button>
          <Button
            onClick={closeSettings}
            className="h-8 gap-1 px-5 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
          >
            Accept
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-background/40 text-foreground/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <CornerDownLeft className="h-4 w-4" />
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
