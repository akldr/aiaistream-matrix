const sharp = require('sharp');
const fs = require('fs');

async function analyzePhoto() {
  const imagePath = '/app/public/photo-rgb-lipsync.png';
  
  try {
    // 获取图片元数据
    const metadata = await sharp(imagePath).metadata();
    console.log('=== 图片信息 ===');
    console.log(`尺寸: ${metadata.width} x ${metadata.height}`);
    console.log(`格式: ${metadata.format}`);
    console.log(`通道数: ${metadata.channels}`);
    
    // 提取原始像素数据
    const { data, info } = await sharp(imagePath)
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const width = info.width;
    const height = info.height;
    const channels = info.channels;
    
    console.log('\n=== 分析嘴部区域（寻找暗色区域） ===');
    
    // 扫描图片下半部分寻找嘴部（通常在人脸下1/3处）
    const searchStartY = Math.floor(height * 0.5);
    const searchEndY = Math.floor(height * 0.8);
    
    let darkestRegions = [];
    
    // 网格扫描寻找暗色区域
    for (let y = searchStartY; y < searchEndY; y += 10) {
      for (let x = 50; x < width - 50; x += 10) {
        const idx = (y * width + x) * channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const brightness = (r + g + b) / 3;
        
        // 寻找暗色区域（可能是嘴部）
        if (brightness < 80) {
          darkestRegions.push({ x, y, brightness, r, g, b });
        }
      }
    }
    
    if (darkestRegions.length > 0) {
      // 按亮度排序
      darkestRegions.sort((a, b) => a.brightness - b.brightness);
      
      console.log('\n找到的暗色区域（前10个）：');
      darkestRegions.slice(0, 10).forEach((region, i) => {
        console.log(`${i + 1}. 位置: (${region.x}, ${region.y}), 亮度: ${Math.round(region.brightness)}, RGB: (${region.r}, ${region.g}, ${region.b})`);
      });
      
      // 计算暗色区域的中心和范围
      const avgX = Math.round(darkestRegions.reduce((sum, r) => sum + r.x, 0) / darkestRegions.length);
      const avgY = Math.round(darkestRegions.reduce((sum, r) => sum + r.y, 0) / darkestRegions.length);
      
      const minX = Math.min(...darkestRegions.map(r => r.x));
      const maxX = Math.max(...darkestRegions.map(r => r.x));
      const minY = Math.min(...darkestRegions.map(r => r.y));
      const maxY = Math.max(...darkestRegions.map(r => r.y));
      
      const mouthWidth = maxX - minX;
      const mouthHeight = maxY - minY;
      
      console.log('\n=== 推荐的嘴部区域配置 ===');
      console.log(`中心位置: (${avgX}, ${avgY})`);
      console.log(`区域范围: X: ${minX}-${maxX}, Y: ${minY}-${maxY}`);
      console.log(`建议宽度: ${Math.round(mouthWidth * 1.2)}`);
      console.log(`建议高度: ${Math.round(mouthHeight * 1.5)}`);
      
      console.log('\n=== 代码配置 ===');
      console.log(`this.mouthRegion = {`);
      console.log(`  x: ${avgX},`);
      console.log(`  y: ${avgY},`);
      console.log(`  width: ${Math.round(mouthWidth * 1.2)},`);
      console.log(`  height: ${Math.round(mouthHeight * 1.5)}`);
      console.log(`};`);
    } else {
      console.log('未找到明显的暗色区域，尝试寻找红色区域（嘴唇）...');
      
      let redRegions = [];
      for (let y = searchStartY; y < searchEndY; y += 10) {
        for (let x = 50; x < width - 50; x += 10) {
          const idx = (y * width + x) * channels;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          
          // 寻找红色区域（嘴唇）
          if (r > g + 20 && r > b + 20 && r > 100) {
            redRegions.push({ x, y, r, g, b });
          }
        }
      }
      
      if (redRegions.length > 0) {
        const avgX = Math.round(redRegions.reduce((sum, r) => sum + r.x, 0) / redRegions.length);
        const avgY = Math.round(redRegions.reduce((sum, r) => sum + r.y, 0) / redRegions.length);
        
        console.log(`\n找到红色区域（嘴唇），中心: (${avgX}, ${avgY})`);
        console.log('前5个红色区域：');
        redRegions.slice(0, 5).forEach((region, i) => {
          console.log(`${i + 1}. (${region.x}, ${region.y}), RGB: (${region.r}, ${region.g}, ${region.b})`);
        });
      }
    }
    
  } catch (err) {
    console.error('错误:', err);
  }
}

analyzePhoto();
