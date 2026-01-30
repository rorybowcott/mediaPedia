export function imdbUrl(imdbId: string) {
  return `https://www.imdb.com/title/${encodeURIComponent(imdbId)}/`;
}

export function wikipediaUrl(title: string, year?: string | null) {
  const query = `${title}${year ? ` (${year})` : ""}`;
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
}

export function rottenTomatoesUrl(title: string) {
  return `https://www.rottentomatoes.com/search?search=${encodeURIComponent(title)}`;
}

export function metacriticUrl(title: string) {
  return `https://www.metacritic.com/search/${encodeURIComponent(title)}/`;
}

export function trailerUrl(title: string, year?: string | null) {
  const query = `${title}${year ? ` ${year}` : ""} official trailer`;
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
