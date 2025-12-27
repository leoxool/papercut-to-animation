# ArtClassroom 数据库设计文档

## 📋 当前状态 vs 目标状态

### 当前（原型阶段）
- **用户数据**: localStorage（客户端）
- **项目数据**: localStorage（客户端）
- **素材存储**: localStorage（base64）
- **教室数据**: 服务器内存（重启丢失）
- **认证系统**: 无密码验证

### 目标（生产阶段）
- **用户数据**: PostgreSQL/MySQL 数据库
- **项目数据**: 数据库 + 文件存储
- **素材存储**: 文件系统或云存储（S3/OSS）
- **教室数据**: 数据库持久化
- **认证系统**: JWT + 密码哈希

---

## 🗄️ 数据库表结构设计

### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('teacher', 'student', 'admin')),
    full_name VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb
);
```

**字段说明**:
- `id`: UUID主键（推荐使用UUID而非自增ID，更安全）
- `password_hash`: bcrypt/scrypt哈希后的密码
- `role`: 用户角色（教师/学生/管理员）
- `settings`: JSON格式存储用户偏好设置

### 2. 项目表 (projects)
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb
);
```

### 3. 素材文件表 (files)
```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploader_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    original_filename VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    width INTEGER,
    height INTEGER,
    thumbnail_path VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);
```

### 4. 教室表 (classrooms)
```sql
CREATE TABLE classrooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(10) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);
```

### 5. 教室学生关联表 (classroom_students)
```sql
CREATE TABLE classroom_students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expelled')),
    UNIQUE(classroom_id, student_id)
);
```

### 6. 提交素材表 (materials)
```sql
CREATE TABLE materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'approved', 'rejected')),
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    rejected_at TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);
```

### 7. 动画脚本表 (animations)
```sql
CREATE TABLE animations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    script_data JSONB NOT NULL,
    is_published BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 8. 用户会话表 (user_sessions)
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    refresh_token_hash VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);
```

### 9. 教师管理表 (teacher_student_relations)
```sql
CREATE TABLE teacher_student_relations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(teacher_id, student_id)
);
```

---

## 🔐 认证系统设计

### JWT Token 结构
```javascript
{
  "sub": "user-uuid",
  "username": "zhangsan",
  "role": "teacher",
  "iat": 1640995200,
  "exp": 1641002400,
  "permissions": ["create_classroom", "approve_material", ...]
}
```

### 密码策略
- **最低长度**: 8字符
- **必须包含**: 大写字母、小写字母、数字
- **可选**: 特殊字符
- **哈希算法**: bcrypt (cost factor: 12)

### 权限矩阵
| 权限 | 教师 | 学生 | 管理员 |
|------|------|------|--------|
| 创建教室 | ✅ | ❌ | ✅ |
| 加入教室 | ❌ | ✅ | ✅ |
| 审核素材 | ✅ | ❌ | ✅ |
| 提交素材 | ❌ | ✅ | ✅ |
| 查看学生列表 | ✅ | ❌ | ✅ |
| 管理项目 | ✅ | ❌ | ✅ |
| 导出动画 | ✅ | ❌ | ✅ |
| 管理用户 | ❌ | ❌ | ✅ |

---

## 📁 文件存储方案

### 本地开发环境
```
/storage/
  /avatars/          # 用户头像
  /files/            # 素材文件
  /thumbnails/       # 缩略图
  /exports/          # 导出的动画
```

### 生产环境
- **对象存储**: AWS S3 / 阿里云 OSS / 腾讯云 COS
- **CDN**: CloudFront / 阿里云 CDN（加速素材加载）
- **缩略图**: 实时生成或预生成

---

## 🔄 数据迁移策略

### 阶段1: 保留 localStorage 作为缓存
1. 新用户注册 → 数据库
2. 登录 → 从数据库验证 + localStorage缓存
3. 数据修改 → 数据库 + localStorage同步

### 阶段2: 移除 localStorage
1. 所有数据操作通过 API
2. WebSocket 实时同步
3. localStorage 仅存储会话token

---

## 🛠️ 技术栈推荐

### 后端
- **数据库**: PostgreSQL (推荐) / MySQL
- **ORM**: Prisma / TypeORM
- **API**: Express.js / Fastify
- **认证**: JWT + bcrypt
- **文件上传**: Multer (本地) / AWS SDK (云存储)
- **实时通信**: Socket.io

### 前端
- **状态管理**: 保持 React Context + useReducer
- **HTTP客户端**: Axios
- **认证**: React Query + 持久化token
- **文件管理**: 拖拽上传 + 进度显示

### DevOps
- **容器化**: Docker + Docker Compose
- **数据库**: PostgreSQL Docker 镜像
- **部署**: Nginx 反向代理
- **监控**: PM2 (进程管理)

---

## 📝 API 端点设计

### 认证相关
```
POST   /api/auth/register        # 注册
POST   /api/auth/login           # 登录
POST   /api/auth/logout          # 登出
POST   /api/auth/refresh         # 刷新token
GET    /api/auth/me              # 获取当前用户信息
PUT    /api/auth/me              # 更新用户信息
```

### 用户管理
```
GET    /api/users                # 获取用户列表 (教师用)
GET    /api/users/:id            # 获取用户详情
POST   /api/users                # 创建用户 (管理员)
PUT    /api/users/:id            # 更新用户
DELETE /api/users/:id            # 删除用户
```

### 项目管理
```
GET    /api/projects             # 获取项目列表
POST   /api/projects             # 创建项目
GET    /api/projects/:id         # 获取项目详情
PUT    /api/projects/:id         # 更新项目
DELETE /api/projects/:id         # 删除项目
```

### 教室管理
```
POST   /api/classrooms           # 创建教室
GET    /api/classrooms/:code     # 通过代码查找教室
POST   /api/classrooms/:id/join  # 加入教室
GET    /api/classrooms/:id/students  # 获取学生列表
POST   /api/classrooms/:id/approve/:materialId  # 批准素材
```

---

## 🎯 实施优先级

### 优先级1: 核心认证系统
1. 用户注册/登录 API
2. JWT 认证中间件
3. 密码哈希
4. 前端登录页面

### 优先级2: 数据库集成
1. 设置 PostgreSQL
2. 创建表结构
3. 实现数据访问层
4. 迁移现有数据

### 优先级3: 文件存储
1. 文件上传 API
2. 缩略图生成
3. 文件管理界面

### 优先级4: 教师管理功能
1. 学生列表管理
2. 教室管理界面
3. 批量操作

---

## 💡 优势

### 安全性
- 密码哈希存储，无法明文获取
- JWT token 过期机制
- 权限控制到API级别
- SQL注入防护（ORM参数化查询）

### 可扩展性
- 数据库支持大量用户
- 水平扩展（读写分离）
- 微服务架构友好

### 功能丰富
- 教师可以管理多个学生
- 学生素材库持久化
- 动画脚本版本管理
- 项目协作历史

### 数据完整性
- 外键约束
- 事务支持
- 数据备份和恢复

---

## ⚠️ 注意事项

1. **渐进式迁移**: 不要一次性重构，先保留 localStorage 作为缓存
2. **向后兼容**: 新系统要能导入旧系统的 localStorage 数据
3. **性能优化**: 对常用查询添加索引
4. **数据备份**: 定期自动备份数据库
5. **监控告警**: 监控数据库性能和磁盘使用

---

## 📊 成本估算

### 开发时间
- **阶段1 (认证系统)**: 2-3周
- **阶段2 (数据库)**: 3-4周
- **阶段3 (文件存储)**: 2-3周
- **阶段4 (管理功能)**: 2-3周
- **总计**: 9-13周

### 运营成本 (月)
- **数据库**: $50-200 (根据用户量)
- **文件存储**: $20-100 (根据素材量)
- **CDN**: $10-50 (可选)
- **服务器**: $100-500
- **总计**: $180-850/月

---

**结论**: 使用数据库和认证系统是必要的，特别是对于教室环境。我们应该采用渐进式迁移策略，先实现核心认证功能，然后逐步迁移数据存储。
