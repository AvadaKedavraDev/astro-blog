// src/lib/post.ts
import { getCollection, type CollectionEntry } from 'astro:content';

export async function getAdjacentPosts(currentSlug: string) {
    const allPosts = await getCollection('blog');

    // 按照日期排序（确保逻辑与列表页一致）
    const sortedPosts = allPosts.sort(
        (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );

    const currentIndex = sortedPosts.findIndex(post => post.slug === currentSlug);

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
    
    const allPosts = await getCollection('blog');
    
    // 过滤出包含相同标签的文章（排除当前文章）
    const relatedPosts = allPosts.filter(post => {
        if (post.slug === currentSlug) return false;
        if (!post.data.tags || post.data.tags.length === 0) return false;
        
        // 检查是否有共同标签
        return post.data.tags.some(tag => currentTags.includes(tag));
    });
    
    // 按共同标签数量排序，然后按日期排序
    const sortedPosts = relatedPosts.sort((a, b) => {
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
    const allPosts = await getCollection('blog');
    const tagCounts = new Map<string, number>();
    
    allPosts.forEach(post => {
        post.data.tags?.forEach(tag => {
            tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
        });
    });
    
    return tagCounts;
}
