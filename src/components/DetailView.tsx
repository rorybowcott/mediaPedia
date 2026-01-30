import { ArrowLeft, ExternalLink, RefreshCcw } from "lucide-react";
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
  const refreshDetails = useAppStore((state) => state.refreshDetails);

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
      <div className="mb-3 flex items-center justify-between">
        <Button variant="ghost" onClick={backToList} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="ghost" onClick={() => refreshDetails(detail.id)} className="gap-2">
          <RefreshCcw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-semibold">{detail.title}</h2>
              <p className="text-sm text-muted-foreground">
                {formatYear(detail.year)} • {detail.type} {detail.runtime ? `• ${formatRuntime(detail.runtime)}` : ""}
              </p>
            </div>
            {detail.rating ? <Badge>IMDb {detail.rating}</Badge> : null}
          </div>
          {detail.fallbackLabel ? (
            <p className="text-xs text-amber-400">{detail.fallbackLabel}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="h-44 w-32 overflow-hidden rounded-lg bg-muted">
              {detail.posterUrl ? (
                <img src={detail.posterUrl} alt={detail.title} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1 space-y-2 text-sm">
              <p className="text-muted-foreground">Genres: {detail.genres?.join(", ") ?? "—"}</p>
              <p className="text-muted-foreground">Director: {detail.director ?? "—"}</p>
              <p className="text-muted-foreground">Cast: {detail.cast ?? "—"}</p>
              <p className="text-muted-foreground">Country: {detail.country ?? "—"}</p>
              <p className="text-muted-foreground">Language: {detail.language ?? "—"}</p>
            </div>
          </div>
          <Separator />
          <p className="text-sm leading-relaxed text-foreground/90">{detail.plot ?? "Plot unavailable."}</p>
          <Separator />
          <div className="flex flex-wrap gap-2">
            {detail.imdbId ? (
              <Button variant="outline" className="gap-2" onClick={() => openLink(imdbUrl(detail.imdbId!))}>
                IMDb <ExternalLink className="h-3 w-3" />
              </Button>
            ) : null}
            <Button variant="outline" className="gap-2" onClick={() => openLink(rottenTomatoesUrl(detail.title))}>
              Rotten Tomatoes <ExternalLink className="h-3 w-3" />
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => openLink(metacriticUrl(detail.title))}>
              Metacritic <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => openLink(wikipediaUrl(detail.title, detail.year))}
            >
              Wikipedia <ExternalLink className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => openLink(trailerUrl(detail.title, detail.year))}
            >
              Trailer <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
