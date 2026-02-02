# Moonpeak's Blog

一个基于 Astro 构建的极简现代个人博客，专注于优雅的阅读体验与流畅的交互设计。

---

## ✨ 设计哲学

> **"Less is More"** —— 去除多余装饰，让内容成为主角

- **极简主义**：大量留白，清晰的视觉层级
- **沉浸式阅读**：无干扰的阅读界面，专注内容本身
- **细腻动效**：恰到好处的微交互，提升体验而不喧宾夺主
- **丝滑过渡**：页面切换流畅自然，如行云流水

---

## 🎯 核心特性

### 1. 视觉冲击力的首页
- **全屏 Hero 区域**：渐变背景 + 大标题，营造高级感
- **打字机动画**：优雅的标题逐字呈现
- **向下滚动指示**：微妙的动态引导

### 2. 极简文章列表
- **卡片式布局**：大封面图 + 简洁信息
- **悬停微动效**：卡片轻微上浮 + 阴影加深
- **智能标签**：仅展示关键标签，避免视觉混乱

### 3. 沉浸式阅读页
- **居中内容区**：最大宽度限制，最佳阅读体验
- **悬浮目录**：随滚动自动高亮当前章节
- **阅读进度条**：顶部细线指示阅读进度
- **优雅的代码块**：暗色主题，语法高亮

### 4. 全局体验优化
- **丝滑主题切换**：明暗模式一键切换，过渡自然
- **返回顶部**：滚动后浮现，平滑回顶
- **图片灯箱**：点击放大查看，支持手势关闭

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Astro](https://astro.build) 5.x - 极速静态站点生成 |
| 样式 | [Tailwind CSS](https://tailwindcss.com) 4.x - 原子化 CSS |
| 组件 | [React](https://react.dev) 19 - 交互组件 |
| 动画 | [Framer Motion](https://www.framer.com/motion/) - 流畅动画 |
| 图标 | [Lucide React](https://lucide.dev) - 简洁图标 |
| 代码高亮 | [Expressive Code](https://expressive-code.com) - 美观代码块 |

---

## 📁 项目结构

```
src/
├── components/          # 组件目录
│   ├── ui/             # 基础 UI 组件
│   ├── content/        # 内容展示组件
│   ├── navigation/     # 导航相关组件
│   └── effects/        # 视觉效果组件
├── layouts/            # 页面布局
│   ├── BaseLayout.astro
│   ├── HomeLayout.astro
│   └── PostLayout.astro
├── pages/              # 页面路由
│   ├── index.astro     # 首页
│   ├── blog/           # 博客相关
│   └── about.astro     # 关于
├── styles/             # 全局样式
├── content/            # 博客内容 (Markdown)
└── lib/                # 工具函数
```

---

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 构建
npm run build

# 预览
npm run preview
```

---

## 🎨 UI 设计规范

### 配色方案

#### 浅色模式
- **背景**: `#fafafa` - 柔和的米白
- **主文字**: `#171717` - 近黑
- **次要文字**: `#737373` - 中灰
- **强调色**: `#2563eb` - 蓝色
- **边框**: `#e5e5e5` - 浅灰

#### 深色模式
- **背景**: `#0a0a0a` - 深黑
- **主文字**: `#fafafa` - 近白
- **次要文字**: `#a3a3a3` - 中灰
- **强调色**: `#60a5fa` - 亮蓝
- **边框**: `#262626` - 深灰

### 字体规范
- **标题**: `Inter` / `system-ui` - 现代无衬线
- **正文**: `Inter` / `system-ui` 
- **代码**: `JetBrains Mono` / `monospace`

### 间距系统
- 页面边距: `px-6 md:px-12 lg:px-24`
- 内容最大宽度: `max-w-3xl` (文章页)
- 组件间距: `gap-8 md:gap-12`

### 圆角规范
- 卡片: `rounded-2xl`
- 按钮: `rounded-full` 或 `rounded-lg`
- 标签: `rounded-full`

---

## 📝 内容创作

文章位于 `src/content/blog/` 目录，使用 Markdown 格式。

### Frontmatter 格式

```yaml
---
title: "文章标题"
pubDate: 2024-01-15
description: "文章简介"
tags: ["标签1", "标签2"]
coverImage: "/images/cover.jpg"
readingTime: 5
---
```

---

## 🔧 配置说明

### 站点配置
编辑 `src/config/site.ts`:

```typescript
export const siteConfig = {
  name: "Moonpeak's Blog",
  description: "一个极简现代的个人博客",
  url: "https://your-blog.com",
  author: "Your Name",
  links: {
    github: "https://github.com/yourname",
    twitter: "https://twitter.com/yourname",
  }
}
```

### 导航配置
编辑 `src/config/nav.ts` 自定义导航菜单。

---

## 📱 响应式断点

| 断点 | 宽度 | 说明 |
|------|------|------|
| `sm` | 640px | 手机横屏 |
| `md` | 768px | 平板 |
| `lg` | 1024px | 小桌面 |
| `xl` | 1280px | 大桌面 |

---

## 🎭 动画规范

| 动画 | 时长 | 缓动函数 |
|------|------|---------|
| 页面过渡 | 300ms | `ease-out` |
| 悬停效果 | 200ms | `ease-in-out` |
| 模态框 | 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` |
| 滚动显示 | 600ms | `cubic-bezier(0.16, 1, 0.3, 1)` |

---

## 📄 许可证

MIT License © 2024 Moonpeak

---

> 用❤️构建，专注分享技术与生活。
