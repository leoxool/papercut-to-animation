import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ProjectContext = createContext();

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};

// 生成随机项目ID
const generateProjectId = () => {
    return 'proj_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 生成随机项目名
const generateRandomProjectName = () => {
    const adjectives = ['创意', '艺术', '梦幻', '色彩', '影像', '视觉', '灵感', '设计'];
    const nouns = ['项目', '作品', '创作', '设计', '项目', '集合'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${adj}${noun}${num}`;
};

export const ProjectProvider = ({ children, currentUser }) => {
    const [projects, setProjects] = useState([]);
    const [currentProject, setCurrentProject] = useState(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showProjectManager, setShowProjectManager] = useState(false);

    // 从 localStorage 加载用户项目
    useEffect(() => {
        if (currentUser?.id) {
            const savedProjects = localStorage.getItem(`papercut_projects_${currentUser.id}`);
            if (savedProjects) {
                try {
                    const projectsData = JSON.parse(savedProjects);
                    setProjects(projectsData);
                } catch (error) {
                    console.error('Error parsing saved projects:', error);
                    localStorage.removeItem(`papercut_projects_${currentUser.id}`);
                }
            }
        }
    }, [currentUser]);

    // 保存项目到 localStorage
    const saveProjects = useCallback((projectsData) => {
        if (currentUser?.id) {
            localStorage.setItem(`papercut_projects_${currentUser.id}`, JSON.stringify(projectsData));
        }
    }, [currentUser]);

    // 创建新项目
    const createProject = useCallback((name, files = []) => {
        const newProject = {
            id: generateProjectId(),
            name: name || generateRandomProjectName(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            files: files, // 存储素材ID列表
            settings: {
                defaultTolerance: 13,
                autoSave: true
            },
            stats: {
                totalFiles: files.length,
                totalEdits: 0,
                lastOpenedAt: null
            }
        };

        const updatedProjects = [...projects, newProject];
        setProjects(updatedProjects);
        saveProjects(updatedProjects);

        // 自动切换到新项目
        setCurrentProject(newProject);
        setShowCreateDialog(false);

        return newProject;
    }, [projects, saveProjects]);

    // 加载项目
    const loadProject = useCallback((projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            setCurrentProject(project);
            setShowProjectManager(false);

            // 更新最后打开时间
            const updatedProjects = projects.map(p =>
                p.id === projectId
                    ? { ...p, stats: { ...p.stats, lastOpenedAt: new Date().toISOString() } }
                    : p
            );
            setProjects(updatedProjects);
            saveProjects(updatedProjects);

            return project;
        }
        return null;
    }, [projects, saveProjects]);

    // 更新项目
    const updateProject = useCallback((projectId, updates) => {
        const updatedProjects = projects.map(p =>
            p.id === projectId
                ? { ...p, ...updates, updatedAt: new Date().toISOString() }
                : p
        );
        setProjects(updatedProjects);
        saveProjects(updatedProjects);

        // 更新当前项目
        if (currentProject?.id === projectId) {
            setCurrentProject(prev => ({ ...prev, ...updates }));
        }
    }, [projects, saveProjects, currentProject]);

    // 删除项目
    const deleteProject = useCallback((projectId) => {
        const updatedProjects = projects.filter(p => p.id !== projectId);
        setProjects(updatedProjects);
        saveProjects(updatedProjects);

        // 如果删除的是当前项目，切换到其他项目或清空
        if (currentProject?.id === projectId) {
            setCurrentProject(updatedProjects.length > 0 ? updatedProjects[0] : null);
        }
    }, [projects, saveProjects, currentProject]);

    // 添加文件到当前项目
    const addFileToProject = useCallback((fileId) => {
        if (!currentProject) return;

        const updatedFiles = [...(currentProject.files || []), fileId];
        updateProject(currentProject.id, { files: updatedFiles });
    }, [currentProject, updateProject]);

    // 从项目中移除文件
    const removeFileFromProject = useCallback((fileId) => {
        if (!currentProject) return;

        const updatedFiles = (currentProject.files || []).filter(id => id !== fileId);
        updateProject(currentProject.id, { files: updatedFiles });
    }, [currentProject, updateProject]);

    // 重命名项目
    const renameProject = useCallback((projectId, newName) => {
        updateProject(projectId, { name: newName });
    }, [updateProject]);

    // 复制项目
    const duplicateProject = useCallback((projectId) => {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            const newProject = {
                ...project,
                id: generateProjectId(),
                name: `${project.name} (副本)`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            const updatedProjects = [...projects, newProject];
            setProjects(updatedProjects);
            saveProjects(updatedProjects);
            return newProject;
        }
        return null;
    }, [projects, saveProjects]);

    // 获取项目统计信息
    const getProjectStats = useCallback((project) => {
        return {
            fileCount: project.files?.length || 0,
            createdDays: Math.floor((Date.now() - new Date(project.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
            lastOpened: project.stats?.lastOpenedAt ? new Date(project.stats.lastOpenedAt).toLocaleDateString() : '从未'
        };
    }, []);

    const value = {
        projects,
        currentProject,
        showCreateDialog,
        showProjectManager,
        setShowCreateDialog,
        setShowProjectManager,
        createProject,
        loadProject,
        updateProject,
        deleteProject,
        addFileToProject,
        removeFileFromProject,
        renameProject,
        duplicateProject,
        getProjectStats
    };

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};
