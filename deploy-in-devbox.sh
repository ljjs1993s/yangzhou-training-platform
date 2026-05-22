#!/bin/bash
# ============================================
# 扬州培训平台 — Sealos DevBox 部署脚本
# 在 DevBox 终端中运行此脚本即可完成构建+推送
# ============================================
set -e

echo "========================================"
echo "  扬州培训平台 — Sealos 云部署脚本"
echo "========================================"
echo ""

PROJECT_DIR="yz-training-platform"
IMAGE_NAME="yz-training"
REGISTRY="sealos.hub"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# --- 1. 检查 Docker ---
echo -e "${YELLOW}[1/6] 检查 Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo "Docker 未安装，正在安装..."
    apt-get update -qq && apt-get install -y -qq docker.io
fi
docker --version
echo -e "${GREEN}Docker 就绪${NC}"

# --- 2. 解压项目 ---
echo -e "${YELLOW}[2/6] 准备项目代码...${NC}"

if [ -f "yz-training-deploy.zip" ]; then
    echo "找到 yz-training-deploy.zip，正在解压..."
    rm -rf "$PROJECT_DIR" 2>/dev/null || true
    mkdir -p "$PROJECT_DIR"
    unzip -q yz-training-deploy.zip -d "$PROJECT_DIR"
    cd "$PROJECT_DIR"
elif [ -d "$PROJECT_DIR" ]; then
    echo "使用已有项目目录: $PROJECT_DIR"
    cd "$PROJECT_DIR"
else
    echo -e "${RED}错误：找不到 yz-training-deploy.zip 或 $PROJECT_DIR 目录${NC}"
    echo "请先将项目文件上传到 DevBox"
    exit 1
fi

echo -e "${GREEN}项目代码就绪: $(pwd)${NC}"

# --- 3. 安装依赖 ---
echo -e "${YELLOW}[3/6] 安装 Node.js 依赖...${NC}"
npm install --omit=dev 2>&1 | tail -3
echo -e "${GREEN}依赖安装完成${NC}"

# --- 4. 构建镜像 ---
echo -e "${YELLOW}[4/6] 构建 Docker 镜像...${NC}"
docker build -t ${IMAGE_NAME}:latest .
echo -e "${GREEN}镜像构建完成${NC}"
docker images | grep ${IMAGE_NAME}

# --- 5. 推送到 Sealos 镜像仓库 ---
echo -e "${YELLOW}[5/6] 推送到 Sealos 镜像仓库...${NC}"

# 获取 Sealos 用户名（从 docker config 或环境变量）
SEALOS_USER="${SEALOS_USER:-}"
if [ -z "$SEALOS_USER" ]; then
    # 尝试从 docker config 获取
    SEALOS_USER=$(docker info 2>/dev/null | grep Username | awk '{print $2}' || echo "")
fi

if [ -z "$SEALOS_USER" ]; then
    echo ""
    echo -e "${YELLOW}请输入你的 Sealos 用户名（手机号）：${NC}"
    read -r SEALOS_USER
fi

FULL_IMAGE="${REGISTRY}/${SEALOS_USER}/${IMAGE_NAME}:latest"

echo "标记镜像: ${FULL_IMAGE}"
docker tag ${IMAGE_NAME}:latest "${FULL_IMAGE}"

echo "推送镜像..."
docker push "${FULL_IMAGE}"

echo -e "${GREEN}镜像推送完成！${NC}"
echo ""
echo "========================================"
echo -e "${GREEN}  构建完成！镜像地址：${NC}"
echo "  ${FULL_IMAGE}"
echo ""
echo -e "${YELLOW}  下一步：在 Sealos 控制台部署${NC}"
echo "  1. 打开 https://cloud.sealos.run"
echo "  2. 左侧菜单 -> 应用管理 -> 新建应用"
echo "  3. 镜像地址填写上面的地址"
echo "  4. 配置环境变量: DATA_DIR=/data"
echo "  5. 配置持久卷: 挂载路径 /data (1GB)"
echo "  6. 容器端口: 3001"
echo "  7. 开启外网访问"
echo "========================================"
