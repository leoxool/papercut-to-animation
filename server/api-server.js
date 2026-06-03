const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./db');

// 配置
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors({
    origin: (origin, callback) => {
        // 允许没有 origin 的请求（如移动应用或 Postman）
        if (!origin) return callback(null, true);

        const allowedOrigins = [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
            `http://localhost:${PORT}`,
            `http://127.0.0.1:${PORT}`
        ];

        // 允许所有局域网地址访问（开发环境）
        if (origin.match(/^http:\/\/\d+\.\d+\.\d+\.\d+:\d+$/)) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        const msg = 'CORS 策略不允许此来源';
        return callback(new Error(msg), false);
    },
    credentials: true
}));
app.use(express.json());

// 模拟数据库（内存存储 - 开发阶段）
// 实际项目中应该使用真实的数据库
const users = new Map(); // Map<username, userData>
const userSessions = new Map(); // Map<userId, sessionData>
const classes = new Map(); // Map<classId, classData>

// 班级模型
class Class {
    constructor({ name, description, teacherId }) {
        this.id = uuidv4();
        this.name = name;
        this.description = description || '';
        this.teacherId = teacherId || null;
        this.studentCount = 0;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            teacherId: this.teacherId,
            studentCount: this.studentCount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

// 预设管理员账户（从 Supabase 迁移后暂时保留，用于初始化）
async function ensureDefaultAdmin() {
    try {
        const existingAdmin = await db.getUserByUsername('LEO');
        if (!existingAdmin) {
            const passwordHash = bcrypt.hashSync('Xmmsggbbhahaha', 12);
            await db.createUser({
                username: 'LEO',
                password_hash: passwordHash,
                role: 'admin',
                full_name: '系统管理员'
            });
            console.log(`✅ 默认管理员账户已创建: LEO`);
        }
    } catch (error) {
        console.error('创建默认管理员失败:', error.message);
    }
}

// 用户模型
class User {
    constructor({ username, password, role, fullName, className }) {
        this.id = uuidv4();
        this.username = username;
        this.passwordHash = bcrypt.hashSync(password, 12);
        this.role = role || 'student'; // 'admin', 'teacher', 'student'
        this.fullName = fullName || username;
        this.className = className || null; // 学生所属班级
        this.avatarUrl = null;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        this.lastLoginAt = null;
        this.isActive = true;
        this.settings = {};
    }

    toJSON() {
        const { passwordHash, ...user } = this;
        return user;
    }

    comparePassword(password) {
        return bcrypt.compare(password, this.passwordHash);
    }
}

// JWT Token 生成
function generateToken(user) {
    return jwt.sign(
        {
            sub: user.id,
            username: user.username,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// 认证中间件
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: '令牌无效或已过期' });
        }
        req.user = user;
        next();
    });
}

// 权限检查中间件
function checkRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '未认证' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: '权限不足' });
        }
        next();
    };
}

// ============ 认证相关路由 ============

// 管理员创建用户
app.post('/api/users', async (req, res) => {
    try {
        const { username, password, role, fullName, className } = req.body;

        // 验证输入
        if (!username || !password || !role) {
            return res.status(400).json({ error: '用户名、密码和角色不能为空' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: '密码长度至少8位' });
        }

        if (!['admin', 'teacher', 'student'].includes(role)) {
            return res.status(400).json({ error: '角色必须是 admin、teacher 或 student' });
        }

        // 检查用户名是否已存在
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(409).json({ error: '用户名已存在' });
        }

        // 创建用户
        const passwordHash = bcrypt.hashSync(password, 12);
        const user = await db.createUser({
            username,
            password_hash: passwordHash,
            role,
            full_name: fullName || username,
            class_name: role === 'student' ? className : null
        });

        res.status(201).json({
            message: '用户创建成功',
            user: user[0]
        });

    } catch (error) {
        console.error('创建用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 用户登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 验证输入
        if (!username || !password) {
            return res.status(400).json({ error: '用户名和密码不能为空' });
        }

        // 查找用户
        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 检查用户状态
        if (!user.isActive) {
            return res.status(403).json({ error: '账号已被禁用' });
        }

        // 验证密码
        const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }

        // 更新最后登录时间
        await db.updateUser(user.id, { last_login_at: new Date().toISOString() });

        // 生成Token
        const token = jwt.sign(
            { sub: user.id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            message: '登录成功',
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.full_name,
                className: user.class_name,
                avatarUrl: user.avatar_url,
                settings: user.settings,
                isActive: user.is_active,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at
            },
            token
        });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const user = await db.getUserById(req.user.sub);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        res.json({
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                fullName: user.full_name,
                className: user.class_name,
                avatarUrl: user.avatar_url,
                settings: user.settings,
                isActive: user.is_active,
                createdAt: user.created_at,
                lastLoginAt: user.last_login_at
            }
        });

    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新用户信息
app.put('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const { fullName, settings, className } = req.body;
        const user = await db.getUserById(req.user.sub);

        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const updates = { updated_at: new Date().toISOString() };
        if (fullName) updates.full_name = fullName;
        if (settings) updates.settings = { ...user.settings, ...settings };
        if (className && user.role === 'student') updates.class_name = className;

        const updated = await db.updateUser(user.id, updates);

        res.json({
            message: '更新成功',
            user: updated[0]
        });

    } catch (error) {
        console.error('更新用户信息错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 用户登出
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    res.json({ message: '登出成功' });
});

// ============ 用户管理路由（管理员） ============

// 获取所有用户列表（需要管理员权限）
app.get('/api/users', authenticateToken, checkRole('admin'), async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json({ users });
    } catch (error) {
        console.error('获取用户列表错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除用户（需要管理员权限）
app.delete('/api/users/:username', authenticateToken, checkRole('admin'), async (req, res) => {
    try {
        const { username } = req.params;
        const user = await db.getUserByUsername(username);

        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        await db.deleteUser(user.id);
        res.json({ message: '用户已删除' });

    } catch (error) {
        console.error('删除用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新用户信息（需要管理员权限）
app.put('/api/users/:username', authenticateToken, checkRole('admin'), async (req, res) => {
    try {
        const { username } = req.params;
        const { password, fullName, className, role, isActive } = req.body;

        const user = await db.getUserByUsername(username);
        if (!user) {
            return res.status(404).json({ error: '用户不存在' });
        }

        const updates = { updated_at: new Date().toISOString() };
        if (password) updates.password_hash = bcrypt.hashSync(password, 12);
        if (fullName) updates.full_name = fullName;
        if (className && user.role === 'student') updates.class_name = className;
        if (role && ['admin', 'teacher', 'student'].includes(role)) updates.role = role;
        if (typeof isActive === 'boolean') updates.is_active = isActive;

        const updated = await db.updateUser(user.id, updates);

        res.json({
            message: '用户信息已更新',
            user: updated[0]
        });

    } catch (error) {
        console.error('更新用户错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// ============ 班级管理路由（管理员） ============

// 创建班级（需要管理员权限）
app.post('/api/classes', authenticateToken, checkRole('admin'), (req, res) => {
    try {
        const { name, description, teacherId } = req.body;

        // 验证输入
        if (!name) {
            return res.status(400).json({ error: '班级名称不能为空' });
        }

        // 检查班级名是否已存在
        for (const cls of classes.values()) {
            if (cls.name === name) {
                return res.status(409).json({ error: '班级名称已存在' });
            }
        }

        // 如果指定了教师ID，验证教师是否存在
        if (teacherId) {
            let teacherExists = false;
            for (const [username, user] of users.entries()) {
                if (user.id === teacherId && user.role === 'teacher') {
                    teacherExists = true;
                    break;
                }
            }
            if (!teacherExists) {
                return res.status(404).json({ error: '指定的教师不存在' });
            }
        }

        // 创建班级
        const cls = new Class({ name, description, teacherId });
        classes.set(cls.id, cls);

        res.status(201).json({
            message: '班级创建成功',
            class: cls.toJSON()
        });

    } catch (error) {
        console.error('创建班级错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 获取所有班级列表（需要管理员权限）
app.get('/api/classes', authenticateToken, checkRole('admin'), (req, res) => {
    try {
        const classList = Array.from(classes.values()).map(cls => {
            // 计算每个班级的学生数量
            let studentCount = 0;
            for (const user of users.values()) {
                if (user.role === 'student' && user.className === cls.name) {
                    studentCount++;
                }
            }
            return {
                ...cls.toJSON(),
                studentCount
            };
        });
        res.json({ classes: classList });
    } catch (error) {
        console.error('获取班级列表错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 删除班级（需要管理员权限）
app.delete('/api/classes/:classId', authenticateToken, checkRole('admin'), (req, res) => {
    try {
        const { classId } = req.params;

        if (!classes.has(classId)) {
            return res.status(404).json({ error: '班级不存在' });
        }

        // 检查班级是否有关联学生
        const cls = classes.get(classId);
        for (const user of users.values()) {
            if (user.role === 'student' && user.className === cls.name) {
                return res.status(400).json({ error: '该班级下还有学生，无法删除' });
            }
        }

        classes.delete(classId);
        res.json({ message: '班级已删除' });

    } catch (error) {
        console.error('删除班级错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// 更新班级信息（需要管理员权限）
app.put('/api/classes/:classId', authenticateToken, checkRole('admin'), (req, res) => {
    try {
        const { classId } = req.params;
        const { name, description, teacherId } = req.body;

        const cls = classes.get(classId);
        if (!cls) {
            return res.status(404).json({ error: '班级不存在' });
        }

        // 更新字段
        if (name && name !== cls.name) {
            // 检查新名称是否已存在
            for (const [id, existingCls] of classes.entries()) {
                if (id !== classId && existingCls.name === name) {
                    return res.status(409).json({ error: '班级名称已存在' });
                }
            }
            cls.name = name;
        }

        if (description !== undefined) cls.description = description;

        if (teacherId !== undefined) {
            if (teacherId) {
                // 验证教师是否存在
                let teacherExists = false;
                for (const [username, user] of users.entries()) {
                    if (user.id === teacherId && user.role === 'teacher') {
                        teacherExists = true;
                        break;
                    }
                }
                if (!teacherExists) {
                    return res.status(404).json({ error: '指定的教师不存在' });
                }
            }
            cls.teacherId = teacherId;
        }

        cls.updatedAt = new Date().toISOString();

        // 计算学生数量
        let studentCount = 0;
        for (const user of users.values()) {
            if (user.role === 'student' && user.className === cls.name) {
                studentCount++;
            }
        }

        res.json({
            message: '班级信息已更新',
            class: {
                ...cls.toJSON(),
                studentCount
            }
        });

    } catch (error) {
        console.error('更新班级错误:', error);
        res.status(500).json({ error: '服务器内部错误' });
    }
});

// ============ 健康检查 ============

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============ 错误处理 ============

// 404 处理
app.use((req, res) => {
    res.status(404).json({ error: '接口不存在' });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

// ============ 启动服务器 ============

app.listen(PORT, '0.0.0.0', async () => {
    // 创建默认管理员账户
    await ensureDefaultAdmin();

    console.log(`================================================`);
    console.log(`   ArtClassroom API 服务器`);
    console.log(`================================================`);
    console.log(`📡 本地访问: http://localhost:${PORT}`);
    console.log(`🌐 局域网访问: http://[你的IP]:${PORT}`);
    console.log(`🔗 CORS 允许: http://localhost:5173`);
    console.log(`🗄️  存储方式: Supabase REST API`);
    console.log(`🔐 JWT 过期时间: ${JWT_EXPIRES_IN}`);
    console.log(`================================================`);
    console.log(`✅ 服务器启动成功！`);
    console.log(`\n可用的 API 端点:`);
    console.log(`  POST /api/users         - 创建用户 (需要管理员权限)`);
    console.log(`  POST /api/auth/login    - 用户登录`);
    console.log(`  GET  /api/auth/me       - 获取当前用户`);
    console.log(`  PUT  /api/auth/me       - 更新用户信息`);
    console.log(`  POST /api/auth/logout   - 用户登出`);
    console.log(`  GET  /api/users         - 获取用户列表 (需要管理员权限)`);
    console.log(`  DELETE /api/users/:username - 删除用户 (需要管理员权限)`);
    console.log(`  PUT /api/users/:username - 更新用户 (需要管理员权限)`);
    console.log(`  POST /api/classes       - 创建班级 (需要管理员权限)`);
    console.log(`  GET  /api/classes       - 获取班级列表 (需要管理员权限)`);
    console.log(`  DELETE /api/classes/:classId - 删除班级 (需要管理员权限)`);
    console.log(`  PUT /api/classes/:classId - 更新班级 (需要管理员权限)`);
    console.log(`  GET  /health            - 健康检查`);
    console.log(`\n🔑 默认管理员账户:`);
    console.log(`   用户名: LEO`);
    console.log(`   密码: Xmmsggbbhahaha`);
    console.log(`\n⚠️  注意: 当前使用内存存储，重启服务器数据会丢失`);
    console.log(`    生产环境请集成真实数据库`);
    console.log(`\n`);
});

module.exports = app;
