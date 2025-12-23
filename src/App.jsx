import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import ChaosGallery from './components/ChaosGallery';
import LoadingScreen from './components/LoadingScreen';
import { removeBackground, getSquareCanvas512 } from './utils/imageProcessing';

function App() {
    const [files, setFiles] = useState([]);
    const [defaultTolerance, setDefaultTolerance] = useState(38); // ★★★ 修改：默认去背景强度改为38 ★★★
    const [selectedId, setSelectedId] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [flashEffect, setFlashEffect] = useState(false);
    const [videoAspectRatio, setVideoAspectRatio] = useState(1);
    const [viewMode, setViewMode] = useState('capture');

    // ★★★ 新增：纯色材质编辑状态（仅在详情页使用） ★★★
    const [editingColor, setEditingColor] = useState('#ff6b9d');
    const [useRandomColor, setUseRandomColor] = useState(false);

    const [audioUrl, setAudioUrl] = useState(null);
    
    const [loading, setLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const fileInputRef = useRef(null); 
    const audioInputRef = useRef(null);
    const debounceTimerRef = useRef(null); 

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
        if (viewMode === 'capture' && !loading) startCamera();
        else stopCamera();
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
                    const processedCanvas = removeBackground(canvas, newTolerance);
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

    const captureAndProcess = useCallback(async () => {
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
        const finalCanvas = removeBackground(processCanvas, defaultTolerance);

        finalCanvas.toBlob(blob => {
            const newFile = {
                id: Date.now(),
                name: `capture_${Date.now()}.png`,
                originalUrl: rawSquareUrl,
                processedUrl: URL.createObjectURL(blob),
                blob: blob,
                tolerance: defaultTolerance,
                materialType: 'image', // ★★★ 默认为图像材质 ★★★
                status: 'done'
            };
            setFiles(prev => [...prev, newFile]);
        }, 'image/png');
    }, [defaultTolerance]); // ★★★ 移除依赖项，简化逻辑 ★★★

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && viewMode === 'capture' && cameraActive) {
                e.preventDefault(); 
                captureAndProcess();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewMode, cameraActive, captureAndProcess]);

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

    const handleAudioUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setAudioUrl(url);
        }
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

                // 创建 alpha 遮罩
                const maskCanvas = removeBackground(canvas, fileObj.tolerance);

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
                const finalCanvas = removeBackground(canvas, fileObj.tolerance);

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

    const downloadZip = async () => {
        if (files.length === 0) return;
        setIsZipping(true);
        const zip = new JSZip();
        files.forEach((file, index) => { zip.file(`${index + 1}.png`, file.blob); });
        const content = await zip.generateAsync({ type: "blob" });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = "papercut_ecology_assets.zip";
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
                
                <div className="px-6 py-6 bg-slate-800 border-b border-slate-700">
                    <div className="flex justify-between items-center mb-3">
                        <span className={`text-xs font-bold tracking-wide ${selectedId ? 'text-green-400' : 'text-slate-400'}`}>
                            {selectedId ? "当前容差调节 (Tolerance)" : "全局默认容差"}
                        </span>
                        <span className="text-xs text-cyan-400 font-mono bg-cyan-900/30 px-2 rounded">{Number(currentSliderValue).toFixed(1)}</span>
                    </div>
                    <div className="relative h-6 flex items-center select-none w-full">
                        <div className="absolute w-full h-1.5 bg-slate-600 rounded-lg top-1/2 -translate-y-1/2 left-0"></div>
                        <div
                            className="absolute h-1.5 bg-cyan-500 rounded-l-lg top-1/2 -translate-y-1/2 left-0 pointer-events-none"
                            style={{ width: `${(currentSliderValue / 80) * 100}%` }}
                        ></div>
                        <input
                            type="range"
                            min="1" max="80" step="0.5"
                            value={currentSliderValue}
                            onChange={handleSliderChange}
                            className="absolute w-full h-full opacity-100 z-20 cursor-pointer inset-0 m-0 p-0"
                        />
                    </div>
                </div>

                <div className="hidden md:grid grid-cols-2 p-4 gap-3 bg-slate-800">
                     <button onClick={() => fileInputRef.current.click()} className="px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20" disabled={isProcessing}>
                        <span>导入图片</span>
                    </button>
                    <button onClick={() => audioInputRef.current.click()} className={`px-4 py-3 rounded-xl text-sm font-medium transition flex items-center justify-center gap-2 border ${audioUrl ? 'bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-900/20' : 'bg-transparent border-slate-600 text-slate-400 hover:border-purple-500 hover:text-purple-400'}`} title="导入MP3">
                        <span>{audioUrl ? " 已加载音乐" : " 上传音乐"}</span>
                    </button>
                    {/*<button onClick={clearAll} className="col-span-2 px-3 py-2 text-xs text-slate-500 hover:text-red-400 transition text-center" title="清空">清空所有素材</button>*/}
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
                                    <div className="absolute top-1 left-1 text-[8px] bg-black/40 px-1.5 py-0.5 rounded text-white z-10 font-mono">{index + 1}</div>
                                    {/* ★★★ 新增：材质类型标签 ★★★ */}
                                    {file.materialType === 'solid-color' && (
                                        <div className="absolute top-1 right-1 flex items-center gap-1">
                                            <div className="w-4 h-4 rounded border border-white/50" style={{ backgroundColor: file.color }}></div>
                                            <div className="text-[8px] bg-purple-600/90 px-1 py-0.5 rounded text-white font-mono">COLOR</div>
                                        </div>
                                    )}
                                    {file.materialType === 'image' && (
                                        <div className="absolute top-1 right-1 text-[8px] bg-blue-600/90 px-1.5 py-0.5 rounded text-white font-mono">IMG</div>
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
                                        className="absolute top-1 right-1 w-5 h-5 bg-red-500/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <button 
                            onClick={downloadZip}
                            disabled={files.length === 0 || isProcessing || isZipping}
                            className="w-14 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold text-white shadow-lg flex items-center justify-center transition-colors disabled:opacity-30"
                            title="下载资产"
                        >
                            ⬇
                        </button>
                    </div>
                    <div className="flex md:hidden gap-2 mt-3 pt-3 border-t border-slate-800">
                        <button onClick={() => fileInputRef.current.click()} className="flex-1 py-2 bg-slate-800 rounded-lg text-xs text-blue-200 border border-slate-700">导入图片</button>
                         <button onClick={() => audioInputRef.current.click()} className={`flex-1 py-2 rounded-lg text-xs border ${audioUrl ? 'bg-purple-900/30 border-purple-800 text-purple-200' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                            {audioUrl ? "音乐OK" : "配乐"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="order-1 md:order-2 flex-1 relative bg-black flex items-center justify-center overflow-hidden" onClick={() => setSelectedId(null)}>
                {selectedFile ? (
                    <div
                        className="relative w-full h-full flex"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* ★★★ 左侧：预览区域（移除阴影效果） ★★★ */}
                        <div className="flex-1 flex items-center justify-center bg-gray-100">
                            <div className="checkerboard opacity-20 w-full h-full absolute inset-0"></div>
                            <img
                                src={selectedFile.processedUrl}
                                className="max-w-full max-h-full object-contain relative z-10"
                                alt="Editing"
                            />
                        </div>

                        {/* ★★★ 右侧：控制面板 ★★★ */}
                        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
                            {/* 标题栏 */}
                            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                                <div>
                                    <h3 className="text-white font-serif tracking-wider text-lg">编辑素材</h3>
                                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">EDIT MATERIAL</p>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setSelectedId(null); }}
                                    className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center justify-center transition"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Tolerance 滑杆 */}
                            <div className="p-4 border-b border-slate-700">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-bold tracking-wide text-slate-300">
                                        去背景强度 (Tolerance)
                                    </span>
                                    <span className="text-xs text-cyan-400 font-mono bg-cyan-900/30 px-2 rounded">
                                        {Number(selectedFile.tolerance).toFixed(1)}
                                    </span>
                                </div>
                                <div className="relative h-6 flex items-center select-none w-full">
                                    <div className="absolute w-full h-1.5 bg-slate-600 rounded-lg top-1/2 -translate-y-1/2 left-0"></div>
                                    <div
                                        className="absolute h-1.5 bg-cyan-500 rounded-l-lg top-1/2 -translate-y-1/2 left-0 pointer-events-none"
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

                            {/* 材质类型切换 */}
                            <div className="p-4 border-b border-slate-700">
                                <span className="text-xs font-bold tracking-wide text-slate-400 mb-3 block">
                                    材质模式
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('=== Image button clicked ===');
                                            console.log('selectedFile:', selectedFile);
                                            console.log('selectedId:', selectedId);

                                            if (!selectedFile) {
                                                console.error('❌ No selected file');
                                                return;
                                            }

                                            if (selectedFile.materialType === 'image') {
                                                console.log('ℹ️ Already in image mode');
                                                return;
                                            }

                                            console.log('🔄 Switching to image material...');
                                            switchToImageMaterial(selectedFile)
                                                .then(updated => {
                                                    console.log('✅ Updated:', updated);
                                                    setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                })
                                                .catch(error => {
                                                    console.error('❌ Error:', error);
                                                });
                                        }}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition border ${
                                            selectedFile?.materialType === 'image'
                                                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                                : 'bg-transparent border-slate-600 text-slate-300 hover:border-blue-500'
                                        }`}
                                    >
                                        📷 图像
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            console.log('=== Color button clicked ===');
                                            console.log('selectedFile:', selectedFile);
                                            console.log('selectedId:', selectedId);

                                            if (!selectedFile) {
                                                console.error('❌ No selected file');
                                                return;
                                            }

                                            if (selectedFile.materialType === 'solid-color') {
                                                console.log('ℹ️ Already in solid-color mode');
                                                return;
                                            }

                                            const color = selectedFile.color || editingColor || generateRandomColor();
                                            console.log('🔄 Switching to solid color:', color);
                                            generateSolidColorMaterial(selectedFile, color)
                                                .then(updated => {
                                                    console.log('✅ Updated:', updated);
                                                    setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                    setEditingColor(color);
                                                })
                                                .catch(error => {
                                                    console.error('❌ Error:', error);
                                                });
                                        }}
                                        className={`px-4 py-3 rounded-xl text-sm font-medium transition border ${
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
                                <div className="flex-1 p-4 overflow-y-auto">
                                    <div className="space-y-3 p-3 bg-slate-900/50 rounded-xl border border-slate-700">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-slate-300">颜色设置</span>
                                            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={useRandomColor}
                                                    onChange={(e) => setUseRandomColor(e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-600"
                                                />
                                                随机
                                            </label>
                                        </div>

                                        {!useRandomColor ? (
                                            <div className="space-y-3">
                                                <input
                                                    type="color"
                                                    value={selectedFile.color || editingColor}
                                                    onChange={async (e) => {
                                                        const newColor = e.target.value;
                                                        const updated = await generateSolidColorMaterial(selectedFile, newColor);
                                                        setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                        setEditingColor(newColor);
                                                    }}
                                                    className="w-full h-16 rounded-lg border-2 border-slate-600 cursor-pointer"
                                                />
                                                <div className="text-xs text-slate-400">
                                                    当前颜色: <span className="font-mono text-slate-300">{selectedFile.color || editingColor}</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={async () => {
                                                    const newColor = generateRandomColor();
                                                    const updated = await generateSolidColorMaterial(selectedFile, newColor);
                                                    setFiles(prev => prev.map(f => f.id === selectedId ? updated : f));
                                                    setEditingColor(newColor);
                                                }}
                                                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm font-medium transition"
                                            >
                                                🎲 生成随机颜色
                                            </button>
                                        )}

                                        <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-700">
                                            💡 调整上方 Tolerance 可改变透明度效果
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center bg-black">
                        <div className="relative w-full h-full flex items-center justify-center overflow-hidden" style={{ aspectRatio: videoAspectRatio }}>
                            <video ref={videoRef} autoPlay playsInline muted onLoadedMetadata={handleVideoMetadata} className="w-full h-full object-cover opacity-80" />
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)] pointer-events-none transition-all duration-300 z-10" style={{ aspectRatio: '1/1', height: videoAspectRatio > 1 ? '80%' : 'auto', width: videoAspectRatio > 1 ? 'auto' : '80%' }}>
                                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white"></div>
                                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white"></div>
                                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white"></div>
                                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white"></div>
                                <div className={`absolute inset-0 bg-white transition-opacity duration-100 ease-out ${flashEffect ? 'opacity-80' : 'opacity-0'}`}></div>
                            </div>
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-full bg-red-400/100"></div>

                            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/50 text-xs font-mono tracking-widest pointer-events-none">
                                {cameraActive ? "PRESS SPACE TO CAPTURE" : "CAMERA OFFLINE"}
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
                
                {!selectedFile && cameraActive && (
                    <div className="absolute bottom-8 w-full flex justify-center items-center z-30 pointer-events-none">
                        <button 
                            onClick={captureAndProcess} 
                            className="pointer-events-auto w-24 h-24 rounded-full border-4 border-white/50 bg-white/10 backdrop-blur-sm flex items-center justify-center transition-all active:scale-95 active:bg-white/30 hover:border-white"
                        >
                            <div className="w-20 h-20 rounded-full bg-white shadow-lg"></div>
                        </button>
                    </div>
                )}
            </div>
            
            <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
            <input type="file" accept="audio/*" ref={audioInputRef} onChange={handleAudioUpload} className="hidden" />
        </div>
    );
}

export default App;