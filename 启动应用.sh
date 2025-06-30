#!/bin/bash

# 上线流程管理工具 - 一键启动脚本
echo "🚀 正在启动上线流程管理工具..."

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_PATH="$SCRIPT_DIR/dist/mac-arm64/上线流程管理工具.app"

# 检查应用是否存在
if [ ! -d "$APP_PATH" ]; then
    echo "❌ 应用未找到，正在重新打包..."
    echo "📦 开始打包应用，请稍候..."
    
    # 设置使用淘宝镜像避免网络问题
    export ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
    
    # 运行打包命令
    npm run dist
    
    if [ $? -eq 0 ]; then
        echo "✅ 打包完成！"
    else
        echo "❌ 打包失败，请检查错误信息"
        exit 1
    fi
fi

# 启动应用
echo "🎉 启动应用..."
open "$APP_PATH"

echo "✅ 应用已启动！如果首次运行，请等待几秒钟让后端服务启动完成。"
echo "📱 应用将在几秒钟后自动显示界面"

# 可选：检查应用是否正在运行
sleep 2
if pgrep -f "上线流程管理工具" > /dev/null; then
    echo "✅ 应用正在运行中"
else
    echo "⚠️  如果应用没有启动，请检查系统安全设置"
    echo "   前往：系统偏好设置 > 安全性与隐私 > 通用"
    echo "   允许运行来自未知开发者的应用"
fi 