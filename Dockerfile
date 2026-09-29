# syntax=docker/dockerfile:1

# --- Build stage ---------------------------------------------------------
# Debian slim (glibc) so native deps (sharp, @resvg/resvg-js) use prebuilt
# binaries without musl headaches.
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# PUBLIC_* values are inlined at build time, so they must be present here.
ARG PUBLIC_UMAMI_WEBSITE_ID
ENV PUBLIC_UMAMI_WEBSITE_ID=$PUBLIC_UMAMI_WEBSITE_ID

RUN npm run build

# --- Runtime stage -------------------------------------------------------
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

COPY package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
