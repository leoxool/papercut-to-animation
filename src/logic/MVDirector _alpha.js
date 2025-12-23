import * as THREE from 'three';
import { MV_TIMELINE } from '../utils/constants';
import { SCREENPLAY } from '../data/screenplay';
import { ACTOR_TIMELINE } from '../data/timeline_actors';

export class MVDirector {
    constructor(context) {
        this.ctx = context;
        
        this.currentShot = null;
        this.heroBugIndex = 0;
        
        // 辅助对象，避免垃圾回收 (GC Friendly)
        this.tempColor = new THREE.Color();
        this.tempPos = new THREE.Vector3();
        this.tempEuler = new THREE.Euler();
        
        // 记录初始状态
        this.defaultFov = this.ctx.camera.fov;
    }

    // 主循环：每帧调用
    update(t, audioTime) {
        // --- A. 镜头/剧本逻辑 (Screenplay) ---
        
        // 1. 查找当前剧本镜头
        const shot = this.findCurrentShot(audioTime);
        
        // 2. 初始化新镜头 (只在切换瞬间执行一次)
        if (shot && this.currentShot !== shot) {
            this.currentShot = shot;
            this.onShotStart(shot);
        }

        // 3. 执行该镜头的运镜指令
        if (shot) {
            this.executeShot(t, audioTime, shot);
        } else {
            this.animateIdle(t); // 如果找不到镜头（比如音乐还没开始），执行闲置动画
        }
        
        // --- B. 演员/对象逻辑 (Actor Timeline) ---
        // ★★★ 执行对象时间轴动画 (控制灯光、模型等) ★★★
        this.animateActors(audioTime);
    }

    // ==========================================
    // Part 1: 镜头与剧本逻辑 (Camera & Screenplay)
    // ==========================================

    findCurrentShot(time) {
        // 倒序查找：找到 startTime 小于当前时间且最晚的那个镜头
        for (let i = SCREENPLAY.length - 1; i >= 0; i--) {
            if (time >= SCREENPLAY[i].startTime) return SCREENPLAY[i];
        }
        return SCREENPLAY[0]; // 默认返回第一个
    }

    onShotStart(shot) {
        console.log(`🎬 Shot ${shot.id} started at ${shot.startTime}s`);
        
        // 瞬间设置：FOV
        if (shot.camera && shot.camera.fov) {
            this.ctx.camera.fov = shot.camera.fov;
            this.ctx.camera.updateProjectionMatrix();
        } else {
            // 如果镜头没定义 FOV，重置为默认，防止上个镜头的变焦残留
            this.ctx.camera.fov = this.defaultFov;
            this.ctx.camera.updateProjectionMatrix();
        }
        
        // 瞬间设置：随机选角 (如果是跟随主角模式)
        if (shot.camera && shot.camera.target === 'HERO_BUG' && this.ctx.butterflies.length > 0) {
            this.heroBugIndex = Math.floor(Math.random() * this.ctx.butterflies.length);
        }
    }

    executeShot(t, audioTime, shot) {
        if (!shot.camera) return;

        const localTime = audioTime - shot.startTime;

        // --- 运镜逻辑 ---
        if (shot.camera.type === 'FIXED') {
            // 固定机位：平滑移动到设定坐标
            if (shot.camera.pos) {
                const targetPos = this.tempPos.set(...shot.camera.pos);
                this.ctx.camera.position.lerp(targetPos, 0.05);
            }
            if (shot.camera.lookAt) {
                this.ctx.camera.lookAt(...shot.camera.lookAt);
            }
            
        } else if (shot.camera.type === 'ORBIT') {
            // 环绕逻辑
            const bug = this.ctx.butterflies[this.heroBugIndex];
            if (bug) {
                const dist = shot.camera.distance || 20;
                const speed = shot.camera.speed || 0.5;
                const height = shot.camera.height || 5;
                
                const angle = localTime * speed;
                const camX = bug.group.position.x + Math.cos(angle) * dist;
                const camZ = bug.group.position.z + Math.sin(angle) * dist;
                
                // 平滑跟随
                this.ctx.camera.position.lerp(this.tempPos.set(camX, bug.group.position.y + height, camZ), 0.1);
                this.ctx.camera.lookAt(bug.group.position);
            }
        }
        
        // 可以在这里扩展更多运镜模式，如 'FLYBY', 'PATH' 等
    }

    animateIdle(t) {
        const r = 140;
        this.ctx.camera.position.x = Math.sin(t * 0.1) * r;
        this.ctx.camera.position.z = Math.cos(t * 0.1) * r;
        this.ctx.camera.position.y = 60;
        this.ctx.camera.lookAt(0, 0, 0);
    }

    // ==========================================
    // Part 2: 对象时间轴引擎 (Actor Timeline)
    // ==========================================

    animateActors(currentTime) {
        // 遍历时间表里的每一个对象名 (keyLight, tree, stage...)
        for (const [actorName, keyframes] of Object.entries(ACTOR_TIMELINE)) {
            
            // 1. 找到该名字对应的真实 3D 对象
            let targetObj = this.resolveObject(actorName);
            if (!targetObj) continue;

            // 2. 找到当前时间处于哪两个关键帧之间
            const frameData = this.findKeyframes(keyframes, currentTime);
            if (!frameData) continue; 

            const { prev, next, alpha } = frameData;

            // 3. 执行属性插值 (Lerp)
            this.applyProperties(targetObj, prev, next, alpha);
        }
    }

    resolveObject(name) {
        // 先在顶层找 (如 keyLight, wall, camera)
        if (this.ctx[name]) return this.ctx[name];
        // 再去 scenery 里找 (如 tree, stage)
        if (this.ctx.scenery && this.ctx.scenery[name]) return this.ctx.scenery[name];
        return null;
    }

    findKeyframes(keyframes, time) {
        // 找到第一个大于当前时间的帧作为 next
        const nextIdx = keyframes.findIndex(k => k.time > time);
        
        // 如果时间还没到第一帧，或者已经过了最后一帧
        if (nextIdx === -1) {
            // 保持最后一帧的状态
            const last = keyframes[keyframes.length - 1];
            return { prev: last, next: last, alpha: 1 };
        }
        if (nextIdx === 0) {
            // 保持第一帧的状态
            const first = keyframes[0];
            return { prev: first, next: first, alpha: 0 };
        }

        const prev = keyframes[nextIdx - 1];
        const next = keyframes[nextIdx];
        
        // 计算进度 (0.0 ~ 1.0)
        const duration = next.time - prev.time;
        const elapsed = time - prev.time;
        const alpha = duration > 0 ? elapsed / duration : 1;

        return { prev, next, alpha };
    }

    applyProperties(obj, prev, next, alpha) {
        // 处理位置 (pos: [x, y, z])
        if (prev.pos && next.pos) {
            const x = THREE.MathUtils.lerp(prev.pos[0], next.pos[0], alpha);
            const y = THREE.MathUtils.lerp(prev.pos[1], next.pos[1], alpha);
            const z = THREE.MathUtils.lerp(prev.pos[2], next.pos[2], alpha);
            // 如果是 Light, obj.position 是 Vector3; 如果是 Mesh 也是 Vector3
            obj.position.set(x, y, z);
        }

        // 处理旋转 (rot: [x, y, z])
        if (prev.rot && next.rot) {
            const x = THREE.MathUtils.lerp(prev.rot[0], next.rot[0], alpha);
            const y = THREE.MathUtils.lerp(prev.rot[1], next.rot[1], alpha);
            const z = THREE.MathUtils.lerp(prev.rot[2], next.rot[2], alpha);
            obj.rotation.set(x, y, z);
        }

        // 处理缩放 (scale: [x, y, z])
        if (prev.scale && next.scale) {
            const x = THREE.MathUtils.lerp(prev.scale[0], next.scale[0], alpha);
            const y = THREE.MathUtils.lerp(prev.scale[1], next.scale[1], alpha);
            const z = THREE.MathUtils.lerp(prev.scale[2], next.scale[2], alpha);
            obj.scale.set(x, y, z);
        }

        // 处理灯光强度 (intensity)
        if (prev.intensity !== undefined && next.intensity !== undefined) {
            obj.intensity = THREE.MathUtils.lerp(prev.intensity, next.intensity, alpha);
        }
        
        // 处理材质透明度 (opacity)
        if (prev.opacity !== undefined && next.opacity !== undefined) {
            if (obj.material) {
                obj.material.opacity = THREE.MathUtils.lerp(prev.opacity, next.opacity, alpha);
                // 确保透明开启，否则 opacity 无效
                if (obj.material.opacity < 1.0) obj.material.transparent = true;
            }
        }

        // 处理颜色 (color: '#rrggbb')
        if (prev.color && next.color) {
            // 如果对象有 color 属性 (Light)
            if (obj.color && obj.color.isColor) {
                obj.color.set(prev.color).lerp(this.tempColor.set(next.color), alpha);
            }
            // 如果是 Mesh，通常在 material.color
            else if (obj.material && obj.material.color) {
                obj.material.color.set(prev.color).lerp(this.tempColor.set(next.color), alpha);
            }
        }
    }
}