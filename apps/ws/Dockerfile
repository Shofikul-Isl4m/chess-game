FROM oven/bun:1 AS base
WORKDIR /app 

COPY package.json bun.lock turbo.json ./

COPY apps/ws/package.json ./apps/ws
COPY packages/db/package.json ./package/db/
COPY package/redis/package.json ./package/redis/

RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY . .

RUN cd packages/db && bunx prisma generate

EXPOSE 8080

CMD ["bun" , "run" , "apps/ws/index.ts"]