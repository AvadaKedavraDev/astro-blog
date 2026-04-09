/**
 * @file post.ts
 * @description 文章相关的数据获取函数
 * @exports getPublishedPosts - 获取已发布文章
 * @exports getHomepagePosts - 获取首页推荐文章
 * @exports getAdjacentPosts - 获取相邻文章
 * @exports getRelatedPostsByTags - 根据标签获取相关文章
 */
// src/lib/post.ts
import { getCollection, type CollectionEntry } from 'astro:content';

type BlogPost = CollectionEntry<'blog'>;

function sortPostsByDate(posts: BlogPost[]): BlogPost[] {
    return [...posts].sort(
        (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );
}

function isFeaturedPost(post: BlogPost): boolean {
    return Boolean(post.data.featured || post.data.pinned);
}

export async function getPublishedPosts(): Promise<BlogPost[]> {
    const allPosts = await getCollection('blog');

    return sortPostsByDate(
        allPosts.filter(post => !post.data.draft)
    );
}

export async function getHomepagePosts(limit: number = 3): Promise<BlogPost[]> {
    const publishedPosts = await getPublishedPosts();
    const featuredPosts = publishedPosts.filter(isFeaturedPost);
    const featuredIds = new Set(featuredPosts.map(post => post.id));
    const latestPosts = publishedPosts.filter(post => !featuredIds.has(post.id));

    return [...featuredPosts, ...latestPosts].slice(0, limit);
}

export async function getAdjacentPosts(currentSlug: string) {
    const sortedPosts = await getPublishedPosts();

    const currentIndex = sortedPosts.findIndex(post => post.id === currentSlug);

    // 在日期降序排列中：
    // index - 1 是比当前文章"新"的文章（下一篇）
    // index + 1 是比当前文章"旧"的文章（上一篇）
    return {
        prev: currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : undefined,
        next: currentIndex > 0 ? sortedPosts[currentIndex - 1] : undefined
    };
}

/**
 * 获取与指定文章有相同标签的其他文章
 * @param currentSlug 当前文章 slug
 * @param currentTags 当前文章的标签数组
 * @param limit 返回文章数量限制
 * @returns 同标签文章列表（不包含当前文章）
 */
export async function getRelatedPostsByTags(
    currentSlug: string, 
    currentTags: string[] = [], 
    limit: number = 10
): Promise<CollectionEntry<'blog'>[]> {
    if (currentTags.length === 0) return [];
    
    const allPosts = await getPublishedPosts();
    
    // 过滤出包含相同标签的文章（排除当前文章）
    const relatedPosts = allPosts.filter(post => {
        if (post.id === currentSlug) return false;
        if (!post.data.tags || post.data.tags.length === 0) return false;
        
        // 检查是否有共同标签
        return post.data.tags.some(tag => currentTags.includes(tag));
    });
    
    // 按共同标签数量排序，然后按日期排序
    const sortedPosts = [...relatedPosts].sort((a, b) => {
        const aCommonTags = a.data.tags?.filter(tag => currentTags.includes(tag)).length || 0;
        const bCommonTags = b.data.tags?.filter(tag => currentTags.includes(tag)).length || 0;
        
        // 优先按共同标签数量排序
        if (bCommonTags !== aCommonTags) {
            return bCommonTags - aCommonTags;
        }
        
        // 其次按日期排序
        return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
    });
    
    return sortedPosts.slice(0, limit);
}

/**
 * 获取所有标签及其文章数量
 */
export async function getAllTags(): Promise<Map<string, number>> {
    const allPosts = await getPublishedPosts();
    const tagCounts = new Map<string, number>();
    
    allPosts.forEach(post => {
        post.data.tags?.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
    });
    
    return tagCounts;
}
