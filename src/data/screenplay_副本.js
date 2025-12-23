// src/data/screenplay.js

export const SCREENPLAY = [
    // 01. 蝴蝶 #0
    {
        id: 1, startTime: 0.00,
        camera: { type: 'ORBIT', target: 'bug_0', distance: 25, height: 5, speed: 0.05 }, // 极慢正向
        focus: { target: 'bug_0', aperture: 0.003 }
    },
    // 02. 蝴蝶 #1
    {
        id: 2, startTime: 1.45,
        camera: { type: 'ORBIT', target: 'bug_1', distance: 30, height: -5, speed: -0.04 }, // 极慢反向
        focus: { target: 'bug_1' }
    },
    // 03. 蝴蝶 #2
    {
        id: 3, startTime: 3.11,
        camera: { type: 'ORBIT', target: 'bug_2', distance: 22, height: 8, speed: 0.06 },
        focus: { target: 'bug_2' }
    },
    // 04. 蝴蝶 #3
    {
        id: 4, startTime: 4.43,
        camera: { type: 'ORBIT', target: 'bug_3', distance: 35, height: 0, speed: -0.03 },
        focus: { target: 'bug_3' }
    },
    // 05. 蝴蝶 #4
    {
        id: 5, startTime: 6.15,
        camera: { type: 'ORBIT', target: 'bug_4', distance: 28, height: 5, speed: 0.05 },
        focus: { target: 'bug_4' }
    },
    // 06. 蝴蝶 #5
    {
        id: 6, startTime: 7.43,
        camera: { type: 'ORBIT', target: 'bug_5', distance: 20, height: -2, speed: 0.08 },
        focus: { target: 'bug_5' }
    },
    // 07. 蝴蝶 #6
    {
        id: 7, startTime: 9.17,
        camera: { type: 'ORBIT', target: 'bug_6', distance: 32, height: 10, speed: -0.05 },
        focus: { target: 'bug_6' }
    },
    // 08. 蝴蝶 #7
    {
        id: 8, startTime: 10.51,
        camera: { type: 'ORBIT', target: 'bug_7', distance: 25, height: 2, speed: 0.04 },
        focus: { target: 'bug_7' }
    },
    // 09. 蝴蝶 #8
    {
        id: 9, startTime: 12.23,
        camera: { type: 'ORBIT', target: 'bug_8', distance: 40, height: 15, speed: -0.02 }, // 几乎静止的凝视
        focus: { target: 'bug_8' }
    },
    // 10. 蝴蝶 #9
    {
        id: 10, startTime: 13.10,
        camera: { type: 'ORBIT', target: 'bug_9', distance: 22, height: 0, speed: 0.06 },
        focus: { target: 'bug_9' }
    },
    // 11. 蝴蝶 #10
    {
        id: 11, startTime: 17.35,
        camera: { type: 'ORBIT', target: 'bug_10', distance: 30, height: 5, speed: -0.04 },
        focus: { target: 'bug_10' }
    },
    // 12. 蝴蝶 #11
    {
        id: 12, startTime: 20.46,
        camera: { type: 'ORBIT', target: 'bug_11', distance: 25, height: -8, speed: 0.05 },
        focus: { target: 'bug_11' }
    },
    // 13. 蝴蝶 #12
    {
        id: 13, startTime: 25.28,
        camera: { type: 'ORBIT', target: 'bug_12', distance: 35, height: 10, speed: -0.03 },
        focus: { target: 'bug_12' }
    },
    // 14. 蝴蝶 #13
    {
        id: 14, startTime: 29.58,
        camera: { type: 'ORBIT', target: 'bug_13', distance: 18, height: 0, speed: 0.07 },
        focus: { target: 'bug_13' }
    },
    // 15. 蝴蝶 #14
    {
        id: 15, startTime: 33.07,
        camera: { type: 'ORBIT', target: 'bug_14', distance: 30, height: 5, speed: -0.05 },
        focus: { target: 'bug_14' }
    },
    // 16. 蝴蝶 #15
    {
        id: 16, startTime: 37.43,
        camera: { type: 'ORBIT', target: 'bug_15', distance: 22, height: -2, speed: 0.04 },
        focus: { target: 'bug_15' }
    },
    // 17. 蝴蝶 #16 (虽然剪辑快，但镜头本身运动依然保持缓慢，形成反差)
    {
        id: 17, startTime: 38.12,
        camera: { type: 'ORBIT', target: 'bug_16', distance: 25, height: 0, speed: -0.06 }, 
        focus: { target: 'bug_16' }
    },
    // 18. 蝴蝶 #17
    {
        id: 18, startTime: 38.36,
        camera: { type: 'ORBIT', target: 'bug_17', distance: 25, height: 5, speed: 0.06 },
        focus: { target: 'bug_17' }
    },
    // 19. 蝴蝶 #18
    {
        id: 19, startTime: 39.02,
        camera: { type: 'ORBIT', target: 'bug_18', distance: 25, height: -5, speed: -0.06 },
        focus: { target: 'bug_18' }
    },
    // 20. 蝴蝶 #19 (DROP部分，稍微快一点点，但依然克制)
    {
        id: 20, startTime: 40.44,
        camera: { type: 'ORBIT', target: 'bug_19', distance: 20, height: 0, speed: 0.2 }, // 0.2 算相对快了
        focus: { target: 'bug_19' }
    },
    // 21. 蝴蝶 #20
    {
        id: 21, startTime: 41.30,
        camera: { type: 'ORBIT', target: 'bug_20', distance: 35, height: 10, speed: -0.1 },
        focus: { target: 'bug_20' }
    },
    // 22. 蝴蝶 #21
    {
        id: 22, startTime: 42.14,
        camera: { type: 'ORBIT', target: 'bug_21', distance: 25, height: 5, speed: 0.1 },
        focus: { target: 'bug_21' }
    },
    // 23. 蝴蝶 #22
    {
        id: 23, startTime: 43.52,
        camera: { type: 'ORBIT', target: 'bug_22', distance: 18, height: 2, speed: 0.1 },
        focus: { target: 'bug_22' }
    },
    // 24. 蝴蝶 #23 (Chorus, 回归优雅)
    {
        id: 24, startTime: 49.55,
        camera: { type: 'ORBIT', target: 'bug_23', distance: 45, height: 20, speed: 0.03 },
        focus: { target: 'bug_23' }
    },
    // 25. 蝴蝶 #24
    {
        id: 25, startTime: 50.21,
        camera: { type: 'ORBIT', target: 'bug_24', distance: 30, height: -5, speed: -0.04 },
        focus: { target: 'bug_24' }
    },
    // 26. 蝴蝶 #25
    {
        id: 26, startTime: 50.47,
        camera: { type: 'ORBIT', target: 'bug_25', distance: 25, height: 5, speed: 0.05 },
        focus: { target: 'bug_25' }
    },
    // 27. 蝴蝶 #26
    {
        id: 27, startTime: 51.11,
        camera: { type: 'ORBIT', target: 'bug_26', distance: 35, height: 0, speed: -0.03 },
        focus: { target: 'bug_26' }
    },
    // 28. 蝴蝶 #27
    {
        id: 28, startTime: 53.01,
        camera: { type: 'ORBIT', target: 'bug_27', distance: 28, height: 8, speed: 0.04 },
        focus: { target: 'bug_27' }
    },
    // 29. 蝴蝶 #28
    {
        id: 29, startTime: 53.57,
        camera: { type: 'ORBIT', target: 'bug_28', distance: 22, height: -2, speed: -0.05 },
        focus: { target: 'bug_28' }
    },
    // 30. 蝴蝶 #29
    {
        id: 30, startTime: 58.31,
        camera: { type: 'ORBIT', target: 'bug_29', distance: 40, height: 10, speed: 0.02 },
        focus: { target: 'bug_29' }
    },
    // 31. 蝴蝶 #30 (Bridge 长镜头)
    {
        id: 31, startTime: 64.34,
        camera: { type: 'ORBIT', target: 'bug_30', distance: 45, height: 5, speed: -0.01 }, // 极极慢
        focus: { target: 'bug_30' }
    },
    // 32. 蝴蝶 #31
    {
        id: 32, startTime: 70.42,
        camera: { type: 'ORBIT', target: 'bug_31', distance: 30, height: 0, speed: 0.03 },
        focus: { target: 'bug_31' }
    },
    // 33. 蝴蝶 #32
    {
        id: 33, startTime: 76.01,
        camera: { type: 'ORBIT', target: 'bug_32', distance: 35, height: 15, speed: -0.02 },
        focus: { target: 'bug_32' }
    },
    // 34. 蝴蝶 #33
    {
        id: 34, startTime: 90.06,
        camera: { type: 'ORBIT', target: 'bug_33', distance: 25, height: -5, speed: 0.04 },
        focus: { target: 'bug_33' }
    },
    // 35. 蝴蝶 #34
    {
        id: 35, startTime: 102.23,
        camera: { type: 'ORBIT', target: 'bug_34', distance: 32, height: 5, speed: -0.03 },
        focus: { target: 'bug_34' }
    },
    // 36. 蝴蝶 #35
    {
        id: 36, startTime: 106.51,
        camera: { type: 'ORBIT', target: 'bug_35', distance: 26, height: 0, speed: 0.05 },
        focus: { target: 'bug_35' }
    },
    // 37. 蝴蝶 #36
    {
        id: 37, startTime: 109.58,
        camera: { type: 'ORBIT', target: 'bug_36', distance: 20, height: 8, speed: -0.06 },
        focus: { target: 'bug_36' }
    },
    // 38. 蝴蝶 #37
    {
        id: 38, startTime: 114.40,
        camera: { type: 'ORBIT', target: 'bug_37', distance: 35, height: -2, speed: 0.03 },
        focus: { target: 'bug_37' }
    },
    // 39. 蝴蝶 #38
    {
        id: 39, startTime: 119.05,
        camera: { type: 'ORBIT', target: 'bug_38', distance: 30, height: 10, speed: -0.04 },
        focus: { target: 'bug_38' }
    },
    // 40. 蝴蝶 #39
    {
        id: 40, startTime: 122.13,
        camera: { type: 'ORBIT', target: 'bug_39', distance: 25, height: 5, speed: 0.05 },
        focus: { target: 'bug_39' }
    },
    // 41. 蝴蝶 #40
    {
        id: 41, startTime: 126.53,
        camera: { type: 'ORBIT', target: 'bug_40', distance: 22, height: 0, speed: -0.05 },
        focus: { target: 'bug_40' }
    },
    // 42. 蝴蝶 #41 (Climax, 稍微快一点点)
    { id: 42, startTime: 127.17, camera: { type: 'ORBIT', target: 'bug_41', distance: 25, height: 5, speed: 0.1 }, focus: { target: 'bug_41' } },
    { id: 43, startTime: 127.38, camera: { type: 'ORBIT', target: 'bug_42', distance: 25, height: -5, speed: -0.1 }, focus: { target: 'bug_42' } },
    { id: 44, startTime: 128.00, camera: { type: 'ORBIT', target: 'bug_43', distance: 25, height: 0, speed: 0.1 }, focus: { target: 'bug_43' } },
    
    // 45. 蝴蝶 #44
    {
        id: 45, startTime: 129.57,
        camera: { type: 'ORBIT', target: 'bug_44', distance: 18, height: 2, speed: 0.2 },
        focus: { target: 'bug_44' }
    },
    // 46. 蝴蝶 #45
    {
        id: 46, startTime: 132.55,
        camera: { type: 'ORBIT', target: 'bug_45', distance: 30, height: 5, speed: 0.08 },
        focus: { target: 'bug_45' }
    },
    // 47. 蝴蝶 #46
    {
        id: 47, startTime: 139.14,
        camera: { type: 'ORBIT', target: 'bug_46', distance: 25, height: -5, speed: -0.07 },
        focus: { target: 'bug_46' }
    },
    // 48. 蝴蝶 #47
    {
        id: 48, startTime: 139.35,
        camera: { type: 'ORBIT', target: 'bug_47', distance: 22, height: 8, speed: 0.09 },
        focus: { target: 'bug_47' }
    },
    // 49. 蝴蝶 #48
    {
        id: 49, startTime: 139.56,
        camera: { type: 'ORBIT', target: 'bug_48', distance: 28, height: 0, speed: -0.06 },
        focus: { target: 'bug_48' }
    },
    // 50. 蝴蝶 #49
    {
        id: 50, startTime: 140.20,
        camera: { type: 'ORBIT', target: 'bug_49', distance: 35, height: 10, speed: 0.05 },
        focus: { target: 'bug_49' }
    },
    
    // --- 循环或全景 (复用前面的ID) ---
    
    // 51. 回到 #0
    {
        id: 51, startTime: 142.16,
        camera: { type: 'ORBIT', target: 'bug_0', distance: 30, height: 5, speed: -0.04 },
        focus: { target: 'bug_0' }
    },
    // 52. 回到 #1
    {
        id: 52, startTime: 142.59,
        camera: { type: 'ORBIT', target: 'bug_1', distance: 25, height: -2, speed: 0.06 },
        focus: { target: 'bug_1' }
    },
    // 53.
    {
        id: 53, startTime: 147.44,
        camera: { type: 'ORBIT', target: 'bug_2', distance: 40, height: 15, speed: 0.02 },
        focus: { target: 'bug_2' }
    },
    // 54. 
    {
        id: 54, startTime: 153.55,
        camera: { type: 'ORBIT', target: 'bug_3', distance: 20, height: 0, speed: -0.05 },
        focus: { target: 'bug_3' }
    },
    // 55. 
    {
        id: 55, startTime: 159.58,
        camera: { type: 'ORBIT', target: 'bug_4', distance: 35, height: 10, speed: 0.04 },
        focus: { target: 'bug_4' }
    },
    
    // --- OUTRO (拉远，看高空) ---
    {
        id: 56, startTime: 166.08,
        camera: { type: 'FIXED', pos: [0, 300, 300], lookAt: [0, 250, 0] }, // 看向高空中心
        focus: { value: 300, aperture: 0.001 }
    },
    {
        id: 57, startTime: 169.12,
        camera: { type: 'FIXED', pos: [0, 320, 320], lookAt: [0, 250, 0] }
    },
    {
        id: 58, startTime: 172.21,
        camera: { type: 'FIXED', pos: [0, 340, 340], lookAt: [0, 250, 0] }
    },
    {
        id: 59, startTime: 173.09,
        camera: { type: 'FIXED', pos: [0, 360, 360], lookAt: [0, 250, 0] }
    },
    // 最终高空俯视
    {
        id: 60, startTime: 177.39,
        camera: { type: 'FIXED', pos: [0, 600, 0], lookAt: [0, 250, 0], fov: 90 }, // 极高空
        focus: { value: 350, aperture: 0.001 }
    },
    // 后面保持...
    { id: 61, startTime: 218.48, camera: { type: 'FIXED', pos: [0, 800, 0], lookAt: [0, 250, 0] } }
];