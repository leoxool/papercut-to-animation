import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// 引入 Three.js 扩展库
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
// 引入加载器
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 引入常量和导演类
import { CONFIG } from '../utils/constants';
import { MVDirector } from '../logic/MVDirector';

const ChaosGallery = ({ files, onBack, audioUrl }) => {
    const mountRef = useRef(null);
    const sceneRef = useRef(null);
    const cameraRef = useRef(null);
    const rendererRef = useRef(null);
    const composerRef = useRef(null);
    const bokehPassRef = useRef(null);
    const keyLightRef = useRef(null); 
    const wallRef = useRef(null); 
    const floorRef = useRef(null); 
    const audioRef = useRef(null); 
    
    // 存放所有蝴蝶对象
    const butterfliesRef = useRef([]); 
    const sceneryRef = useRef({}); // 用来存所有外部模型
    
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

    // === 模式切换 ===
  // === 模式切换逻辑 (修正版) ===
    const switchMode = (mode) => {
        // 1. 🔥 核心修正：无论切换到哪个模式，先强制退出特写状态
        focusMode.current = false;
        setFocusModeState(false);
        
        // 2. 更新主模式
        flightMode.current = mode;
        setFlightModeState(mode);

        // 3. 处理 MV 模式的特殊逻辑
        if (mode === 'mv') {
            if (audioRef.current) {
                audioRef.current.currentTime = 0;
                if (audioUrl) {
                    audioRef.current.play().catch(e => console.log("Audio play failed:", e));
                } else {
                    alert("请先上传音乐 (MP3) 以启动 MV 模式");
                    switchMode('free');
                    return;
                }
            }
            mvState.current.isPlaying = true;
            mvState.current.startTime = Date.now() / 1000;
        } else {
            // 非 MV 模式暂停音乐
            if (audioRef.current) {
                audioRef.current.pause();
            }
            mvState.current.isPlaying = false;
            
            // 退出 MV 模式时恢复相机 FOV
            if (cameraRef.current) {
                cameraRef.current.fov = 50;
                cameraRef.current.updateProjectionMatrix();
            }
            if (keyLightRef.current) keyLightRef.current.intensity = 1.5; // 恢复灯光
        }

        // 4. 根据模式重置相机参数
        if (mode === 'free') {
            // 自由模式：重置角度，防止相机卡在奇怪的朝向
            cameraState.current.theta = 0;
            cameraState.current.phi = Math.PI / 2 - 0.2; 
            cameraState.current.radius = 130; 
            
            // 顺便让所有蝴蝶复位手动旋转，防止刚才观察的那只蝴蝶还是歪的
            butterfliesRef.current.forEach(b => b.manualRotation.set(0, 0, 0));

        } else if (mode === 'grid') {
            cameraState.current.theta = 0;
            cameraState.current.phi = Math.PI / 2 - 0.1;
            cameraState.current.radius = optimalGridDistance.current;
            
            // Grid 模式下重置蝴蝶旋转
            butterfliesRef.current.forEach(b => {
                b.manualRotation.set(0, 0, 0);
            });
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

    // 全屏监听
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => console.error(err));
        } else {
            if (document.exitFullscreen) document.exitFullscreen();
        }
    };

    // 键盘监听
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

    // === Three.js 初始化 ===
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
        let isMounted = true; 

        const width = mountRef.current.clientWidth || window.innerWidth;
        const height = mountRef.current.clientHeight || window.innerHeight;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(CONFIG.BG_COLOR);
        scene.fog = new THREE.Fog(CONFIG.BG_COLOR, CONFIG.FOG_NEAR, CONFIG.FOG_FAR); 
        sceneRef.current = scene;

        const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1500);
        cameraRef.current = camera;
        updateCameraPosition();

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

        const composer = new EffectComposer(renderer);
        const renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        const bokehPass = new BokehPass(scene, camera, {
            focus: 1.0, aperture: 0.0001, maxblur: 0.005, width: width, height: height
        });
        composer.addPass(bokehPass);
        composerRef.current = composer;
        bokehPassRef.current = bokehPass;

        const ambientLight = new THREE.AmbientLight(0xffffff,6); 
        scene.add(ambientLight);

        const spotLight = new THREE.SpotLight(0xffffff , 80); 
        spotLight.position.set(50, 70, 100); 
        spotLight.angle = Math.PI / 4;
        spotLight.penumbra = 0.5; 
        spotLight.decay = 2;
        spotLight.distance =800;
        spotLight.castShadow = true;
        spotLight.shadow.mapSize.width = 2048;
        spotLight.shadow.mapSize.height = 2048;
       spotLight.shadow.bias = -0.0001;
        spotLight.shadow.radius = 10; 
        spotLight.shadow.blurSamples = 5;
       spotLight.shadow.normalBias = 0.05;
        scene.add(spotLight);
        keyLightRef.current = spotLight;

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5.0);
        scene.add(hemiLight);


const gltfLoader = new GLTFLoader();
    






        const wallGeo = new THREE.PlaneGeometry(6000, 6000);
        const wallMat = new THREE.ShadowMaterial({ color: 0x5a4d3b, opacity: 0.0 });
        const wall = new THREE.Mesh(wallGeo, wallMat.clone());
        wall.position.z = -135; 
        wall.receiveShadow = true; 
        scene.add(wall);
        wallRef.current = wall; 

        const floorGeo = new THREE.PlaneGeometry(6000, 6000);
        const floor = new THREE.Mesh(floorGeo, wallMat.clone());
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -30; 
        floor.receiveShadow = true;
        scene.add(floor);
        floorRef.current = floor;

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

                const material = new THREE.MeshStandardMaterial({
                    map: texture, side: THREE.DoubleSide, transparent: true, opacity: 1.0,        
                    alphaTest: 0.1, roughness: 0.8, metalness: 0.0, emissive: 0x222222, emissiveIntensity: 0.1
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


///////
      


    

///////////

        // ★★★ 核心修改：把整个世界打包给导演 ★★★
        const sceneContext = {
            scene: scene,
            camera: camera,
            renderer: renderer,
            butterflies: butterfliesRef.current,
            keyLight: keyLightRef.current,
            ambientLight: ambientLight,
            bokehPass: bokehPassRef.current,
            wall: wallRef.current,
            floor: floorRef.current,
            audio: audioRef.current,
////////////
          scenery: {
            tree: sceneryRef.current.tree,   // 对应 timeline 里的 "tree"
            stage: sceneryRef.current.stage  // 对应 timeline 里的 "stage"
    },
            // 甚至可以传一组灯光
          //  lights: [keyLightRef.current, fillLight, rimLight]
////////
        };
        
        // 初始化导演
        directorRef.current = new MVDirector(sceneContext);

        // 噪声运动函数 (用于非MV模式)
        const getFreePosition = (t, b) => {
            const variableTime = t * b.baseSpeed + Math.sin(t * 0.5 + b.noiseOffset) * 2.0;
            const noiseX = Math.sin(variableTime * b.freqX + b.noiseOffset) * 20 + Math.cos(variableTime * 0.5) * 10;
            const noiseY = Math.cos(variableTime * b.freqY + b.noiseOffset) * 15 + Math.sin(variableTime * 0.3) * 8;
            const noiseZ = Math.sin(variableTime * b.freqZ + b.noiseOffset) * 15 + Math.cos(variableTime * 0.7) * 8;
            return new THREE.Vector3(b.basePos.x + noiseX, b.basePos.y + noiseY, b.basePos.z + noiseZ);
        };

        const clock = new THREE.Clock();
        
        renderer.setAnimationLoop(() => {
            const t = clock.getElapsedTime(); 
            const mode = flightMode.current;

            // --- MV 模式 ---
            if (mode === 'mv' && directorRef.current && audioRef.current) {
                const audioTime = audioRef.current.currentTime;
                // 全权交给导演
                directorRef.current.update(t, audioTime);
                composer.render();
                return; // MV 模式独占渲染循环，后面的逻辑全部跳过
            }

            // --- 常规模式的逻辑 (Grid, Free, Closeup) ---
            // 只有非 MV 模式才会执行下面的代码
            
            // 环境动态
            if (wallRef.current) {
                const targetWallZ = (mode === 'grid') ? -5 : -500;
                wallRef.current.position.z = THREE.MathUtils.lerp(wallRef.current.position.z, targetWallZ, 0.1);
                const dist = Math.abs(wallRef.current.position.z);
                const visibility = 1.0 - THREE.MathUtils.smoothstep(dist, 5, 20);
                wallRef.current.material.opacity = 0.25 * visibility; 
                if (keyLightRef.current && mode === 'grid') {
                      const blurFactor = THREE.MathUtils.mapLinear(dist, 5, 20, 0, 1);
                      keyLightRef.current.shadow.radius = THREE.MathUtils.lerp(4, 20, Math.max(0, Math.min(1, blurFactor)));
                }
            }
            if (floorRef.current) {
                 const targetFloorOpacity = (mode === 'grid') ? 0.0 : 0.15;
                 floorRef.current.material.opacity = THREE.MathUtils.lerp(floorRef.current.material.opacity, targetFloorOpacity, 0.05);
            }

            // 相机控制
            let targetCamPos = new THREE.Vector3();
            let targetLookAt = new THREE.Vector3();
            let lerpSpeed = 0.05; 
            let targetFocusDistance = 150; 
            let targetAperture = 0.0001; 
            let currentTargetIdx = -1;

            if (mode === 'closeup' && butterfliesRef.current.length > 0) {
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
                        lerpSpeed = 0.04; 
                        targetFocusDistance = camera.position.distanceTo(curBug.group.position);
                        targetAperture = 0.001; 
                    } else {
                        const transT = localTime - focusTime;
                        const alpha = transT / transition;
                        const ease = alpha * alpha * (3 - 2 * alpha); 
                        const p1 = getOrbitPos(curBug, t); const p2 = getOrbitPos(nextBug, t);
                        targetCamPos.lerpVectors(p1, p2, ease);
                        targetCamPos.y += Math.sin(alpha * Math.PI) * 10;
                        const l1 = curBug.group.position; const l2 = nextBug.group.position;
                        targetLookAt.lerpVectors(l1, l2, ease);
                        lerpSpeed = 0.05; 
                        targetFocusDistance = THREE.MathUtils.lerp(p1.distanceTo(l1), p2.distanceTo(l2), ease);
                        targetAperture = 0.001; 
                    }
                }
            } else if (focusMode.current && butterfliesRef.current[focusIndex.current]) {
                 const targetB = butterfliesRef.current[focusIndex.current];
                 const bPos = targetB.group.position;
                 targetCamPos.set(bPos.x, bPos.y, bPos.z + 15); 
                 targetLookAt.copy(bPos);
                 targetFocusDistance = camera.position.distanceTo(bPos);
                 targetAperture = 0.0005; 
            } else {
                const { radius, theta, phi } = cameraState.current;
                const x = radius * Math.sin(phi) * Math.sin(theta);
                const y = radius * Math.cos(phi);
                const z = radius * Math.sin(phi) * Math.cos(theta);
                targetCamPos.set(x, y, z);
                targetLookAt.set(0, 0, 0);
                if (mode === 'free') { targetFocusDistance = 200; targetAperture = 0.0; } 
                else { targetFocusDistance = radius; targetAperture = 0.0002; }
            }

            camera.position.lerp(targetCamPos, lerpSpeed);
            currentLookAt.current.lerp(targetLookAt, lerpSpeed);
            camera.lookAt(currentLookAt.current);

            if (bokehPassRef.current) {
                const u = bokehPassRef.current.uniforms;
                u['focus'].value = THREE.MathUtils.lerp(u['focus'].value, targetFocusDistance, 0.2);
                u['aperture'].value = THREE.MathUtils.lerp(u['aperture'].value, targetAperture, 0.05);
            }

            const currentCamPos = camera.position;

            butterfliesRef.current.forEach((b, idx) => {
                const isDragging = draggedObjectRef.current === b.body || draggedObjectRef.current === b.group;
                const isFocused = focusMode.current && focusIndex.current === idx;

                if (!isDragging) {
                    let moveSpeed = 0;
                    if ((mode === 'free' || mode === 'closeup') && !isFocused) {
                        const targetPos = getFreePosition(t, b);
                        const futurePos = getFreePosition(t + 0.5, b);
                        b.group.position.lerp(targetPos, 0.04); 
                        moveSpeed = b.group.position.clone().sub(b.lastPos).length(); 
                        b.lastPos.copy(b.group.position);
                        
                        dummyObj.current.position.copy(b.group.position);
                        const lookTarget = futurePos.clone();
                        if (lookTarget.y < b.group.position.y) lookTarget.y = b.group.position.y; 
                        dummyObj.current.lookAt(lookTarget);
                        const banking = (futurePos.x - targetPos.x) * -0.05; 
                        dummyObj.current.rotateZ(banking);
                        b.group.quaternion.slerp(dummyObj.current.quaternion, 0.08);
                    } else {
                        b.group.position.lerp(b.gridPos, 0.05);
                        moveSpeed = 0;
                        if (isFocused) {
                            dummyObj.current.rotation.set(Math.PI/2 + b.manualRotation.x, Math.PI + b.manualRotation.y, Math.PI);
                            b.group.quaternion.slerp(dummyObj.current.quaternion, 0.1);
                        } else {
                            const swayX = Math.sin(t + b.noiseOffset) * 0.1;
                            const swayY = Math.cos(t * 0.8 + b.noiseOffset) * 0.1;
                            dummyObj.current.position.copy(b.group.position);
                            dummyObj.current.rotation.set(Math.PI/2 + swayX, Math.PI + swayY, Math.PI); 
                            b.group.quaternion.slerp(dummyObj.current.quaternion, 0.05);
                        }
                    }

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
                    b.flapPhase += 0.5;
                    const flap = Math.sin(b.flapPhase) * 0.5;
                    b.leftWing.rotation.y = flap; b.rightWing.rotation.y = -flap;
                    b.basePos.copy(b.group.position); 
                }

                let targetOpacity = 1.0;
                if (mode === 'closeup') {
                    if (idx === currentTargetIdx && currentTargetIdx !== -1) targetOpacity = 1.0;
                    else {
                        const distToCam = currentCamPos.distanceTo(b.group.position);
                        targetOpacity = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(distToCam, 15, 80, 1.0, 0.1), 0.1, 1.0);
                    }
                }
                b.leftWing.material.opacity = THREE.MathUtils.lerp(b.leftWing.material.opacity, targetOpacity, 0.1);
            });

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

    // 输入处理 (鼠标/触摸)
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
            <audio ref={audioRef} src={audioUrl} loop crossOrigin="anonymous" />
            
            <div className={`absolute top-0 left-0 w-full p-4 z-[200] flex justify-between items-center pointer-events-none transition-opacity duration-300 ${isFullscreen ? 'opacity-0' : 'opacity-100'}`}>
                <button onClick={onBack} className="w-10 h-10 bg-white/50 hover:bg-white text-gray-800 rounded-full backdrop-blur-md flex items-center justify-center transition shadow-lg pointer-events-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                </button>
                <div className="flex flex-col items-center">

                    <h2 className="text-gray-800/80 font-serif text-xl tracking-widest pointer-events-auto select-none"></h2>

                    {mvState.current.isPlaying && <span className="text-[10px] text-red-500 font-mono animate-pulse">● RECORDING</span>}
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