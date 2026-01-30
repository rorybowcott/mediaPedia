import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Kbd, KbdGroup } from "./ui/kbd";
import { useAppStore } from "../store/useAppStore";

interface ShortcutItem {
  label: string;
  keys: string | string[];
}

interface ShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATIC_SHORTCUTS: ShortcutItem[] = [
  { label: "Show shortcuts", keys: "?" },
  { label: "Show shortcuts (alt)", keys: "CommandOrControl+/" },
  { label: "Open settings", keys: "CommandOrControl+," },
  { label: "Navigate results", keys: ["ArrowUp", "ArrowDown"] },
  { label: "Open selected", keys: "Enter" },
  { label: "Back", keys: "Escape" }
];

function renderShortcut(shortcut: string) {
  const parts = shortcut.split("+").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) {
    return (
      <KbdGroup>
        <Kbd className="text-muted-foreground">Unassigned</Kbd>
      </KbdGroup>
    );
  }
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
    if (key === "arrowup") return "↑";
    if (key === "arrowdown") return "↓";
    if (key === "/") return "/";
    if (key === ",") return ",";
    return part;
  };

  return (
    <KbdGroup>
      {parts.map((part, index) => (
        <div key={`${shortcut}-${part}`} className="flex items-center gap-1">
          <Kbd>{mapPart(part)}</Kbd>
          {index < parts.length - 1 ? <span className="px-1 text-xs text-muted-foreground">+</span> : null}
        </div>
      ))}
    </KbdGroup>
  );
}

export function ShortcutsModal({ open, onOpenChange }: ShortcutsModalProps) {
  const shortcuts = useAppStore((state) => state.shortcuts);

  const dynamicShortcuts: ShortcutItem[] = [
    { label: "Focus search", keys: shortcuts.globalSearch },
    { label: "Refresh details", keys: shortcuts.refreshDetails },
    { label: "Open IMDb", keys: shortcuts.openImdb }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>Everything you can do without touching the mouse.</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Navigation</div>
            <div className="space-y-2">
              {STATIC_SHORTCUTS.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="text-sm">{item.label}</div>
                  {Array.isArray(item.keys) ? (
                    <div className="flex items-center gap-2">
                      {item.keys.map((key) => (
                        <div key={`${item.label}-${key}`}>{renderShortcut(key)}</div>
                      ))}
                    </div>
                  ) : (
                    renderShortcut(item.keys)
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Actions</div>
            <div className="space-y-2">
              {dynamicShortcuts.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <div className="text-sm">{item.label}</div>
                  {renderShortcut(item.keys || "")}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
