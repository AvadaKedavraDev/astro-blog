// content.config.ts - Astro 6.x Content Layer API 配置
import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

// 注意：Zod 4 中字符串验证使用顶层方法而非实例方法
// z.email() 而非 z.string().email()
// z.url() 而非 z.string().url()

// ============================================
// Questions Collection Schema（软考题库）
// ============================================

/**
 * 选项 Schema（导出供类型推导使用）
 */
export const optionSchema = z.object({
    id: z.string()
        .min(1, '选项ID不能为空')
        .max(10, '选项ID不能超过 10 字符'),
    text: z.string()
        .min(1, '选项内容不能为空')
        .max(500, '选项内容不能超过 500 字符'),
    isCorrect: z.boolean(),
});

/**
 * 题目 Schema（导出供类型推导使用）
 * 默认科目：系统架构设计师
 */
export const questionSchema = z.object({
    // 题目唯一标识
    id: z.string()
        .min(1, '题目ID不能为空')
        .regex(/^[a-zA-Z0-9-_]+$/, '题目ID只能包含字母、数字、连字符和下划线'),
    
    // 所属章节
    chapter: z.string()
        .min(1, '章节不能为空')
        .max(100, '章节名称不能超过 100 字符'),
    
    // 难度等级：1-5
    difficulty: z.number()
        .int('难度必须是整数')
        .min(1, '难度最低为 1')
        .max(5, '难度最高为 5'),
    
    // 题目类型
    type: z.enum(['single', 'multiple', 'judge']),
    
    // 所属科目（可选，默认为系统架构设计师）
    subject: z.enum(['system-architect', 'software-design']).default('system-architect'),
    
    // 题目内容
    content: z.string()
        .min(1, '题目内容不能为空')
        .max(2000, '题目内容不能超过 2000 字符'),
    
    // 选项（单选、多选题目需要，判断题可选）
    options: z.array(optionSchema).optional(),
    
    // 答案解析
    explanation: z.string()
        .min(1, '答案解析不能为空')
        .max(3000, '答案解析不能超过 3000 字符'),
    
    // 知识点标签
    knowledgePoints: z.array(
        z.string()
            .min(1, '知识点标签不能为空')
            .max(50, '单个知识点标签不能超过 50 字符')
    ).default([]),
}).strict();

// ============================================
// Collections 定义 - Astro 6.x Content Layer API
// ============================================

// 1. 定义 'blog' 集合 - Markdown/MDX 文章
const blogCollection = defineCollection({
    // 使用 glob loader 加载 Markdown/MDX 文件
    loader: glob({ 
        pattern: '**/*.{md,mdx}', 
        base: './src/content/blog' 
    }),
    // 定义预期的 Frontmatter 字段及其类型
    schema: z.object({
        // 标题：必填，1-200 字符
        title: z.string()
            .min(1, { error: '标题不能为空' })
            .max(200, { error: '标题不能超过 200 字符' }),
        
        // 发布日期：必填，自动解析为 Date 对象
        pubDate: z.coerce.date(),
        
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
    loader: glob({ pattern: '*.json', base: './src/content/authors' }),
    schema: z.object({
        name: z.string(),
        bio: z.string().optional(),
        avatar: z.string().optional(),
        email: z.email().optional(),
        website: z.url().optional(),
        social: z.object({
            github: z.string().optional(),
            twitter: z.string().optional(),
            weibo: z.string().optional(),
        }).optional(),
    }),
});

// 3. 定义 'questions' 集合（软考题库）
const questionsCollection = defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/questions' }),
    schema: questionSchema,
});

// 4. 导出所有已定义的集合
export const collections = {
    'blog': blogCollection,
    'authors': authorsCollection,
    'questions': questionsCollection,
};

// 5. 导出类型（供 TypeScript 使用）
// 注意：blogCollection 和 authorsCollection 的 schema 可能为函数类型，
// 因此不导出 BlogSchema 和 AuthorsSchema 以避免类型推断问题
export type QuestionSchema = z.infer<typeof questionSchema>;
export type OptionSchema = z.infer<typeof optionSchema>;
