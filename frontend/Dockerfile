FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Must be set at build time for Next.js to inline it
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# Railway sets PORT automatically
ENV PORT=3000
EXPOSE 3000

CMD ["npm", "start"]
