# Pawprint design

Calm and natural, after the Nakasei Dribbble shot: a stone-beige page in a rounded frame, moss
green, near-black pill buttons, white rounded tiles and frosted-glass panels. One page: the home
page of sightings.

## Colours

Custom properties in `assets/css/app.css`, on `[data-theme='light']` and `[data-theme='dark']`.
The theme follows the system until the header button sets one, kept in `localStorage.theme`.

| Role | Light | Dark |
|------|-------|------|
| `--outer` (around the frame) | `#6F6D61` | `#0B0D09` |
| `--bg` (stone / forest) | `#D9D2C5` | `#161A13` |
| `--surface` (tiles, cards) | `#FBF9F4` | `#20261B` |
| `--text` | `#1A1A17` | `#ECE8DE` |
| `--muted` | `#57534A` | `#AAA795` |
| `--primary` (moss) | `#5B6B2F` | `#A3B567` |
| `--primary-strong` (moss for text) | `#4A5726` | `#B8C97C` |
| `--ink` / `--on-ink` (pill buttons) | `#1A1A17` / `#F4F0E8` | `#ECE8DE` / `#161A13` |
| `--heart`, `--star` | `#B5452F`, `#A8820F` | `#E07A62`, `#E3C55A` |
| Globe: `--globe-sea`, `--globe-land`, `--globe-dot`, `--globe-dim`, `--globe-glow` | `#4A5726`, `#E8E2D4`, `#F1E27A`, `#77824D`, `#8FA05A` | `#222A1B`, `#8E9A6A`, `#F1E27A`, `#4D5838`, `#A3B567` |

Globe colours must stay hex: three.js reads them.

## Lettering

Clean and modern: Inter Tight 500 for headings (tight, `letter-spacing: -0.03em`), Inter for text,
from Google Fonts.

## Shape and spacing

- Frame radius 28px; cards 22px (18px on phones), photos inside 16px; buttons fully round.
- Pills 44px tall; round icon buttons 44px; small pills 32px.
- Soft long shadow (`--shadow`) on white tiles; glass panels have no shadow, a light border and a 14px blur.

## Components

- **Header**: paw logo + "PAWPRINT" wordmark, nav with an underline on the current link, theme
  button, black "Report a sighting" pill and a round arrow button.
- **Hero**: big headline left, country search pill with suggestions and a round arrow button,
  popular-country chips; dotted 3D globe right (drag to spin, click a dot to pick its country,
  zoom/pause buttons stacked on the right like the shot's social buttons); stat tiles bottom
  left; glass "featured" card bottom right.
- **Hero backdrop**: up to 6 random sighting photos (one per animal, re-picked each visit) fill
  the hero behind everything, cross-fading every 5 seconds, washed with the page colour from the
  left and faded out at top and bottom. The glass featured card changes with them. Still under
  reduced motion.
- **Country dropdown**: the search pill opens a rounded panel of every country with sightings: a
  green code badge, the name with the typed letters in bold moss, and a count. Arrows, Enter and
  Escape work; picking one turns the globe to face it.
- **Grid / Gallery switch** above the list (black pill = current). Gallery is the same list as one
  big card at a time, photo left and details right (stacked on phones), with previous / Play-Pause
  / next and "3 of 100 · Lion". Play advances every 5 seconds; the choice is remembered.
- **Sightings**: a photo wall, each column filling top to bottom (CSS columns): 4 from 1024px, 2
  below. Cards keep each photo's own shape, capped at 440px tall.
- **Card actions**: like (heart), 1–5 star rating, "Similar" (same family, then order, then class),
  and a "View on GBIF" link. Likes and ratings live in the browser's `localStorage`.

## Avoid

- Emojis as icons: icons are SVG symbols in the layout.
- More than one 3D scene on the page.
