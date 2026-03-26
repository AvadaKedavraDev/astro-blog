---
title: "ChromaDB 向量数据库安装指南"
pubDate: 2026-03-24
description: "ChromaDB 向量数据库的 Windows 与 Linux 完整安装教程，包含 Docker 部署、Python 客户端配置及常见问题解决方案。"
tags: ["ChromaDB", "向量数据库", "Docker", "LLM", "安装部署"]
categories: ["部署", "LLM"]
author: "作者名"
coverImage: "https://cdn.image.moonpeak.cn/20260326104453004.webp"
readingTime: 10
draft: true
---

> [!tip]
> ChromaDB 是目前最流行的开源向量数据库之一，专为 AI 和嵌入应用设计，支持内存和持久化两种模式。

## ChromaDB 简介

ChromaDB 是一个开源的向量数据库，专注于为 AI 应用提供高效的向量存储和检索能力。

### 核心特性

| 特性 | 说明 |
|------|------|
| 轻量级 | 可嵌入应用，也可独立部署 |
| 多语言支持 | Python、JavaScript、Java 等 |
| 多种部署模式 | 内存模式、持久化模式、服务端模式 |
| 元数据过滤 | 支持丰富的查询过滤条件 |

## Windows 安装

### 方式一：Docker 部署（推荐）

```powershell
# 1. 拉取镜像
docker pull chromadb/chroma:latest

# 2. 创建数据目录
mkdir C:\chroma-data

# 3. 运行容器
docker run -d `
  --name chroma-server `
  -p 8000:8000 `
  -v C:\chroma-data:/chroma/chroma `
  --restart always `
  chromadb/chroma:latest
```

### 方式二：Python 客户端安装

```powershell
# 安装 Python 包
pip install chromadb

# 验证安装
python -c "import chromadb; print(chromadb.__version__)"
```

## Linux 安装

### Docker 部署

```bash
# 1. 创建数据目录
mkdir -p ~/chroma-data

# 2. 使用 Docker Compose
cat > docker-compose.yml << 'EOF'
version: '3.9'
services:
  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - ~/chroma-data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
      - ANONYMIZED_TELEMETRY=FALSE
    restart: unless-stopped
EOF

# 3. 启动服务
docker-compose up -d
```

### 裸机安装

```bash
# Ubuntu/Debian
pip install chromadb

# 或使用 conda
conda install -c conda-forge chromadb

# 验证
chroma run --host localhost --port 8000
```

## 验证安装

### 使用 curl 测试 API

```bash
# 检查服务状态
curl http://localhost:8000/api/v1/heartbeat

# 创建集合
curl -X POST http://localhost:8000/api/v1/collections \
  -H "Content-Type: application/json" \
  -d '{"name": "test-collection", "metadata": {"hnsw:space": "cosine"}}'

# 查看集合列表
curl http://localhost:8000/api/v1/collections
```

### Python 客户端验证

```python
import chromadb

# 连接客户端
client = chromadb.HttpClient(host="localhost", port=8000)

# 创建集合
collection = client.create_collection(name="demo")

# 添加文档
collection.add(
    documents=["Hello ChromaDB", "This is a test"],
    ids=["doc1", "doc2"],
    metadatas=[{"source": "test"}, {"source": "test"}]
)

# 查询
results = collection.query(
    query_texts=["test document"],
    n_results=2
)
print(results)
```

## 配置优化

### 持久化配置

```python
import chromadb

# 持久化模式（本地存储）
client = chromadb.PersistentClient(path="./chroma_db")

# 内存模式（数据不保存）
client = chromadb.Client()
```

### 服务端配置

```yaml
# docker-compose.yml 环境变量
environment:
  - IS_PERSISTENT=TRUE
  - PERSIST_DIRECTORY=/chroma/chroma
  - ANONYMIZED_TELEMETRY=FALSE
  - ALLOW_RESET=TRUE
  - CHROMA_SERVER_HOST=0.0.0.0
  - CHROMA_SERVER_HTTP_PORT=8000
```

## 常见问题

### 端口被占用

```bash
# 查找占用 8000 端口的进程
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux
lsof -i :8000
kill -9 <PID>
```

### 权限问题（Linux）

```bash
# 修改数据目录权限
sudo chown -R $USER:$USER ~/chroma-data
```

### 防火墙配置

```bash
# 开放 8000 端口（Linux）
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# 或者使用 ufw
sudo ufw allow 8000/tcp
```

## 与 Spring AI 集成

### Maven 依赖

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-chroma-store-spring-boot-starter</artifactId>
</dependency>
```

### 配置

```yaml
spring:
  ai:
    vectorstore:
      chroma:
        client:
          host: http://localhost
          port: 8000
        collection-name: knowledge-base
        initialize-schema: true
```

## 总结

ChromaDB 的安装部署相对简单，Docker 方式适合生产环境，Python 客户端适合开发和测试。

> [!note]
> 生产环境建议使用 Docker 部署，并配置数据持久化和定期备份。

---

**参考链接：**
- [ChromaDB 官方文档](https://docs.trychroma.com/)
- [GitHub 仓库](https://github.com/chroma-core/chroma)
