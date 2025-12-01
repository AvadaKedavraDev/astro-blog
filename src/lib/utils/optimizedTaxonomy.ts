// src/lib/optimizedTaxonomy.ts
import { getCollection, type CollectionEntry } from 'astro:content';

// 单例模式，确保只计算一次
class TaxonomyService {
    private static instance: TaxonomyService;
    private cache = new Map<string, any>();

    private constructor() { }

    public static getInstance(): TaxonomyService {
        if (!TaxonomyService.instance) {
            TaxonomyService.instance = new TaxonomyService();
        }
        return TaxonomyService.instance;
    }

    public async getTaxonomy(collection: string, field: string) {
        const cacheKey = `${collection}-${field}`;

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const allPosts = await getCollection(collection as 'blog');
        
        const allItems = allPosts.flatMap(post => post.data[field as 'categories' | 'tags']).filter((item): item is string => item !== undefined);

        console.log(allItems)
        console.log("---------------")
        const result = this.processTaxonomy(allItems, field);
        this.cache.set(cacheKey, result);
        console.log(result)
        console.log('********')
        return result;
    }

    private processTaxonomy(items: string[], field: string) {
        const counts = items.reduce((acc, item) => {
            acc[item] = (acc[item] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const uniqueItems = [...new Set(items)];

        return uniqueItems.map(item => ({
            name: item,
            slug: this.generateSlug(item),
            count: counts[item],
            url: `/${field}/${this.generateSlug(item)}`
        })).sort((a, b) => b.count - a.count); // 按数量排序
    }

    private generateSlug(text: string): string {
        return text.toLowerCase().replace(/\s+/g, '-');
    }
}

export const taxonomyService = TaxonomyService.getInstance();