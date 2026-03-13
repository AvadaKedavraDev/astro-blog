# Moonpeak Astro Blog - Agent Guide

> 本文档面向 AI 编程助手，提供项目架构、开发规范和关键信息速查。

## 项目概述

**Moonpeak** 是一个基于 [Astro](https://astro.build) 构建的极简现代个人博客，追求极致的阅读体验与优雅的视觉设计。

- **项目类型**: 静态站点生成 (SSG)
- **语言**: TypeScript + Astro
- **主要受众**: 中文读者
- **代码注释语言**: 中文

## 技术栈

| 类别 | 技术 | 版本 |
|------|------|------|
| 框架 | [Astro](https://astro.build) | 5.x |
| 样式 | [Tailwind CSS](https://tailwindcss.com) | 4.x |
| 交互组件 | [SolidJS](https://www.solidjs.com) | 1.x |
| 代码高亮 | [Expressive Code](https://expressive-code.com) | 0.41.x |
| 图标 | [Lucide](https://lucide.dev) + [astro-icon](https://www.astroicon.dev) | - |
| 搜索 | [Pagefind](https://pagefind.app) | 1.x |
| 页面过渡 | [Swup](https://swup.js.org) | 4.x |
| 数学公式 | [KaTeX](https://katex.org) | - |

## 项目结构

```
moonpeak-astro/
├── src/
│   ├── components/          # 组件目录
│   │   ├── article/         # 文章相关组件
│   │   │   ├── ArticleNavigation.astro    # 文章上下篇导航
│   │   │   └── RelatedPostsByTag.astro    # 相关文章推荐
│   │   ├── common/          # 通用组件
│   │   │   ├── Navigation.astro           # 顶部导航栏
│   │   │   ├── Footer.astro               # 页脚（含建站时间统计）
│   │   │   ├── TableOfContents.astro      # 文章目录（自动高亮）
│   │   │   ├── Pagination.astro           # 分页组件
│   │   │   ├── ArticleDrawer.astro        # 文章抽屉
│   │   │   ├── SwupCompat.astro           # Swup 生命周期管理
│   │   │   └── SwupScrollConfig.astro     # Swup 滚动配置
│   │   ├── ui/              # UI 组件
│   │   │   ├── ReadingProgress.astro      # 阅读进度条
│   │   │   ├── ScrollToTop.astro          # 返回顶部
│   │   │   ├── TypeWriter.astro           # 打字机动画
│   │   │   ├── BookMarkManager.astro      # 书签管理器
│   │   │   ├── SplashModal.astro          # 开屏弹窗
│   │   │   ├── TopNotification.astro      # 顶部通知栏
│   │   │   └── Image.astro                # 图片组件（灯箱）
│   │   ├── widgets/         # 小部件
│   │   │   ├── SEO.astro                  # SEO 元信息
│   │   │   └── ThemeIcon.astro            # 主题切换按钮
│   │   └── lib/
│   │       └── utils.ts                   # 工具函数 (cn)
│   ├── layouts/             # 布局组件
│   │   ├── BaseLayout.astro               # 基础布局
│   │   └── ArticleLayout.astro            # 文章页布局（三栏）
│   ├── pages/               # 页面路由
│   │   ├── index.astro                    # 首页
│   │   ├── blog/                          # 文章列表/详情
│   │   │   ├── index.astro                # 文章列表页
│   │   │   ├── [...slug].astro            # 文章详情页
│   │   │   └── page/[page].astro          # 分页列表
│   │   ├── tags/                          # 标签页
│   │   │   ├── index.astro                # 标签列表
│   │   │   └── [tag].astro                # 单个标签页
│   │   ├── about.astro                    # 关于页面
│   │   ├── search.astro                   # 搜索页面 (Pagefind)
│   │   ├── links.astro                    # 工具箱页面
│   │   ├── fanswall.astro                 # 粉丝墙页面
│   │   ├── remote.astro                   # 远程页面
│   │   └── visualizer.astro               # 算法可视化页面
│   ├── content/             # 内容集合（博客文章）
│   │   └── blog/
│   │       ├── astro/                     # Astro 相关
│   │       ├── commands/                  # 命令速查表
│   │       ├── database/                  # 数据库
│   │       ├── docker/                    # Docker
│   │       ├── javaee/                    # Java EE
│   │       ├── llm/                       # LLM/AI
│   │       ├── openclaw/                  # OpenClaw
│   │       ├── spring/                    # Spring
│   │       ├── test/                      # 测试/模板
│   │       └── work/                      # 工作记录
│   ├── lib/                 # 工具函数
│   │   └── post.ts                        # 文章数据处理
│   ├── styles/              # 全局样式
│   │   └── global.css                     # Tailwind + 自定义样式
│   ├── content.config.ts    # 内容集合配置
│   └── env.d.ts             # 环境类型声明
├── public/                  # 静态资源
│   ├── fonts/               # 本地字体文件
│   ├── images/              # 图片资源
│   └── favicon*.svg/png     # 网站图标
├── scripts/                 # 构建脚本
│   └── optimize-images.mjs  # 图片优化
├── astro.config.mjs         # Astro 配置
├── tsconfig.json            # TypeScript 配置
└── package.json
```

## 构建命令

```bash
# 开发服务器（支持局域网访问）
npm run dev

# 生产构建（自动触发 Pagefind 搜索索引）
npm run build

# 预览生产构建
npm run preview
```

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
// @/*          -> src/*
```

## 内容集合配置

文章使用 Astro Content Collections 管理，配置在 `src/content.config.ts`:

```typescript
// 博客文章 Schema
{
  title: string;           // 必填 - 文章标题
  pubDate: Date;           // 必填 - 发布日期
  description?: string;    // 可选 - 文章描述
  tags?: string[];         // 可选 - 标签
  categories?: string[];   // 可选 - 分类
  author?: string;         // 可选 - 作者
  readingTime?: number;    // 可选 - 阅读时间(分钟)
  coverImage?: string;     // 可选 - 封面图路径
  draft?: boolean;         // 可选 - 是否为草稿
}
```

### 创建新文章

1. 在 `src/content/blog/{category}/` 下创建 `.md` 文件
2. 参考 `src/content/blog/test/template.md` 了解完整 Markdown 功能
3. 使用 `> [!note]`, `> [!tip]`, `> [!warning]` 等语法创建 Callout

### 命令速查表目录

`src/content/blog/commands/` 目录用于记录各类常用命令：
- `template.md` - 命令速查表模板
- `linux-cheatsheet.md` - Linux 命令
- `kimicode-cheatsheet.md` - KimiCode 命令

建议格式：使用三列表格（命令 | 说明 | 示例）

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
| `.prose-custom` | 文章正文样式（使用 CSS 变量） |
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

### SwupCompat 组件

统一的生命周期管理工具，提供以下 API：

```typescript
// 页面切换完成后执行（最常用）
window.SwupCompat.onPageView(callback, { immediate: true })

// 内容替换前执行（用于清理）
window.SwupCompat.beforeContentReplace(callback)

// 移除回调
window.SwupCompat.off(event, callback)
```

**使用示例**:
```javascript
if (window.SwupCompat) {
  window.SwupCompat.onPageView(init);
} else {
  // 降级处理
  document.addEventListener('swup:contentReplaced', init);
  document.addEventListener('astro:page-load', init);
}
```

### Pagefind (搜索)

- 在构建时自动生成索引
- 搜索页面: `/search`
- 自动排除 draft 文章
- 开发模式下不可用，需构建后预览

### Remark/Rehype 插件

- `remark-gfm` - GitHub Flavored Markdown
- `remark-breaks` - 支持 MD 换行
- `remark-callouts` - Callout 提示框
- `remark-math` + `rehype-katex` - 数学公式
- `rehype-code-group` - 代码分组

## 开发规范

### 组件文件头注释

```typescript
---
/**
 * @component ComponentName
 * @description 组件功能描述
 * @features 主要特性列表
 * @props propName - 属性说明
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

- **组件**: PascalCase (e.g., `ArticleNavigation.astro`)
- **工具函数**: camelCase (e.g., `getAdjacentPosts`)
- **常量**: UPPER_SNAKE_CASE
- **CSS 类**: kebab-case (e.g., `article-layout`)
- **文件**: kebab-case

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

## 核心组件说明

### Navigation (导航栏)

- 固定顶部，玻璃态效果
- 响应式：桌面水平导航 / 移动端抽屉菜单
- 当前页面高亮自动更新
- 搜索入口、主题切换按钮

### ArticleLayout (文章布局)

- 三栏布局：左侧相关文章、中间正文、右侧目录
- 支持侧边栏收起/展开（状态持久化到 localStorage）
- 图片灯箱功能（点击放大）
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

## 性能优化

1. **图片**: 使用 Sharp 进行优化
2. **字体**: 系统字体优先，避免外部 CDN
3. **JS**: 零 JS 默认，交互按需加载 (SolidJS 组件)
4. **CSS**: Tailwind 4.x 按需生成，CSS 变量系统减少重复
5. **搜索**: Pagefind 静态索引，无服务端依赖
6. **Swup**: 页面过渡减少整页刷新

## 部署

生成纯静态文件，支持任何静态托管:

- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

构建输出目录: `dist/`

## 注意事项

1. **主题切换**: 主题初始化脚本在 `BaseLayout.astro` 中内联执行，防止闪烁
2. **Swup 兼容**: 页面过渡需要 `SwupCompat` 组件统一管理生命周期
3. **KaTeX 样式**: 数学公式需要 `/katex.min.css` 在 `BaseLayout` 中加载
4. **Content Collections**: 修改 `content.config.ts` 后需重启开发服务器
5. **搜索功能**: 仅在构建后可用，开发模式显示提示信息

## 扩展建议

- **新页面**: 在 `src/pages/` 创建 `.astro` 文件
- **新组件**: 根据功能放入 `components/{category}/`
- **新布局**: 在 `layouts/` 创建并继承 `BaseLayout`
- **新工具函数**: 在 `lib/` 创建并导出
- **样式修改**: 优先使用 Tailwind 类，复杂样式在 `global.css`

## 安全考虑

1. **XSS 防护**: Astro 默认对输出进行转义
2. **外部链接**: 使用 `rel="noopener"` 防止标签页钓鱼
3. **依赖更新**: 定期运行 `npm audit` 检查漏洞

---

*最后更新: 2026-03-13*
