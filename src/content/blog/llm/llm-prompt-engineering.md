---
title: "Prompt工程"
pubDate: 2024-02-15
description: "Prompt工程一览"
tags: ["LLM"]
#coverImage: "/images/docker-cover.jpg"
readingTime: 15
pinned: true

# 系列文章
series:
  name: "LLM 入门到实战"
  order: 2
---

# Prompt工程

Prompt Engineering（提示工程）的常见技术和方法可以分为基础技巧、进阶框架、结构化方法和优化策略四个层面。以下是当前主流的实践分类：

## 一、基础提示技巧

### 1. Zero-shot（零样本提示）
> [!tip] 核心：直接描述任务，零示例
> 直接描述任务，不提供示例。适用于模型已经理解的基础任务。

```python 
response = llm.invoke([HumanMessage(content="人工智能正在改变生活方式，翻译这句话")])
```

### 2. Few-shot（少样本提示）
> [!tip] 核心：直接描述任务，零示例
> 提供2-5个输入-输出示例，让模型通过上下文学习模式。

```python
# 定义示例库
examples = [
    {"input": "开心", "output": "Joyful, elated, cheerful"},
    {"input": "难过", "output": "Melancholic, sorrowful, dejected"},
    {"input": "生气", "output": "Irritated, furious, indignant"}
]

example_prompt = ChatPromptTemplate.from_messages([
    ("human", "{input}"),
    ("ai", "{output}")
])

few_shot_prompt = FewShotChatMessagePromptTemplate(
    example_prompt=example_prompt,
    examples=examples,
    input_variables=["input"]
)

final_prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个提供英文同义词的专家，给出3个不同程度的近义词。"),
    few_shot_prompt,
    ("human", "{input}"),  # 实际查询
])

few_shot_chain = final_prompt | llm
print(few_shot_chain.invoke({"input": "害怕"}).content)
```

<details>
<summary>无样本提示输出结果</summary>

::: code-group labels=[无样本输出, 少量样本输出]

```text [无样本输出]
**害怕** 的英文同义词（按程度递增）：  
1. **Worry**（轻度：担忧，对可能的负面结果感到不安）  
2. **Fear**（中度：恐惧，对具体威胁的直接反应）  
3. **Panic**（重度：恐慌，极度的恐惧伴随生理反应）  

**中文近义词参考**（供理解）：  
- 轻度：担心、忧虑  
- 中度：畏惧、惊惶  
- 重度：惊恐、恐慌  

可根据具体语境选择更贴切的词汇。
```

```text [少量样本输出]
Afraid, fearful, terrified
```
:::
</details>

### 3. Chain-of-Thought（思维链 / CoT）
在示例中展示推理步骤，引导模型"逐步思考"。

## 二、进阶推理框架

### 1. Zero-shot-CoT / Auto-CoT
不借助示例，仅通过在问题后添加"让我们一步步思考"等触发词激活推理能力。

### 2. Tree of Thoughts（思维树 / ToT）
将推理过程展开为树状结构，探索多条路径并评估，适用于复杂决策。
生成多个思考步骤
评估每个步骤的得分
回溯或继续深入最有希望的路径

### 3. ReAct（Reasoning + Acting）
交替进行思考（Thought）和行动（Action），并观察环境反馈（Observation），适合工具使用场景。

### 4. Self-Consistency（自一致性）
对同一问题采样多个CoT推理路径，选择出现频率最高的答案，提高准确性。

## 三、结构化与角色设定

### Role Prompting（角色扮演）
赋予模型特定身份，激活相关领域知识和表达风格。

### System/User/Assistant分层
区分系统指令（全局规则）和用户输入（具体请求），这是ChatGPT/Claude等对话模型的标准用法。

### Structured Output（结构化输出）
强制指定输出格式（JSON、Markdown表格、YAML等），便于程序解析。

## 四、优化与工程化方法

 ### 1. Prompt Chaining（提示链）
将复杂任务拆分为多个子任务，前一阶段的输出作为后一阶段的输入，降低单次推理复杂度。

 ### 2. Reflexion（自我反思）
让模型评估自己的输出，发现错误并修正。
请检查你刚才的回答，是否有逻辑错误或遗漏？

 ### 3. Directional Stimulus Prompting（定向刺激）
在提示中加入关键词或提示性线索，引导模型关注特定方面。

 ### 4. APE（Automatic Prompt Engineering）
使用算法自动生成和筛选最优提示词，减少人工试错。

 ### 5. RAG增强提示（Retrieval-Augmented Generation）
 在提示中插入从知识库检索的相关上下文，解决知识时效性和幻觉问题