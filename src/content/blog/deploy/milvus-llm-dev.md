---
title: "Milvus 向量数据库安装指南"
pubDate: 2026-03-24
description: "Milvus 分布式向量数据库的 Windows 与 Linux 安装部署指南，包含单机版、集群版部署及 Kubernetes 安装方案。"
tags: ["Milvus", "向量数据库", "Docker", "Kubernetes", "LLM", "安装部署"]
categories: ["部署", "LLM"]
author: "作者名"
readingTime: 15
draft: true
---

> [!tip]
> Milvus 是一款云原生的向量数据库，专为万亿级向量检索设计，支持分布式部署和 GPU 加速。

## Milvus 简介

Milvus 是 Zilliz 开源的向量数据库，专注于大规模向量相似度检索，广泛应用于推荐系统、图像搜索、RAG 等场景。

### 版本选择

| 版本 | 适用场景 | 特点 |
|------|----------|------|
| Milvus Lite | 开发测试 | 嵌入式，无需独立服务 |
| Milvus Standalone | 小规模生产 | Docker 单机部署 |
| Milvus Distributed | 大规模生产 | K8s 集群，水平扩展 |

## Windows 安装

### 方式一：Milvus Lite（Python）

```powershell
# 安装 Milvus Lite
pip install milvus

# 验证安装
python -c "from milvus import default_server; print('Milvus Lite installed')"
```

### 方式二：Docker Desktop 部署

```powershell
# 1. 下载安装脚本
Invoke-WebRequest -Uri "https://github.com/milvus-io/milvus/releases/download/v2.4.1/milvus-standalone-docker-compose.yml" -OutFile "docker-compose.yml"

# 2. 启动 Milvus
docker-compose up -d

# 3. 检查状态
docker-compose ps
```

### 方式三：使用 milvusctl（推荐）

```powershell
# 安装 milvusctl
pip install milvusctl

# 启动 Milvus
milvusctl start

# 查看状态
milvusctl status

# 停止服务
milvusctl stop
```

## Linux 安装

### Docker Compose 部署（Standalone）

```bash
# 1. 创建工作目录
mkdir -p ~/milvus && cd ~/milvus

# 2. 下载配置文件
wget https://github.com/milvus-io/milvus/releases/download/v2.4.1/milvus-standalone-docker-compose.yml -O docker-compose.yml

# 3. 创建数据目录
mkdir -p volumes/etcd volumes/minio volumes/milvus

# 4. 启动服务
docker-compose up -d

# 5. 查看日志
docker-compose logs -f milvus-standalone
```

### 裸机安装

```bash
# Ubuntu 20.04/22.04
# 1. 安装依赖
sudo apt-get update
sudo apt-get install -y wget apt-transport-https software-properties-common

# 2. 下载并安装
wget https://github.com/milvus-io/milvus/releases/download/v2.4.1/milvus_2.4.1-1_amd64.deb
sudo dpkg -i milvus_2.4.1-1_amd64.deb

# 3. 启动服务
sudo systemctl start milvus
sudo systemctl enable milvus
```

### Kubernetes 部署（分布式）

```bash
# 1. 安装 Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# 2. 添加 Milvus Helm 仓库
helm repo add milvus https://zilliztech.github.io/milvus-helm/
helm repo update

# 3. 安装 Milvus（默认单机版）
helm install my-milvus milvus/milvus

# 4. 查看 Pod 状态
kubectl get pods
```

## 验证安装

### 使用 Attu 图形界面

```bash
# Docker 启动 Attu（Milvus GUI）
docker run -p 8000:3000 -e MILVUS_URL={milvus server IP}:19530 zilliz/attu:latest
```

访问 `http://localhost:8000` 连接 Milvus。

### Python SDK 验证

```python
from pymilvus import connections, FieldSchema, CollectionSchema, DataType, Collection

# 连接 Milvus
connections.connect(alias="default", host="localhost", port="19530")

# 定义字段
fields = [
    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=128),
    FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=512)
]

# 创建集合
schema = CollectionSchema(fields, "Demo collection")
collection = Collection("demo_collection", schema)

# 创建索引
index_params = {
    "metric_type": "L2",
    "index_type": "IVF_FLAT",
    "params": {"nlist": 128}
}
collection.create_index(field_name="embedding", index_params=index_params)

print("Milvus 连接成功！")
```

## 配置优化

### 单机版资源配置

```yaml
# docker-compose.yml 修改资源限制
services:
  milvus-standalone:
    deploy:
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          cpus: '2'
          memory: 4G
```

### 启用 GPU 支持

```yaml
# 使用 GPU 版本的 Milvus
services:
  milvus-standalone:
    image: milvusdb/milvus:v2.4.1-gpu
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
```

## 常用操作

### Docker 管理

```bash
# 查看 Milvus 容器
docker ps | grep milvus

# 停止服务
docker-compose down

# 完全清理数据（谨慎操作）
docker-compose down -v
rm -rf volumes/

# 查看日志
docker-compose logs milvus-standalone
```

### 备份与恢复

```bash
# 使用 milvus-backup 工具
docker run -v ~/milvus-backup:/backup zilliz/milvus-backup create

# 恢复
docker run -v ~/milvus-backup:/backup zilliz/milvus-backup restore
```

## 常见问题

### 端口冲突

```bash
# 修改 docker-compose.yml 端口映射
ports:
  - "19531:19530"  # 改为 19531
  - "9092:9091"
```

### 内存不足

```bash
# 调整 Milvus 配置
# milvus.yaml
queryCoord:
  autoHandoff: true
  autoBalance: true
dataCoord:
  segment:
    maxSize: 512  # 减小 segment 大小
```

### 连接被拒绝

```bash
# 检查防火墙
sudo ufw allow 19530/tcp
sudo ufw allow 9091/tcp

# 检查服务状态
docker-compose ps
docker-compose logs milvus-standalone | tail -50
```

## 与 Spring AI 集成

### Maven 依赖

```xml
<dependency>
    <groupId>org.springframework.ai</groupId>
    <artifactId>spring-ai-milvus-store-spring-boot-starter</artifactId>
</dependency>
```

### 配置

```yaml
spring:
  ai:
    vectorstore:
      milvus:
        client:
          host: localhost
          port: 19530
        database-name: default
        collection-name: spring_ai_document
        embedding-dimension: 1536
        index-type: IVF_FLAT
        metric-type: COSINE
```

## 性能对比

| 数据库 | 十亿级向量 | 延迟 | 适用场景 |
|--------|-----------|------|----------|
| ChromaDB | 不支持 | 低 | 中小规模，快速原型 |
| Milvus | 支持 | 中 | 大规模生产环境 |
| Pinecone | 支持 | 低 | 托管服务，预算充足 |
| Qdrant | 支持 | 低 | 混合搜索，Rust 生态 |

## 总结

Milvus 适合需要处理大规模向量数据的场景，建议：
- 开发测试：Milvus Lite
- 小规模生产：Docker Standalone
- 大规模生产：Kubernetes 分布式

> [!warning]
> 生产环境部署建议配置监控（Prometheus + Grafana）和定期备份。

---

**参考链接：**
- [Milvus 官方文档](https://milvus.io/docs)
- [Attu GUI 工具](https://github.com/zilliztech/attu)
- [Milvus Helm Charts](https://github.com/zilliztech/milvus-helm)
