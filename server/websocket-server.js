const WebSocket = require('ws');
const http = require('http');

const server = http.createServer();
const wss = new WebSocket.Server({ server });

// 存储连接的客户端
const clients = new Map(); // Map<projectId, Map<userId, WebSocket>>
const classrooms = new Map(); // Map<classroomId, {projectId, teacherId, students: []}>
const materials = new Map(); // Map<materialId, materialData>

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    // 解析URL参数：/ws/:projectId/:userId
    const url = new URL(req.url, 'http://localhost');
    const pathParts = url.pathname.split('/');
    const projectId = pathParts[2];
    const userId = pathParts[3];

    if (!projectId || !userId) {
        ws.close();
        return;
    }

    // 将客户端添加到项目房间
    if (!clients.has(projectId)) {
        clients.set(projectId, new Map());
    }
    clients.get(projectId).set(userId, ws);

    console.log(`Client ${userId} connected to project ${projectId}`);

    // 处理消息
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleMessage(ws, projectId, userId, data);
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });

    // 处理关闭
    ws.on('close', () => {
        console.log(`Client ${userId} disconnected from project ${projectId}`);
        const projectClients = clients.get(projectId);
        if (projectClients) {
            projectClients.delete(userId);
            if (projectClients.size === 0) {
                clients.delete(projectId);
            }
        }

        // 通知其他客户端该用户已离开
        broadcastToProject(projectId, {
            type: 'student_left',
            studentId: userId
        }, userId);
    });

    // 发送连接成功消息
    ws.send(JSON.stringify({
        type: 'connected',
        projectId,
        userId
    }));
});

function handleMessage(ws, projectId, userId, data) {
    switch (data.type) {
        case 'join_classroom':
            handleJoinClassroom(projectId, userId, data);
            break;
        case 'material_submitted':
            handleMaterialSubmitted(projectId, userId, data.material);
            break;
        case 'material_approved':
            handleMaterialApproved(projectId, userId, data.materialId);
            break;
        case 'material_rejected':
            handleMaterialRejected(projectId, userId, data.materialId);
            break;
        default:
            console.log('Unknown message type:', data.type);
    }
}

function handleJoinClassroom(projectId, userId, data) {
    const { classroomId } = data;

    if (!classrooms.has(classroomId)) {
        classrooms.set(classroomId, {
            projectId,
            teacherId: null,
            students: []
        });
    }

    const classroom = classrooms.get(classroomId);
    if (!classroom.students.includes(userId)) {
        classroom.students.push(userId);
    }

    // 通知所有客户端有新学生加入
    broadcastToProject(projectId, {
        type: 'student_joined',
        student: { id: userId },
        classroomId
    });

    console.log(`User ${userId} joined classroom ${classroomId}`);
}

function handleMaterialSubmitted(projectId, userId, material) {
    // 存储素材
    materials.set(material.id, material);

    // 查找该用户所在的教室
    let classroomId = null;
    for (const [id, classroom] of classrooms.entries()) {
        if (classroom.students.includes(userId)) {
            classroomId = id;
            break;
        }
    }

    if (!classroomId) {
        console.error('User not in any classroom');
        return;
    }

    // 推送给项目中的所有客户端
    broadcastToProject(projectId, {
        type: 'material_submitted',
        material: material
    });

    console.log(`Material ${material.id} submitted by ${userId}`);
}

function handleMaterialApproved(projectId, userId, materialId) {
    const material = materials.get(materialId);
    if (!material) return;

    material.status = 'approved';
    material.approvedAt = new Date().toISOString();

    // 通知所有客户端素材已批准
    broadcastToProject(projectId, {
        type: 'material_approved',
        materialId,
        material
    });

    console.log(`Material ${materialId} approved by ${userId}`);
}

function handleMaterialRejected(projectId, userId, materialId) {
    const material = materials.get(materialId);
    if (!material) return;

    material.status = 'rejected';
    material.rejectedAt = new Date().toISOString();

    // 通知所有客户端素材被拒绝
    broadcastToProject(projectId, {
        type: 'material_rejected',
        materialId,
        material
    });

    console.log(`Material ${materialId} rejected by ${userId}`);
}

function broadcastToProject(projectId, message, excludeUserId = null) {
    const projectClients = clients.get(projectId);
    if (!projectClients) return;

    const messageStr = JSON.stringify(message);
    projectClients.forEach((client, userId) => {
        if (userId !== excludeUserId && client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
        }
    });
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`WebSocket server is running on port ${PORT}`);
});
