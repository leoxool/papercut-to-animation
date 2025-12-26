import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';

const UserLoginDialog = ({ onClose }) => {
    const { registerUser, loginUser, getAllUsers, deleteUser } = useUser();
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [userRole, setUserRole] = useState('student'); // 'teacher' or 'student'
    const [error, setError] = useState('');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState('');

    const allUsers = getAllUsers();

    const handleRegister = (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim()) {
            setError('请输入用户名');
            return;
        }

        const newUser = registerUser(username, userRole);
        if (newUser) {
            onClose();
        } else {
            setError('注册失败，请重试');
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');

        if (!selectedUserId) {
            setError('请选择用户');
            return;
        }

        const success = loginUser(selectedUserId);
        if (success) {
            onClose();
        } else {
            setError('登录失败，请重试');
        }
    };

    const handleDeleteUser = (userId) => {
        if (showDeleteConfirm === userId) {
            deleteUser(userId);
            setShowDeleteConfirm('');
        } else {
            setShowDeleteConfirm(userId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-serif text-xl">
                        {mode === 'login' ? '用户登录' : '创建用户'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                {mode === 'login' ? (
                    <div>
                        <div className="space-y-3 mb-4">
                            {allUsers.length === 0 ? (
                                <div className="text-center text-slate-400 py-8">
                                    <p className="mb-4">暂无用户</p>
                                    <button
                                        onClick={() => setMode('register')}
                                        className="text-cyan-400 hover:text-cyan-300 underline"
                                    >
                                        创建第一个用户
                                    </button>
                                </div>
                            ) : (
                                allUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`p-3 rounded-lg border transition cursor-pointer ${
                                            selectedUserId === user.id
                                                ? 'border-cyan-500 bg-cyan-900/20'
                                                : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                                        }`}
                                        onClick={() => setSelectedUserId(user.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-white font-medium">{user.username}</div>
                                                <div className="text-xs text-slate-400">
                                                    {new Date(user.createdAt).toLocaleDateString()} 注册
                                                </div>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteUser(user.id);
                                                }}
                                                className={`text-xs px-2 py-1 rounded transition ${
                                                    showDeleteConfirm === user.id
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-slate-600 text-slate-300 hover:bg-red-600'
                                                }`}
                                            >
                                                {showDeleteConfirm === user.id ? '确认删除' : '删除'}
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm mb-3">{error}</div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={handleLogin}
                                disabled={!selectedUserId || allUsers.length === 0}
                                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                            >
                                登录
                            </button>
                            <button
                                onClick={() => setMode('register')}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                            >
                                注册新用户
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleRegister}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                用户名
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="输入用户名"
                                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                                autoFocus
                            />
                            <p className="text-xs text-slate-400 mt-1">
                                留空将自动生成用户名
                            </p>
                        </div>

                        {/* 角色选择 */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                用户角色
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setUserRole('student')}
                                    className={`px-4 py-3 rounded-lg border transition ${
                                        userRole === 'student'
                                            ? 'border-cyan-500 bg-cyan-900/20 text-cyan-300'
                                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="font-bold">学生</div>
                                    <div className="text-xs opacity-75">采集和提交素材</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUserRole('teacher')}
                                    className={`px-4 py-3 rounded-lg border transition ${
                                        userRole === 'teacher'
                                            ? 'border-cyan-500 bg-cyan-900/20 text-cyan-300'
                                            : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-slate-500'
                                    }`}
                                >
                                    <div className="font-bold">教师</div>
                                    <div className="text-xs opacity-75">创建和管理教室</div>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-sm mb-3">{error}</div>
                        )}

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition"
                            >
                                创建用户
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('login')}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                            >
                                返回登录
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default UserLoginDialog;
