export const ACTOR_TIMELINE = {
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

    pointLight1: [
        { time: 0.0, intensity: 0 },
        { time: 102.0, intensity: 0 },
        { time: 102.23, intensity: 1500, color: '#ff0055', distance: 150 }
    ],
    pointLight2: [
        { time: 0.0, intensity: 0 },
        { time: 102.0, intensity: 0 },
        { time: 102.23, intensity: 1500, color: '#00ffff', distance: 150 }
    ],
    pointLight3: [
        { time: 0.0, intensity: 0 },
        { time: 102.0, intensity: 0 },
        { time: 102.23, intensity: 1500, color: '#ffff00', distance: 150 }
    ],
    pointLight4: [
        { time: 0.0, intensity: 0 },
        { time: 102.0, intensity: 0 },
        { time: 102.23, intensity: 1500, color: '#00ff00', distance: 150 }
    ],

    stage: [
        {
            time: 0.0,
            pos: [0, -800, 0],
            tiling: 2,
            subTiling: 2.0,
            segments: 1.0,
            opacity: 0.0
        },
        {
            time: 129.3,
            pos: [0, -800, 0],
            tiling: 2,
            subTiling: 2.0,
            segments: 1.0,
            opacity: 0.0
        },
        {
            time: 134.0,
            pos: [0, 100, 0],
            tiling: 2.0,
            subTiling: 2.0,
            segments: 2.0,
            opacity: 1.0
        },
        {
            time: 142.59,
            pos: [0, 100, 0],
            tiling: 1.0,
            subTiling: 3.0,
            segments: 4.0,
            opacity: 1.0
        },
        {
            time: 147.44,
            pos: [0, 100, 0],
            tiling: 1.0,
            subTiling: 4.0,
            segments: 7.0,
            opacity: 1.0
        },
        {
            time: 153.55,
            pos: [0, 100, 0],
            tiling: 1.0,
            subTiling: 6.0,
            segments: 8.0,
            opacity: 1.0
        },

        {
            time: 194.46,
            pos: [0, 100, 0],
            tiling: 1.0,
            subTiling: 3.0,
            segments: 9.0,
            opacity: 1.0
        },
        {
            time: 209.59,
            pos: [0, 100, 0],
            tiling: 1.0,
            subTiling: 3.0,
            segments: 15.0,
            opacity: 1.0
        },
        {
            time: 218.48,
            pos: [0, 100, 0],
            tiling: 1.0,
            subTiling: 3.0,
            segments: 18.0,
            opacity: 1.0
        }
    ],

    swarm: [
        {
            time: 0.0,
            formation: 'SPHERE',
            spread: 5.0,
            center: [0, 120, 0],
            noise: 40.0,
            flapSpeed: 0.3,
            scale: 1.0,
            opacity: 1.0
        },
        {
            time: 37.43,
            formation: 'VORTEX',
            spread: 9.0,
            center: [0, 0, 0],
            noise: 5.0,
            flapSpeed: 0.2,
            scale: 2.2
        },
        {
            time: 49.55,
            formation: 'SPHERE',
            spread: 6.0,
            center: [0, 120, 0],
            noise: 40.0,
            flapSpeed: 0.2,
            scale: 2.6
        },
        {
            time: 58.31,
            formation: 'GRID',
            spread: 1.5,
            center: [0, 80, 100],
            noise: 2.0,
            flapSpeed: 0.1,
            scale: 2.2,
            rot: [0, 3.14 / 2, 0]
        },
        {
            time: 70.42,
            formation: 'GRID',
            spread: 1.5,
            center: [0, 120, 100],
            noise: 2.0,
            flapSpeed: 0.1,
            scale: 2.2,
            rot: [0, 3.14, 0]
        },
        {
            time: 76.0,
            formation: 'VORTEX',
            spread: 2.5,
            center: [0, 180, 0],
            noise: 10.0,
            flapSpeed: 0.2,
            scale: 4.2
        },
        {
            time: 127.38,
            formation: 'VORTEX',
            spread: 12.0,
            center: [0, 50, 0],
            noise: 10.0,
            flapSpeed: 0.3,
            scale: 2.0,
            rot: [0, -3.14, 0]
        },

        {
            time: 190.0,
            formation: 'VORTEX',
            spread: 1.0,
            center: [0, 600, 0],
            noise: 20.0,
            flapSpeed: 0.4,
            rot: [0, -3.14, 0],
            scale: 2.0
        },

        {
            time: 200.0,
            formation: 'SPHERE',
            spread: 12.0,
            center: [0, 800, 0],
            noise: 50.0,
            flapSpeed: 0.3,
            rot: [0, -3.14, 0]
        },
        {
            time: 210.0,
            formation: 'SPHERE',
            spread: 3.0,
            center: [0, 500, 0],
            noise: 20.0,
            scale: 6.0,
            flapSpeed: 0.5,
            rot: [0, -3.14, 0]
        }
    ]
};
