FROM oven/bun:1 AS base

WORKDIR /app

COPY package*.json turbo.json ./
COPY apps/http-backend/package.json ./apps/http-backend/
COPY packages/db/package.json ./packages/db/

RUN bun install

FROM oven/bun:1-slim AS runner

WORKDIR app/

COPY . .

RUN cd packages/db/ && bunx prsma generate

CMD ["sh" , "-c" , "cd app/packages/db/ && bunx prisma migrate deploy && cd app/apps/http-backend/ && bun index.ts  "]