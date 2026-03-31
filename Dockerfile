# ── Stage 1: install all deps + build shared ─────────────────────────────────
FROM node:22-alpine AS build-shared
WORKDIR /app
# Copy ALL package.json files so npm workspaces can resolve everything
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN npm ci --cache /tmp/npm-cache
COPY packages/shared packages/shared
RUN npm run build -w packages/shared

# ── Stage 2: build client ─────────────────────────────────────────────────────
FROM build-shared AS build-client
COPY packages/client packages/client
RUN npm run build -w packages/client

# ── Stage 3: build server ─────────────────────────────────────────────────────
FROM build-shared AS build-server
COPY packages/server packages/server
RUN npm run build -w packages/server

# ── Stage 4: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/client/package.json packages/client/
COPY packages/server/package.json packages/server/
RUN npm ci --omit=dev --cache /tmp/npm-cache

COPY --from=build-server /app/packages/server/dist packages/server/dist
COPY --from=build-shared /app/packages/shared/dist packages/shared/dist
COPY --from=build-client /app/packages/client/dist packages/client/dist

RUN mkdir -p /data

EXPOSE 8080

CMD ["node", "packages/server/dist/main.js"]
