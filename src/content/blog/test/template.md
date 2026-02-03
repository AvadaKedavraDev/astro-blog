---
# ========== 文章配置 (Frontmatter) ==========
# 文章标题（必填）
title: "文章标题"

# 发布日期（必填）格式：YYYY-MM-DD
pubDate: 2024-01-15

# 文章描述（必填）用于 SEO 和列表展示
description: "这是一篇示例文章，展示了博客支持的所有 Markdown 功能和组件。"

# 标签（可选）用于分类和聚合
tags: ["示例", "模板", "Markdown", "教程"]

# 封面图（可选）相对路径或绝对 URL
coverImage: "/images/cover.jpg"

# 阅读时间（可选）分钟数，不填会自动计算
readingTime: 8

# 是否置顶（可选）
pinned: false

# 系列文章（可选）用于系列文章关联
series:
  name: "博客使用指南"
  order: 1
---

<!-- 
  📋 写作模板说明
  =================
  1. 复制此文件并重命名（建议用英文/拼音）
  2. 修改上方 Frontmatter 信息
  3. 删除不需要的示例内容
  4. 开始写作！
-->

# 一级标题：文章主标题

文章开头段落，简要介绍本文内容。这是**加粗**、*斜体*、~~删除线~~、`行内代码` 的示例。

> 💡 提示：文章开头建议写一段简短的引言，概括文章核心内容。

## 二级标题：文本排版

### 三级标题：基础样式

这是**加粗文本**，用于强调重点。
这是*斜体文本*，用于表示术语或外来语。
这是~~删除线文本~~，用于表示废弃内容。
这是`行内代码`，用于表示代码片段或命令。

这是[链接文本](https://example.com)，指向外部网站。
这是[内部链接](/blog/another-post)，指向本站其他文章。

### 三级标题：列表

**无序列表：**
- 列表项一
- 列表项二
  - 嵌套子项 A
  - 嵌套子项 B
- 列表项三

**有序列表：**
1. 第一步：准备工作
2. 第二步：执行操作
   1. 子步骤 A
   2. 子步骤 B
3. 第三步：验证结果

**任务列表：**
- [x] 已完成任务
- [ ] 待办任务一
- [ ] 待办任务二

## 二级标题：Callouts 提示框（新增功能）

使用 `> [!类型]` 语法创建漂亮的提示框：

> [!note]
> 这是一个**笔记**提示框，用于记录补充信息或注意事项。

> [!tip]
> 这是一个**技巧**提示框，用于分享实用的小技巧或最佳实践。

> [!info]
> 这是一个**信息**提示框，用于展示一般性的说明信息。

> [!warning]
> 这是一个**警告**提示框，用于提醒潜在的问题或风险。

> [!danger]
> 这是一个**危险**提示框，用于警示可能导致严重后果的操作。

> [!important]
> 这是一个**重要**提示框，用于强调关键信息。

## 二级标题：代码展示

### 行内代码

使用 `npm install` 命令安装依赖。配置文件中设置 `theme: 'dark'` 启用深色模式。

### 代码块

**普通代码块：**
```javascript
// 这是一段 JavaScript 代码
function greet(name) {
  console.log(`Hello, ${name}!`);
  return {
    message: `Welcome to my blog, ${name}!`,
    timestamp: new Date().toISOString()
  };
}

greet('Reader');
```

**带行号的代码块：**
```python {1,4-6}
# 这是一段 Python 代码，带行号高亮
def fibonacci(n):
    """计算斐波那契数列"""
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)

# 打印前 10 个数
for i in range(10):
    print(f"F({i}) = {fibonacci(i)}")
```

**代码组（标签页）：
```astro
---
// 这是 Astro 组件代码
const { title, description } = Astro.props;
---

<article class="prose-custom">
  <h1>{title}</h1>
  <p>{description}</p>
  <slot />
</article>
```

### 代码折叠

<details>
<summary>点击查看完整配置代码</summary>

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "dependencies": {
    "astro": "^4.0.0",
    "@astrojs/react": "^3.0.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  }
}
```

</details>

## 二级标题：引用与分隔

### 引用块

> 这是一段引用文本。
> 
> 可以有多行内容，用于引用他人的观点或重要的声明。
>
> —— 引用来源

### 分隔线

上方内容

---

下方内容（使用三个减号创建分隔线）

## 二级标题：表格

### 基础表格

| 功能 | 语法 | 说明 |
|------|------|------|
| 加粗 | `**文本**` | 粗体显示 |
| 斜体 | `*文本*` | 斜体显示 |
| 代码 | `` `code` `` | 等宽字体 |
| 链接 | `[文本](url)` | 可点击链接 |

### 对齐表格

| 左对齐 | 居中对齐 | 右对齐 |
|:-------|:--------:|-------:|
| 文本 | 文本 | 文本 |
| 长文本内容 | 长文本内容 | 长文本内容 |

## 二级标题：图片与媒体

### 普通图片

![图片描述](/images/example.jpg)

### 带链接的图片

[![点击访问](/images/banner.jpg)](https://example.com)

### 图片说明

<figure>
  <img src="/images/diagram.png" alt="架构图">
  <figcaption>图 1：系统架构示意图</figcaption>
</figure>

## 二级标题：数学公式

### 行内公式

使用单个 `$` 包裹行内公式：$E = mc^2$

示例：质能方程 $E=mc^2$ 由爱因斯坦提出。当 $x \to \infty$ 时，函数 $f(x)$ 的极限为 $L$。

### 块级公式

使用双 `$$` 包裹块级公式：

$$
\int_{-\infty}^{+\infty} e^{-x^2} dx = \sqrt{\pi}
$$

### 复杂公式示例

**求和与极限：**
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

**矩阵：**
$$
\begin{pmatrix}
a & b & c \\
d & e & f \\
g & h & i
\end{pmatrix}
$$

**分段函数：**
$$
f(x) = \begin{cases}
x^2 & \text{if } x \geq 0 \\
-x & \text{if } x < 0
\end{cases}
$$

**微分方程：**
$$
\frac{d^2y}{dx^2} + p(x)\frac{dy}{dx} + q(x)y = f(x)
$$

**希腊字母与符号：**
$$
\alpha, \beta, \gamma, \delta, \epsilon, \theta, \lambda, \mu, \pi, \sigma, \phi, \omega
$$
$$
\forall x \in \mathbb{R}, \exists y \in \mathbb{Z} : y > x
$$

## 二级标题：HTML 扩展

### 细节展开

<details>
<summary>点击展开详细信息</summary>

这里是折叠的详细内容，可以包含：
- 多行文本
- **Markdown 语法**
- 甚至代码块

```bash
echo "Hello World"
```

</details>

### 提示徽章

<span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">NEW</span>
<span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">v2.0</span>

## 二级标题：结语

文章结尾部分，总结全文要点。

> [!tip]
> 结语建议：
> 1. 回顾文章主要内容
> 2. 提出思考或展望
> 3. 引导读者互动（评论、分享）

---

**参考资料：**
- [Astro 官方文档](https://docs.astro.build)
- [Markdown 语法指南](https://www.markdownguide.org)
- [Tailwind CSS 文档](https://tailwindcss.com)

**相关文章：**
- [上一篇：如何开始写作](/blog/previous-post)
- [下一篇：高级写作技巧](/blog/next-post)
