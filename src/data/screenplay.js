export const SCREENPLAY = [     
    { id: 1,  startTime: 0.00, camera: { type: 'ORBIT', target: 'bug_0',  distance: 10, height: 2, speed: 0.05},focus: { target: 'bug_0', aperture: 0.002 } },
    { id: 2,  startTime: 1.45, camera: { type: 'ORBIT', target: 'bug_1',  distance: 12, height: -3,speed: -0.04}, focus: { target: 'bug_1' } },
    { id: 3,  startTime: 3.11, camera: { type: 'ORBIT', target: 'bug_2',  distance: 9,  height: 4, speed: 0.06}, focus: { target: 'bug_2' } },
    { id: 4,  startTime: 4.43, camera: { type: 'ORBIT', target: 'bug_3',  distance: 11, height: 0, speed: -0.03}, focus: { target: 'bug_3' } },
    { id: 5,  startTime: 6.15, camera: { type: 'ORBIT', target: 'bug_4',  distance: 10, height: 2, speed: 0.05}, focus: { target: 'bug_4' } },
    { id: 6,  startTime: 7.43, camera: { type: 'ORBIT', target: 'bug_5',  distance: 8,  height: -2,speed: 0.08}, focus: { target: 'bug_5' } },
    { id: 7,  startTime: 9.17, camera: { type: 'ORBIT', target: 'bug_6',  distance: 12, height: 5, speed: -0.05}, focus: { target: 'bug_6' } },
    { id: 8,  startTime: 10.51,camera: { type: 'ORBIT', target: 'bug_7',  distance: 10, height: 1, speed: 0.04}, focus: { target: 'bug_7' } },
    { id: 9,  startTime: 12.23,camera: { type: 'ORBIT', target: 'bug_8',  distance: 15, height: 8, speed: -0.02}, focus: { target: 'bug_8' } },
    { id: 10, startTime: 13.10,camera: { type: 'ORBIT', target: 'bug_9',  distance: 10, height: 0, speed: 0.06}, focus: { target: 'bug_9' } },
    { id: 11, startTime: 17.35,camera: { type: 'ORBIT', target: 'bug_10', distance: 12, height: 3, speed: -0.04}, focus: { target: 'bug_10' } },
    { id: 12, startTime: 20.46,camera: { type: 'ORBIT', target: 'bug_11', distance: 10, height: -4,speed: 0.05}, focus: { target: 'bug_11' } },
    { id: 13, startTime: 25.28,camera: { type: 'ORBIT', target: 'bug_12', distance: 14, height: 5, speed: -0.03}, focus: { target: 'bug_12' } },
    { id: 14, startTime: 29.58,camera: { type: 'ORBIT', target: 'bug_13', distance: 9,  height: 0, speed: 0.07}, focus: { target: 'bug_13' } },
    { id: 15, startTime: 33.07,camera: { type: 'ORBIT', target: 'bug_14', distance: 11, height: 2, speed: -0.05}, focus: { target: 'bug_14' } },

    // ==========================================
    // ★ 37.43s - 49.55s: 合并后的全景穿越镜头 ★
    // 动作：蝴蝶聚成环，相机从环中缓慢穿过
    // ==========================================
    {id: 16, 
        startTime: 37.43,
        camera: { 
            type: 'FIXED', 
            // 目标位置设在远处 (Z=-200)，相机将从当前位置飞向这里，实现“穿过”效果
            pos: [0, 0, 0], 
            lookAt: [0, 900, 0] // 始终盯着圆环中心
        },
        focus: { 
            aperture: 0.001, // 小光圈，全景清晰
            value: 100       // 焦距适中
        }
    },
    {
        id: 23, 
        startTime: 40.43,
        camera: { 
            type: 'FIXED', 
            // 目标位置设在远处 (Z=-200)，相机将从当前位置飞向这里，实现“穿过”效果
            pos: [0, 89, 0], 
            lookAt: [0, 900, 0] // 始终盯着圆环中心
        },
        focus: { 
            aperture: 0.001, // 小光圈，全景清晰
            value: 100       // 焦距适中
        }
    },

    // ==========================================
    // 后续接力 (ID 顺延)
    // ==========================================
    { id: 24, startTime: 49.55, camera: { type: 'ORBIT', target: 'bug_23', distance: 18, speed: 0.03 }, focus: { target: 'bug_23' } },
    { id: 25, startTime: 50.21, camera: { type: 'ORBIT', target: 'bug_24', distance: 12, speed: -0.04 }, focus: { target: 'bug_24' } },
    { id: 26, startTime: 50.47, camera: { type: 'ORBIT', target: 'bug_25', distance: 10, speed: 0.05 }, focus: { target: 'bug_25' } },
    { id: 27, startTime: 51.11, camera: { type: 'ORBIT', target: 'bug_26', distance: 14, speed: -0.03 }, focus: { target: 'bug_26' } },
    { id: 28, startTime: 53.01, camera: { type: 'ORBIT', target: 'bug_27', distance: 12, speed: 0.04 }, focus: { target: 'bug_27' } },
    // { id: 29, startTime: 53.57, camera: { type: 'ORBIT', target: 'bug_28', distance: 10, speed: -0.05 }, focus: { target: 'bug_28' } },
    

    {
        id: 29, startTime: 58.31,
        camera: { 
            type: 'FIXED', 
            pos: [0, 80, 150],      // 站在地面中心
            lookAt: [0, 0, 200], // 垂直仰望天空
            fov: 30              // 稍广角，增强压迫感
        },
        focus: { 
            aperture: 0.0001, // 小光圈全景清晰
            value: 80        // 焦距对准方阵高度
        }
    },

    {
        id: 30, 
        startTime: 58.31,
        camera: { 
            type: 'FIXED', 
            pos: [0, 150, 150.0],      // 站在地面中心
            lookAt: [0, 0, 0], // 垂直仰望天空
            fov: 30              // 稍广角，增强压迫感
        },
        focus: { 
            aperture: 0.0001, // 小光圈全景清晰
            value: 80        // 焦距对准方阵高度
        }
    },


    {
        id: 31, startTime: 76.01,
        camera: { 
        type: 'ORBIT', 
        target: 'bug_31', distance: 102, height: -2, speed: 0.5 
        }
  
    },

    { id: 34, startTime: 90.06, camera: { type: 'ORBIT', target: 'bug_32', distance: 50, speed: 0.34 }, focus: { target: 'bug_32' } },
    { id: 35, startTime: 102.23, camera: { type: 'ORBIT', target: 'bug_33', distance: 50, speed: -0.7 }, focus: { target: 'bug_33' } },
    { id: 36, startTime: 106.51, camera: { type: 'ORBIT', target: 'bug_34', distance: 50, speed: 0.65 }, focus: { target: 'bug_34' } },
    { id: 37, startTime: 109.58, camera: { type: 'ORBIT', target: 'bug_35', distance: 50, speed: -0.86 }, focus: { target: 'bug_35' } },
    { id: 38, startTime: 114.40, camera: { type: 'ORBIT', target: 'bug_36', distance: 55, speed: 0.23 }, focus: { target: 'bug_36' } },
    { id: 39, startTime: 119.05, camera: { type: 'ORBIT', target: 'bug_37', distance: 52, speed: -0.04 }, focus: { target: 'bug_37' } },
    { id: 40, startTime: 122.13, camera: { type: 'ORBIT', target: 'bug_38', distance: 50, speed: 0.05 }, focus: { target: 'bug_38' } },
    

    { id: 41, startTime: 126.53, camera: { type: 'FIXED', pos: [0, 150, 0], lookAt: [0, 0, 0]}},
    { id: 42, startTime: 127.17, camera: { type: 'FIXED', pos: [0, 150, 0], lookAt: [0, 0, 0]}},
   
    {id: 43, startTime: 130.00,camera: { type: 'FIXED', pos: [0,800,0], lookAt: [0, 0, 0]}},
  {
      id: 45,
      startTime: 170.00,  // 约2分50秒
      camera: { type: 'FIXED', pos: [0, 800, 0], lookAt: [0, 0, 0] }
  },

];