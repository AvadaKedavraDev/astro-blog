---
title: "微交互效果演示"
pubDate: 2026-03-13
description: "展示博客支持的微交互效果"
tags: ["演示", "UI", "交互"]
---

# 微交互效果演示

本文档展示博客支持的各种微交互效果。

## 1. 链接下划线动画 - 从中心展开

使用 `.link-hover-center` 类：

<a href="#" class="link-hover-center">悬停查看效果 - 下划线从中心展开</a>

## 2. 磁性按钮效果

使用 `.magnetic-btn` 类（鼠标靠近时会被轻微吸引）：

<button class="magnetic-btn btn">磁性按钮</button>

## 3. 3D 卡片倾斜效果

使用 `.card-3d` 类：

<div class="card-3d card-base p-6 max-w-sm" style="margin: 2rem 0;">
  <h3>3D 倾斜卡片</h3>
  <p>鼠标悬停在此卡片上，体验 3D 倾斜效果。</p>
</div>

## 4. 文字渐变流光动画

使用 `.gradient-text-animated` 类：

<h2 class="gradient-text-animated" style="font-size: 2rem; font-weight: bold;">
  流光文字动画效果
</h2>

## 5. 按钮点击波纹效果

使用 `.btn-ripple` 类：

<button class="btn-ripple btn" style="position: relative; overflow: hidden;">
  点击看波纹效果
</button>

## 6. 图片悬停缩放

使用 `.img-zoom` 类：

<div class="img-zoom" style="max-width: 300px; border-radius: 0.5rem; overflow: hidden;">
  <img src="/images/example.jpg" alt="示例图片" />
</div>

## 7. 呼吸边框效果

使用 `.breathing-border` 类：

<div class="breathing-border card-base p-6" style="margin: 2rem 0;">
  <h3>呼吸边框</h3>
  <p>鼠标悬停查看呼吸边框动画效果。</p>
</div>

## 使用说明

要在你的文章中使用这些效果，只需添加对应的 CSS 类名：

```html
<!-- 链接下划线 -->
<a href="#" class="link-hover-center">链接文字</a>

<!-- 磁性按钮 -->
<button class="magnetic-btn btn">按钮</button>

<!-- 3D 卡片 -->
<div class="card-3d card-base">...</div>

<!-- 流光文字 -->
<span class="gradient-text-animated">文字</span>
```

> [!tip]
> 微交互效果仅在桌面设备上启用，移动设备会自动禁用以保证性能。
