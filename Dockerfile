FROM node:22-bookworm-slim AS build
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/sdk/package.json packages/sdk/
COPY packages/backend/package.json packages/backend/
RUN pnpm install --no-frozen-lockfile

COPY packages/sdk ./packages/sdk
COPY packages/backend ./packages/backend
RUN pnpm -C packages/backend build

FROM node:22-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends bzip2 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/packages/backend/dist ./packages/backend/dist

EXPOSE 23456
CMD ["node", "packages/backend/dist/index.mjs"]
