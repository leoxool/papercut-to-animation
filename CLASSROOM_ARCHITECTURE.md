# ArtClassroom - 教室协作创作平台架构设计

## 🎯 项目概述

ArtClassroom 是一个专为实体教室设计的协作创作平台，让教师和学生能够实时协作，共同创作动画作品。

### 核心特性

- **多用户协作**: 教师和学生可同时在线协作
- **教室隔离**: 4位数字口令确保同教室成员协作
- **实时同步**: WebSocket 实现毫秒级实时同步
- **权限分级**: 教师和学生拥有不同操作权限
- **实时预览**: 学生提交素材教师端立即可见

## 🏗️ 技术架构

### 前端架构（React）

```
src/
├── contexts/
│   ├── UserContext.jsx          # 用户认证和角色管理
│   ├── ProjectContext.jsx       # 项目状态管理
│   └── ClassroomContext.jsx     # 教室实时协作
├── components/
│   ├── Teacher/                 # 教师端组件
│   │   ├── TeacherDashboard.jsx     # 教师仪表板
│   │   ├── LivePreview.jsx          # 实时动画预览
│   │   └── StudentWorksViewer.jsx   # 学生作品查看器
│   ├── Student/                 # 学生端组件
│   │   └── StudentDashboard.jsx     # 学生仪表板
│   └── Shared/                  # 共享组件
├── hooks/
│   ├── useWebSocket.js          # WebSocket 通信
│   └── useRealtimeSync.js       # 实时同步
└── services/
    ├── websocket.js             # WebSocket 服务
    ├── api.js                   # REST API
    └── classroom.js             # 教室协作逻辑
```

### 后端架构（Node.js + WebSocket）

```
server/
├── websocket-server.js          # WebSocket 服务器
├── models/
│   ├── User.js                  # 用户模型
│   ├── Classroom.js             # 教室模型
│   ├── Project.js               # 项目模型
│   └── Material.js              # 素材模型
├── routes/
│   ├── auth.js                  # 认证路由
│   ├── classroom.js             # 教室路由
│   ├── project.js               # 项目路由
│   └── material.js              # 素材路由
└── services/
    ├── ClassroomService.js      # 教室管理
    ├── ProjectService.js        # 项目管理
    ├── MaterialService.js       # 素材管理
    └── WebSocketService.js      # 实时通信
```

## 👥 用户系统

### 用户角色

#### 教师（Teacher）
- 创建集体创作项目
- 生成4位数字教室代码
- 查看和审核学生提交的作品
- 实时预览动画效果
- 批准/拒绝学生素材

#### 学生（Student）
- 通过4位数字口令加入教室
- 采集和编辑素材
- 提交素材给教师审核
- 查看自己的提交记录

### 权限控制

| 功能 | 教师 | 学生 |
|------|------|------|
| 创建项目 | ✅ | ❌ |
| 生成教室代码 | ✅ | ❌ |
| 采集素材 | ✅ | ✅ |
| 审核素材 | ✅ | ❌ |
| 提交素材 | ✅ | ✅ |
| 实时预览 | ✅ | ❌ |

## 🏫 教室协作流程

### 1. 教师创建教室
```javascript
const classroom = createClassroom();
// 生成4位数字代码，例如: 1234
```

### 2. 学生加入教室
```javascript
const classroom = joinClassroom('1234');
// 输入4位数字代码加入
```

### 3. 素材提交流程
```
学生端: 采集素材 → 编辑 → 提交 → 等待审核
  ↓
WebSocket: 实时推送给教师端
  ↓
教师端: 接收素材 → 审核 → 批准/拒绝
  ↓
实时预览: 批准后立即在动画中显示
```

## 🔄 实时通信

### WebSocket 事件

#### 连接事件
- `connected`: 客户端连接成功
- `student_joined`: 学生加入教室
- `student_left`: 学生离开教室

#### 素材事件
- `material_submitted`: 学生提交素材
- `material_approved`: 教师批准素材
- `material_rejected`: 教师拒绝素材

### 消息格式

```javascript
// 提交素材
{
    type: 'material_submitted',
    material: {
        id: 'mat_123',
        projectId: 'proj_456',
        studentId: 'user_789',
        studentName: '张三',
        originalUrl: '...',
        processedUrl: '...',
        status: 'submitted',
        submittedAt: '2024-01-01T00:00:00Z'
    }
}

// 批准素材
{
    type: 'material_approved',
    materialId: 'mat_123'
}
```

## 💾 数据模型

### 用户模型
```javascript
{
    _id: ObjectId,
    username: String,
    role: 'teacher' | 'student',
    classroom: String,        // 教室编号
    createdAt: Date
}
```

### 教室模型
```javascript
{
    _id: ObjectId,
    code: String,             // 4位数字口令
    teacherId: ObjectId,
    projectId: ObjectId,
    active: Boolean,
    students: [ObjectId],     // 学生ID列表
    createdAt: Date
}
```

### 项目模型
```javascript
{
    _id: ObjectId,
    name: String,
    teacherId: ObjectId,
    classroomCode: String,
    materials: [ObjectId],    // 素材ID列表
    status: 'active' | 'completed',
    createdAt: Date
}
```

### 素材模型
```javascript
{
    _id: ObjectId,
    projectId: ObjectId,
    studentId: ObjectId,
    originalUrl: String,
    processedUrl: String,
    tolerance: Number,
    status: 'draft' | 'submitted' | 'approved' | 'rejected',
    submittedAt: Date,
    approvedAt: Date
}
```

## 🚀 部署架构

### 开发环境
```
前端: Vite Dev Server (http://localhost:5173)
后端: WebSocket Server (ws://localhost:8080)
```

### 生产环境
```
前端: Nginx / Apache
后端: Node.js + WebSocket
数据库: MongoDB / PostgreSQL
```

## 🔧 安装和运行

### 前端
```bash
npm install
npm run dev
```

### 后端
```bash
cd server
npm install
npm start
```

## 📊 功能状态

### ✅ 已完成
- [x] 用户系统基础架构
- [x] 项目管理功能
- [x] 教室协作上下文（ClassroomContext）
- [x] 教师端仪表板
- [x] 学生端仪表板
- [x] 实时动画预览
- [x] 学生作品查看器
- [x] WebSocket 服务器

### 🚧 开发中
- [ ] 素材库管理系统
- [ ] 数据库集成
- [ ] 动画系统升级
- [ ] 导出系统

### 📋 待开发
- [ ] 多用户系统
- [ ] 教室管理后台
- [ ] 作品评分系统
- [ ] 历史记录查看
- [ ] 批量操作功能

## 🎨 UI/UX 设计原则

1. **清晰的角色区分**: 教师端和学生端界面明显不同
2. **实时反馈**: 所有操作都有即时的视觉反馈
3. **简化操作**: 减少不必要的步骤，提高效率
4. **状态可见**: 清楚显示当前状态（待审核、已通过等）
5. **错误处理**: 友好的错误提示和恢复机制

## 🔐 安全考虑

1. **教室隔离**: 4位数字代码确保只有同教室成员能加入
2. **权限控制**: 严格区分教师和学生权限
3. **数据验证**: 前后端双重数据验证
4. **连接限制**: 防止恶意连接和刷屏

## 📈 性能优化

1. **WebSocket 连接池**: 复用连接减少资源消耗
2. **素材压缩**: 智能压缩减少传输大小
3. **懒加载**: 按需加载组件和资源
4. **缓存策略**: 合理缓存减少重复请求

## 🐛 问题排查

### 常见问题

1. **WebSocket 连接失败**
   - 检查端口是否被占用
   - 确认防火墙设置
   - 验证URL格式

2. **素材提交失败**
   - 检查网络连接
   - 确认用户权限
   - 验证数据格式

3. **实时同步延迟**
   - 检查服务器性能
   - 优化消息队列
   - 调整心跳间隔

## 📞 支持

如有问题，请提交 Issue 或联系开发团队。

---

**ArtClassroom Team** - 让协作创作更简单
