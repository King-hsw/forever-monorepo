# ============================================================
# forever-admin 运行镜像：nginx 托管静态产物 + 反代 /api
#
# 构建上下文是 apps/admin/ 自身；产物由 CI 先构建好再进上下文：
#
#   cd apps/admin
#   pnpm install --frozen-lockfile
#   pnpm build                                  # 产出 dist/
#   docker build -t forever-admin apps/admin    # Dockerfile 在本目录
#
# 后端地址在**运行时**通过 -e API_UPSTREAM=... 注入，不用为了换环境重新构建镜像。
# ============================================================

FROM nginx:alpine

# 官方镜像启动时会用 envsubst 渲染 /etc/nginx/templates/*.template → /etc/nginx/conf.d/
# 只会替换「环境里真实存在的变量」，所以配置里的 nginx 内置变量（$uri / $host）不受影响
COPY nginx/admin.conf.template /etc/nginx/templates/default.conf.template

# 静态产物（.dockerignore 里不能排除 dist/）
COPY dist /usr/share/nginx/html

# 默认走 compose 里的服务名；单容器部署时覆盖，例如：
#   docker run -e API_UPSTREAM=http://10.0.0.20:8080 -p 8081:80 forever-admin
ENV API_UPSTREAM=http://forever-server:8080

EXPOSE 80

# nginx:alpine 自带 busybox wget，不用额外装 curl
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/healthz || exit 1
