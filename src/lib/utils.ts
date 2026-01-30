import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRuntime(runtime?: string | number | null) {
  if (!runtime) return "";
  const minutes = typeof runtime === "string" ? parseInt(runtime, 10) : runtime;
  if (!minutes || Number.isNaN(minutes)) return "";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export function formatYear(value?: string | number | null) {
  if (!value) return "";
  return String(value);
}

export function nowUnix() {
  return Math.floor(Date.now() / 1000);
}

export function debounce<T extends (...args: never[]) => void>(fn: T, waitMs: number) {
  let timer: number | undefined;
  return (...args: Parameters<T>) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), waitMs);
  };
}
