# MediaPedia

MediaPedia is a keyboard-first, Raycast-style desktop overlay for Windows and macOS. Type a title and get fast, reliable film/TV metadata with progressive loading, local caching, and fallback sources when OMDb is missing fields.

![](https://imgur.com/a/JcQcUmZ)

<video width="320" height="240" controls>
  <source src="https://imgur.com/a/JcQcUmZ" type="video/mp4">
</video>

## Features
- Global hotkey to open the overlay and focus search
- Instant local results with ranked suggestions
- Detail view with poster, plot, cast/crew, genres, and ratings
- Trailers shortcut and external links
- Trending titles
- Light/dark themes
- Offline-friendly cache with background refreshes

## How it works
MediaPedia combines local cached results with live metadata:
- OMDb for core metadata and ratings where available
- TMDB for posters, backdrops, trending, and fallback details
- SQLite cache for speed and offline browsing

## Keyboard shortcuts
- Open app: Cmd/Ctrl+K
- Refresh details: Cmd/Ctrl+R
- Open preferred ratings provider: Cmd/Ctrl+O
- Open settings: Cmd/Ctrl+,
- Toggle shortcuts: ?

## Screenshots
Add screenshots or GIFs in this section to showcase the overlay, search results, and detail view.

## Stack
- Tauri v1
- React + TypeScript + Vite
- Tailwind + shadcn/ui components
- SQLite (tauri-plugin-sql)

## Requirements
- Node.js LTS (18.x)
- Rust toolchain (stable)
- Xcode CLI tools on macOS

## Quick start
```bash
npm install
npm run tauri dev
```

## Notes
- Ratings availability varies by title. Some shows and films may not have Rotten Tomatoes or Metacritic data in OMDb.
- External links open search pages for Rotten Tomatoes and Metacritic to handle inconsistent title URLs.
