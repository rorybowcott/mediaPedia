import { useRef, useState } from "react";
import { ExternalLink, Calendar, Clock3, Film } from "lucide-react";
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
  const posterRef = useRef<HTMLDivElement>(null);
  const posterOverlayRef = useRef<HTMLImageElement>(null);
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

  return (
    <div className="px-5">
      <div className="mb-4" />

      <div className="grid gap-4 min-[650px]:grid-cols-2">
        <div className="space-y-4 min-[650px]:col-span-1">
          <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-lg">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">{detail.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Badge
                      variant="secondary"
                      className="inline-flex items-center gap-2 rounded-full px-3"
                    >
                      <Film className="h-3.5 w-3.5" />
                      {detail.type}
                    </Badge>
                    {detail.year ? (
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-2 rounded-full px-3"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        {formatYear(detail.year)}
                      </Badge>
                    ) : null}
                    {detail.runtime ? (
                      <Badge
                        variant="secondary"
                        className="inline-flex items-center gap-2 rounded-full px-3"
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatRuntime(detail.runtime)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="border-transparent gap-2 p-0.5 pl-2 pr-2"
                  onClick={() =>
                    openLink(trailerUrl(detail.title, detail.year))
                  }
                >
                  Trailers <ExternalLink className="h-4 w-4" />
                </Button>
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
                    posterHidden ? "opacity-0" : "opacity-100"
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
                        <Badge
                          key={genre}
                          variant="secondary"
                          className="rounded-full px-3 py-1"
                        >
                          {genre}
                        </Badge>
                      ))
                    : "—"}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-lg">
            <CardHeader>
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
        </div>

        <div className="space-y-4 min-[650px]:col-span-1">
          <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-lg">
            <CardHeader>
              <div className="text-sm font-semibold pb-4">Ratings</div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {renderRatingSlider(
                <Button
                  variant="outline"
                  className="gap-2 border-transparent bg-[#E0C14A] p-0.5 pl-2 pr-2 text-black hover:bg-[#CFB13F]"
                  onClick={() => openLink(imdbUrl(detail.imdbId!))}
                  title="IMDb (Cmd/Ctrl+O)"
                  aria-keyshortcuts="Control+O Meta+O"
                >
                  IMDb
                </Button>,
                detail.rating ? `${detail.rating}/10` : null,
                parseImdbScore(detail.rating),
                "linear-gradient(90deg, rgba(224,193,74,0.85), rgba(178,150,43,0.95))",
                detail.votes
                  ? `${formatVotes(detail.votes)} votes`
                  : "No votes",
              )}
              {renderRatingSlider(
                <Button
                  variant="outline"
                  className="gap-2 border-transparent bg-[#B53B40] p-0.5 pl-2 pr-2 text-white hover:bg-[#9C3236]"
                  onClick={() => openLink(rottenTomatoesUrl(detail.title))}
                >
                  Rotten Tomatoes
                </Button>,
                detail.rottenTomatoesScore ??
                  getOmdbRating("Rotten Tomatoes") ??
                  null,
                parsePercentScore(
                  detail.rottenTomatoesScore ??
                    getOmdbRating("Rotten Tomatoes"),
                ),
                "linear-gradient(90deg, rgba(181,59,64,0.9), rgba(128,34,38,0.95))",
                undefined,
                "No info",
              )}
              {renderRatingSlider(
                <Button
                  variant="outline"
                  className="gap-2 border-transparent bg-[#1F1F1F] p-0.5 pl-2 pr-2 text-white hover:bg-[#141414]"
                  onClick={() => openLink(metacriticUrl(detail.title))}
                >
                  Metacritic
                </Button>,
                detail.metacriticScore ?? getOmdbRating("Metacritic") ?? null,
                parseMetacriticScore(
                  detail.metacriticScore ?? getOmdbRating("Metacritic"),
                ),
                "linear-gradient(90deg, rgba(235,235,235,0.7), rgba(170,170,170,0.95))",
                undefined,
                "No info",
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-[linear-gradient(180deg,var(--card-gradient-top),var(--card-gradient-bottom))] shadow-lg">
            <CardHeader>
              <div className="text-sm font-semibold pb-4">People</div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Director</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.director ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full px-3 py-1"
                    >
                      {detail.director}
                    </Badge>
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
                          <Badge
                            key={name.trim()}
                            variant="secondary"
                            className="rounded-full px-3 py-1"
                          >
                            {name.trim()}
                          </Badge>
                        ))
                    : "—"}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="min-[650px]:col-span-2 space-y-5 pt-8 pb-6">
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
                  ? `translate(${posterRect.targetX - posterRect.left}px, ${posterRect.targetY - posterRect.top}px) scale(${posterRect.scale}) rotateX(${posterTilt.x}deg) rotateY(${posterTilt.y}deg)`
                  : "translate(0, 0) scale(1)"
              }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
