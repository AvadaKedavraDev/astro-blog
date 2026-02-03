---
title: "图片使用指南"
pubDate: 2024-01-15
description: "介绍如何在文章中使用图片，包括图床图片和本地图片"
tags: ["教程", "图片"]
---

# 图片使用指南

## 方式一：直接使用完整 URL

最简单的方式，直接使用图床的完整地址：

```markdown
![图片描述](https://cdn.image.moonpeak.cn/1765787654JiiCZ.jpg)
```

效果：
![示例图片](https://cdn.image.moonpeak.cn/1765787654JiiCZ.jpg)

---

## 方式二：使用 Image 组件（推荐）

导入组件后可以简化书写：

```astro
import Image from "@components/ui/Image.astro";

<!-- 只传文件名，自动拼接图床域名 -->
<Image src="1765787654JiiCZ.jpg" alt="图片描述" />

<!-- 指定尺寸 -->
<Image src="1765787654JiiCZ.jpg" alt="图片描述" width="800" height="600" />

<!-- 添加自定义样式 -->
<Image src="1765787654JiiCZ.jpg" alt="图片描述" class="rounded-lg shadow-lg" />
```

---

## 方式三：Markdown 语法 + 自动转换

如果你想像这样写：

```markdown
![描述](img:1765787654JiiCZ.jpg)
```

我可以配置一个 Remark 插件，自动把 `img:` 前缀的链接转换成图床完整地址。

需要这个功能的请告诉我！

---

## 对比

| 方式 | 写法 | 推荐指数 |
|------|------|---------|
| 完整 URL | `![描述](https://.../xxx.jpg)` | ⭐⭐⭐ 简单直接 |
| Image 组件 | `<Image src="xxx.jpg" />` | ⭐⭐⭐⭐ 功能丰富 |
| 自动转换 | `![描述](img:xxx.jpg)` | ⭐⭐⭐⭐⭐ 最简洁 |

---

## 提示

- 图床地址：`https://cdn.image.moonpeak.cn/`
- 建议图片命名：`日期_描述.jpg`，如 `20240115_screenshot.jpg`
- 图片建议压缩后再上传，提升加载速度
