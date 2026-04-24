---
name: kojin-kaihatsu-design
description: Use this skill to generate well-branded interfaces and assets for 個人開発のすゝめ (machaniconico's personal-development journal), either for production or throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping a calm slate-and-blue Astro-style blog with Japanese/English bilingual copy.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

- `colors_and_type.css` — CSS variables for color, type scale, fonts, radii, shadows, spacing. Import before doing anything visual.
- `fonts/` — Atkinson Hyperlegible (body) + IBM Plex Mono (code). The brand uses system `-apple-system / Hiragino Kaku Gothic ProN` for Japanese.
- `assets/` — favicon (SVG), blog hero placeholder photos. No raster logo exists upstream; the wordmark `個人開発のすゝめ` is text set in the sans stack.
- `preview/` — per-token preview cards (colors, type, components, brand).
- `ui_kits/blog/` — interactive React recreation of the four surfaces (Home, Works, Blog, Diary, Post). Copy `components/*.jsx` wholesale as a starting point for new pages; they already consume `colors_and_type.css` correctly.

If creating visual artifacts (slides, mocks, throwaway prototypes): copy `colors_and_type.css`, the fonts, and relevant assets out of this skill into the target project, then build static HTML referencing them.

If working on production code: read the rules in `README.md` (CONTENT FUNDAMENTALS, VISUAL FOUNDATIONS, ICONOGRAPHY) to become an expert in designing for this brand. The voice is quiet and first-person in Japanese (僕 / です・ます); English section labels are all-caps with 0.2em letter-spacing ("PERSONAL DEV JOURNAL", "PORTFOLIO"). Accent `#2563eb` is for links, primary buttons, and a single gradient moment on the wordmark only — never for surfaces.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask a few questions (surface? Japanese or English copy? density?), and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
