# ── Build: bundle estático de producción ─────────────────────────────────────
# En CI (Jenkins) preferir Dockerfile.release: npm fuera de la imagen (red/registry).
FROM node:20-bookworm-slim AS build

WORKDIR /app

# VITE_* se resuelven en tiempo de build (quedan incrustadas en el bundle).
ARG VITE_API_BASE=/api/v1
ENV VITE_API_BASE=$VITE_API_BASE

COPY package*.json ./
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm ci --no-audit --no-fund \
 && test -x node_modules/.bin/vite

COPY . .
RUN npm run build

# ── Production: nginx sirve dist/ (QA y prod) ────────────────────────────────
FROM nginx:1.28-alpine AS production

RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]

# ── Development: Vite dev server (solo docker-compose local) ─────────────────
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
