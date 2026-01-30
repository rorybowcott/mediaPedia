import { Settings, Pin } from "lucide-react";
import { Button } from "./ui/button";
import { useAppStore } from "../store/useAppStore";
import { invoke } from "@tauri-apps/api/core";

export function Header() {
  const openSettings = useAppStore((state) => state.openSettings);
  const togglePinned = useAppStore((state) => state.togglePinned);
  const selectedId = useAppStore((state) => state.selectedId);

  return (
    <div className="flex items-center justify-between px-5 pt-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">MediaPedia</p>
        <p className="text-lg font-semibold">Instant film & TV metadata</p>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          className="h-9 w-9 p-0"
          onClick={() => togglePinned(selectedId)}
          title="Pin / unpin (Cmd/Ctrl+P)"
        >
          <Pin className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="h-9 w-9 p-0"
          onClick={() => invoke("toggle_tray")}
          title="Toggle tray"
        >
          <span className="text-xs font-semibold">Tray</span>
        </Button>
        <Button
          variant="ghost"
          className="h-9 w-9 p-0"
          onClick={openSettings}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
