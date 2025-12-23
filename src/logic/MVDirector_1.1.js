import * as THREE from 'three';
import { MV_TIMELINE } from '../utils/constants';
import { SCREENPLAY } from '../data/screenplay';
import { ACTOR_TIMELINE } from '../data/timeline_actors';

export class MVDirector {
    constructor(context) {
        this.ctx = context;
        
        this.currentShot = null;
        this.heroBugIndex = 0;
        
        // 辅助对象，避免垃圾回收
        this.tempColor = new THREE.Color();
        this.tempPos = new THREE.Vector3();
        this.tempEuler = new THREE.Euler();
        
        this.defaultFov = this.ctx.camera.fov;
    }

    update(t, audioTime) {
        // --- 1. 镜头逻辑 ---
        const shot = this.findCurrentShot(audioTime);
        if (shot && this.currentShot !== shot) {
            this.currentShot = shot;
            this.onShotStart(shot);
        }
        if (shot) {
            this.executeShot(t, audioTime, shot);
        } else {
            this.animateIdle(t);
        }
        
        // --- 2. 演员/对象逻辑 (核心修改处) ---
        this.animateActors(audioTime);
    }

    // ==========================================
    // Part 1: 镜头系统 (保持不变)
    // ==========================================

    findCurrentShot(time) {
        for (let i = SCREENPLAY.length - 1; i >= 0; i--) {
            if (time >= SCREENPLAY[i].startTime) return SCREENPLAY[i];
        }
        return SCREENPLAY[0];
    }

    onShotStart(shot) {
        console.log(`🎬 Shot ${shot.id} started`);
        if (shot.camera && shot.camera.fov) {
            this.ctx.camera.fov = shot.camera.fov;
            this.ctx.camera.updateProjectionMatrix();
        } else {
            this.ctx.camera.fov = this.defaultFov;
            this.ctx.camera.updateProjectionMatrix();
        }
        if (shot.camera && shot.camera.target === 'HERO_BUG' && this.ctx.butterflies.length > 0) {
            // 如果你希望主角固定是第0号，可以这里写死 = 0
            // this.heroBugIndex = 0; 
            this.heroBugIndex = Math.floor(Math.random() * this.ctx.butterflies.length);
        }
    }

    executeShot(t, audioTime, shot) {
        if (!shot.camera) return;
        const localTime = audioTime - shot.startTime;

        if (shot.camera.type === 'FIXED') {
            if (shot.camera.pos) {
                const targetPos = this.tempPos.set(...shot.camera.pos);
                this.ctx.camera.position.lerp(targetPos, 0.05);
            }
            if (shot.camera.lookAt) {
                this.ctx.camera.lookAt(...shot.camera.lookAt);
            }
        } else if (shot.camera.type === 'ORBIT') {
            const bug = this.ctx.butterflies[this.heroBugIndex];
            if (bug) {
                const dist = shot.camera.distance || 20;
                const speed = shot.camera.speed || 0.5;
                const height = shot.camera.height || 5;
                const angle = localTime * speed;
                const camX = bug.group.position.x + Math.cos(angle) * dist;
                const camZ = bug.group.position.z + Math.sin(angle) * dist;
                this.ctx.camera.position.lerp(this.tempPos.set(camX, bug.group.position.y + height, camZ), 0.1);
                this.ctx.camera.lookAt(bug.group.position);
            }
        }


        //////////


        if (this.ctx.bokehPass) {
            const uniforms = this.ctx.bokehPass.uniforms;
            
            // 1. 光圈极小：消除模糊背景
            uniforms['aperture'].value = 0.00001; 
            
            // 2. 焦距：即使光圈很小，设置一个合理的焦距也能保证锐度
            // 这里我们动态计算相机到原点(舞台中心)的距离作为焦距
            const distToCenter = this.ctx.camera.position.distanceTo(new THREE.Vector3(0, -100, 0));
            uniforms['focus'].value = distToCenter;
        }





        //////////




    }

    animateIdle(t) {
        const r = 140;
        this.ctx.camera.position.x = Math.sin(t * 0.1) * r;
        this.ctx.camera.position.z = Math.cos(t * 0.1) * r;
        this.ctx.camera.position.y = 60;
        this.ctx.camera.lookAt(0, 0, 0);
    }

    // ==========================================
    // Part 2: 演员/对象系统 (包含群体和个体控制)
    // ==========================================

    animateActors(currentTime) {
        // 1. 优先执行：Swarm 群体逻辑 (作为基础层)
        if (ACTOR_TIMELINE.swarm) {
            const frameData = this.findKeyframes(ACTOR_TIMELINE.swarm, currentTime);
            if (frameData) {
                this.applySwarmChoreography(frameData, currentTime);
            }
        }

        // 2. 后续执行：遍历其他对象 (灯光、模型、以及特定蝴蝶的覆盖)
        for (const [actorName, keyframes] of Object.entries(ACTOR_TIMELINE)) {
            if (actorName === 'swarm') continue; // 已处理

            // 检查是否是蝴蝶指令 (bug_0, bugs_0_10)
            if (actorName.startsWith('bug')) {
                this.handleButterflyOverride(actorName, keyframes, currentTime);
                continue;
            }

            // 常规对象 (keyLight, stage...)
            let targetObj = this.resolveObject(actorName);
            if (!targetObj) continue;

            const frameData = this.findKeyframes(keyframes, currentTime);
            if (!frameData) continue;
            this.applyProperties(targetObj, frameData.prev, frameData.next, frameData.alpha);
        }
    }

    // --- 群体编舞逻辑 ---
    applySwarmChoreography({ prev, next, alpha }, time) {
        const bugs = this.ctx.butterflies;
        if (!bugs || bugs.length === 0) return;

        const currentSpread = THREE.MathUtils.lerp(prev.spread || 1, next.spread || 1, alpha);
        const currentFlap = THREE.MathUtils.lerp(prev.flapSpeed ?? 1, next.flapSpeed ?? 1, alpha);
        const currentOpacity = THREE.MathUtils.lerp(prev.opacity ?? 1, next.opacity ?? 1, alpha);
        const currentScale = THREE.MathUtils.lerp(prev.scale ?? 0.8, next.scale ?? 0.8, alpha);
        
        const cx = THREE.MathUtils.lerp(prev.center?.[0]||0, next.center?.[0]||0, alpha);
        const cy = THREE.MathUtils.lerp(prev.center?.[1]||0, next.center?.[1]||0, alpha);
        const cz = THREE.MathUtils.lerp(prev.center?.[2]||0, next.center?.[2]||0, alpha);
        const center = new THREE.Vector3(cx, cy, cz);
        const noiseStrength = THREE.MathUtils.lerp(prev.noise || 0, next.noise || 0, alpha);

        bugs.forEach((b, i) => {
            // A. 计算基准队形位置
            const targetPos = this.calculateFormationPos(i, bugs.length, prev.formation, currentSpread);
            targetPos.add(center);

            // B. 加上噪声
            const nx = Math.sin(time * 2 + i) * noiseStrength;
            const ny = Math.cos(time * 1.5 + i * 0.5) * noiseStrength;
            const nz = Math.sin(time * 1.2 + i * 0.2) * noiseStrength;
            targetPos.add(new THREE.Vector3(nx, ny, nz));

            // C. 应用基础状态
            b.group.position.lerp(targetPos, 0.05);
            b.group.scale.setScalar(currentScale);
            
            // 简单朝向处理 (面向中心或摄像机)
            // b.group.lookAt(this.ctx.camera.position); 

            // D. 动作与材质
            const flap = Math.sin(time * 15 * currentFlap + i) * 0.8;
            b.leftWing.rotation.y = flap;
            b.rightWing.rotation.y = -flap;

            b.leftWing.material.opacity = currentOpacity;
            // 恢复默认颜色 (如果是白色)
            b.leftWing.material.color.setHex(0xffffff); 
        });
    }

    // --- 个体/小队覆盖逻辑 ---
    handleButterflyOverride(actorName, keyframes, currentTime) {
        const frameData = this.findKeyframes(keyframes, currentTime);
        if (!frameData) return;

        // 解析 ID: 'bug_5' -> [5], 'bugs_0_10' -> [0,1,2...10]
        let targetIndices = [];
        if (actorName.startsWith('bugs_')) {
            const parts = actorName.split('_'); // ['bugs', '0', '10']
            const start = parseInt(parts[1]);
            const end = parseInt(parts[2]);
            for (let i = start; i <= end; i++) targetIndices.push(i);
        } else {
            const id = parseInt(actorName.split('_')[1]); // 'bug_5' -> 5
            targetIndices.push(id);
        }

        // 对这些特定的蝴蝶应用特殊的属性
        targetIndices.forEach(idx => {
            const bug = this.ctx.butterflies[idx];
            if (bug) {
                this.applyBugProperties(bug, frameData.prev, frameData.next, frameData.alpha, currentTime);
            }
        });
    }

    // 专门用于蝴蝶个体的属性应用
    applyBugProperties(bug, prev, next, alpha, time) {
        // 1. 绝对位置控制 (pos) - 会强制覆盖 swarm 位置
        if (prev.pos && next.pos) {
            const x = THREE.MathUtils.lerp(prev.pos[0], next.pos[0], alpha);
            const y = THREE.MathUtils.lerp(prev.pos[1], next.pos[1], alpha);
            const z = THREE.MathUtils.lerp(prev.pos[2], next.pos[2], alpha);
            bug.group.position.set(x, y, z);
        }

        // 2. 相对偏移控制 (offset) - 在 swarm 位置基础上叠加
        if (prev.offset && next.offset) {
            const ox = THREE.MathUtils.lerp(prev.offset[0], next.offset[0], alpha);
            const oy = THREE.MathUtils.lerp(prev.offset[1], next.offset[1], alpha);
            const oz = THREE.MathUtils.lerp(prev.offset[2], next.offset[2], alpha);
            bug.group.position.add(new THREE.Vector3(ox, oy, oz));
        }

        // 3. 缩放
        if (prev.scale !== undefined && next.scale !== undefined) {
            const s = THREE.MathUtils.lerp(prev.scale, next.scale, alpha);
            bug.group.scale.setScalar(s);
        }

        // 4. 扇动速度
        if (prev.flapSpeed !== undefined && next.flapSpeed !== undefined) {
            const speed = THREE.MathUtils.lerp(prev.flapSpeed, next.flapSpeed, alpha);
            const flap = Math.sin(time * 15 * speed) * 0.8;
            bug.leftWing.rotation.y = flap;
            bug.rightWing.rotation.y = -flap;
        }

        // 5. 颜色 (color)
        if (prev.color && next.color) {
            bug.leftWing.material.color.set(prev.color).lerp(this.tempColor.set(next.color), alpha);
        }
        
        // 6. 旋转 (rot)
        if (prev.rot && next.rot) {
             const x = THREE.MathUtils.lerp(prev.rot[0], next.rot[0], alpha);
             const y = THREE.MathUtils.lerp(prev.rot[1], next.rot[1], alpha);
             const z = THREE.MathUtils.lerp(prev.rot[2], next.rot[2], alpha);
             bug.group.rotation.set(x, y, z);
        }
    }

    calculateFormationPos(index, total, type, spread) {
        const pos = new THREE.Vector3();
        if (type === 'GRID') {
            const cols = Math.ceil(Math.sqrt(total));
            const row = Math.floor(index / cols);
            const col = index % cols;
            const spacing = 15 * spread;
            pos.set((col - cols/2) * spacing, (row - cols/2) * spacing, 0);
        } else if (type === 'SPHERE') {
            const phi = Math.acos(-1 + (2 * index) / total);
            const theta = Math.sqrt(total * Math.PI) * phi;
            const r = 40 * spread;
            pos.set(r * Math.cos(theta) * Math.sin(phi), r * Math.sin(theta) * Math.sin(phi), r * Math.cos(phi));
        } else if (type === 'VORTEX') {
            const angle = index * 0.5; 
            const radius = 10 + index * 0.5 * spread;
            const height = index * 2 * spread - (total); 
            pos.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        }
        return pos;
    }

    // --- 通用对象处理 (保持不变) ---
    resolveObject(name) {
        if (this.ctx[name]) return this.ctx[name];
        if (this.ctx.scenery && this.ctx.scenery[name]) return this.ctx.scenery[name];
        return null;
    }

    findKeyframes(keyframes, time) {
        const nextIdx = keyframes.findIndex(k => k.time > time);
        if (nextIdx === -1) {
            const last = keyframes[keyframes.length - 1];
            return { prev: last, next: last, alpha: 1 };
        }
        if (nextIdx === 0) {
            const first = keyframes[0];
            return { prev: first, next: first, alpha: 0 };
        }
        const prev = keyframes[nextIdx - 1];
        const next = keyframes[nextIdx];
        const duration = next.time - prev.time;
        const elapsed = time - prev.time;
        const alpha = duration > 0 ? elapsed / duration : 1;
        return { prev, next, alpha };
    }

    applyProperties(obj, prev, next, alpha) {
        if (prev.pos && next.pos) {
            const x = THREE.MathUtils.lerp(prev.pos[0], next.pos[0], alpha);
            const y = THREE.MathUtils.lerp(prev.pos[1], next.pos[1], alpha);
            const z = THREE.MathUtils.lerp(prev.pos[2], next.pos[2], alpha);
            obj.position.set(x, y, z);
        }
        if (prev.rot && next.rot) {
            const x = THREE.MathUtils.lerp(prev.rot[0], next.rot[0], alpha);
            const y = THREE.MathUtils.lerp(prev.rot[1], next.rot[1], alpha);
            const z = THREE.MathUtils.lerp(prev.rot[2], next.rot[2], alpha);
            obj.rotation.set(x, y, z);
        }
        if (prev.scale && next.scale) {
            const x = THREE.MathUtils.lerp(prev.scale[0], next.scale[0], alpha);
            const y = THREE.MathUtils.lerp(prev.scale[1], next.scale[1], alpha);
            const z = THREE.MathUtils.lerp(prev.scale[2], next.scale[2], alpha);
            obj.scale.set(x, y, z);
        }
        if (prev.intensity !== undefined && next.intensity !== undefined) {
            obj.intensity = THREE.MathUtils.lerp(prev.intensity, next.intensity, alpha);
        }
        if (prev.opacity !== undefined && next.opacity !== undefined) {
            if (obj.material) {
                obj.material.opacity = THREE.MathUtils.lerp(prev.opacity, next.opacity, alpha);
                if (obj.material.opacity < 1.0) obj.material.transparent = true;
            }
        }
        if (prev.color && next.color) {
            if (obj.isLight) {
                obj.color.set(prev.color).lerp(this.tempColor.set(next.color), alpha);
            } else if (obj.material && obj.material.color) {
                obj.material.color.set(prev.color).lerp(this.tempColor.set(next.color), alpha);
            }
        }
    }
}