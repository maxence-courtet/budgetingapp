FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Auth0 env vars must be available at build time for Next.js Edge middleware
ARG AUTH0_DOMAIN
ARG AUTH0_CLIENT_ID
ARG AUTH0_CLIENT_SECRET
ARG AUTH0_SECRET
ARG APP_BASE_URL
ARG AUTH0_AUDIENCE
ARG NEXT_PUBLIC_API_URL

RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
