FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Do NOT set PORT - Railway injects its own
CMD ["sh", "-c", "(npx prisma db push --skip-generate || true) && npx tsx src/server.ts"]
