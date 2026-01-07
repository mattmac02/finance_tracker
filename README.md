# Breadbox

This is a full React + Vite web app version of the KD budget spreadsheet logic.
It is designed to behave well in Chrome (no expensive full rerenders while typing).

## Features
- Expense Tracker: per-month, per-category projected/actual + notes
- Income & Expenses: net pay, pays, refunds, gifts, volleyball, other + notes
- Overview: KPI cards + charts (Recharts)
- Savings Dashboard: annual rollups by category
- Import/Export JSON
- Local persistence via localStorage (Zustand persist)

## Run locally
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy (Netlify)
- Build command: `npm run build`
- Publish directory: `dist`
