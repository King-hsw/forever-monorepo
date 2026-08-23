# ---- 构建阶段 ----
FROM node:22-alpine AS build
WORKDIR /app

RUN npm install -g pnpm@10

# 先拷贝依赖清单，利用 Docker 层缓存
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 拷贝源码并构建（产物在 /app/.output）
COPY . .
ENV NODE_ENV=production
RUN pnpm build

# ---- 运行阶段 ----
FROM node:22-alpine
WORKDIR /app

COPY --from=build /app/.output ./.output

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
