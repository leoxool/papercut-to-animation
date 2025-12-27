import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useClassroom } from '../../contexts/ClassroomContext';
import { removeBackground, getSquareCanvas512 } from '../../utils/imageProcessing';

const StudentDashboard = ({ files, onCapture, onSubmit }) => {
    const {
        classroom,
        joinClassroom,
        submitMaterial,
        connectedStudents,
        submittedMaterials
    } = useClassroom();

    const [showJoinDialog, setShowJoinDialog] = useState(!classroom);
    const [classroomCode, setClassroomCode] = useState('');
    const [selectedFileId, setSelectedFileId] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isJoining, setIsJoining] = useState(false);

    // ★★★ 获取当前选中的素材 ★★★
    const selectedFile = selectedFileId ? files.find(f => f.id === selectedFileId) : null;

    // ★★★ 采集工具状态 ★★★
    const [cameraActive, setCameraActive] = useState(false);
    const [flashEffect, setFlashEffect] = useState(false);
    const [defaultTolerance, setDefaultTolerance] = useState(13);
    const [backgroundColor, setBackgroundColor] = useState(null);
    const [eyedropperActive, setEyedropperActive] = useState(false);
    const [cursorColorPreview, setCursorColorPreview] = useState(null);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const [detailBackgroundColor, setDetailBackgroundColor] = useState(null);
    const [editingColor, setEditingColor] = useState('#ff6b9d');

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const colorPickerCanvasRef = useRef(null);
    const fileInputRef = useRef(null);

    // ★★★ 摄像头控制函数 ★★★
    const startCamera = async () => {
        try {
            const constraints = { video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if(videoRef.current) videoRef.current.srcObject = stream;
            streamRef.current = stream;
            setCameraActive(true);
        } catch (err) { console.error("相机启动失败:", err); }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setCameraActive(false);
        }
    };

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    // ★★★ 拍摄和颜色提取函数 ★★★
    const captureAndProcess = useCallback((bgColor) => {
        if (!videoRef.current || !streamRef.current) return;
        setFlashEffect(true);
        setTimeout(() => setFlashEffect(false), 100);

        const video = videoRef.current;
        const w = video.videoWidth; const h = video.videoHeight;
        const rawSquareCanvas = getSquareCanvas512(video, w, h);
        const rawSquareUrl = rawSquareCanvas.toDataURL('image/png');
        const processCanvas = document.createElement('canvas');
        processCanvas.width = 512; processCanvas.height = 512;
        processCanvas.getContext('2d').drawImage(rawSquareCanvas, 0, 0);
        const finalCanvas = removeBackground(processCanvas, defaultTolerance, bgColor || backgroundColor);

        finalCanvas.toBlob(blob => {
            const newFile = {
                id: Date.now(),
                name: `capture_${Date.now()}.png`,
                originalUrl: rawSquareUrl,
                processedUrl: URL.createObjectURL(blob),
                blob: blob,
                tolerance: defaultTolerance,
                materialType: 'image',
                status: 'done',
                backgroundColor: bgColor || backgroundColor || null
            };
            files.push(newFile);
        }, 'image/png');
    }, [defaultTolerance, backgroundColor]);

    const extractColorFromVideo = useCallback((e, isPreview = false) => {
        if (!videoRef.current || !eyedropperActive) return;

        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const scaleX = video.videoWidth / rect.width;
        const scaleY = video.videoHeight / rect.height;

        const imageData = ctx.getImageData(Math.floor(x * scaleX), Math.floor(y * scaleY), 1, 1);
        const pixelData = imageData.data;

        const color = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };

        if (isPreview) {
            setCursorColorPreview(color);
        } else {
            setBackgroundColor(color);
            setDetailBackgroundColor(color);
            setEyedropperActive(false);
            setCursorColorPreview(null);
        }
    }, [eyedropperActive]);

    const extractColorFromImage = useCallback((e) => {
        if (!selectedFileId) return;

        const file = files.find(f => f.id === selectedFileId);
        if (!file) return;

        const img = e.currentTarget;
        const rect = img.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const relativeX = x / rect.width;
        const relativeY = y / rect.height;

        const canvas = colorPickerCanvasRef.current || document.createElement('canvas');
        colorPickerCanvasRef.current = canvas;
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const image = new Image();
        image.onload = () => {
            ctx.drawImage(image, 0, 0);
            const pixelX = Math.max(0, Math.min(Math.floor(relativeX * 512), 511));
            const pixelY = Math.max(0, Math.min(Math.floor(relativeY * 512), 511));
            const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
            const pixelData = imageData.data;
            const color = { r: pixelData[0], g: pixelData[1], b: pixelData[2] };
            setDetailBackgroundColor(color);
            setEyedropperActive(false);
            setCursorColorPreview(null);
        };
        image.src = file.originalUrl;
    }, [selectedFileId, files]);

    // ★★★ 文件导入功能 ★★★
    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;

        const newProcessedFiles = await Promise.all(selectedFiles.map(async (file, index) => {
            return new Promise((resolve) => {
                const img = new Image();
                const tempUrl = URL.createObjectURL(file);
                img.onload = () => {
                    const rawSquareCanvas = getSquareCanvas512(img, img.width, img.height);
                    const rawSquareUrl = rawSquareCanvas.toDataURL('image/png');
                    const processCanvas = document.createElement('canvas');
                    processCanvas.width = 512; processCanvas.height = 512;
                    const ctx = processCanvas.getContext('2d');
                    ctx.drawImage(rawSquareCanvas, 0, 0);
                    const finalCanvas = removeBackground(processCanvas, defaultTolerance);
                    finalCanvas.toBlob(blob => {
                        const newId = Date.now() + Math.random() + index;
                        resolve({
                            id: newId,
                            name: file.name.replace(/\.[^/.]+$/, "") + "_512.png",
                            originalUrl: rawSquareUrl,
                            processedUrl: URL.createObjectURL(blob),
                            blob: blob,
                            tolerance: defaultTolerance,
                            materialType: 'image',
                            status: 'done'
                        });
                        URL.revokeObjectURL(tempUrl);
                    }, 'image/png');
                };
                img.src = tempUrl;
            });
        }));

        files.push(...newProcessedFiles);
        e.target.value = '';
    };

    // ★★★ 下载素材功能 ★★★
    const handleDownload = () => {
        if (files.length === 0) {
            alert('没有素材可下载');
            return;
        }

        files.forEach(file => {
            if (file.blob) {
                const url = URL.createObjectURL(file.blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        });
    };

    const handleJoinClassroom = async () => {
        if (classroomCode.length !== 4) {
            alert('请输入4位数字教室代码');
            return;
        }

        setIsJoining(true);
        try {
            const result = await joinClassroom(classroomCode);
            if (result) {
                setShowJoinDialog(false);
                alert('成功加入教室！');
            } else {
                alert('教室代码错误或不存在，请检查后重试');
            }
        } catch (error) {
            alert('加入教室失败：' + error.message);
        } finally {
            setIsJoining(false);
        }
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
                <div className="w-1/4 bg-slate-800 border-r border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-700">
                        <h2 className="text-white font-bold mb-3">我的素材库</h2>
                        <p className="text-slate-400 text-sm">
                            选择素材提交给老师进行审核
                        </p>
                    </div>

                    {/* 操作按钮 */}
                    <div className="p-4 border-b border-slate-700 space-y-2">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition"
                        >
                            📂 导入图片
                        </button>
                        <button
                            onClick={handleDownload}
                            disabled={files.length === 0}
                            className="w-full px-3 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
                        >
                            ⬇ 下载素材 ({files.length})
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept="image/*"
                            multiple
                            className="hidden"
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {files.length === 0 ? (
                            <div className="text-center text-slate-400 py-12">
                                <div className="text-4xl mb-4">📷</div>
                                <p className="mb-2">暂无素材</p>
                                <p className="text-xs opacity-75">使用摄像头拍摄或导入图片</p>
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

                {/* 右侧：摄像头/编辑区域 */}
                <div className="w-3/4 flex flex-col relative overflow-hidden">
                    {/* 顶部操作栏 */}
                    <div className="bg-slate-800 border-b border-slate-700 p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-white font-bold">📷 拍摄区域</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        const newState = !eyedropperActive;
                                        setEyedropperActive(newState);
                                        if (newState) {
                                            if (colorPickerCanvasRef.current) {
                                                colorPickerCanvasRef.current = null;
                                            }
                                            setCursorColorPreview(null);
                                            setCursorPosition({ x: 0, y: 0 });
                                        } else {
                                            setCursorColorPreview(null);
                                            setCursorPosition({ x: 0, y: 0 });
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                                        eyedropperActive
                                            ? 'bg-yellow-600 border-yellow-500 text-white'
                                            : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-yellow-500'
                                    }`}
                                >
                                    {eyedropperActive ? '🧪 取色中' : '🎨 吸管工具'}
                                </button>
                            </div>
                        </div>

                        {/* 背景色显示 */}
                        {backgroundColor && (
                            <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-xs">背景色:</span>
                                <div
                                    className="w-5 h-5 rounded border border-white/50"
                                    style={{
                                        backgroundColor: `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`
                                    }}
                                />
                                <span className="text-slate-400 text-xs font-mono">
                                    rgb({backgroundColor.r}, {backgroundColor.g}, {backgroundColor.b})
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 中央拍摄/编辑区域 */}
                    <div className="flex-1 flex items-center justify-center bg-black relative" onClick={() => setSelectedFileId(null)}>
                        {selectedFile ? (
                            <div
                                className="relative w-full h-full flex items-center justify-center"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="checkerboard opacity-75 w-full h-full absolute inset-0"></div>

                                <img
                                    src={selectedFile.processedUrl}
                                    className={`max-w-full max-h-full object-contain relative z-10 ${eyedropperActive ? 'cursor-crosshair' : ''}`}
                                    alt="Editing"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (eyedropperActive) {
                                            extractColorFromImage(e);
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        if (eyedropperActive) {
                                            const img = e.currentTarget;
                                            const rect = img.getBoundingClientRect();
                                            const relativeX = (e.clientX - rect.left) / rect.width;
                                            const relativeY = (e.clientY - rect.top) / rect.height;

                                            if (relativeX >= 0 && relativeX <= 1 && relativeY >= 0 && relativeY <= 1) {
                                                const previewRect = e.currentTarget.parentElement.getBoundingClientRect();
                                                const previewX = ((e.clientX - previewRect.left) / previewRect.width) * 100;
                                                const previewY = ((e.clientY - previewRect.top) / previewRect.height) * 100;
                                                setCursorPosition({ x: previewX, y: previewY });

                                                const pixelX = Math.max(0, Math.min(Math.floor(relativeX * 512), 511));
                                                const pixelY = Math.max(0, Math.min(Math.floor(relativeY * 512), 511));

                                                const canvas = colorPickerCanvasRef.current || document.createElement('canvas');
                                                colorPickerCanvasRef.current = canvas;
                                                canvas.width = 512;
                                                canvas.height = 512;
                                                const ctx = canvas.getContext('2d');
                                                const image = new Image();
                                                image.onload = () => {
                                                    ctx.drawImage(image, 0, 0);
                                                    const imageData = ctx.getImageData(pixelX, pixelY, 1, 1);
                                                    const pixelData = imageData.data;
                                                    setCursorColorPreview({
                                                        r: pixelData[0],
                                                        g: pixelData[1],
                                                        b: pixelData[2]
                                                    });
                                                };
                                                image.src = selectedFile.originalUrl;
                                            } else {
                                                setCursorColorPreview(null);
                                            }
                                        }
                                    }}
                                />

                                {/* 颜色预览 */}
                                {eyedropperActive && cursorColorPreview && (
                                    <div
                                        className="absolute w-[15px] h-[15px] border border-white pointer-events-none z-50"
                                        style={{
                                            backgroundColor: `rgb(${cursorColorPreview.r}, ${cursorColorPreview.g}, ${cursorColorPreview.b})`,
                                            top: `${cursorPosition.y}%`,
                                            left: `${cursorPosition.x}%`,
                                            transform: 'translate(calc(-50% + 9px), calc(-50% - 8px))'
                                        }}
                                    />
                                )}

                                {eyedropperActive && (
                                    <div className="absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 text-white/90 text-xs font-mono tracking-widest pointer-events-none bg-black/50 px-3 py-1.5 rounded-lg whitespace-nowrap">
                                        点击图像选择背景色
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div
                                className={`relative flex items-center justify-center overflow-hidden ${eyedropperActive ? 'cursor-crosshair' : ''}`}
                                style={{
                                    aspectRatio: '1/1',
                                    height: '75%',
                                    width: 'auto'
                                }}
                            >
                                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />

                                <div
                                    className={`absolute inset-0 border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] ${eyedropperActive ? 'cursor-crosshair' : 'cursor-pointer'} transition-all duration-300 z-20`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (eyedropperActive) {
                                            extractColorFromVideo(e, false);
                                        } else if (cameraActive) {
                                            captureAndProcess(backgroundColor);
                                        }
                                    }}
                                    onMouseMove={(e) => {
                                        if (eyedropperActive) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                                            const y = ((e.clientY - rect.top) / rect.height) * 100;

                                            if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
                                                setCursorPosition({ x, y });
                                                extractColorFromVideo(e, true);
                                            } else {
                                                setCursorColorPreview(null);
                                            }
                                        }
                                    }}
                                >
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                                    <div className={`absolute inset-0 bg-white transition-opacity duration-100 ease-out ${flashEffect ? 'opacity-80' : 'opacity-0'}`}></div>

                                    {/* 颜色预览 */}
                                    {eyedropperActive && cursorColorPreview && (
                                        <div
                                            className="absolute w-[15px] h-[15px] border border-white pointer-events-none"
                                            style={{
                                                backgroundColor: `rgb(${cursorColorPreview.r}, ${cursorColorPreview.g}, ${cursorColorPreview.b})`,
                                                top: `${cursorPosition.y}%`,
                                                left: `${cursorPosition.x}%`,
                                                transform: 'translate(calc(-50% + 9px), calc(-50% - 8px))'
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-red-400/100"></div>

                                <div className="absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 text-white/70 text-xs font-mono tracking-widest pointer-events-none whitespace-nowrap">
                                    {eyedropperActive
                                        ? "点击选择背景色"
                                        : (cameraActive ? "点击拍摄" : "摄像头离线")
                                    }
                                </div>
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
                            disabled={classroomCode.length !== 4 || isJoining}
                            className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-bold text-lg transition"
                        >
                            {isJoining ? '加入中...' : '加入教室'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;
