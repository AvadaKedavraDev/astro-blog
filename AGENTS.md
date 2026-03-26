# Moonpeak Astro Blog - Agent Guide

> 本文档面向 AI 编程助手，提供项目架构、开发规范和关键信息速查。

## 项目概述

**Moonpeak** 是一个基于 [Astro](https://astro.build) 构建的极简现代个人博客，追求极致的阅读体验与优雅的视觉设计。

- **项目类型**: 静态站点生成 (SSG)
- **语言**: TypeScript + Astro
- **主要受众**: 中文读者
- **代码注释语言**: 中文

## 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | [Astro](https://astro.build) | 5.x | 静态站点生成 |
| 样式 | [Tailwind CSS](https://tailwindcss.com) | 4.x | 原子化 CSS |
| 交互组件 | [SolidJS](https://www.solidjs.com) | 1.x | 客户端交互 |
| 代码高亮 | [Expressive Code](https://expressive-code.com) | 0.41.x | 代码块渲染 |
| 图标 | [Lucide](https://lucide.dev) + [astro-icon](https://www.astroicon.dev) | - | 矢量图标 |
| 搜索 | [Pagefind](https://pagefind.app) | 1.x | 静态搜索索引 |
| 页面过渡 | [Swup](https://swup.js.org) | 4.x | 平滑页面切换 |
| 数学公式 | [KaTeX](https://katex.org) | - | 数学排版 |

## 项目结构

```
moonpeak-astro/
├── src/
│   ├── components/          # 组件目录
│   │   ├── article/         # 文章相关组件
│   │   │   ├── ArticleNavigation.astro    # 文章上下篇导航
│   │   │   └── RelatedPostsByTag.astro    # 相关文章推荐
│   │   ├── common/          # 通用组件
│   │   │   ├── Navigation.astro           # 顶部导航栏（集成 Command Palette）
│   │   │   ├── Footer.astro               # 页脚（含建站时间统计）
│   │   │   ├── TableOfContents.astro      # 文章目录（自动高亮）
│   │   │   ├── Pagination.astro           # 分页组件
│   │   │   ├── ArticleDrawer.astro        # 文章抽屉
│   │   │   ├── FansWall.astro             # 粉丝墙
│   │   │   ├── SwupCompat.astro           # Swup 生命周期管理
│   │   │   └── SwupScrollConfig.astro     # Swup 滚动配置（已弃用，功能合并至 SwupCompat）
│   │   ├── exam/            # 考试系统组件
│   │   │   ├── Badge.astro                # 徽章组件
│   │   │   ├── QuestionCard.astro         # 题目卡片
│   │   │   ├── InteractiveQuestionCard.astro  # 交互式题目卡片
│   │   │   ├── ProgressBar.astro          # 进度条
│   │   │   ├── FavoriteButton.tsx         # 收藏按钮（SolidJS）
│   │   │   └── OptionGroup.tsx            # 选项组（SolidJS）
│   │   ├── ui/              # UI 组件
│   │   │   ├── ReadingProgress.astro      # 阅读进度条
│   │   │   ├── ScrollToTop.astro          # 返回顶部
│   │   │   ├── TypeWriter.astro           # 打字机动画
│   │   │   ├── BookMarkManager.astro      # 书签管理器
│   │   │   ├── SplashModal.astro          # 开屏弹窗
│   │   │   ├── TopNotification.astro      # 顶部通知栏
│   │   │   ├── Image.astro                # 图片组件（灯箱）
│   │   │   ├── OptimizedImage.astro       # 优化图片组件
│   │   │   ├── AnimatedBackground.astro   # 动态背景
│   │   │   ├── MicroInteractions.astro    # 微交互效果（磁性按钮、3D卡片等）
│   │   │   ├── TiltCard.astro             # 倾斜卡片效果
│   │   │   ├── FloatingSymbols.astro      # 浮动符号背景
│   │   │   ├── GeometricGrid.astro        # 几何网格背景
│   │   │   └── CommandPalette.astro       # 命令面板（Cmd+K）
│   │   ├── widgets/         # 小部件
│   │   │   ├── SEO.astro                  # SEO 元信息
│   │   │   └── ThemeIcon.astro            # 主题切换按钮
│   │   ├── lib/
│   │   │   └── utils.ts                   # 工具函数 (cn)
│   │   └── visualizer/      # 算法可视化
│   │       ├── demos/                     # 可视化演示
│   │       ├── store.ts                   # 状态管理
│   │       ├── types.ts                   # 类型定义
│   │       ├── AlgorithmVisualizer.tsx    # 可视化主组件
│   │       ├── VisualCanvas.tsx           # 可视化画布
│   │       ├── PanZoomCanvas.tsx          # 平缩放画布
│   │       ├── PlayerControls.tsx         # 播放器控制
│   │       ├── CodePanel.tsx              # 代码面板
│   │       └── VisualizerClient.tsx       # 客户端包装器
│   ├── layouts/             # 布局组件
│   │   ├── BaseLayout.astro               # 基础布局
│   │   ├── ArticleLayout.astro            # 文章页布局（三栏）
│   │   └── ExamLayout.astro               # 考试页面布局
│   ├── pages/               # 页面路由
│   │   ├── index.astro                    # 首页
│   │   ├── blog/                          # 文章列表/详情
│   │   │   ├── index.astro                # 文章列表页
│   │   │   ├── [...slug].astro            # 文章详情页
│   │   │   └── page/[page].astro          # 分页列表
│   │   ├── tags/                          # 标签页
│   │   │   ├── index.astro                # 标签列表
│   │   │   └── [tag].astro                # 单个标签页
│   │   ├── exam/                          # 考试系统
│   │   │   ├── index.astro                # 考试首页
│   │   │   └── practice/[subject]/[id].astro  # 练习题页面
│   │   ├── about.astro                    # 关于页面
│   │   ├── search.astro                   # 搜索页面 (Pagefind)
│   │   ├── links.astro                    # 工具箱页面
│   │   ├── fanswall.astro                 # 粉丝墙页面
│   │   ├── resume.astro                   # 简历页面
│   │   ├── remote.astro                   # 远程页面
│   │   ├── visualizer.astro               # 算法可视化页面
│   │   ├── exam-demo.astro                # 考试演示页面
│   │   └── exam-demo-interactive.astro    # 交互式考试演示
│   ├── content/             # 内容集合
│   │   ├── blog/                          # 博客文章（Markdown）
│   │   │   ├── astro/                     # Astro 相关
│   │   │   ├── commands/                  # 命令速查表
│   │   │   ├── database/                  # 数据库
│   │   │   ├── docker/                    # Docker
│   │   │   ├── javaee/                    # Java EE
│   │   │   ├── llm/                       # LLM/AI
│   │   │   ├── middleware/                # 中间件
│   │   │   ├── openclaw/                  # OpenClaw
│   │   │   ├── spring/                    # Spring
│   │   │   ├── test/                      # 测试/模板
│   │   │   ├── deploy/                    # 部署相关
│   │   │   └── work/                      # 工作记录
│   │   └── questions/                     # 题库数据（YAML/JSON）
│   │       └── system-architect/          # 系统架构设计师题库
│   ├── lib/                 # 工具函数
│   │   ├── post.ts                        # 文章数据处理
│   │   ├── examDB.ts                      # 考试系统数据库
│   │   └── examStore.ts                   # 考试状态管理
│   ├── types/               # 类型定义
│   │   └── exam.ts                        # 考试系统类型
│   ├── plugins/             # 自定义插件
│   │   └── remark-img-bed.mjs             # 图床图片转换
│   ├── styles/              # 全局样式
│   │   └── global.css                     # Tailwind + 自定义样式
│   ├── content.config.ts    # 内容集合配置
│   └── env.d.ts             # 环境类型声明
├── public/                  # 静态资源
│   ├── fonts/               # 本地字体文件
│   ├── images/              # 图片资源
│   ├── local-images/        # 本地开发图片
│   ├── favicon*.svg/png     # 网站图标
│   ├── katex.min.css        # KaTeX 样式
│   └── robots.txt           # 爬虫规则
├── scripts/                 # 构建脚本
│   ├── optimize-images.mjs  # 图片优化
│   └── optimize-favicon.mjs # Favicon 优化
├── astro.config.mjs         # Astro 配置
├── tsconfig.json            # TypeScript 配置
├── package.json             # 依赖管理
├── .env                     # 环境变量（开发）
└── .env.production          # 环境变量（生产）
```

## 构建命令

```bash
# 开发服务器（支持局域网访问）
npm run dev

# 生产构建（自动触发 Pagefind 搜索索引）
npm run build

# 预览生产构建
npm run preview

# 仅运行 Astro CLI
npm run astro
```

### 构建流程说明

1. `npm run build` 执行两步：
   - `astro build` - 生成静态站点到 `dist/` 目录
   - `npx pagefind --site dist` - 为 dist 内容生成搜索索引

2. 搜索功能**仅在构建后可用**，开发模式会显示提示信息

## 路径别名 (tsconfig.json)

```typescript
import Component from "@components/ui/Component.astro";
import Layout from "@layouts/Layout.astro";
import { fn } from "@lib/utils";
import { getPosts } from "@lib/post";

// 别名映射:
// @components/* -> src/components/*
// @layouts/*   -> src/layouts/*
// @lib/*       -> src/lib/*
// @utils/*     -> src/utils/*
// @assets/*    -> src/assets/*
// @constants/* -> src/constants/*
// @i18n/*      -> src/i18n/*
// @/*          -> src/*
```

## 内容集合配置

文章使用 Astro Content Collections 管理，配置在 `src/content.config.ts`:

### 博客文章 Schema

```typescript
{
  title: string;           // 必填 - 文章标题
  pubDate: Date;           // 必填 - 发布日期
  description?: string;    // 可选 - 文章描述
  tags?: string[];         // 可选 - 标签
  categories?: string[];   // 可选 - 分类
  author?: string;         // 可选 - 作者
  readingTime?: number;    // 可选 - 阅读时间(分钟)
  coverImage?: string;     // 可选 - 封面图路径
  image?: string;          // 可选 - 兼容旧字段
  draft?: boolean;         // 可选 - 是否为草稿，默认 false
  featured?: boolean;      // 可选 - 是否置顶，默认 false
  pinned?: boolean;        // 可选 - 置顶标记（等同于 featured）
  updatedDate?: Date;      // 可选 - 更新日期
  aliases?: string[];      // 可选 - URL 别名/重定向
  relatedPosts?: string[]; // 可选 - 相关文章引用
  series?: {               // 可选 - 系列文章
    name: string;
    order: number;
  };
  seo?: {                  // 可选 - SEO 设置
    title?: string;
    description?: string;
    noindex?: boolean;
    nofollow?: boolean;
  };
  license?: string;        // 可选 - 版权信息
}
```

### 题库 Schema

```typescript
{
  id: string;              // 必填 - 题目唯一标识
  chapter: string;         // 必填 - 所属章节
  difficulty: number;      // 必填 - 难度 1-5
  type: 'single' | 'multiple' | 'judge';  // 必填 - 题目类型
  subject: string;         // 可选 - 科目，默认 'system-architect'
  content: string;         // 必填 - 题目内容
  options?: Option[];      // 可选 - 选项列表
  explanation: string;     // 必填 - 答案解析
  knowledgePoints: string[];  // 必填 - 知识点标签
}
```

### 创建新文章

1. 在 `src/content/blog/{category}/` 下创建 `.md` 或 `.mdx` 文件
2. 参考 `src/content/blog/test/template.md` 了解完整 Markdown 功能
3. 使用 `> [!note]`, `> [!tip]`, `> [!warning]` 等语法创建 Callout

### 文章模板示例

```markdown
---
title: "文章标题"
pubDate: 2024-01-15
description: "文章简介"
tags: ["标签1", "标签2"]
categories: ["分类"]
author: "作者名"
readingTime: 5
coverImage: "/images/cover.jpg"
draft: false
---

## 正文开始

正文内容...
```

## 样式系统

### CSS 变量 (global.css)

```css
:root {
  --background: #fafafa;
  --foreground: #171717;
  --muted: #f5f5f5;
  --muted-foreground: #646262;
  --border: #e5e5e5;
  --primary: #171717;
  --card: #ffffff;
  --radius: 0.75rem;
  
  /* 文章阅读变量 */
  --article-font-size: 1.05rem;
  --article-line-height: 1.9;
  
  /* 字体变量 */
  --font-ui: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-body: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  --font-code: "SF Mono", Menlo, Monaco, Consolas, monospace;
  
  /* 专业文档风格颜色变量 */
  --prose-text: #1f2937;
  --prose-heading: #1e40af;
  --prose-link: #2563eb;
}

.dark {
  --background: #0a0a0a;
  --foreground: #cae4fe;
  /* ... */
}
```

### 预设类名

| 类名 | 用途 |
|------|------|
| `.prose-custom` | 文章正文样式（使用 CSS 变量）|
| `.container-narrow` | 窄版容器 (max-width: 48rem) |
| `.container-medium` | 中等容器 (max-width: 64rem) |
| `.container-wide` | 宽版容器 (max-width: 80rem) |
| `.card-base` | 卡片基础样式 |
| `.tag-base` | 标签基础样式 |
| `.input-base` | 输入框基础样式 |
| `.btn` / `.btn-ghost` / `.btn-secondary` | 按钮样式 |
| `.glass` | 玻璃态效果 |
| `.gradient-text` | 渐变文字 |
| `.divider-subtle` | 渐变分隔线 |

### 交互类名

| 类名 | 效果 |
|------|------|
| `.interactive-text` | 文字悬停高亮 |
| `.interactive-item` | 列表项悬停背景 |
| `.interactive-btn` | 按钮悬停效果 |
| `.nav-link-interactive` | 导航链接悬停 |
| `.tag-interactive` | 标签悬停反转 |
| `.article-title-link` | 文章标题悬停 |
| `.pagination-btn` | 分页按钮 |
| `.link-hover-center` | 链接下划线从中心展开 |

### 容器查询类名

| 类名 | 说明 |
|------|------|
| `.cq-container` | 标记为容器查询容器 |
| `.cq-text-sm/base/lg` | 基于容器宽度的响应式文本 |
| `.cq-grid-1/2/3` | 基于容器宽度的网格布局 |

## 关键集成配置

### Expressive Code (代码高亮)

配置在 `astro.config.mjs`:
- 主题: catppuccin-latte-custom (浅色) + houston (深色)
- 插件: `@expressive-code/plugin-collapsible-sections`
- 特性: 代码折叠、语法高亮、复制按钮

### Swup (页面过渡)

- 主题: fade (100ms 淡入淡出)
- 全局实例启用 (支持 Scroll Plugin)
- 选择器: `a[href]:not([data-no-swup]):not([href^="#"])`
- **可访问性**: 内置 ARIA live 区域，支持屏幕阅读器通知
- **动画偏好**: 自动检测 `prefers-reduced-motion`，尊重用户偏好

#### 配置说明

Swup 配置在 `astro.config.mjs` 中：

```javascript
swup({
    theme: [Theme.fade, {
        duration: 100,      // 必须与 CSS 动画时长一致
        delay: 0,
        easing: 'ease-in-out',
    }],
    globalInstance: true,   // 启用全局实例以支持插件配置
    // 其他选项由 @swup/astro 自动处理
}),
```

**重要**: CSS 动画时长（`global.css` 中的 `.transition-fade`）必须与 JS 配置的 `duration` 保持一致（100ms），否则会导致动画不同步。

### SwupCompat 组件

统一的生命周期管理工具，位于 `src/components/common/SwupCompat.astro`，遵循 Swup 官方最佳实践，提供以下功能：

#### API 参考

```typescript
// 页面切换完成后执行（最常用）
window.SwupCompat.onPageView(callback, { 
  immediate: true,              // 是否立即执行一次
  respectMotionPreference: true // 是否尊重用户的减少动画偏好
})

// 内容替换前执行（用于清理）
window.SwupCompat.beforeContentReplace(callback)

// 移除回调
window.SwupCompat.off(event, callback)

// 触发回调
window.SwupCompat.emit(event)

// 初始化代码组（rehype-code-group）
window.SwupCompat.initCodeGroups()

// 运行脚本插件
window.SwupCompat.runScripts()

// 配置 Scroll Plugin（官方推荐方式）
window.SwupCompat.configureScrollPlugin({
  offset: 96,                   // 滚动偏移量（像素）
  animateScroll: true,          // 是否启用平滑滚动
  doScrollingRightAway: false   // 是否在内容替换前就开始滚动
})

// 清理动态内容（在页面切换前自动调用）
window.SwupCompat.cleanup()

// 更新 ARIA 通知（屏幕阅读器支持）
window.SwupCompat.updateA11yNotification('页面已加载')

// 动画偏好检测
window.SwupCompat.prefersReducedMotion  // boolean

// 内部状态（只读）
window.SwupCompat.__isReady__  // boolean - 是否已完成初始化
```

#### 使用最佳实践

**1. 基本用法 - 页面切换后初始化**
```javascript
<script is:inline data-swup-ignore-script>
  (function() {
    function init() {
      // 组件初始化逻辑
      console.log('组件已初始化');
    }
    
    if (window.SwupCompat) {
      window.SwupCompat.onPageView(init);
    } else {
      // 降级处理
      document.addEventListener('astro:page-load', init);
    }
    
    // 首次加载执行
    init();
  })();
</script>
```

**2. 尊重动画偏好**
```javascript
<script is:inline data-swup-ignore-script>
  (function() {
    function initAnimation() {
      // 检查动画偏好
      if (window.SwupCompat?.prefersReducedMotion) {
        // 用户偏好减少动画，使用简单过渡
        document.body.classList.add('reduced-motion');
      } else {
        // 正常动画
        document.body.classList.add('full-animation');
      }
    }
    
    if (window.SwupCompat) {
      // respectMotionPreference 默认为 true
      window.SwupCompat.onPageView(initAnimation);
    }
    
    initAnimation();
  })();
</script>
```

**3. 清理逻辑 - 页面切换前执行**
```javascript
<script is:inline data-swup-ignore-script>
  (function() {
    let eventListeners = [];
    
    function init() {
      // 添加事件监听
      const handler = () => console.log('事件触发');
      document.addEventListener('custom-event', handler);
      eventListeners.push(handler);
    }
    
    function cleanup() {
      // 清理事件监听
      eventListeners.forEach(handler => {
        document.removeEventListener('custom-event', handler);
      });
      eventListeners = [];
    }
    
    if (window.SwupCompat) {
      window.SwupCompat.onPageView(init);
      window.SwupCompat.beforeContentReplace(cleanup);
    }
    
    init();
  })();
</script>
```

### Pagefind (搜索)

- 在构建时自动生成索引
- 搜索页面: `/search`
- 自动排除 draft 文章
- 开发模式下不可用，需构建后预览

### Command Palette (命令面板)

现代博客标配功能，位于 `src/components/ui/CommandPalette.astro`:

**快捷键:**
- `Cmd/Ctrl + K` - 打开/关闭命令面板
- `↑/↓` - 导航选择
- `Enter` - 执行选中项
- `ESC` - 关闭面板
- `G + [字母]` - 快捷导航（如 G+H 到首页，G+B 到文章）

**功能分类:**
- **快速导航**: 首页(G+H)、文章(G+B)、关于(G+A)、标签(G+T)等
- **操作命令**: 切换主题(G+D)、返回顶部、复制链接
- **文章搜索**: 集成 Pagefind，实时搜索文章内容

### Remark/Rehype 插件

- `remark-gfm` - GitHub Flavored Markdown
- `remark-breaks` - 支持 MD 换行
- `remark-callouts` - Callout 提示框
- `remark-math` + `rehype-katex` - 数学公式
- `rehype-code-group` - 代码分组
- `remark-img-bed` (自定义) - 图床图片路径转换

### 图床配置

自定义 remark 插件 `src/plugins/remark-img-bed.mjs` 处理图片路径：

- **开发模式**: 图片路径转为 `/local-images/xxx.jpg`
- **生产模式**: 图片路径转为 `https://cdn.image.moonpeak.cn/xxx.jpg`

环境变量配置：
```bash
# .env (开发)
PUBLIC_IMG_BASE_URL=/local-images/
PUBLIC_QUIZ_API_URL=http://localhost:3001/api

# .env.production
PUBLIC_IMG_BASE_URL=https://cdn.image.moonpeak.cn/
```

## 开发规范

### 组件文件头注释

```typescript
---
/**
 * @component ComponentName
 * @description 组件功能描述
 * @features 主要特性列表
 * @props propName - 属性说明
 * @usage 使用示例
 */
---
```

### 布局组件文件头注释

```typescript
---
/**
 * @layout LayoutName
 * @description 布局功能描述
 * @features 主要特性列表
 * @props propName - 属性说明
 * @usage 使用示例
 */
---
```

### 工具函数注释

```typescript
/**
 * 函数功能描述
 * @param paramName 参数说明
 * @returns 返回值说明
 * @example 使用示例
 */
```

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `ArticleNavigation.astro` |
| 工具函数 | camelCase | `getAdjacentPosts` |
| 常量 | UPPER_SNAKE_CASE | `SITE_BIRTH` |
| CSS 类 | kebab-case | `article-layout` |
| 文件 | kebab-case | `content.config.ts` |

### 客户端脚本规范

使用 `is:inline` 属性避免打包，并添加 TypeScript 忽略注释：

```astro
<script is:inline data-swup-ignore-script>
  // @ts-nocheck - 这是一个纯 JavaScript 文件，禁用 TypeScript 检查
  (function() {
    // 脚本逻辑
  })();
</script>
```

### SolidJS 组件规范

#### 1. 列表渲染必须添加 key 属性

为 `For` 组件添加 `key` 属性以优化渲染性能：

```tsx
// ✅ 推荐：使用字符串指定对象属性名
<For each={items} key="id">
  {(item) => <ItemComponent {...item} />}
</For>

// ✅ 推荐：使用函数自定义 key（接收列表项作为参数）
<For each={connections} key={item => `${item.from}-${item.to}`}>
  {(conn) => <ConnectionLine {...conn} />}
</For>

// ✅ 推荐：字符串数组使用值本身作为 key
<For each={categories} key={cat => cat}>
  {(category) => <CategoryButton name={category} />}
</For>

// ❌ 避免：不添加 key 属性
<For each={items}>
  {(item) => <ItemComponent {...item} />}
</For>

// ❌ 错误：key 中使用回调参数（此时还未定义）
<For each={categories} key={category}>  {/* category 未定义！ */}
  {(category) => <span>{category}</span>}
</For>
```

#### 2. Store 使用最佳实践

```tsx
// ✅ 使用 produce 进行批量更新
import { produce } from 'solid-js/store';

setState(produce(s => {
  s.player.currentStep = stepIndex;
  s.player.progress = progress;
}));

// ✅ 分离状态和管理逻辑
export function createVisualizerStore(config: Config) {
  const [state, setState] = createStore({...});
  const controls = { play, pause, stop };
  return { state, controls };
}
```

#### 3. 生命周期管理

```tsx
// ✅ 正确清理副作用
onCleanup(() => {
  if (playTimer) {
    clearTimeout(playTimer);
    playTimer = null;
  }
});

// ✅ 组件卸载时停止操作
onCleanup(() => {
  store.controls.stop();
});
```

### Swup 脚本标记

对于需要在页面过渡后重新执行的脚本：

```astro
<!-- 普通脚本 - 不会被 Swup 重新执行 -->
<script is:inline>
  // 初始化逻辑
</script>

<!-- 需要 Swup 重新加载的脚本 -->
<script data-swup-reload-script>
  // 页面切换后重新执行
</script>

<!-- 忽略脚本（Swup Scripts Plugin 不执行） -->
<script is:inline data-swup-ignore-script>
  // 全局一次性脚本
</script>
```

## 核心组件说明

### Navigation (导航栏)

- 固定顶部，玻璃态效果
- 响应式：桌面水平导航 / 移动端抽屉菜单
- 当前页面高亮自动更新
- 集成 Command Palette（Cmd/Ctrl+K）
- 主题切换按钮
- 下拉菜单支持

### CommandPalette (命令面板)

- 快捷键 `Cmd/Ctrl + K` 唤起
- 支持文章搜索（Pagefind 集成）
- 快速导航跳转
- 常用操作快捷方式
- 键盘完全可控（方向键、Enter、ESC）
- 移动端适配

### ArticleLayout (文章布局)

- 三栏布局：左侧相关文章、中间正文、右侧目录
- 支持侧边栏收起/展开（状态持久化到 localStorage）
- 图片灯箱功能（点击放大、滚轮缩放、拖拽移动）
- 阅读进度条

### ThemeIcon (主题切换)

- 全局单例模式管理主题状态
- localStorage 持久化
- 支持系统偏好检测
- 自定义事件 `themechange` 供其他组件监听

### TableOfContents (文章目录)

- IntersectionObserver 优化性能
- 自动高亮当前阅读位置
- 平滑滚动到对应章节

### Footer (页脚)

- 动态计算并显示网站运行时间
- 可配置建站日期（修改 `SITE_BIRTH` 常量）
- ICP 备案信息展示

## 考试系统

项目包含完整的软考（系统架构设计师）题库功能：

### 数据层

- **examDB.ts**: 客户端数据持久化（localStorage）
  - 错题本管理
  - 收藏题目管理
  - 答题历史记录
  
- **examStore.ts**: 全局状态管理
  - 答题状态
  - 练习进度
  - 统计信息

### 题目数据结构

题库数据存储在 `src/content/questions/system-architect/` 目录下，使用 YAML 格式：

```yaml
id: "sa-001"
chapter: "计算机系统基础"
difficulty: 3
type: "single"
subject: "system-architect"
content: "题目内容..."
options:
  - id: "A"
    text: "选项A内容"
    isCorrect: true
  - id: "B"
    text: "选项B内容"
    isCorrect: false
explanation: "答案解析..."
knowledgePoints: ["知识点1", "知识点2"]
```

### 功能特性

- 章节练习
- 随机练习
- 错题本复习
- 收藏题目
- 答题统计
- 进度追踪

## 算法可视化

项目包含算法可视化框架，用于演示数据结构和算法：

### 支持的演示类型

- 数组操作
- 链表操作
- 哈希表（HashMap）
- 树结构
- 图算法

### 组件架构

- **AlgorithmVisualizer.tsx**: 主容器组件
- **VisualCanvas.tsx**: SVG 渲染画布
- **PanZoomCanvas.tsx**: 支持平移缩放的画布
- **PlayerControls.tsx**: 播放控制（播放/暂停/步进/速度）
- **CodePanel.tsx**: 代码高亮和当前执行行指示

## 环境变量

| 变量名 | 环境 | 说明 |
|--------|------|------|
| `PUBLIC_IMG_BASE_URL` | 开发 | `/local-images/` |
| `PUBLIC_IMG_BASE_URL` | 生产 | `https://cdn.image.moonpeak.cn/` |
| `PUBLIC_QUIZ_API_URL` | 开发 | `http://localhost:3001/api` |

## 性能优化

1. **图片**: 使用 Sharp 进行优化，图床 CDN 加速
2. **字体**: 系统字体优先，本地字体文件，避免外部 CDN
3. **JS**: 零 JS 默认，交互按需加载 (SolidJS 组件)
4. **CSS**: Tailwind 4.x 按需生成，CSS 变量系统减少重复
5. **搜索**: Pagefind 静态索引，无服务端依赖
6. **Swup**: 页面过渡减少整页刷新
7. **懒加载**: 图片使用 `loading="lazy"`
8. **预取**: 基于视口的链接预取（Prefetch）

## 部署

生成纯静态文件，支持任何静态托管:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages
- Docker (nginx)

构建输出目录: `dist/`

### Docker 部署示例

```dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

## 注意事项

1. **主题切换**: 主题初始化脚本在 `BaseLayout.astro` 中内联执行，防止闪烁
2. **Swup 兼容**: 页面过渡需要 `SwupCompat` 组件统一管理生命周期
3. **KaTeX 样式**: 数学公式需要 `/katex.min.css` 在 `BaseLayout` 中加载
4. **Content Collections**: 修改 `content.config.ts` 后需重启开发服务器
5. **搜索功能**: 仅在构建后可用，开发模式显示提示信息
6. **图片路径**: 开发/生产环境使用不同的图床基础 URL

### Swup 最佳实践

1. **动画时长一致性**: CSS 中的 `.transition-fade` 动画时长（100ms）必须与 `astro.config.mjs` 中的 `duration` 配置保持一致
2. **脚本标记**: 
   - 一次性全局脚本使用 `data-swup-ignore-script`
   - 需要每次页面切换后重新执行的脚本使用 `data-swup-reload-script`
   - 使用 `SwupCompat.onPageView()` 注册回调替代直接监听事件
3. **动画偏好**: 始终尊重用户的 `prefers-reduced-motion` 设置，可通过 `SwupCompat.prefersReducedMotion` 检测
4. **Scroll Plugin**: 不要直接修改 `scrollPlugin.options`，使用 `SwupCompat.configureScrollPlugin()` 或等待 Swup hooks

### Swup 页面初始化问题

**如果创建需要客户端数据加载的页面，可以使用 `SwupCompat`：**

1. 使用 `<script is:inline data-swup-ignore-script>` 标记脚本
2. 使用 `window.SwupCompat.onPageView(callback)` 注册页面切换回调
3. 在回调函数中执行数据加载逻辑

**示例：**
```javascript
<script is:inline data-swup-ignore-script>
  (function() {
    function loadData() {
      // 加载数据逻辑
    }
    
    if (window.SwupCompat) {
      window.SwupCompat.onPageView(loadData);
    }
    
    // 首次加载执行
    loadData();
  })();
</script>
```

### Swup 动画不同步

**症状**: 页面过渡时动画闪烁或时长不一致

**解决方案**:
1. 检查 `astro.config.mjs` 中的 `duration` 是否与 `global.css` 中的 `.transition-fade` 动画时长一致（都应为 100ms）
2. 确保 CSS 选择器正确：
   ```css
   html.is-changing .transition-fade { /* 动画开始状态 */ }
   html.is-animating .transition-fade { /* 动画执行状态 */ }
   ```

### Swup Scroll Plugin 不生效

**症状**: 锚点跳转时被导航栏遮挡

**解决方案**:
1. 确保 `SwupCompat` 组件已正确加载
2. 检查控制台是否有 `[SwupCompat] Binding to swup hooks` 日志
3. 确认 `configureScrollPlugin({ offset: 96 })` 中的 offset 值是否正确

### 减少动画偏好被忽略

**症状**: 用户设置了减少动画但页面仍有动画效果

**解决方案**:
1. 使用 `window.SwupCompat.prefersReducedMotion` 检测用户偏好
2. 确保 `onPageView` 的 `respectMotionPreference` 选项为 `true`（默认值）
3. CSS 动画也应添加 `@media (prefers-reduced-motion: reduce)` 媒体查询

## 安全考虑

1. **XSS 防护**: Astro 默认对输出进行转义
2. **外部链接**: 使用 `rel="noopener"` 防止标签页钓鱼
3. **依赖更新**: 定期运行 `npm audit` 检查漏洞
4. **输入验证**: 内容集合使用 Zod Schema 验证

## 故障排除

### 搜索不工作
- 确保已运行 `npm run build` 生成 Pagefind 索引
- 开发模式下搜索功能不可用

### 样式不生效
- 检查是否正确导入 `global.css`
- Tailwind 4.x 使用 `@import` 而非 `@tailwind` 指令

### Swup 过渡异常
- 确保 `SwupCompat` 组件已加载
- 检查脚本是否有 `data-swup-ignore-script` 标记

### 图片不显示
- 开发环境检查 `PUBLIC_IMG_BASE_URL` 配置
- 确保图片路径正确（相对路径会被转换）

### 题库数据不加载
- 检查 `src/content/questions/` 目录结构
- 确保 YAML 格式正确，符合 Zod Schema
- 修改配置后需重启开发服务器

---

*最后更新: 2026-03-26* - 添加考试系统、算法可视化、容器查询等文档
