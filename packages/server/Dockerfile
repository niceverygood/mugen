FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

RUN pnpm install --frozen-lockfile

COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/

WORKDIR /app/packages/server
RUN npx prisma generate

FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

WORKDIR /app/packages/server

RUN mkdir -p /data/uploads

EXPOSE 3001

CMD ["npx", "tsx", "src/index.ts"]
