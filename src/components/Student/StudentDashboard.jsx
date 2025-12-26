import React, { useState } from 'react';
import { useClassroom } from '../../contexts/ClassroomContext';

const StudentDashboard = ({ files, onCapture, onSubmit }) => {
    const {
        classroom,
        submitMaterial,
        connectedStudents,
        submittedMaterials
    } = useClassroom();

    const [showJoinDialog, setShowJoinDialog] = useState(!classroom);
    const [classroomCode, setClassroomCode] = useState('');
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleJoinClassroom = () => {
        if (classroomCode.length !== 4) {
            alert('请输入4位数字教室代码');
            return;
        }
        // TODO: 验证教室代码
        setShowJoinDialog(false);
    };

    const handleSubmitMaterial = async () => {
        if (!selectedFileId) {
            alert('请选择要提交的素材');
            return;
        }

        const file = files.find(f => f.id === selectedFileId);
        if (!file) {
            alert('素材不存在');
            return;
        }

        setIsSubmitting(true);
        try {
            await submitMaterial(file);
            setSelectedFileId(null);
            alert('素材提交成功！等待教师审核');
        } catch (error) {
            alert('提交失败，请重试');
        } finally {
            setIsSubmitting(false);
        }
    };

    const mySubmissions = submittedMaterials.filter(
        m => m.studentId === 'current-student-id'
    );

    return (
        <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
            {/* 顶部导航栏 */}
            <div className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-white font-serif text-2xl">学生工作台</h1>
                        {classroom && (
                            <p className="text-slate-400 text-sm mt-1">
                                教室代码: <span className="text-white font-bold">{classroom.code}</span>
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-slate-700 rounded-lg">
                            <span className="text-white text-sm">
                                在线人数: {connectedStudents.length}
                            </span>
                        </div>
                        <div className="px-3 py-1.5 bg-slate-700 rounded-lg">
                            <span className="text-white text-sm">
                                我的提交: {mySubmissions.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 主要内容区域 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 左侧：素材库 */}
                <div className="w-1/2 bg-slate-800 border-r border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-white font-bold mb-3">我的素材库</h2>
                        <p className="text-slate-400 text-sm">
                            选择素材提交给老师进行审核
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {files.length === 0 ? (
                            <div className="text-center text-slate-400 py-12">
                                <div className="text-4xl mb-4">📷</div>
                                <p className="mb-2">暂无素材</p>
                                <p className="text-xs opacity-75">拍摄或导入图片创建素材</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition ${
                                            selectedFileId === file.id
                                                ? 'border-cyan-500 ring-2 ring-cyan-500/50'
                                                : 'border-transparent hover:border-slate-600'
                                        }`}
                                        onClick={() => setSelectedFileId(file.id)}
                                    >
                                        <img
                                            src={file.processedUrl}
                                            alt={file.name}
                                            className="w-full aspect-square object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        <div className="absolute bottom-2 left-2 right-2">
                                            <p className="text-white text-xs font-medium truncate">
                                                {file.name}
                                            </p>
                                        </div>
                                        {selectedFileId === file.id && (
                                            <div className="absolute top-2 right-2 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-700">
                        <button
                            onClick={handleSubmitMaterial}
                            disabled={!selectedFileId || isSubmitting}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold transition"
                        >
                            {isSubmitting ? '提交中...' : '提交给老师'}
                        </button>
                    </div>
                </div>

                {/* 右侧：我的提交记录 */}
                <div className="w-1/2 bg-slate-800 flex flex-col">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-white font-bold mb-3">我的提交记录</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {mySubmissions.length === 0 ? (
                            <div className="text-center text-slate-400 py-12">
                                <div className="text-4xl mb-4">📤</div>
                                <p className="mb-2">暂无提交记录</p>
                                <p className="text-xs opacity-75">提交素材后将在此显示</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {mySubmissions.map((submission) => (
                                    <div
                                        key={submission.id}
                                        className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                                    >
                                        <div className="flex items-start gap-4">
                                            <img
                                                src={submission.processedUrl}
                                                alt="submitted"
                                                className="w-20 h-20 rounded object-cover"
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        submission.status === 'approved'
                                                            ? 'bg-green-600 text-white'
                                                            : submission.status === 'rejected'
                                                            ? 'bg-red-600 text-white'
                                                            : 'bg-yellow-600 text-white'
                                                    }`}>
                                                        {submission.status === 'approved' ? '已通过' :
                                                         submission.status === 'rejected' ? '已拒绝' : '待审核'}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">
                                                        {new Date(submission.submittedAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-white text-sm">
                                                    提交时间: {new Date(submission.submittedAt).toLocaleTimeString()}
                                                </p>
                                                {submission.approvedAt && (
                                                    <p className="text-green-400 text-xs mt-1">
                                                        通过时间: {new Date(submission.approvedAt).toLocaleTimeString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 加入教室对话框 */}
            {showJoinDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <div className="bg-slate-800 rounded-2xl p-8 w-[480px] border border-slate-700 shadow-2xl">
                        <h3 className="text-white font-serif text-2xl mb-6 text-center">
                            加入教室
                        </h3>
                        <p className="text-slate-400 text-center mb-6">
                            请输入老师提供的4位数字教室代码
                        </p>
                        <input
                            type="text"
                            value={classroomCode}
                            onChange={(e) => setClassroomCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="0000"
                            className="w-full px-6 py-4 text-center text-3xl font-bold bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500 tracking-widest"
                            maxLength={4}
                            autoFocus
                        />
                        <button
                            onClick={handleJoinClassroom}
                            disabled={classroomCode.length !== 4}
                            className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg transition"
                        >
                            加入教室
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
