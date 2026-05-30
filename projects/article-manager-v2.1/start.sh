#!/bin/bash
# ===== 文章管理系统 - 一键启动脚本 (Mac/Linux) =====

cd "$(dirname "$0")"

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║     📝 文章管理系统 - 一键部署        ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "  ❌ 未检测到 Node.js，请先安装 Node.js"
  echo "  📥 下载地址: https://nodejs.org/"
  exit 1
fi

echo "  ✅ Node.js 版本: $(node -v)"
echo ""

# 安装依赖
if [ ! -d "node_modules" ]; then
  echo "  📦 首次运行，正在安装依赖..."
  npm install
  echo ""
fi

echo "  🚀 正在启动服务..."
echo ""

# 启动
node server.js
