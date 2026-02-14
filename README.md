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
- `Sand Color`: manual hex or picker with optional AGI palette lock.
- `Backdrop`: switch image scenes or use flat background color.
- `Audio`: independent music and SFX toggles with separate volume sliders.

## Notes

- Simulation uses packed `Uint32Array` grids for lower overhead.
- Brush masks are cached per radius to reduce per-stroke computation.
- Fallback pyramids layer is pre-rendered once to avoid repeated draw cost.
