# 個人開発のすゝめ — Design System

> *「コードを書き、思考を記録し、日々を綴る」*
> A personal-development journal site — by [machaniconico](https://github.com/machaniconico).

A small, calm, slate-and-blue personal site built on Astro. Three content sections sit behind one hero: **Works** (shipped apps), **Blog** (technical/dev journal), and **Diary** (日常の日記 — everyday notes, in Japanese).

This design system extracts the brand's tokens, voice, and UI patterns so a design agent can produce faithful new pages, slides and mocks without having to re-derive them from source each time.

---

## Sources

Everything here was derived from the single upstream repo:

- **Codebase:** [`machaniconico/astro-blog`](https://github.com/machaniconico/astro-blog) @ `main`
  - `src/styles/global.css` — color tokens, type scale, element resets
  - `src/pages/index.astro` — hero + nav-card grid (most visual vocabulary lives here)
  - `src/pages/{blog,diary,works}/index.astro` — list pages (each product surface)
  - `src/pages/diary/[...slug].astro`, `src/layouts/BlogPost.astro` — post reading view
  - `src/components/Header.astro`, `Footer.astro`, `HeaderLink.astro`, `BaseHead.astro`
  - `src/consts.ts` — site title + description (`SITE_TITLE = '個人開発のすゝめ'`)
  - `public/admin/config.yml` — content model (blog / diary / works collections, Japanese labels)
  - `public/fonts/atkinson-*.woff` — Atkinson Hyperlegible (imported)
  - `src/assets/blog-placeholder-*.jpg` — editorial hero imagery (imported)

No Figma was provided, no slide decks were provided — the system is codebase-derived.

---

## Product surface

The site is a single product with three content collections, not multiple apps:

| Route   | Content collection | Label (ja)         | Role                                              |
| ------- | ------------------ | ------------------ | ------------------------------------------------- |
| `/`     | —                  | 個人開発のすゝめ   | Hero + three navigation cards                     |
| `/works`| `works`            | 成果物置き場       | Portfolio grid of shipped apps (techStack, links) |
| `/blog` | `blog`             | 開発記録の日記     | Editorial: magazine-style feed with hero images   |
| `/diary`| `diary`            | 日常の日記         | Single-column daily entries with tags             |

One UI kit covers all of it (`ui_kits/blog/`).

---

## Content fundamentals

**Language:** Primarily **Japanese body copy** paired with short **English eyebrows/labels** for visual rhythm (e.g. `Personal Dev Journal` above `個人開発の{すゝめ}`, `Dev Journal` above `開発記録の日記`, `Daily Life` above `日常の日記`). The English line is always a small uppercase eyebrow in accent blue — it names a category, it never carries meaning on its own.

**Voice:** First-person, earnest, a little weary-of-corporate-life. The diary entry reads like a personal letter — self-introduction with hobbies, a nod to leaving a salaryman life, and a polite closing ask for support. No hype, no growth-hack tone.

**Point of view:** `私` / self-referential when the author speaks; second person is rare. Readers are addressed implicitly through polite form (`〜ます` / `〜です`).

**Register:** Polite-casual (丁寧語). Technical words stay in English inside Japanese sentences (`Web App`, `CLI Tool`, `OSS`, `Markdown`, `GitHub`). Site-meta uses English title case (`Live Demo`, `GitHub`, `Home · Works · Blog · Diary`).

**Typography quirk:** The wordmark `個人開発のすゝめ` uses the historical iteration mark `ゝ` instead of plain `め` — preserve it. Don't "modernize" to `すすめ`.

**Casing:** English eyebrows are **Title Case** (`Personal Dev Journal`, `Dev Journal`, `Daily Life`, `Portfolio`). Uppercase tracking is applied via CSS, not by writing all-caps source.

**Emoji:** Essentially none. The repo's top-level README has a couple of status emoji (✅), but the site itself uses zero. **Default to no emoji.** Icons are inline SVGs on a 24px grid.

**Punctuation:** Japanese full-width punctuation inside Japanese sentences (`。` `、`). A bullet (`・`) for inline lists. `—` for em-dash in English lines.

**Example phrases (lift these; don't invent new ones):**
- Hero description: 「コードを書き、思考を記録し、日々を綴る。アイデアを形にする過程を、ここに残していく。」
- Works description: 「これまでに作ったWebアプリ、ツール、OSSプロジェクトを紹介します。」
- Blog description: 「技術メモ、学習記録、開発日誌。試行錯誤の軌跡をMarkdownで残していく。」
- Diary description: 「日々の気づき、思考の断片、日常の出来事。技術とは関係なく、ただ言葉を残したい日のために。」
- Works card tags: `Web App`, `CLI Tool`, `OSS`
- CTA verbs: 「制作物を見る」「記事を読む」「日記を見る」「続きを読む」

---

## Visual foundations

**Aesthetic in one line:** *Quiet slate-and-white editorial surface, single blue accent, soft blurred chrome, generous whitespace — like a blog engine that grew up.*

### Color

One accent, one neutral ramp, plus one **highlight-only** warm.

- **Primary accent** — `#2563eb` (blue-600). Used for: eyebrows, links, `.btn-primary` fill, icon chips, tag tint, title-accent gradient origin, focus/hover borders.
- **Accent hover** — `#1d4ed8` (blue-700). Only as the `:hover` state of the primary button.
- **Gradient companion** — `#7c3aed` (violet-600). Appears in **exactly one place**: the hero title's accent word has `linear-gradient(135deg, #2563eb, #7c3aed)` clipped to text. Don't spread this gradient onto buttons, cards, or backgrounds.
- **Warm accent (secondary, highlight-only)** — `#f97316` (orange-500), hover `#ea580c` (orange-600). Added as a deliberate differentiator for **"now / new / outbound" moments only**. Allowed uses: Works `Live Demo` CTA fill, `新着` / `Today` badge, diary "today" dot. **Not allowed:** links, navigation, body accents, section backgrounds, eyebrows, or as a general "secondary" color. Blue remains the default accent. If a design needs a warm highlight twice on the same screen, reconsider — one warm hit per view is the target.
- **Neutrals** — a slate ramp: `#0f172a` (text-primary) → `#475569` (secondary) → `#94a3b8` (muted) → `#f1f5f9` (secondary bg) → `#ffffff` (page).
- **Body background wash** — 4-point radial mesh covering the full brand palette: blue at top-left (12%) and bottom-left (8%), warm orange at top-right (10%), violet at bottom-right (10%). Visibly tinted but not overpowering. `background-attachment: fixed`.
- **Tints** — all accent tints are rgba versions of `#2563eb` at 6%, 7%, 12%, 15%. Don't introduce new tint stops.
- **Semantic colors (error/warn/success):** the codebase defines none. If needed, stay inside the slate ramp or derive from the accent; don't introduce red/green/amber without flagging it.

### Type

- **Only family:** `Atkinson` (Atkinson Hyperlegible), `.woff` regular + bold, loaded from `fonts/`. Fallback chain includes Hiragino / Yu Gothic / Meiryo for Japanese glyphs.
- **Scale** — Major-third (1.25×) from a 20px base: 20 → 25 → 31 → 39 → 49 → 61 (H5 → H1). See `colors_and_type.css` `--fs-*` vars.
- **Weights used:** 400 regular, 600 semibold (eyebrows, section labels, tags), 700 bold (headings, card titles, strong), 800 black (hero + page titles only).
- **Tracking:** `-0.03em` on big titles, `-0.02em` on the site wordmark, `+0.20em` / `+0.18em` uppercase tracking on eyebrows and section labels.
- **Line-height:** 1.1 hero, 1.2 headings, 1.3 card titles, 1.7 body, 1.8 hero description.
- **Hero pattern** — the hero title uses `clamp(2.5em, 7vw, 4.5em)` so the headline fluidly resizes; don't hard-code px.
- **Font note:** Atkinson Hyperlegible is an accessibility-focused face originally from the Braille Institute. It's warm and slightly humanist — don't swap it for Inter or system sans.

### Spacing

Em-scale: 0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 2.5 / 3 / 4 / 5 em. Tokens in `--space-*`. Page gutters are `1.5em`; sections are padded top/bottom in `3–5em`; cards are `1.75em` internal.

### Layout widths

- Prose article: **720px** centered with `calc(100% - 2em)` cap.
- Diary list: **760px** (narrower, more letter-like).
- Home / list pages: **1000px** max, **1.5em** side gutters.

### Backgrounds

- **No full-bleed photography** on chrome — hero imagery only appears on blog post cards and the BlogPost layout's top image.
- **No repeating patterns / textures / noise.**
- **Body has the faint two-radial wash** (above).
- **Hero ornament** is decorative SVG: three concentric 1px circular rings at 5–15% opacity plus a single 8px dot with a soft glow. The Home hero uses the **warm accent** (`#f97316`) for both rings and dot as the single sanctioned warm-highlight on that page. Other hero treatments stay on the accent blue. That's the entire visual flourish budget — use it sparingly.

### Imagery

Five `blog-placeholder-*.jpg` photos from the repo. Editorial, daylight, warm-neutral — not grainy, not duotoned, not b&w. Always displayed with `border-radius: 12px` and a soft shadow stack.

### Cards

- Radius `16px` (`--radius-2xl`).
- Fill `--bg-card` (#ffffff); border `1px solid rgba(0,0,0,0.08)`.
- Internal padding `1.75em`.
- Hover: border becomes `rgba(37,99,235,0.4)`, translate `-2px` or `-3px`, shadow `0 12px 40px rgba(0,0,0,0.1)`, an optional `0 0 0 1px rgba(37,99,235,0.1)` accent ring.
- Nav cards also have a `::before` pseudo that fades in a `linear-gradient(135deg, rgba(37,99,235,0.03), transparent 60%)` on hover — subtle blue tint from the top-left.

### Buttons

Two variants only:
- **Primary** — `--accent` fill, white text, `--radius-md` (8px), `0.65em 1.5em` padding, `--shadow-glow-primary`. Hover: darker blue, stronger glow, `-1px` lift.
- **Secondary** — transparent, `--text-secondary` label, `1px` neutral border. Hover: border and label flip to accent, background becomes `rgba(37,99,235,0.05)`.

### Tags / badges

`border-radius: 20px` pill, `0.25em 0.65em` padding, `0.7em` font, accent tint 6% fill, 12–15% accent border. Muted label for nav-card tags; accent-colored label for `.tech-badge` on Works.

### Icon chips

Square with rounded corners (`--radius-lg` 10 or `--radius-xl` 12 depending on size). 42–52px. Accent-tint-07 background, accent-tint-15 border, accent-colored SVG stroke icon inside.

### Borders & dividers

`1px solid rgba(0,0,0,0.08)` — the only border value used on chrome. Page-header blocks end with this as a bottom border; `<hr>` uses the same color as `border-top`.

### Shadows

Three tiers, all soft and downward:
- `--shadow-sm` — barely visible, for resting cards (actually the codebase leaves cards with no shadow at rest).
- `--shadow-md` — `0 8px 30px rgba(0,0,0,0.1)` for diary card hover.
- `--shadow-lg` — `0 12px 40px rgba(0,0,0,0.1)` for nav/work card hover.
- `--shadow-stack` — multi-layer shadow on hero article images.
- `--shadow-glow-primary` — the one "glow" used on the primary button.

No inner shadows. No colored shadows except the blue button glow.

### Motion

- Default transition: `0.2s–0.25s ease` on `all` or specific properties. No springs, no bounces.
- Hover lifts: `translateY(-1px)` (button), `-2px` (entry card), `-3px` (nav / work card).
- Card arrows slide `translateX(4px)` on hover; diary read-more expands its `gap`.
- No keyframe animations in the codebase. Don't add Lottie, SVG morph, or parallax.

### Transparency & blur

Used sparingly for chrome:
- Header: `background: rgba(255,255,255,0.92)` with `backdrop-filter: blur(12px)`, sticky, bottom border.
- Footer: `background: rgba(248,250,252,0.95)`, solid-ish, top border.
- Cards and buttons are fully opaque.

### Corner radii

4 (inline code) · 8 (buttons, pre, images) · 10 (small icon chip) · 12 (medium icon chip, hero images, hero-image layout) · 16 (all cards) · 20 (pill tags).

### Active / focus states

The repo ships no explicit `:focus-visible` ring — add one if implementing: `outline: 2px solid var(--accent); outline-offset: 2px`.

### Dark mode

Not shipped. The `global.css` header says `Light theme` explicitly. If asked for dark, flag it as an extension of the system, not a built-in.

---

## Iconography

- **Library:** Inline SVGs, hand-written in markup (not a font, not a sprite, not an external package). Every icon in the codebase matches **Lucide Icons** — same 24×24 viewbox, same 2px stroke, `round` linecaps and joins.
- **Practical rule:** Use [Lucide](https://lucide.dev/) as the source for any new icon. Paste the SVG inline; don't load a font or a runtime.
- **Sizes observed:** 14px (link affordance inside small labels), 20px (card arrow), 22px (work icon chip), 28px (nav card icon, social link).
- **Stroke:** `stroke-width="2"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, `fill="none"`, `stroke="currentColor"`. Color is inherited — icon chips color their contents with `color: var(--accent)`.
- **Logos / marks:**
  - `assets/favicon.svg` — the site's favicon (imported from `public/favicon.svg`).
  - `assets/favicon.ico` — legacy fallback.
  - There is **no separate brand wordmark image**. The wordmark is text: `個人開発のすゝめ` set in Atkinson Bold at the type-scale body size, `letter-spacing: -0.02em`, `color: #0f172a`, linking to `/`.
- **GitHub glyph** — a custom inline SVG (not Lucide) used in Header and Footer social slot. 16px viewBox, filled path. Imported logo kept verbatim in `ui_kits/blog/components/Header.jsx`.
- **Emoji / unicode:** Not used as iconography. The diary copy contains a single emoji (`！`) that is actually full-width punctuation, not decoration.
- **Note on substitutions:** Where a needed icon doesn't exist inline in the repo, copy the matching one from Lucide — it's a zero-cost match for the existing style.

---

## Typography substitutions

**Atkinson Hyperlegible** is shipped as `.woff` from the repo and is already in `fonts/`. No substitution needed.

If you ever need to render this brand without the woff files available, the nearest Google Fonts match is **"Atkinson Hyperlegible"** (available directly on Google Fonts). Second-choice fallback: **"Nunito Sans"** at 400/700 — warm, humanist, similar x-height. **Flag any substitution to the user.**

---

## Index (manifest)

### Root
- `README.md` — this file
- `SKILL.md` — cross-compatible skill entry for Claude Code
- `colors_and_type.css` — all tokens + semantic classes
- `fonts/` — Atkinson Hyperlegible (regular + bold `.woff`)
- `assets/` — favicon + five editorial placeholder photos
- `preview/` — design-system card HTMLs (registered in the Design System tab)
- `ui_kits/blog/` — the one UI kit (the only product)

### UI kits
- `ui_kits/blog/index.html` — interactive click-thru across Home, Works, Blog, Diary, and a Blog post reading view
- `ui_kits/blog/app.jsx` — React entry + router
- `ui_kits/blog/components/*.jsx` — Header, Footer, HeroNavCards, WorksGrid, BlogFeed, DiaryList, Post, Button, Tag, Eyebrow, IconChip, FormattedDate, icons

### Preview cards (`preview/`)
See the Design System tab — each card is registered with a section group (`Colors`, `Type`, `Spacing`, `Components`, `Brand`).
