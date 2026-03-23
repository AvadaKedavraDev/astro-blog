// src/content/config.ts
import { defineCollection, z, reference } from 'astro:content';

// 辅助函数：生成可读的错误消息
const required = (field: string) => ({ required_error: `博客文章必须有${field}。` });

// 1. 定义 'blog' 集合的 Frontmatter 架构 (Schema)
const blogCollection = defineCollection({
    // 'content' 类型适用于 Markdown 和 MDX 文件
    type: 'content',
    // 定义预期的 Frontmatter 字段及其类型
    schema: z.object({
        // 标题：必填，1-200 字符
        title: z.string(required('标题'))
            .min(1, '标题不能为空')
            .max(200, '标题不能超过 200 字符'),
        
        // 发布日期：必填，自动解析为 Date 对象
        pubDate: z.coerce.date(required('发布日期')),
        
        // 描述：可选，建议 50-300 字符用于 SEO
        description: z.string()
            .max(500, '描述不能超过 500 字符')
            .optional(),
        
        // 标签：可选，数组形式，自动小写化
        tags: z.array(
            z.string()
                .min(1, '标签不能为空')
                .max(50, '单个标签不能超过 50 字符')
                .transform(tag => tag.toLowerCase().trim())
        ).optional(),
        
        // 分类：可选，单层级分类
        categories: z.array(
            z.string()
                .min(1, '分类不能为空')
                .max(50, '单个分类不能超过 50 字符')
        ).optional(),
        
        // 作者：可选，默认可以从站点配置读取
        author: z.string()
            .min(1, '作者名不能为空')
            .max(100, '作者名不能超过 100 字符')
            .optional(),
        
        // 预计阅读时间：可选，自动计算或手动指定（分钟）
        readingTime: z.number()
            .min(0.1, '阅读时间必须大于 0')
            .max(1000, '阅读时间不能超过 1000 分钟')
            .optional(),
        
        // 封面图：可选，支持本地路径或完整 URL（兼容 image 和 coverImage）
        coverImage: z.string()
            .refine(
                (val) => val.startsWith('/') || val.startsWith('http://') || val.startsWith('https://'),
                { message: '封面图路径必须以 / 或 http:// 或 https:// 开头' }
            )
            .optional(),
        
        // 兼容旧文章的 image 字段（等同于 coverImage）
        image: z.string().optional(),
        
        // 置顶标记（等同于 featured）
        pinned: z.boolean().default(false),
        
        // 是否为草稿：可选，默认 false
        draft: z.boolean().default(false),
        
        // 是否置顶：可选，默认 false
        featured: z.boolean().default(false),
        
        // 最后修改日期：可选，自动解析
        updatedDate: z.coerce.date().optional(),
        
        // 别名/重定向：可选，用于 URL 变更时保持旧链接可用
        aliases: z.array(z.string()).optional(),
        
        // SEO 相关：可选的自定义 SEO 设置
        seo: z.object({
            title: z.string().max(70, 'SEO 标题建议不超过 70 字符').optional(),
            description: z.string().max(160, 'SEO 描述建议不超过 160 字符').optional(),
            noindex: z.boolean().default(false),
            nofollow: z.boolean().default(false),
        }).optional(),
        
        // 相关文章：可选，引用其他博客文章
        relatedPosts: z.array(reference('blog')).optional(),
        
        // 系列文章：可选，用于系列教程
        series: z.object({
            name: z.string(),
            order: z.number().min(1),
        }).optional(),
        
        // 版权信息：可选
        license: z.enum([
            'CC-BY-4.0',
            'CC-BY-SA-4.0',
            'CC-BY-NC-4.0',
            'CC0-1.0',
            'MIT',
            'Proprietary',
        ]).optional(),
    }).strict(), // 严格模式：不允许未定义的字段
});

// 2. 定义 'authors' 集合（可选，用于多作者场景）
const authorsCollection = defineCollection({
    type: 'data',
    schema: z.object({
        name: z.string(),
        bio: z.string().optional(),
        avatar: z.string().optional(),
        email: z.string().email().optional(),
        website: z.string().url().optional(),
        social: z.object({
            github: z.string().optional(),
            twitter: z.string().optional(),
            weibo: z.string().optional(),
        }).optional(),
    }),
});

// 3. 导出所有已定义的集合
export const collections = {
    'blog': blogCollection,
    'authors': authorsCollection,
};

// 4. 导出类型（供 TypeScript 使用）
export type BlogSchema = z.infer<typeof blogCollection.schema>;
export type AuthorsSchema = z.infer<typeof authorsCollection.schema>;
