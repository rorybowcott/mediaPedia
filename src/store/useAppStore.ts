import { create } from "zustand";
import type { AppKeys, AppShortcuts, Suggestion, TitleRecord, TrendingSeed } from "../lib/types";
import {
  addRecentSearch,
  getSetting,
  getTitleById,
  listTitles,
  listTrendingSeeds,
  setSetting,
  upsertTitle,
  upsertTrendingSeed
} from "../lib/db";
import { applyFuse, buildFuseIndex, rankSuggestions } from "../lib/search";
import {
  fetchOmdbDetails,
  fetchOmdbDetailsByTitle,
  fetchTmdbDetails,
  fetchTmdbWatchProviders,
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
import { imdbUrl, metacriticUrl, rottenTomatoesUrl } from "../lib/links";

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

interface DetailCardOrder {
  left: string[];
  right: string[];
}

interface AppState {
  keys: AppKeys;
  keysValid: boolean;
  keysError: { omdb?: string | null; tmdb?: string | null } | null;
  shortcuts: AppShortcuts;
  settingsOpen: boolean;
  query: string;
  suggestions: Suggestion[];
  selectionIndex: number;
  selectedId: string | null;
  detail: TitleRecord | null;
  detailLoading: boolean;
  view: "list" | "detail";
  showTrending: boolean;
  theme: "light" | "dark";
  metadataLinkTarget: "imdb" | "rotten" | "metacritic";
  watchRegion: string;
  cardCollapse: Record<string, boolean>;
  detailCardOrder: DetailCardOrder;
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
  refreshDetails: (id?: string | null) => Promise<void>;
  openImdb: () => Promise<void>;
  testKeys: (keys: AppKeys) => Promise<boolean>;
  saveKeys: (keys: AppKeys, options?: { close?: boolean }) => Promise<void>;
  resetKeys: () => Promise<void>;
  setShortcuts: (shortcuts: AppShortcuts) => Promise<void>;
  setShowTrending: (value: boolean) => Promise<void>;
  setTheme: (value: "light" | "dark") => Promise<void>;
  setMetadataLinkTarget: (value: "imdb" | "rotten" | "metacritic") => Promise<void>;
  setWatchRegion: (value: string) => Promise<void>;
  setCardCollapsed: (id: string, value: boolean) => Promise<void>;
  setDetailCardOrder: (value: DetailCardOrder) => Promise<void>;
  refreshTrending: () => Promise<void>;
  rebuildIndex: () => Promise<void>;
  fetchRemoteSuggestions: () => Promise<void>;
}

const CACHE_EXPIRY_SECONDS = 60 * 60 * 24 * 40;
const TRENDING_REFRESH_SECONDS = 60 * 60 * 24;
const DEFAULT_SHORTCUTS: AppShortcuts = {
  globalSearch: "CommandOrControl+K",
  refreshDetails: "CommandOrControl+R",
  openImdb: "CommandOrControl+O"
};
const DEFAULT_DETAIL_CARD_ORDER: DetailCardOrder = {
  left: ["poster", "ratings", "people"],
  right: ["plot", "watch"]
};
const DETAIL_CARD_IDS = [...DEFAULT_DETAIL_CARD_ORDER.left, ...DEFAULT_DETAIL_CARD_ORDER.right];

function normalizeDetailCardOrder(value: DetailCardOrder): DetailCardOrder {
  const seen = new Set<string>();
  const left = value.left.filter((id) => {
    if (!DETAIL_CARD_IDS.includes(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const right = value.right.filter((id) => {
    if (!DETAIL_CARD_IDS.includes(id) || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  const missing = DETAIL_CARD_IDS.filter((id) => !seen.has(id));
  missing.forEach((id, index) => {
    (index % 2 === 0 ? left : right).push(id);
  });
  return { left, right };
}

function parseDetailCardOrder(raw: string | null): DetailCardOrder {
  if (!raw) return DEFAULT_DETAIL_CARD_ORDER;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      const left: string[] = [];
      const right: string[] = [];
      parsed.forEach((id, index) => {
        (index % 2 === 0 ? left : right).push(id);
      });
      return normalizeDetailCardOrder({ left, right });
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      "left" in parsed &&
      "right" in parsed &&
      Array.isArray((parsed as DetailCardOrder).left) &&
      Array.isArray((parsed as DetailCardOrder).right)
    ) {
      return normalizeDetailCardOrder(parsed as DetailCardOrder);
    }
  } catch {
    return DEFAULT_DETAIL_CARD_ORDER;
  }
  return DEFAULT_DETAIL_CARD_ORDER;
}
const appWindow = getCurrentWindow();

function preferValue<T>(next: T | null | undefined, prev: T | null | undefined) {
  if (next === null || next === undefined) return prev ?? null;
  if (typeof next === "string") {
    const trimmed = next.trim();
    if (!trimmed) return (prev ?? null) as T | null;
  }
  if (Array.isArray(next)) {
    if (!next.length) return (prev ?? null) as T | null;
  }
  return next;
}

export const useAppStore = create<AppState>((set, get) => ({
  keys: {},
  keysValid: false,
  keysError: null,
  shortcuts: DEFAULT_SHORTCUTS,
  settingsOpen: false,
  query: "",
  suggestions: [],
  selectionIndex: 0,
  selectedId: null,
  detail: null,
  detailLoading: false,
  view: "list",
  showTrending: true,
  theme: "dark",
  metadataLinkTarget: "imdb",
  watchRegion: "GB",
  cardCollapse: { watch: false },
  detailCardOrder: DEFAULT_DETAIL_CARD_ORDER,
  trending: [],
  localTitles: [],
  lastRefresh: null,
  errorMessage: null,
  fuse: null,
  init: async () => {
    const keys = (await invoke<AppKeys>("get_keys")) ?? {};
    const storedShortcuts = await getSetting("shortcuts");
    let shortcuts = DEFAULT_SHORTCUTS;
    if (storedShortcuts) {
      try {
        const parsed = JSON.parse(storedShortcuts) as Partial<AppShortcuts>;
        shortcuts = { ...DEFAULT_SHORTCUTS, ...parsed };
      } catch {
        shortcuts = DEFAULT_SHORTCUTS;
      }
    }
    const localTitles = await listTitles();
    const trending = await listTrendingSeeds();
    const storedShowTrending = await getSetting("show_trending");
    const showTrending = storedShowTrending ? storedShowTrending === "true" : true;
    const storedTheme = await getSetting("theme");
    const theme = storedTheme === "light" ? "light" : "dark";
    const storedMetadataTarget = await getSetting("metadata_link_target");
    const metadataLinkTarget =
      storedMetadataTarget === "rotten" || storedMetadataTarget === "metacritic"
        ? storedMetadataTarget
        : "imdb";
    const storedWatchRegion = await getSetting("watch_region");
    const watchRegion = storedWatchRegion ? storedWatchRegion.trim().toUpperCase() : "GB";
    const storedCardCollapse = await getSetting("detail_card_collapsed");
    let cardCollapse: Record<string, boolean> = { watch: false };
    if (storedCardCollapse) {
      try {
        const parsed = JSON.parse(storedCardCollapse) as Record<string, boolean>;
        if (parsed && typeof parsed === "object") {
          cardCollapse = { ...cardCollapse, ...parsed };
        }
      } catch {
        cardCollapse = { watch: false };
      }
    } else {
      const legacyWatchCollapsed = await getSetting("watch_providers_collapsed");
      if (legacyWatchCollapsed) {
        cardCollapse = { watch: legacyWatchCollapsed === "true" };
      }
    }
    const storedCardOrder = await getSetting("detail_card_order");
    const detailCardOrder = parseDetailCardOrder(storedCardOrder);
    set({
      keys,
      shortcuts,
      localTitles,
      trending,
      showTrending,
      theme,
      metadataLinkTarget,
      watchRegion,
      cardCollapse,
      detailCardOrder
    });
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
    set({ query: value });
    get().updateLocalSuggestions();
  },
  updateLocalSuggestions: () => {
    const { query, localTitles, fuse } = get();
    const trimmedQuery = query.trim();
    const filtered = applyFuse(fuse, trimmedQuery, localTitles);
    const suggestions = rankSuggestions(trimmedQuery, filtered, 5);
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
      id: preferValue(omdbData.imdbId, base?.id) ?? resolvedImdb ?? imdbId ?? base?.id ?? targetId,
      imdbId: preferValue(omdbData.imdbId, base?.imdbId) ?? resolvedImdb ?? imdbId ?? null,
      tmdbId: preferValue(tmdbId ?? null, base?.tmdbId),
      title: preferValue(omdbData.title, base?.title) ?? "",
      year: preferValue(omdbData.year, base?.year),
      type: preferValue(omdbData.type, base?.type) ?? "movie",
      runtime: preferValue(omdbData.runtime, base?.runtime),
      rating: preferValue(omdbData.rating, base?.rating),
      votes: preferValue(omdbData.votes, base?.votes),
      // Prefer TMDB poster already on the record; only use OMDb if none.
      posterUrl: preferValue(base?.posterUrl, omdbData.posterUrl),
      backdropUrl: preferValue(base?.backdropUrl ?? null, null),
      genres: preferValue(omdbData.genres, base?.genres),
      plot: preferValue(omdbData.plot, base?.plot),
      cast: preferValue(omdbData.cast, base?.cast),
      director: preferValue(omdbData.director, base?.director),
      country: preferValue(omdbData.country, base?.country),
      language: preferValue(omdbData.language, base?.language),
      rottenTomatoesScore: preferValue(omdbData.rottenTomatoesScore, base?.rottenTomatoesScore),
      metacriticScore: preferValue(omdbData.metacriticScore, base?.metacriticScore),
      omdbRatings: preferValue(omdbData.omdbRatings, base?.omdbRatings),
      watchProviders: base?.watchProviders ?? null,
      popularity: preferValue(base?.popularity ?? null, null),
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
      const watchRegion = get().watchRegion;
      const tmdbType = cached?.type === "series" ? "tv" : "movie";
      const [tmdbData, tmdbWatchProviders] = await Promise.all([
        fetchTmdbDetails(tmdbId, keys.tmdbKey, tmdbType),
        fetchTmdbWatchProviders(tmdbId, keys.tmdbKey, tmdbType, watchRegion)
      ]);
      if (tmdbData) {
        tmdbSuccess = true;
        resolvedImdb = resolvedImdb ?? (await resolveImdbId(tmdbId, keys.tmdbKey, tmdbType));
        merged = {
          id: preferValue(resolvedImdb, merged?.id) ?? targetId,
          imdbId: preferValue(merged?.imdbId, null),
          tmdbId: preferValue(tmdbId, merged?.tmdbId),
          title: preferValue(merged?.title, tmdbData.title) ?? "",
          year: preferValue(merged?.year, null),
          type: preferValue(merged?.type, tmdbType === "tv" ? "series" : "movie"),
          runtime: preferValue(merged?.runtime, null),
          rating: preferValue(merged?.rating, null),
          votes: preferValue(merged?.votes, null),
          posterUrl: preferValue(tmdbData.posterUrl, merged?.posterUrl),
          backdropUrl: preferValue(tmdbData.backdropUrl, merged?.backdropUrl),
          genres: preferValue(merged?.genres, null),
          plot: preferValue(merged?.plot, null),
          cast: preferValue(merged?.cast, null),
          director: preferValue(merged?.director, null),
          country: preferValue(merged?.country, null),
          language: preferValue(merged?.language, null),
          rottenTomatoesScore: preferValue(merged?.rottenTomatoesScore, null),
          metacriticScore: preferValue(merged?.metacriticScore, null),
          omdbRatings: preferValue(merged?.omdbRatings, null),
          watchProviders: tmdbWatchProviders ?? null,
          popularity: preferValue(tmdbData.popularity, merged?.popularity),
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

    if (!omdbSuccess) {
      const titleLookup = merged?.title ?? cached?.title ?? null;
      const yearLookup = merged?.year ?? cached?.year ?? null;
      const typeLookup = merged?.type === "series" ? "series" : merged?.type === "movie" ? "movie" : null;
      if (titleLookup) {
        const omdbData = await fetchOmdbDetailsByTitle(titleLookup, keys.omdbKey, yearLookup, typeLookup);
        if (omdbData) {
          omdbSuccess = true;
          merged = applyOmdb(omdbData, merged ?? cached);
        }
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
    const { selectedId, suggestions, selectionIndex, detail, metadataLinkTarget } = get();
    const selected = suggestions[selectionIndex];
    const targetId = selectedId ?? selected?.id;
    if (!targetId) return;
    const cached = await getTitleById(targetId);
    const title = detail?.title ?? cached?.title ?? selected?.title ?? null;
    const imdbId = detail?.imdbId ?? cached?.imdbId ?? (targetId.startsWith("tt") ? targetId : null);
    let url: string | null = null;
    if (metadataLinkTarget === "rotten") {
      if (!title) return;
      url = rottenTomatoesUrl(title);
    } else if (metadataLinkTarget === "metacritic") {
      if (!title) return;
      url = metacriticUrl(title);
    } else {
      if (!imdbId) return;
      url = imdbUrl(imdbId);
    }
    await open(url);
    await appWindow.hide();
  },
  testKeys: async (keys) => {
    set({ keysError: null });
    let omdbError: string | null = null;
    let tmdbError: string | null = null;

    if (!keys.omdbKey) omdbError = "OMDb key is required.";
    if (!keys.tmdbKey) tmdbError = "TMDB key is required.";
    if (omdbError || tmdbError) {
      set({ keysError: { omdb: omdbError, tmdb: tmdbError } });
      return false;
    }

    try {
      const [omdbStatus, tmdbStatus] = await Promise.all([
        validateOmdbKey(keys.omdbKey),
        validateTmdbKey(keys.tmdbKey)
      ]);
      if (!omdbStatus.ok) {
        omdbError = omdbStatus.message ?? "OMDb key validation failed.";
      }
      if (!tmdbStatus.ok) {
        tmdbError = tmdbStatus.message ?? "TMDB key validation failed.";
      }
      if (omdbError || tmdbError) {
        set({ keysError: { omdb: omdbError, tmdb: tmdbError } });
        return false;
      }
      set({ keysError: null });
      return true;
    } catch (error) {
      const message = formatInvokeError(error, "Key validation failed.");
      set({ keysError: { omdb: message, tmdb: message } });
      return false;
    }
  },
  saveKeys: async (keys, options) => {
    const isValid = await get().testKeys(keys);
    if (!isValid) return;
    try {
      await invoke("set_keys", { omdbKey: keys.omdbKey, tmdbKey: keys.tmdbKey });
      const shouldClose = options?.close !== false;
      set({ keys, keysValid: true, settingsOpen: shouldClose ? false : true, keysError: null });
      if (get().view === "detail") {
        await get().refreshDetails();
      }
      if (shouldClose) {
        window.dispatchEvent(new Event("focus-search"));
      }
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
  setShortcuts: async (shortcuts) => {
    await setSetting("shortcuts", JSON.stringify(shortcuts));
    set({ shortcuts });
  },
  setShowTrending: async (value) => {
    await setSetting("show_trending", value ? "true" : "false");
    set({ showTrending: value });
  },
  setTheme: async (value) => {
    await setSetting("theme", value);
    set({ theme: value });
  },
  setMetadataLinkTarget: async (value) => {
    await setSetting("metadata_link_target", value);
    set({ metadataLinkTarget: value });
  },
  setWatchRegion: async (value) => {
    const normalized = value.trim().toUpperCase().slice(0, 2);
    const next = normalized || "GB";
    await setSetting("watch_region", next);
    set({ watchRegion: next });
    if (get().view === "detail") {
      await get().refreshDetails();
    }
  },
  setCardCollapsed: async (id, value) => {
    const current = get().cardCollapse;
    const next = { ...current, [id]: value };
    await setSetting("detail_card_collapsed", JSON.stringify(next));
    set({ cardCollapse: next });
  },
  setDetailCardOrder: async (value) => {
    const normalized = normalizeDetailCardOrder(value);
    await setSetting("detail_card_order", JSON.stringify(normalized));
    set({ detailCardOrder: normalized });
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
    const { query, keys, keysValid } = get();
    const trimmedQuery = query.trim();
    if (!trimmedQuery || !keys.omdbKey || !keys.tmdbKey || !keysValid) return;
    const [omdbResults, tmdbResults] = await Promise.all([
      searchOmdb(trimmedQuery, keys.omdbKey),
      searchTmdb(trimmedQuery, keys.tmdbKey)
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

    await addRecentSearch(trimmedQuery);
    await get().rebuildIndex();
  }
}));
