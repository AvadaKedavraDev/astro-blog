/// <reference types="astro/client" />

// Swup 类型
declare interface SwupHooks {
  on: (event: string, callback: () => void) => void;
}

declare interface SwupInstance {
  hooks: SwupHooks;
  findPlugin: (name: string) => any;
}

// SwupCompat 类型
declare interface SwupCompatCallbacks {
  'page:view': Array<() => void>;
  'content:replace': Array<() => void>;
  'content:replace:before': Array<() => void>;
}

declare interface SwupCompatInstance {
  callbacks: SwupCompatCallbacks;
  __isReady__: boolean;
  onPageView: (callback: () => void, options?: { immediate?: boolean }) => (() => void);
  onContentReplace: (callback: () => void, options?: { immediate?: boolean }) => (() => void);
  beforeContentReplace: (callback: () => void) => (() => void);
  off: (event: keyof SwupCompatCallbacks, callback: () => void) => void;
  emit: (event: keyof SwupCompatCallbacks) => void;
  runScripts: () => void;
  init: () => void;
}

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
  // Swup
  swup?: SwupInstance;
  
  // SwupCompat
  SwupCompat?: SwupCompatInstance;
  
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

declare module '@swup/astro' {
  const swup: any;
  export default swup;
  export const Theme: {
    fade: string;
    slide: string;
    overlay: string;
  };
}
