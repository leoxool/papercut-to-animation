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

export const removeBackground = (inputCanvas, toleranceVal) => {
    const width = inputCanvas.width;
    const height = inputCanvas.height;
    const ctx = inputCanvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const threshold = toleranceVal * 4.41;
    
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
        const dist = Math.sqrt((r - 255) ** 2 + (g - 255) ** 2 + (b - 255) ** 2);
        
        if (dist < threshold) { 
            data[i + 3] = 0; 
        } else if (dist < threshold + 20) {
            const alpha = (dist - threshold) / 20; 
            data[i + 3] = Math.floor(alpha * 255);
        }
    }
    ctx.putImageData(imageData, 0, 0);
    return inputCanvas;
};