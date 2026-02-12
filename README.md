# Moonpeak Astro Blog

<p align="center">
  <a href="https://astro.build">
    <img src="https://astro.badg.es/v2/built-with-astro/tiny.svg" alt="Built with Astro" width="120" height="20">
  </a>
  <a href="https://github.com/AvadaKedavraDev/moonpeak-astro/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
</p>

<p align="center">
  一个基于 <a href="https://astro.build">Astro</a> 构建的极简现代个人博客，追求极致的阅读体验与优雅的视觉设计。
</p>

<p align="center">
  <a href="#-特性">特性</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-项目架构">项目架构</a> •
  <a href="#-写作指南">写作指南</a> •
  <a href="#-部署">部署</a>
</p>

---

## ✨ 特性

- **🎨 极简设计** — 大量留白，专注内容阅读，优雅的视觉层次
- **🌓 深色模式** — 一键切换浅色/深色主题，过渡自然流畅
- **📖 阅读体验** — 阅读进度条、悬浮目录（自动高亮当前章节）
- **🏷️ 智能推荐** — 基于标签的相关文章推荐
- **⚡ 高性能** — 基于 Astro 的零 JS 默认架构，极致加载速度
- **🔍 全文搜索** — 集成 Pagefind 实现静态站点搜索
- **📝 丰富的 Markdown** — 支持代码高亮、数学公式、Callouts、任务列表等
- **🖼️ 图片灯箱** — 文章内图片支持点击放大预览
- **📱 响应式设计** — 完美适配桌面端和移动端
- **🔄 平滑过渡** — Swup 实现页面间丝滑过渡效果

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Astro](https://astro.build) 5.x — 现代化的静态站点生成器 |
| 样式 | [Tailwind CSS](https://tailwindcss.com) 4.x — 原子化 CSS 框架 |
| 代码高亮 | [Expressive Code](https://expressive-code.com) — 美观的代码块 |
| 图标 | [Lucide](https://lucide.dev) — 精美的开源图标库 |
| 搜索 | [Pagefind](https://pagefind.app) — 静态站点搜索 |
| 页面过渡 | [Swup](https://swup.js.org) — 平滑的页面过渡 |
| 数学公式 | [KaTeX](https://katex.org) — 高性能数学排版 |

## 🚀 快速开始

### 环境要求

- **Node.js**: `v18.0.0` 或更高版本
- **npm**: `v8.0.0` 或更高版本

### 安装

```bash
# 克隆仓库
git clone https://github.com/AvadaKedavraDev/moonpeak-astro.git
cd moonpeak-astro

# 安装依赖
npm install
```

### 开发

```bash
# 启动开发服务器（支持局域网访问）
npm run dev

# 访问 http://localhost:4321
```

### 构建

```bash
# 构建生产版本（自动触发 Pagefind 搜索索引）
npm run build

# 预览生产构建
npm run preview
```

## 📁 项目架构

```
moonpeak-astro/
├── src/
│   ├── components/          # 组件目录
│   │   ├── article/         # 文章相关组件
│   │   │   ├── ArticleNavigation.astro    # 文章上下篇导航
│   │   │   └── RelatedPostsByTag.astro    # 相关文章推荐
│   │   ├── common/          # 通用组件
│   │   │   ├── Navigation.astro           # 顶部导航栏
│   │   │   ├── Footer.astro               # 页脚
│   │   │   ├── TableOfContents.astro      # 文章目录
│   │   │   └── ...
│   │   ├── ui/              # UI 组件
│   │   │   ├── ReadingProgress.astro      # 阅读进度条
│   │   │   ├── ScrollToTop.astro          # 返回顶部
│   │   │   └── TypeWriter.astro           # 打字机动画
│   │   └── widgets/         # 小部件
│   │       ├── SEO.astro                  # SEO 元信息
│   │       └── ThemeIcon.astro            # 主题切换按钮
│   ├── layouts/             # 布局组件
│   │   ├── BaseLayout.astro               # 基础布局
│   │   └── ArticleLayout.astro            # 文章页布局（三栏）
│   ├── pages/               # 页面路由
│   │   ├── index.astro                    # 首页
│   │   ├── blog/                          # 文章列表/详情
│   │   ├── tags/                          # 标签页
│   │   ├── about.astro                    # 关于页面
│   │   ├── search.astro                   # 搜索页面
│   │   └── ...
│   ├── content/             # 内容集合（博客文章）
│   │   └── blog/
│   │       ├── astro/
│   │       ├── javaee/
│   │       ├── docker/
│   │       └── ...
│   ├── lib/                 # 工具函数
│   │   └── post.ts                        # 文章数据处理
│   ├── styles/              # 全局样式
│   │   └── global.css                     # Tailwind + 自定义样式
│   └── content.config.ts    # 内容集合配置
├── public/                  # 静态资源
│   ├── fonts/
│   ├── images/
│   └── favicon.svg
├── astro.config.mjs         # Astro 配置
├── tailwind.config.mjs      # Tailwind CSS 配置
├── tsconfig.json            # TypeScript 配置
└── package.json
```

### 架构特点

1. **内容驱动**: 使用 Astro Content Collections 管理 Markdown 文章
2. **组件化**: 模块化设计，职责清晰的组件分层
3. **类型安全**: TypeScript 全栈类型支持
4. **零 JS 默认**: 静态页面无 JavaScript，交互按需加载
5. **样式系统**: CSS 变量实现主题切换，Tailwind 实现原子化样式

## 📝 写作指南

### 创建文章

1. 在 `src/content/blog/` 目录下创建 Markdown 文件
2. 支持按子目录组织文章（如 `blog/astro/`）

### Frontmatter 配置

```yaml
---
# 必填
 title: "文章标题"
pubDate: 2024-01-15

# 可选
description: "文章简介，用于 SEO 和列表展示"
tags: ["标签1", "标签2"]
categories: ["分类1"]
author: "作者名"
readingTime: 5           # 阅读时间（分钟）
coverImage: "/images/cover.jpg"  # 封面图
draft: false             # 是否为草稿
---
```

### Markdown 扩展

- **GFM**: GitHub Flavored Markdown（表格、删除线等）
- **代码块**: 语法高亮、行号高亮、代码折叠
- **Callouts**: `> [!note]`, `> [!tip]`, `> [!warning]` 等提示框
- **数学公式**: 行内 `$E=mc^2$` 和块级 `$$...$$` KaTeX 公式
- **任务列表**: `- [x] 已完成任务`

更多示例请参考 [`src/content/blog/test/template.md`](src/content/blog/test/template.md)

## ⚙️ 配置说明

### 站点配置

编辑 `astro.config.mjs`:

```javascript
export default defineConfig({
  site: 'https://your-domain.com',  // 生产域名
  // ...
});
```

### 导航配置

编辑 `src/components/common/Navigation.astro` 中的 `navItems` 数组。

### 主题色配置

编辑 `src/styles/global.css` 中的 CSS 变量：

```css
:root {
  --background: #fafafa;
  --foreground: #171717;
  /* ... */
}

.dark {
  --background: #0a0a0a;
  --foreground: #cae4fe;
  /* ... */
}
```

## 🚀 部署

### 静态托管

本项目生成静态文件，可部署到任何静态托管平台：

- [Vercel](https://vercel.com)
- [Netlify](https://netlify.com)
- [GitHub Pages](https://pages.github.com)
- [Cloudflare Pages](https://pages.cloudflare.com)

### Docker 部署

```bash
# 构建镜像
docker build -t moonpeak-blog .

# 运行容器
docker run -p 80:80 moonpeak-blog
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

## 🙏 致谢

- [Astro](https://astro.build) — 强大的静态站点生成器
- [Tailwind CSS](https://tailwindcss.com) — 优雅的 CSS 框架
- [Expressive Code](https://expressive-code.com) — 美观的代码高亮
- [Pagefind](https://pagefind.app) — 优秀的静态搜索方案

---

<p align="center">
  用 ❤️ 和 ☕ 构建 by <a href="https://github.com/AvadaKedavraDev">Moonpeak</a>
</p>
