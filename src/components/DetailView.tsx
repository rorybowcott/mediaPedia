import { ArrowLeft, ExternalLink, Calendar, Clock3, Star } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { formatRuntime, formatYear } from "../lib/utils";
import { imdbUrl, metacriticUrl, rottenTomatoesUrl, trailerUrl, wikipediaUrl } from "../lib/links";
import { open } from "@tauri-apps/plugin-shell";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "../store/useAppStore";

const appWindow = getCurrentWindow();

export function DetailView() {
  const detail = useAppStore((state) => state.detail);
  const detailLoading = useAppStore((state) => state.detailLoading);
  const backToList = useAppStore((state) => state.backToList);
  const formatVotes = (value?: number | null) =>
    typeof value === "number" ? new Intl.NumberFormat().format(value) : "—";
  const getOmdbRating = (source: string) =>
    detail?.omdbRatings?.find((rating) => rating.source === source)?.value ?? null;

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
      <div className="px-5 py-6 text-sm text-muted-foreground">Select a title to view details.</div>
    );
  }

  const openLink = async (url: string) => {
    await open(url);
    await appWindow.hide();
  };

  return (
    <div className="px-5 py-4">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={backToList} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {detail.imdbId ? (
            <Button variant="outline" size="sm" className="gap-2 p-0.5 pl-2 pr-2" onClick={() => openLink(imdbUrl(detail.imdbId!))}>
              IMDb
            </Button>
          ) : null}
          <Button variant="outline" size="sm" className="gap-2 p-0.5 pl-2 pr-2" onClick={() => openLink(rottenTomatoesUrl(detail.title))}>
            Rotten Tomatoes
          </Button>
          <Button variant="outline" size="sm" className="gap-2 p-0.5 pl-2 pr-2" onClick={() => openLink(metacriticUrl(detail.title))}>
            Metacritic
          </Button>
          <Button variant="outline" size="sm" className="gap-2 p-0.5 pl-2 pr-2" onClick={() => openLink(wikipediaUrl(detail.title, detail.year))}>
            Wikipedia
          </Button>
          <Button variant="outline" size="sm" className="gap-2 p-0.5 pl-2 pr-2" onClick={() => openLink(trailerUrl(detail.title, detail.year))}>
            Trailer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 min-[650px]:grid-cols-2">
        <div className="space-y-4 min-[650px]:col-span-1">
          <Card className="border-border/70 bg-card/60 shadow-lg">
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="mx-auto h-[320px] w-[220px] overflow-hidden rounded-2xl bg-muted shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                {detail.posterUrl ? (
                  <img src={detail.posterUrl} alt={detail.title} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <Separator />
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Genres</p>
                <div className="flex flex-wrap gap-2">
                  {(detail.genres ?? []).length
                    ? detail.genres?.map((genre) => (
                        <Badge key={genre} variant="secondary" className="rounded-full px-3 py-1">
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
          <Card className="border-border/70 bg-card/60 shadow-lg">
            <CardHeader>
              <div className="text-sm font-semibold pb-4">Key Stats</div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Clock3 className="h-4 w-4" /> Runtime
                </div>
                <div className="mt-2 text-lg font-semibold">{formatRuntime(detail.runtime)}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Calendar className="h-4 w-4" /> Released
                </div>
                <div className="mt-2 text-lg font-semibold">{formatYear(detail.year)}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                  <Star className="h-4 w-4" /> IMDb Rating
                </div>
                <div className="mt-2 text-lg font-semibold">{detail.rating ?? "—"}</div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="text-xs uppercase text-muted-foreground">IMDb Votes</div>
                <div className="mt-2 text-lg font-semibold">{formatVotes(detail.votes)}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60 shadow-lg">
            <CardHeader>
              <div className="text-sm font-semibold pb-4">Ratings</div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                <p className="text-muted-foreground">Internet Movie Database</p>
                <div className="mt-1 flex items-center justify-between">
                  <span>IMDb</span>
                  <span className="font-semibold">{detail.rating ? `${detail.rating}/10` : "—"}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                <p className="text-muted-foreground">Rotten Tomatoes</p>
                <div className="mt-1 flex items-center justify-between">
                  <span>Critic Score</span>
                  <span className="font-semibold">
                    {detail.rottenTomatoesScore ?? getOmdbRating("Rotten Tomatoes") ?? "—"}
                  </span>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background/40 p-3">
                <p className="text-muted-foreground">Metacritic</p>
                <div className="mt-1 flex items-center justify-between">
                  <span>Metascore</span>
                  <span className="font-semibold">
                    {detail.metacriticScore ?? getOmdbRating("Metacritic") ?? "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/60 shadow-lg">
            <CardHeader>
              <div className="text-sm font-semibold pb-4">People</div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Director</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {detail.director ? (
                    <Badge variant="secondary" className="rounded-full px-3 py-1">
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
                    ? detail.cast.split(",").slice(0, 6).map((name) => (
                        <Badge key={name.trim()} variant="secondary" className="rounded-full px-3 py-1">
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
          <Card className="border-border/70 bg-card/60 shadow-lg">
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
                <span className="font-mono text-xs">{detail.imdbId ?? "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
