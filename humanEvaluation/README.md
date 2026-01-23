# Human Evaluation UI

## Prerequisites
- Node.js 18+ (recommended)
- npm (comes with Node.js)

## Install
```bash
cd humanEvaluation
npm install
```

## Run locally
```bash
npm run dev
```

Then open the local URL printed in the terminal (usually `http://localhost:5173`).

## Build for production
```bash
npm run build
```

## Preview production build
```bash
npm run preview
```

## Deploy to GitHub Pages
1) Set the Vite base path in `humanEvaluation/vite.config.ts` to match your repo name:
   - `base: "/humanEvaluationUI/"`
2) Build the site:
```bash
npm run build
```
3) Deploy the `dist/` folder to GitHub Pages (one simple option is `gh-pages`):
```bash
npm install --save-dev gh-pages
npx gh-pages -d dist
```
4) In GitHub, set Pages to use the `gh-pages` branch.

If your data files are not in the repo (e.g. tiles), host them elsewhere and set `VITE_TILES_BASE_URL` accordingly.

## Notes
- The app expects data files in `WSI/` at the repo root (e.g. `WSI/cases_by_model.json`, `WSI/medGemma.json`, `WSI/sampled_reports.csv`).
- Large tiles folders are excluded from the repo by default.
