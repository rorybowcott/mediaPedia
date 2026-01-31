import { useRef, useState } from "react";
import { ExternalLink, Calendar, Clock3, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { formatRuntime, formatYear } from "../lib/utils";
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
  const [posterTilt, setPosterTilt] = useState({ x: 0, y: 0, glow: 0 });
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
  ) => (
    <div className="rounded-xl border border-border/70 bg-[rgba(255,255,255,0.03)] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between text-xs uppercase text-muted-foreground">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <span className="text-sm font-semibold text-foreground">
          {value ?? "—"}
        </span>
      </div>
      <div className="mt-3 h-3.5 rounded-full bg-black/30 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-white/20 via-white/30 to-white/45 shadow-[0_6px_16px_rgba(0,0,0,0.35)]"
          style={{ width: `${Math.round((ratio ?? 0) * 100)}%` }}
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
  const handlePosterMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = posterRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    const tiltX = Math.max(-10, Math.min(10, -y * 16));
    const tiltY = Math.max(-12, Math.min(12, x * 18));
    const glow = Math.min(0.45, Math.hypot(x, y) * 0.8);
    setPosterTilt({ x: tiltX, y: tiltY, glow });
  };
  const handlePosterLeave = () => setPosterTilt({ x: 0, y: 0, glow: 0 });

  return (
    <div className="px-5">
      <div className="mb-4" />

      <div className="grid gap-4 min-[650px]:grid-cols-2">
        <div className="space-y-4 min-[650px]:col-span-1">
          <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.16))] shadow-lg">
            <CardHeader className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold">{detail.title}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                    <Badge variant="secondary" className="rounded-full px-3">
                      {detail.type}
                    </Badge>
                    {detail.year ? (
                      <Badge variant="secondary" className="rounded-full px-3">
                        {formatYear(detail.year)}
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
            <CardContent className="space-y-4 pt-4">
              <div
                ref={posterRef}
                onMouseMove={handlePosterMove}
                onMouseLeave={handlePosterLeave}
                className="mx-auto h-[320px] w-[220px] overflow-hidden rounded-2xl bg-muted transition-transform duration-200 ease-out"
                style={{
                  transform: `perspective(900px) rotateX(${posterTilt.x}deg) rotateY(${posterTilt.y}deg)`,
                  transformStyle: "preserve-3d",
                  boxShadow: `0 20px 50px rgba(0,0,0,0.35), 0 0 30px rgba(200,200,200,${posterTilt.glow})`
                }}
              >
                <div
                  className="relative h-full w-full overflow-hidden rounded-2xl"
                  style={{ transform: "scale(1)", transformStyle: "preserve-3d" }}
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
                      boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 0 35px rgba(0,0,0,0.35)"
                    }}
                    aria-hidden="true"
                  />
                </div>
              </div>
              <Separator />
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
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Plot</p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {detail.plot ?? "Plot unavailable."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 min-[650px]:col-span-1">
          <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.22))] shadow-lg">
            <CardHeader>
              <div className="text-sm font-semibold pb-4">Key Stats</div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Clock3 className="h-4 w-4" /> Runtime
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {formatRuntime(detail.runtime)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Released
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {formatYear(detail.year)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Star className="h-4 w-4" /> IMDb Rating
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {detail.rating ?? "—"}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-[rgba(255,255,255,0.03)] p-4 shadow-[0_8px_18px_rgba(0,0,0,0.3)]">
                <div className="text-xs uppercase text-muted-foreground">
                  IMDb Votes
                </div>
                <div className="mt-2 text-lg font-semibold">
                  {formatVotes(detail.votes)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.22))] shadow-lg">
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
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.22))] shadow-lg">
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

        <div className="min-[650px]:col-span-2">
          <Card className="border-border/70 bg-card/60 mb-5 shadow-lg">
            <CardHeader>
              <div className="text-sm font-semibold pb-4">Metadata</div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Language</span>
                <span>{detail.language ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Country</span>
                <span>{detail.country ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">IMDb ID</span>
                <span className="font-mono text-xs">
                  {detail.imdbId ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
