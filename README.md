# Interop Gateway Demo

Sanitized portfolio demo inspired by interoperability gateway work (REST↔SOAP bridge, credential vaulting, RBAC).

- **Stack:** Vite + React + TypeScript + Tailwind + MSW
- **No real backends**, hosts, or credentials
- Fictional upstreams: DocketOS, CivicHub, TradeDesk, FirmBook

## Local

```bash
npm install
npm run dev
```

Demo logins (password `demo1234`):

- `admin@interop-demo.dev`
- `ops@interop-demo.dev`
- `consumer@interop-demo.dev`

## Deploy

```bash
npx vercel --prod
```
