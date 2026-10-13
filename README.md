# Interop Gateway Demo

Sanitized portfolio demo inspired by interoperability gateway admin work (applications catalog, route transforms REST↔SOAP, credential vaulting, RBAC).

- **Stack:** Vite + React + TypeScript + Tailwind + MSW
- **UI focus:** Application management table → gateway routes dialog → route transform panel (mirrors the real Vue admin shape, with fictional data)
- **No real backends**, hosts, or credentials
- Fictional upstreams: DocketOS, CivicHub, TradeDesk, FirmBook

## Local

```bash
npm install
npm run dev
```

Demo logins (password `demo1234`):

- `admin@interop-demo.dev` — full catalog
- `ops@interop-demo.dev` — assigned apps only
- `consumer@interop-demo.dev` — read-only assigned apps

## What to try

1. Open **Applications** — search and browse the integration catalog.
2. Click **Gateway routes** on an app — see consumer paths, APISIX paths, and transform kinds.
3. Click **View transform** — inspect variables + SOAP/JSON templates (read-only demo).
4. Optional: **REST → SOAP lab** for a live mock preview of DocketOS filing.

## Deploy

```bash
npx vercel --prod --scope jose-mazas-projects
```
