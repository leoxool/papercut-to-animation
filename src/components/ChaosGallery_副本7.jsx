import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// 引入 Three.js 扩展库
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';

// 引入加载器
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 引入常量和导演类
import { CONFIG } from '../utils/constants';
import { MVDirector } from '../logic/MVDirector';

// 默认音乐链接
const DEFAULT_MUSIC = "https://teacherliliang.xyz/papercut/love.mp3";

// ==========================================
// ★★★ 升级版：流动万花筒着色器 ★★★
// ==========================================


const KaleidoscopeShader = {
    uniforms: {
        uTime: { value: 0 },
        uTexture1: { value: null }, // ★ 改名：当前图
        uTexture2: { value: null }, // ★ 新增：下一张图
        uMix: { value: 0.0 },       // ★ 新增：混合比例 (0=图1, 1=图2)
        uTiling: { value: 1.0 },
        uSubTiling: { value: 5.0 },
        uSegments: { value: 6.0 },
        uOpacity: { value: 1.0 },
        // ★★★ 新增：背景色渐变变量 ★★★
        uBgColor1: { value: new THREE.Color(0xffffff) }, // 当前背景色
        uBgColor2: { value: new THREE.Color(0xff33fe) }, // 目标背景色
        uBgMix: { value: 0.5 }                           // 背景混合进度
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform sampler2D uTexture1;
        uniform sampler2D uTexture2;
        uniform float uMix;
        uniform float uTiling;
        uniform float uSubTiling;
        uniform float uSegments;
        uniform float uOpacity;
        
        // 背景色渐变变量
        uniform vec3 uBgColor1;
        uniform vec3 uBgColor2;
        uniform float uBgMix;

        varying vec2 vUv;

        #define PI 3.14159265359

        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
        }

        vec2 rotate2D(vec2 _uv, float _angle){
            _uv -= 0.5;
            _uv =  mat2(cos(_angle),-sin(_angle),
                        sin(_angle),cos(_angle)) * _uv;
            _uv += 0.5;
            return _uv;
        }

        void main() {
            // --- 1. 全局万花筒计算 ---
            vec2 gridUV = vUv * uTiling;
            vec2 gridID = floor(gridUV);
            vec2 uv = fract(gridUV);
            uv -= 0.5;
            float r = length(uv);
            float a = atan(uv.y, uv.x);
            a += uTime * 0.1; 
            float segmentAngle = PI * 2.0 / uSegments;
            a = mod(a, segmentAngle);
            a = abs(a - segmentAngle / 2.0);
            vec2 kaleidoUV = vec2(cos(a), sin(a)) * r;

            // --- 2. 内部多图并置 ---
            vec2 subUVRaw = kaleidoUV * uSubTiling;
            subUVRaw += vec2(uTime * 0.1, uTime * 0.05);
            vec2 subID = floor(subUVRaw); 
            vec2 subUV = fract(subUVRaw); 

            // --- 3. 随机化 ---
            float rnd = random(subID + gridID); 
            float rot = floor(rnd * 4.0) * (PI / 2.0);
            vec2 rotatedUV = rotate2D(subUV, rot); // 使用临时变量，方便计算边缘
            if (random(subID) > 0.5) rotatedUV.x = 1.0 - rotatedUV.x;

            // --- 4. 采样与混合 ---
            vec4 color1 = texture2D(uTexture1, rotatedUV);
            vec4 color2 = texture2D(uTexture2, rotatedUV);
            vec4 texColor = mix(color1, color2, uMix);

            // =========================================================
            // ★★★ 修复核心 1：自动去黑底 (Chroma Key) ★★★
            // 如果您的图片背景是黑色的，这段代码会让黑色变透明
            // 计算亮度
            float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
            // 如果亮度低于 0.1 (接近黑色)，Alpha 设为 0；否则平滑过渡到 1
            float autoAlpha = smoothstep(0.05, 0.2, brightness);
            
            // 结合原本的 Alpha 通道 (如果原本是 JPG，texColor.a 是 1)
            float finalAlpha = texColor.a * autoAlpha;

            // ★★★ 修复核心 2：强制增加格子缝隙 (Gap) ★★★
            // 让图片稍微缩小一点，露出格子边缘的背景
            // 0.05 表示边缘保留 5% 的空隙
            float gap = step(0.05, subUV.x) * step(subUV.x, 0.95) * step(0.05, subUV.y) * step(subUV.y, 0.95);
            
            finalAlpha *= gap; 
            // =========================================================

            // --- 5. 背景色计算与合成 ---
            vec3 dynamicBg = mix(uBgColor1, uBgColor2, uBgMix);
            
            // 使用修正后的 finalAlpha 进行混合
            vec3 finalRGB = mix(dynamicBg, texColor.rgb * 2.0, finalAlpha);

            gl_FragColor = vec4(finalRGB, uOpacity); 
       
        }
    `
};

const ChaosGallery = ({ files, onBack, audioUrl }) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const composerRef = useRef(null);
    const bokehPassRef = useRef(null);
    const keyLightRef = useRef(null); 
    const audioRef = useRef(null); 
    
    // === 场景分组 Refs ===
    const galleryGroupRef = useRef(new THREE.Group()); 
    const mvGroupRef = useRef(new THREE.Group());      
    
    // === 灯光引用池 ===
    const lightsRef = useRef({}); 

    // === 对象引用 ===
    const butterfliesRef = useRef([]); 
    const sceneryRef = useRef({}); 
    // ★★★ 新增：存放所有蝴蝶纹理的数组 ★★★
    const stageTexturesRef = useRef([]);
    const wallRef = useRef(null); 
    const floorRef = useRef(null); 
    
    // ★★★ 新增：舞台材质引用 (用于在循环中更新 uTime) ★★★
    const stageMaterialRef = useRef(null);

    // 导演实例
    const directorRef = useRef(null);

    const [flightModeState, setFlightModeState] = useState('grid');
    const flightMode = useRef('grid'); 
    
    const [focusModeState, setFocusModeState] = useState(false);
    const focusMode = useRef(false);   
    const focusIndex = useRef(0);      
    
    const currentLookAt = useRef(new THREE.Vector3(0, 0, 0)); 
    
    // MV 状态
    const mvState = useRef({
        isPlaying: false,
        startTime: 0
    });
    
    const [isFullscreen, setIsFullscreen] = useState(false);

    // 交互 Ref
    const raycaster = useRef(new THREE.Raycaster());
    const mouse = useRef(new THREE.Vector2());
    const draggedObjectRef = useRef(null);
    const planeRef = useRef(null); 
    const dummyObj = useRef(new THREE.Object3D()); 
    const optimalGridDistance = useRef(150);
    const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

    const cameraState = useRef({
        isDragging: false,
        lastX: 0,
        lastY: 0,
        theta: 0, 
        phi: Math.PI / 2 - 0.1, 
        radius: 150 
    });

    // === 模式切换逻辑 ===
    const switchMode = (mode) => {
        focusMode.current = false;
        setFocusModeState(false);
        
        flightMode.current = mode;
        setFlightModeState(mode);

        if (mode === 'mv') {
            // --- 进入 MV 模式 ---
            galleryGroupRef.current.visible = false; 
            mvGroupRef.current.visible = true;       
            
            const darkColor = new THREE.Color(0x333333);
            if(sceneRef.current) {
                sceneRef.current.background = darkColor;
                sceneRef.current.fog.color = darkColor;
                sceneRef.current.fog.near = 1;
                sceneRef.current.fog.far = 1000;
            }

            if (lightsRef.current.spotLight1) {
                lightsRef.current.spotLight1.position.set(70, 50, 100); 
                lightsRef.current.spotLight1.color.setHex(0xffffff);
                lightsRef.current.spotLight1.intensity = 50; 
            }
            
            Object.values(lightsRef.current).forEach(l => {
                if (l.isLight) l.visible = true;
            });

            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                audioRef.current.play().catch(e => console.log("Audio play failed:", e));
            }
            mvState.current.isPlaying = true;
            mvState.current.startTime = Date.now() / 1000;

        } else {
            // --- 回到浏览模式 ---
            galleryGroupRef.current.visible = true;
            mvGroupRef.current.visible = false; 


            const lightColor = new THREE.Color(CONFIG.BG_COLOR);
            if(sceneRef.current) {
                sceneRef.current.background = lightColor;
                sceneRef.current.fog.color = lightColor;
                sceneRef.current.fog.near = CONFIG.FOG_NEAR;
                sceneRef.current.fog.far = CONFIG.FOG_FAR;
            }

            if (lightsRef.current.spotLight1) {
                lightsRef.current.spotLight1.visible = true;
                lightsRef.current.spotLight1.position.set(70, 70, 80); 
                lightsRef.current.spotLight1.intensity = 100;             
                lightsRef.current.spotLight1.color.setHex(0xfff5e6);     
                lightsRef.current.spotLight1.angle = Math.PI / 4;
            }

            if (lightsRef.current.hemiLight) lightsRef.current.hemiLight.intensity = 8.0;
            
            if (lightsRef.current.dirLight1) {
                lightsRef.current.dirLight1.intensity = 0.5; 
            }

            if (audioRef.current) audioRef.current.pause();
            mvState.current.isPlaying = false;
            
            if (cameraRef.current) {
                //cameraRef.current.fov = 50;
                cameraRef.current.updateProjectionMatrix();
            }
           // 5. ★★★ 核心新增：重置所有蝴蝶的状态 ★★★
            // 防止 MV 中的缩放、变色、透明度残留到自由模式
            butterfliesRef.current.forEach(b => {
                // 重置缩放 (回到初始大小)
                b.group.scale.set(0.8, 0.8, 0.8);
                // 重置旋转 (清除 MV 中的特技旋转)
                b.group.rotation.set(0, 0, 0);
                // 重置颜色 (变回白色/原色)
                b.leftWing.material.color.setHex(0xffffff);
                b.rightWing.material.color.setHex(0xffffff);
                // 重置透明度
                b.leftWing.material.opacity = 1.0;
                b.rightWing.material.opacity = 1.0;
                b.leftWing.material.transparent = true; // 确保还是半透明材质
                // 清除可能存在的额外位移
                b.group.position.copy(mode === 'grid' ? b.gridPos : b.basePos);
            });
        }

        if (mode === 'free') {
            cameraState.current.theta = 0;
            cameraState.current.phi = Math.PI / 2 - 0.2; 
            cameraState.current.radius = 130; 
            butterfliesRef.current.forEach(b => b.manualRotation.set(0, 0, 0));
        } else if (mode === 'grid') {
            cameraState.current.theta = 0;
            cameraState.current.phi = Math.PI / 2 - 0.1;
            cameraState.current.radius = optimalGridDistance.current;
            butterfliesRef.current.forEach(b => b.manualRotation.set(0, 0, 0));
        }
    };

    const switchFocus = (direction) => {
        if (!focusMode.current || butterfliesRef.current.length === 0) return;
        if (direction === 'next') {
            focusIndex.current = (focusIndex.current + 1) % butterfliesRef.current.length;
        } else {
            focusIndex.current = (focusIndex.current - 1 + butterfliesRef.current.length) % butterfliesRef.current.length;
        }
        if (butterfliesRef.current[focusIndex.current]) {
            butterfliesRef.current[focusIndex.current].manualRotation.set(0, 0, 0);
        }
    };

    // 监听器
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => console.error(err));
        else if (document.exitFullscreen) document.exitFullscreen();
    };
    useEffect(() => {
        const handleKeyMode = (e) => {
            if (e.key === '1') switchMode('free');
            if (e.key === '2') switchMode('grid');
            if (e.key === '3') switchMode('closeup');
            if (e.key === '4') switchMode('mv');
            if (focusMode.current && butterfliesRef.current.length > 0) {
                if (e.key === 'ArrowRight' || e.key === 'd') switchFocus('next');
                if (e.key === 'ArrowLeft' || e.key === 'a') switchFocus('prev');
            }
        };
        window.addEventListener('keydown', handleKeyMode);
        return () => window.removeEventListener('keydown', handleKeyMode);
    }, [audioUrl]); 

    // === Three.js 核心初始化 ===
    useEffect(() => {
        if (!mountRef.current) return;
        if (rendererRef.current) {
            rendererRef.current.setAnimationLoop(null);
            rendererRef.current.dispose();
        }
        while (mountRef.current.firstChild) {
            mountRef.current.removeChild(mountRef.current.firstChild);
        }
        
        butterfliesRef.current = []; 
        galleryGroupRef.current = new THREE.Group();
        mvGroupRef.current = new THREE.Group();
        mvGroupRef.current.visible = false; 
        lightsRef.current = {}; 
        
        RectAreaLightUniformsLib.init();

        let isMounted = true; 
        const width = mountRef.current.clientWidth || window.innerWidth;
        const height = mountRef.current.clientHeight || window.innerHeight;

        // 1. Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(CONFIG.BG_COLOR);
        scene.fog = new THREE.Fog(CONFIG.BG_COLOR, CONFIG.FOG_NEAR, CONFIG.FOG_FAR); 
        sceneRef.current = scene;

        scene.add(galleryGroupRef.current);
        scene.add(mvGroupRef.current);

        // 2. Camera
        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1500);
        cameraRef.current = camera;
        updateCameraPosition();

        // 3. Renderer
        const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true, powerPreference: "high-performance" });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap; 
        renderer.outputColorSpace = THREE.SRGBColorSpace; 
        renderer.toneMapping = THREE.ACESFilmicToneMapping; 
        renderer.toneMappingExposure = 1.1;
        mountRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // 4. Post Processing
        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        const bokehPass = new BokehPass(scene, camera, {
            focus: 1.0, aperture: 0.0001, maxblur: 0.0001, width: width, height: height
        });
        composer.addPass(bokehPass);
        composerRef.current = composer;
        bokehPassRef.current = bokehPass;

        // ==========================================
        // 🔥 灯光系统 (Lighting)
        // ==========================================
        
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 5.0);
        scene.add(hemiLight);
        lightsRef.current.hemiLight = hemiLight;

        const spotLight1 = new THREE.SpotLight(0xffffff, 100); 
        spotLight1.position.set(70, 70, 80);
        spotLight1.angle = Math.PI / 4;
        spotLight1.penumbra = 0.5;
        spotLight1.decay = 12;
        spotLight1.distance = 800;
        spotLight1.castShadow = true;
        spotLight1.shadow.mapSize.set(2048, 2048);
        spotLight1.shadow.blurSamples = 25;
        spotLight1.shadow.radius =10.0;
        spotLight1.shadow.bias = -0.0001;
        scene.add(spotLight1); 
        lightsRef.current.spotLight1 = spotLight1;
        keyLightRef.current = spotLight1; 

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.0); 
        dirLight1.position.set(100, 100, 50);
        dirLight1.castShadow = false; 
        scene.add(dirLight1);
        lightsRef.current.dirLight1 = dirLight1;

        // --- MV Lights ---
        const dirLight2 = new THREE.DirectionalLight(0xaaccff, 0.0);
        dirLight2.position.set(-100, 50, -50);
        mvGroupRef.current.add(dirLight2);
        lightsRef.current.dirLight2 = dirLight2;

        const spotLight2 = new THREE.SpotLight(0xff0000, 0.0);
        spotLight2.position.set(-50, 150, 100);
        spotLight2.angle = Math.PI / 5;
        spotLight2.penumbra = 1;
        mvGroupRef.current.add(spotLight2);
        lightsRef.current.spotLight2 = spotLight2;

        const p1 = new THREE.PointLight(0x00ff00, 0.0, 300);
        const p2 = new THREE.PointLight(0x0000ff, 0.0, 300);
        const p3 = new THREE.PointLight(0xff00ff, 0.0, 300);
        const p4 = new THREE.PointLight(0xffff00, 0.0, 300);
        p1.position.set(50, 20, 50);
        p2.position.set(-50, 20, 50);
        p3.position.set(50, 20, -50);
        p4.position.set(-50, 20, -50);
        mvGroupRef.current.add(p1, p2, p3, p4);
        lightsRef.current.pointLight1 = p1;
        lightsRef.current.pointLight2 = p2;
        lightsRef.current.pointLight3 = p3;
        lightsRef.current.pointLight4 = p4;

        const rectLight = new THREE.RectAreaLight(0x00ffff, 0.0, 50, 50);
        rectLight.position.set(0, 50, -100);
        rectLight.lookAt(0, 0, 0);
        mvGroupRef.current.add(rectLight);
        lightsRef.current.rectLight = rectLight;

        // ==========================================

        // Gallery 环境 (墙和地)
        const wallGeo = new THREE.PlaneGeometry(6000, 6000);
        const wallMat = new THREE.ShadowMaterial({ color: 0x5a4d3b, opacity: 0.0 });
        const wall = new THREE.Mesh(wallGeo, wallMat.clone());
        wall.position.z = -5; 
        wall.receiveShadow = true; 
        galleryGroupRef.current.add(wall);
        wallRef.current = wall; 

        const floorGeo = new THREE.PlaneGeometry(6000, 6000);
        const floor = new THREE.Mesh(floorGeo, wallMat.clone());
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -70; 
        floor.receiveShadow = true;
        galleryGroupRef.current.add(floor);
        floorRef.current = floor;

        // MV 环境 (模型)
        const gltfLoader = new GLTFLoader();
        
        // ★★★ 修改：Stage 改为万花筒平面 ★★★
        const stageLoader = new THREE.TextureLoader();
       
       const validFiles = files.filter(f => f.processedUrl);

        if (validFiles.length > 0) {
            // 2. 预加载所有纹理
            stageTexturesRef.current = validFiles.map(file => {
                const tex = stageLoader.load(file.processedUrl);
                tex.wrapS = THREE.RepeatWrapping;
                tex.wrapT = THREE.RepeatWrapping;
                tex.colorSpace = THREE.SRGBColorSpace; // 确保颜色正确
                return tex;
            });

            // 3. 使用第1张图初始化材质
            const initialTexture = stageTexturesRef.current[0];
            const nextTexture = stageTexturesRef.current.length > 1 ? stageTexturesRef.current[1] : initialTexture;
                
                // 1. 创建材质
                const shaderMat = new THREE.ShaderMaterial({
                   uniforms: {
                    uTime: { value: 0 },
                    uTexture1: { value: initialTexture }, // ★
                    uTexture2: { value: nextTexture },    // ★
                    uMix: { value: 0.0 },                 // ★ 初始完全显示 Texture1
                    uTiling: { value: 1.0 },    // 默认为 1，也就是全屏一个大图案
                    uSubTiling: { value: 5.0 }, // ★ 默认为 5，内部有 5x5 的小蝴蝶
                    uSegments: { value: 6.0 },
                    uOpacity: { value: 1.0 },
                    //uRadius: { value: 1.0 }
             
                    },
                    vertexShader: KaleidoscopeShader.vertexShader,
                    fragmentShader: KaleidoscopeShader.fragmentShader,
                    side: THREE.DoubleSide,
                    transparent: true,
                    depthWrite: false // 建议设为false，防止透明物体遮挡问题
                });
                
                // 保存引用以便在 render loop 中更新 uTime
                stageMaterialRef.current = shaderMat;

                // 2. 创建超大平面
                const planeGeo = new THREE.PlaneGeometry(3000, 3000);
                const plane = new THREE.Mesh(planeGeo, shaderMat);
                
                // 3. 初始位置设定 (对应 timeline_actors.js 里的初始帧)
                plane.rotation.x = -Math.PI / 2; // 水平躺倒
                plane.position.set(0, -100, 0); 
                plane.receiveShadow = true; 
                
                mvGroupRef.current.add(plane);
                sceneryRef.current.stage = plane; // 绑定到 scenery 供 Director 控制 pos/scale
                
                console.log("Kaleidoscope Stage Created!");
           
        } else {
            // ★★★ 安全回退：如果没图，创建一个简单的网格平面，防止 MVDirector 找不到 stage 报错 ★★★
            const fallbackGeo = new THREE.PlaneGeometry(2000, 2000, 20, 20);
            const fallbackMat = new THREE.MeshBasicMaterial({ color: 0x222222, wireframe: true, transparent: true, opacity: 0.1 });
            const fallbackPlane = new THREE.Mesh(fallbackGeo, fallbackMat);
            fallbackPlane.rotation.x = -Math.PI / 2;
            fallbackPlane.position.set(0, -100, 0);
            mvGroupRef.current.add(fallbackPlane);
            sceneryRef.current.stage = fallbackPlane;
            console.log("Fallback Stage Created");
        }

        

        const planeGeo = new THREE.PlaneGeometry(3000, 3000);
        const planeMat = new THREE.MeshBasicMaterial({ visible: false });
        const dragPlane = new THREE.Mesh(planeGeo, planeMat);
        scene.add(dragPlane);
        planeRef.current = dragPlane;

        const resizeObserver = new ResizeObserver(entries => {
            if (!isMounted || !renderer || !camera || !composer) return;
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                if (width === 0 || height === 0) return;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
                composer.setSize(width, height);
            }
        });
        resizeObserver.observe(mountRef.current);

        const loader = new THREE.TextureLoader();
        const total = files.length;
        const screenAspect = width / height;
        let cols = Math.round(Math.sqrt(total * screenAspect));
        cols = Math.max(1, cols); 
        const totalRows = Math.ceil(total / cols); 
        const spacingX = 14; const spacingY = 14; 
        const gridWidth = (cols - 1) * spacingX;
        const gridHeight = (totalRows - 1) * spacingY;
        const gridOffsetX = gridWidth / 2;
        const gridOffsetY = gridHeight / 2;

        const fovRad = (camera.fov * Math.PI) / 180;
        const distV = (gridHeight / 2 + spacingY * 0.6) / Math.tan(fovRad / 2);
        const aspectH = width / height;
        const distH = (gridWidth / 2 + spacingX * 0.6) / (Math.tan(fovRad / 2) * aspectH);
        optimalGridDistance.current = Math.max(distV, distH) * 1.05 + 20;
        cameraState.current.radius = optimalGridDistance.current;
        updateCameraPosition();

        files.forEach((file, index) => {
            loader.load(file.processedUrl, (texture) => {
                if (!isMounted) return;
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.minFilter = THREE.LinearFilter; 
                const butterflyGroup = new THREE.Group();
                const bodyGroup = new THREE.Group();
                bodyGroup.rotation.set(Math.PI / 2, Math.PI, 0); 
                butterflyGroup.add(bodyGroup);

                // ★★★ 核心修改：材质光泽度 ★★★
                const material = new THREE.MeshStandardMaterial({
                    map: texture, 
                    side: THREE.DoubleSide, 
                    transparent: true, 
                    opacity: 1.0,        
                    alphaTest: 0.1, 
                    roughness: 0.2,      // 让它光滑，反射光斑
                    metalness: 0.1,      // 稍微加金属感
                    emissive: 0x222222, 
                    emissiveIntensity: 0.1
                });
                
                const customDepthMaterial = new THREE.MeshDepthMaterial({
                    depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5
                });
                const wingGeo = new THREE.PlaneGeometry(5, 10, 2, 2); 
                const uvsL = wingGeo.attributes.uv;
                for (let i = 0; i < uvsL.count; i++) uvsL.setX(i, uvsL.getX(i) * 0.5);
                wingGeo.translate(-2.5, 0, 0); 
                const leftWing = new THREE.Mesh(wingGeo, material);
                leftWing.castShadow = true; leftWing.receiveShadow = true; 
                leftWing.customDepthMaterial = customDepthMaterial; 
                const wingGeoR = new THREE.PlaneGeometry(5, 10, 2, 2);
                const uvsR = wingGeoR.attributes.uv;
                for (let i = 0; i < uvsR.count; i++) uvsR.setX(i, uvsR.getX(i) * 0.5 + 0.5);
                wingGeoR.translate(2.5, 0, 0);
                const rightWing = new THREE.Mesh(wingGeoR, material);
                rightWing.castShadow = true; rightWing.receiveShadow = true;
                rightWing.customDepthMaterial = customDepthMaterial; 
                bodyGroup.add(leftWing); bodyGroup.add(rightWing);

                const col = index % cols;
                const row = Math.floor(index / cols);
                const gridX = (col * spacingX) - gridOffsetX;
                const gridY = (totalRows - 1 - row) * spacingY - gridOffsetY; 
                const gridPos = new THREE.Vector3(gridX, gridY, 0);
                const freePos = new THREE.Vector3((Math.random()-0.5)*80, (Math.random()-0.5)*60, (Math.random()-0.5)*60);
                
                butterflyGroup.position.copy(gridPos);
                butterflyGroup.scale.set(0.8, 0.8, 0.8);
                leftWing.userData = { parentIndex: index }; rightWing.userData = { parentIndex: index };
                scene.add(butterflyGroup);

                butterfliesRef.current.push({
                    group: butterflyGroup, body: bodyGroup, leftWing, rightWing,
                    gridPos, basePos: freePos, lastPos: gridPos.clone(),
                    noiseOffset: Math.random() * 1000,
                    freqX: 0.2 + Math.random() * 0.4, freqY: 0.2 + Math.random() * 0.4, freqZ: 0.2 + Math.random() * 0.4,
                    baseSpeed: 0.5 + Math.random() * 1.5,
                    flapPhase: Math.random() * Math.PI * 2,
                    wingAmp: 0.8 + Math.random() * 0.4,
                    speedToFlapRatio: 0.2 + Math.random() * 0.4,
                    manualRotation: new THREE.Euler(0, 0, 0)
                });
            });
        });

        // 9. 初始化导演
        const sceneContext = {
            stage:planeRef.current,
            scene: scene,
            camera: camera,
            renderer: renderer,
            butterflies: butterfliesRef.current,
            bokehPass: bokehPassRef.current,
            wall: wallRef.current,
            floor: floorRef.current,
            audio: audioRef.current,
            scenery: sceneryRef.current,
            ...lightsRef.current 
        };
        directorRef.current = new MVDirector(sceneContext);

        const getFreePosition = (t, b) => {
            const variableTime = t * b.baseSpeed + Math.sin(t * 0.5 + b.noiseOffset) * 2.0;
            const noiseX = Math.sin(variableTime * b.freqX + b.noiseOffset) * 20 + Math.cos(variableTime * 0.5) * 10;
            const noiseY = Math.cos(variableTime * b.freqY + b.noiseOffset) * 15 + Math.sin(variableTime * 0.3) * 8;
            const noiseZ = Math.sin(variableTime * b.freqZ + b.noiseOffset) * 15 + Math.cos(variableTime * 0.7) * 8;
            return new THREE.Vector3(b.basePos.x + noiseX, b.basePos.y + noiseY, b.basePos.z + noiseZ);
        };

        const clock = new THREE.Clock();
        
    // =========================================================
        // ★★★ 完整的动画循环 (Animation Loop) ★★★
        // =========================================================
        renderer.setAnimationLoop(() => {
            // 1. 获取基础信息
            const t = clock.getElapsedTime(); 
            const mode = flightMode.current;
            // 获取当前相机位置，供后续计算蝴蝶透明度使用
            const currentCamPos = camera.position; 

            // =========================================================
            // ▶ 功能模块 1：万花筒舞台纹理淡入淡出切换
            // =========================================================
            // 只有当材质存在且有多张纹理时才执行切换逻辑
            if (stageMaterialRef.current && stageTexturesRef.current.length > 1) {
                // 更新 Shader 时间变量
                stageMaterialRef.current.uniforms.uTime.value = t;

                // --- 淡入淡出计算 ---
                const duration = 4.0; // 每张图展示的总周期时长 (秒)
                const fadeTime = 1.5; // 周期末尾用于淡入淡出的时长 (秒)
                // holdTime = duration - fadeTime; // 前面保持静止的时长

                // 计算当前周期进度
                // t / duration 得到总周期数
                const totalCycles = t / duration; 
                const currentIndex = Math.floor(totalCycles) % stageTexturesRef.current.length;
                const nextIndex = (currentIndex + 1) % stageTexturesRef.current.length;
                
                // 计算当前周期内的时间点 (0.0 ~ duration)
                const localTime = t % duration;
                
                // 计算 Mix 比例 (0.0 ~ 1.0)
                let mixRatio = 0.0;
                // 只有进入最后的淡出时间段才开始计算 mixRatio
                if (localTime > (duration - fadeTime)) {
                    // 线性映射到 0~1 区间
                    mixRatio = (localTime - (duration - fadeTime)) / fadeTime;
                    // 确保数值安全范围
                    mixRatio = Math.max(0.0, Math.min(1.0, mixRatio));
                }













                // 获取对应的纹理对象
                const tex1 = stageTexturesRef.current[currentIndex];
                const tex2 = stageTexturesRef.current[nextIndex];

                // 更新 Shader Uniforms (优化：只在数值变化时才发送给GPU)
                const uniforms = stageMaterialRef.current.uniforms;
                if (uniforms.uTexture1.value !== tex1) uniforms.uTexture1.value = tex1;
                if (uniforms.uTexture2.value !== tex2) uniforms.uTexture2.value = tex2;
                uniforms.uMix.value = mixRatio;

            } else if (stageMaterialRef.current) {
                // 如果只有一张图或没图，至少保证时间在走
                stageMaterialRef.current.uniforms.uTime.value = t;
            }

            // =========================================================
            // ▶ 功能模块 2：MV 模式接管
            // =========================================================
            if (mode === 'mv' && directorRef.current && audioRef.current) {
                const audioTime = audioRef.current.currentTime;
                // 导演更新所有演员状态
                directorRef.current.update(t, audioTime);
                // 渲染并提前结束本次循环
                composer.render();
                return; 
            }

            // =========================================================
            // ▶ 功能模块 3：常规模式环境更新 (墙壁/地面呼吸效果)
            // =========================================================
            if (wallRef.current) {
                const targetWallZ = (mode === 'grid') ? -5 : -500;
                wallRef.current.position.z = THREE.MathUtils.lerp(wallRef.current.position.z, targetWallZ, 0.1);
                const dist = Math.abs(wallRef.current.position.z);
                const visibility = 1.0 - THREE.MathUtils.smoothstep(dist, 100, 200);
                wallRef.current.material.opacity = 0.25 * visibility; 
                if (keyLightRef.current && mode === 'grid') {
                      const blurFactor = THREE.MathUtils.mapLinear(dist, 100, 200, 0, 1);
                      keyLightRef.current.shadow.radius = THREE.MathUtils.lerp(10, 30, Math.max(0, Math.min(1, blurFactor)));
                }
            }
            if (floorRef.current) {
                 const targetFloorOpacity = (mode === 'grid') ? 0.0 : 0.15;
                 floorRef.current.material.opacity = THREE.MathUtils.lerp(floorRef.current.material.opacity, targetFloorOpacity, 0.05);
            }

            // =========================================================
            // ▶ 功能模块 4：相机目标计算 (Closeup / Grid / Free / Focus)
            // =========================================================
            let targetCamPos = new THREE.Vector3();
            let targetLookAt = new THREE.Vector3();
            let lerpSpeed = 0.05; 
            let targetFocusDistance = 150; 
            let targetAperture = 0.0001; 
            let currentTargetIdx = -1;

            if (mode === 'closeup' && butterfliesRef.current.length > 0) {
                // --- 特写模式自动运镜逻辑 ---
                const duration = 8.0; const transition = 3.0; const focusTime = duration - transition; 
                const totalBugs = butterfliesRef.current.length;
                const cycleIndex = Math.floor(t / duration);
                const localTime = t % duration;
                const curIdx = cycleIndex % totalBugs;
                currentTargetIdx = curIdx; 
                const nextIdx = (cycleIndex + 1) % totalBugs;
                const curBug = butterfliesRef.current[curIdx];
                const nextBug = butterfliesRef.current[nextIdx];
                const getOrbitPos = (bug, time) => {
                    const bPos = bug.group.position;
                    const r = 8; const theta = time * 0.3; 
                    const h = bPos.y + 2 + Math.sin(time * 0.4) * 3;
                    return new THREE.Vector3(bPos.x + Math.cos(theta) * r, h, bPos.z + Math.sin(theta) * r);
                };
                if (curBug && nextBug) {
                    if (localTime < focusTime) {
                        const dest = getOrbitPos(curBug, t);
                        targetCamPos.copy(dest); targetLookAt.copy(curBug.group.position);
                        lerpSpeed = 0.06; targetFocusDistance = camera.position.distanceTo(curBug.group.position); targetAperture = 0.001; 
                    } else {
                        const transT = localTime - focusTime;
                        const alpha = transT / transition;
                        const ease = alpha * alpha * (3 - 2 * alpha); 
                        const p1 = getOrbitPos(curBug, t); const p2 = getOrbitPos(nextBug, t);
                        targetCamPos.lerpVectors(p1, p2, ease);
                        targetCamPos.y += Math.sin(alpha * Math.PI) * 10;
                        const l1 = curBug.group.position; const l2 = nextBug.group.position;
                        targetLookAt.lerpVectors(l1, l2, ease);
                        lerpSpeed = 0.06; targetFocusDistance = THREE.MathUtils.lerp(p1.distanceTo(l1), p2.distanceTo(l2), ease); targetAperture = 0.001; 
                    }
                }
            } else if (focusMode.current && butterfliesRef.current[focusIndex.current]) {
                 // --- 聚焦模式 ---
                 const targetB = butterfliesRef.current[focusIndex.current];
                 const bPos = targetB.group.position;
                 targetCamPos.set(bPos.x, bPos.y, bPos.z + 15); targetLookAt.copy(bPos);
                 targetFocusDistance = camera.position.distanceTo(bPos); targetAperture = 0.0005; 
            } else {
                // --- Grid / Free 模式 (轨道控制) ---
                const { radius, theta, phi } = cameraState.current;
                const x = radius * Math.sin(phi) * Math.sin(theta);
                const y = radius * Math.cos(phi);
                const z = radius * Math.sin(phi) * Math.cos(theta);
                targetCamPos.set(x, y, z); targetLookAt.set(0, 0, 0);
                if (mode === 'free') { targetFocusDistance = 200; targetAperture = 0.00001; } else { targetFocusDistance = radius; targetAperture = 0.00001; }
            }

            // 应用相机移动
            camera.position.lerp(targetCamPos, lerpSpeed);
            currentLookAt.current.lerp(targetLookAt, lerpSpeed);
            camera.lookAt(currentLookAt.current);

            // 更新景深效果
            if (bokehPassRef.current) {
                const u = bokehPassRef.current.uniforms;
                u['focus'].value = THREE.MathUtils.lerp(u['focus'].value, targetFocusDistance, 0.2);
                u['aperture'].value = THREE.MathUtils.lerp(u['aperture'].value, targetAperture, 0.5);
            }

            // =========================================================
            // ▶ 功能模块 5：蝴蝶群体行为更新
            // =========================================================
            butterfliesRef.current.forEach((b, idx) => {
                const isDragging = draggedObjectRef.current === b.body || draggedObjectRef.current === b.group;
                const isFocused = focusMode.current && focusIndex.current === idx;
                
                if (!isDragging) {
                    let moveSpeed = 0;
                    // --- 自由飞行状态 ---
                    if ((mode === 'free' || mode === 'closeup') && !isFocused) {
                        const targetPos = getFreePosition(t, b);
                        const futurePos = getFreePosition(t + 0.5, b);
                        b.group.position.lerp(targetPos, 0.04); 
                        moveSpeed = b.group.position.clone().sub(b.lastPos).length(); 
                        b.lastPos.copy(b.group.position);
                        // 计算朝向和倾斜
                        dummyObj.current.position.copy(b.group.position);
                        const lookTarget = futurePos.clone();
                        if (lookTarget.y < b.group.position.y) lookTarget.y = b.group.position.y; 
                        dummyObj.current.lookAt(lookTarget);
                        const banking = (futurePos.x - targetPos.x) * -0.05; 
                        dummyObj.current.rotateZ(banking);
                        b.group.quaternion.slerp(dummyObj.current.quaternion, 0.08);
                    } 
                    // --- 网格/聚焦静止状态 ---
                    else {
                        b.group.position.lerp(b.gridPos, 0.05);
                        moveSpeed = 0;
                        if (isFocused) {
                            // 聚焦时响应手动旋转
                            dummyObj.current.rotation.set(Math.PI/2 + b.manualRotation.x, Math.PI + b.manualRotation.y, Math.PI);
                            b.group.quaternion.slerp(dummyObj.current.quaternion, 0.1);
                        } else {
                            // 网格时的轻微晃动
                            const swayX = Math.sin(t + b.noiseOffset) * 0.1;
                            const swayY = Math.cos(t * 0.8 + b.noiseOffset) * 0.1;
                            dummyObj.current.position.copy(b.group.position);
                            dummyObj.current.rotation.set(Math.PI/2 + swayX, Math.PI + swayY, Math.PI); 
                            b.group.quaternion.slerp(dummyObj.current.quaternion, 0.05);
                        }
                    }

                    // --- 翅膀扇动逻辑 ---
                    if ((mode === 'free' || mode === 'closeup') && !isFocused) {
                        const flapInc = 0.30 + moveSpeed * b.speedToFlapRatio;
                        b.flapPhase = (b.flapPhase + flapInc) % (Math.PI * 2);
                        const dynamicAmp = THREE.MathUtils.lerp(0.3, b.wingAmp, Math.min(moveSpeed * 2.0, 1));
                        const flap = Math.sin(b.flapPhase) * dynamicAmp;
                        const finalFlap = THREE.MathUtils.mapLinear(flap, -1, 1, -0.2, 1.2);
                        b.leftWing.rotation.y = finalFlap; b.rightWing.rotation.y = -finalFlap;
                    } else if (isFocused) {
                        b.leftWing.rotation.y = THREE.MathUtils.lerp(b.leftWing.rotation.y, 0, 0.1);
                        b.rightWing.rotation.y = THREE.MathUtils.lerp(b.rightWing.rotation.y, 0, 0.1);
                    } else {
                        b.leftWing.rotation.y = THREE.MathUtils.lerp(b.leftWing.rotation.y, 0.1, 0.1);
                        b.rightWing.rotation.y = THREE.MathUtils.lerp(b.rightWing.rotation.y, -0.1, 0.1);
                    }
                } else {
                    // 拖拽时的默认扇动
                    b.flapPhase += 0.5;
                    const flap = Math.sin(b.flapPhase) * 0.5;
                    b.leftWing.rotation.y = flap; b.rightWing.rotation.y = -flap;
                    b.basePos.copy(b.group.position); 
                }

                // --- 计算蝴蝶透明度 (特写模式下远离相机的变透明) ---
                let targetOpacity = 1.0;
                if (mode === 'closeup') {
                    if (idx === currentTargetIdx && currentTargetIdx !== -1) targetOpacity = 1.0;
                    else {
                        // 使用开头获取的 currentCamPos
                        const distToCam = currentCamPos.distanceTo(b.group.position);
                        targetOpacity = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(distToCam, 15, 80, 1.0, 0.1), 0.1, 1.0);
                    }
                }
                b.leftWing.material.opacity = THREE.MathUtils.lerp(b.leftWing.material.opacity, targetOpacity, 0.1);
            });

            // =========================================================
            // ▶ 最终渲染
            // =========================================================
            composer.render();
        });

        return () => {
            isMounted = false;
            resizeObserver.disconnect();
            if (rendererRef.current) {
                rendererRef.current.setAnimationLoop(null);
                rendererRef.current.dispose();
            }
            if(mountRef.current && renderer.domElement && mountRef.current.contains(renderer.domElement)) {
                mountRef.current.removeChild(renderer.domElement);
            }
            scene.traverse((object) => {
                if (object.geometry) object.geometry.dispose();
                if (object.material) object.material.dispose();
            });
            renderer.dispose();
        };
    }, [files]);

    const updateCameraPosition = () => {
        if (!cameraRef.current) return;
        const { radius, theta, phi } = cameraState.current;
        const x = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.cos(theta);
        cameraRef.current.position.set(x, y, z);
        cameraRef.current.lookAt(0, 0, 0);
    };

    const handleStart = (clientX, clientY) => {
        const rect = mountRef.current.getBoundingClientRect();
        mouse.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        mouse.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.current.setFromCamera(mouse.current, cameraRef.current);
        const intersectable = [];
        butterfliesRef.current.forEach(b => intersectable.push(b.leftWing, b.rightWing));
        const intersects = raycaster.current.intersectObjects(intersectable);

        if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            const idx = hitMesh.userData.parentIndex;
            if (flightMode.current === 'grid') {
                setFocusModeState(true);
                focusMode.current = true;
                if (idx !== undefined) {
                    focusIndex.current = idx;
                    if (butterfliesRef.current[idx]) butterfliesRef.current[idx].manualRotation.set(0, 0, 0);
                }
                cameraState.current.isDragging = true; 
                cameraState.current.lastX = clientX; cameraState.current.lastY = clientY;
                return;
            }
            draggedObjectRef.current = hitMesh.parent.parent; 
            planeRef.current.position.copy(draggedObjectRef.current.position);
            planeRef.current.lookAt(cameraRef.current.position);
        } else {
            cameraState.current.isDragging = true;
            cameraState.current.lastX = clientX; cameraState.current.lastY = clientY;
            mountRef.current.style.cursor = 'move';
            if (focusMode.current) { setFocusModeState(false); focusMode.current = false; }
        }
    };

    const handleMove = (clientX, clientY) => {
        if (draggedObjectRef.current) {
            const rect = mountRef.current.getBoundingClientRect();
            mouse.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.current.setFromCamera(mouse.current, cameraRef.current);
            const intersects = raycaster.current.intersectObject(planeRef.current);
            if (intersects.length > 0) draggedObjectRef.current.position.copy(intersects[0].point);
            return;
        }
        if (cameraState.current.isDragging) {
            const deltaX = clientX - cameraState.current.lastX;
            const deltaY = clientY - cameraState.current.lastY;
            cameraState.current.lastX = clientX; cameraState.current.lastY = clientY;
            if (focusMode.current) {
                const targetB = butterfliesRef.current[focusIndex.current];
                if (targetB) {
                    targetB.manualRotation.y += deltaX * 0.01;
                    targetB.manualRotation.x += deltaY * 0.01;
                }
            } else {
                cameraState.current.theta -= deltaX * 0.005;
                cameraState.current.phi -= deltaY * 0.005;
                cameraState.current.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.current.phi));
                updateCameraPosition();
            }
        }
    };

    const handleEnd = () => {
        draggedObjectRef.current = null;
        cameraState.current.isDragging = false;
        mountRef.current.style.cursor = 'grab';
    };

    const handleMouseDown = (e) => { e.preventDefault(); handleStart(e.clientX, e.clientY); };
    const handleMouseMove = (e) => { handleMove(e.clientX, e.clientY); };
    const handleMouseUp = handleEnd;
    const handleTouchStart = (e) => {
        const touch = e.touches[0];
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
        handleStart(touch.clientX, touch.clientY);
    };
    const handleTouchMove = (e) => { const touch = e.touches[0]; handleMove(touch.clientX, touch.clientY); };
    const handleTouchEnd = (e) => {
        handleEnd();
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dt = Date.now() - touchStartRef.current.time;
        if (focusMode.current && dt < 500 && Math.abs(dx) > 30) {
            if (dx > 0) switchFocus('prev'); else switchFocus('next');
        }
    };
    const handleWheel = (e) => {
        if (focusMode.current) return;
        const delta = e.deltaY * 0.1;
        cameraState.current.radius = Math.max(20, Math.min(800, cameraState.current.radius + delta));
        updateCameraPosition(); 
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col watercolor-paper no-select">
            <audio 
                ref={audioRef} 
                src={audioUrl || DEFAULT_MUSIC} 
                crossOrigin="anonymous" 
               onEnded={() => switchMode('free')} 
            />
            
            <div className={`absolute top-0 left-0 w-full p-4 z-[200] flex justify-between items-center pointer-events-none transition-opacity duration-300 ${isFullscreen ? 'opacity-0' : 'opacity-100'}`}>
                <button onClick={onBack} className="w-10 h-10 bg-white/50 hover:bg-white text-gray-800 rounded-full backdrop-blur-md flex items-center justify-center transition shadow-lg pointer-events-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-gray-800/80 font-serif text-xl tracking-widest pointer-events-auto select-none"></h2>
                    {mvState.current.isPlaying && <span className="text-[10px] text-red-500 font-mono animate-pulse"></span>}
                </div>
                <div className="w-10"></div>
            </div>

            <div className="absolute top-4 right-4 z-[210] pointer-events-auto">
                <button onClick={toggleFullscreen} className={`rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-lg ${isFullscreen ? 'w-8 h-8 bg-black/20 text-white/50 hover:bg-black/40 hover:text-white' : 'w-10 h-10 bg-white/50 hover:bg-white text-gray-800'}`}>
                    {isFullscreen ? (
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" /></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>
                    )}
                </button>
            </div>

            <div ref={mountRef} className="flex-1 w-full h-full cursor-grab active:cursor-grabbing touch-none" style={{ touchAction: 'none' }} 
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onWheel={handleWheel}>
            </div>

            <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-[200] pointer-events-auto transition-opacity duration-300 ${isFullscreen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                <div className="flex items-center gap-4 bg-white/70 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-2xl border border-white/50">
                     <button onClick={() => switchMode('free')} className={`w-10 h-10 touch-btn rounded-xl flex items-center justify-center text-xl transition-all ${flightModeState === 'free' ? 'bg-slate-800 text-white shadow-lg scale-110' : 'text-slate-600 hover:bg-white/50'}`}>1</button>
                    <div className="w-px h-6 bg-slate-300"></div>
                    <button onClick={() => switchMode('grid')} className={`w-10 h-10 touch-btn rounded-xl flex items-center justify-center text-xl transition-all ${flightModeState === 'grid' ? 'bg-slate-800 text-white shadow-lg scale-110' : 'text-slate-600 hover:bg-white/50'}`}>2</button>
                    <div className="w-px h-6 bg-slate-300"></div>
                    <button onClick={() => switchMode('closeup')} className={`w-10 h-10 touch-btn rounded-xl flex items-center justify-center text-xl transition-all ${flightModeState === 'closeup' ? 'bg-slate-800 text-white shadow-lg scale-110' : 'text-slate-600 hover:bg-white/50'}`}>3</button>
                    <div className="w-px h-6 bg-slate-300"></div>
                    <button onClick={() => switchMode('mv')} className={`w-10 h-10 touch-btn rounded-xl flex items-center justify-center text-xl transition-all ${flightModeState === 'mv' ? 'bg-rose-600 text-white shadow-lg scale-110' : 'text-rose-600 hover:bg-rose-100'}`}>♫</button>
                </div>
            </div>

            {focusModeState && !isFullscreen && (
                <>
                    <button onClick={() => switchFocus('prev')} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/30 hover:bg-white/60 text-slate-800 rounded-full backdrop-blur-md flex items-center justify-center transition pointer-events-auto z-[200]">◀</button>
                    <button onClick={() => switchFocus('next')} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/30 hover:bg-white/60 text-slate-800 rounded-full backdrop-blur-md flex items-center justify-center transition pointer-events-auto z-[200]">▶</button>
                </>
            )}

            {files.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
                    <div className="bg-black/40 text-white px-6 py-3 rounded-full backdrop-blur-md border border-white/20">暂无素材，请先返回拍摄</div>
                </div>
            )}
        </div>
    );
};

export default ChaosGallery;