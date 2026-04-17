---
title: "Skill 编写指南：由浅入深打造 AI 助手的能力扩展"
pubDate: 2026-04-17
description: "从最简单的 SKILL.md 到多资源组合的复杂 Skill，系统讲解如何为 AI 编程助手编写高质量的能力扩展包。"
tags: ["AI", "Skill", "Kimi", "教程", "最佳实践"]
readingTime: 12
pinned: false
series:
  name: "AI 开发实战"
  order: 1
---

# Skill 编写指南：由浅入深打造 AI 助手的能力扩展

当你使用 Kimi Code CLI 或其他 AI 编程助手时，可能会发现某些重复性任务——比如处理 PDF、查询特定数据库、或遵循团队内部的代码规范——每次都需要从头解释一遍。这不仅浪费时间，还容易因上下文不足而出错。

**Skill（技能）** 正是为了解决这一问题而生的。它是 AI 助手的"外挂知识包"，能将你的领域经验、工作流和常用脚本固化成可复用的扩展能力。本文将从零开始，带你由浅入深地掌握 Skill 的编写方法。

> [!note]
> 本文以 Kimi Code CLI 的 Skill 系统为例进行讲解，但核心思想同样适用于其他支持类似机制的 AI 助手平台。

## 一、Skill 到底是什么

简单来说，Skill 是一个自包含的目录，里面包含一份核心指令文件（`SKILL.md`）和若干可选资源。当 AI 助手检测到当前任务与 Skill 的描述匹配时，就会自动加载其中的指令和资料，从而：

- **减少重复沟通**：无需每次都解释"按我们团队的规范来"
- **提升执行质量**：固化经过验证的工作流和最佳实践
- **引入外部能力**：通过脚本和模板扩展 AI 的实际行动边界

可以把 Skill 理解为给 AI 写的一份"岗位说明书"加上"工具箱"。

## 二、Skill 的解剖结构

一个标准的 Skill 目录结构如下：

```
skill-name/
├── SKILL.md              # 核心，必须存在
├── scripts/              # 可选：可执行脚本
├── references/           # 可选：参考文档
└── assets/               # 可选：模板、图片等资源
```

### 2.1 SKILL.md：Skill 的心脏

`SKILL.md` 是唯一必需的文件，由两部分组成：

**YAML Frontmatter（元数据）**：

```yaml
---
name: pdf-processor
description: |
  处理 PDF 文档的旋转、合并、文本提取等任务。
  当用户需要对 PDF 进行编辑或分析时使用此 Skill。
---
```

这里有两个关键字段：
- `name`：Skill 的唯一标识，建议用小写和连字符（如 `gh-address-comments`）
- `description`：**这是最重要的触发器**。AI 助手就是靠这段描述来判断是否启用该 Skill 的。因此，描述中不仅要说明"它能做什么"，还要明确"什么时候该用它"

> [!warning]
> 不要在 `description` 里写得太简略。如果只说"处理 PDF"，AI 可能无法准确判断触发时机。应该补充类似"当用户需要旋转、合并、提取 PDF 文本时"这样的场景描述。

**Markdown Body（正文）**：

正文是 Skill 被触发后才加载的指令集。它告诉 AI：
- 执行这个任务的标准步骤是什么
- 有哪些可用的脚本和参考文档
- 输出格式和质量要求是什么

### 2.2 三种可选资源

| 资源类型 | 用途 | 示例 |
|---------|------|------|
| `scripts/` | 可执行代码，确保操作确定性 | `rotate_pdf.py`、`deploy.sh` |
| `references/` | 加载到上下文的参考文档 | `schema.md`、`api-docs.md` |
| `assets/` | 不加载到上下文，直接用于输出 | `boilerplate-react/`、`logo.png` |

## 三、初级阶段：从纯文本 SKILL.md 开始

Skill 的入门门槛非常低。即使没有任何脚本和外部资源，一份写得好的一页纸 `SKILL.md` 也能显著提升 AI 的执行质量。

### 3.1 案例：团队 React 组件规范 Skill

假设你的团队有一套 React 组件编写规范，每次让 AI 生成组件时都需要提醒。我们可以把它写成一个 Skill：

```markdown
---
name: team-react-style
description: |
  为团队项目生成符合规范的 React 组件。
  当用户请求"写一个 React 组件"、"创建页面"或"添加新功能模块"时使用。
---

# 团队 React 组件规范

## 基础规则

1. 使用函数组件 + TypeScript
2. Props 必须显式定义接口
3. 样式使用 Tailwind CSS，禁止内联 `style`
4. 事件处理函数命名以 `handle` 开头

## 文件结构模板

```tsx
interface Props {
  // ...
}

export function ComponentName({ ... }: Props) {
  return (
    <div className="...">
      {/* ... */}
    </div>
  );
}
```

## 禁止事项

- 不要使用 `React.FC`
- 不要引入未在 package.json 中的第三方库
- 组件文件名使用 PascalCase
```

把这个文件放到 `~/.kimi/skills/team-react-style/SKILL.md`，下次你让 Kimi "写一个登录表单组件"时，它就会自动遵循这套规范。

> [!tip]
> 纯文本 Skill 最适合规范类、流程类、决策类的知识固化。它的优势是零依赖、易维护，而且不占用额外的执行资源。

## 四、中级阶段：引入脚本和参考文档

当任务涉及重复代码编写、复杂数据转换或需要严格一致性的操作时，仅靠文本指令就不够了。这时应该引入 `scripts/` 和 `references/`。

### 4.1 什么时候该加脚本

问自己两个问题：
1. 这个任务是不是每次都要重写类似的代码？
2. 这个操作是不是 fragile（容易出错），需要精确控制？

如果任一答案是"是"，就值得写一个脚本。

### 4.2 案例：PDF 处理 Skill（中级版）

```
pdf-processor/
├── SKILL.md
└── scripts/
    ├── rotate_pdf.py
    └── extract_text.py
```

`SKILL.md` 的正文可以这样写：

```markdown
## 旋转 PDF

使用脚本完成，不要手写旋转逻辑：

```bash
python scripts/rotate_pdf.py <input.pdf> <output.pdf> --angle 90
```

## 提取文本

```bash
python scripts/extract_text.py <input.pdf> --output result.txt
```
```

脚本的好处显而易见：
- **确定性**：同样的输入永远得到同样的输出
- **Token 高效**：AI 不需要把脚本逻辑加载到上下文里，直接执行即可
- **可测试**：你可以在打包 Skill 前先运行脚本验证正确性

### 4.3 什么时候该加参考文档

如果你的 Skill 涉及大量的领域知识——比如数据库表结构、API 规范、公司内部政策——把这些信息放到 `references/` 中，而不是全部塞进 `SKILL.md`。

**原因**：`SKILL.md` 正文只在 Skill 触发后加载，而 `references/` 下的文件则是在 AI 明确需要时才读取。这遵循了**渐进式披露（Progressive Disclosure）**原则，避免上下文膨胀。

```
bigquery-analyst/
├── SKILL.md
└── references/
    ├── schema-finance.md
    ├── schema-sales.md
    └── query-patterns.md
```

在 `SKILL.md` 中，你只需要给出导航：

```markdown
## 数据表参考

- 财务相关表：见 [references/schema-finance.md](references/schema-finance.md)
- 销售相关表：见 [references/schema-sales.md](references/schema-sales.md)
- 常用查询模式：见 [references/query-patterns.md](references/query-patterns.md)
```

> [!important]
> 不要把同样的信息同时写在 `SKILL.md` 和 `references/` 里。信息应该只存在一个地方。核心流程留在 `SKILL.md`，详细资料移到 `references/`。

## 五、高级阶段：多域组织与渐进式披露

当一个 Skill 变得越来越复杂时，良好的组织结构比内容本身更重要。

### 5.1 按领域拆分 references

假设你有一个 `cloud-deploy` Skill，支持 AWS、GCP、Azure 三家云平台。如果把三家平台的细节全写在一个文件里，每次用户只想部署到 AWS 时，AI 也可能被迫加载 GCP 和 Azure 的内容。

更好的做法：

```
cloud-deploy/
├── SKILL.md
└── references/
    ├── aws.md
    ├── gcp.md
    └── azure.md
```

`SKILL.md` 只保留选型和通用流程：

```markdown
## 部署流程

1. 询问用户目标云平台
2. 根据选择读取对应的 reference 文件：
   - AWS → [references/aws.md](references/aws.md)
   - GCP → [references/gcp.md](references/gcp.md)
   - Azure → [references/azure.md](references/azure.md)
3. 执行部署脚本
```

### 5.2 Skill 加载的三级金字塔

Skill 系统本质上是一个三级加载机制：

```
Level 1: Metadata (name + description)
         ↑ 始终存在于上下文，约 100 词
Level 2: SKILL.md Body
         ↑ 触发后才加载，建议 < 500 行
Level 3: Bundled Resources
         ↑ 按需加载，容量理论上无限
```

设计 Skill 时，要刻意把信息"向下压"：
- 能放到 Level 3 的，不要放到 Level 2
- 能放到 Level 2 的，不要放到 Level 1
- Level 1 的 `description` 要写得足够清晰，因为这是触发的唯一依据

### 5.3 自由度设计：给 AI 多少发挥空间

不同的任务需要不同程度的约束：

| 自由度 | 适用场景 | 表现形式 |
|-------|---------|---------|
| **高** | 开放性任务，多种方案都合理 | 文本描述原则和偏好即可 |
| **中** | 有推荐模式，但允许一定变通 | 提供伪代码或带参数的脚本模板 |
| **低** | 操作 fragile，必须严格按步骤来 | 提供特定脚本，参数尽量少 |

比如：
- **高自由度**：前端页面布局——给出设计系统和组件库说明即可
- **中自由度**：API 接口编写——给出接口模板和参数校验规则
- **低自由度**：数据库迁移——提供固定的迁移脚本，禁止 AI 手写 SQL 改表

## 六、实战：从零编写一个完整的 Skill

接下来，我们动手写一个完整的 Skill：**`docker-compose-helper`**，用于帮助用户快速生成和管理 Docker Compose 配置。

### Step 1：明确使用场景

用户可能会说：
- "帮我为这个项目写个 docker-compose.yml"
- "加一个 Redis 服务到 docker-compose"
- "优化一下现有的 compose 配置"

### Step 2：规划资源

分析后我们发现：
- 生成基础配置每次代码大同小异 → 不需要脚本，用模板即可
- 验证配置语法容易出错 → 需要一个 `validate.sh` 脚本
- 常用服务（MySQL、Redis、Nginx）的推荐配置可以做成 reference → 放到 `references/` 中

### Step 3：创建目录和文件

```
docker-compose-helper/
├── SKILL.md
├── scripts/
│   └── validate.sh
└── references/
    ├── service-mysql.md
    ├── service-redis.md
    └── service-nginx.md
```

### Step 4：编写 SKILL.md

```markdown
---
name: docker-compose-helper
description: |
  帮助用户生成、修改和验证 Docker Compose 配置文件。
  当用户提到"docker-compose"、"compose 配置"、"添加服务到 compose"时使用。
---

# Docker Compose 助手

## 生成新配置

1. 检查项目根目录是否已有 `docker-compose.yml`
2. 如果没有，基于以下模板创建：

```yaml
version: "3.8"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

3. 根据用户需求添加服务，参考：
   - MySQL → [references/service-mysql.md](references/service-mysql.md)
   - Redis → [references/service-redis.md](references/service-redis.md)
   - Nginx → [references/service-nginx.md](references/service-nginx.md)

## 修改现有配置

使用 `yq` 或直接文本编辑修改 `docker-compose.yml`。修改后必须运行验证脚本。

## 验证配置

```bash
bash scripts/validate.sh docker-compose.yml
```

## 约束

- 尽量使用 `version: "3.8"`
- 为每个服务显式指定 `restart: unless-stopped`
- 敏感信息使用 `.env` 文件，不要硬编码到 compose 文件中
```

### Step 5：编写脚本

`scripts/validate.sh`：

```bash
#!/bin/bash
set -e

FILE=${1:-docker-compose.yml}

echo "Validating $FILE..."
docker compose -f "$FILE" config > /dev/null
echo "✅ Validation passed."
```

> [!tip]
> 脚本写完后，**务必实际运行测试**。一个包含 bug 的脚本会让整个 Skill 的可信度大打折扣。

### Step 6：打包与安装

```bash
cd ~/.kimi/skills/
zip -r docker-compose-helper.skill docker-compose-helper
```

然后你可以直接分发这个 `.skill` 文件，其他人解压到他们的 skills 目录即可使用。

## 七、编写 Skill 的黄金法则

### 7.1 简洁至上

上下文窗口是公共资源。Skill 的内容会与系统提示、对话历史、其他 Skill 的元数据一起竞争空间。每写一句话前都问自己：**"Kimi 真的需要知道这个吗？"**

### 7.2 指令用祈使句

`SKILL.md` 的正文应该使用祈使句或不定式，直接告诉 AI 该做什么：

- ✅ "使用脚本完成旋转"
- ✅ "检查项目根目录是否已有配置文件"
- ❌ "你应该尽量使用脚本"
- ❌ "建议检查一下配置文件是否存在"

### 7.3 不要创建无关文件

Skill 目录里不要出现 `README.md`、`CHANGELOG.md`、`INSTALLATION_GUIDE.md` 这类辅助文档。Skill 是给 AI 看的，不是给人类用户看的。多余文件只会造成干扰。

### 7.4 Description 决定一切

很多 Skill 不好用，问题不在正文，而在 `description` 写得太模糊。好的 description 应该覆盖：

- Skill 的核心功能
- 具体的触发场景（用动词描述）
- 什么情况下**应该**使用它

对比两个描述：

```yaml
# ❌ 差的描述
description: "Docker helper"

# ✅ 好的描述
description: |
  帮助用户生成、修改和验证 Docker Compose 配置文件。
  当用户提到"docker-compose"、"compose 配置"、"添加服务到 compose"时使用。
```

## 八、常见问题与排查

### Q1：Skill 没有被触发怎么办？

最可能的原因是 `description` 写得太窄或太模糊。尝试在描述中加入更多同义词和触发场景。另外，检查 Skill 是否被正确放置到了 skills 目录下。

### Q2：Skill 触发后行为不符合预期？

这说明 `SKILL.md` 正文的指令不够清晰或存在歧义。尝试：
1. 把步骤拆得更细
2. 增加"禁止事项"清单
3. 提供具体的输入输出示例

### Q3： references 文件好像没被读取？

确保你在 `SKILL.md` 中明确引用了这些文件，并说明了"何时读取"。AI 不会自动去探索 Skill 目录下的所有文件。

### Q4：脚本执行报错？

- 检查脚本是否有执行权限：`chmod +x scripts/*.sh`
- 检查脚本是否使用了当前环境不支持的命令
- 在 `SKILL.md` 中补充脚本的依赖要求

## 九、结语

Skill 的本质是**知识的模块化封装**。它让 AI 从"每次从零学习"进化到"按需调用经验"。

对于初学者，我的建议是：
1. **先从纯文本 SKILL.md 开始**，把你最常重复解释的内容写进去
2. **遇到重复代码时加入脚本**，把 fragile 的操作固化下来
3. **知识体系变大后使用 references 拆分**，保持 SKILL.md 的精干
4. **持续迭代**，根据实际使用效果调整 description 和正文

写好一个 Skill，相当于给未来的自己（和其他使用这个 AI 的人）省下无数句话。开始写你的第一个 Skill 吧。

---

**参考资料：**
- [Kimi Code CLI 官方文档](https://docs.moonshot.cn/kimi-cli)
- [SKILL.md 设计规范](https://github.com/moonshot-ai/kimi-cli/tree/main/skills/skill-creator)

**相关文章：**
- [Prompt 工程：从 Zero-shot 到 Chain-of-Thought](/blog/llm/llm-prompt-engineering)
- [Moonpeak AI Native RAG 实践](/blog/llm/moonpeak-ai-native-rag)
