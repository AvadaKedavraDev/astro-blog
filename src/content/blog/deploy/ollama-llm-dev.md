---
title: "Ollama 本地大模型部署指南"
pubDate: 2026-03-24
description: "Ollama 本地大模型运行工具的 Windows 与 Linux 完整安装教程，含模型下载、API 调用、WebUI 配置及生产环境优化。"
tags: ["Ollama", "LLM", "本地部署", "大模型", "Windows", "Linux"]
categories: ["部署", "LLM"]
author: "作者名"
readingTime: 12
draft: true
---

> [!tip]
> Ollama 是在本地运行大语言模型的最简单方式，一行命令即可下载和运行 Llama、Qwen、DeepSeek 等开源模型。

## Ollama 简介

Ollama 是一个开源的大语言模型本地运行框架，支持 macOS、Linux 和 Windows，让你无需复杂的配置就能在本地运行各种开源大模型。

### 支持的模型

| 模型 | 参数规模 | 显存需求 | 特点 |
|------|---------|---------|------|
| llama3.2 | 1B/3B | 2-4GB | Meta 最新，多语言 |
| qwen2.5 | 0.5B-72B | 1-48GB | 阿里通义，中文优秀 |
| deepseek-r1 | 1.5B-671B | 2-400GB | 推理能力强 |
| phi4 | 14B | 16GB | 微软出品，代码强 |
| gemma2 | 2B-27B | 4-22GB | Google 开源 |

## Windows 安装

### 方式一：官方安装包（推荐）

```powershell
# 1. 下载安装程序
# 访问 https://ollama.com/download/windows
# 下载 OllamaSetup.exe 并运行

# 2. 验证安装
ollama --version

# 3. 启动服务
ollama serve
```

### 方式二：WSL2 安装（Linux 子系统）

```bash
# 在 WSL2 Ubuntu 中执行
curl -fsSL https://ollama.com/install.sh | sh

# 配置 Windows 访问
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
```

### Windows 环境变量配置

```powershell
# 设置模型存储路径（默认在 C 盘，建议改到 D 盘）
[Environment]::SetEnvironmentVariable("OLLAMA_MODELS", "D:\ollama-models", "User")

# 设置监听地址（允许局域网访问）
[Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "User")

# 设置并发数
[Environment]::SetEnvironmentVariable("OLLAMA_NUM_PARALLEL", "4", "User")
```

## Linux 安装

### 自动安装脚本

```bash
# 官方安装脚本
curl -fsSL https://ollama.com/install.sh | sh

# 验证安装
ollama --version
```

### 手动安装

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y curl

# 下载 Ollama
sudo curl -L https://ollama.com/download/ollama-linux-amd64 -o /usr/bin/ollama
sudo chmod +x /usr/bin/ollama

# 创建服务用户
sudo useradd -r -s /bin/false -m -d /usr/share/ollama ollama

# 创建 systemd 服务
cat > /tmp/ollama.service << 'EOF'
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3
Environment="PATH=$PATH"
Environment="OLLAMA_HOST=0.0.0.0:11434"

[Install]
WantedBy=default.target
EOF

sudo mv /tmp/ollama.service /etc/systemd/system/

# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

### Docker 部署

```bash
# 拉取镜像
docker pull ollama/ollama:latest

# 运行容器
docker run -d \
  --name ollama \
  --gpus all \
  -p 11434:11434 \
  -v ollama:/root/.ollama \
  --restart always \
  ollama/ollama:latest
```

## 模型下载与运行

### 常用命令

```bash
# 拉取模型
ollama pull qwen2.5:7b
ollama pull llama3.2:latest
ollama pull nomic-embed-text  # 嵌入模型

# 运行模型（交互式）
ollama run qwen2.5:7b

# 列出本地模型
ollama list

# 删除模型
ollama rm qwen2.5:7b

# 查看模型信息
ollama show qwen2.5:7b
```

### 创建自定义模型

```bash
# 创建 Modelfile
cat > Modelfile << 'EOF'
FROM qwen2.5:7b

SYSTEM """你是一个专业的代码助手，擅长 Java 和 Spring 生态。"""

PARAMETER temperature 0.7
PARAMETER num_predict 2048
EOF

# 构建模型
ollama create my-assistant -f Modelfile

# 运行自定义模型
ollama run my-assistant
```

## API 调用

### REST API

```bash
# 生成文本
curl http://localhost:11434/api/generate -d '{
  "model": "qwen2.5:7b",
  "prompt": "用 Java 写一个快速排序",
  "stream": false
}'

# 聊天接口
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5:7b",
  "messages": [
    {"role": "user", "content": "你好"}
  ],
  "stream": false
}'

# 嵌入向量
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "这是一段测试文本"
}'
```

### Python 调用

```python
import requests

# 生成文本
response = requests.post('http://localhost:11434/api/generate', json={
    'model': 'qwen2.5:7b',
    'prompt': '用 Python 写一个斐波那契数列函数',
    'stream': False
})
print(response.json()['response'])

# 使用 OpenAI 兼容接口
import openai

client = openai.OpenAI(
    base_url='http://localhost:11434/v1',
    api_key='ollama'
)

response = client.chat.completions.create(
    model='qwen2.5:7b',
    messages=[
        {'role': 'user', 'content': '你好'}
    ]
)
print(response.choices[0].message.content)
```

## WebUI 配置

### 安装 Open WebUI

```bash
# Docker 方式（推荐）
docker run -d \
  --name open-webui \
  --restart always \
  -p 3000:8080 \
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
  -v open-webui:/app/backend/data \
  ghcr.io/open-webui/open-webui:main

# 访问 http://localhost:3000
```

## 性能优化

### GPU 加速

```bash
# 安装 NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | \
  sudo tee /etc/apt/sources.list.d/nvidia-docker.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

# 运行 GPU 版 Ollama
docker run -d --gpus all -p 11434:11434 ollama/ollama
```

### 模型量化

```bash
# 使用更小量化版本（节省显存）
ollama pull qwen2.5:4b        # 4-bit 量化
ollama pull qwen2.5:1.5b      # 超小版本
```

### 并发配置

```bash
# Linux 环境变量
export OLLAMA_NUM_PARALLEL=4      # 并发请求数
export OLLAMA_MAX_LOADED_MODELS=2 # 最大加载模型数
export OLLAMA_MAX_QUEUE=512       # 请求队列长度
```

## 常见问题

### 模型下载慢

```bash
# 使用镜像加速（国内）
export OLLAMA_REGISTRY_MIRROR=https://registry.npmmirror.com

# 或使用代理
export HTTP_PROXY=http://127.0.0.1:7890
export HTTPS_PROXY=http://127.0.0.1:7890
```

### 显存不足

```bash
# 使用 CPU 运行
export OLLAMA_NOGPU=1
ollama serve

# 或使用更小模型
ollama pull qwen2.5:0.5b
```

## 与 Spring AI 集成

### Maven 依赖

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-ollama-spring-boot-starter</artifactId>
</dependency>
```

### 配置

```yaml
spring:
  ai:
    ollama:
      base-url: http://localhost:11434
      chat:
        model: qwen2.5:7b
        options:
          temperature: 0.7
          num-predict: 2048
      embedding:
        model: nomic-embed-text
```

## 模型推荐

### 按显存选择

| 显存大小 | 推荐模型 | 性能 |
|---------|---------|------|
| 4GB | qwen2.5:1.5b | 基础对话 |
| 8GB | qwen2.5:7b | 良好推理 |
| 16GB | qwen2.5:14b | 优秀推理 |
| 24GB+ | qwen2.5:32b | 接近 GPT-4 |

### 中文场景推荐

```bash
# 1. 综合能力强
ollama pull qwen2.5:7b

# 2. 代码能力
ollama pull deepseek-coder:6.7b

# 3. 嵌入模型（RAG 必备）
ollama pull nomic-embed-text
```

## 总结

Ollama 大大降低了本地运行大模型的门槛，建议：
- 开发环境：直接安装，快速验证
- 生产环境：Docker 部署，配置 GPU 加速
- 团队协作：配合 Open WebUI 提供统一界面

> [!important]
> 生产环境部署建议配置监控、日志收集和模型自动更新机制。

---

**参考链接：**
- [Ollama 官网](https://ollama.com/)
- [Ollama GitHub](https://github.com/ollama/ollama)
- [模型库](https://ollama.com/library)
