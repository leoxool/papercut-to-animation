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
        if (!currentUser || !currentProject) return;

        const websocketUrl = `ws://localhost:8080/ws/${currentProject.id}/${currentUser.id}`;
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
    }, [currentUser, currentProject]);

    const handleWebSocketMessage = (data) => {
        switch (data.type) {
            case 'student_joined':
                setConnectedStudents(prev => [...prev, data.student]);
                break;
            case 'student_left':
                setConnectedStudents(prev => prev.filter(s => s.id !== data.studentId));
                break;
            case 'material_submitted':
                setSubmittedMaterials(prev => [data.material, ...prev]);
                break;
            case 'material_approved':
                // 教师批准素材后的处理
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
        const newClassroom = {
            id: Date.now(),
            code: classroomCode,
            teacherId: currentUser.id,
            projectId: currentProject?.id,
            active: true,
            students: [],
            createdAt: new Date().toISOString()
        };

        setClassroom(newClassroom);
        return newClassroom;
    }, [currentUser, currentProject]);

    // 学生通过口令加入教室
    const joinClassroom = useCallback((code) => {
        if (currentUser?.role !== 'student') {
            throw new Error('只有学生可以加入教室');
        }

        // TODO: 调用API验证口令
        const classroom = {
            id: Date.now(),
            code: code,
            teacherId: 'teacher-id',
            projectId: currentProject?.id,
            active: true,
            students: [currentUser],
            createdAt: new Date().toISOString()
        };

        setClassroom(classroom);
        return classroom;
    }, [currentUser, currentProject]);

    // 提交素材
    const submitMaterial = useCallback((material) => {
        if (!classroom || !currentUser) return;

        const submittedMaterial = {
            ...material,
            id: Date.now(),
            projectId: currentProject.id,
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
    }, [classroom, currentUser, currentProject, ws, isConnected]);

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
