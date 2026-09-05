# 运行阶段：构建产物（.output/）由 CI 产出（见 .github/workflows/build.yml），此处只 COPY
FROM node:22-alpine
WORKDIR /app

COPY --chown=node:node .output ./.output

# 非 root 用户运行，容器被攻破时影响面更小（node 用户镜像自带）
USER node

# 声明镜像支持的环境变量及默认值（与 nuxt.config.ts 的 runtimeConfig 对应）
# 运行时用 docker run -e 或 compose environment 覆盖即可，无需重新构建
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    NUXT_API_BASE=http://localhost:8080 \
    NUXT_PUBLIC_SITE_URL=https://forever.example.com
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
