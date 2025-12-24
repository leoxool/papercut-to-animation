import * as THREE from 'three';
import { SCREENPLAY } from '../data/screenplay';
import { ACTOR_TIMELINE } from '../data/timeline_actors';

export class MVDirector {
    constructor(context) {
        this.ctx = context;
        this.currentShot = null;
        this.heroBugIndex = 0;
        
        this.tempColor = new THREE.Color();
        this.tempPos = new THREE.Vector3();
        this.lookAtPos = new THREE.Vector3(); 
        
        this.isShotStartFrame = false;
        this.defaultFov = this.ctx.camera.fov;

        // ==========================================
        // ★ 新增：高亮度低饱和度 (Pastel) 色板 ★
        // ==========================================
        // 使用 HSL 定义确保风格统一 (Hue, Saturation 20%, Lightness 90%)
        this.bgPalette = [
                new THREE.Color("hsl(197, 91%, 93%)"),
                new THREE.Color("hsl(187, 91%, 93%)"),


        ];
        this.bgIndex = 0; // 当前颜色索引
    }

    update(t, audioTime) {
        const shot = this.findCurrentShot(audioTime);
        
        if (shot && this.currentShot !== shot) {
            this.currentShot = shot;
            this.onShotStart(shot); // ★ 触发新镜头事件
            this.isShotStartFrame = true; 
        } else {
            this.isShotStartFrame = false;
        }

        if (shot) {
            this.executeShot(t, audioTime, shot);
        } else {
            this.animateIdle(t);
        }
        
        this.animateActors(audioTime);

        // if (audioTime > 102.23) {
        //     this.animateDynamicLights(t, audioTime, shot);
        // }
    }

    findCurrentShot(time) {
        for (let i = SCREENPLAY.length - 1; i >= 0; i--) {
            if (time >= SCREENPLAY[i].startTime) return SCREENPLAY[i];
        }
        return SCREENPLAY[0];
    }

    // ==========================================
    // ★ 核心修改：镜头开始时的处理 ★
    // ==========================================
    onShotStart(shot) {
        console.log(`🎬 Shot ${shot.id} [${shot.camera.type}] ${shot.cut ? '(CUT)' : ''}`);
        
        // 1. 设置 FOV
        const targetFov = (shot.camera && shot.camera.fov) ? shot.camera.fov : this.defaultFov;
        this.ctx.camera.fov = targetFov;
        this.ctx.camera.updateProjectionMatrix();

        // 2. 随机选角
        if (shot.camera && shot.camera.target === 'HERO_BUG' && this.ctx.butterflies.length > 0) {
            this.heroBugIndex = Math.floor(Math.random() * this.ctx.butterflies.length);
        }
        
        // 3. 重置 LookAt
        const targetObj = this.getActorObject(shot.camera?.target);
        if (targetObj) {
            this.lookAtPos.copy(targetObj.position);
        }

        // 4. ★★★ 切换背景色 ★★★
        this.changeBackgroundForShot();
    }

    // ★ 新增辅助方法：切换背景色
    changeBackgroundForShot() {
        if (!this.ctx.scene) return;

        // 循环选取下一个颜色
        const color = this.bgPalette[this.bgIndex % this.bgPalette.length];
        
        // 应用到场景背景
        this.ctx.scene.background.copy(color);
        
        // 同步应用到雾效，确保视觉统一
        if (this.ctx.scene.fog) {
            this.ctx.scene.fog.color.copy(color);
        }

        this.bgIndex++; // 准备下一次切换
    }

    // ... (Rest of the file remains mostly the same, just ensure getActorObject includes sceneBackground check just in case)

    executeShot(t, audioTime, shot) {
        if (!shot.camera) return;
        const camConfig = shot.camera;
        const localTime = audioTime - shot.startTime;
        const targetActor = this.getActorObject(camConfig.target);
        const targetPos = targetActor ? targetActor.position : new THREE.Vector3(0, 0, 0);

        let destPos = new THREE.Vector3();
        let destLookAt = new THREE.Vector3();

        if (camConfig.type === 'FIXED') {
            if (camConfig.pos) destPos.set(...camConfig.pos);
            else destPos.copy(this.ctx.camera.position); 
            if (targetActor) destLookAt.copy(targetPos);
            else if (camConfig.lookAt) destLookAt.set(...camConfig.lookAt);
            else this.ctx.camera.getWorldDirection(destLookAt).add(this.ctx.camera.position);
        } 
        else if (camConfig.type === 'ORBIT') {
            const dist = camConfig.distance || 30;
            const speed = camConfig.speed || 0.5;
            const height = camConfig.height || 10;
            const angle = localTime * speed;
            const camX = targetPos.x + Math.cos(angle) * dist;
            const camZ = targetPos.z + Math.sin(angle) * dist;
            destPos.set(camX, targetPos.y + height, camZ);
            destLookAt.copy(targetPos);
        }
        else if (camConfig.type === 'FOLLOW') {
            if (targetActor) {
                const dist = camConfig.distance || 40;
                const height = camConfig.height || 10;
                let forward = new THREE.Vector3(0, 0, 1);
                const velocity = targetPos.clone().sub(this.lookAtPos).normalize();
                if (velocity.lengthSq() > 0.001) forward.copy(velocity);
                destPos = targetPos.clone().sub(forward.multiplyScalar(dist));
                destPos.y += height;
                destLookAt.copy(targetPos);
            }
        }

        if (camConfig.shake) this.applyShake(destPos, t, camConfig.shake);

        if (this.isShotStartFrame && shot.cut) {
            this.ctx.camera.position.copy(destPos);
            this.ctx.camera.lookAt(destLookAt);
            this.lookAtPos.copy(destLookAt);
        } else {
            const smooth = (camConfig.type === 'FOLLOW') ? (camConfig.stiffness || 0.05) : 0.1;
            this.ctx.camera.position.lerp(destPos, smooth);
            this.ctx.camera.lookAt(destLookAt);
            this.lookAtPos.copy(destLookAt);
        }
        this.updateFocus(shot);
    }

   getActorObject(name) {
        if (!name) return null;
        
        // 场景对象
        if (name === 'sceneBackground') return this.ctx.scene;
        
        // 主角蝴蝶
        if (name === 'HERO_BUG') return this.ctx.butterflies[this.heroBugIndex]?.group;
        
        // ★★★ 核心修改：按序号捕捉，支持循环回绕 ★★★
        if (name.startsWith('bug_')) {
            // 1. 获取请求的序号 (例如 30)
            const requestedIdx = parseInt(name.split('_')[1]);
            
            // 2. 获取当前实际蝴蝶总数
            const totalBugs = this.ctx.butterflies.length;
            
            // 安全检查：如果一只蝴蝶都没有，直接返回 null
            if (totalBugs === 0) return null;

            // 3. 取余数计算实际序号 (实现循环)
            // 例如：只有5只蝴蝶，请求 bug_6 -> 6 % 5 = 1 (取第2只)
            const actualIdx = requestedIdx % totalBugs;
            
            return this.ctx.butterflies[actualIdx]?.group;
        }

        // 其他场景物体 (stage, tree, lights...)
        if (this.ctx.scenery && this.ctx.scenery[name]) return this.ctx.scenery[name];
        if (this.ctx[name]) return this.ctx[name];
        
        return null;
    }

    applyShake(position, time, intensity) {
        const shakeX = Math.sin(time * 10) * intensity + Math.cos(time * 23) * intensity * 0.5;
        const shakeY = Math.cos(time * 12) * intensity + Math.sin(time * 20) * intensity * 0.5;
        const shakeZ = Math.sin(time * 15) * intensity;
        position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
    }

    updateFocus(shot) {
        if (!this.ctx.bokehPass) return;
        const u = this.ctx.bokehPass.uniforms;
        if (shot.focus) {
            const targetAperture = (shot.focus.aperture !== undefined) ? shot.focus.aperture : 0.001;
            u['aperture'].value = THREE.MathUtils.lerp(u['aperture'].value, targetAperture, 0.1);
            if (shot.focus.value !== undefined) {
                u['focus'].value = THREE.MathUtils.lerp(u['focus'].value, shot.focus.value, 0.1);
            } else if (shot.focus.target) {
                const targetObj = this.getActorObject(shot.focus.target);
                if (targetObj) {
                    const dist = this.ctx.camera.position.distanceTo(targetObj.position);
                    u['focus'].value = THREE.MathUtils.lerp(u['focus'].value, dist, 0.1);
                }
            }
        } else {
            u['aperture'].value = 0.00001; u['focus'].value = 200;
        }
    }

    animateIdle(t) {
        // const r = 140;
        // this.ctx.camera.position.x = Math.sin(t * 0.1) * r;
        // this.ctx.camera.position.z = Math.cos(t * 0.1) * r;
        // this.ctx.camera.position.y = 60;
        // this.ctx.camera.lookAt(0, 0, 0);
    }

    animateActors(currentTime) {
        if (ACTOR_TIMELINE.swarm) {
            const frameData = this.findKeyframes(ACTOR_TIMELINE.swarm, currentTime);
            if (frameData) this.applySwarmChoreography(frameData, currentTime);
        }
        for (const [actorName, keyframes] of Object.entries(ACTOR_TIMELINE)) {
            if (actorName === 'swarm') continue;
            // ★ 移除对 sceneBackground 的手动处理，避免冲突
            if (actorName === 'sceneBackground') continue; 

            if (actorName.startsWith('bug')) {
                this.handleButterflyOverride(actorName, keyframes, currentTime);
                continue;
            }
            let targetObj = this.getActorObject(actorName);
            if (!targetObj) continue;
            const frameData = this.findKeyframes(keyframes, currentTime);
            if (!frameData) continue;
            this.applyProperties(targetObj, frameData.prev, frameData.next, frameData.alpha);
        }
    }

    findKeyframes(keyframes, time) {
        const nextIdx = keyframes.findIndex(k => k.time > time);
        if (nextIdx === -1) { const last = keyframes[keyframes.length - 1]; return { prev: last, next: last, alpha: 1 }; }
        if (nextIdx === 0) { const first = keyframes[0]; return { prev: first, next: first, alpha: 0 }; }
        const prev = keyframes[nextIdx - 1]; const next = keyframes[nextIdx];
        const duration = next.time - prev.time; const elapsed = time - prev.time;
        const alpha = duration > 0 ? elapsed / duration : 1; return { prev, next, alpha };
    }

    applyProperties(obj, prev, next, alpha) {
        let t = alpha;
        if (next.ease === 'STEP') t = 0;

        // 1. 基础变换 (Position, Rotation, Scale)
        if (prev.pos && next.pos) { 
            const x = THREE.MathUtils.lerp(prev.pos[0], next.pos[0], t); 
            const y = THREE.MathUtils.lerp(prev.pos[1], next.pos[1], t); 
            const z = THREE.MathUtils.lerp(prev.pos[2], next.pos[2], t); 
            obj.position.set(x, y, z); 
        }
        if (prev.rot && next.rot) { 
            const x = THREE.MathUtils.lerp(prev.rot[0], next.rot[0], t); 
            const y = THREE.MathUtils.lerp(prev.rot[1], next.rot[1], t); 
            const z = THREE.MathUtils.lerp(prev.rot[2], next.rot[2], t); 
            obj.rotation.set(x, y, z); 
        }
        if (prev.scale && next.scale) { 
            const x = THREE.MathUtils.lerp(prev.scale[0], next.scale[0], t); 
            const y = THREE.MathUtils.lerp(prev.scale[1], next.scale[1], t); 
            const z = THREE.MathUtils.lerp(prev.scale[2], next.scale[2], t); 
            obj.scale.set(x, y, z); 
        }

        // 2. 通用材质属性 (Opacity, Intensity, Color)
        if (prev.intensity !== undefined && next.intensity !== undefined) { 
            obj.intensity = THREE.MathUtils.lerp(prev.intensity, next.intensity, t); 
        }
        if (prev.opacity !== undefined && next.opacity !== undefined) { 
            if (obj.material && obj.material.opacity !== undefined) {
                // 标准材质透明度
                obj.material.opacity = THREE.MathUtils.lerp(prev.opacity, next.opacity, t);
                if (obj.material.opacity < 1.0) obj.material.transparent = true;
            }
        }
        if (prev.color && next.color) { 
            if (obj.isLight) obj.color.set(prev.color).lerp(this.tempColor.set(next.color), t); 
            else if (obj.material && obj.material.color) obj.material.color.set(prev.color).lerp(this.tempColor.set(next.color), t); 
        }

        // 3. ★★★ 万花筒 Shader 专用控制 (完整且安全版) ★★★
        // 必须确保材质和uniforms都存在，且对应变量也存在，才执行插值
        if (obj.material && obj.material.uniforms) {
            
            // (1) 密度 (Tiling)
            // Timeline 属性名: tiling -> Shader 变量: uTiling
            if (obj.material.uniforms.uTiling) {
                const pVal = prev.tiling !== undefined ? prev.tiling : obj.material.uniforms.uTiling.value;
                const nVal = next.tiling !== undefined ? next.tiling : pVal;
                if (pVal !== undefined) obj.material.uniforms.uTiling.value = THREE.MathUtils.lerp(pVal, nVal, t);
            }

            // (2) ★ 子网格 (SubTiling) - 之前可能漏了这个
            // Timeline 属性名: subTiling -> Shader 变量: uSubTiling
            if (obj.material.uniforms.uSubTiling) {
                const pVal = prev.subTiling !== undefined ? prev.subTiling : obj.material.uniforms.uSubTiling.value;
                const nVal = next.subTiling !== undefined ? next.subTiling : pVal;
                if (pVal !== undefined) obj.material.uniforms.uSubTiling.value = THREE.MathUtils.lerp(pVal, nVal, t);
            }

            // (3) 瓣数 (Segments)
            // Timeline 属性名: segments -> Shader 变量: uSegments
            if (obj.material.uniforms.uSegments) {
                const pVal = prev.segments !== undefined ? prev.segments : obj.material.uniforms.uSegments.value;
                const nVal = next.segments !== undefined ? next.segments : pVal;
                if (pVal !== undefined) obj.material.uniforms.uSegments.value = THREE.MathUtils.lerp(pVal, nVal, t);
            }

            // (4) Shader 透明度 (Opacity)
            // Timeline 属性名: opacity -> Shader 变量: uOpacity
            if (obj.material.uniforms.uOpacity) {
                // 注意：这里复用 prev.opacity (如果没有就取当前值)
                // 这样你在 timeline 里只需要写 opacity，就能同时控制普通材质和 Shader 材质
                const currentOp = obj.material.uniforms.uOpacity.value;
                const pVal = prev.opacity !== undefined ? prev.opacity : currentOp;
                const nVal = next.opacity !== undefined ? next.opacity : pVal;
                if (pVal !== undefined) obj.material.uniforms.uOpacity.value = THREE.MathUtils.lerp(pVal, nVal, t);
            }
        }
    }

    animateDynamicLights(t, audioTime, shot) {
        if (!shot || !shot.camera || !shot.camera.target) return;
        const targetObj = this.getActorObject(shot.camera.target);
        if (targetObj) {
            const center = targetObj.position;
            const r = 6.0; 
            const speed = t * 4.0;
            if (this.ctx.pointLight1) { this.ctx.pointLight1.position.set(center.x + Math.sin(speed) * r, center.y + Math.cos(speed * 0.5) * 3, center.z + Math.cos(speed) * r); }
            if (this.ctx.pointLight2) { this.ctx.pointLight2.position.set(center.x + Math.cos(speed * 0.7) * 3, center.y + Math.sin(speed + 1) * r, center.z + Math.cos(speed + 1) * r); }
            if (this.ctx.pointLight3) { this.ctx.pointLight3.position.set(center.x + Math.sin(speed * 1.2 + 2) * r, center.y + Math.cos(speed * 1.2 + 2) * r, center.z); }
            if (this.ctx.pointLight4) { this.ctx.pointLight4.position.set(center.x + Math.cos(speed * 0.8 + 4) * r, center.y, center.z + Math.sin(speed * 0.8 + 4) * r); }
        }
    }

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
        let targetRot = null;
        if (prev.rot && next.rot) {
             targetRot = new THREE.Euler(
                 THREE.MathUtils.lerp(prev.rot[0], next.rot[0], alpha),
                 THREE.MathUtils.lerp(prev.rot[1], next.rot[1], alpha),
                 THREE.MathUtils.lerp(prev.rot[2], next.rot[2], alpha)
             );
        }

        bugs.forEach((b, i) => {
            const targetPos = this.calculateFormationPos(i, bugs.length, prev.formation, currentSpread);
            targetPos.add(center);
            const nx = Math.sin(time * 2 + i) * noiseStrength;
            const ny = Math.cos(time * 1.5 + i * 0.5) * noiseStrength;
            const nz = Math.sin(time * 1.2 + i * 0.2) * noiseStrength;
            targetPos.add(new THREE.Vector3(nx, ny, nz));
            b.group.position.lerp(targetPos, 0.05);
            b.group.scale.setScalar(currentScale);
            if (targetRot) { b.group.rotation.copy(targetRot); } 
            const flap = Math.sin(time * 15 * currentFlap + i) * 0.8;
            b.leftWing.rotation.y = flap; b.rightWing.rotation.y = -flap;
            b.leftWing.material.opacity = currentOpacity;
            b.leftWing.material.color.setHex(0xffffff);
        });
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
            const angle = index * 0.5; const radius = 10 + index * 0.5 * spread; const height = index * 2 * spread - (total); 
            pos.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
        }
        return pos;
    }

    handleButterflyOverride(actorName, keyframes, currentTime) {
        const frameData = this.findKeyframes(keyframes, currentTime);
        if (!frameData) return;
        let targetIndices = [];
        if (actorName.startsWith('bugs_')) {
            const parts = actorName.split('_'); const start = parseInt(parts[1]); const end = parseInt(parts[2]);
            for (let i = start; i <= end; i++) targetIndices.push(i);
        } else { targetIndices.push(parseInt(actorName.split('_')[1])); }
        targetIndices.forEach(idx => {
            const bug = this.ctx.butterflies[idx];
            if (bug) this.applyBugProperties(bug, frameData.prev, frameData.next, frameData.alpha, currentTime);
        });
    }

    applyBugProperties(bug, prev, next, alpha, time) {
        let t = alpha;
        if (next.ease === 'STEP') t = 0;
        if (prev.pos && next.pos) { const x = THREE.MathUtils.lerp(prev.pos[0], next.pos[0], t); const y = THREE.MathUtils.lerp(prev.pos[1], next.pos[1], t); const z = THREE.MathUtils.lerp(prev.pos[2], next.pos[2], t); bug.group.position.set(x, y, z); }
        if (prev.offset && next.offset) { const ox = THREE.MathUtils.lerp(prev.offset[0], next.offset[0], t); const oy = THREE.MathUtils.lerp(prev.offset[1], next.offset[1], t); const oz = THREE.MathUtils.lerp(prev.offset[2], next.offset[2], t); bug.group.position.add(new THREE.Vector3(ox, oy, oz)); }
        if (prev.scale !== undefined && next.scale !== undefined) { const s = THREE.MathUtils.lerp(prev.scale, next.scale, t); bug.group.scale.setScalar(s); }
        if (prev.flapSpeed !== undefined && next.flapSpeed !== undefined) { const speed = THREE.MathUtils.lerp(prev.flapSpeed, next.flapSpeed, t); const flap = Math.sin(time * 15 * speed) * 0.8; bug.leftWing.rotation.y = flap; bug.rightWing.rotation.y = -flap; }
        if (prev.color && next.color) { bug.leftWing.material.color.set(prev.color).lerp(this.tempColor.set(next.color), t); }
        if (prev.rot && next.rot) { const x = THREE.MathUtils.lerp(prev.rot[0], next.rot[0], t); const y = THREE.MathUtils.lerp(prev.rot[1], next.rot[1], t); const z = THREE.MathUtils.lerp(prev.rot[2], next.rot[2], t); bug.group.rotation.set(x, y, z); }
    }
}