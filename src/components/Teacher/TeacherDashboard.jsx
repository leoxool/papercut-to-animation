import React, { useState } from 'react';
import { useClassroom } from '../../contexts/ClassroomContext';
import LivePreview from './LivePreview';
import StudentWorksViewer from './StudentWorksViewer';

const TeacherDashboard = ({ files, onCapture }) => {
    const {
        classroom,
        connectedStudents,
        submittedMaterials,
        createClassroom,
        approveMaterial,
        getPendingMaterials,
        getApprovedMaterials
    } = useClassroom();

    const [showClassroomCreator, setShowClassroomCreator] = useState(!classroom);
    const [classroomCode, setClassroomCode] = useState('');

    const handleCreateClassroom = () => {
        const newClassroom = createClassroom();
        setClassroomCode(newClassroom.code);
        setShowClassroomCreator(false);
    };

    const pendingMaterials = getPendingMaterials();
    const approvedMaterials = getApprovedMaterials();

    return (
        <div className="h-screen flex flex-col bg-slate-900 overflow-hidden">
            {/* 顶部导航栏 */}
            <div className="bg-slate-800 border-b border-slate-700 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h1 className="text-white font-serif text-2xl">教师控制台</h1>
                        {classroom && (
                            <div className="px-4 py-2 bg-blue-600 rounded-lg">
                                <div className="text-white text-sm">教室代码</div>
                                <div className="text-white text-2xl font-bold tracking-widest">
                                    {classroom.code}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1.5 bg-slate-700 rounded-lg">
                            <span className="text-white text-sm">
                                在线学生: {connectedStudents.length}
                            </span>
                        </div>
                        <div className="px-3 py-1.5 bg-slate-700 rounded-lg">
                            <span className="text-white text-sm">
                                待审核: {pendingMaterials.length}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 主要内容区域 */}
            <div className="flex-1 flex overflow-hidden">
                {/* 左侧：学生作品管理 */}
                <div className="w-1/3 bg-slate-800 border-r border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-white font-bold mb-3">学生作品</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {}}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition"
                            >
                                全部 ({submittedMaterials.length})
                            </button>
                            <button
                                onClick={() => {}}
                                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded transition"
                            >
                                待审核 ({pendingMaterials.length})
                            </button>
                            <button
                                onClick={() => {}}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition"
                            >
                                已通过 ({approvedMaterials.length})
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        <StudentWorksViewer
                            materials={submittedMaterials}
                            onApprove={approveMaterial}
                        />
                    </div>
                </div>

                {/* 右侧：实时动画预览 */}
                <div className="flex-1 bg-slate-900">
                    <LivePreview
                        approvedMaterials={approvedMaterials}
                        onCapture={onCapture}
                    />
                </div>
            </div>

            {/* 创建教室对话框 */}
            {showClassroomCreator && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]">
                    <div className="bg-slate-800 rounded-2xl p-8 w-[480px] border border-slate-700 shadow-2xl">
                        <h3 className="text-white font-serif text-2xl mb-6 text-center">
                            创建协作教室
                        </h3>
                        <p className="text-slate-400 text-center mb-6">
                            创建一个新的教室，学生可以使用四位数字口令加入
                        </p>
                        <button
                            onClick={handleCreateClassroom}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-lg transition"
                        >
                            创建教室
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
