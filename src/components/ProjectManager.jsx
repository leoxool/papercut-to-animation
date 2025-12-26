import React, { useState } from 'react';
import { useProject } from '../contexts/ProjectContext';

const ProjectManager = ({ onClose }) => {
    const {
        projects,
        currentProject,
        loadProject,
        deleteProject,
        renameProject,
        duplicateProject,
        getProjectStats
    } = useProject();

    const [renameProjectId, setRenameProjectId] = useState(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);

    const handleRename = (projectId) => {
        setRenameProjectId(projectId);
        const project = projects.find(p => p.id === projectId);
        setNewProjectName(project?.name || '');
    };

    const confirmRename = () => {
        if (renameProjectId && newProjectName.trim()) {
            renameProject(renameProjectId, newProjectName.trim());
            setRenameProjectId(null);
            setNewProjectName('');
        }
    };

    const handleDelete = (projectId) => {
        if (deleteConfirmId === projectId) {
            deleteProject(projectId);
            setDeleteConfirmId(null);
        } else {
            setDeleteConfirmId(projectId);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
            <div
                className="bg-slate-800 rounded-2xl p-6 w-[720px] max-h-[80vh] border border-slate-700 shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white font-serif text-xl">项目管理</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            共 {projects.length} 个项目
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                    {projects.length === 0 ? (
                        <div className="text-center text-slate-400 py-12">
                            <div className="text-4xl mb-4">📁</div>
                            <p className="mb-2">暂无项目</p>
                            <p className="text-xs opacity-75">创建您的第一个项目开始创作吧！</p>
                        </div>
                    ) : (
                        projects.map((project) => {
                            const stats = getProjectStats(project);
                            const isActive = currentProject?.id === project.id;

                            return (
                                <div
                                    key={project.id}
                                    className={`p-4 rounded-xl border transition-all ${
                                        isActive
                                            ? 'border-cyan-500 bg-cyan-900/20'
                                            : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 min-w-0">
                                            {renameProjectId === project.id ? (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <input
                                                        type="text"
                                                        value={newProjectName}
                                                        onChange={(e) => setNewProjectName(e.target.value)}
                                                        className="flex-1 px-3 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') confirmRename();
                                                            if (e.key === 'Escape') setRenameProjectId(null);
                                                        }}
                                                    />
                                                    <button
                                                        onClick={confirmRename}
                                                        className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs rounded transition"
                                                    >
                                                        ✓
                                                    </button>
                                                    <button
                                                        onClick={() => setRenameProjectId(null)}
                                                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="text-white font-medium truncate">
                                                        {project.name}
                                                    </h4>
                                                    {isActive && (
                                                        <span className="px-2 py-0.5 bg-cyan-600 text-white text-xs rounded-full">
                                                            当前
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-3 gap-4 text-xs">
                                                <div>
                                                    <span className="text-slate-400">素材数量</span>
                                                    <div className="text-white font-medium">{stats.fileCount}</div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">创建时间</span>
                                                    <div className="text-white font-medium">
                                                        {new Date(project.createdAt).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400">最后打开</span>
                                                    <div className="text-white font-medium">{stats.lastOpened}</div>
                                                </div>
                                            </div>

                                            <div className="text-xs text-slate-400 mt-2">
                                                创建于 {formatDate(project.createdAt)}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            <button
                                                onClick={() => loadProject(project.id)}
                                                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg transition"
                                            >
                                                打开
                                            </button>

                                            <button
                                                onClick={() => handleRename(project.id)}
                                                className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded-lg transition"
                                            >
                                                重命名
                                            </button>

                                            <button
                                                onClick={() => duplicateProject(project.id)}
                                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition"
                                            >
                                                复制
                                            </button>

                                            <button
                                                onClick={() => handleDelete(project.id)}
                                                className={`px-3 py-1.5 text-white text-sm rounded-lg transition ${
                                                    deleteConfirmId === project.id
                                                        ? 'bg-red-600 hover:bg-red-700'
                                                        : 'bg-slate-600 hover:bg-red-600'
                                                }`}
                                            >
                                                {deleteConfirmId === project.id ? '确认删除' : '删除'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectManager;
