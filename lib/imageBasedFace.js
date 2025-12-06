/**
 * Image-Based Facial Animation
 * Uses depth-map-03.png as base and modifies mouth region based on speech
 */

export class ImageBasedFaceAnimator {
  constructor(canvasElement, imageUrl) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.imageUrl = imageUrl;
    this.baseImage = null;
    this.baseImageData = null; // 保存原始图像数据
    this.isLoaded = false;
    
    // 嘴部区域定义（基于深度图实际位置）
    // 深度图中嘴部已经是张开的黑色区域，我们需要动态调整这个区域
    // 用户反馈：嘴部实际大小约为高250、宽180，图片是张嘴状态（黑色嘴部，白色面部）
    this.mouthRegion = {
      x: 508,      // 嘴部中心 X
      y: 728,      // 嘴部中心 Y
      width: 180,  // 嘴部宽度（实际测量）
      height: 250  // 嘴部高度（实际测量）
    };
    
    this.debugMode = false; // 调试模式：false=正常显示，true=显示红框
    
    // 当前嘴部状态
    // mouthOpenness: 0=闭合（填充皮肤色）, 1=张开（显示黑色）
    this.mouthOpenness = 1; // 初始状态：张开（显示原始黑色）
    this.currentViseme = null;
    
    this.loadImage();
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
        
        console.log('Base image loaded:', img.width, 'x', img.height);
        
        // 绘制初始图像并保存原始数据
        this.ctx.drawImage(img, 0, 0);
        this.baseImageData = this.ctx.getImageData(0, 0, img.width, img.height);
        
        // 初始状态：嘴张开（保持原始黑色状态）
        this.mouthOpenness = 1;
        this.render();
        
        resolve();
      };
      img.onerror = (e) => {
        console.error('Failed to load base image:', e);
        reject(e);
      };
      img.src = this.imageUrl;
    });
  }

  /**
   * 根据 Viseme 更新嘴部形状
   * @param {string} viseme - 音素名称 (A, E, I, O, U, M, etc.)
   * @param {number} intensity - 强度 0-1
   */
  updateViseme(viseme, intensity = 1.0) {
    this.currentViseme = viseme;
    
    // 根据不同音素设置嘴部开口度
    let openness = 0;
    
    if (!viseme || viseme === 'NEUTRAL') {
      openness = 0;
    } else {
      switch (viseme.toUpperCase()) {
        // 元音 - 大开口
        case 'A':
        case 'AA':
        case 'AH':
          openness = 0.9;
          break;
        case 'O':
        case 'OO':
        case 'OE':
          openness = 0.8;
          break;
        case 'E':
        case 'EE':
        case 'EH':
          openness = 0.6;
          break;
        case 'I':
        case 'IH':
          openness = 0.5;
          break;
        case 'U':
        case 'UH':
          openness = 0.7;
          break;
        
        // 辅音 - 中小开口
        case 'P':
        case 'B':
        case 'M':
          openness = 0; // 闭合
          break;
        case 'F':
        case 'V':
          openness = 0.3;
          break;
        case 'S':
        case 'Z':
        case 'SH':
        case 'ZH':
          openness = 0.4;
          break;
        case 'T':
        case 'D':
        case 'N':
        case 'L':
          openness = 0.3;
          break;
        case 'K':
        case 'G':
          openness = 0.4;
          break;
        case 'R':
        case 'W':
          openness = 0.5;
          break;
        
        default:
          openness = 0.2;
      }
    }
    
    this.mouthOpenness = openness * Math.max(0, Math.min(1, intensity));
  }

  /**
   * 渲染当前帧
   */
  render() {
    if (!this.isLoaded || !this.baseImageData) {
      return;
    }

    // 从原始图像数据开始（避免累积效应）
    this.ctx.putImageData(this.baseImageData, 0, 0);
    
    // 修改嘴部区域
    this.modifyMouthRegion();
  }

  /**
   * 修改嘴部区域以反映当前嘴部状态
   * 深度图中嘴部默认张开（黑色），闭合时需要填充为周围颜色
   */
  modifyMouthRegion() {
    const { x, y, width, height } = this.mouthRegion;
    
    // 从原始图像数据复制
    const imageData = this.ctx.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    
    const pixels = imageData.data;
    const basePixels = this.baseImageData.data;
    
    // openScale: 0=完全闭合（填充）, 1=完全张开（保持原黑色）
    const openScale = this.mouthOpenness;
    
    // 如果嘴部完全张开，不需要修改
    if (openScale >= 1.0) {
      this.ctx.putImageData(imageData, 0, 0);
      if (this.debugMode) {
        this.drawDebugBox(x, y, width, height, basePixels);
      }
      return;
    }
    
    // 采样嘴部周围（左右两侧）的皮肤颜色，避免采样到嘴部内部
    let avgR = 0, avgG = 0, avgB = 0, sampleCount = 0;
    
    // 从嘴部左侧采样（x - width）
    for (let py = y - height * 0.3; py < y + height * 0.3; py++) {
      for (let px = x - width * 0.8; px < x - width * 0.5; px++) {
        if (px < 0 || px >= this.canvas.width || py < 0 || py >= this.canvas.height) continue;
        
        const index = (Math.floor(py) * this.canvas.width + Math.floor(px)) * 4;
        // 只采样白色/浅色像素（皮肤）
        if (basePixels[index] > 150) {
          avgR += basePixels[index];
          avgG += basePixels[index + 1];
          avgB += basePixels[index + 2];
          sampleCount++;
        }
      }
    }
    
    if (sampleCount > 0) {
      avgR /= sampleCount;
      avgG /= sampleCount;
      avgB /= sampleCount;
    } else {
      // 默认皮肤颜色（如果采样失败）
      avgR = 220;
      avgG = 200;
      avgB = 180;
    }
    
    console.log('Skin color sampled:', Math.round(avgR), Math.round(avgG), Math.round(avgB), 'openness:', openScale);
    
    // 简单填充：直接用皮肤色替换黑色区域
    for (let py = Math.max(0, y - height / 2); py < Math.min(this.canvas.height, y + height / 2); py++) {
      for (let px = Math.max(0, x - width / 2); px < Math.min(this.canvas.width, x + width / 2); px++) {
        const index = (py * this.canvas.width + px) * 4;
        
        const baseR = basePixels[index];
        const baseG = basePixels[index + 1];
        const baseB = basePixels[index + 2];
        
        // 检测黑色像素（嘴部打开的部分）
        if (baseR < 100 && baseG < 100 && baseB < 100) {
          // 这是黑色区域（嘴部），根据 openScale 决定是否填充
          const closeAmount = 1 - openScale; // 0=保持黑色, 1=完全填充
          
          pixels[index] = baseR + (avgR - baseR) * closeAmount;
          pixels[index + 1] = baseG + (avgG - baseG) * closeAmount;
          pixels[index + 2] = baseB + (avgB - baseB) * closeAmount;
        }
      }
    }
    
    // 将修改后的数据放回画布
    this.ctx.putImageData(imageData, 0, 0);

    // 调试模式：绘制嘴部区域框
    if (this.debugMode) {
      this.drawDebugBox(x, y, width, height, basePixels);
    }
  }

  /**
   * 绘制调试框和采样颜色
   */
  drawDebugBox(x, y, width, height, basePixels) {
    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x - width / 2, y - height / 2, width, height);
    
    // 采样并显示颜色
    let avgR = 0, avgG = 0, avgB = 0, count = 0;
    for (let py = y - height * 0.3; py < y + height * 0.3; py++) {
      for (let px = x - width * 0.8; px < x - width * 0.5; px++) {
        if (px < 0 || px >= this.canvas.width || py < 0 || py >= this.canvas.height) continue;
        
        const index = (Math.floor(py) * this.canvas.width + Math.floor(px)) * 4;
        if (basePixels[index] > 150) {
          avgR += basePixels[index];
          avgG += basePixels[index + 1];
          avgB += basePixels[index + 2];
          count++;
        }
      }
    }
    
    if (count > 0) {
      avgR /= count;
      avgG /= count;
      avgB /= count;
    }
    
    // 显示采样颜色
    this.ctx.fillStyle = `rgb(${Math.round(avgR)}, ${Math.round(avgG)}, ${Math.round(avgB)})`;
    this.ctx.fillRect(10, 10, 20, 20);
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
