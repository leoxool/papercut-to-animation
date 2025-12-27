# ArtClassroom 后端服务启动指南

## 🚀 快速启动

### 1. 安装依赖

```bash
# 进入服务器目录
cd server

# 安装依赖
npm install
```

### 2. 启动服务器

**方式一: 同时启动 API 和 WebSocket 服务器**
```bash
cd server
npm start
```

**方式二: 分别启动**
```bash
# 终端 1: 启动 API 服务器
cd server
npm run start:api

# 终端 2: 启动 WebSocket 服务器
cd server
npm run start:ws
```

### 3. 验证服务

访问以下 URL 验证服务状态：

- **API 服务器**: http://localhost:3001/health
- **WebSocket**: ws://localhost:8080

---

## 📡 API 服务详情

### 端口配置
- **API 服务器**: 3001
- **WebSocket 服务器**: 8080

### API 端点

#### 认证相关
```
POST /api/auth/register    # 用户注册
POST /api/auth/login       # 用户登录
GET  /api/auth/me          # 获取当前用户
PUT  /api/auth/me          # 更新用户信息
POST /api/auth/logout      # 用户登出
```

#### 用户管理
```
GET /api/users             # 获取用户列表 (需要教师权限)
```

### 示例请求

#### 注册用户
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "zhangsan",
    "email": "zhangsan@example.com",
    "password": "password123",
    "role": "teacher"
  }'
```

#### 登录
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "zhangsan@example.com",
    "password": "password123"
  }'
```

---

## 🔧 配置说明

### 环境变量

创建 `.env` 文件（可选）：

```env
PORT=3001
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
```

### 数据存储

**当前**: 内存存储（开发阶段）
- 数据存储在服务器内存中
- 重启服务器会丢失数据
- 适合开发和测试

**未来**: 数据库存储
- PostgreSQL / MySQL
- 数据持久化
- 支持大量用户

---

## 🛠️ 开发指南

### 添加新 API 端点

1. 在 `api-server.js` 中添加路由
2. 使用认证中间件 `authenticateToken` 保护需要登录的端点
3. 使用权限检查中间件 `checkRole()` 保护需要特定角色的端点

示例:
```javascript
// 添加新的路由
app.get('/api/projects', authenticateToken, (req, res) => {
    // 获取用户项目
    res.json({ projects: [] });
});

// 需要教师权限的路由
app.get('/api/users', authenticateToken, checkRole('teacher', 'admin'), (req, res) => {
    // 获取所有用户
    res.json({ users: [] });
});
```

### WebSocket 消息类型

当前支持的 WebSocket 消息：

```
validate_classroom    # 验证教室代码
create_classroom      # 创建教室
join_classroom        # 加入教室
material_submitted    # 提交素材
material_approved     # 批准素材
material_rejected     # 拒绝素材
```

---

## ❗ 注意事项

### 开发环境
1. **CORS**: 已配置允许 http://localhost:5173
2. **Token 过期**: 默认 24 小时
3. **密码**: 使用 bcrypt 加密（cost factor: 12）

### 生产环境
1. **更改 JWT_SECRET**: 使用强密码
2. **启用 HTTPS**: 配置 SSL 证书
3. **数据库**: 替换内存存储为真实数据库
4. **Rate Limiting**: 添加请求频率限制
5. **日志**: 添加访问日志和错误日志

---

## 🐛 故障排查

### 问题 1: API 服务器启动失败
```
Error: listen EADDRINUSE :::3001
```
**解决方案**: 端口被占用，更改端口或关闭占用进程
```bash
lsof -ti:3001 | xargs kill
```

### 问题 2: CORS 错误
```
Access to fetch at 'http://localhost:3001' from origin 'http://localhost:5173' has been blocked by CORS policy
```
**解决方案**: 检查 api-server.js 中的 CORS 配置

### 问题 3: Token 无效
```
Error: 令牌无效或已过期
```
**解决方案**: 重新登录获取新 token

### 问题 4: WebSocket 连接失败
```
WebSocket connection failed
```
**解决方案**: 确保 WebSocket 服务器在 8080 端口运行

---

## 📊 监控

### 健康检查
```bash
curl http://localhost:3001/health
```

响应示例:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### 日志
服务器启动时会显示详细日志：
- 新连接
- 消息接收
- 错误信息

---

## 🔐 安全建议

1. **密码策略**: 至少 8 位，包含大小写字母和数字
2. **Token 安全**: 使用强 JWT_SECRET，定期更换
3. **输入验证**: 所有 API 端点都要验证输入
4. **错误处理**: 不要在错误信息中暴露敏感信息
5. **HTTPS**: 生产环境必须启用 HTTPS

---

## 📈 性能优化

1. **连接池**: 使用数据库连接池
2. **缓存**: 缓存常用数据（Redis）
3. **压缩**: 启用 Gzip 压缩
4. **负载均衡**: 多实例部署

---

## 🎯 下一步

1. 集成真实数据库 (PostgreSQL/MySQL)
2. 添加用户头像上传
3. 实现文件存储 (S3/OSS)
4. 添加单元测试
5. 配置 Docker 容器化
6. 添加 CI/CD 流水线

---

**祝您开发顺利！** 🎉
