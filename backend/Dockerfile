FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
# Compile once at build time; running plain node uses less memory than tsx at runtime.
RUN npm run build

ENV NODE_ENV=production
# Do NOT set PORT - Railway injects its own.
# The schema is applied before start; if that fails the deploy fails its healthcheck and
# Railway keeps the previous version running, instead of starting against a stale schema.
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/server.js"]
