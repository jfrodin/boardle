# ── Stage 1: build shared ────────────────────────────────────────────────────
FROM node:22-alpine AS build-shared
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
RUN npm ci --cache /tmp/npm-cache
COPY packages/shared packages/shared
RUN npm run build -w packages/shared

# ── Stage 2: build client ────────────────────────────────────────────────────
FROM build-shared AS build-client
COPY packages/client/package.json packages/client/
RUN npm ci --cache /tmp/npm-cache
COPY packages/client packages/client
RUN npm run build -w packages/client

# ── Stage 3: build server ────────────────────────────────────────────────────
FROM build-shared AS build-server
COPY packages/server/package.json packages/server/
RUN npm ci --cache /tmp/npm-cache
COPY packages/server packages/server
RUN npm run build -w packages/server

# ── Stage 4: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copy production deps manifest and install only prod deps
COPY package.json package-lock.json ./
COPY packages/server/package.json packages/server/
COPY packages/shared/package.json packages/shared/
RUN npm ci --omit=dev --cache /tmp/npm-cache

# Copy built artifacts
COPY --from=build-server /app/packages/server/dist packages/server/dist
COPY --from=build-shared /app/packages/shared/dist packages/shared/dist
COPY --from=build-client /app/packages/client/dist packages/client/dist

# Data directory for SQLite volume mount
RUN mkdir -p /data

EXPOSE 8080

CMD ["node", "packages/server/dist/main.js"]
