---
title: "基于 Spring AI 构建 RAG 知识库系统（入门版）"
pubDate: 2026-03-24
description: "使用 Spring AI 框架快速构建 RAG 知识库问答系统，通过声明式 API 对接 Ollama 本地大模型。适合快速原型验证和框架体验，同时也讨论其版本兼容性限制。"
tags: ["Spring AI", "Ollama", "RAG", "知识库", "入门教程"]
categories: ["LLM"]
author: "moonpeak"
readingTime: 15
draft: false
---

> [!tip]
> 本文介绍使用 **Spring AI** 框架快速构建 RAG 系统的方法，适合快速原型开发。
> 
> 如果你关注生产环境落地、版本兼容性，推荐阅读：[《从 Spring AI 到原生 HTTP》](./moonpeak-ai-native-rag)

## 引言

Spring AI 是 Spring 官方推出的 AI 应用开发框架，它将 LLM（大语言模型）的能力抽象为熟悉的 Spring 编程模型：

- `ChatClient` - 对话客户端
- `EmbeddingModel` - 嵌入模型
- `VectorStore` - 向量存储

这种抽象让我们可以用几行代码实现 RAG 功能，非常适合快速验证想法。

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                     用户查询界面                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spring Boot 应用层                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Chat API   │  │ Embedding   │  │   Document Store    │  │
│  │  Controller │  │  Service    │  │    Repository       │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
└─────────┼────────────────┼────────────────────┼─────────────┘
          │                │                    │
          ▼                ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                   Spring AI 抽象层                           │
│         (ChatClient, EmbeddingClient, VectorStore)          │
└─────────────────────┬───────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│      Ollama      │    │   向量数据库      │
│  (本地 LLM 服务)  │    │ (Chroma/PGVector) │
└──────────────────┘    └──────────────────┘
```

## 环境准备

### 1. 安装 Ollama

```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows 下载安装包
# https://ollama.com/download/windows
```

### 2. 拉取模型

```bash
# 聊天模型
ollama pull qwen3:8b

# 嵌入模型（BGE-M3 支持 8192 tokens，适合中文）
ollama pull bge-m3
```

### 3. 启动向量数据库

```bash
# Chroma
 docker run -d -p 8000:8000 chromadb/chroma:0.5.5
```

> [!warning]
> **版本兼容性注意**：Spring AI 1.x 仅支持 Chroma v1 API。
> Chroma 1.0.0+ 使用 v2 API，与 Spring AI 1.x 不兼容。
> 如需使用 Chroma 1.0.0+，请考虑 [原生 HTTP 方案](./moonpeak-ai-native-rag)。

## 项目构建

### Maven 依赖

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project>
    <modelVersion>4.0.0</modelVersion>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.0</version>
    </parent>
    
    <groupId>com.example</groupId>
    <artifactId>knowledge-base-rag</artifactId>
    <version>1.0.0</version>
    
    <properties>
        <java.version>21</java.version>
        <spring-ai.version>1.0.0-M2</spring-ai.version>
    </properties>
    
    <dependencies>
        <!-- Spring Boot Web -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        
        <!-- Spring AI Ollama -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-ollama-spring-boot-starter</artifactId>
        </dependency>
        
        <!-- Spring AI Chroma -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-chroma-store-spring-boot-starter</artifactId>
        </dependency>
        
        <!-- 文档解析 -->
        <dependency>
            <groupId>org.springframework.ai</groupId>
            <artifactId>spring-ai-tika-document-reader</artifactId>
        </dependency>
        
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
    </dependencies>
    
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>org.springframework.ai</groupId>
                <artifactId>spring-ai-bom</artifactId>
                <version>${spring-ai.version}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
</project>
```

### 应用配置

```yaml
spring:
  ai:
    ollama:
      base-url: http://localhost:11434
      chat:
        model: qwen3:8b
        options:
          temperature: 0.7
      embedding:
        model: bge-m3
    vectorstore:
      chroma:
        client:
          host: http://localhost
          port: 8000
        collection-name: knowledge-base
        initialize-schema: true

server:
  port: 8080
```

## 核心代码实现

### 1. 文档摄入服务

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class DocumentIngestionService {
    
    private final VectorStore vectorStore;
    
    /**
     * 文档分块并存储
     */
    public void ingestDocument(Resource resource) {
        try {
            // 1. 读取文档
            TikaDocumentReader reader = new TikaDocumentReader(resource);
            List<Document> documents = reader.get();
            
            log.info("读取文档，段落数: {}", documents.size());
            
            // 2. 分割文档
            TokenTextSplitter splitter = new TokenTextSplitter(
                512,    // 最大 token
                100,    // 最小 token
                50,     // 重叠 token
                1000,   // 最大字符
                true
            );
            
            List<Document> chunks = splitter.apply(documents);
            log.info("分割为 {} 个片段", chunks.size());
            
            // 3. 存储到向量库
            vectorStore.add(chunks);
            log.info("文档索引完成");
            
        } catch (Exception e) {
            log.error("文档处理失败", e);
            throw new RuntimeException("文档摄入失败", e);
        }
    }
}
```

### 2. RAG 问答服务

```java
@Service
@Slf4j
@RequiredArgsConstructor
public class KnowledgeBaseService {
    
    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    
    private static final String RAG_TEMPLATE = """
        你是一个知识库助手，基于以下资料回答问题。
        
        === 参考资料 ===
        {context}
        
        === 规则 ===
        1. 严格基于参考资料回答
        2. 资料不足时明确告知
        3. 引用来源 [来源: xxx]
        
        用户问题：{question}
        """;
    
    /**
     * RAG 问答
     */
    public String answer(String question) {
        // 1. 检索相关文档
        SearchRequest request = SearchRequest.builder()
            .query(question)
            .topK(5)
            .similarityThreshold(0.7)
            .build();
        
        List<Document> docs = vectorStore.similaritySearch(request);
        log.info("检索到 {} 个片段", docs.size());
        
        // 2. 组装上下文
        String context = docs.stream()
            .map(doc -> String.format("[来源: %s]\n%s",
                doc.getMetadata().getOrDefault("source", "未知"),
                doc.getText()))
            .collect(Collectors.joining("\n\n---\n\n"));
        
        // 3. 生成回答
        String prompt = RAG_TEMPLATE
            .replace("{context}", context)
            .replace("{question}", question);
        
        return chatClient.prompt()
            .system(prompt)
            .user(question)
            .call()
            .content();
    }
    
    /**
     * 流式回答
     */
    public Flux<String> streamAnswer(String question) {
        SearchRequest request = SearchRequest.builder()
            .query(question)
            .topK(5)
            .build();
        
        List<Document> docs = vectorStore.similaritySearch(request);
        String context = formatContext(docs);
        
        String prompt = RAG_TEMPLATE
            .replace("{context}", context)
            .replace("{question}", question);
        
        return chatClient.prompt()
            .system(prompt)
            .user(question)
            .stream()
            .content();
    }
    
    private String formatContext(List<Document> docs) {
        return docs.stream()
            .map(Document::getText)
            .collect(Collectors.joining("\n\n"));
    }
}
```

### 3. REST 控制器

```java
@RestController
@RequestMapping("/api/knowledge")
@RequiredArgsConstructor
public class KnowledgeBaseController {
    
    private final KnowledgeBaseService knowledgeService;
    private final DocumentIngestionService ingestionService;
    
    /**
     * 上传文档
     */
    @PostMapping("/upload")
    public ResponseEntity<String> upload(@RequestParam("file") MultipartFile file) {
        try {
            Resource resource = new InputStreamResource(file.getInputStream());
            ingestionService.ingestDocument(resource);
            return ResponseEntity.ok("上传成功");
        } catch (Exception e) {
            return ResponseEntity.status(500)
                .body("失败: " + e.getMessage());
        }
    }
    
    /**
     * 同步问答
     */
    @PostMapping("/ask")
    public ResponseEntity<AnswerResponse> ask(@RequestBody AskRequest request) {
        String answer = knowledgeService.answer(request.getQuestion());
        return ResponseEntity.ok(new AnswerResponse(answer));
    }
    
    /**
     * 流式问答 (SSE)
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> stream(@RequestParam String question) {
        return knowledgeService.streamAnswer(question)
            .map(content -> ServerSentEvent.builder(content).build());
    }
    
    @Data
    public static class AskRequest {
        private String question;
    }
    
    @Data
    @AllArgsConstructor
    public static class AnswerResponse {
        private String answer;
    }
}
```

### 4. 启动类

```java
@SpringBootApplication
public class KnowledgeBaseApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(KnowledgeBaseApplication.class, args);
    }
    
    @Bean
    public ChatClient chatClient(ChatClient.Builder builder) {
        return builder.build();
    }
}
```

## 前端示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>知识库问答</title>
    <style>
        body { max-width: 800px; margin: 0 auto; padding: 20px; font-family: system-ui; }
        .chat-container { border: 1px solid #ddd; border-radius: 8px; padding: 20px; min-height: 400px; }
        .message { margin: 10px 0; padding: 12px; border-radius: 8px; }
        .user { background: #e3f2fd; text-align: right; }
        .assistant { background: #f5f5f5; }
        .input-area { display: flex; gap: 10px; margin-top: 20px; }
        input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { padding: 10px 20px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .upload-area { margin-bottom: 20px; padding: 20px; border: 2px dashed #ccc; border-radius: 8px; text-align: center; }
    </style>
</head>
<body>
    <h1>📚 知识库问答系统</h1>
    
    <div class="upload-area">
        <input type="file" id="fileInput" accept=".pdf,.doc,.docx,.txt,.md" />
        <button onclick="uploadFile()">上传文档</button>
        <span id="uploadStatus"></span>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="message assistant">你好！请上传文档或直接提问。</div>
    </div>
    
    <div class="input-area">
        <input type="text" id="questionInput" placeholder="输入问题..." 
               onkeypress="if(event.key==='Enter')sendQuestion()">
        <button onclick="sendQuestion()">发送</button>
    </div>

    <script>
        const API_BASE = 'http://localhost:8080/api/knowledge';
        
        async function uploadFile() {
            const fileInput = document.getElementById('fileInput');
            if (!fileInput.files.length) {
                alert('请选择文件');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            document.getElementById('uploadStatus').textContent = '上传中...';
            try {
                const response = await fetch(`${API_BASE}/upload`, {
                    method: 'POST',
                    body: formData
                });
                const result = await response.text();
                document.getElementById('uploadStatus').textContent = result;
            } catch (e) {
                document.getElementById('uploadStatus').textContent = '上传失败';
            }
        }
        
        async function sendQuestion() {
            const input = document.getElementById('questionInput');
            const question = input.value.trim();
            if (!question) return;
            
            addMessage(question, 'user');
            input.value = '';
            
            // 使用 SSE 流式响应
            const eventSource = new EventSource(
                `${API_BASE}/stream?question=${encodeURIComponent(question)}`
            );
            
            let answerDiv = null;
            eventSource.onmessage = (event) => {
                if (!answerDiv) {
                    answerDiv = addMessage('', 'assistant');
                }
                answerDiv.textContent += event.data;
            };
            
            eventSource.onerror = () => {
                eventSource.close();
            };
        }
        
        function addMessage(text, role) {
            const container = document.getElementById('chatContainer');
            const div = document.createElement('div');
            div.className = `message ${role}`;
            div.textContent = text;
            container.appendChild(div);
            container.scrollTop = container.scrollHeight;
            return div;
        }
    </script>
</body>
</html>
```

## 版本兼容性说明

### Spring AI 版本现状

| 版本 | Boot 要求 | 稳定性 | 说明 |
|------|----------|--------|------|
| 1.0.0-M2 | 3.2.x | 里程碑 | Chroma 仅支持 v1 API |
| 1.0.0-M3 | 3.2.x | 里程碑 | 有破坏性变更 |
| 2.0.0-M4 | 4.x | 里程碑 | 大幅重构 |

### 生产环境建议

- **原型验证**：使用 Spring AI 1.0.0-M2 + Chroma 0.5.5
- **生产部署**：考虑 [原生 HTTP 方案](./moonpeak-ai-native-rag)，原因：
  1. Spring Boot 4.x 尚未 GA
  2. 国内主流环境仍是 Boot 3.x
  3. 原生方案可控性更高

## 性能优化

### 模型选择

| 模型 | 显存 | 速度 | 质量 | 场景 |
|------|------|------|------|------|
| qwen3:4b | 4GB | 快 | 良好 | 低显存部署 |
| qwen3:8b | 8GB | 快 | 优秀 | 平衡选择（推荐）|
| qwen3:30b | 24GB | 中等 | 极佳 | 高质量回答 |

### 分块参数调优

```java
// 代码文档
TokenTextSplitter codeSplitter = new TokenTextSplitter(256, 50, 20, 500, true);

// 普通文档
TokenTextSplitter docSplitter = new TokenTextSplitter(1024, 200, 100, 2000, true);
```

## 总结

Spring AI 提供了一种**声明式**的 AI 开发体验：

**优点：**
- 几行代码实现 RAG
- 熟悉的 Spring 编程模型
- 便于快速原型验证

**局限：**
- 版本迭代快，API 不稳定
- Chroma 1.0.0+ 不兼容
- 隐藏 HTTP 细节，调试困难

**适用场景：**
- ✅ 技术预研/原型验证
- ✅ 学习 RAG 概念
- ❌ 生产环境长期维护

---

**相关文章：**
- [《从 Spring AI 到原生 HTTP：生产级 RAG 系统构建》](./moonpeak-ai-native-rag) - 生产环境推荐方案

**参考资源：**
- [Spring AI 文档](https://docs.spring.io/spring-ai/reference/)
- [Ollama 模型库](https://ollama.com/library)
