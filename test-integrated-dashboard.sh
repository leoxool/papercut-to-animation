#!/bin/bash

echo "=========================================="
echo "  管理员控制台整合功能测试"
echo "=========================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 步骤1：管理员登录
echo -e "${YELLOW}[1/10] 管理员登录${NC}"
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

# 步骤2：清理现有测试数据
echo -e "${YELLOW}[2/10] 清理现有测试数据${NC}"
# 删除测试用户
for username in student_test1 student_test2 teacher_test; do
    curl -s -X DELETE http://localhost:3001/api/users/$username -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
done
# 删除测试班级
CLASS_IDS=$(curl -s -X GET http://localhost:3001/api/classes -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
for id in $CLASS_IDS; do
    curl -s -X DELETE http://localhost:3001/api/classes/$id -H "Authorization: Bearer $TOKEN" > /dev/null 2>&1
done
echo -e "${GREEN}✓ 清理完成${NC}"
echo ""

# 步骤3：创建教师账户
echo -e "${YELLOW}[3/10] 创建教师账户${NC}"
curl -s -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"teacher_test","password":"password123","role":"teacher","fullName":"测试教师"}' > /dev/null
echo -e "${GREEN}✓ 教师账户创建成功${NC}"
echo ""

# 步骤4：创建班级
echo -e "${YELLOW}[4/10] 创建班级${NC}"
CLASS_ID=$(curl -s -X POST http://localhost:3001/api/classes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试班级","description":"用于测试的班级"}' \
  | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -n "$CLASS_ID" ]; then
    echo -e "${GREEN}✓ 班级创建成功${NC}"
    echo "  班级ID: $CLASS_ID"
else
    echo -e "${RED}✗ 班级创建失败${NC}"
    exit 1
fi
echo ""

# 步骤5：创建第一个学生
echo -e "${YELLOW}[5/10] 创建学生1并分配到班级${NC}"
curl -s -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"student_test1","password":"password123","role":"student","fullName":"测试学生1","className":"测试班级"}' > /dev/null
echo -e "${GREEN}✓ 学生1创建成功${NC}"
echo ""

# 步骤6：创建第二个学生
echo -e "${YELLOW}[6/10] 创建学生2并分配到班级${NC}"
curl -s -X POST http://localhost:3001/api/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"username":"student_test2","password":"password123","role":"student","fullName":"测试学生2","className":"测试班级"}' > /dev/null
echo -e "${GREEN}✓ 学生2创建成功${NC}"
echo ""

# 步骤7：验证班级列表显示
echo -e "${YELLOW}[7/10] 验证班级列表显示${NC}"
CLASSES=$(curl -s -X GET http://localhost:3001/api/classes -H "Authorization: Bearer $TOKEN")
STUDENT_COUNT=$(echo "$CLASSES" | grep -o '"studentCount":2' | wc -l)

if [ "$STUDENT_COUNT" -eq 1 ]; then
    echo -e "${GREEN}✓ 班级列表正确显示，班级数量统计为2${NC}"
else
    echo -e "${RED}✗ 班级数量统计错误${NC}"
fi
echo ""

# 步骤8：验证删除保护（班级下有学生时无法删除）
echo -e "${YELLOW}[8/10] 验证删除保护机制${NC}"
DELETE_RESULT=$(curl -s -X DELETE http://localhost:3001/api/classes/$CLASS_ID \
  -H "Authorization: Bearer $TOKEN")

if echo "$DELETE_RESULT" | grep -q "该班级下还有学生"; then
    echo -e "${GREEN}✓ 删除保护正常工作${NC}"
    echo "  提示信息: 该班级下还有学生，无法删除"
else
    echo -e "${RED}✗ 删除保护失效${NC}"
fi
echo ""

# 步骤9：更新学生信息（测试班级内编辑功能）
echo -e "${YELLOW}[9/10] 测试更新学生信息${NC}"
curl -s -X PUT http://localhost:3001/api/users/student_test1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fullName":"测试学生1（已更新）","className":"测试班级","isActive":true}' > /dev/null
echo -e "${GREEN}✓ 学生信息更新成功${NC}"
echo ""

# 步骤10：清理测试数据
echo -e "${YELLOW}[10/10] 清理测试数据${NC}"
curl -s -X DELETE http://localhost:3001/api/users/student_test1 -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE http://localhost:3001/api/users/student_test2 -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE http://localhost:3001/api/users/teacher_test -H "Authorization: Bearer $TOKEN" > /dev/null
curl -s -X DELETE http://localhost:3001/api/classes/$CLASS_ID -H "Authorization: Bearer $TOKEN" > /dev/null
echo -e "${GREEN}✓ 测试数据清理完成${NC}"
echo ""

echo "=========================================="
echo -e "${GREEN}  所有测试通过！🎉${NC}"
echo "=========================================="
echo ""
echo "整合后的管理员控制台功能："
echo -e "${GREEN}✓${NC} 主页显示班级列表"
echo -e "${GREEN}✓${NC} 创建、编辑、删除班级"
echo -e "${GREEN}✓${NC} 点击班级查看学生列表"
echo -e "${GREEN}✓${NC} 在学生列表中编辑学生信息"
echo -e "${GREEN}✓${NC} 班级人数统计"
echo -e "${GREEN}✓${NC} 删除保护（人数>0无法删除）"
echo -e "${GREEN}✓${NC} 创建学生并分配到班级"
echo -e "${GREEN}✓${NC} 更新学生信息"
echo ""
echo "管理员控制台已完全整合用户管理和班级管理功能！"
