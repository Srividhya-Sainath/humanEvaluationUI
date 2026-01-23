# Human Evaluation UI

## Prerequisites
- Node.js 18+ (recommended)
- npm (comes with Node.js)

### Install Node.js (macOS)
```bash
brew install node
```

### Install Node.js (Linux)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

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

## Download image tiles
Download the image tiles from:
- https://drive.google.com/drive/folders/1PxhFmqSgJ9JKHecZlIHBCu1LuJGooYy3?usp=sharing

Unzip all files and place the `tiles` folder here (relative to the repo root):
```
WSI/tiles
```

After placing the folder, restart the dev server so the UI can load the images.

## Notes
- The app expects data files in `WSI/` at the repo root (e.g. `WSI/cases_by_model.json`, `WSI/medGemma.json`, `WSI/sampled_reports.csv`).
- Large tiles folders are excluded from the repo by default.
