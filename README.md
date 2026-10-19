# Try On Studio — React + TypeScript

A Vite application migrating the original Try On Studio HTML prototype into React components and TypeScript.

## Requirements
- Node.js 20.19+ or 22.12+
- Internet access on first run so MediaPipe can download its WASM runtime and pose model
- A modern browser

## Run locally
```bash
npm install
npm run dev
```

Vite prints a local URL, usually `http://localhost:5173`.

## Production build
```bash
npm run build
npm run preview
```

## Project structure
```text
src/
├── components/
│   ├── ClothingCatalog.tsx
│   ├── GarmentArt.tsx
│   ├── HomePage.tsx
│   └── StudioPage.tsx
├── data/
│   └── catalog.ts
├── hooks/
│   └── useCamera.ts
├── types/
│   └── index.ts
├── App.tsx
├── index.css
└── main.tsx
```

## Current migration scope
- React + TypeScript app setup using Vite.
- Typed garment/category data and reusable garment SVG component.
- Home page, featured items, category filtering, and clothing catalog.
- Camera permission/start/stop lifecycle isolated in `useCamera`.
- Manual garment positioning and sizing, camera snapshots, and local snapshot downloads.
- MediaPipe Pose Landmarker integration for automatic top, dress, and pants positioning, with GPU-to-CPU fallback.
## Important current limitation
This is a staged migration, not a feature-for-feature parity release yet. Pose tracking is integrated, but it still needs runtime testing on a real webcam and browser. If model loading or tracking fails, manual positioning remains available. Accessories remain preview-only. Snapshots currently capture the camera frame; compositing the garment overlay into the downloaded image is a follow-up task.


Camera access works on `localhost` or an HTTPS deployment and requires browser permission.
