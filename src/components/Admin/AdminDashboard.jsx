import React, { useState, useEffect } from 'react';
import { useUser } from '../../contexts/UserContext';

const AdminDashboard = () => {
    const { currentUser, logoutUser } = useUser();
    const [view, setView] = useState('classes'); // 'classes' | 'students'
    const [selectedClass, setSelectedClass] = useState(null);
    const [users, setUsers] = useState([]);
    const [classes, setClasses] = useState([]);
    const [showCreateClass, setShowCreateClass] = useState(false);
    const [showCreateUser, setShowCreateUser] = useState(false);
    const [showBatchCreateUser, setShowBatchCreateUser] = useState(false);
    const [editingClass, setEditingClass] = useState(null);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [editingTeacher, setEditingTeacher] = useState(null);
    const [loading, setLoading] = useState(true);

    // API配置
    const API_BASE_URL = '';

    // 加载数据
    useEffect(() => {
        loadUsers();
        loadClasses();
    }, []);

    // 加载班级列表
    const loadClasses = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/api/classes`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setClasses(data.classes || []);
        } catch (error) {
            console.error('加载班级列表失败:', error);
        }
    };

    const loadUsers = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            setUsers(data.users || []);
            setLoading(false);
        } catch (error) {
            console.error('加载用户列表失败:', error);
            setLoading(false);
        }
    };

    // 创建班级
    const handleCreateClass = async (classData) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/api/classes`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(classData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '创建班级失败');
            }

            await loadClasses();
            setShowCreateClass(false);
        } catch (error) {
            console.error('创建班级失败:', error);
            alert(error.message);
        }
    };

    // 更新班级
    const handleUpdateClass = async (classId, classData) => {
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(classData)
            });
            await loadClasses();
            setEditingClass(null);
        } catch (error) {
            alert('更新班级失败');
        }
    };

    // 删除班级
    const handleDeleteClass = async (classId, className) => {
        if (!confirm(`确定要删除班级 "${className}" 吗？`)) return;

        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            await loadClasses();
            // 如果删除的是当前选中的班级，返回班级列表
            if (selectedClass?.id === classId) {
                setSelectedClass(null);
                setView('classes');
            }
        } catch (error) {
            alert('删除班级失败');
        }
    };

    // 创建用户
    const handleCreateUser = async (userData) => {
        try {
            const token = localStorage.getItem('auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || '创建用户失败');
            }

            await loadUsers();
            await loadClasses(); // 重新加载班级以更新学生数量
            setShowCreateUser(false);
        } catch (error) {
            alert(error.message);
        }
    };

    // 更新用户
    const handleUpdateUser = async (username, userData) => {
        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_BASE_URL}/api/users/${username}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });
            await loadUsers();
            await loadClasses(); // 重新加载班级以更新学生数量
            setEditingStudent(null);
        } catch (error) {
            alert('更新用户失败');
        }
    };

    // 删除用户
    const handleDeleteUser = async (username) => {
        if (!confirm(`确定要删除用户 ${username} 吗？`)) return;

        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_BASE_URL}/api/users/${username}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            await loadUsers();
            await loadClasses(); // 重新加载班级以更新学生数量
        } catch (error) {
            alert('删除用户失败');
        }
    };

    // 批量创建用户
    const handleBatchCreateUsers = async (batchData) => {
        try {
            const { usernames, role, className } = batchData;
            const token = localStorage.getItem('auth_token');
            const defaultPassword = '12345678';

            // 逐个创建用户
            for (const username of usernames) {
                const userData = {
                    username: username.trim(),
                    password: defaultPassword,
                    role: role,
                    fullName: username.trim(), // 真实姓名与用户名相同
                    className: role === 'student' ? className : null
                };

                await fetch(`${API_BASE_URL}/api/users`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                });
            }

            await loadUsers();
            await loadClasses();
            setShowBatchCreateUser(false);
            alert(`成功创建 ${usernames.length} 个用户！`);
        } catch (error) {
            alert('批量创建用户失败');
        }
    };

    // 重置用户密码
    const handleResetPassword = async (username) => {
        if (!confirm(`确定要重置用户 ${username} 的密码吗？\n新密码将为：12345678`)) return;

        try {
            const token = localStorage.getItem('auth_token');
            await fetch(`${API_BASE_URL}/api/users/${username}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: '12345678' })
            });
            await loadUsers();
            alert(`用户 ${username} 的密码已重置为：12345678`);
        } catch (error) {
            alert('重置密码失败');
        }
    };

    // 获取班级的学生列表
    const getClassStudents = (className) => {
        return users.filter(user => user.role === 'student' && user.className === className);
    };

    // 获取教师列表
    const getTeachers = () => {
        return users.filter(user => user.role === 'teacher');
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-900">
                <div className="text-white text-xl">加载中...</div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-900 text-white">
            {/* 顶部导航栏 */}
            <div className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-serif font-bold">管理员控制台</h1>
                        <p className="text-sm text-slate-400 mt-1">
                            欢迎, {currentUser?.fullName || currentUser?.username}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {view === 'students' && (
                            <button
                                onClick={() => {
                                    setView('classes');
                                    setSelectedClass(null);
                                }}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                            >
                                ← 返回班级列表
                            </button>
                        )}
                        <button
                            onClick={logoutUser}
                            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg transition"
                        >
                            退出登录
                        </button>
                    </div>
                </div>
            </div>

            {/* 主要内容区域 - 双栏布局 */}
            {view === 'classes' ? (
                <div className="flex-1 flex">
                    {/* 左侧：班级管理 */}
                    <div className="flex-1 p-6 border-r border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">班级管理</h2>
                            <button
                                onClick={() => setShowCreateClass(true)}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition"
                            >
                                ➕ 创建新班级
                            </button>
                        </div>

                        {classes.length === 0 ? (
                            <div className="text-center text-slate-400 py-12">
                                暂无班级数据，点击上方按钮创建班级
                            </div>
                        ) : (
                            <div className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-2">
                                <div className="grid grid-cols-1 gap-4">
                                    {classes.map((cls) => (
                                    <div
                                        key={cls.id}
                                        className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-cyan-500 transition"
                                    >
                                        {editingClass === cls.id ? (
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <ClassEditForm
                                                    class={cls}
                                                    teachers={getTeachers()}
                                                    onSave={(data) => handleUpdateClass(cls.id, data)}
                                                    onCancel={() => setEditingClass(null)}
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <div
                                                    className="cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedClass(cls);
                                                        setView('students');
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h3 className="text-lg font-semibold">{cls.name}</h3>
                                                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingClass(cls.id);
                                                                }}
                                                                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded"
                                                            >
                                                                编辑
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (cls.studentCount > 0) {
                                                                        alert('该班级下还有学生，无法删除');
                                                                        return;
                                                                    }
                                                                    handleDeleteClass(cls.id, cls.name);
                                                                }}
                                                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded disabled:bg-slate-700 disabled:cursor-not-allowed"
                                                                disabled={cls.studentCount > 0}
                                                                title={cls.studentCount > 0 ? '该班级下还有学生，无法删除' : ''}
                                                            >
                                                                删除
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {cls.description && (
                                                        <p className="text-sm text-slate-400 mb-3">{cls.description}</p>
                                                    )}

                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-slate-300">
                                                            <span className="font-medium">{cls.studentCount}</span> 名学生
                                                        </span>
                                                        <span className="text-cyan-400">点击查看详情 →</span>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 右侧：用户管理 */}
                    <div className="w-96 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">用户管理</h2>
                            <button
                                onClick={() => setShowBatchCreateUser(true)}
                                className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition text-sm"
                            >
                                ➕ 批量创建
                            </button>
                        </div>

                        {/* 管理员列表 */}
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-slate-400 mb-3">管理员列表</h3>
                            <div className="max-h-64 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                                {users.filter(u => u.role === 'admin').map((admin) => (
                                    <div key={admin.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-purple-400">
                                                        {admin.fullName || admin.username}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-purple-600 rounded text-xs">
                                                        管理员
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    @{admin.username}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleResetPassword(admin.username)}
                                                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded"
                                                    title="重置密码为12345678"
                                                >
                                                    重置密码
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(admin.username)}
                                                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded"
                                                    disabled={admin.username === 'LEO'} // 禁止删除默认管理员
                                                    title={admin.username === 'LEO' ? '不能删除默认管理员' : ''}
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 教师列表 */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-400 mb-3">教师列表</h3>
                            <div className="max-h-80 overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                                {users.filter(u => u.role === 'teacher').map((teacher) => (
                                    <div key={teacher.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-blue-400">
                                                        {teacher.fullName || teacher.username}
                                                    </span>
                                                    <span className="px-2 py-0.5 bg-blue-600 rounded text-xs">
                                                        教师
                                                    </span>
                                                </div>
                                                <div className="text-xs text-slate-400 mt-1">
                                                    @{teacher.username}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleResetPassword(teacher.username)}
                                                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded"
                                                    title="重置密码为12345678"
                                                >
                                                    重置密码
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(teacher.username)}
                                                    className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 rounded"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // 学生列表视图
                <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold">{selectedClass?.name}</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {selectedClass?.description}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCreateUser(true)}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition"
                        >
                            ➕ 添加学生
                        </button>
                    </div>

                    <div className="bg-slate-800 rounded-lg border border-slate-700">
                        <div className="p-4 border-b border-slate-700">
                            <h3 className="font-semibold">学生列表 ({selectedClass?.studentCount} 人)</h3>
                        </div>

                        {getClassStudents(selectedClass?.name).length === 0 ? (
                            <div className="text-center text-slate-400 py-12">
                                该班级暂无学生，点击上方按钮添加学生
                            </div>
                        ) : (
                            <div className="max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                                <div className="divide-y divide-slate-700">
                                    {getClassStudents(selectedClass?.name).map((student) => (
                                    <div
                                        key={student.id}
                                        className="p-4"
                                    >
                                        {editingStudent === student.username ? (
                                            <StudentEditForm
                                                student={student}
                                                classes={classes.map(c => c.name)}
                                                onSave={(data) => handleUpdateUser(student.username, data)}
                                                onCancel={() => setEditingStudent(null)}
                                            />
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-semibold">
                                                            {student.fullName || student.username}
                                                        </span>
                                                        <span className="px-2 py-1 bg-green-600 rounded text-xs font-medium">
                                                            学生
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-slate-400 mt-1">
                                                        用户名: {student.username}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-1">
                                                        创建时间: {new Date(student.createdAt).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingStudent(student.username)}
                                                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
                                                    >
                                                        编辑
                                                    </button>
                                                    <button
                                                        onClick={() => handleResetPassword(student.username)}
                                                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm transition"
                                                        title="重置密码为12345678"
                                                    >
                                                        重置密码
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(student.username)}
                                                        className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm transition"
                                                    >
                                                        删除
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* 创建班级对话框 */}
            {showCreateClass && (
                <CreateClassDialog
                    onClose={() => setShowCreateClass(false)}
                    onSubmit={handleCreateClass}
                    teachers={getTeachers()}
                />
            )}

            {/* 创建用户对话框 */}
            {showCreateUser && (
                <CreateUserDialog
                    onClose={() => setShowCreateUser(false)}
                    onSubmit={handleCreateUser}
                    defaultClassName={selectedClass?.name || ''}
                />
            )}

            {/* 批量创建用户对话框 */}
            {showBatchCreateUser && (
                <BatchCreateUserDialog
                    onClose={() => setShowBatchCreateUser(false)}
                    onSubmit={handleBatchCreateUsers}
                    classes={classes}
                />
            )}
        </div>
    );
};

// 创建班级对话框组件
const CreateClassDialog = ({ onClose, onSubmit, teachers }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        teacherId: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.name) {
            setError('请输入班级名称');
            return;
        }

        onSubmit({
            name: formData.name,
            description: formData.description,
            teacherId: formData.teacherId || null
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">创建新班级</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            班级名称
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            placeholder="如: 艺术1班"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            班级描述
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            rows="3"
                            placeholder="可选"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            班主任
                        </label>
                        <select
                            value={formData.teacherId}
                            onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                            <option value="">请选择教师（可选）</option>
                            {teachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.fullName || teacher.username}
                                </option>
                            ))}
                        </select>
                    </div>

                    {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition"
                        >
                            创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 班级编辑表单组件
const ClassEditForm = ({ class: cls, teachers, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: cls.name,
        description: cls.description || '',
        teacherId: cls.teacherId || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.name) {
            alert('请输入班级名称');
            return;
        }
        onSave({
            name: formData.name,
            description: formData.description,
            teacherId: formData.teacherId || null
        });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        班级名称
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        班主任
                    </label>
                    <select
                        value={formData.teacherId}
                        onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    >
                        <option value="">无</option>
                        {teachers.map(teacher => (
                            <option key={teacher.id} value={teacher.id}>
                                {teacher.fullName || teacher.username}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mb-3">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                    班级描述
                </label>
                <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    rows="2"
                    placeholder="可选"
                />
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
                >
                    取消
                </button>
                <button
                    type="submit"
                    className="flex-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm transition"
                >
                    保存
                </button>
            </div>
        </form>
    );
};

// 创建用户对话框组件
const CreateUserDialog = ({ onClose, onSubmit, defaultClassName }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'student',
        fullName: '',
        className: defaultClassName
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (!formData.username || !formData.password) {
            setError('用户名和密码不能为空');
            return;
        }

        if (formData.password.length < 8) {
            setError('密码长度至少8位');
            return;
        }

        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700">
                <h3 className="text-xl font-bold mb-4">创建新用户</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            角色
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                            <option value="student">学生</option>
                            <option value="teacher">教师</option>
                            <option value="admin">管理员</option>
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            用户名
                        </label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            placeholder="输入用户名"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            密码
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            placeholder="输入密码（至少8位）"
                        />
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            姓名
                        </label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            placeholder="输入真实姓名"
                        />
                    </div>

                    {formData.role === 'student' && (
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                班级
                            </label>
                            <input
                                type="text"
                                value={formData.className}
                                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                placeholder="输入班级名称"
                            />
                        </div>
                    )}

                    {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg transition"
                        >
                            创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// 学生编辑表单组件
const StudentEditForm = ({ student, classes, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        fullName: student.fullName || '',
        className: student.className || '',
        isActive: student.isActive
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        姓名
                    </label>
                    <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                        班级
                    </label>
                    <select
                        value={formData.className}
                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                    >
                        <option value="">未分配</option>
                        {classes.map(className => (
                            <option key={className} value={className}>
                                {className}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mb-3">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                    <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-4 h-4"
                    />
                    账户已激活
                </label>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm transition"
                >
                    取消
                </button>
                <button
                    type="submit"
                    className="flex-1 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded text-sm transition"
                >
                    保存
                </button>
            </div>
        </form>
    );
};

// 批量创建用户对话框组件
const BatchCreateUserDialog = ({ onClose, onSubmit, classes }) => {
    const [formData, setFormData] = useState({
        usernames: '',
        role: 'student',
        className: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        // 验证输入
        if (!formData.usernames.trim()) {
            setError('请输入用户名列表');
            return;
        }

        // 解析用户名列表
        const usernames = formData.usernames
            .split(',')
            .map(name => name.trim())
            .filter(name => name.length > 0);

        if (usernames.length === 0) {
            setError('请至少输入一个用户名');
            return;
        }

        if (formData.role === 'student' && !formData.className) {
            setError('学生必须选择班级');
            return;
        }

        // 提交数据
        onSubmit({
            usernames,
            role: formData.role,
            className: formData.role === 'student' ? formData.className : null
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-2xl p-6 w-[500px] border border-slate-700">
                <h3 className="text-xl font-bold mb-4">批量创建用户</h3>
                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            注册类型
                        </label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                        >
                            <option value="student">学生</option>
                            <option value="teacher">教师</option>
                            <option value="admin">管理员</option>
                        </select>
                    </div>

                    <div className="mb-3">
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            用户名列表
                        </label>
                        <textarea
                            value={formData.usernames}
                            onChange={(e) => setFormData({ ...formData, usernames: e.target.value })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            rows="6"
                            placeholder="请输入用户名，多个用户名用逗号分隔，例如：&#10;张三,李四,王五"
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            多个用户名用逗号分隔，真实姓名将与用户名相同
                        </p>
                    </div>

                    {formData.role === 'student' && (
                        <div className="mb-3">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                班级
                            </label>
                            <select
                                value={formData.className}
                                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                            >
                                <option value="">请选择班级</option>
                                {classes.map(cls => (
                                    <option key={cls.id} value={cls.name}>
                                        {cls.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="mb-3 p-3 bg-slate-700 rounded-lg">
                        <p className="text-sm text-slate-300">
                            <strong>默认设置：</strong>
                        </p>
                        <ul className="text-xs text-slate-400 mt-1 space-y-1">
                            <li>• 密码：12345678</li>
                            <li>• 真实姓名：与用户名相同</li>
                            <li>• 账户状态：已激活</li>
                        </ul>
                    </div>

                    {error && <div className="text-red-400 text-sm mb-3">{error}</div>}

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg transition"
                        >
                            批量创建
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminDashboard;
