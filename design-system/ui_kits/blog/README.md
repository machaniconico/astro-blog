# Blog UI kit — 個人開発のすゝめ

The single product surface. An Astro site with four routes and one shared chrome:

- **Home** (`/`) — hero + 3 nav cards linking to Works, Blog, Diary
- **Works** (`/works`) — portfolio grid of shipped apps
- **Blog** (`/blog`) — editorial feed with hero imagery
- **Diary** (`/diary`) — single-column daily entries
- **Post** (`/blog/[slug]`, `/diary/[slug]`) — reading view

## Files

- `index.html` — React entry; interactive click-thru across all surfaces
- `app.jsx` — app shell + hash-router + seed data
- `components/*.jsx` — one component per concept

## Verified fidelity points

All values pulled directly from `src/styles/global.css` and `src/pages/*.astro` in the upstream repo — tokens, spacings, shadows, hover offsets, the hero ring ornament, the iterating `すゝめ` wordmark, the Lucide icon set. Pages are implemented as cosmetic React — data is seeded, links route via hash.
