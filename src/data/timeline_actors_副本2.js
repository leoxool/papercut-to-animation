export const ACTOR_TIMELINE = {
    // ============================
    // 灯光与场景保持不变
    // ============================
    keyLight: [
        { time: 0.0, intensity: 0, color: '#000000' },
        { time: 3.0, intensity: 60, color: '#ffaa00', pos: [50, 300, 100] },
        { time: 40.0, intensity: 80, color: '#ffffff' },
        { time: 126.0, intensity: 10, color: '#0000ff' },
        { time: 127.0, intensity: 150, color: '#ffffff', pos: [0, 500, 0] }
    ],
    rectLight: [
        { time: 0.0, intensity: 0 },
        { time: 5.0, intensity: 40, color: '#00ffff' },
        { time: 76.0, intensity: 60, color: '#ff00ff' }
    ],
    stage: [{ time: 0.0, pos: [0, -550, 0], rot: [0, 0, 0], scale: [2000, 1000, 2000] }],
    tree: [{ time: 0.0, scale: [150, 150, 150], pos: [0, -80, -200] }],

    // ============================
    // ★★★ 核心修改：蝴蝶群 Swarm ★★★
    // ============================
    swarm: [
        { 
            time: 0.0, formation: 'SPHERE', spread: 5.0, center: [0, 120, 0], 
            noise: 40.0, flapSpeed: 0.3, scale: 1.0, opacity: 1.0,rot:[0,0,0] 
        },
        {
            time: 37.43, formation: 'VORTEX', spread: 9.0, center: [0, 0, 0],
            noise: 5.0, flapSpeed: 0.2, scale: 2.2,rot:[0,0,0]
        },
        {
            time: 49.55, formation: 'SPHERE', spread: 6.0, center: [0, 120, 0],
            noise: 40.0, flapSpeed: 0.2,rot:[0,0,0],scale: 2.6
        },

        // ==============================================================================
        // ★ 新增关键帧段：58.31s - 70.42s 方阵飞越
        // ==============================================================================
        {
            time: 58.31,         // 动作开始
            formation: 'GRID',   // ★ 方阵
            spread: 1.5,         // ★ 紧凑肩并肩
            center: [0, 80, 100],// ★ 统一高度 Y=80, 起始于远处 Z=200
            noise: 2.0,          // 极低噪点，保持队形整齐
            flapSpeed: 0.1,      // ★ 翅膀展开不扇动 (静止状态)
            scale: 2.2  ,
            rot:[0,3.14/2,0]         // 稍微大一点更有气势
        },
        {
            time: 70.42,         // 动作结束 (镜头切换点)
            formation: 'GRID',   
            spread: 1.5,
            center: [0, 150, 100], // ★ 飞到摄影机身后 Z=-200
            noise: 2.0,
            flapSpeed: 0.1,
            scale: 2.2,
            
        },
        // ==============================================================================

        {
            time: 76.0, formation: 'VORTEX', spread: 6.5, center: [0, 250, 0],
            noise: 10.0, flapSpeed: 0.2,scale: 4.2  
        },
        {
            time: 159.0, formation: 'GRID', spread: 2.0, center: [0, 150, 0],
            noise: 5.0, flapSpeed: 0.2
        },
        {
            time: 183.0, formation: 'SPHERE', spread: 8.0, center: [0, 300, 0],
            noise: 50.0, flapSpeed: 0.2
        }
    ]
};