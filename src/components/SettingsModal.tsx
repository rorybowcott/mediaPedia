import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useAppStore } from "../store/useAppStore";
import type { AppShortcuts } from "../lib/types";
import { CornerDownLeft, Ban } from "lucide-react";

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

  const [omdbKey, setOmdbKey] = useState(keys.omdbKey ?? "");
  const [tmdbKey, setTmdbKey] = useState(keys.tmdbKey ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [shortcutDraft, setShortcutDraft] = useState<AppShortcuts>(DEFAULT_SHORTCUTS);
  const [recordingKey, setRecordingKey] = useState<keyof AppShortcuts | null>(null);

  useEffect(() => {
    if (settingsOpen) {
      setOmdbKey(keys.omdbKey ?? "");
      setTmdbKey(keys.tmdbKey ?? "");
      setStatusMessage(null);
      setShortcutDraft(shortcuts);
    }
  }, [keys, settingsOpen, shortcuts]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handle = window.setTimeout(async () => {
      if (!omdbKey && !tmdbKey) return;
      await saveKeys({ omdbKey, tmdbKey }, { close: false });
      setStatusMessage("Settings saved.");
    }, 700);
    return () => window.clearTimeout(handle);
  }, [omdbKey, tmdbKey, saveKeys, settingsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handle = window.setTimeout(async () => {
      await setShortcuts(shortcutDraft);
      setStatusMessage("Settings saved.");
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
      setStatusMessage("Settings saved.");
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
        <KbdGroup>
          <Kbd>Press keys…</Kbd>
        </KbdGroup>
      );
    }

    if (!parts.length) {
      return (
        <KbdGroup>
          <Kbd className="text-muted-foreground">Blank</Kbd>
        </KbdGroup>
      );
    }

    return (
      <KbdGroup>
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
          <DialogTitle>API Keys</DialogTitle>
          <DialogDescription>
            Paste your OMDb and TMDB keys to unlock search and trending. Keys are stored securely in the
            OS keychain.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs uppercase text-muted-foreground">OMDb API Key</label>
            <Input
              value={omdbKey}
              onChange={(event) => {
                setOmdbKey(event.target.value);
                setStatusMessage(null);
              }}
            />
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">TMDB API Key</label>
            <Input
              value={tmdbKey}
              onChange={(event) => {
                setTmdbKey(event.target.value);
                setStatusMessage(null);
              }}
            />
          </div>
          {keysError ? <p className="text-sm text-red-400">{keysError}</p> : null}
          {statusMessage ? <p className="text-sm text-emerald-400">{statusMessage}</p> : null}
        </div>
        <div className="mt-6 space-y-3">
          <div className="text-sm font-semibold">Keyboard Shortcuts</div>
          <div className="space-y-2">
            {(
              [
                ["globalSearch", "Global Search"],
                ["refreshDetails", "Refresh Details"],
                ["openImdb", "Open IMDb"]
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
                    onClick={() => setRecordingKey(key)}
                    className="rounded-lg border border-border/70 bg-background/40 px-3 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                  >
                    {recordingKey === key ? "Recording..." : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShortcutDraft((prev) => ({ ...prev, [key]: "" }))}
                    className="rounded-lg border border-border/70 bg-background/40 px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground"
                    aria-label={`Clear ${label} shortcut`}
                  >
                    ✕
                  </button>
                  {renderShortcut(shortcutDraft[key], recordingKey === key)}
                </div>
              </div>
            ))}
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
