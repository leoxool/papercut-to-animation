import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const LivePreview = ({ approvedMaterials, onCapture }) => {
    const containerRef = useRef(null);
    const sceneRef = useRef(null);
    const rendererRef = useRef(null);
    const cameraRef = useRef(null);
    const butterfliesRef = useRef([]);
    const animationFrameRef = useRef(null);
    const [isAnimating, setIsAnimating] = useState(true);

    useEffect(() => {
        // 初始化 Three.js 场景
        const container = containerRef.current;
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);
        scene.fog = new THREE.Fog(0x1a1a2e, 1, 1000);

        const camera = new THREE.PerspectiveCamera(
            50,
            container.clientWidth / container.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 100);

        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);

        // 添加光照
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 100);
        scene.add(directionalLight);

        // 创建地板
        const floorGeometry = new THREE.PlaneGeometry(200, 200);
        const floorMaterial = new THREE.MeshStandardMaterial({
            color: 0x0f0f1e,
            roughness: 0.8,
            metalness: 0.2
        });
        const floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -50;
        scene.add(floor);

        sceneRef.current = scene;
        rendererRef.current = renderer;
        cameraRef.current = camera;

        // 动画循环
        const animate = () => {
            if (!isAnimating) return;

            animationFrameRef.current = requestAnimationFrame(animate);

            // 更新蝴蝶位置
            butterfliesRef.current.forEach((butterfly, index) => {
                const time = Date.now() * 0.001;
                const speed = 0.5 + index * 0.1;
                const amplitude = 20;

                butterfly.position.x = Math.sin(time * speed) * amplitude;
                butterfly.position.y = Math.cos(time * speed * 0.7) * amplitude * 0.5;
                butterfly.position.z = Math.sin(time * speed * 0.5) * amplitude;

                // 翅膀扇动
                const wingFlap = Math.sin(time * 10) * 0.5;
                butterfly.children.forEach((wing) => {
                    wing.rotation.z = wingFlap;
                });
            });

            renderer.render(scene, camera);
        };

        animate();

        // 处理窗口大小变化
        const handleResize = () => {
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(container.clientWidth, container.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
            window.removeEventListener('resize', handleResize);
            container.removeChild(renderer.domElement);
            renderer.dispose();
        };
    }, [isAnimating]);

    // 当批准素材变化时，更新蝴蝶
    useEffect(() => {
        if (!sceneRef.current || !approvedMaterials.length) return;

        // 清除现有蝴蝶
        butterfliesRef.current.forEach(butterfly => {
            sceneRef.current.remove(butterfly);
        });
        butterfliesRef.current = [];

        // 为每个批准素材创建蝴蝶
        approvedMaterials.forEach((material, index) => {
            createButterfly(material, index);
        });
    }, [approvedMaterials]);

    const createButterfly = (material, index) => {
        const scene = sceneRef.current;
        if (!scene) return;

        // 加载纹理
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(material.processedUrl);

        // 创建蝴蝶身体
        const bodyGeometry = new THREE.CylinderGeometry(0.2, 0.2, 3, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.rotation.z = Math.PI / 2;

        // 创建翅膀
        const wingGeometry = new THREE.PlaneGeometry(4, 6);
        const wingMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            alphaTest: 0.5
        });

        const leftWing = new THREE.Mesh(wingGeometry, wingMaterial);
        leftWing.position.x = -2;
        leftWing.rotation.z = Math.PI / 6;

        const rightWing = new THREE.Mesh(wingGeometry, wingMaterial);
        rightWing.position.x = 2;
        rightWing.rotation.z = -Math.PI / 6;

        // 组合蝴蝶
        const butterfly = new THREE.Group();
        butterfly.add(body);
        butterfly.add(leftWing);
        butterfly.add(rightWing);

        // 初始位置
        const angle = (index / approvedMaterials.length) * Math.PI * 2;
        const radius = 30;
        butterfly.position.set(
            Math.cos(angle) * radius,
            (Math.random() - 0.5) * 40,
            Math.sin(angle) * radius
        );

        // 添加阴影
        butterfly.castShadow = true;
        butterfly.receiveShadow = true;

        scene.add(butterfly);
        butterfliesRef.current.push(butterfly);
    };

    const toggleAnimation = () => {
        setIsAnimating(prev => !prev);
    };

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="w-full h-full" />

            {/* 控制栏 */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleAnimation}
                        className="px-4 py-2 bg-slate-800/90 hover:bg-slate-700/90 text-white rounded-lg border border-slate-600 transition-all"
                    >
                        {isAnimating ? '⏸️ 暂停' : '▶️ 播放'}
                    </button>
                    <div className="px-4 py-2 bg-slate-800/90 rounded-lg border border-slate-600">
                        <span className="text-white text-sm">
                            蝴蝶数量: {approvedMaterials.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={onCapture}
                        className="px-4 py-2 bg-cyan-600/90 hover:bg-cyan-500/90 text-white rounded-lg border border-cyan-500 transition-all"
                    >
                        📸 捕获当前帧
                    </button>
                </div>
            </div>

            {/* 状态提示 */}
            {approvedMaterials.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                    <div className="text-center">
                        <div className="text-6xl mb-4">🦋</div>
                        <p className="text-white text-xl font-bold mb-2">等待学生提交作品</p>
                        <p className="text-slate-400">
                            学生提交素材并通过审核后，将在这里看到动画效果
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LivePreview;
