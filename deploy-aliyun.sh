#!/bin/bash
# ==========================================
# 扬州培训平台 — 阿里云轻量服务器一键部署
# 使用方法: bash deploy-aliyun.sh
# ==========================================
set -e

echo "========================================="
echo " 扬州培训平台 一键部署脚本"
echo "========================================="

# 1. 安装 Node.js 20 (如果还没装)
if ! command -v node &>/dev/null; then
  echo "[1/5] 安装 Node.js 20 ..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
else
  echo "[1/5] Node.js 已安装: $(node -v)"
fi

# 2. 安装 PM2 (进程守护)
if ! command -v pm2 &>/dev/null; then
  echo "[2/5] 安装 PM2 ..."
  sudo npm install -g pm2
else
  echo "[2/5] PM2 已安装"
fi

# 3. 克隆项目
APP_DIR=/opt/yz-training
if [ -d "$APP_DIR" ]; then
  echo "[3/5] 项目目录已存在，拉取最新代码..."
  cd $APP_DIR && git pull origin main
else
  echo "[3/5] 克隆项目..."
  sudo git clone https://github.com/ljjs1993s/yangzhou-training-platform.git $APP_DIR
  sudo chown -R $USER:$USER $APP_DIR
fi

# 4. 安装依赖
echo "[4/5] 安装依赖..."
cd $APP_DIR
npm install --production

# 5. 启动服务
echo "[5/5] 启动服务..."
pm2 delete yz-training 2>/dev/null || true
pm2 start server.js --name yz-training
pm2 save
pm2 startup systemd -u $USER --hp $HOME

# 开放端口
echo ""
echo "========================================="
echo " 开放防火墙端口..."
echo "========================================="
# 阿里云轻量服务器需要在控制台防火墙规则里手动添加 3001 端口
# 本地防火墙:
sudo ufw allow 3001/tcp 2>/dev/null || true
sudo firewall-cmd --add-port=3001/tcp --permanent 2>/dev/null || true
sudo firewall-cmd --reload 2>/dev/null || true

IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ip.sb 2>/dev/null || echo "你的服务器IP")
echo ""
echo "========================================="
echo " 部署完成！"
echo " 访问地址: http://$IP:3001"
echo " 测试账号: admin / admin123"
echo "========================================="
echo ""
echo " 常用命令:"
echo "  pm2 status           查看状态"
echo "  pm2 logs yz-training 查看日志"
echo "  pm2 restart yz-training 重启服务"
echo ""
echo " ⚠️ 重要: 去阿里云控制台 → 轻量服务器 → 防火墙"
echo "    添加规则: 端口 3001, 协议 TCP"
echo ""
