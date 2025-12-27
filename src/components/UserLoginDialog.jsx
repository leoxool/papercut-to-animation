import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';

const UserLoginDialog = ({ onClose }) => {
    const { loginUser, isLoading, sessionExpired } = useUser();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || !password.trim()) {
            setError('用户名和密码不能为空');
            return;
        }

        try {
            await loginUser(username, password);
            onClose();
        } catch (error) {
            setError(error.message || '登录失败，请检查用户名和密码');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-serif text-xl">
                        用户登录
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition"
                    >
                        ✕
                    </button>
                </div>

                {sessionExpired && (
                    <div className="mb-4 p-3 bg-yellow-900/50 border border-yellow-700 rounded-lg">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-400 text-sm">⚠️</span>
                            <span className="text-yellow-300 text-sm font-medium">
                                登录已过期，请重新登录
                            </span>
                        </div>
                        <p className="text-yellow-200/70 text-xs mt-1">
                            为保护账户安全，30分钟无操作将自动登出
                        </p>
                    </div>
                )}

                <form onSubmit={handleLogin}>
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
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            密码
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="输入密码"
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm mb-3">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                    >
                        {isLoading ? '登录中...' : '登录'}
                    </button>
                </form>

                <div className="mt-4 text-center text-slate-400 text-sm">
                    学生账户由管理员统一创建
                </div>
            </div>
        </div>
    );
};

export default UserLoginDialog;
