// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// 1. 定义 'blog' 集合的 Frontmatter 架构 (Schema)
const blogCollection = defineCollection({
    // 'content' 类型适用于 Markdown 和 MDX 文件
    type: 'content',
    // 定义预期的 Frontmatter 字段及其类型
    schema: z.object({
        title: z.string({required_error: "博客文章必须有标题。",}),
        pubDate: z.coerce.date({required_error: "博客文章必须有发布日期。",}),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        author: z.string().optional(),
        readingTime: z.number().optional(),
        coverImage: z.string().optional(),
        draft: z.boolean().optional(),
    }),
});

// 2. 导出所有已定义的集合
export const collections = {
    'blog': blogCollection,
};