import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ClassroomContext = createContext();

export const useClassroom = () => {
    const context = useContext(ClassroomContext);
    if (!context) {
        throw new Error('useClassroom must be used within a ClassroomProvider');
    }
    return context;
};

// 生成4位数字教室代码
const generateClassroomCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

export const ClassroomProvider = ({ children, currentUser, currentProject }) => {
    const [classroom, setClassroom] = useState(null);
    const [connectedStudents, setConnectedStudents] = useState([]);
    const [submittedMaterials, setSubmittedMaterials] = useState([]);
    const [ws, setWs] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // WebSocket 连接
    useEffect(() => {
        if (!currentUser) return;

        // 动态获取 WebSocket URL
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        // 如果没有项目，使用 'default' 作为项目ID
        const projectId = currentProject?.id || 'default';
        const websocketUrl = `${protocol}//${host}:8080/ws/${projectId}/${currentUser.id}`;
        console.log('Connecting to WebSocket:', websocketUrl);

        const websocket = new WebSocket(websocketUrl);

        websocket.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            setWs(websocket);
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
        };

        websocket.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            setWs(null);
        };

        return () => {
            websocket.close();
        };
    }, [currentUser, currentProject?.id]);

    const handleWebSocketMessage = (data) => {
        console.log('WebSocket message received:', data);

        switch (data.type) {
            case 'connected':
                console.log('WebSocket connected successfully');
                break;
            case 'student_joined':
                console.log('Student joined:', data.student);
                setConnectedStudents(prev => {
                    // 避免重复添加
                    if (prev.some(s => s.id === data.student.id)) {
                        return prev;
                    }
                    return [...prev, data.student];
                });
                break;
            case 'student_left':
                console.log('Student left:', data.studentId);
                setConnectedStudents(prev => prev.filter(s => s.id !== data.studentId));
                break;
            case 'material_submitted':
                console.log('Material submitted:', data.material);
                setSubmittedMaterials(prev => [data.material, ...prev]);
                break;
            case 'material_approved':
                console.log('Material approved:', data.materialId);
                // 教师批准素材后的处理
                break;
            case 'classroom_created':
                console.log('Classroom created:', data);
                break;
            default:
                break;
        }
    };

    // 教师创建教室
    const createClassroom = useCallback(() => {
        if (currentUser?.role !== 'teacher') {
            throw new Error('只有教师可以创建教室');
        }

        const classroomCode = generateClassroomCode();
        const projectId = currentProject?.id || 'default';
        const newClassroom = {
            id: Date.now(),
            code: classroomCode,
            teacherId: currentUser.id,
            projectId: projectId,
            active: true,
            students: [],
            createdAt: new Date().toISOString()
        };

        setClassroom(newClassroom);

        // 通知服务器创建教室
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'create_classroom',
                code: classroomCode,
                teacherId: currentUser.id,
                projectId: projectId
            }));
        }

        return newClassroom;
    }, [currentUser, currentProject?.id, ws, isConnected]);

    // 学生通过口令加入教室
    const joinClassroom = useCallback((code) => {
        return new Promise((resolve, reject) => {
            if (currentUser?.role !== 'student') {
                reject(new Error('只有学生可以加入教室'));
                return;
            }

            if (!ws || !isConnected) {
                reject(new Error('WebSocket未连接，请稍后重试'));
                return;
            }

            // 等待服务器响应验证结果
            const timeout = setTimeout(() => {
                reject(new Error('验证超时，请检查网络连接'));
            }, 5000);

            const handleMessage = (event) => {
                const data = JSON.parse(event.data);

                // 监听教室验证结果
                if (data.type === 'classroom_validated') {
                    clearTimeout(timeout);
                    ws.removeEventListener('message', handleMessage);

                    if (data.valid) {
                        // 验证成功，创建教室对象并加入
                        const projectId = currentProject?.id || 'default';
                        const classroom = {
                            id: data.classroomId,
                            code: code,
                            teacherId: data.teacherId,
                            projectId: projectId,
                            active: true,
                            students: [currentUser],
                            createdAt: new Date().toISOString()
                        };

                        setClassroom(classroom);

                        // 发送加入教室消息
                        ws.send(JSON.stringify({
                            type: 'join_classroom',
                            classroomId: data.classroomId,
                            userId: currentUser.id
                        }));

                        resolve(classroom);
                    } else {
                        reject(new Error('教室代码不存在或已失效'));
                    }
                }
            };

            ws.addEventListener('message', handleMessage);

            // 发送验证请求
            ws.send(JSON.stringify({
                type: 'validate_classroom',
                code: code,
                userId: currentUser.id
            }));
        });
    }, [currentUser, currentProject, ws, isConnected]);

    // 提交素材
    const submitMaterial = useCallback((material) => {
        if (!classroom || !currentUser) return;

        const projectId = currentProject?.id || 'default';
        const submittedMaterial = {
            ...material,
            id: Date.now(),
            projectId: projectId,
            studentId: currentUser.id,
            studentName: currentUser.username,
            status: 'submitted',
            submittedAt: new Date().toISOString()
        };

        // 通过WebSocket实时推送给教师
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'material_submitted',
                material: submittedMaterial
            }));
        }

        setSubmittedMaterials(prev => [submittedMaterial, ...prev]);
        return submittedMaterial;
    }, [classroom, currentUser, currentProject?.id, ws, isConnected]);

    // 教师批准素材
    const approveMaterial = useCallback((materialId) => {
        setSubmittedMaterials(prev =>
            prev.map(m =>
                m.id === materialId
                    ? { ...m, status: 'approved', approvedAt: new Date().toISOString() }
                    : m
            )
        );

        // 通知学生素材已批准
        if (ws && isConnected) {
            ws.send(JSON.stringify({
                type: 'material_approved',
                materialId: materialId
            }));
        }
    }, [ws, isConnected]);

    // 获取当前教室的学生列表
    const getClassroomStudents = useCallback(() => {
        return classroom?.students || [];
    }, [classroom]);

    // 获取待审核素材
    const getPendingMaterials = useCallback(() => {
        return submittedMaterials.filter(m => m.status === 'submitted');
    }, [submittedMaterials]);

    // 获取已批准素材
    const getApprovedMaterials = useCallback(() => {
        return submittedMaterials.filter(m => m.status === 'approved');
    }, [submittedMaterials]);

    const value = {
        classroom,
        connectedStudents,
        submittedMaterials,
        isConnected,
        createClassroom,
        joinClassroom,
        submitMaterial,
        approveMaterial,
        getClassroomStudents,
        getPendingMaterials,
        getApprovedMaterials
    };

    return (
        <ClassroomContext.Provider value={value}>
            {children}
        </ClassroomContext.Provider>
    );
};
