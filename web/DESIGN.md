# Design: Field Guide

An editorial, photo-led field guide: a dark, cinematic photo banner leads into calm, bright pages
(or slate pages in dark mode). It should feel like a beautifully printed nature book that moves.

## Colours

Defined as custom properties at the top of `assets/css/app.css`. Light is the default, and dark
applies via `:root[data-theme="dark"]`. The theme follows the system until the header toggle saves
a choice in `localStorage`. The photo banners stay dark in both themes.

| Role | Property | Light | Dark |
|------|----------|-------|------|
| Page | `--color-bg` | off-white `#FAFAF7` | slate `#12181A` |
| Cards, panels | `--color-surface` | `#FFFFFF` | `#1A2225` |
| Tinted sections | `--color-surface-2` | `#F1F0EA` | `#161E21` |
| Text | `--color-text` | `#1B2421` | `#E8ECEA` |
| Secondary text | `--color-muted` | `#5B6661` | `#9AA7A2` |
| Lines | `--color-border` | `#E3E1D8` | `#2C383C` |
| Buttons, links | `--color-primary` | forest green `#2F5D50` | sage `#6FB39E` |
| Highlights, map dots, focus ring | `--color-accent` | terracotta `#C8553D` | `#E07A62` |
| Small caps labels | `--color-accent-text` | `#A8432F` | `#EE9580` |
| Warm highlight | `--color-gold` | `#E2A84B` | same |
| Photo banners | `--color-night` | `#0C1311` | same |
| Delete | `--color-danger` | `#B3261E` | `#F2867A` |

## Lettering

- Headings: Nunito 800–900 (`--font-heading`), rounded and friendly, set very large and tight.
- Body: Inter 400–600 (`--font-body`).
- Accent: Fraunces italic (`--font-accent`) for scientific names, the second line of the
  headline, quotes and the "Latest" stamp. Never for body text.
- All three load from Google Fonts without blocking the page (`media="print"` swap in the layout).

## Spacing and shape

- Spacing `--space-1`…`--space-9`: 4, 8, 12, 16, 24, 32, 48, 72, 112px. Sections are roomy (112px).
- Radii: `--radius-sm` 10, `--radius-md` 16, `--radius-lg` 24 (cards), `--radius-xl` 36 (big photos,
  map, call to action), `--radius-pill` for buttons and chips.
- Content width 1240px. A faint paper grain overlays every page.

## Home page, top to bottom

1. **Banner**: full-screen dark wall of real sighting photos drifting in two tilted rows, with a
   live pulse badge, the headline "The wild, *as it was seen.*" (second line in a gold-to-terracotta
   Fraunces gradient), a glass search box that feeds the collection's filter, and four numbers
   that count up.
2. **Latest from the field**: the newest sighting with a photo, slightly rotated with a terracotta
   "Latest" stamp.
3. **Map**: every sighting on a Leaflet map with terracotta clusters; it follows the filter below.
   Tiles are inverted in dark mode.
4. **By the numbers**: tiles of different sizes: sightings per year as columns that grow in, a
   green feature tile with the photo count, then the most-seen animals, top countries and busiest
   observers as bars.
5. **The collection**: a glass filter bar (search, sort, chips for animal, country and year) that
   sticks under the header and folds to a "Filters" button once scrolled. The choice is kept in the
   URL. Then cards: a 4:5 photo with the name over a dark fade, and place, date and observer below.
   Cards tilt towards the pointer with a soft shine.
6. **Call to action**: a green-to-gold band, "Seen something wild?".

## Other pages

- **Sighting**: a photo banner with a slow zoom, the name huge over it, then the photo (click to
  enlarge), all photos, field notes as a quote, and a sticky side column with the record, a small
  map, the weather and Edit/Delete. Delete confirms in a pop-up.
- **Add / edit**: numbered sections (1 The animal, 2 Where, 3 Photo and notes), with errors under
  each field.
- **Error**: a giant gradient status code.

## Rules

- Photos from iNaturalist go through `components.Sized`: "medium" on cards and in the banner,
  "large" on the sighting page, and the original only in the lightbox.
- Every image slot has a fixed aspect ratio; card images keep `loading="lazy"`.
- Respect `prefers-reduced-motion`: no drifting, tilting or counting.
- Keep the focus ring and the 4.5:1 contrast for text.
- Our scripts load before the CDN ones, so the page works while Leaflet is still arriving.
