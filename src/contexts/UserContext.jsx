import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const UserContext = createContext();

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
};

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

    // 从 localStorage 加载用户数据
    useEffect(() => {
        const savedUser = localStorage.getItem('papercut_user');
        const savedUsers = localStorage.getItem('papercut_all_users');

        if (savedUser) {
            try {
                const userData = JSON.parse(savedUser);
                setCurrentUser(userData);
                setIsLoggedIn(true);
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('papercut_user');
            }
        }
    }, []);

    // 注册新用户
    const registerUser = useCallback((username, preferences = {}) => {
        const allUsers = JSON.parse(localStorage.getItem('papercut_all_users') || '[]');
        const userId = generateUserId();

        const newUser = {
            id: userId,
            username: username || generateRandomUsername(),
            createdAt: new Date().toISOString(),
            preferences: {
                defaultTolerance: 13,
                autoSave: true,
                ...preferences
            },
            stats: {
                totalCaptures: 0,
                totalImports: 0,
                totalProjects: 0,
                totalExports: 0
            }
        };

        // 检查用户名是否已存在
        const userExists = allUsers.some(u => u.username === newUser.username);
        if (userExists) {
            newUser.username = generateRandomUsername();
        }

        // 保存到所有用户列表
        allUsers.push(newUser);
        localStorage.setItem('papercut_all_users', JSON.stringify(allUsers));

        // 设置为当前用户
        setCurrentUser(newUser);
        setIsLoggedIn(true);
        localStorage.setItem('papercut_user', JSON.stringify(newUser));

        return newUser;
    }, []);

    // 用户登录
    const loginUser = useCallback((userId) => {
        const allUsers = JSON.parse(localStorage.getItem('papercut_all_users') || '[]');
        const user = allUsers.find(u => u.id === userId);

        if (user) {
            setCurrentUser(user);
            setIsLoggedIn(true);
            localStorage.setItem('papercut_user', JSON.stringify(user));
            return true;
        }
        return false;
    }, []);

    // 用户登出
    const logoutUser = useCallback(() => {
        setCurrentUser(null);
        setIsLoggedIn(false);
        localStorage.removeItem('papercut_user');
    }, []);

    // 更新用户偏好设置
    const updateUserPreferences = useCallback((newPreferences) => {
        if (!currentUser) return;

        const updatedUser = {
            ...currentUser,
            preferences: {
                ...currentUser.preferences,
                ...newPreferences
            }
        };

        setCurrentUser(updatedUser);
        localStorage.setItem('papercut_user', JSON.stringify(updatedUser));

        // 同时更新所有用户列表中的数据
        const allUsers = JSON.parse(localStorage.getItem('papercut_all_users') || '[]');
        const updatedUsers = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);
        localStorage.setItem('papercut_all_users', JSON.stringify(updatedUsers));
    }, [currentUser]);

    // 更新用户统计信息
    const updateUserStats = useCallback((newStats) => {
        if (!currentUser) return;

        const updatedUser = {
            ...currentUser,
            stats: {
                ...currentUser.stats,
                ...newStats
            }
        };

        setCurrentUser(updatedUser);
        localStorage.setItem('papercut_user', JSON.stringify(updatedUser));

        // 同时更新所有用户列表中的数据
        const allUsers = JSON.parse(localStorage.getItem('papercut_all_users') || '[]');
        const updatedUsers = allUsers.map(u => u.id === currentUser.id ? updatedUser : u);
        localStorage.setItem('papercut_all_users', JSON.stringify(updatedUsers));
    }, [currentUser]);

    // 获取所有用户列表（用于登录选择）
    const getAllUsers = useCallback(() => {
        return JSON.parse(localStorage.getItem('papercut_all_users') || '[]');
    }, []);

    // 删除用户
    const deleteUser = useCallback((userId) => {
        const allUsers = JSON.parse(localStorage.getItem('papercut_all_users') || '[]');
        const updatedUsers = allUsers.filter(u => u.id !== userId);
        localStorage.setItem('papercut_all_users', JSON.stringify(updatedUsers));

        // 如果删除的是当前用户，则登出
        if (currentUser && currentUser.id === userId) {
            logoutUser();
        }

        return true;
    }, [currentUser, logoutUser]);

    const value = {
        currentUser,
        isLoggedIn,
        showLoginDialog,
        showSettingsDialog,
        setShowLoginDialog,
        setShowSettingsDialog,
        registerUser,
        loginUser,
        logoutUser,
        updateUserPreferences,
        updateUserStats,
        getAllUsers,
        deleteUser
    };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};
