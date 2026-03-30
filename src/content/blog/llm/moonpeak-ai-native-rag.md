---
title: "从 Spring AI 到原生 HTTP：构建生产级 RAG 知识库系统"
pubDate: 2026-03-30
description: "记录 MoonPeak AI 知识库系统的架构演进：为什么放弃 Spring AI 框架，选择原生 HTTP 实现；深入解析 Chroma v2 API、Ollama 本地部署和完整的 RAG 流水线设计。"
tags: ["RAG", "Spring Boot", "Ollama", "Chroma", "向量数据库", "LLM", "架构设计"]
categories: ["LLM"]
author: "moonpeak"
readingTime: 20
featured: true
---

> 本文记录了 MoonPeak AI 项目从 Spring AI 框架迁移到原生 HTTP 实现的完整过程，包含架构决策、踩坑记录和最佳实践。

## 背景与问题

在构建个人知识库问答系统时，我最初选择了 **Spring AI** 框架。作为 Spring 官方推出的 AI 开发框架，它提供了统一的抽象接口：`ChatClient`、`EmbeddingClient`、`VectorStore`，理论上可以简化开发。

然而在实际落地过程中，遇到了一系列问题：

### Spring AI 的现实困境

| 问题 | 具体表现 |
|------|----------|
| **版本迭代过快** | M2 → M3 → M4 均有破坏性变更，API 不兼容 |
| **依赖版本冲突** | Spring AI 2.0.0-M4 强制要求 Spring Boot 4.x |
| **国内生态滞后** | 企业环境仍以 Spring Boot 2.7/3.x 为主 |
| **封装过度** | 隐藏了 HTTP 调用细节，调试困难 |
| **Chroma 兼容性** | Spring AI 1.x 仅支持 Chroma v1 API，而 Chroma 1.0.0+ 已使用 v2 API |

### 关键决策点

当发现 Spring AI 的 `ChromaVectorStore` 无法连接 Chroma 1.0.0+ 时，我面临两个选择：

1. **升级方案**：Spring Boot 4.x + Spring AI 2.0.0-M4
   - 风险：Boot 4.x 是里程碑版本，生产环境不稳定
   
2. **原生方案**：放弃 Spring AI，直接 HTTP 调用 Ollama + Chroma
   - 优势：完全可控、兼容 Boot 3.x、学习价值高

最终选择了 **原生 HTTP 方案**。

---

## 新架构设计

### 核心思想

> **去框架化**：不依赖任何 AI 框架，直接使用 WebClient 调用 Ollama 和 Chroma 的 REST API。

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
│    POST /api/rag/chat       - 同步问答                      │
│    POST /api/rag/chat/stream - SSE 流式问答                 │
│    POST /api/documents      - 文档上传                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  RAGService  │  │DocumentService│  │ OllamaClient │
│   问答编排    │  │  文档处理     │  │   LLM调用    │
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                  │
       │    ┌────────────┘                  │
       │    │                               │
       ▼    ▼                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    ChromaHttpClient                          │
│                   向量数据库操作                              │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈

> 这里选择 WebClient 是因为 Java17后 其性能比RestTemplate 性能更优秀

| 组件 | 选型 | 说明 |
|------|------|------|
| HTTP 客户端 | WebClient | Spring WebFlux，支持异步非阻塞 |
| 文档解析 | Apache Tika | 支持 PDF/Word/Excel/Markdown |
| Token 计算 | JTokkit | OpenAI 官方 Tokenizer |
| LLM | Ollama | 本地运行 qwen3:8b / BGE-M3 |
| 向量数据库 | Chroma | 本地部署，v2 API |

---

## 核心实现解析

### 1. Ollama HTTP 客户端

```java
@Component
public class OllamaHttpClient {
    
    public String generate(String prompt, String model) {
        Map<String, Object> request = Map.of(
            "model", model,
            "prompt", prompt,
            "stream", false
        );
        
        return webClient.post()
            .uri("/api/generate")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(String.class)
            .block();
    }
    
    public List<Float> embed(String text, String model) {
        Map<String, Object> request = Map.of(
            "model", model,
            "input", text
        );
        
        return webClient.post()
            .uri("/api/embed")
            .bodyValue(request)
            .retrieve()
            .bodyToMono(JsonNode.class)
            .map(node -> parseEmbedding(node))
            .block();
    }
}
```

### 2. Chroma v2 API 客户端

Chroma 1.0.0+ 引入了 **Tenant → Database → Collection** 三层结构：

```java
@Component
public class ChromaHttpClient {
    
    /**
     * 初始化层级：Tenant → Database → Collection
     */
    public String initialize() {
        createTenantIfNotExists();
        createDatabaseIfNotExists();
        return getOrCreateCollection();
    }
    
    private void createTenantIfNotExists() {
        // POST /api/v2/tenants
        webClient.post()
            .uri("/api/v2/tenants")
            .bodyValue(Map.of("name", tenant))
            .retrieve()
            .bodyToMono(String.class)
            .block();
    }
    
    private String getOrCreateCollection() {
        // POST /api/v2/tenants/{tenant}/databases/{database}/collections
        Map<String, Object> request = Map.of(
            "name", collectionName,
            "get_or_create", true  // 自动创建
        );
        
        String response = webClient.post()
            .uri("/api/v2/tenants/{tenant}/databases/{database}/collections", 
                 tenant, database)
            .bodyValue(request)
            .retrieve()
            .bodyToMono(String.class)
            .block();
            
        return parseCollectionId(response);
    }
}
```

### 3. 文档分块策略

使用 **递归字符分割** 而非固定长度分割：

```java
public List<TextChunk> splitText(String text, int chunkSize, int overlap) {
    List<TextChunk> chunks = new ArrayList<>();
    
    // 1. 先按段落分割
    String[] paragraphs = text.split("\n\n+");
    
    for (String para : paragraphs) {
        int paraTokens = encoding.countTokens(para);
        
        // 2. 超长段落按句子分割
        if (paraTokens > chunkSize) {
            List<String> sentences = splitIntoSentences(para);
            // ... 句子级分块
        } else {
            // ... 段落级分块
        }
    }
    
    return chunks;
}
```

分块策略对比：

| 策略 | 优点 | 缺点 |
|------|------|------|
| 固定长度 | 实现简单 | 可能切断语义 |
| 递归字符 | 保持段落/句子完整性 | 实现复杂 |
| 语义分割 | 最优质量 | 需要额外模型 |

### 4. RAG Prompt 工程

```
你是一个专业的知识库助手。请基于以下参考资料回答用户问题。

=== 参考资料 ===
{context}

=== 回答规则 ===
1. 严格基于参考资料回答，不要引入外部知识
2. 如果资料不足，明确告知"根据现有资料无法回答"
3. 引用来源时标注 [来源: xxx]
4. 保持简洁准确

用户问题：{question}
```

---

## 踩坑记录

### 坑 1：Chroma v1 vs v2 API

Spring AI 1.x 使用的是 Chroma v1 API：
```
# v1 API（已废弃）
POST /api/v1/collections
```

Chroma 1.0.0+ 使用 v2 API：
```
# v2 API（正确）
POST /api/v2/tenants/{tenant}/databases/{database}/collections
```

**解决**：完全重写 Chroma 客户端，使用正确的 v2 端点。

### 坑 2：Tenant/Database 不存在

Chroma 1.0.0+ 不会自动创建 `default` tenant，调用 API 会返回 404：
```json
{"error":"NotFoundError","message":"Tenant [default] not found"}
```

**解决**：应用启动时自动创建层级结构：
```java
public void initialize() {
    createTenantIfNotExists();
    createDatabaseIfNotExists();
    getOrCreateCollection();
}
```

### 坑 3：Mono 类型转换

WebClient 的 `onErrorResume` 要求返回 `Mono<T>`：

```java
// ❌ 错误：返回 String 导致类型不匹配
.onErrorResume(e -> createCollection(client))  

// ✅ 正确：包装为 Mono
.onErrorResume(e -> Mono.just(createCollection(client)))
```

---

## 架构对比总结

| 维度 | Spring AI 方案 | 原生 HTTP 方案 |
|------|---------------|---------------|
| Spring Boot 兼容性 | 强制 4.x | 兼容 2.7/3.x |
| 版本稳定性 | 频繁变更 | 稳定 |
| 可控性 | 黑盒封装 | 完全透明 |
| 学习价值 | 低（调 API） | 高（理解原理）|
| 生产风险 | 高 | 低 |
| 定制能力 | 受限 | 完全自由 |
| 代码量 | 少（框架封装） | 多（自己实现）|

---

## 快速开始

### 1. 启动依赖服务

```bash
# 启动 Chroma
docker run -d -p 8000:8000 chromadb/chroma:latest

# 启动 Ollama
docker run -d -p 11434:11434 ollama/ollama

# 拉取模型
ollama pull qwen3:8b
ollama pull bge-m3
```

### 2. 配置应用

```yaml
# application.yml
ollama:
  base-url: http://localhost:11434
  chat-model: qwen3:8b
  embed-model: BGE-M3

chroma:
  host: http://localhost
  port: 8000
  tenant: default_tenant
  database: default_database
  collection-name: knowledge-base
```

### 3. 测试 API

```bash
# 上传文档
curl -X POST -F "file=@文档.pdf" http://localhost:8080/api/documents

# 知识库问答
curl -X POST "http://localhost:8080/api/rag/chat?question=问题"

# 流式问答
curl -X POST "http://localhost:8080/api/rag/chat/stream?question=问题"
```

---

## 扩展方向

### 阶段 1：检索优化
- **Hybrid Search**: 向量检索 + 关键词 BM25
- **Rerank 模型**: BGE-Reranker 精排
- **Query 改写**: HyDE（假设文档嵌入）

### 阶段 2：多模态支持
- **OCR 解析**: PDF 图片提取（PaddleOCR）
- **多模态模型**: LLaVA/qwen-vl

### 阶段 3：企业级
- **多租户**: 按用户隔离 Collection
- **对话历史**: Chat Memory 支持
- **多模型路由**: Claude/GPT-4 接入

---

## 总结

从 Spring AI 迁移到原生 HTTP 的过程中，我深刻体会到：

> **框架是双刃剑**：它提供便利性，但也带来抽象泄漏和版本锁定。对于 AI 这样快速迭代的领域，理解底层原理比使用框架更重要。

原生 HTTP 方案虽然代码量更多，但带来了：
- **完全可控的调用链路**
- **与 Spring Boot 版本解耦**
- **深入理解 RAG 流水线的机会**

对于生产环境，稳定性和可控性远比开发效率更重要。

---

## 参考链接

- [项目源码](https://github.com/moonpeak/ai-rag-native)
- [Ollama API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Chroma v2 API 文档](https://docs.trychroma.com/reference/http-api)
- [Spring AI 官方文档](https://docs.spring.io/spring-ai/reference/)
