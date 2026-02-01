import { useEffect, useRef, useState } from "react";
import { ExternalLink, Calendar, Clock3, Film, GripHorizontal } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { cn, formatRuntime, formatYear } from "../lib/utils";
import {
  imdbUrl,
  metacriticUrl,
  rottenTomatoesUrl,
  trailerUrl,
  wikipediaUrl,
} from "../lib/links";
import { open } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../store/useAppStore";

const appWindow = getCurrentWindow();

export function DetailView() {
  const detail = useAppStore((state) => state.detail);
  const detailLoading = useAppStore((state) => state.detailLoading);
  const detailCardOrder = useAppStore((state) => state.detailCardOrder);
  const setDetailCardOrder = useAppStore((state) => state.setDetailCardOrder);
  const metadataLinkTarget = useAppStore((state) => state.metadataLinkTarget);
  const posterRef = useRef<HTMLDivElement>(null);
  const posterOverlayRef = useRef<HTMLImageElement>(null);
  const dragOrderRef = useRef<string[] | null>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const cardsContainerRef = useRef<HTMLDivElement>(null);
  const leftColumnRef = useRef<HTMLDivElement>(null);
  const rightColumnRef = useRef<HTMLDivElement>(null);
  const [posterTilt, setPosterTilt] = useState({ x: 0, y: 0, glow: 0 });
  const [plotExpanded, setPlotExpanded] = useState(false);
  const [posterOpen, setPosterOpen] = useState(false);
  const [posterClosing, setPosterClosing] = useState(false);
  const [posterRect, setPosterRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
    targetX: number;
    targetY: number;
    scale: number;
  } | null>(null);
  const [posterAnimating, setPosterAnimating] = useState(false);
  const [posterHidden, setPosterHidden] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<{ id: string; position: "before" | "after" } | null>(
    null,
  );
  const [dragOrder, setDragOrder] = useState<string[] | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [dragSize, setDragSize] = useState<{ width: number; height: number } | null>(null);
  const formatVotes = (value?: number | null) =>
    typeof value === "number" ? new Intl.NumberFormat().format(value) : "—";
  const getOmdbRating = (source: string) =>
    detail?.omdbRatings?.find((rating) => rating.source === source)?.value ??
    null;
  const parseImdbScore = (value?: string | null) => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, Math.min(10, parsed)) / 10;
  };
  const parsePercentScore = (value?: string | null) => {
    if (!value) return null;
    const cleaned = value.replace("%", "").trim();
    const parsed = Number.parseFloat(cleaned);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, Math.min(100, parsed)) / 100;
  };
  const parseMetacriticScore = (value?: string | null) => {
    if (!value) return null;
    const parsed = Number.parseFloat(value);
    if (Number.isNaN(parsed)) return null;
    return Math.max(0, Math.min(100, parsed)) / 100;
  };
  const imdbValue = detail?.rating ?? null;
  const rottenValue = detail?.rottenTomatoesScore ?? getOmdbRating("Rotten Tomatoes") ?? null;
  const metacriticValue = detail?.metacriticScore ?? getOmdbRating("Metacritic") ?? null;
  const hasAnyRating =
    Boolean(imdbValue) ||
    Boolean(detail?.votes) ||
    Boolean(rottenValue) ||
    Boolean(metacriticValue);
  const renderRatingSlider = (
    label: React.ReactNode,
    value: string | null,
    ratio: number | null,
    fillGradient?: string,
    meta?: React.ReactNode,
    emptyLabel: string = "—",
  ) => (
    <div className="rounded-xl border border-border/70 bg-[var(--card-tile-bg)] p-3 shadow-[0_6px_14px_rgba(0,0,0,0.18)]">
      <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className="text-right">
          <div
            className={cn(
              "text-sm font-semibold",
              value
                ? "text-[var(--rating-value-color)]"
                : "text-muted-foreground",
            )}
          >
            {value ?? emptyLabel}
          </div>
          <div className="mt-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {meta ?? "No vote info"}
          </div>
        </div>
      </div>
      <div className="mt-3 h-3.5 rounded-full bg-[var(--rating-track-bg)] shadow-[var(--rating-track-shadow)]">
        <div
          className="h-full rounded-full shadow-[var(--rating-fill-shadow)]"
          style={{
            width: `${Math.round((ratio ?? 0) * 100)}%`,
            background: fillGradient ?? "var(--rating-fill-gradient)",
          }}
          aria-hidden="true"
        />
      </div>
    </div>
  );

  if (detailLoading && !detail) {
    return (
      <div className="px-5 py-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-40 w-28" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="px-5 py-6 text-sm text-muted-foreground">
        Select a title to view details.
      </div>
    );
  }

  const openLink = async (url: string) => {
    await open(url);
    await appWindow.hide();
  };
  const getSearchUrl = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return null;
    if (metadataLinkTarget === "rotten") {
      return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(trimmed)}`;
    }
    if (metadataLinkTarget === "metacritic") {
      return `https://www.metacritic.com/search/${encodeURIComponent(trimmed)}/`;
    }
    return `https://www.imdb.com/find?q=${encodeURIComponent(trimmed)}`;
  };
  const getImdbGenreSlug = (genre: string) => {
    const trimmed = genre.trim().toLowerCase();
    const map: Record<string, string> = {
      "sci-fi": "sci-fi",
      "science fiction": "sci-fi",
      "film-noir": "film-noir",
      "film noir": "film-noir",
      "tv movie": "tv-movie",
      "talk-show": "talk-show",
      "talk show": "talk-show",
      "game-show": "game-show",
      "game show": "game-show",
      "reality-tv": "reality-tv",
      "reality tv": "reality-tv"
    };
    if (map[trimmed]) return map[trimmed];
    return trimmed.replace(/&/g, "and").replace(/\s+/g, "-");
  };
  const getGenreUrl = (genre: string) => {
    if (metadataLinkTarget === "imdb") {
      const slug = getImdbGenreSlug(genre);
      return `https://www.imdb.com/search/title/?genres=${encodeURIComponent(slug)}`;
    }
    return getSearchUrl(`${genre} genre`);
  };
  const handleSearchClick = (query: string) => {
    const url = getSearchUrl(query);
    if (url) openLink(url);
  };
  const handleGenreClick = (genre: string) => {
    const url = getGenreUrl(genre);
    if (url) openLink(url);
  };
  const updatePosterTilt = (rect: DOMRect, clientX: number, clientY: number) => {
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    const tiltX = Math.max(-10, Math.min(10, -y * 16));
    const tiltY = Math.max(-12, Math.min(12, x * 18));
    const glow = Math.min(0.45, Math.hypot(x, y) * 0.8);
    setPosterTilt({ x: tiltX, y: tiltY, glow });
  };
  const handlePosterMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (posterOpen) return;
    const rect = posterRef.current?.getBoundingClientRect();
    if (!rect) return;
    updatePosterTilt(rect, event.clientX, event.clientY);
  };
  const handlePosterLeave = () => setPosterTilt({ x: 0, y: 0, glow: 0 });
  const openPoster = () => {
    const rect = posterRef.current?.getBoundingClientRect();
    if (!rect) return;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const maxW = viewportW * 0.85;
    const maxH = viewportH * 0.85;
    const aspect = rect.width / rect.height;
    let targetW = maxW;
    let targetH = targetW / aspect;
    if (targetH > maxH) {
      targetH = maxH;
      targetW = targetH * aspect;
    }
    const targetX = Math.round((viewportW - targetW) / 2);
    const targetY = Math.round((viewportH - targetH) / 2);
    const scale = targetW / rect.width;
    setPosterRect({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      targetX,
      targetY,
      scale
    });
    setPosterClosing(false);
    setPosterOpen(true);
    setPosterAnimating(false);
    setPosterHidden(true);
    setPosterTilt({ x: 0, y: 0, glow: 0 });
    requestAnimationFrame(() => {
      setPosterAnimating(true);
    });
  };
  const closePoster = () => {
    setPosterClosing(true);
    setPosterAnimating(false);
    window.setTimeout(() => {
      setPosterOpen(false);
      setPosterClosing(false);
      setPosterRect(null);
      setPosterHidden(false);
    }, 180);
  };

  const handleDragStart = (event: React.PointerEvent, id: string) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const card = cardRefs.current.get(id);
    if (card) {
      const rect = card.getBoundingClientRect();
      setDragOffset({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      setDragSize({ width: rect.width, height: rect.height });
      setDragPosition({ x: rect.left, y: rect.top });
    } else {
      setDragOffset({ x: 0, y: 0 });
      setDragSize(null);
      setDragPosition({ x: event.clientX, y: event.clientY });
    }
    setDraggingId(id);
    setDragOver(null);
    setDragOrder(detailCardOrder);
    dragOrderRef.current = detailCardOrder;
  };

  useEffect(() => {
    if (!draggingId) return;

    const handleMove = (event: PointerEvent) => {
      if (dragOffset) {
        setDragPosition({
          x: event.clientX - dragOffset.x,
          y: event.clientY - dragOffset.y,
        });
      }
      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const cardEl = element?.closest?.("[data-card-id]") as HTMLElement | null;
      if (!cardEl) {
        const container = cardsContainerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const inside =
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom;
          if (inside) {
            const base = dragOrderRef.current ?? detailCardOrder;
            const next = base.filter((cardId) => cardId !== draggingId);
            if (next.length) {
              const mid = rect.left + rect.width / 2;
              const column = event.clientX <= mid ? "left" : "right";
              const leftCards = next.filter((_, index) => index % 2 === 0);
              const rightCards = next.filter((_, index) => index % 2 === 1);
              const targetList = column === "left" ? leftCards : rightCards;
              const lastId = targetList[targetList.length - 1] ?? next[next.length - 1];
              setDragOver({ id: lastId, position: "after" });
              next.splice(next.length, 0, draggingId);
              dragOrderRef.current = next;
              setDragOrder(next);
              return;
            }
          }
        }
        setDragOver(null);
        return;
      }
      const overId = cardEl.dataset.cardId;
      if (!overId || overId === draggingId) {
        setDragOver(null);
        return;
      }
      const rect = cardEl.getBoundingClientRect();
      const isAfter = event.clientY - rect.top > rect.height / 2;
      setDragOver({ id: overId, position: isAfter ? "after" : "before" });
      setDragOrder((current) => {
        const base = current ?? detailCardOrder;
        const next = base.filter((cardId) => cardId !== draggingId);
        const targetIndex = next.indexOf(overId);
        const insertIndex = isAfter ? targetIndex + 1 : targetIndex;
        next.splice(insertIndex, 0, draggingId);
        dragOrderRef.current = next;
        return next;
      });
    };

    const handleUp = () => {
      if (dragOrderRef.current) {
        setDetailCardOrder(dragOrderRef.current);
      }
      setDraggingId(null);
      setDragOver(null);
      setDragOrder(null);
      dragOrderRef.current = null;
      setDragPosition(null);
      setDragOffset(null);
      setDragSize(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });

    return () => {
      window.removeEventListener("pointermove", handleMove);
    };
  }, [detailCardOrder, draggingId, dragOffset, setDetailCardOrder]);

  const cardHandle = (id: string) => (
    <button
      type="button"
      data-drag-handle="true"
      onPointerDown={(event) => handleDragStart(event, id)}
      className="group absolute left-1/2 top-2 -translate-x-1/2 cursor-grab rounded-full border border-transparent bg-transparent p-0.5 text-muted-foreground/50 transition hover:text-muted-foreground active:cursor-grabbing"
      aria-label="Reorder card"
    >
      <GripHorizontal className="h-3.5 w-3.5 opacity-60 transition group-hover:opacity-90" />
    </button>
  );

  const cardsById: Record<string, React.ReactNode> = {
    poster: (
      <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-[0_18px_32px_rgba(0,0,0,0.14)]">
        <CardHeader className="relative">
          {cardHandle("poster")}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">{detail.title}</h2>
              <div className="mt-2 flex flex-wrap gap-2 text-xs tracking-wide text-muted-foreground">
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs uppercase tracking-wide text-secondary-foreground">
                  <Film className="h-3.5 w-3.5" />
                  {detail.type}
                </div>
                {detail.year ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs tracking-wide text-secondary-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatYear(detail.year)}
                  </div>
                ) : null}
                {detail.runtime ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs uppercase tracking-wide text-secondary-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    {formatRuntime(detail.runtime)}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => openLink(trailerUrl(detail.title, detail.year))}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs tracking-wide text-secondary-foreground transition hover:bg-secondary/80"
                >
                  Trailers <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="flex justify-center mb-4 pb-3">
            <button
              ref={posterRef}
              onMouseMove={handlePosterMove}
              onMouseLeave={handlePosterLeave}
              className={cn(
                "block mx-auto h-[300px] w-[206px] overflow-hidden rounded-2xl bg-muted transition-transform duration-200 ease-out",
                posterHidden ? "opacity-0" : "opacity-100",
              )}
              style={{
                transform: `perspective(900px) rotateX(${posterTilt.x}deg) rotateY(${posterTilt.y}deg)`,
                transformStyle: "preserve-3d",
                boxShadow: `0 0px 30px rgba(0,0,0,0.1), 0 0 30px rgba(200,200,200,${posterTilt.glow})`,
              }}
              onClick={openPoster}
              type="button"
              aria-label="Open poster"
              disabled={posterOpen}
            >
              <div
                className="relative h-full w-full overflow-hidden rounded-2xl"
                style={{
                  transform: "scale(1)",
                  transformStyle: "preserve-3d",
                }}
              >
                {detail.posterUrl ? (
                  <img
                    src={detail.posterUrl}
                    alt={detail.title}
                    className="h-full w-full object-cover"
                    style={{ backfaceVisibility: "hidden" }}
                  />
                ) : null}
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow:
                      "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 35px rgba(0,0,0,0.35)",
                  }}
                  aria-hidden="true"
                />
              </div>
            </button>
          </div>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">Genres</p>
            <div className="flex flex-wrap gap-2">
                  {(detail.genres ?? []).length
                    ? detail.genres?.map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => handleGenreClick(genre)}
                          className="rounded-full bg-secondary px-3 py-1 text-xs tracking-wide text-secondary-foreground transition hover:bg-secondary/80"
                        >
                          {genre}
                        </button>
                      ))
                    : "—"}
                </div>
              </div>
        </CardContent>
      </Card>
    ),
    plot: (
      <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-[0_18px_32px_rgba(0,0,0,0.14)]">
        <CardHeader className="relative space-y-1">
          {cardHandle("plot")}
          <div className="text-sm font-semibold pb-4">Plot</div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p
            className="text-sm leading-relaxed text-foreground/90"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: plotExpanded ? "unset" : 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {detail.plot ?? "Plot unavailable."}
          </p>
          {detail.plot && detail.plot.length > 180 ? (
            <button
              type="button"
              onClick={() => setPlotExpanded((prev) => !prev)}
              className="text-xs font-semibold text-muted-foreground transition hover:text-foreground"
            >
              {plotExpanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </CardContent>
      </Card>
    ),
    ratings: (
      <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-[0_18px_32px_rgba(0,0,0,0.14)]">
        <CardHeader className="relative space-y-1">
          {cardHandle("ratings")}
          <div className="text-sm font-semibold pb-4">Ratings</div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!hasAnyRating ? (
            <div className="text-sm text-muted-foreground">No ratings available for this title yet.</div>
          ) : null}
          {imdbValue || detail.votes
            ? renderRatingSlider(
                <Button
                  variant="outline"
                  className="gap-2 border-transparent bg-[#E0C14A] p-0.5 pl-2 pr-2 text-black hover:bg-[#CFB13F]"
                  onClick={() => openLink(imdbUrl(detail.imdbId!))}
                  title="IMDb (Cmd/Ctrl+O)"
                  aria-keyshortcuts="Control+O Meta+O"
                >
                  IMDb
                </Button>,
                imdbValue ? `${imdbValue}/10` : null,
                parseImdbScore(imdbValue),
                "linear-gradient(90deg, rgba(224,193,74,0.85), rgba(178,150,43,0.95))",
                detail.votes ? `${formatVotes(detail.votes)} votes` : "No votes",
              )
            : null}
          {rottenValue
            ? renderRatingSlider(
                <Button
                  variant="outline"
                  className="gap-2 border-transparent bg-[#B53B40] p-0.5 pl-2 pr-2 text-white hover:bg-[#9C3236]"
                  onClick={() => openLink(rottenTomatoesUrl(detail.title))}
                >
                  Rotten Tomatoes
                </Button>,
                rottenValue,
                parsePercentScore(rottenValue),
                "linear-gradient(90deg, rgba(181,59,64,0.9), rgba(128,34,38,0.95))",
              )
            : null}
          {metacriticValue
            ? renderRatingSlider(
                <Button
                  variant="outline"
                  className="gap-2 border-transparent bg-[#1F1F1F] p-0.5 pl-2 pr-2 text-white hover:bg-[#141414]"
                  onClick={() => openLink(metacriticUrl(detail.title))}
                >
                  Metacritic
                </Button>,
                metacriticValue,
                parseMetacriticScore(metacriticValue),
                "linear-gradient(90deg, rgba(235,235,235,0.7), rgba(170,170,170,0.95))",
              )
            : null}
        </CardContent>
      </Card>
    ),
    people: (
      <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-[0_18px_32px_rgba(0,0,0,0.14)]">
        <CardHeader className="relative space-y-1">
          {cardHandle("people")}
          <div className="text-sm font-semibold pb-4">People</div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <p className="text-muted-foreground">Director</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.director ? (
                <button
                  type="button"
                  onClick={() => handleSearchClick(detail.director)}
                  className="rounded-full bg-secondary px-3 py-1 text-xs tracking-wide text-secondary-foreground transition hover:bg-secondary/80"
                >
                  {detail.director}
                </button>
              ) : (
                "—"
              )}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground">Cast</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.cast
                ? detail.cast
                    .split(",")
                    .slice(0, 6)
                    .map((name) => (
                      <button
                        key={name.trim()}
                        type="button"
                        onClick={() => handleSearchClick(name.trim())}
                        className="rounded-full bg-secondary px-3 py-1 text-xs tracking-wide text-secondary-foreground transition hover:bg-secondary/80"
                      >
                        {name.trim()}
                      </button>
                    ))
                : "—"}
            </div>
          </div>
        </CardContent>
      </Card>
    ),
  };

  const fallbackOrder = ["poster", "plot", "ratings", "people"];
  const activeOrder = dragOrder ?? detailCardOrder;
  const orderedCards = (activeOrder.length ? activeOrder : fallbackOrder)
    .map((id) => ({ id, node: cardsById[id] }))
    .filter((card) => card.node);
  const leftCards = orderedCards.filter((_, index) => index % 2 === 0);
  const rightCards = orderedCards.filter((_, index) => index % 2 === 1);

  return (
    <div className="px-5">
      <div className="mb-4" />

      <div className="space-y-6">
        <div
          ref={cardsContainerRef}
          className="flex flex-col gap-4 min-[650px]:flex-row min-[650px]:items-start"
        >
          <div ref={leftColumnRef} className="flex w-full flex-col gap-4 min-[650px]:w-1/2">
            {leftCards.map((card) => {
              const isDragOver = dragOver?.id === card.id;
              return (
                <div
                  key={card.id}
                  className={cn(
                    "transition-[transform,opacity] duration-200 ease-out",
                    isDragOver ? "ring-2 ring-accent/60 ring-offset-2 ring-offset-background" : "",
                    draggingId === card.id ? "opacity-0" : ""
                  )}
                  data-card-id={card.id}
                  ref={(node) => {
                    if (node) {
                      cardRefs.current.set(card.id, node);
                    } else {
                      cardRefs.current.delete(card.id);
                    }
                  }}
                >
                  {card.node}
                </div>
              );
            })}
          </div>
          <div ref={rightColumnRef} className="flex w-full flex-col gap-4 min-[650px]:w-1/2">
            {rightCards.map((card) => {
              const isDragOver = dragOver?.id === card.id;
              return (
                <div
                  key={card.id}
                  className={cn(
                    "transition-[transform,opacity] duration-200 ease-out",
                    isDragOver ? "ring-2 ring-accent/60 ring-offset-2 ring-offset-background" : "",
                    draggingId === card.id ? "opacity-0" : ""
                  )}
                  data-card-id={card.id}
                  ref={(node) => {
                    if (node) {
                      cardRefs.current.set(card.id, node);
                    } else {
                      cardRefs.current.delete(card.id);
                    }
                  }}
                >
                  {card.node}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 pt-2 pb-6">
          <div className="mx-auto w-full max-w-xl space-y-5">
            <Separator />
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Language</span>
                <span>{detail.language ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Country</span>
                <span>{detail.country ?? "—"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {draggingId && dragPosition ? (
        <div
          className="pointer-events-none fixed z-50"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            width: dragSize?.width,
            height: dragSize?.height,
          }}
          aria-hidden="true"
        >
          <div className="scale-[1.02] opacity-95 shadow-[0_30px_60px_rgba(0,0,0,0.35)]">
            {cardsById[draggingId]}
          </div>
        </div>
      ) : null}
      {posterOpen ? (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 transition-opacity duration-200 ease-out",
            posterClosing ? "opacity-0" : "opacity-100"
          )}
          onClick={closePoster}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute right-6 top-6 rounded-full border border-white/30 bg-black/40 p-2 text-white/80 transition hover:text-white"
            onClick={closePoster}
            aria-label="Close poster"
          >
            ×
          </button>
          {posterRect ? (
            <img
              ref={posterOverlayRef}
              src={detail.posterUrl ?? ""}
              alt={detail.title}
              className="fixed rounded-2xl shadow-[0_40px_80px_rgba(0,0,0,0.6)] transition-transform duration-300 ease-out"
              onClick={(event) => event.stopPropagation()}
              style={{
                width: `${posterRect.width}px`,
                height: `${posterRect.height}px`,
                left: `${posterRect.left}px`,
                top: `${posterRect.top}px`,
                transformOrigin: "top left",
                transform: posterAnimating
                  ? `translate(${posterRect.targetX - posterRect.left}px, ${posterRect.targetY - posterRect.top}px) scale(${posterRect.scale})`
                  : "translate(0, 0) scale(1)"
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
