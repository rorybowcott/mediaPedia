import { create } from "zustand";
import type { AppKeys, ParsedQuery, Suggestion, TitleRecord, TrendingSeed } from "../lib/types";
import { parseQuery } from "../lib/operators";
import {
  addRecentSearch,
  getSetting,
  getTitleById,
  listPinned,
  listTitles,
  listTrendingSeeds,
  setPinned,
  setSetting,
  upsertTitle,
  upsertTrendingSeed
} from "../lib/db";
import { applyFuse, buildFuseIndex, mapSuggestion, rankSuggestions } from "../lib/search";
import {
  fetchOmdbDetails,
  fetchTmdbDetails,
  fetchTrending,
  resolveImdbId,
  searchOmdb,
  searchTmdb,
  validateOmdbKey,
  validateTmdbKey
} from "../lib/providers";
import { nowUnix } from "../lib/utils";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { imdbUrl } from "../lib/links";

function formatInvokeError(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return fallback;
  }
}

interface AppState {
  keys: AppKeys;
  keysValid: boolean;
  keysError: string | null;
  settingsOpen: boolean;
  query: string;
  parsedQuery: ParsedQuery;
  suggestions: Suggestion[];
  selectionIndex: number;
  selectedId: string | null;
  detail: TitleRecord | null;
  detailLoading: boolean;
  view: "list" | "detail";
  pinnedIds: string[];
  trending: TrendingSeed[];
  localTitles: TitleRecord[];
  lastRefresh: number | null;
  errorMessage: string | null;
  fuse: ReturnType<typeof buildFuseIndex> | null;
  init: () => Promise<void>;
  openSettings: () => void;
  closeSettings: () => void;
  setQuery: (value: string) => void;
  updateLocalSuggestions: () => void;
  setSelectionIndex: (value: number) => void;
  selectSuggestion: (id: string) => Promise<void>;
  backToList: () => void;
  togglePinned: (id?: string | null) => Promise<void>;
  refreshDetails: (id?: string | null) => Promise<void>;
  openImdb: () => Promise<void>;
  testKeys: (keys: AppKeys) => Promise<boolean>;
  saveKeys: (keys: AppKeys) => Promise<void>;
  resetKeys: () => Promise<void>;
  refreshTrending: () => Promise<void>;
  rebuildIndex: () => Promise<void>;
  fetchRemoteSuggestions: () => Promise<void>;
}

const CACHE_EXPIRY_SECONDS = 60 * 60 * 24 * 40;
const TRENDING_REFRESH_SECONDS = 60 * 60 * 24;
const appWindow = getCurrentWindow();

export const useAppStore = create<AppState>((set, get) => ({
  keys: {},
  keysValid: false,
  keysError: null,
  settingsOpen: false,
  query: "",
  parsedQuery: { freeText: "", filters: {} },
  suggestions: [],
  selectionIndex: 0,
  selectedId: null,
  detail: null,
  detailLoading: false,
  view: "list",
  pinnedIds: [],
  trending: [],
  localTitles: [],
  lastRefresh: null,
  errorMessage: null,
  fuse: null,
  init: async () => {
    const keys = (await invoke<AppKeys>("get_keys")) ?? {};
    const pinnedIds = await listPinned();
    const localTitles = await listTitles();
    const trending = await listTrendingSeeds();
    set({ keys, pinnedIds, localTitles, trending });
    get().rebuildIndex();

    const lastRefresh = await getSetting("last_trending_refresh");
    if (!lastRefresh || nowUnix() - Number(lastRefresh) > TRENDING_REFRESH_SECONDS) {
      await get().refreshTrending();
    }

    if (keys.omdbKey && keys.tmdbKey) {
      const isValid = await get().testKeys(keys);
      set({ keysValid: isValid, settingsOpen: !isValid });
      if (isValid && get().view === "detail") {
        await get().refreshDetails();
      }
    } else {
      set({ keysValid: false, settingsOpen: true });
    }
  },
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false, keysError: null }),
  setQuery: (value) => {
    const parsedQuery = parseQuery(value);
    set({ query: value, parsedQuery });
    get().updateLocalSuggestions();
  },
  updateLocalSuggestions: () => {
    const { parsedQuery, localTitles, fuse } = get();
    const filtered = applyFuse(fuse, parsedQuery, localTitles);
    const suggestions = rankSuggestions(parsedQuery, filtered, 5);
    const selectionIndex = Math.min(get().selectionIndex, Math.max(suggestions.length - 1, 0));
    set({ suggestions, selectionIndex });
  },
  setSelectionIndex: (value) => set({ selectionIndex: value }),
  selectSuggestion: async (id) => {
    const existing = await getTitleById(id);
    set({ selectedId: id, view: "detail", detail: existing, detailLoading: true });
    await get().refreshDetails(id);
  },
  backToList: () => set({ view: "list", detailLoading: false }),
  togglePinned: async (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    const isPinned = get().pinnedIds.includes(targetId);
    await setPinned(targetId, !isPinned);
    const pinnedIds = await listPinned();
    set({ pinnedIds });
  },
  refreshDetails: async (id) => {
    const targetId = id ?? get().selectedId;
    if (!targetId) return;
    const { keys } = get();
    if (!keys.omdbKey || !keys.tmdbKey) return;

    const cached = await getTitleById(targetId);
    if (cached) {
      set({ detail: cached });
    }

    const isTmdb = targetId.startsWith("tmdb:");
    const tmdbId = cached?.tmdbId ?? (isTmdb ? Number(targetId.split(":")[1]) : null);
    const imdbId = cached?.imdbId ?? (isTmdb ? null : targetId);
    let resolvedImdb: string | null = imdbId;

    let merged: TitleRecord | null = cached ?? null;
    let fallbackLabel: string | null = null;
    let omdbSuccess = false;
    let tmdbSuccess = false;

    const applyOmdb = (omdbData: Partial<TitleRecord>, base: TitleRecord | null) => ({
      id: omdbData.imdbId ?? resolvedImdb ?? imdbId ?? base?.id ?? targetId,
      imdbId: omdbData.imdbId ?? resolvedImdb ?? imdbId ?? base?.imdbId ?? null,
      tmdbId: base?.tmdbId ?? tmdbId ?? null,
      title: omdbData.title ?? base?.title ?? "",
      year: omdbData.year ?? base?.year ?? null,
      type: omdbData.type ?? base?.type ?? "movie",
      runtime: omdbData.runtime ?? base?.runtime ?? null,
      rating: omdbData.rating ?? base?.rating ?? null,
      votes: omdbData.votes ?? base?.votes ?? null,
      posterUrl: omdbData.posterUrl ?? base?.posterUrl ?? null,
      backdropUrl: base?.backdropUrl ?? null,
      genres: omdbData.genres ?? base?.genres ?? null,
      plot: omdbData.plot ?? base?.plot ?? null,
      cast: omdbData.cast ?? base?.cast ?? null,
      director: omdbData.director ?? base?.director ?? null,
      country: omdbData.country ?? base?.country ?? null,
      language: omdbData.language ?? base?.language ?? null,
      popularity: base?.popularity ?? null,
      source: "omdb",
      expiresAt: nowUnix() + CACHE_EXPIRY_SECONDS
    });

    if (imdbId) {
      const omdbData = await fetchOmdbDetails(imdbId, keys.omdbKey);
      if (omdbData) {
        omdbSuccess = true;
        merged = applyOmdb(omdbData, cached ?? merged);
      }
    }

    if (tmdbId) {
      const tmdbType = cached?.type === "series" ? "tv" : "movie";
      const tmdbData = await fetchTmdbDetails(tmdbId, keys.tmdbKey, tmdbType);
      if (tmdbData) {
        tmdbSuccess = true;
        resolvedImdb = resolvedImdb ?? (await resolveImdbId(tmdbId, keys.tmdbKey, tmdbType));
        merged = {
          id: resolvedImdb ?? targetId,
          imdbId: resolvedImdb ?? imdbId ?? null,
          tmdbId,
          title: merged?.title ?? tmdbData.title ?? "",
          year: merged?.year ?? tmdbData.year ?? null,
          type: merged?.type ?? (tmdbType === "tv" ? "series" : "movie"),
          runtime: merged?.runtime ?? tmdbData.runtime ?? null,
          rating: merged?.rating ?? null,
          votes: merged?.votes ?? null,
          posterUrl: tmdbData.posterUrl ?? merged?.posterUrl ?? null,
          backdropUrl: tmdbData.backdropUrl ?? merged?.backdropUrl ?? null,
          genres: merged?.genres ?? tmdbData.genres ?? null,
          plot: merged?.plot ?? tmdbData.plot ?? null,
          cast: merged?.cast ?? null,
          director: merged?.director ?? null,
          country: merged?.country ?? tmdbData.country ?? null,
          language: merged?.language ?? tmdbData.language ?? null,
          popularity: tmdbData.popularity ?? merged?.popularity ?? null,
          source: merged?.source ?? "tmdb",
          expiresAt: nowUnix() + CACHE_EXPIRY_SECONDS
        };
      }
    }

    if (!omdbSuccess && resolvedImdb) {
      const omdbData = await fetchOmdbDetails(resolvedImdb, keys.omdbKey);
      if (omdbData) {
        omdbSuccess = true;
        merged = applyOmdb(omdbData, merged ?? cached);
      }
    }

    if (merged) {
      if (!omdbSuccess && tmdbSuccess) {
        fallbackLabel = "Fallback data (TMDB)";
      } else if (!omdbSuccess && !tmdbSuccess && cached) {
        fallbackLabel = "Stale cache";
      } else if (!omdbSuccess && cached) {
        fallbackLabel = "Cached data";
      }
      merged.fallbackLabel = fallbackLabel;
      await upsertTitle(merged);
      set({ detail: merged, detailLoading: false, selectedId: merged.id });
      await get().rebuildIndex();
    } else {
      set({ detailLoading: false, errorMessage: "Unable to load details." });
    }
  },
  openImdb: async () => {
    const { selectedId, suggestions, selectionIndex, detail } = get();
    const selected = suggestions[selectionIndex];
    const targetId = selectedId ?? selected?.id;
    if (!targetId) return;
    const cached = await getTitleById(targetId);
    const imdbId = detail?.imdbId ?? cached?.imdbId ?? (targetId.startsWith("tt") ? targetId : null);
    if (!imdbId) return;
    await open(imdbUrl(imdbId));
    await appWindow.hide();
  },
  testKeys: async (keys) => {
    set({ keysError: null });
    if (!keys.omdbKey || !keys.tmdbKey) {
      set({ keysError: "Both keys are required." });
      return false;
    }
    try {
      const [omdbStatus, tmdbStatus] = await Promise.all([
        validateOmdbKey(keys.omdbKey),
        validateTmdbKey(keys.tmdbKey)
      ]);
      if (!omdbStatus.ok || !tmdbStatus.ok) {
        set({ keysError: omdbStatus.message ?? tmdbStatus.message ?? "Key validation failed." });
        return false;
      }
      set({ keysError: null });
      return true;
    } catch (error) {
      set({ keysError: formatInvokeError(error, "Key validation failed.") });
      return false;
    }
  },
  saveKeys: async (keys) => {
    const isValid = await get().testKeys(keys);
    if (!isValid) return;
    try {
      await invoke("set_keys", { omdbKey: keys.omdbKey, tmdbKey: keys.tmdbKey });
      set({ keys, keysValid: true, settingsOpen: false, keysError: null });
      if (get().view === "detail") {
        await get().refreshDetails();
      }
      window.dispatchEvent(new Event("focus-search"));
    } catch (error) {
      set({ keysError: formatInvokeError(error, "Failed to save keys.") });
    }
  },
  resetKeys: async () => {
    try {
      await invoke("reset_keys");
      set({ keys: {}, keysValid: false, settingsOpen: true, keysError: null });
    } catch (error) {
      set({ keysError: formatInvokeError(error, "Failed to reset keys.") });
    }
  },
  refreshTrending: async () => {
    const { keys } = get();
    if (!keys.tmdbKey) return;
    const trending = await fetchTrending(keys.tmdbKey);
    const now = nowUnix();
    const seeds = trending.map((item) => ({
      id: item.id,
      title: item.title,
      year: item.year ?? null,
      type: item.type,
      posterUrl: item.posterUrl ?? null,
      tmdbRank: item.tmdbRank ?? null,
      popularity: item.popularity ?? null
    }));
    await upsertTrendingSeed(seeds);
    for (const item of trending) {
      await upsertTitle({
        ...item,
        id: item.id,
        expiresAt: now + CACHE_EXPIRY_SECONDS,
        tmdbTrendingAt: now
      });
    }
    await setSetting("last_trending_refresh", String(now));
    set({ trending: seeds, lastRefresh: now });
    await get().rebuildIndex();
  },
  rebuildIndex: async () => {
    const localTitles = await listTitles();
    const fuse = buildFuseIndex(localTitles);
    set({ localTitles, fuse });
    get().updateLocalSuggestions();
  },
  fetchRemoteSuggestions: async () => {
    const { parsedQuery, keys, keysValid } = get();
    if (!parsedQuery.freeText || !keys.omdbKey || !keys.tmdbKey || !keysValid) return;
    const [omdbResults, tmdbResults] = await Promise.all([
      searchOmdb(parsedQuery.freeText, keys.omdbKey),
      searchTmdb(parsedQuery.freeText, keys.tmdbKey)
    ]);
    const merged = new Map<string, TitleRecord>();
    [...omdbResults, ...tmdbResults].forEach((item) => {
      const id = item.imdbId ?? item.id;
      const current = merged.get(id);
      if (!current) {
        merged.set(id, item);
        return;
      }
      merged.set(id, {
        ...current,
        posterUrl: current.posterUrl ?? item.posterUrl ?? null,
        popularity: current.popularity ?? item.popularity ?? null,
        tmdbId: current.tmdbId ?? item.tmdbId ?? null,
        imdbId: current.imdbId ?? item.imdbId ?? null
      });
    });

    for (const item of merged.values()) {
      await upsertTitle({
        ...item,
        id: item.imdbId ?? item.id,
        expiresAt: nowUnix() + CACHE_EXPIRY_SECONDS
      });
    }

    await addRecentSearch(parsedQuery.freeText);
    await get().rebuildIndex();
  }
}));
