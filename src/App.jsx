import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import ChaosGallery from './components/ChaosGallery';
import LoadingScreen from './components/LoadingScreen';
import { removeBackground, getSquareCanvas512 } from './utils/imageProcessing';
// 使用 Vite 的 ?url 查询符引入静态资源，获得正确的 URL
import loveMusic from '../public/love.mp3?url';

function App() {
    const [files, setFiles] = useState([]);
    const [defaultTolerance, setDefaultTolerance] = useState(13); // ★★★ 修改：默认去背景强度改为13 ★★★
    const [selectedId, setSelectedId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [flashEffect, setFlashEffect] = useState(false);
    const [videoAspectRatio, setVideoAspectRatio] = useState(1);
    const [viewMode, setViewMode] = useState('capture');

    // ★★★ 吸管工具状态 ★★★
    const [eyedropperActive, setEyedropperActive] = useState(false); // 是否启用吸管工具
    const [backgroundColor, setBackgroundColor] = useState(null); // 全局选定的背景色（拍摄页面使用）
    const [cursorColorPreview, setCursorColorPreview] = useState(null); // 光标处颜色预览
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 }); // 光标位置
    const [detailBackgroundColor, setDetailBackgroundColor] = useState(null); // 详情页面本地背景色（不影响全局）

    // ★★★ 新增：纯色材质编辑状态（仅在详情页使用） ★★★
    const [editingColor, setEditingColor] = useState('#ff6b9d');
    const [useRandomColor, setUseRandomColor] = useState(false);

    // ★★★ 新增：下载命名面板状态 ★★★
    const [showDownloadDialog, setShowDownloadDialog] = useState(false);
    const [zipFileName, setZipFileName] = useState('');
    const [zipNameError, setZipNameError] = useState('');

    // ★★★ 默认使用love.mp3作为MV模式音乐 ★★★
    // 使用 import 引入的 URL，支持部署到任意路径
    const audioUrl = loveMusic;

    // ★★★ 监听下载对话框状态，重置表单 ★★★
    useEffect(() => {
        if (showDownloadDialog) {
            setZipFileName('');
            setZipNameError('');
        }
    }, [showDownloadDialog]);
    
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null);
    const debounceTimerRef = useRef(null);
    const colorPickerCanvasRef = useRef(null); // 用于颜色提取的隐藏画布 

    useEffect(() => {
        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(timer);
                    setTimeout(() => setLoading(false), 800); 
                    return 100;
                }
                const increment = Math.random() * 8; 
                return Math.min(prev + increment, 100);
            });
        }, 100);
        return () => clearInterval(timer);
    }, []);

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
        if (viewMode === 'capture' && !loading) {
            startCamera();
            // 切换到拍摄模式时清除缓存
            if (colorPickerCanvasRef.current) {
                colorPickerCanvasRef.current = null;
            }
            setCursorColorPreview(null);
            setCursorPosition({ x: 0, y: 0 });
            setDetailBackgroundColor(null); // 清除详情页面背景色
        }
        else {
            stopCamera();
        }
        return () => stopCamera();
    }, [viewMode, loading]);
    
    useEffect(() => {
        if (viewMode === 'capture' && !selectedId && !loading && streamRef.current && videoRef.current) {
            if (videoRef.current.srcObject !== streamRef.current) {
                videoRef.current.srcObject = streamRef.current;
                videoRef.current.play().catch(e => console.log("自动恢复播放失败:", e));
            }
        }
    }, [selectedId, viewMode, loading]); 

    const handleVideoMetadata = (e) => {
        const v = e.target;
        if (v.videoWidth && v.videoHeight) setVideoAspectRatio(v.videoWidth / v.videoHeight);
    };

    // ★★★ 修改：生成自然随机颜色（不限制高纯度） ★★★
    const generateRandomColor = () => {
        const hue = Math.random() * 360;
        const saturation = 20 + Math.random() * 60; // 20-80%（更自然的饱和度）
        const lightness = 30 + Math.random() * 50; // 30-80%（更自然的亮度）
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    };

    const reProcessFile = async (fileObj, newTolerance) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = async () => {
                if (fileObj.materialType === 'solid-color') {
                    // ★★★ 纯色材质：保持颜色，重新生成 ★★★
                    const color = fileObj.color || editingColor || generateRandomColor();
                    const updated = await generateSolidColorMaterial(
                        { ...fileObj, tolerance: newTolerance },
                        color
                    );
                    resolve(updated);
                } else {
                    // ★★★ 图像材质：原有逻辑 ★★★
                    const canvas = document.createElement('canvas');
                    canvas.width = 512; canvas.height = 512;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    // ★★★ 使用文件中的背景色，如果没有则使用白色 ★★★
                    const processedCanvas = removeBackground(canvas, newTolerance, fileObj.backgroundColor);
                    processedCanvas.toBlob((blob) => {
                        resolve({
                            ...fileObj,
                            tolerance: newTolerance,
                            processedUrl: URL.createObjectURL(blob),
                            blob: blob
                        });
                    }, 'image/png');
                }
            };
            img.src = fileObj.originalUrl;
        });
    };

    const handleSliderChange = (e) => {
        const newVal = parseFloat(e.target.value);
        if (selectedId) {
            setFiles(prev => prev.map(f => f.id === selectedId ? { ...f, tolerance: newVal } : f));
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = setTimeout(async () => {
                const targetFile = files.find(f => f.id === selectedId);
                if (targetFile) {
                    const updatedFile = await reProcessFile(targetFile, newVal);
                    setFiles(prev => prev.map(f => f.id === selectedId ? updatedFile : f));
                }
            }, 300);
        } else {
            setDefaultTolerance(newVal);
        }
    };

    const captureAndProcess = useCallback(async (bgColor) => {
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
        // ★★★ 如果没有传递 bgColor，使用当前选择的背景色 ★★★
        const finalCanvas = removeBackground(processCanvas, defaultTolerance, bgColor || backgroundColor);

        finalCanvas.toBlob(blob => {
            const newFile = {
                id: Date.now(),
                name: `capture_${Date.now()}.png`,
                originalUrl: rawSquareUrl,
                processedUrl: URL.createObjectURL(blob),
                blob: blob,
                tolerance: defaultTolerance,
                materialType: 'image', // ★★★ 默认为图像材质 ★★★
                status: 'done',
                backgroundColor: bgColor || backgroundColor || null // ★★★ 保存背景色信息 ★★★
            };
            setFiles(prev => [...prev, newFile]);
        }, 'image/png');
    }, [defaultTolerance, backgroundColor]); // 添加 backgroundColor 依赖

    // ★★★ 从视频中提取颜色值 ★★★
    const extractColorFromVideo = useCallback((e, isPreview = false) => {
        if (!videoRef.current || !eyedropperActive) return;

        const video = videoRef.current;

        // 每次都创建新的canvas，确保获取最新帧
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        // 获取光标位置（相对于当前事件目标元素）
        const rect = e.currentTarget.getBoundingClientRect();
        const relativeX = (e.clientX - rect.left) / rect.width;
        const relativeY = (e.clientY - rect.top) / rect.height;

        // 计算中央正方形区域在video中的实际位置
        const videoWidth = canvas.width;
        const videoHeight = canvas.height;
        const videoAspectRatio = videoWidth / videoHeight;

        let squareX, squareY, squareSize;

        if (videoAspectRatio > 1) {
            // 横向视频：正方形区域垂直居中
            squareSize = videoHeight;
            squareX = (videoWidth - squareSize) / 2;
            squareY = 0;
        } else {
            // 竖向视频：正方形区域水平居中
            squareSize = videoWidth;
            squareX = 0;
            squareY = (videoHeight - squareSize) / 2;
        }

        // 检查光标是否在中央正方形区域内
        if (relativeX < 0 || relativeX > 1 || relativeY < 0 || relativeY > 1) {
            return; // 光标在正方形区域外，不取色
        }

        // 将正方形区域内的坐标转换为video中的实际像素坐标
        const x = Math.floor(squareX + relativeX * squareSize);
        const y = Math.floor(squareY + relativeY * squareSize);

        // 确保坐标在有效范围内
        const finalX = Math.max(0, Math.min(x, videoWidth - 1));
        const finalY = Math.max(0, Math.min(y, videoHeight - 1));

        // 获取像素颜色
        const imageData = ctx.getImageData(finalX, finalY, 1, 1);
        const pixelData = imageData.data;

        const color = {
            r: pixelData[0],
            g: pixelData[1],
            b: pixelData[2]
        };

        if (isPreview) {
            // 实时预览模式，只更新预览颜色
            setCursorColorPreview(color);
        } else {
            // 点击确认模式，设置背景色并退出吸管工具
            setBackgroundColor(color);
            setEyedropperActive(false);
            setCursorColorPreview(null);
            setCursorPosition({ x: 0, y: 0 });
        }
    }, [eyedropperActive]);

    // ★★★ 从详情页图像中提取颜色值 ★★★
    const extractColorFromImage = useCallback(async (e) => {
        if (!eyedropperActive || !selectedId) return;

        // 在事件处理时立即捕获所有需要的数据
        const rect = e.currentTarget.getBoundingClientRect();
        const clientX = e.clientX;
        const clientY = e.clientY;
        const targetId = selectedId;

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            // 重新从 files 数组中查找文件，避免使用可能过时的 selectedFile
            const currentFile = files.find(f => f.id === targetId);
            if (!currentFile) return;

            const canvas = colorPickerCanvasRef.current;
            if (!canvas) {
                colorPickerCanvasRef.current = document.createElement('canvas');
            }

            const pickerCanvas = colorPickerCanvasRef.current;
            pickerCanvas.width = 512;
            pickerCanvas.height = 512;
            const ctx = pickerCanvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            // 使用之前捕获的坐标数据
            const x = Math.floor((clientX - rect.left) / rect.width * pickerCanvas.width);
            const y = Math.floor((clientY - rect.top) / rect.height * pickerCanvas.height);

            // 获取像素颜色
            const imageData = ctx.getImageData(x, y, 1, 1);
            const pixelData = imageData.data;

            const newBgColor = {
                r: pixelData[0],
                g: pixelData[1],
                b: pixelData[2]
            };

            setDetailBackgroundColor(newBgColor); // 使用本地状态，不影响全局

            // ★★★ 立即使用新背景色重新处理图像并显示效果 ★★★
            const originalImg = new Image();
            originalImg.onload = () => {
                const processCanvas = document.createElement('canvas');
                processCanvas.width = 512; processCanvas.height = 512;
                const processCtx = processCanvas.getContext('2d');
                processCtx.drawImage(originalImg, 0, 0);

                // 使用新背景色重新处理
                const finalCanvas = removeBackground(processCanvas, currentFile.tolerance, newBgColor);

                finalCanvas.toBlob(blob => {
                    const updatedFile = {
                        ...currentFile,
                        backgroundColor: newBgColor,
                        processedUrl: URL.createObjectURL(blob),
                        blob: blob
                    };
                    setFiles(prev => prev.map(f => f.id === targetId ? updatedFile : f));
                }, 'image/png');
            };
            originalImg.src = currentFile.originalUrl;

            // 退出吸管工具模式
            setEyedropperActive(false);
            setCursorColorPreview(null);
        };
        img.src = files.find(f => f.id === selectedId)?.originalUrl; // 使用原始图像取色
    }, [eyedropperActive, selectedId, files]); // 移除 selectedFile，添加 files

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && viewMode === 'capture' && cameraActive) {
                e.preventDefault();
                // ★★★ 使用当前选择的背景色 ★★★
                captureAndProcess(backgroundColor);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, cameraActive, captureAndProcess, backgroundColor]);

    const handleFileUpload = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        if (selectedFiles.length === 0) return;
        setIsProcessing(true);
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
                            materialType: 'image', // ★★★ 默认为图像材质 ★★★
                            status: 'done'
                        });
                        URL.revokeObjectURL(tempUrl);
                    }, 'image/png');
                };
                img.src = tempUrl;
            });
        }));
        setFiles(prev => [...prev, ...newProcessedFiles]);
        setIsProcessing(false);
        e.target.value = '';
    };


    // ★★★ 新增：生成纯色材质 ★★★
    const generateSolidColorMaterial = useCallback(async (fileObj, color) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 512; canvas.height = 512;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                // ★★★ 创建 alpha 遮罩（使用背景色） ★★★
                const maskCanvas = removeBackground(canvas, fileObj.tolerance, fileObj.backgroundColor);

                // 生成纯色
                const colorCanvas = document.createElement('canvas');
                colorCanvas.width = 512; colorCanvas.height = 512;
                const colorCtx = colorCanvas.getContext('2d');
                colorCtx.fillStyle = color;
                colorCtx.fillRect(0, 0, 512, 512);
                colorCtx.globalCompositeOperation = 'destination-in';
                colorCtx.drawImage(maskCanvas, 0, 0);

                colorCanvas.toBlob(blob => {
                    resolve({
                        ...fileObj,
                        materialType: 'solid-color',
                        color: color,
                        processedUrl: URL.createObjectURL(blob),
                        blob: blob
                    });
                }, 'image/png');
            };
            img.src = fileObj.originalUrl;
        });
    }, []);

    // ★★★ 新增：切换到图像材质（保持数据） ★★★
    const switchToImageMaterial = useCallback(async (fileObj) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 512; canvas.height = 512;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                // ★★★ 使用文件中的背景色，如果没有则使用白色 ★★★
                const finalCanvas = removeBackground(canvas, fileObj.tolerance, fileObj.backgroundColor);

                finalCanvas.toBlob(blob => {
                    resolve({
                        ...fileObj,
                        materialType: 'image',
                        // 保留 color 数据以便切换回来
                        processedUrl: URL.createObjectURL(blob),
                        blob: blob
                    });
                }, 'image/png');
            };
            img.src = fileObj.originalUrl;
        });
    }, []);

    const downloadZip = async (customName) => {
        if (files.length === 0) return;
        setIsZipping(true);
        const zip = new JSZip();
        files.forEach((file, index) => { zip.file(`${index + 1}.png`, file.blob); });
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${customName || 'papercut_assets'}.zip`;
        link.click();
        setIsZipping(false);
    };

    const clearAll = () => { 
        if(confirm("确定重置整个生态系统吗？所有蝴蝶将消失。")) {
            setFiles([]); 
            setSelectedId(null);
        }
    }

    const selectedFile = useMemo(() => files.find(f => f.id === selectedId), [files, selectedId]);
    
    const currentSliderValue = useMemo(() => {
        if (selectedId && selectedFile) {
            return selectedFile.tolerance;
        }
        return defaultTolerance;
    }, [selectedId, selectedFile, defaultTolerance]);

    if (loading) {
        return <LoadingScreen progress={Math.round(progress)} />;
    }

    if (viewMode === 'gallery') {
        return <ChaosGallery files={files} onBack={() => setViewMode('capture')} audioUrl={audioUrl} />;
    }

    return (
        <div className="h-screen flex flex-col md:flex-row bg-slate-900 overflow-hidden font-sans">
            <div className="order-2 md:order-1 h-2/5 md:h-full md:w-96 flex flex-col bg-slate-800 border-t md:border-t-0 md:border-r border-slate-700 z-30 shadow-2xl">
                <div className="hidden md:flex p-6 bg-slate-900 border-b border-slate-700 justify-between items-center">
                    <div>
                        <h1 className="text-white font-serif tracking-wider text-xl">采集素材</h1>
                        <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">-------------</p>
                    </div>
                    <span className="text-xs bg-cyan-900/50 text-cyan-300 px-3 py-1 rounded-full border border-cyan-800 font-mono">已采集{files.length}个作品</span>
                </div>

                <div className="hidden md:grid grid-cols-2 p-4 gap-3 bg-slate-800">
                     <button onClick={() => fileInputRef.current.click()} className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20" disabled={isProcessing}>
                        <span>导入图片</span>
                    </button>
                    <button onClick={() => setShowDownloadDialog(true)} className={`px-4 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 border ${files.length > 0 ? 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-900/20' : 'bg-transparent border-slate-600 text-slate-400 hover:border-cyan-500 hover:text-cyan-400'}`} title="下载所有素材">
                        <span>⬇ 下载素材</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 hide-scrollbar bg-slate-800/50" onClick={(e) => {
                    if(e.target === e.currentTarget) setSelectedId(null);
                }}>
                    <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-x-hidden pb-10">
                        {files.length === 0 ? (
                            <div className="w-full col-span-3 text-center text-slate-600 text-sm py-12 flex flex-col items-center">
                                <div className="w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 text-2xl">🦋</div>
                                <p>素材箱是空的</p>
                                <p className="text-xs mt-2 opacity-50">拍摄或导入图片</p>
                            </div>
                        ) : (
                            files.map((file, index) => (
                                <div
                                    key={file.id}
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(file.id); }}
                                    className={`relative flex-shrink-0 w-20 h-20 md:w-full md:h-auto md:aspect-square bg-slate-700 rounded-xl overflow-hidden group cursor-pointer border transition-all duration-300 ${
                                        selectedId === file.id ? 'border-green-500 ring-2 ring-green-500/20 shadow-xl z-10 scale-105' : 'border-slate-600 hover:border-slate-400'
                                    }`}
                                >
                                    <div className="absolute top-1 left-1 text-[8px] bg-black/40 px-1.5 py-0.5 rounded text-white z-20 font-mono">{index + 1}</div>
                                    {/* ★★★ 新增：材质类型标签 ★★★ */}
                                    {file.materialType === 'solid-color' && (
                                        <div className="absolute top-1 right-1 z-30">
                                            <div className="text-[8px] bg-purple-600/90 px-1 py-0.5 rounded text-white font-mono">COLOR</div>
                                        </div>
                                    )}
                                    {file.materialType === 'image' && (
                                        <div className="absolute top-1 right-1 text-[8px] bg-blue-600/90 px-1.5 py-0.5 rounded text-white z-30 font-mono">IMG</div>
                                    )}
                                    <div className="w-full h-full checkerboard flex items-center justify-center p-2">
                                        {isProcessing && selectedId === file.id ? (
                                            <div className="w-4 h-4 border-2 border-green-500 rounded-full animate-spin border-t-transparent"></div>
                                        ) : (
                                            <img src={file.processedUrl} className="w-full h-full object-contain drop-shadow-md" />
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFiles(files.filter(f => f.id !== file.id));
                                            if (selectedId === file.id) setSelectedId(null);
                                        }}
                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-40"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))
                        )}
                        <div className="w-4 flex-shrink-0 md:hidden"></div>
                    </div>
                </div>

                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <div className="flex gap-3">
                         <button
                            onClick={() => setViewMode('gallery')}
                            disabled={files.length === 0}
                            className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl flex items-center justify-center font-bold shadow-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            开始预览素材
                        </button>
                    </div>
                    <div className="flex md:hidden gap-2 mt-3 pt-3 border-t border-slate-800">
                        <button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 bg-slate-800 rounded-lg text-xs text-blue-200 border border-slate-700">导入图片</button>
                        <button onClick={() => setShowDownloadDialog(true)} className={`flex-1 py-2 rounded-lg text-xs border ${files.length > 0 ? 'bg-cyan-900/30 border-cyan-800 text-cyan-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            下载
                        </button>
                    </div>
                </div>
            </div>

            <div className="order-1 md:order-2 flex-1 relative bg-black flex items-center justify-center overflow-hidden" onClick={() => setSelectedId(null)}>
                {selectedFile ? (
                    <div
                        className="relative w-full h-full flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ★★★ 预览区域（棋盘格透明背景，图像外黑色） ★★★ */}
                        <div className="relative flex-1 flex items-center justify-center h-full">
                            {/* 图像外黑色背景 */}
                            <div className="absolute inset-0 bg-black"></div>
                            {/* 棋盘格透明背景 */}
                            <div className="checkerboard opacity-75 w-full h-full absolute inset-0"></div>

                            {/* 返回拍摄按钮 */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedId(null);
                                }}
                                className="absolute top-4 left-4 z-40 px-3 py-2 bg-slate-800/90 backdrop-blur-sm hover:bg-slate-700/90 text-white text-xs font-medium rounded-lg border border-slate-600 transition-all flex items-center gap-2"
                            >
                                ← 返回拍摄
                            </button>

                            {/* 图像 - 吸管工具激活时显示原始图像，否则显示处理后图像 */}
                            <img
                                src={eyedropperActive ? selectedFile.originalUrl : selectedFile.processedUrl}
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
                                        // 使用绝对坐标（屏幕坐标）来定位预览色彩方块
                                        const absoluteX = e.clientX;
                                        const absoluteY = e.clientY;

                                        // 检查鼠标是否在图像范围内（使用原始图像进行检测）
                                        const img = e.currentTarget;
                                        const rect = img.getBoundingClientRect();
                                        const relativeX = (e.clientX - rect.left) / rect.width;
                                        const relativeY = (e.clientY - rect.top) / rect.height;

                                        if (relativeX >= 0 && relativeX <= 1 && relativeY >= 0 && relativeY <= 1) {
                                            // 将绝对坐标转换为预览区域的相对位置（百分比）
                                            const previewRect = e.currentTarget.parentElement.getBoundingClientRect();
                                            const previewX = ((e.clientX - previewRect.left) / previewRect.width) * 100;
                                            const previewY = ((e.clientY - previewRect.top) / previewRect.height) * 100;
                                            setCursorPosition({ x: previewX, y: previewY });

                                            // 实时预览颜色（使用原始图像）
                                            const pixelX = Math.max(0, Math.min(Math.floor(relativeX * 512), 511));
                                            const pixelY = Math.max(0, Math.min(Math.floor(relativeY * 512), 511));

                                            const canvas = colorPickerCanvasRef.current;
                                            if (!canvas) {
                                                colorPickerCanvasRef.current = document.createElement('canvas');
                                            }
                                            const pickerCanvas = colorPickerCanvasRef.current;
                                            pickerCanvas.width = 512;
                                            pickerCanvas.height = 512;
                                            const ctx = pickerCanvas.getContext('2d');
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
                                            image.src = selectedFile.originalUrl; // 使用原始图像取色
                                        } else {
                                            // 鼠标在图像外，清除预览
                                            setCursorColorPreview(null);
                                        }
                                    }
                                }}
                            />

                            {/* 颜色预览（详情页） - 跟随绝对坐标，提高层级 */}
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

                            {/* 移除详情页左上角的独立吸管工具面板 - 已整合到编辑面板中 */}

                            {/* 吸管工具提示（移到区域外） */}
                            {eyedropperActive && (
                                <div className="absolute bottom-[-2.5rem] left-1/2 -translate-x-1/2 text-white/90 text-xs font-mono tracking-widest pointer-events-none bg-black/50 px-3 py-1.5 rounded-lg whitespace-nowrap">
                                    CLICK TO SELECT BACKGROUND COLOR
                                </div>
                            )}
                        </div>

                        {/* ★★★ 悬浮编辑面板（右上角，更小尺寸） ★★★ */}
                        <div className="absolute top-4 right-4 w-56 bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl flex flex-col max-h-[70vh] z-50">
                            {/* 标题栏 */}
                            <div className="p-3 border-b border-slate-700 flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-serif tracking-wider text-base">编辑素材</h3>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                                    className="w-7 h-7 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition text-sm"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Tolerance 滑杆 */}
                            <div className="p-2.5 border-b border-slate-700">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold tracking-wide text-slate-300">
                                        去背景强度
                                    </span>
                                    <span className="text-xs text-cyan-400 font-mono bg-cyan-900/30 px-2 rounded">
                                        {Number(selectedFile.tolerance).toFixed(1)}
                                    </span>
                                </div>
                                <div className="relative h-5 flex items-center select-none w-full">
                                    <div className="absolute w-full h-1 bg-slate-600 rounded-lg top-1/2 -translate-y-1/2 left-0"></div>
                                    <div
                                        className="absolute h-1 bg-cyan-500 rounded-l-lg top-1/2 -translate-y-1/2 left-0 pointer-events-none"
                                        style={{ width: `${(selectedFile.tolerance / 80) * 100}%` }}
                                    ></div>
                                    <input
                                        type="range"
                                        min="1" max="80" step="0.5"
                                        value={selectedFile.tolerance}
                                        onChange={handleSliderChange}
                                        className="absolute w-full h-full opacity-100 z-20 cursor-pointer inset-0 m-0 p-0"
                                    />
                                </div>
                            </div>

                            {/* 背景色吸管工具（整合到编辑面板） */}
                            {selectedFile?.materialType === 'image' && (
                                <div className="p-2.5 border-b border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <button
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const newState = !eyedropperActive;
                                                    setEyedropperActive(newState);
                                                    if (newState) {
                                                        // 激活吸管工具时清除缓存
                                                        if (colorPickerCanvasRef.current) {
                                                            colorPickerCanvasRef.current = null;
                                                        }
                                                        setCursorColorPreview(null);
                                                        setCursorPosition({ x: 0, y: 0 });
                                                    } else {
                                                        // 关闭吸管工具时清除预览
                                                        setCursorColorPreview(null);
                                                        setCursorPosition({ x: 0, y: 0 });
                                                    }
                                                }}
                                                onTouchStart={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const newState = !eyedropperActive;
                                                    setEyedropperActive(newState);
                                                    if (newState) {
                                                        // 激活吸管工具时清除缓存
                                                        if (colorPickerCanvasRef.current) {
                                                            colorPickerCanvasRef.current = null;
                                                        }
                                                        setCursorColorPreview(null);
                                                        setCursorPosition({ x: 0, y: 0 });
                                                    } else {
                                                        // 关闭吸管工具时清除预览
                                                        setCursorColorPreview(null);
                                                        setCursorPosition({ x: 0, y: 0 });
                                                    }
                                                }}
                                                style={{ pointerEvents: 'auto' }}
                                                className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition border relative ${
                                                    eyedropperActive
                                                        ? 'bg-yellow-600 border-yellow-500 text-white shadow-lg'
                                                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-yellow-500'
                                                }`}
                                            >
                                                {eyedropperActive ? '点击图像选择' : '设置背景色'}
                                            </button>
                                        </div>
                                        {/* 背景色色块 */}
                                        <div
                                            className="w-10 h-10 rounded border-2 border-white/50 relative overflow-hidden flex-shrink-0"
                                            style={{
                                                backgroundColor: detailBackgroundColor || selectedFile.backgroundColor
                                                    ? `rgb(${detailBackgroundColor?.r || selectedFile.backgroundColor?.r}, ${detailBackgroundColor?.g || selectedFile.backgroundColor?.g}, ${detailBackgroundColor?.b || selectedFile.backgroundColor?.b})`
                                                    : '#ffffff'
                                            }}
                                        >
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 材质类型切换 */}
                            <div className="p-2.5 border-b border-slate-700">
                                <span className="text-xs font-bold tracking-wide text-slate-400 mb-2 block">
                                    材质模式
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!selectedFile) return;
                                            if (selectedFile.materialType === 'image') return;
                                            switchToImageMaterial(selectedFile).then(updated => {
                                                setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                            });
                                        }}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!selectedFile) return;
                                            if (selectedFile.materialType === 'image') return;
                                            switchToImageMaterial(selectedFile).then(updated => {
                                                setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                            });
                                        }}
                                        style={{ pointerEvents: 'auto' }}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition border relative ${
                                            selectedFile?.materialType === 'image'
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                                : 'bg-transparent border-slate-600 text-slate-300 hover:border-blue-500'
                                        }`}
                                    >
                                        📷 图像
                                    </button>
                                    <button
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!selectedFile) return;
                                            if (selectedFile.materialType === 'solid-color') return;
                                            const color = selectedFile.color || editingColor || generateRandomColor();
                                            generateSolidColorMaterial(selectedFile, color).then(updated => {
                                                setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                setEditingColor(color);
                                            });
                                        }}
                                        onTouchStart={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            if (!selectedFile) return;
                                            if (selectedFile.materialType === 'solid-color') return;
                                            const color = selectedFile.color || editingColor || generateRandomColor();
                                            generateSolidColorMaterial(selectedFile, color).then(updated => {
                                                setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                setEditingColor(color);
                                            });
                                        }}
                                        style={{ pointerEvents: 'auto' }}
                                        className={`px-3 py-2 rounded-lg text-xs font-medium transition border relative ${
                                            selectedFile?.materialType === 'solid-color'
                                                ? 'bg-purple-600 border-purple-500 text-white shadow-lg'
                                                : 'bg-transparent border-slate-600 text-slate-300 hover:border-purple-500'
                                        }`}
                                    >
                                        🎨 纯色
                                    </button>
                                </div>
                            </div>

                            {/* 纯色材质控制面板 */}
                            {selectedFile?.materialType === 'solid-color' && (
                                <div className="flex-1 p-3 overflow-y-auto">
                                    <div className="space-y-2 p-2 bg-slate-900/50 rounded-xl border border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-300">颜色设置</span>
                                            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={useRandomColor}
                                                    onChange={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setUseRandomColor(e.target.checked);
                                                    }}
                                                    style={{ pointerEvents: 'auto' }}
                                                    className="w-3 h-3 rounded border-slate-600 bg-slate-800 text-purple-600"
                                                />
                                                随机
                                            </label>
                                        </div>

                                        {!useRandomColor ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="color"
                                                    value={selectedFile.color || editingColor}
                                                    onChange={(e) => {
                                                        e.stopPropagation();
                                                        const newColor = e.target.value;
                                                        generateSolidColorMaterial(selectedFile, newColor).then(updated => {
                                                            setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                            setEditingColor(newColor);
                                                        });
                                                    }}
                                                    style={{ pointerEvents: 'auto' }}
                                                    className="w-full h-10 rounded border border-slate-600 cursor-pointer"
                                                />
                                                <div className="text-xs text-slate-400">
                                                    {selectedFile.color || editingColor}
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const newColor = generateRandomColor();
                                                    generateSolidColorMaterial(selectedFile, newColor).then(updated => {
                                                        setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                        setEditingColor(newColor);
                                                    });
                                                }}
                                                style={{ pointerEvents: 'auto' }}
                                                className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs font-medium transition"
                                            >
                                                🎲 随机颜色
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <div
                            className={`relative flex items-center justify-center overflow-hidden ${eyedropperActive ? 'cursor-crosshair' : ''}`}
                            style={{
                                aspectRatio: '1/1',
                                height: '75%',
                                width: 'auto'
                            }}
                        >
                            <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={handleVideoMetadata} className="w-full h-full object-cover opacity-80" />

                            {/* 中央方形区域 - 移除原来的吸管工具面板 */}
                            <div
                                className={`absolute inset-0 border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] ${eyedropperActive ? 'cursor-crosshair' : 'cursor-pointer'} transition-all duration-300 z-20`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (eyedropperActive) {
                                        extractColorFromVideo(e, false);
                                    } else if (cameraActive && !isProcessing) {
                                        captureAndProcess(backgroundColor);
                                    }
                                }}
                                onMouseMove={(e) => {
                                    if (eyedropperActive) {
                                        // 记录光标位置（相对于当前元素）
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                        const y = ((e.clientY - rect.top) / rect.height) * 100;

                                        // 检查光标是否在中央正方形区域内
                                        if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
                                            setCursorPosition({ x, y });
                                            // 立即提取颜色，确保位置一致
                                            extractColorFromVideo(e, true);
                                        } else {
                                            // 光标在正方形区域外，清除预览
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

                                {/* 颜色预览 - 位置调整：向上2像素，向左1像素 */}
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
                                    ? "CLICK TO SELECT BACKGROUND COLOR"
                                    : (cameraActive ? "CLICK ANYWHERE TO CAPTURE" : "CAMERA OFFLINE")
                                }
                            </div>
                        </div>

                        {/* ★★★ 拍摄界面控制面板（移到区域外） ★★★ */}
                        <div className="absolute top-2 left-2 z-40 flex flex-col gap-2">
                            {/* 吸管工具面板 */}
                            <div
                                className={`cursor-pointer transition-all ${eyedropperActive ? 'scale-110' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const newState = !eyedropperActive;
                                    setEyedropperActive(newState);
                                    if (newState) {
                                        // 激活吸管工具时清除缓存
                                        if (colorPickerCanvasRef.current) {
                                            colorPickerCanvasRef.current = null;
                                        }
                                        setCursorColorPreview(null);
                                        setCursorPosition({ x: 0, y: 0 });
                                    } else {
                                        // 关闭吸管工具时清除预览
                                        setCursorColorPreview(null);
                                        setCursorPosition({ x: 0, y: 0 });
                                    }
                                }}
                            >
                                <div
                                    className={`bg-slate-800/90 backdrop-blur-sm px-2 py-1.5 rounded-lg border-2 flex items-center gap-2 ${
                                        eyedropperActive
                                            ? 'border-yellow-400 shadow-lg shadow-yellow-900/50'
                                            : 'border-slate-700 hover:border-slate-600'
                                    }`}
                                >
                                    {/* 背景色色块 */}
                                    <div
                                        className="w-6 h-6 rounded border border-white/50 relative overflow-hidden"
                                        style={{
                                            backgroundColor: backgroundColor
                                                ? `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`
                                                : '#ffffff'
                                        }}
                                    >
                                    </div>
                                    {/* RGB值和标题 */}
                                    <div>
                                        <span className="text-white text-[10px] font-medium block">
                                            设置背景色
                                        </span>
                                        {backgroundColor ? (
                                            <div className="flex flex-col">
                                                <span className="text-white text-[10px] font-medium">
                                                    {backgroundColor.r}, {backgroundColor.g}, {backgroundColor.b}
                                                </span>
                                                <span className="text-slate-400 text-[9px]">
                                                    {eyedropperActive ? '点击选择' : '点击切换'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col">
                                                <span className="text-white text-[10px] font-medium">
                                                    未选择
                                                </span>
                                                <span className="text-slate-400 text-[9px]">
                                                    {eyedropperActive ? '点击选择' : '点击启用'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* 去背景强度滑杆 */}
                            <div className="bg-slate-800/90 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-slate-700">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-white text-[10px] font-medium">
                                        去背景强度
                                    </span>
                                    <span className="text-cyan-400 text-[10px] font-mono bg-cyan-900/30 px-1.5 rounded">
                                        {Number(defaultTolerance).toFixed(1)}
                                    </span>
                                </div>
                                <div className="relative h-4 flex items-center select-none w-40">
                                    <div className="absolute w-full h-1 bg-slate-600 rounded-lg top-1/2 -translate-y-1/2 left-0"></div>
                                    <div
                                        className="absolute h-1 bg-cyan-500 rounded-l-lg top-1/2 -translate-y-1/2 left-0 pointer-events-none"
                                        style={{ width: `${(defaultTolerance / 80) * 100}%` }}
                                    ></div>
                                    <input
                                        type="range"
                                        min="1" max="80" step="0.5"
                                        value={defaultTolerance}
                                        onChange={handleSliderChange}
                                        className="absolute w-full h-full opacity-0 z-20 cursor-pointer inset-0 m-0 p-0"
                                    />
                                </div>
                            </div>
                        </div>

                        {!cameraActive && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
                                 <button onClick={(e) => { e.stopPropagation(); startCamera(); }} className="px-8 py-4 bg-blue-600 rounded-full text-white font-bold tracking-widest hover:bg-blue-500 transition shadow-lg shadow-blue-900/50">
                                    START CAMERA
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

            {/* ★★★ 下载命名面板 ★★★ */}
            {showDownloadDialog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999]" onClick={() => setShowDownloadDialog(false)}>
                    <div className="bg-slate-800 rounded-2xl p-6 w-96 border border-slate-700 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-white font-serif text-lg mb-4">命名下载文件</h3>
                        <input
                            type="text"
                            value={zipFileName}
                            onChange={(e) => {
                                setZipFileName(e.target.value);
                                if (e.target.value.trim()) {
                                    setZipNameError('');
                                }
                            }}
                            placeholder="输入文件名"
                            className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 ${zipNameError ? 'border-red-500' : 'border-slate-600'}`}
                            autoFocus
                        />
                        {zipNameError && (
                            <p className="text-red-400 text-sm mt-2">{zipNameError}</p>
                        )}
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => {
                                    const trimmedName = zipFileName.trim();
                                    if (!trimmedName) {
                                        setZipNameError('请输入至少一个字符');
                                        return;
                                    }
                                    downloadZip(trimmedName);
                                    setShowDownloadDialog(false);
                                    setZipNameError('');
                                }}
                                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                            >
                                确认下载
                            </button>
                            <button
                                onClick={() => {
                                    setShowDownloadDialog(false);
                                    setZipNameError('');
                                }}
                                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;
