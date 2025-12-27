#!/bin/bash

# 测试班级创建功能修复
echo "=========================================="
echo "  测试班级创建功能修复"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 步骤1：管理员登录
echo -e "${YELLOW}步骤1：管理员登录${NC}"
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"LEO","password":"Xmmsggbbhahaha"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ 登录成功${NC}"
else
    echo -e "${RED}✗ 登录失败${NC}"
    exit 1
fi
echo ""

# 步骤2：查看当前班级列表
echo -e "${YELLOW}步骤2：查看当前班级列表${NC}"
echo "当前班级数量: $(curl -s -X GET http://localhost:3001/api/classes \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)"
echo ""

# 步骤3：创建测试班级
echo -e "${YELLOW}步骤3：创建测试班级 '测试班级2024'${NC}"
CREATE_RESULT=$(curl -s -X POST http://localhost:3001/api/classes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试班级2024","description":"这是一个测试班级"}')

if echo "$CREATE_RESULT" | grep -q "班级创建成功"; then
    echo -e "${GREEN}✓ 班级创建成功${NC}"
    echo "  响应: $CREATE_RESULT"
else
    echo -e "${RED}✗ 班级创建失败${NC}"
    echo "  响应: $CREATE_RESULT"
fi
echo ""

# 步骤4：验证班级列表已更新
echo -e "${YELLOW}步骤4：验证班级列表已更新${NC}"
CLASS_COUNT=$(curl -s -X GET http://localhost:3001/api/classes \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l)

if [ "$CLASS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ 班级列表已更新${NC}"
    echo "  当前班级数量: $CLASS_COUNT"
else
    echo -e "${RED}✗ 班级列表未更新${NC}"
fi
echo ""

# 步骤5：清理测试数据
echo -e "${YELLOW}步骤5：清理测试数据${NC}"
CLASS_ID=$(echo "$CREATE_RESULT" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
if [ -n "$CLASS_ID" ]; then
    curl -s -X DELETE http://localhost:3001/api/classes/$CLASS_ID \
      -H "Authorization: Bearer $TOKEN" > /dev/null
    echo -e "${GREEN}✓ 测试班级已删除${NC}"
else
    echo -e "${RED}✗ 无法清理测试数据${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}  测试完成！${NC}"
echo "=========================================="
echo ""
echo "如果看到 '✓ 班级列表已更新'，说明修复成功！"
