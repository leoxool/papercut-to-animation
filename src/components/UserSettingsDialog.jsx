import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';

const UserSettingsDialog = ({ onClose }) => {
    const { currentUser, updateUserPreferences, logoutUser } = useUser();
    const [tolerance, setTolerance] = useState(currentUser?.preferences?.defaultTolerance || 13);
    const [autoSave, setAutoSave] = useState(currentUser?.preferences?.autoSave ?? true);
    const [hasChanges, setHasChanges] = useState(false);

    const handleToleranceChange = (e) => {
        const value = parseFloat(e.target.value);
        setTolerance(value);
        setHasChanges(true);
    };

    const handleAutoSaveChange = (e) => {
        const value = e.target.checked;
        setAutoSave(value);
        setHasChanges(true);
    };

    const handleSave = () => {
        updateUserPreferences({
            defaultTolerance: tolerance,
            autoSave: autoSave
        });
        setHasChanges(false);
        // 可以添加成功提示
    };

    const handleReset = () => {
        setTolerance(13);
        setAutoSave(true);
        setHasChanges(true);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-6 w-[480px] border border-slate-700 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-white font-serif text-xl">用户设置</h3>
                        <p className="text-sm text-slate-400 mt-1">
                            当前用户：{currentUser?.username}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                <div className="space-y-6">
                    {/* 默认去背景强度 */}
                    <div className="bg-slate-700/50 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                            <label className="text-sm font-bold tracking-wide text-slate-300">
                                默认去背景强度
                            </label>
                            <span className="text-xs text-cyan-400 font-mono bg-cyan-900/30 px-2 rounded">
                                {Number(tolerance).toFixed(1)}
                            </span>
                        </div>
                        <div className="relative h-6 flex items-center select-none">
                            <div className="absolute w-full h-2 bg-slate-600 rounded-lg top-1/2 -translate-y-1/2 left-0"></div>
                            <div
                                className="absolute h-2 bg-cyan-500 rounded-l-lg top-1/2 -translate-y-1/2 left-0 pointer-events-none"
                                style={{ width: `${(tolerance / 80) * 100}%` }}
                            ></div>
                            <input
                                type="range"
                                min="1"
                                max="80"
                                step="0.5"
                                value={tolerance}
                                onChange={handleToleranceChange}
                                className="absolute w-full h-full opacity-100 z-20 cursor-pointer inset-0 m-0 p-0"
                            />
                        </div>
                        <p className="text-xs text-slate-400 mt-2">
                            设置新建素材的默认去背景强度
                        </p>
                    </div>

                    {/* 自动保存 */}
                    <div className="bg-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-sm font-bold tracking-wide text-slate-300">
                                    自动保存
                                </label>
                                <p className="text-xs text-slate-400 mt-1">
                                    拍摄或导入素材时自动保存到素材库
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={autoSave}
                                    onChange={handleAutoSaveChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                            </label>
                        </div>
                    </div>

                    {/* 用户统计 */}
                    <div className="bg-slate-700/50 rounded-xl p-4">
                        <h4 className="text-sm font-bold tracking-wide text-slate-300 mb-3">
                            使用统计
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="text-xs text-slate-400">拍摄次数</div>
                                <div className="text-lg font-bold text-white mt-1">
                                    {currentUser?.stats?.totalCaptures || 0}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="text-xs text-slate-400">导入次数</div>
                                <div className="text-lg font-bold text-white mt-1">
                                    {currentUser?.stats?.totalImports || 0}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="text-xs text-slate-400">创建项目</div>
                                <div className="text-lg font-bold text-white mt-1">
                                    {currentUser?.stats?.totalProjects || 0}
                                </div>
                            </div>
                            <div className="bg-slate-800/50 rounded-lg p-3">
                                <div className="text-xs text-slate-400">导出次数</div>
                                <div className="text-lg font-bold text-white mt-1">
                                    {currentUser?.stats?.totalExports || 0}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 账户信息 */}
                    <div className="bg-slate-700/50 rounded-xl p-4">
                        <h4 className="text-sm font-bold tracking-wide text-slate-300 mb-3">
                            账户信息
                        </h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-400">用户ID</span>
                                <span className="text-white font-mono text-xs">
                                    {currentUser?.id?.substring(0, 20)}...
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">注册时间</span>
                                <span className="text-white">
                                    {currentUser?.createdAt
                                        ? new Date(currentUser.createdAt).toLocaleString()
                                        : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-3 mt-6">
                    {hasChanges && (
                        <>
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                            >
                                重置
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition"
                            >
                                保存设置
                            </button>
                        </>
                    )}
                    <button
                        onClick={logoutUser}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition"
                    >
                        退出登录
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserSettingsDialog;
