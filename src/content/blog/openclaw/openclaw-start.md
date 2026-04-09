---
title: "OpenClaw 安装运行"
pubDate: 2026-03-13
description: "OpenClaw 原生安装运行流程"
tags: ["OpenClaw","龙虾"]
readingTime: 22
pinned: true
series:
  name: "OpenClaw 速查"
  order: 1
---

> OpenClaw（龙虾）是一款自托管的 AI 聊天网关，支持将 WhatsApp、Telegram、Discord、iMessage、QQ、WeChat 等聊天应用连接到 AI 编码代理，实现多模型对话和自动化任务处理。

## 目录
- [OpenClaw 简介](#1-openclaw-简介)
- [OpenClaw 下载](#2-openclaw-下载)
- [OpenClaw 安装](#3-openclaw-安装)
- [OpenClaw 配置](#4-openclaw-配置)
- [OpenClaw 运行](#5-openclaw-运行)
- [OpenClaw 插件与技能](#6-openclaw-插件与技能)
- [OpenClaw 常用命令](#7-openclaw-常用命令)
- [OpenClaw 卸载](#8-openclaw-卸载)
- [常见问题](#9-常见问题)

---

## 1. OpenClaw 简介

OpenClaw 是一个高效的 AI 聊天网关，主要特性包括：

| 特性 | 说明 |
|------|------|
| 多通道网关 | 支持 WhatsApp、Telegram、Discord、iMessage 等 |
| 多模型兼容 | 支持 OpenAI、Claude、Gemini、阿里百炼等 |
| 插件系统 | 可扩展的技能和插件机制 |
| Web 控制面板 | 内置可视化配置界面 |
| 自动化任务 | 支持 cron、hooks 等自动化机制 |

---

## 2. OpenClaw 下载

### 2.1 一键安装脚本（推荐）

```bash
# 默认安装（包含配置向导）
curl -fsSL https://openclaw.ai/install.sh | bash

# 只安装/更新，不运行配置向导
curl -fsSL https://openclaw.ai/install.sh | bash -s -- --no-onboard
```

### 2.2 NPM 安装

```bash
# 全局安装
npm install -g openclaw@latest

# 或者使用 npx
npx openclaw@latest
```

### 2.3 Windows 安装包

访问官方下载页面获取安装包：
- 下载地址：`https://openclaw.ikidi.top/api/download`
- 安装路径要求：纯英文路径，不包含中文或特殊字符
- 磁盘空间：至少 2.5GB 可用空间
- 安装前请退出杀毒软件、安全卫士等防护工具

---

## 3. OpenClaw 安装

### 3.1 运行配置向导

首次安装后，运行 onboarding 向导完成初始化：

```bash
# 完整配置向导
openclaw onboard

# 安装为后台服务
openclaw onboard --install-daemon

# 使用开发配置
openclaw --dev onboard
```

向导步骤说明：

| 步骤 | 配置项 | 说明 |
|------|--------|------|
| 1 | Gateway 模式 | Local（本地）或 Remote（远程） |
| 2 | 认证方式 | Anthropic API Key / OpenAI API Key 等 |
| 3 | 选择模型 | claude-sonnet-4-0 / gpt-4 等 |
| 4 | 频道配置 | WhatsApp、Telegram、Discord 等 |
| 5 | 配对安全 | 未知用户请求处理策略 |
| 6 | 工作区 | 默认 `~/.openclaw/workspace` |
| 7 | 技能选择 | 安装推荐技能 |
| 8 | 后台服务 | 安装为系统服务 |

### 3.2 安装验证

```bash
# 检查安装版本
openclaw --version

# 查看网关状态
openclaw gateway status

# 运行诊断
openclaw doctor
```

---

## 4. OpenClaw 配置

### 4.1 配置文件位置

OpenClaw 从以下位置读取配置：

| 平台 | 配置文件路径 |
|------|-------------|
| Linux/macOS | `~/.openclaw/openclaw.json` |
| Windows | `%USERPROFILE%\.openclaw\openclaw.json` |

### 4.2 最小配置示例

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace"
    }
  },
  "channels": {
    "whatsapp": {
      "allowFrom": ["+15555550123"]
    }
  },
  "gateway": {
    "port": 18789,
    "auth": {
      "mode": "token",
      "token": "your-secure-token"
    }
  }
}
```

### 4.3 配置方式

**方式一：交互式配置**

```bash
# 完整配置向导
openclaw configure

# 或 onboarding
openclaw onboard
```

**方式二：命令行配置**

```bash
# 查看配置项
openclaw config get agents.defaults.workspace

# 设置配置项
openclaw config set agents.defaults.heartbeat.every "2h"

# 删除配置项
openclaw config unset plugins.entries.brave.config.webSearch.apiKey
```

**方式三：Web 控制面板**

启动 Gateway 后访问 `http://127.0.0.1:18789`，点击 **Config** 标签页进行可视化配置。

### 4.4 添加自定义模型（以阿里百炼为例）

```json
{
  "bailian": {
    "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "apiKey": "sk-你的百炼API-Key",
    "api": "openai-completions",
    "retryCount": 3,
    "retryDelay": 1000,
    "timeout": 30,
    "models": [
      {
        "id": "qwen3.5-plus",
        "name": "Qwen3.5-Plus",
        "reasoning": false,
        "input": ["text"],
        "cost": {
          "input": 0,
          "output": 0,
          "cacheRead": 0,
          "cacheWrite": 0
        },
        "contextWindow": 262144,
        "maxTokens": 8192,
        "api": "openai-completions"
      }
    ]
  }
}
```

配置完成后重启服务生效。

---

## 5. OpenClaw 运行

### 5.1 基本启动

```bash
# 默认端口启动（18789）
openclaw gateway run

# 指定端口启动
openclaw gateway run --port 18789

# 详细日志模式
openclaw gateway run --verbose

# 强制启动（杀死占用端口的进程）
openclaw gateway run --force
```

### 5.2 后台服务模式（推荐）

**macOS (launchd)**

```bash
# 安装为后台服务
openclaw gateway install

# 查看服务状态
openclaw gateway status

# 重启服务
openclaw gateway restart

# 停止服务
openclaw gateway stop
```

**Linux (systemd 用户服务)**

```bash
# 安装服务
openclaw gateway install

# 启用并启动
systemctl --user enable --now openclaw-gateway.service

# 查看状态
systemctl --user status openclaw-gateway

# 持久化（注销后仍运行）
sudo loginctl enable-linger $USER
```

### 5.3 验证服务状态

```bash
# 查看网关状态
openclaw gateway status

# 详细状态检查
openclaw gateway status --deep

# JSON 格式输出
openclaw gateway status --json

# 实时日志
openclaw logs --follow

# 健康检查
openclaw health

# 诊断检查
openclaw doctor
```

**健康基线**：`Runtime: running` 和 `RPC probe: ok`

### 5.4 访问 Web 控制面板

启动成功后，浏览器访问：

```
http://127.0.0.1:18789
```

首次访问需配置 API Key 才能使用 AI 对话功能。

---

## 6. OpenClaw 插件与技能

### 6.1 技能系统简介

OpenClaw 支持通过技能（Skills）扩展功能，常见技能包括：

| 技能 | 功能 |
|------|------|
| web_search | 网络搜索 |
| code_execution | 代码执行 |
| file_operations | 文件操作 |
| browser_automation | 浏览器自动化 |

### 6.2 技能管理

```bash
# 安装技能
openclaw skills install <skill-name>

# 列出已安装技能
openclaw skills list

# 更新技能
openclaw skills update <skill-name>

# 卸载技能
openclaw skills uninstall <skill-name>
```

### 6.3 配置向导中的技能

在 `openclaw onboard` 过程中：

```
? Install recommended skills: (y/N)
y  # 安装推荐技能
```

---

## 7. OpenClaw 常用命令

### 7.1 日常运维命令

| 命令 | 作用 |
|------|------|
| `openclaw status` | 检查整体状态 |
| `openclaw health` | 健康检查 |
| `openclaw logs --follow` | 实时查看日志 |
| `openclaw doctor` | 运行诊断 |
| `openclaw doctor --fix` | 自动修复问题 |

### 7.2 配置管理命令

| 命令 | 作用 |
|------|------|
| `openclaw configure` | 交互式配置向导 |
| `openclaw config get <key>` | 查看配置项 |
| `openclaw config set <key> <value>` | 设置配置项 |
| `openclaw config unset <key>` | 删除配置项 |

### 7.3 Gateway 管理命令

| 命令 | 作用 |
|------|------|
| `openclaw gateway run` | 前台启动 Gateway |
| `openclaw gateway start` | 启动服务 |
| `openclaw gateway stop` | 停止服务 |
| `openclaw gateway restart` | 重启服务 |
| `openclaw gateway install` | 安装为系统服务 |
| `openclaw gateway status` | 查看服务状态 |

### 7.4 频道管理命令

| 命令 | 作用 |
|------|------|
| `openclaw channels login` | WhatsApp 扫码登录 |
| `openclaw channels status` | 查看频道状态 |
| `openclaw channels status --probe` | 验证通道就绪 |

### 7.5 配对管理命令

| 命令 | 作用 |
|------|------|
| `openclaw pairing list` | 查看待处理请求 |
| `openclaw pairing approve <ch> <c>` | 批准配对请求 |

### 7.6 模型管理命令

| 命令 | 作用 |
|------|------|
| `openclaw models list` | 列出可用模型 |
| `openclaw models set <model>` | 切换默认模型 |

---

## 8. OpenClaw 卸载

### 8.1 完全卸载

```bash
# 停止并卸载服务
openclaw gateway stop
openclaw gateway uninstall

# 删除 OpenClaw
npm uninstall -g openclaw

# 删除配置和数据（谨慎操作）
rm -rf ~/.openclaw
```

### 8.2 Windows 卸载

1. 控制面板 → 程序和功能 → 卸载 OpenClaw
2. 手动删除用户目录下的 `.openclaw` 文件夹
3. 清理环境变量中的相关配置

---

## 9. 常见问题

### 9.1 安装失败

**问题**：依赖缺失或权限不足

**解决**：
```bash
# 确保 Node.js 版本 >= 18
node --version

# 使用管理员权限运行
sudo curl -fsSL https://openclaw.ai/install.sh | bash
```

### 9.2 Gateway 启动失败

**问题**：端口被占用

**解决**：
```bash
# 查找占用端口的进程
lsof -i :18789

# 使用强制启动
openclaw gateway run --force

# 或更换端口
openclaw gateway run --port 19789
```

### 9.3 杀毒软件拦截

**问题**：安装或启动时文件被隔离

**解决**：
- 安装前退出所有杀毒软件、安全卫士
- 将 OpenClaw 安装目录添加到白名单

### 9.4 配置文件校验失败

**问题**：Gateway 无法启动，提示配置错误

**解决**：
```bash
# 运行诊断查看问题
openclaw doctor

# 自动修复
openclaw doctor --fix

# 重置配置
openclaw config reset
```

### 9.5 Web 面板无法访问

**问题**：`http://127.0.0.1:18789` 无法打开

**排查步骤**：
1. 确认 Gateway 已启动：`openclaw gateway status`
2. 检查防火墙设置
3. 确认端口未被占用：`lsof -i :18789`
4. 查看日志：`openclaw logs --follow`

---

## 参考资源

| 资源 | 链接 |
|------|------|
| 官方文档 | https://docs.openclaw.ai/ |
| GitHub | https://github.com/openclaw/openclaw |
| Anthropic API | https://console.anthropic.com/ |
| OpenAI API | https://platform.openai.com/ |

---

> **提示**：本文基于 OpenClaw 最新版本编写，如有更新请以官方文档为准。
