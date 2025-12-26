import React, { useState } from 'react';

const StudentWorksViewer = ({ materials, onApprove }) => {
    const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved'
    const [selectedMaterial, setSelectedMaterial] = useState(null);

    const filteredMaterials = materials.filter(material => {
        if (filter === 'pending') return material.status === 'submitted';
        if (filter === 'approved') return material.status === 'approved';
        return true;
    });

    const handleApprove = (materialId) => {
        onApprove(materialId);
    };

    const handleReject = (materialId) => {
        if (confirm('确定拒绝这个作品吗？')) {
            // TODO: 实现拒绝功能
            console.log('Reject material:', materialId);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* 过滤器 */}
            <div className="mb-4">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 text-sm rounded transition ${
                            filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        全部
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-3 py-1.5 text-sm rounded transition ${
                            filter === 'pending'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        待审核
                    </button>
                    <button
                        onClick={() => setFilter('approved')}
                        className={`px-3 py-1.5 text-sm rounded transition ${
                            filter === 'approved'
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                    >
                        已通过
                    </button>
                </div>
            </div>

            {/* 作品列表 */}
            <div className="flex-1 overflow-y-auto space-y-3">
                {filteredMaterials.length === 0 ? (
                    <div className="text-center text-slate-400 py-12">
                        <div className="text-4xl mb-4">📋</div>
                        <p className="mb-2">暂无作品</p>
                        <p className="text-xs opacity-75">
                            {filter === 'pending' ? '没有待审核的作品' :
                             filter === 'approved' ? '没有已通过的作品' : '学生还没有提交任何作品'}
                        </p>
                    </div>
                ) : (
                    filteredMaterials.map((material) => (
                        <div
                            key={material.id}
                            className="bg-slate-700/50 rounded-lg border border-slate-600 overflow-hidden hover:border-slate-500 transition cursor-pointer"
                            onClick={() => setSelectedMaterial(material)}
                        >
                            <div className="flex">
                                {/* 缩略图 */}
                                <div className="w-24 h-24 bg-slate-800 flex-shrink-0">
                                    <img
                                        src={material.processedUrl}
                                        alt="student work"
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* 信息 */}
                                <div className="flex-1 p-3">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <p className="text-white font-medium text-sm">
                                                {material.studentName || '未知学生'}
                                            </p>
                                            <p className="text-slate-400 text-xs">
                                                {new Date(material.submittedAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            material.status === 'approved'
                                                ? 'bg-green-600 text-white'
                                                : material.status === 'rejected'
                                                ? 'bg-red-600 text-white'
                                                : 'bg-yellow-600 text-white'
                                        }`}>
                                            {material.status === 'approved' ? '已通过' :
                                             material.status === 'rejected' ? '已拒绝' : '待审核'}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleApprove(material.id);
                                            }}
                                            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition"
                                        >
                                            通过
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleReject(material.id);
                                            }}
                                            className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition"
                                        >
                                            拒绝
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // TODO: 实现查看详情
                                                console.log('View details:', material);
                                            }}
                                            className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-white text-xs rounded transition"
                                        >
                                            查看
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 详情模态框 */}
            {selectedMaterial && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setSelectedMaterial(null)}>
                    <div
                        className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-slate-700 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white font-serif text-xl">作品详情</h3>
                            <button
                                onClick={() => setSelectedMaterial(null)}
                                className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <img
                                    src={selectedMaterial.processedUrl}
                                    alt="student work"
                                    className="w-full rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-slate-400 text-sm">学生姓名</p>
                                    <p className="text-white font-medium">
                                        {selectedMaterial.studentName || '未知'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">提交时间</p>
                                    <p className="text-white font-medium">
                                        {new Date(selectedMaterial.submittedAt).toLocaleString()}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">状态</p>
                                    <p className={`font-medium ${
                                        selectedMaterial.status === 'approved' ? 'text-green-400' :
                                        selectedMaterial.status === 'rejected' ? 'text-red-400' :
                                        'text-yellow-400'
                                    }`}>
                                        {selectedMaterial.status === 'approved' ? '已通过' :
                                         selectedMaterial.status === 'rejected' ? '已拒绝' : '待审核'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-sm">去背景强度</p>
                                    <p className="text-white font-medium">
                                        {selectedMaterial.tolerance}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        handleApprove(selectedMaterial.id);
                                        setSelectedMaterial(null);
                                    }}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition"
                                >
                                    批准通过
                                </button>
                                <button
                                    onClick={() => {
                                        handleReject(selectedMaterial.id);
                                        setSelectedMaterial(null);
                                    }}
                                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold transition"
                                >
                                    拒绝作品
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentWorksViewer;
