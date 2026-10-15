# Design: Field Guide

A calm, bright field guide, like a modern museum guide. Photos lead; the chrome stays quiet.

## Colours

Defined as custom properties in `assets/css/app.css`. Light is the default, and dark applies via
`:root[data-theme="dark"]`. The theme follows the system until the header toggle saves a choice in
`localStorage`.

| Role | Property | Light | Dark |
|------|----------|-------|------|
| Page | `--color-bg` | off-white `#FAFAF7` | slate `#12181A` |
| Cards, panels | `--color-surface` | `#FFFFFF` | `#1A2225` |
| Subtle fill | `--color-surface-2` | `#F1F0EA` | `#222C30` |
| Text | `--color-text` | `#1B2421` | `#E8ECEA` |
| Secondary text | `--color-muted` | `#5B6661` | `#9AA7A2` |
| Lines | `--color-border` | `#E3E1D8` | `#2C383C` |
| Buttons, links | `--color-primary` | forest green `#2F5D50` | sage `#6FB39E` |
| Highlights, focus ring | `--color-accent` | terracotta `#C8553D` | `#E07A62` |
| Accent as text | `--color-accent-text` | `#A8432F` | `#EE9580` |
| Delete | `--color-danger` | `#B3261E` | `#F2867A` |

## Lettering

- Headings: Nunito 700–800 (`--font-heading`), rounded and friendly.
- Body: Inter 400–600 (`--font-body`).
- Both load from Google Fonts at the top of `app.css`.

## Spacing and shape

- Spacing scale `--space-1`…`--space-8`: 4, 8, 12, 16, 24, 32, 48, 72px.
- Radii: `--radius-sm` 8px (inputs, thumbnails), `--radius-md` 14px (stats, notices),
  `--radius-lg` 22px (cards, panels), `--radius-pill` for buttons and chips.
- Content width 1200px (`--container`).

## Components

- **Header**: sticky, translucent with blur. Logo mark and wordmark on the left; nav, the
  "Add sighting" button and the round theme toggle on the right.
- **Hero**: soft green and terracotta glows, an eyebrow pill, a big two-tone headline, two
  buttons, and four stat tiles (sightings, species, countries, observers).
- **Sighting card**: 4:3 photo with `object-fit: cover`, an optional count badge, the common
  name, the scientific name in italics, and place, date and observer with line icons. The whole
  card is a link. On hover it lifts and the photo zooms gently.
- **Detail page**: large photo with a thumbnail gallery beside panels for the sighting, the
  weather (only when a reading exists) and notes. Taxonomy appears as chips. Delete asks for
  confirmation in a modal.
- **Form**: fieldsets as white panels in two columns (one on phones), errors in red under each
  field, plus a summary box at the top.
- **Buttons**: pill-shaped. Primary is filled green; ghost is outlined; danger is red.
- Icons are inline SVG line icons (`components/icons.templ`). No emoji.

## Rules

- Respect `prefers-reduced-motion`; keep the visible focus ring.
- Every image slot gets a fixed aspect ratio, and images keep `loading="lazy"`.
