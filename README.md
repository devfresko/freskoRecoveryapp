# Fresko Recovery App — COMPLETE FINAL (React v2)

All phases in one package.

| Phase | Status |
|-------|--------|
| 1 Foundation (Clerk, TanStack, Tremor, Sonner, GAS) | ✅ |
| 2 Parties + Invoices | ✅ |
| 3 Optimistic FIFO Record Payment | ✅ |
| 4 CSV Bulk Import (PapaParse + chunked upload) | ✅ |
| 5 Retail dashboard / register / pay | ✅ |
| 6 PWA (vite-plugin-pwa) | ✅ |

## Setup

```bash
cd fresko-react
cp .env.example .env
# VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
# VITE_GAS_API_URL=https://script.google.com/macros/s/.../exec

npm install
npm run dev
```

## Production

```bash
npm run build
# Deploy dist/ to Vercel (recommended) or GitHub Pages
```

Backend = existing **Code.gs** Web App (same as vanilla recovery app).

## Routes

- `/` Supply dashboard  
- `/parties` `/invoices` `/payments` `/payments/new` `/import`  
- `/followups` `/promises`  
- `/retail` `/retail-sales` `/retail-pay`  

## Limits (honest)

- PDF Tally import still best on vanilla app (PDF.js full parser) — this build has **CSV** bulk import.
- True multi-user realtime still limited by Google Sheets.
- Clerk auth is separate from sheet Users tab — align emails as needed.
