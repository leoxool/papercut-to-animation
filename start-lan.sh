#!/bin/bash

# ArtClassroom 局域网快速启动脚本

echo "=================================================="
echo "   ArtClassroom 局域网快速启动"
echo "=================================================="
echo ""

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js，请先安装 Node.js"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 获取本机 IP
echo ""
echo "📡 检测本机 IP 地址..."

# 尝试获取本机 IP（排除 127.0.0.1）
if command -v ifconfig &> /dev/null; then
    LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -n 1 | awk '{print $2}')
elif command -v ip &> /dev/null; then
    LOCAL_IP=$(ip addr | grep "inet " | grep -v 127.0.0.1 | head -n 1 | awk '{print $2}' | cut -d/ -f1)
else
    LOCAL_IP="[请手动查看]"
fi

echo "💻 本机 IP: $LOCAL_IP"
echo ""

# 检查端口
echo "🔍 检查端口占用..."

PORT_FRONTEND=5173
PORT_WEBSOCKET=8080

if lsof -Pi :$PORT_FRONTEND -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告：端口 $PORT_FRONTEND 已被占用"
    echo "   请关闭占用该端口的程序，或使用其他端口"
    echo ""
fi

if lsof -Pi :$PORT_WEBSOCKET -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  警告：端口 $PORT_WEBSOCKET 已被占用"
    echo "   请关闭占用该端口的程序，或使用其他端口"
    echo ""
fi

# 启动 WebSocket 服务器
echo "🚀 启动 WebSocket 服务器 (端口: $PORT_WEBSOCKET)..."

cd server

if [ ! -d "node_modules" ]; then
    echo "📦 首次运行，正在安装依赖..."
    npm install
fi

# 后台启动 WebSocket 服务器
npm start > /tmp/websocket.log 2>&1 &
WEBSOCKET_PID=$!

cd ..

# 等待 WebSocket 服务器启动
sleep 2

echo "✅ WebSocket 服务器已启动 (PID: $WEBSOCKET_PID)"
echo ""

# 启动前端服务
echo "🚀 启动前端服务 (端口: $PORT_FRONTEND)..."
echo ""
echo "=================================================="
echo "   服务启动中..."
echo "=================================================="
echo ""
echo "🌐 前端地址: http://$LOCAL_IP:$PORT_FRONTEND"
echo "🔌 WebSocket: ws://$LOCAL_IP:$PORT_WEBSOCKET"
echo ""
echo "👥 学生访问地址: http://$LOCAL_IP:$PORT_FRONTEND"
echo ""
echo "⚠️  注意："
echo "   - 请确保所有设备连接到同一局域网"
echo "   - 如无法访问，请检查防火墙设置"
echo "   - 按 Ctrl+C 停止服务"
echo ""
echo "=================================================="

# 启动前端服务（前台运行）
npm run dev:lan

# 停止 WebSocket 服务器
echo ""
echo "🛑 正在停止 WebSocket 服务器..."
kill $WEBSOCKET_PID 2>/dev/null

echo "✅ 所有服务已停止"
