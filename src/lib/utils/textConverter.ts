// src/lib/astroTextUtils.ts
import type { CollectionEntry } from 'astro:content';

// 专门处理 Astro 内容集合的文本工具
export const contentUtils = {
  // 从文章生成 slug（基于标题）
  generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  // 生成文章摘要
  generateExcerpt(content: string, maxLength: number = 160): string {
    const plainText = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return plainText.length > maxLength 
      ? plainText.slice(0, maxLength) + '...' 
      : plainText;
  },

  // 格式化分类/标签显示
  formatTaxonomy(items: string[]): string {
   // 检查输入类型
  if (!items) return '';
  
  // 如果是字符串，转换为数组
  if (typeof items === 'string') {
    // 处理逗号分隔的字符串
    if (items.includes(',')) {
      items = items.split(',').map(item => item.trim());
    } else {
      items = [items]; // 单个字符串转为数组
    }
  }
  
  // 确保是数组
  if (!Array.isArray(items)) {
    // console.warn('formatTaxonomy: 期望数组，但收到:', typeof items, items);
    return String(items); // 返回字符串表示
  }
  
  // 过滤空值并处理
  return items
    .filter(item => item && typeof item === 'string') // 过滤有效字符串
    .map(item => 
      item.trim()
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, l => l.toUpperCase())
    )
    .join(', ');
},

  // 日期格式化
  formatDate(date: Date, locale: string = 'zh-CN'): string {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  },

  // 阅读时间估算
  estimateReadingTime(content: string, wordsPerMinute: number = 200): number {
    const wordCount = content
      .replace(/<[^>]*>/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0).length;
    
    return Math.ceil(wordCount / wordsPerMinute);
  }
};

export default contentUtils;