import type { ParsedQuery, SearchOperatorFilters, TitleType } from "./types";

const typeValues: Record<string, TitleType> = {
  movie: "movie",
  series: "series",
  documentary: "documentary"
};

function tokenize(input: string) {
  const tokens: string[] = [];
  let current = "";
  let inQuote = false;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (char === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && char === " ") {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

export function parseQuery(input: string): ParsedQuery {
  const tokens = tokenize(input.trim());
  const filters: SearchOperatorFilters = {};
  const free: string[] = [];

  tokens.forEach((token) => {
    const [rawKey, rawValue] = token.split(":");
    if (!rawValue) {
      free.push(token);
      return;
    }
    const key = rawKey.toLowerCase();
    const value = rawValue.toLowerCase();

    if (key === "type" && typeValues[value]) {
      filters.type = typeValues[value];
      return;
    }

    if (key === "year") {
      if (value.includes("-")) {
        const [start, end] = value.split("-").map((part) => parseInt(part, 10));
        if (!Number.isNaN(start) && !Number.isNaN(end)) {
          filters.yearRange = { start, end };
          return;
        }
      }
      const yearExact = parseInt(value, 10);
      if (!Number.isNaN(yearExact)) {
        filters.yearExact = yearExact;
        return;
      }
    }

    if (key === "country") {
      filters.country = value;
      return;
    }

    if (key === "lang") {
      filters.lang = value;
      return;
    }

    free.push(token);
  });

  return {
    freeText: free.join(" ").trim(),
    filters
  };
}
