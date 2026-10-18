# ── Build ─────────────────────────────────────────────────────────────────────
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inlined into the browser bundle, so it must be set at build time.
# Auth secrets (BETTER_AUTH_SECRET, DATABASE_URL, ...) are only read at runtime.
ARG NEXT_PUBLIC_API_URL

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Run: only the standalone server, static assets and public files ──────────
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

EXPOSE 3000
# Railway injects PORT; the standalone server reads PORT and HOSTNAME.
CMD ["node", "server.js"]
