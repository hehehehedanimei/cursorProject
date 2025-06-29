#!/bin/bash

echo "🚀 上线流程管理工具启动脚本"
echo "================================"

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    echo "请访问 https://nodejs.org/ 下载安装 Node.js"
    echo ""
    echo "macOS用户可以使用Homebrew安装："
    echo "brew install node"
    exit 1
fi

echo "✅ Node.js 已安装: $(node --version)"

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

echo "✅ npm 已安装: $(npm --version)"
echo ""

# 安装依赖
echo "📦 安装项目依赖..."
npm install

echo "📦 安装前端依赖..."
cd frontend && npm install

echo "📦 安装后端依赖..."
cd ../backend && npm install

cd ..

echo ""
echo "🔨 构建后端项目..."
npm run backend:build

echo ""
echo "🎉 安装完成！"
echo ""
echo "可用命令："
echo "  npm run dev          - 开发模式运行"
echo "  npm run electron:dev - Electron桌面应用开发模式"
echo "  npm run build        - 构建生产版本"
echo "  npm run dist         - 打包桌面应用"
echo ""
echo "现在可以运行: npm run dev" 