import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export function Header() {
  const handleDragStart = () => {
    appWindow.startDragging();
  };

  return (
    <div
      className="flex items-center justify-between px-5 pt-5"
      data-tauri-drag-region
      onPointerDown={handleDragStart}
    >
      <div />
      <div />
    </div>
  );
}
