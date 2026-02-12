/**
 * @file optimize-favicon.mjs
 * @description 优化 favicon 图片大小 - 将 1024x1024 缩小到 64x64
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const FAVICON_PATH = 'public/favicon.png';
const BACKUP_PATH = 'public/favicon.png.backup';

async function optimizeFavicon() {
  try {
    // 检查文件是否存在
    await fs.access(FAVICON_PATH);
    
    // 获取原始文件信息
    const stats = await fs.stat(FAVICON_PATH);
    const originalSizeKB = (stats.size / 1024).toFixed(2);
    
    console.log(`原始 favicon: ${originalSizeKB} KB`);
    
    // 备份原始文件
    await fs.copyFile(FAVICON_PATH, BACKUP_PATH);
    console.log('已备份原始文件到:', BACKUP_PATH);
    
    // 读取并优化图片 - 生成 64x64 和 32x32 两个版本
    // 使用 64x64 以获得更好的视网膜屏幕效果，但文件仍然很小
    const buffer = await sharp(FAVICON_PATH)
      .resize(64, 64, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toBuffer();
    
    // 写回文件
    await fs.writeFile(FAVICON_PATH, buffer);
    
    // 获取新文件大小
    const newStats = await fs.stat(FAVICON_PATH);
    const newSizeKB = (newStats.size / 1024).toFixed(2);
    const saved = ((stats.size - newStats.size) / 1024).toFixed(2);
    const percent = ((stats.size - newStats.size) / stats.size * 100).toFixed(1);
    
    console.log(`\n✅ Favicon 优化完成!`);
    console.log(`   原始大小: ${originalSizeKB} KB`);
    console.log(`   新大小: ${newSizeKB} KB`);
    console.log(`   节省: ${saved} KB (${percent}%)`);
    console.log(`   尺寸: 1024x1024 → 64x64`);
    
    // 删除备份
    await fs.unlink(BACKUP_PATH);
    console.log('\n已删除备份文件');
    
  } catch (error) {
    console.error('❌ 优化失败:', error.message);
    // 恢复备份
    try {
      await fs.access(BACKUP_PATH);
      await fs.copyFile(BACKUP_PATH, FAVICON_PATH);
      console.log('已恢复原始文件');
    } catch {}
    process.exit(1);
  }
}

optimizeFavicon();
