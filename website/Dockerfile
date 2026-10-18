# Static marketing site: build with Next.js (output: export), serve the files with nginx.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Where "Sign in" / "Start free" point; set per environment as a build variable.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM nginx:1.27-alpine
# The official image renders /etc/nginx/templates/*.template with env vars; Railway injects PORT.
ENV PORT=8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/out /usr/share/nginx/html
