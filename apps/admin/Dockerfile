# 运行阶段：构建产物（dist/）由 CI 产出（见 .github/workflows/admin.yml），此处只 COPY
FROM nginx:1.27-alpine

# 注意：dist/ 必须已由 CI 的 pnpm build 生成，否则 docker build 会直接报错（不静默产出空镜像）
COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
