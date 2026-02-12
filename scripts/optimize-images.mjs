/**
 * 图片优化脚本
 * 使用 sharp 库压缩和转换图片
 * 
 * 安装依赖: npm install sharp --save-dev
 * 运行: node scripts/optimize-images.mjs
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const IMAGES_DIR = './public/images/fans';
const FAVICON_PATH = './public/favicon.png';
const OUTPUT_DIR = './public/images/fans/optimized';

async function optimizeImage(inputPath, outputPath, options = {}) {
  const { width = 400, quality = 80, format = 'webp' } = options;
  
  try {
    await sharp(inputPath)
      .resize(width, null, { withoutEnlargement: true })
      .toFormat(format, { quality })
      .toFile(outputPath);
    
    const originalSize = (await fs.stat(inputPath)).size;
    const optimizedSize = (await fs.stat(outputPath)).size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(inputPath)}: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB (${savings}% 减少)`);
    return true;
  } catch (error) {
    console.error(`❌ ${path.basename(inputPath)} 优化失败:`, error.message);
    return false;
  }
}

async function optimizeFavicon() {
  console.log('\n🔧 优化 favicon.png...');
  const outputPath = './public/favicon-64.png';
  
  try {
    await sharp(FAVICON_PATH)
      .resize(64, 64, { fit: 'cover' })
      .png({ compressionLevel: 9, palette: true })
      .toFile(outputPath);
    
    const originalSize = (await fs.stat(FAVICON_PATH)).size;
    const optimizedSize = (await fs.stat(outputPath)).size;
    const savings = ((originalSize - optimizedSize) / originalSize * 100).toFixed(1);
    
    console.log(`✅ favicon: ${(originalSize/1024).toFixed(1)}KB → ${(optimizedSize/1024).toFixed(1)}KB (${savings}% 减少)`);
  } catch (error) {
    console.error('❌ favicon 优化失败:', error.message);
  }
}

async function optimizeFansImages() {
  console.log('\n🔧 优化粉丝图片...');
  
  try {
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    const files = await fs.readdir(IMAGES_DIR);
    const imageFiles = files.filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    
    for (const file of imageFiles) {
      const inputPath = path.join(IMAGES_DIR, file);
      const outputPath = path.join(OUTPUT_DIR, `${path.parse(file).name}.webp`);
      
      await optimizeImage(inputPath, outputPath, {
        width: 200,
        quality: 85,
        format: 'webp'
      });
    }
  } catch (error) {
    console.error('❌ 优化粉丝图片失败:', error.message);
  }
}

async function main() {
  console.log('🚀 开始图片优化...\n');
  
  await optimizeFavicon();
  await optimizeFansImages();
  
  console.log('\n✅ 优化完成！');
  console.log('\n提示：');
  console.log('1. 优化后的图片在 optimized 目录中');
  console.log('2. 确认无误后，可以替换原始文件');
  console.log('3. favicon-64.png 建议重命名为 favicon.png 替换原文件');
}

main().catch(console.error);
