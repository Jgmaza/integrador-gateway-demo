# Interop Gateway Demo (sanitized Vue copy)

Portfolio demo based on the **real Integrador admin frontend** (Vue 3 + Vuetify), not a redesign.

- Keeps **Aplicaciones** → gateway routes → **REST↔SOAP transform** editor
- Removes login wall, unused modules (users/roles/config/monitoring), and institutional branding
- **MSW** mocks `/api/v1/*` with fictional apps (DocketOS, CivicHub, TradeDesk)

## Local

```bash
npm install
npx msw init public/ --save
npm run dev
```

Opens directly on `/applications`.

## Deploy

Static Vite build on Vercel (`vercel.json` SPA rewrite).
