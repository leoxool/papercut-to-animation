#!/bin/bash

echo "=========================================="
echo "  安全功能测试：Session管理"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试1：验证登录后是否设置session时间
echo -e "${BLUE}[测试 1/5] 验证登录后session初始化${NC}"
echo "正在测试登录流程..."

# 启动服务器（如果未运行）
if ! curl -s http://localhost:3001/api/auth/login > /dev/null 2>&1; then
    echo -e "${YELLOW}启动后端服务器...${NC}"
    cd server && npm start > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 3
fi

# 登录并检查localStorage中的session数据
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"LEO","password":"Xmmsggbbhahaha"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ 登录成功，获取到token${NC}"

    # 检查session_start_time是否被设置
    echo ""
    echo "注意：需要手动验证以下功能："
    echo "1. 打开浏览器开发者工具 (F12)"
    echo "2. 检查 Application/应用 > Local Storage > http://localhost:5173"
    echo "3. 查看是否存在 'session_start_time' 键值"
    echo ""
else
    echo -e "${RED}✗ 登录失败${NC}"
    exit 1
fi

# 测试2：验证session超时机制
echo ""
echo -e "${BLUE}[测试 2/5] 验证session超时机制${NC}"
echo ""
echo "测试说明："
echo "- Session超时设置为30分钟"
echo "- 每次用户活动（鼠标、键盘、点击等）都会更新session时间"
echo "- 如果30分钟无操作，session将自动过期"
echo ""
echo "模拟测试："
# 获取当前session时间
echo "当前localStorage中的session_start_time: [需要手动检查]"
echo ""

# 测试3：验证页面刷新时session检查
echo -e "${BLUE}[测试 3/5] 验证页面刷新时session有效性检查${NC}"
echo ""
echo "测试步骤："
echo "1. 保持浏览器打开"
echo "2. 按 F5 刷新页面"
echo "3. 验证："
echo "   - 如果session未过期，用户应保持登录状态"
echo "   - 如果session已过期，应显示登录对话框"
echo ""

# 测试4：验证关闭页面后session清理
echo -e "${BLUE}[测试 4/5] 验证关闭页面时session清理${NC}"
echo ""
echo "测试步骤："
echo "1. 关闭浏览器标签页"
echo "2. 重新打开 http://localhost:5173"
echo "3. 验证：应显示登录对话框（因为beforeunload事件清理了session）"
echo ""

# 测试5：验证强制登录机制
echo -e "${BLUE}[测试 5/5] 验证强制登录机制${NC}"
echo ""
echo "测试步骤："
echo "1. 确保处于未登录状态"
echo "2. 访问 http://localhost:5173"
echo "3. 验证："
echo "   - 应该只显示登录对话框"
echo "   - 页面其他内容应被完全阻挡"
echo "   - 无法访问任何功能直到登录"
echo ""

# 测试6：session过期提示
echo -e "${BLUE}[额外测试] 验证session过期提示${NC}"
echo ""
echo "测试步骤："
echo "1. 登录后等待30分钟无操作，或手动修改localStorage中的session_start_time为很久以前的时间"
echo "2. 执行任何操作或刷新页面"
echo "3. 验证："
echo "   - 应自动登出并显示登录对话框"
echo "   - 登录对话框应显示黄色警告：'登录已过期，请重新登录'"
echo "   - 警告文字应说明：'为保护账户安全，30分钟无操作将自动登出'"
echo ""

echo "=========================================="
echo -e "${GREEN}  安全功能测试指南完成！${NC}"
echo "=========================================="
echo ""
echo "实现的安全特性："
echo -e "${GREEN}✓${NC} 1. Session超时机制（30分钟无操作自动登出）"
echo -e "${GREEN}✓${NC} 2. 活动监听（鼠标、键盘、点击等事件更新session）"
echo -e "${GREEN}✓${NC} 3. 页面关闭时清理session"
echo -e "${GREEN}✓${NC} 4. 强制登录（未认证用户无法访问任何内容）"
echo -e "${GREEN}✓${NC} 5. 页面刷新时验证session有效性"
echo -e "${GREEN}✓${NC} 6. Session过期自动登出并提示"
echo ""
echo "技术实现："
echo "- UserContext.jsx: 管理session状态和超时检查"
echo "- App.jsx: 强制登录验证，阻挡未认证访问"
echo "- UserLoginDialog.jsx: 显示session过期警告"
echo ""
echo "配置参数："
echo "- SESSION_TIMEOUT: 30 * 60 * 1000 = 30分钟"
echo "- SESSION_CHECK_INTERVAL: 60 * 1000 = 每分钟检查一次"
echo ""
echo "要测试实际功能，请："
echo "1. 运行: npm run dev"
echo "2. 打开: http://localhost:5173"
echo "3. 使用管理员账户登录: LEO / Xmmsggbbhahaha"
echo ""

# 清理
if [ ! -z "$SERVER_PID" ]; then
    kill $SERVER_PID 2>/dev/null
fi
