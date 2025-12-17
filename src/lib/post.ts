// src/lib/post.ts
import { getCollection } from 'astro:content';

export async function getAdjacentPosts(currentSlug: string) {
    const allPosts = await getCollection('blog');

    // 按照日期排序（确保逻辑与列表页一致）
    const sortedPosts = allPosts.sort(
        (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
    );

    const currentIndex = sortedPosts.findIndex(post => post.slug === currentSlug);

    // 在日期降序排列中：
    // index - 1 是比当前文章“新”的文章（下一篇）
    // index + 1 是比当前文章“旧”的文章（上一篇）
    return {
        prev: currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : undefined,
        next: currentIndex > 0 ? sortedPosts[currentIndex - 1] : undefined
    };
}