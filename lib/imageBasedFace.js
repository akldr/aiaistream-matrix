/**
 * Image-Based Facial Animation with Depth-Based Morphing
 * Uses RGB photo + depth map to create realistic mouth movement through pixel displacement
 */

export class ImageBasedFaceAnimator {
  constructor(canvasElement, imageUrl, depthMapUrl = '/depth-map-lipsync.png') {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d', { willReadFrequently: true });
    this.imageUrl = imageUrl;
    this.depthMapUrl = depthMapUrl;
    this.baseImage = null;
    this.baseImageData = null;
    this.depthMap = null;
    this.depthMapData = null;
    this.isLoaded = false;
    
    // 性能优化：移动设备降采样比例
    this.isMobileDevice = this.isMobileDevice();
    this.downsampleRatio = this.isMobileDevice ? 0.75 : 1.0; // 75% 分辨率
    this.maxFrameRate = this.isMobileDevice ? 24 : 60; // 移动设备 24fps，桌面 60fps
    this.lastFrameTime = 0;
    
    // Canvas 尺寸限制：手机较小以减少内存压力
    this.maxCanvasWidth = this.isMobileDevice ? 384 : 512;
    this.maxCanvasHeight = this.isMobileDevice ? 384 : 512;
    
    // 缓存 imageData 以避免每帧创建新对象（GC 压力）
    this.cachedImageData = null;
    
    // 嘴部区域定义（针对 photo-bw-lipsync-creepy-2.png 优化）
    this.mouthRegion = {
      x: 730,      // 嘴部中心 X（1024图片居中）
      y: 730,      // 嘴部中心 Y
      width: 240,  // 嘴部宽度
      height: 180  // 嘴部高度
    };

    // 自动检测到的嘴部区域（关闭，使用默认值）
    this.autoMouthRegion = false;
    
    this.debugMode = true; // 调试模式：false=正常显示
    
    // 当前嘴部状态
    this.mouthOpenness = 0.2; // 初始略开，避免过小
    this.targetMouthOpenness = 0.5;
    this.mouthWidth = 0.5; // 水平宽度因子 (0-1)
    this.targetMouthWidth = 0.5;
    this.mouthHeight = 0.5; // 垂直高度因子 (0-1)
    this.targetMouthHeight = 0.5;
    this.smoothing = 0.2; // 响应更快，配合自适应平滑
    this.minOpen = 0.0;   // 允许完全闭合
    this.baseOpenness = 0.5; // 深度图默认半开状态
    this.currentViseme = null;
    this.lastVisemeTime = 0; // 追踪最后更新时间
    
    this.loadImage();
  }

  /**
   * 检测是否为移动设备
   */
  isMobileDevice() {
    return /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * 加载基础深度图
   */
  async loadImage() {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.baseImage = img;
        this.isLoaded = true;
        
        // 设置 Canvas 尺寸为图片尺寸
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        
        // 绘制初始图像并保存原始数据
        this.ctx.drawImage(img, 0, 0);
        this.baseImageData = this.ctx.getImageData(0, 0, img.width, img.height);

        // 自动检测嘴部区域（根据黑色口腔）
        if (this.autoMouthRegion) {
          const detected = this.detectMouthRegion();
          if (detected) {
            this.mouthRegion = detected;
            // Mouth region auto-detected
          } else {
            // Mouth region auto-detect failed, using defaults
          }
        }
        
        // 初始状态：嘴部略微张开
        this.mouthOpenness = 0.3;
        this.targetMouthOpenness = 0.3;
        this.render();
        
        resolve();
      };
      img.onerror = (e) => {
        reject(e);
      };
      img.src = this.imageUrl;
    });
  }

  /**
   * 根据 Viseme 更新嘴部形状
   * @param {string} viseme - 音素名称 (A, E, I, O, U, M, etc.)
   * @param {number} intensity - 强度 0-1 (energy parameter)
   * @param {number} width - 水平宽度因子 0-1 (optional)
   * @param {number} height - 垂直高度因子 0-1 (optional)
   */
  updateViseme(viseme, intensity = 1.0, width = null, height = null) {
    this.currentViseme = viseme;
    const now = performance.now();
    const timeDelta = now - this.lastVisemeTime;
    this.lastVisemeTime = now;
    
    // 根据不同音素设置嘴部开口度
    let openness = 0;
    let mouthWidth = width !== null ? width : 0.5;
    let mouthHeight = height !== null ? height : 0.5;
    
    // intensity 用于调节音素强度
    const clamped = Math.min(1, Math.max(0, intensity));
    
    // 自适应平滑：快速音素变化时减少平滑，缓慢时增加平滑
    if (timeDelta < 50) {
      this.smoothing = 0.4; // 快速变化，更多平滑
    } else if (timeDelta < 100) {
      this.smoothing = 0.3; // 中速
    } else {
      this.smoothing = 0.2; // 慢速变化，更快响应
    }
    
    if (!viseme || viseme === 'NEUTRAL') {
      openness = 0;
    } else {
      switch (viseme.toUpperCase()) {
        // 元音 - 超大开口（最大化开合幅度）
        case 'A':
        case 'AA':
        case 'AH':
          openness = 0.95;  // 接近最大值
          break;
        case 'O':
        case 'OO':
        case 'OE':
          openness = 0.88;  // 大幅提高
          break;
        case 'E':
        case 'EE':
        case 'EH':
          openness = 0.78;  // 大幅提高
          break;
        case 'I':
        case 'IH':
          openness = 0.70;  // 大幅提高
          break;
        case 'U':
        case 'UH':
          openness = 0.82;  // 大幅提高
          break;
        
        // 辅音 - 中小开口
        case 'P':
        case 'B':
        case 'M':
          openness = 0.1; // 轻微闭合保留自然度
          break;
        case 'F':
        case 'V':
          openness = 0.35;
          break;
        case 'S':
        case 'Z':
        case 'SH':
        case 'ZH':
          openness = 0.45;
          break;
        case 'T':
        case 'D':
        case 'N':
        case 'L':
          openness = 0.35;
          break;
        case 'K':
        case 'G':
          openness = 0.45;
          break;
        case 'R':
        case 'W':
          openness = 0.55;
          break;
        
        default:
          openness = 0.25;
      }
    }

    // 大幅放大开合幅度使嘴部动作极其明显
    // 提高到 1.8 使嘴部动作最大化
    this.targetMouthOpenness = Math.max(this.minOpen, Math.min(1.0, openness * clamped * 1.8));
    
    // If width/height provided explicitly, use them; otherwise use defaults based on openness
    if (width !== null) {
      this.targetMouthWidth = Math.max(0, Math.min(1, mouthWidth));
    } else {
      // Default: wider mouth for more open positions
      this.targetMouthWidth = 0.3 + openness * 0.5;
    }
    
    if (height !== null) {
      this.targetMouthHeight = Math.max(0, Math.min(1, mouthHeight));
    } else {
      // Default: height scales with openness
      this.targetMouthHeight = openness;
    }
    
    // 立即渲染以显示视觉效果
    this.render();
  }

  /**
   * 渲染当前帧
   */
  render() {
    if (!this.isLoaded || !this.baseImageData) {
      return;
    }

    // 帧率控制：移动设备限制为 24fps 以节省电池和降低温度
    const now = performance.now();
    const frameInterval = 1000 / this.maxFrameRate;
    if (now - this.lastFrameTime < frameInterval) {
      return;
    }
    this.lastFrameTime = now;

    // 平滑过渡到目标口型，避免跳变
    // 使用自适应 easing 实现更自然的过渡
    const easingFactor = this.easeInOutCubic(this.smoothing);
    
    // 自适应平滑：闭合时更快，张开时更平滑
    const diff = this.targetMouthOpenness - this.mouthOpenness;
    let adaptiveFactor = easingFactor;
    
    // 如果目标是闭合（目标值 < 当前值），加快响应速度
    if (diff < 0) {
      adaptiveFactor = Math.min(easingFactor * 1.8, 0.5); // 闭合时速度提高 1.8 倍
    }
    
    this.mouthOpenness += diff * adaptiveFactor;
    this.mouthWidth += (this.targetMouthWidth - this.mouthWidth) * easingFactor;
    this.mouthHeight += (this.targetMouthHeight - this.mouthHeight) * easingFactor;

    // 从原始照片数据开始（避免累积效应）
    // 移动设备降采样处理：缩小尺寸以提升性能
    const width = Math.round(this.baseImageData.width * this.downsampleRatio);
    const height = Math.round(this.baseImageData.height * this.downsampleRatio);
    
    // 重用缓存的 imageData，避免每帧创建新对象（GC 压力）
    let imageData = this.cachedImageData;
    if (!imageData || imageData.width !== width || imageData.height !== height) {
      imageData = this.ctx.createImageData(width, height);
      this.cachedImageData = imageData;
    }
    
    const sourcePixels = this.baseImageData.data;
    const targetPixels = imageData.data;
    
    // 直接复制原始 RGB 照片数据
    for (let i = 0; i < sourcePixels.length; i++) {
      targetPixels[i] = sourcePixels[i];
    }
    
    this.ctx.putImageData(imageData, 0, 0);
    
    // 修改嘴部区域
    this.modifyMouthRegion();
  }

  /**
   * 修改嘴部区域以反映当前嘴部状态
   * 使用平滑的非线性位移模拟嘴部张开/闭合，考虑深度图默认半开状态
   */
  modifyMouthRegion() {
    const { x, y, width, height } = this.mouthRegion;
    
    // 从当前画布获取图像数据
    const imageData = this.ctx.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    
    const pixels = imageData.data;
    const basePixels = this.baseImageData.data;
    
    // openScale: 0=完全闭合, 1=完全张开
    // 考虑深度图默认半开状态（baseOpenness = 0.5）
    const currentOpenness = this.mouthOpenness;
    const baseOpenness = this.baseOpenness || 0.5;
    
    // 计算相对于基础状态的位移
    const relativeOpenness = currentOpenness - baseOpenness;
    
    // 使用非线性函数使变形更自然（S形曲线）并加强幅度
    const smoothFactorRaw = this.smoothstep(0, 1, Math.abs(relativeOpenness)) * Math.sign(relativeOpenness);
    const smoothFactor = Math.max(-1.5, Math.min(1.5, smoothFactorRaw * 1.5));
    
    // 位移幅度（进一步增强，强调夸张效果）
    // 使用 mouthWidth/mouthHeight 因子调节不同方向的位移
    const verticalIntensity = Math.pow(this.mouthHeight, 0.75); // 稍微更强的非线性
    const horizontalIntensity = Math.pow(this.mouthWidth, 0.75);
    const maxVerticalDisplacement = height * 1.05 * verticalIntensity;
    const maxHorizontalDisplacement = width * 0.75 * horizontalIntensity;
    
    // 创建临时缓冲区用于多次采样和平均（抗锯齿）
    const tempPixels = new Uint8ClampedArray(pixels);
    
    for (let py = Math.max(0, y - height / 2); py < Math.min(this.canvas.height, y + height / 2); py++) {
      for (let px = Math.max(0, x - width / 2); px < Math.min(this.canvas.width, x + width / 2); px++) {
        const index = (py * this.canvas.width + px) * 4;
        
        // 计算相对于嘴部中心的位置（归一化）
        const relY = py - y;
        const relX = px - x;
        const normalizedY = relY / (height / 2); // -1 到 1
        const normalizedX = relX / (width / 2); // -1 到 1
        
        // 使用柔和的衰减函数，嘴角处最大，中心处最小
        const distance = Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY);
        const falloff = Math.cos(Math.min(distance * Math.PI / 2, Math.PI / 2));
        
        // 非线性位移（使用sin函数平滑）
        const verticalFactor = Math.sin(normalizedY * Math.PI / 2) * falloff;
        const horizontalFactor = normalizedX * falloff;
        
        // 计算位移
        const verticalDisplacement = verticalFactor * maxVerticalDisplacement * smoothFactor;
        const horizontalDisplacement = horizontalFactor * maxHorizontalDisplacement * smoothFactor;
        
        // 计算源像素位置（使用浮点以获得更好的精度）
        const sourceY = py - verticalDisplacement;
        const sourceX = px - horizontalDisplacement;
        
        // 双线性插值采样（比简单四舍五入更平滑）
        this.bilinearSample(basePixels, sourceX, sourceY, this.canvas.width, this.canvas.height, tempPixels, index);
      }
    }
    
    // 复制临时缓冲区回到像素数据
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = tempPixels[i];
    }
    
    // 将修改后的数据放回画布
    this.ctx.putImageData(imageData, 0, 0);

    // 调试模式
    if (this.debugMode) {
      this.ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
      
      this.ctx.fillStyle = '#00ff00';
      this.ctx.font = '14px monospace';
      this.ctx.fillText(`Open: ${(currentOpenness * 100).toFixed(0)}%`, x - width / 2, y - height / 2 - 20);
      this.ctx.fillText(`Smooth: ${(smoothFactor * 100).toFixed(0)}%`, x - width / 2, y - height / 2 - 5);
    }
  }

  /**
   * 平滑阶跃函数（Smoothstep）
   * 在0到1之间平滑过渡，边界处斜率为0
   */
  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
  }

  /**
   * 自动检测嘴部区域：寻找最暗区域（黑色口腔）
   * 基于下半区域的亮度分布，取最暗 10% 作为口腔候选
   */
  detectMouthRegion() {
    if (!this.baseImageData) return null;
    const { width, height, data } = this.baseImageData;
    // 只在下半部分搜索，减少干扰
    const startY = Math.floor(height * 0.45);
    const endY = height;
    const stride = Math.max(1, Math.floor(width / 256)); // 采样步长
    const luminance = [];
    for (let y = startY; y < endY; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const l = 0.299 * r + 0.587 * g + 0.114 * b;
        luminance.push({ x, y, l });
      }
    }
    if (!luminance.length) return null;
    // 计算最暗 10% 阈值
    const sorted = luminance.map(v => v.l).sort((a, b) => a - b);
    const p10 = sorted[Math.floor(sorted.length * 0.1)];
    const threshold = p10;
    let minX = width, maxX = 0, minY = height, maxY = 0, count = 0;
    for (const p of luminance) {
      if (p.l <= threshold) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        count += 1;
      }
    }
    if (count < 20) return null;
    // 加入一点边距
    const padX = Math.floor((maxX - minX) * 0.25);
    const padY = Math.floor((maxY - minY) * 0.25);
    minX = Math.max(0, minX - padX);
    maxX = Math.min(width - 1, maxX + padX);
    minY = Math.max(0, minY - padY);
    maxY = Math.min(height - 1, maxY + padY);
    const region = {
      x: Math.round((minX + maxX) / 2),
      y: Math.round((minY + maxY) / 2),
      width: Math.max(40, Math.round(maxX - minX)),
      height: Math.max(40, Math.round(maxY - minY)),
    };
    return region;
  }

  /**
   * 缓动函数 - 三次缓出（Ease Out Cubic）
   * 快速开始，慢速结束，更自然
   */
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * 缓动函数 - 三次缓进缓出（Ease In-Out Cubic）
   * 开始慢，中间快，结束慢，最平滑
   */
  easeInOutCubic(t) {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * 双线性插值采样
   * 从浮点坐标采样像素，使用周围4个像素的加权平均
   */
  bilinearSample(sourcePixels, sx, sy, width, height, destPixels, destIndex) {
    // 边界检查
    if (sx < 0 || sx > width - 1 || sy < 0 || sy > height - 1) {
      // 超出范围，使用黑色或边界像素
      destPixels[destIndex] = 0;
      destPixels[destIndex + 1] = 0;
      destPixels[destIndex + 2] = 0;
      destPixels[destIndex + 3] = 255;
      return;
    }
    
    const x0 = Math.floor(sx);
    const x1 = Math.min(x0 + 1, width - 1);
    const y0 = Math.floor(sy);
    const y1 = Math.min(y0 + 1, height - 1);
    
    const fx = sx - x0;
    const fy = sy - y0;
    
    // 获取4个角的像素
    const idx00 = (y0 * width + x0) * 4;
    const idx10 = (y0 * width + x1) * 4;
    const idx01 = (y1 * width + x0) * 4;
    const idx11 = (y1 * width + x1) * 4;
    
    // 双线性插值
    for (let c = 0; c < 4; c++) {
      const p00 = sourcePixels[idx00 + c];
      const p10 = sourcePixels[idx10 + c];
      const p01 = sourcePixels[idx01 + c];
      const p11 = sourcePixels[idx11 + c];
      
      const px0 = p00 * (1 - fx) + p10 * fx;
      const px1 = p01 * (1 - fx) + p11 * fx;
      const result = px0 * (1 - fy) + px1 * fy;
      
      destPixels[destIndex + c] = Math.round(result);
    }
  }

  /**
   * 生成当前帧的深度图数据
   */
  generateDepthMap() {
    if (!this.isLoaded) {
      return null;
    }
    
    const imageData = this.ctx.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    
    return imageData.data;
  }

  /**
   * 清理资源
   */
  destroy() {
    this.baseImage = null;
    this.isLoaded = false;
  }
}

export default ImageBasedFaceAnimator;
