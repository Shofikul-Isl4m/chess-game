FROM oven/bun:1 AS base
WORKDIR /app 

COPY package.json bun.lock turbo.json ./

COPY apps/frontend/package.json ./apps/frontend 

RUN bun install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY . .

RUN cd apps/frontend && bun run build

FROM nginx:alpine AS runner

COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 

CMD ["nginx","-g","daemon off;"]






