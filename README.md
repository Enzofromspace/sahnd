# Sahnd

Sierra-inspired pixel sand simulation built with p5.js, Tone.js, and ZzFX, served by Vite.

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Controls

- `Stick`: fine placement brush.
- `Finger`: adds and smears particles.
- `Trowel`: removes and displaces sand downward.
- `Brush Size`: slider scales the active tool radius (0.5x to 2.5x).
- `Sand Color`: clickable EGA/AGI 16-color swatches, plus picker or hex for custom colors (instant apply, optional palette lock).
- `Backdrop`: switch image scenes or None; `Scene Tint` multiplies a color over the backdrop (white = untinted).
- `Scene`: fill amount (Empty/Low/Normal/High) used by Reset, plus Undo, Save, and Help.
- `Audio`: independent music and SFX toggles with separate volume sliders.
- `Help`: modal listing all tools and shortcuts (also opens with `?`, closes with Esc).

### Keyboard shortcuts

- `1` / `2` / `3`: select Stick / Finger / Trowel.
- `[` / `]`: shrink / grow brush size.
- `Ctrl/Cmd+Z`: undo last stroke or reset (10 steps).
- `R`: reset sand to the selected fill amount.

## Audio

Music is a procedural desert lofi chiptune loop (Tone.js): ~72 BPM with light
swing in D phrygian dominant. Triangle bass, square-wave melody through
lowpass/delay/reverb, a brown-noise wind pad, and sparse percussion, glued by a
subtle bitcrusher on the music bus. Tool SFX remain ZzFX.

## Notes

- Simulation uses packed `Uint32Array` grids for lower overhead.
- Rendering writes the grid into a single `p5.Image` pixel buffer per frame instead of per-cell rects.
- Grains get slight per-particle brightness jitter for dune texture; scan direction alternates per frame to avoid drift, and diagonal slides are probabilistic so piles hold dune-like slopes.
- Brush masks are cached per radius to reduce per-stroke computation.
- Fallback pyramids layer is pre-rendered once to avoid repeated draw cost.
- p5.js and Tone.js load from cdnjs with pinned versions and subresource integrity hashes; ZzFX (v1.3.2, MIT) is vendored at `src/vendor/zzfx.js` and bundled by Vite.
- `index.html` ships a Content Security Policy meta tag. If you add a new external script or stylesheet, add its origin (and an SRI hash) there or the browser will block it.

## Deploy

Pushing to `main` builds and publishes the site to GitHub Pages via `.github/workflows/deploy.yml` (Pages source must be set to GitHub Actions).
