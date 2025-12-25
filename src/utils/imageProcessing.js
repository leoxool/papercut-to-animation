export const getSquareCanvas512 = (source, srcW, srcH) => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const scale = size / Math.min(srcW, srcH);
    const scaledW = srcW * scale; const scaledH = srcH * scale;
    const dx = (size - scaledW) / 2; const dy = (size - scaledH) / 2;
    ctx.drawImage(source, 0, 0, srcW, srcH, dx, dy, scaledW, scaledH);
    return canvas;
};

// RGB转HSL工具函数
const rgbToHsl = (r, g, b) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
};

// HSL距离计算（考虑环形色相）
const hslDistance = (hsl1, hsl2) => {
    // 色相距离（考虑环形特性）
    let dh = Math.abs(hsl1.h - hsl2.h);
    if (dh > 180) dh = 360 - dh;
    dh = dh / 180; // 归一化到 0-1

    // 饱和度距离
    const ds = Math.abs(hsl1.s - hsl2.s) / 100;

    // 亮度距离
    const dl = Math.abs(hsl1.l - hsl2.l) / 100;

    // 加权组合（色相权重最高，亮度次之，饱和度最低）
    return Math.sqrt(
        (dh * 0.6) ** 2 +
        (ds * 0.2) ** 2 +
        (dl * 0.2) ** 2
    );
};

// 综合相似度算法（RGB + HSL）
const calculateSimilarity = (pixelRGB, targetRGB, pixelHSL, targetHSL) => {
    // RGB距离（欧几里得）
    const rgbDist = Math.sqrt(
        (pixelRGB.r - targetRGB.r) ** 2 +
        (pixelRGB.g - targetRGB.g) ** 2 +
        (pixelRGB.b - targetRGB.b) ** 2
    ) / 441.67; // √(255²+255²+255²) 归一化

    // HSL距离
    const hslDist = hslDistance(pixelHSL, targetHSL);

    // 综合距离（RGB权重40%，HSL权重60%）
    const combinedDist = rgbDist * 0.4 + hslDist * 0.6;

    return combinedDist;
};

export const removeBackground = (inputCanvas, toleranceVal, bgColor, algorithm = 'advanced') => {
    const width = inputCanvas.width;
    const height = inputCanvas.height;
    const ctx = inputCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 如果提供了背景色，使用该颜色作为参考；否则默认使用白色
    const targetRGB = bgColor || { r: 255, g: 255, b: 255 };
    const targetHSL = rgbToHsl(targetRGB.r, targetRGB.g, targetRGB.b);

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]; const g = data[i + 1]; const b = data[i + 2];

        if (algorithm === 'simple') {
            // 原始简单算法
            const dist = Math.sqrt((r - targetRGB.r) ** 2 + (g - targetRGB.g) ** 2 + (b - targetRGB.b) ** 2);
            const simpleThreshold = toleranceVal * 4.41;

            if (dist < simpleThreshold) {
                data[i + 3] = 0;
            } else if (dist < simpleThreshold + 20) {
                const alpha = (dist - simpleThreshold) / 20;
                data[i + 3] = Math.floor(alpha * 255);
            }
        } else {
            // 改进算法：使用HSL + RGB综合判断
            const pixelHSL = rgbToHsl(r, g, b);
            const similarity = calculateSimilarity({ r, g, b }, targetRGB, pixelHSL, targetHSL);

            // 将toleranceVal转换为0-1范围的阈值
            // 原来的toleranceVal是1-80，新算法使用0-1范围
            const threshold = Math.min(toleranceVal / 80, 1.0);

            // 相似度小于阈值，完全透明；大于阈值+0.05，完全保留；中间区域渐变
            if (similarity < threshold) {
                data[i + 3] = 0;
            } else if (similarity < threshold + 0.05) {
                const alpha = (similarity - threshold) / 0.05;
                data[i + 3] = Math.floor(alpha * 255);
            }
            // else 保持原alpha值
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return inputCanvas;
};