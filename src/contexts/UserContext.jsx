import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext();

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

// API 配置
const API_BASE_URL = `http://${window.location.hostname}:3001`;
const API_HEADERS = {
    'Content-Type': 'application/json'
};

// Session configuration
// const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds (已禁用)
const SESSION_CHECK_INTERVAL = 60 * 1000; // Check every minute (仅保留间隔，不触发登出)

// HTTP 客户端类
class ApiClient {
    constructor() {
        this.token = localStorage.getItem('auth_token');
        this.sessionStartTime = sessionStorage.getItem('session_start_time');
    }

    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('auth_token', token);
            // 使用sessionStorage，这样页面关闭时自动清除，但刷新时保留
            this.sessionStartTime = Date.now().toString();
            sessionStorage.setItem('session_start_time', this.sessionStartTime);
        } else {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('session_start_time');
        }
    }

    // Update session activity timestamp
    updateActivity() {
        this.sessionStartTime = Date.now().toString();
        sessionStorage.setItem('session_start_time', this.sessionStartTime);
    }

    // Check if session is still valid
    isSessionValid() {
        // 永久会话，不检查过期时间
        return true;
    }

    // Check if session is expired
    isSessionExpired() {
        return !this.isSessionValid();
    }

    // Clear session data
    clearSession() {
        localStorage.removeItem('auth_token');
        sessionStorage.removeItem('session_start_time');
        this.token = null;
        this.sessionStartTime = null;
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        console.log('API Request:', url);
        const headers = {
            ...API_HEADERS,
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '请求失败');
        }

        return data;
    }

    // 注册
    async register(userData) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    // 登录
    async login(username, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    // 获取当前用户
    async getCurrentUser() {
        return this.request('/api/auth/me');
    }

    // 更新用户
    async updateUser(userData) {
        return this.request('/api/auth/me', {
            method: 'PUT',
            body: JSON.stringify(userData)
        });
    }

    // 登出
    async logout() {
        try {
            await this.request('/api/auth/logout', {
                method: 'POST'
            });
        } catch (error) {
            console.error('登出API调用失败:', error);
        } finally {
            this.setToken(null);
        }
    }
}

const apiClient = new ApiClient();

// 生成随机用户ID
const generateUserId = () => {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// 生成随机用户名
const generateRandomUsername = () => {
    const adjectives = ['创意', '艺术', '梦幻', '色彩', '影像', '视觉', '灵感', '设计'];
    const nouns = ['大师', '创作者', '艺术家', '设计师', '观察者', '梦想家', '探索者'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999) + 1;
    return `${adj}${noun}${num}`;
};

export const UserProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [showLoginDialog, setShowLoginDialog] = useState(false);
    const [showSettingsDialog, setShowSettingsDialog] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionExpired, setSessionExpired] = useState(false);

    // 从 localStorage 和 API 加载用户数据，并检查session有效性
    useEffect(() => {
        const initAuth = async () => {
            try {
                // 检查是否有token和session
                const token = localStorage.getItem('auth_token');
                const sessionStartTime = sessionStorage.getItem('session_start_time');

                // 如果有token但没有session时间，或者session已过期，则需要重新登录
                if (token) {
                    if (!sessionStartTime || apiClient.isSessionExpired()) {
                        console.log('Session已过期或无效，需要重新登录');
                        apiClient.clearSession();
                        setIsLoggedIn(false);
                        setShowLoginDialog(true);
                        setIsLoading(false);
                        return;
                    }

                    apiClient.setToken(token);
                    const response = await apiClient.getCurrentUser();
                    setCurrentUser(response.user);
                    setIsLoggedIn(true);

                    // session_start_time存在且未过期，保持登录状态
                } else {
                    // 没有token，强制显示登录对话框
                    setShowLoginDialog(true);
                }
            } catch (error) {
                console.error('自动登录失败:', error);
                // Token 无效，清除本地存储
                apiClient.clearSession();
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // 监听用户活动，更新session时间
    useEffect(() => {
        const updateActivity = () => {
            if (isLoggedIn) {
                apiClient.updateActivity();
            }
        };

        // 监听鼠标和键盘事件
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => {
            document.addEventListener(event, updateActivity, true);
        });

        // 定时检查session是否过期
        const sessionCheckInterval = setInterval(() => {
            // 不再自动登出，仅保留定期检查机制（可用于未来扩展）
        }, SESSION_CHECK_INTERVAL);

        // 页面关闭或刷新时清理session
        const handleBeforeUnload = () => {
            apiClient.clearSession();
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            // 清理事件监听器
            events.forEach(event => {
                document.removeEventListener(event, updateActivity, true);
            });
            clearInterval(sessionCheckInterval);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isLoggedIn]);

    // 注册新用户 (API)
    const registerUser = useCallback(async (username, email, password, role = 'student', fullName = '') => {
        try {
            setIsLoading(true);
            const response = await apiClient.register({
                username,
                email,
                password,
                role,
                fullName
            });

            // 设置 token
            apiClient.setToken(response.token);

            // 设置当前用户
            setCurrentUser(response.user);
            setIsLoggedIn(true);

            // 关闭对话框
            setShowLoginDialog(false);

            return response.user;
        } catch (error) {
            console.error('注册失败:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 用户登录 (API)
    const loginUser = useCallback(async (username, password) => {
        try {
            setIsLoading(true);
            const response = await apiClient.login(username, password);

            // 设置 token 和初始化session时间
            apiClient.setToken(response.token);
            apiClient.updateActivity();

            // 设置当前用户
            setCurrentUser(response.user);
            setIsLoggedIn(true);
            setSessionExpired(false);

            // 关闭对话框
            setShowLoginDialog(false);

            return response.user;
        } catch (error) {
            console.error('登录失败:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 用户登出
    const logoutUser = useCallback(async () => {
        try {
            await apiClient.logout();
        } catch (error) {
            console.error('登出失败:', error);
        } finally {
            setCurrentUser(null);
            setIsLoggedIn(false);
            setShowLoginDialog(true);
            setSessionExpired(false);
        }
    }, []);

    // 更新用户偏好设置
    const updateUserPreferences = useCallback((newPreferences) => {
        if (!currentUser) return;

        // TODO: 未来通过 API 更新用户偏好
        const updatedUser = {
            ...currentUser,
            settings: {
                ...currentUser.settings,
                ...newPreferences
            }
        };

        setCurrentUser(updatedUser);
    }, [currentUser]);

    // 更新用户统计信息
    const updateUserStats = useCallback((newStats) => {
        if (!currentUser) return;

        // TODO: 未来通过 API 更新用户统计
        const updatedUser = {
            ...currentUser,
            stats: {
                ...currentUser.stats,
                ...newStats
            }
        };

        setCurrentUser(updatedUser);
    }, [currentUser]);

    const value = {
        currentUser,
        isLoggedIn,
        isLoading,
        showLoginDialog,
        showSettingsDialog,
        sessionExpired,
        setShowLoginDialog,
        setShowSettingsDialog,
        registerUser,
        loginUser,
        logoutUser,
        updateUserPreferences,
        updateUserStats
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
