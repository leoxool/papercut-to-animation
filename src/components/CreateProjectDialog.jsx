import React, { useState } from 'react';

const CreateProjectDialog = ({ onClose, files = [], onCreate }) => {
    const [projectName, setProjectName] = useState('');
    const [includeFiles, setIncludeFiles] = useState(true);
    const [error, setError] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        setError('');

        const filesToInclude = includeFiles ? files.map(f => f.id) : [];

        try {
            onCreate(projectName, filesToInclude);
            onClose();
        } catch (err) {
            setError('创建项目失败，请重试');
            console.error('Create project error:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-6 w-[480px] border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-serif text-xl">创建新项目</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleCreate}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            项目名称
                        </label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            placeholder="输入项目名称（留空自动生成）"
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                            autoFocus
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            留空将自动生成项目名称
                        </p>
                    </div>

                    {files.length > 0 && (
                        <div className="mb-6">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={includeFiles}
                                    onChange={(e) => setIncludeFiles(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500"
                                />
                                <div>
                                    <div className="text-white text-sm font-medium">
                                        包含当前素材 ({files.length} 个)
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        将当前素材库中的所有素材添加到新项目
                                    </p>
                                </div>
                            </label>
                        </div>
                    )}

                    {error && (
                        <div className="text-red-400 text-sm mb-3">{error}</div>
                    )}

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition"
                        >
                            创建项目
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                        >
                            取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectDialog;
