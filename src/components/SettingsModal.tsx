import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useAppStore } from "../store/useAppStore";

export function SettingsModal() {
  const settingsOpen = useAppStore((state) => state.settingsOpen);
  const closeSettings = useAppStore((state) => state.closeSettings);
  const keys = useAppStore((state) => state.keys);
  const keysError = useAppStore((state) => state.keysError);
  const testKeys = useAppStore((state) => state.testKeys);
  const saveKeys = useAppStore((state) => state.saveKeys);
  const resetKeys = useAppStore((state) => state.resetKeys);

  const [omdbKey, setOmdbKey] = useState(keys.omdbKey ?? "");
  const [tmdbKey, setTmdbKey] = useState(keys.tmdbKey ?? "");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (settingsOpen) {
      setOmdbKey(keys.omdbKey ?? "");
      setTmdbKey(keys.tmdbKey ?? "");
    }
  }, [keys, settingsOpen]);

  const handleTest = async () => {
    setTesting(true);
    await testKeys({ omdbKey, tmdbKey });
    setTesting(false);
  };

  const handleSave = async () => {
    await saveKeys({ omdbKey, tmdbKey });
  };

  const handleReset = async () => {
    await resetKeys();
    setOmdbKey("");
    setTmdbKey("");
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
            <Input value={omdbKey} onChange={(event) => setOmdbKey(event.target.value)} />
          </div>
          <div>
            <label className="text-xs uppercase text-muted-foreground">TMDB API Key</label>
            <Input value={tmdbKey} onChange={(event) => setTmdbKey(event.target.value)} />
          </div>
          {keysError ? <p className="text-sm text-red-400">{keysError}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleReset}>
            Reset keys
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? "Testing..." : "Test keys"}
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
