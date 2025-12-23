// src/data/timeline_actors.js

export const ACTOR_TIMELINE = {
    // ============================
    // 1. 灯光：保持通透，因为飞得高，主光位置也相应抬高
    // ============================
    keyLight: [
        { time: 0.0, intensity: 0, color: '#000000' },
        { time: 2.0, intensity: 80, color: '#xfff5e6', pos: [50, 400, 100] } // 灯光抬高
    ],
    rectLight: [
        { time: 0.0, intensity: 0 },
        { time: 2.0, intensity: 40, color: '#00ccff' }
    ],
    pointLight1: [{ time: 0, intensity: 300, color: '#ff00ff', pos: [100, 200, 100] }], 
    pointLight2: [{ time: 0, intensity: 300, color: '#00ffff', pos: [-100, 200, -100] }],

    // ============================
    // 2. 场景：地面场景作为深远的背景
    // ============================
    stage: [
        { time: 0.0, pos: [0, -100, 0], rot: [0, 0, 0], scale: [10, 1, 10] }
    ],
    tree: [
        { time: 0.0, scale: [120, 120, 120], pos: [0, -50, -100] } 
    ],

    // ============================
    // 3. 蝴蝶群：高空慢动作编队
    // ============================
    swarm: [
        { 
            time: 0.0, 
            formation: 'SPHERE', 
            spread: 4.0,        // 4倍扩散 (半径约160)，底端约 250-160 = 90 (安全线附近)
            center: [0, 250, 0], // ★ 核心修改：起始高度 250
            noise: 20.0,        // 噪点降低，更加平滑
            flapSpeed: 0.1,     // ★ 核心修改：极慢速扇动
            scale: 1.0,
            opacity: 1.0
        },
        {
            time: 230.0, 
            formation: 'SPHERE',
            spread: 5.0,        // 缓慢扩散
            center: [0, 350, 0], // ★ 核心修改：越飞越高
            noise: 30.0,        
            flapSpeed: 0.15     // 依然保持很慢
        }
    ]
};