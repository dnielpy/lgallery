# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
RUN pnpm config set fetch-retries 5 \
  && pnpm config set fetch-timeout 600000 \
  && pnpm config set network-concurrency 4

FROM base AS dependencies
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=lgallery-pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV MEDIA_LIBRARY_PATH=/media/library
ENV MEDIA_CACHE_PATH=/app/data/cache
RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data/cache \
  && chown -R node:node /app/data
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
