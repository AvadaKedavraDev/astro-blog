---
# ========== 文章配置 (Frontmatter) ==========
# 文章标题（必填）
title: "命令速查表模板"

# 发布日期（必填）格式：YYYY-MM-DD
pubDate: 2026-03-14

# 文章描述（必填）用于 SEO 和列表展示
description: "命令速查表模板，记录各类常用命令，方便快速查阅。"

# 标签（可选）用于分类和聚合
tags: ["命令", "速查表", "Cheatsheet", "Linux", "KimiCode"]


# 阅读时间（可选）分钟数，不填会自动计算
readingTime: 10

# 是否置顶（可选）
pinned: false
---

<!-- 
  📋 命令速查表写作指南
  =====================
  1. 按类别组织命令，每个类别一个二级标题
  2. 使用表格展示命令、参数和说明
  3. 常用命令可以单独展开详细说明
  4. 添加个人备注和使用场景
-->

# 命令速查表

> 💡 **使用说明**：本文档用于记录日常开发中常用的各类命令，按工具/场景分类，方便快速查阅。点击标题可快速跳转。

> [!tip]
> 建议为每个命令添加实际使用场景，方便回忆具体用法。

---

## 目录

- [Linux 常用命令](#linux-常用命令)
- [OpenClaw 常用命令](#openclaw-常用命令)
- [KimiCode 常用命令](#kimicode-常用命令)
- [Git 常用命令](#git-常用命令)
- [Docker 常用命令](#docker-常用命令)

---

## Linux 常用命令

### SSH 命令

```shell 
# 格式：ssh -L [本地端口]:[目标地址]:[目标端口] 用户@服务器
ssh -L xxxx:localhost:xxxx root@xxx.xxx.xxx.xxx
```

### 文件与目录操作

| 命令         | 说明            | 示例               |
|------------|---------------|------------------|
| `ls -la`   | 列出所有文件（含隐藏文件） | `ls -la /home`   |
| `cd -`     | 返回上一个目录       | -                |
| `pwd`      | 显示当前路径        | -                |
| `mkdir -p` | 递归创建目录        | `mkdir -p a/b/c` |
| `rm -rf`   | 强制删除目录        | `rm -rf dirname` |
| `cp -r`    | 递归复制          | `cp -r src dest` |
| `mv`       | 移动/重命名        | `mv old new`     |

### 文件查看与搜索

| 命令          | 说明     | 示例                     |
|-------------|--------|------------------------|
| `cat`       | 查看文件内容 | `cat file.txt`         |
| `less`      | 分页查看   | `less large.log`       |
| `grep`      | 文本搜索   | `grep "error" app.log` |
| `find`      | 查找文件   | `find . -name "*.js"`  |
| `head/tail` | 查看首尾行  | `tail -f app.log`      |

### 系统与进程

| 命令         | 说明     | 示例                    |
|------------|--------|-----------------------|
| `ps aux`   | 查看所有进程 | `ps aux \| grep node` |
| `top/htop` | 实时系统监控 | -                     |
| `df -h`    | 磁盘使用情况 | -                     |
| `du -sh`   | 目录大小   | `du -sh /var/log`     |
| `chmod`    | 修改权限   | `chmod +x script.sh`  |

> [!note]
> **个人备注**：
> - `tail -f` 特别适合实时查看日志文件
> - `grep -i` 可以忽略大小写搜索

---

## OpenClaw 常用命令

> 替换为 OpenClaw 实际命令

### 基础操作

| 命令 | 说明 | 示例 |
|------|------|------|
| `oc init` | 初始化项目 | `oc init my-project` |
| `oc run` | 运行项目 | `oc run --dev` |
| `oc build` | 构建项目 | `oc build --prod` |

### 配置管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `oc config set` | 设置配置项 | `oc config set key value` |
| `oc config get` | 获取配置项 | `oc config get key` |

---

## KimiCode 常用命令

### CLI 更新命令

| 命令                | 说明               | 示例                                    |
|-------------------|------------------|---------------------------------------|
| `uv tool upgrade` | 更新KimiCode cli版本 | `uv tool upgrade kimi-cli --no-cache` |


### 文件操作

| 命令            | 说明   | 示例                           |
|---------------|------|------------------------------|
| `@file read`  | 读取文件 | `@file read src/index.ts`    |
| `@file write` | 写入文件 | `@file write path "content"` |
| `@file edit`  | 编辑文件 | `@file edit path old new`    |

### 代码搜索

| 命令      | 说明   | 示例                      |
|---------|------|-------------------------|
| `@grep` | 搜索代码 | `@grep "function name"` |
| `@glob` | 查找文件 | `@glob "src/**/*.ts"`   |

### 任务管理

| 命令      | 说明   | 示例           |
|---------|------|--------------|
| `@todo` | 查看待办 | -            |
| `@done` | 标记完成 | `@done 任务ID` |

---

## Git 常用命令

### 基础操作

| 命令           | 说明    | 示例                     |
|--------------|-------|------------------------|
| `git status` | 查看状态  | -                      |
| `git add`    | 添加文件  | `git add .`            |
| `git commit` | 提交更改  | `git commit -m "msg"`  |
| `git push`   | 推送到远程 | `git push origin main` |
| `git pull`   | 拉取更新  | `git pull origin main` |

### 分支管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `git branch` | 列出分支 | `git branch -a` |
| `git checkout` | 切换分支 | `git checkout -b feature` |
| `git merge` | 合并分支 | `git merge feature` |
| `git rebase` | 变基操作 | `git rebase main` |

---

## Docker 常用命令

### 容器管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `docker ps` | 列出容器 | `docker ps -a` |
| `docker run` | 运行容器 | `docker run -d nginx` |
| `docker stop` | 停止容器 | `docker stop container_id` |
| `docker rm` | 删除容器 | `docker rm container_id` |
| `docker exec` | 进入容器 | `docker exec -it id bash` |

### 镜像管理

| 命令 | 说明 | 示例 |
|------|------|------|
| `docker images` | 列出镜像 | - |
| `docker pull` | 拉取镜像 | `docker pull ubuntu:20.04` |
| `docker build` | 构建镜像 | `docker build -t myapp .` |
| `docker rmi` | 删除镜像 | `docker rmi image_id` |

---

## 新增类别模板

复制以下模板添加新的命令类别：

```markdown
## 工具名称 常用命令

### 类别一

| 命令 | 说明 | 示例 |
|------|------|------|
| `cmd` | 说明 | 示例 |

### 类别二

| 命令 | 说明 | 示例 |
|------|------|------|
| `cmd` | 说明 | 示例 |

> [!note]
> **个人备注**：添加使用心得和注意事项
```

---

## 快速参考卡片

<details>
<summary>📌 Linux 极简卡片（点击展开）</summary>

```bash
# 文件操作
ls -la              # 列出文件
cd -                # 返回上级
pwd                 # 当前路径
mkdir -p            # 创建目录
rm -rf              # 删除目录
cp -r               # 复制目录

# 查看文件
cat file            # 查看内容
less file           # 分页查看
tail -f file        # 实时追踪
grep "text" file    # 搜索文本

# 权限管理
chmod +x file       # 添加执行权限
chmod 755 file      # 设置权限
chown user:group    # 修改所有者
```

</details>

<details>
<summary>📌 Git 极简卡片（点击展开）</summary>

```bash
# 日常 workflow
git status
git add .
git commit -m "msg"
git push origin main

# 分支操作
git checkout -b feature
git checkout main
git merge feature
git branch -d feature
```

</details>

---

> [!tip]
> **维护建议**：
> 1. 定期回顾并补充新学到的命令
> 2. 为复杂命令添加实际使用场景
> 3. 删除不再使用的命令，保持精简
> 4. 可以按使用频率排序，常用命令放前面
