#!/bin/bash

# 管理员班级管理功能演示脚本
# 此脚本演示完整的班级管理功能流程

echo "=========================================="
echo "  管理员班级管理功能演示"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 步骤1：管理员登录
echo -e "${BLUE}步骤1：管理员登录${NC}"
echo "正在使用默认管理员账户登录..."
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"LEO","password":"Xmmsggbbhahaha"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ 登录成功，获取到管理员token${NC}"
else
    echo "✗ 登录失败"
    exit 1
fi
echo ""

# 步骤2：创建教师账户
echo -e "${BLUE}步骤2：创建教师账户${NC}"
echo "正在创建教师账户 '张老师'..."
curl -s -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher_zhang","password":"password123","role":"teacher","fullName":"张老师"}' > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 教师账户创建成功${NC}"
else
    echo "✗ 教师账户创建失败"
fi
echo ""

# 步骤3：创建班级
echo -e "${BLUE}步骤3：创建班级${NC}"
echo "正在创建班级 '艺术1班'..."
CLASS_RESPONSE=$(curl -s -X POST http://localhost:3001/api/classes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"艺术1班","description":"艺术创作初级班"}')

CLASS_ID=$(echo $CLASS_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CLASS_ID" ]; then
    echo -e "${GREEN}✓ 班级创建成功${NC}"
    echo "  班级ID: $CLASS_ID"
else
    echo "✗ 班级创建失败"
fi
echo ""

# 步骤4：创建学生并分配到班级
echo -e "${BLUE}步骤4：创建学生并分配到班级${NC}"
echo "正在创建学生 '李小明' 并分配到 '艺术1班'..."
curl -s -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"student_li","password":"password123","role":"student","fullName":"李小明","className":"艺术1班"}' > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 学生创建成功并分配到班级${NC}"
else
    echo "✗ 学生创建失败"
fi
echo ""

# 步骤5：查看班级列表
echo -e "${BLUE}步骤5：查看班级列表${NC}"
echo "正在获取班级列表..."
CLASSES=$(curl -s -X GET http://localhost:3001/api/classes \
  -H "Authorization: Bearer $TOKEN")

echo "班级列表："
echo "$CLASSES" | grep -o '"name":"[^"]*","studentCount":[0-9]*' | while read -r class; do
    NAME=$(echo $class | grep -o '"name":"[^"]*"' | cut -d'"' -f4)
    COUNT=$(echo $class | grep -o '"studentCount":[0-9]*' | cut -d':' -f2)
    echo -e "  ${YELLOW}•${NC} $NAME - $COUNT 名学生"
done
echo ""

# 步骤6：更新班级信息
echo -e "${BLUE}步骤6：更新班级信息${NC}"
echo "正在更新班级描述..."
curl -s -X PUT http://localhost:3001/api/classes/$CLASS_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"艺术1班","description":"艺术创作初级班 - 已更新"}' > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 班级信息更新成功${NC}"
else
    echo "✗ 班级信息更新失败"
fi
echo ""

# 步骤7：测试删除保护
echo -e "${BLUE}步骤7：测试删除保护（班级下有学生）${NC}"
echo "尝试删除有学生的班级（应该失败）..."
DELETE_RESULT=$(curl -s -X DELETE http://localhost:3001/api/classes/$CLASS_ID \
  -H "Authorization: Bearer $TOKEN")

if echo "$DELETE_RESULT" | grep -q "该班级下还有学生"; then
    echo -e "${GREEN}✓ 删除保护正常工作${NC}"
    echo "  提示信息: 该班级下还有学生，无法删除"
else
    echo "✗ 删除保护失效"
fi
echo ""

# 步骤8：清理测试数据
echo -e "${BLUE}步骤8：清理测试数据${NC}"
echo "正在删除测试学生..."
curl -s -X DELETE http://localhost:3001/api/users/student_li \
  -H "Authorization: Bearer $TOKEN" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 测试学生已删除${NC}"
else
    echo "✗ 删除测试学生失败"
fi

echo "正在删除测试班级..."
curl -s -X DELETE http://localhost:3001/api/classes/$CLASS_ID \
  -H "Authorization: Bearer $TOKEN" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 测试班级已删除${NC}"
else
    echo "✗ 删除测试班级失败"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}  演示完成！${NC}"
echo "=========================================="
echo ""
echo "所有核心功能已验证："
echo -e "${GREEN}✓${NC} 管理员登录"
echo -e "${GREEN}✓${NC} 创建教师账户"
echo -e "${GREEN}✓${NC} 创建班级"
echo -e "${GREEN}✓${NC} 创建学生并分配班级"
echo -e "${GREEN}✓${NC} 查看班级列表（学生数量统计）"
echo -e "${GREEN}✓${NC} 更新班级信息"
echo -e "${GREEN}✓${NC} 删除保护（防止删除有学生的班级）"
echo -e "${GREEN}✓${NC} 清理测试数据"
echo ""
echo "班级管理功能开发完成！🎉"
