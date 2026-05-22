# 扬州培训平台 - Docker 镜像
# 基于 Node.js 24 Alpine（轻量 ~50MB）
FROM node:24-alpine

# 设置工作目录
WORKDIR /app

# 复制依赖文件先（利用 Docker 缓存层）
COPY package.json ./

# 安装生产依赖（排除 devDependencies）
RUN npm install --omit=dev

# 复制应用源码
COPY . .

# 创建数据目录（将被持久卷挂载覆盖）
RUN mkdir -p /data /data/uploads

# 暴露端口
EXPOSE 3001

# 健康检查 — Railway 用这个判断容器是否就绪
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3001/api/health',r=>{process.exit(r.statusCode===200?0:1)})"

# 启动
CMD ["node", "server.js"]
