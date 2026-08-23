# ---- 构建阶段 ----
FROM node:22-alpine AS build
WORKDIR /app

# 锁死 pnpm 版本，避免上游发新版导致构建行为变化
RUN npm install -g pnpm@10.12.1

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

COPY --from=build --chown=node:node /app/.output ./.output

# 非 root 用户运行，容器被攻破时影响面更小（node 用户镜像自带）
USER node

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
