FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Railway injects env vars at build time for Docker builds
# NEXT_PUBLIC_API_URL must be available during `npm run build`
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
