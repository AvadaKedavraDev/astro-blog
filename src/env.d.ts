/// <reference types="astro/client" />

// Pagefind 类型
declare interface PagefindResult {
  id: string;
  score: number;
  data: () => Promise<{
    url: string;
    meta: { title?: string; [key: string]: unknown };
    excerpt: string;
    [key: string]: unknown;
  }>;
}

declare interface PagefindSearchResponse {
  results: PagefindResult[];
}

declare interface PagefindInstance {
  init: () => Promise<void>;
  search: (query: string) => Promise<PagefindSearchResponse>;
}

// Theme Manager 类型
declare interface ThemeManager {
  initialized: boolean;
  toggle: () => void;
  init: () => void;
  destroy: () => void;
}

// 声明全局变量
interface Window {
  // Pagefind
  pagefind?: PagefindInstance;
  
  // Theme Manager
  themeManager?: ThemeManager;
  
  // 初始化标记
  __searchInitialized?: boolean;
  __pagefindInitialized?: boolean;
}

// 声明模块
declare module 'astro-icon/components' {
  export const Icon: any;
}

// 环境变量
declare namespace App {
  interface ImportMetaEnv {
    readonly PUBLIC_IMG_BASE_URL: string;
  }
}
