---
title: "LangChain手册"
pubDate: 2024-02-15
description: "LangChain速查"
tags: ["LLM", "教程", "LangChin"]
#coverImage: "/images/docker-cover.jpg"
readingTime: 15
pinned: true

# 系列文章
series:
  name: "LLM 入门到实战"
  order: 1
---
# LangChain 入门

> [!info] 什么是 LangChain？
> LangChain 是一个用于构建 LLM（大语言模型）应用的 Python/JS 框架，它提供了：
> - 标准化接口：统一调用 OpenAI、Anthropic、本地模型等
> - 链式组合：将多个组件（Prompt → LLM → 输出解析）串联
> - 记忆管理：支持对话历史的短期/长期记忆
> - 工具调用：让 LLM 使用外部 API、搜索、计算等工具（Agent）

[官方文档](https://python.langchain.com/docs/get_started/introduction)

> [!tip] 安装环境
> ```bash # 基础安装
> pip install langchain
>
> # 常见模型 provider（任选其一或多个）
> pip install langchain-openai    # OpenAI GPT
> pip install langchain-anthropic # Claude
> pip install langchain-ollama    # 本地模型
>
> # 其他常用依赖
> pip install langchain-community  # 第三方集成
> pip install langchainhub        # Prompt 模板库 
>```

## 1. Hello LangChain 基础示例

### 1.1 直接调用

```python {4-5}
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage

llm = ChatOllama(model="qwen3:8b", temperature=0.8)
response = llm.invoke([HumanMessage(content="你好，请介绍一下自己")])

print(response.content)
```
结果：
```console
你好！我叫通义千问，是通义实验室研发的超大规模语言模型。我的知识和能力来源于大量的文本数据训练，能够帮助用户完成多种任务，比如：

1. **回答问题**：无论是日常疑问还是专业领域的问题，我都可以提供参考答案。
2. **创作文字**：包括写故事、写邮件、写剧本、写代码注释等。
3. **逻辑推理**：帮助分析问题、解决数学题、编程问题等。
4. **多语言支持**：我支持多种语言，包括中文、英文、日文、韩文等。
5. **日常交流**：可以进行闲聊、提供建议、分享知识等。

我的目标是成为用户在学习、工作和生活中的智能助手，帮助他们更高效地获取信息和解决问题。如果你有任何问题或需要帮助，随时告诉我！😊
```

### 1.2 使用 Prompt 模板调用

```python {5-8,14,17-20}
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama

# 创建模板
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一位专业的{role}，用中文回答问题。"),
    ("human", "{question}")
])

# 模型
llm = ChatOllama(model="qwen3:8b", temperature=0.8)

# 组合成 Chain（管道操作符 |）
chain = prompt | llm

# 运行
result = chain.invoke({
    "role": "Python 导师",
    "question": "有哪些基础变量？"
})

print(result.content)
```

## 2. 核心组件详解

### 2.1 Chain（链） 

```python {9-13,15}
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama

# 模型
llm = ChatOllama(model="qwen3:8b", temperature=0.8)

# 完整链条：Prompt -> LLM -> 字符串输出
chain = (
    ChatPromptTemplate.from_template("用一句话解释{concept}")
    | llm
    | StrOutputParser()  # 提取纯文本
)

output = chain.invoke({"concept": "递归函数"})

print(output)
# 递归函数是一种通过调用自身来解决问题的方法，通常包含一个终止条件以防止无限循环。
```

### 2.1 Memory（记忆）

```python {12-16,25-29,31-37}
from langchain.chains import ConversationChain
from langchain_core.chat_history import InMemoryChatMessageHistory
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnableWithMessageHistory
from langchain_ollama import ChatOllama

# 1. 初始化模型
llm = ChatOllama(model="qwen3:8b", temperature=0.8)

# 2. 定义提示模板（使用 MessagesPlaceholder 注入历史）
prompt = ChatPromptTemplate.from_messages([
    ("system", "你是一个有用的助手。请用中文回答。"),
    MessagesPlaceholder(variable_name="history"),  # 历史消息占位符
    ("human", "{input}")
])

# 3. 构建基础 chain
chain = prompt | llm | StrOutputParser()

# 4. 存储历史会话
store = {}

# 创建对话链
def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    """根据 session_id 获取或创建对话历史"""
    if session_id not in store:
        store[session_id] = InMemoryChatMessageHistory()
    return store[session_id]

# 5. 包装为带历史记录的 Runnable
conversation = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",  # 输入消息的键名
    history_messages_key="history"  # 历史消息的键名（与 MessagesPlaceholder 对应）
)

# 6. 使用方式（必须传入 config 指定 session_id）
config = {"configurable": {"session_id": "user_123"}}

# 第一次对话
response1 = conversation.invoke(
    {"input": "你好，我叫张三"},
    config=config
)

# 第二次对话（能记住名字）
response2 = conversation.invoke(
    {"input": "我叫什么名字？"},
    config=config
)

print(response2)
# 你好，张三！我刚刚确认了你的名字，很高兴认识你。有什么我可以帮你的吗？
```

### 2.3 Agent（代理）

让 LLM 自主决策并使用工具：

```python
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain.agents import create_react_agent, AgentExecutor
from langchain_core.prompts import PromptTemplate
from langchain_ollama import ChatOllama
import os

# 设置 Tavily API Key（https://tavily.com 免费注册获取）
os.environ["TAVILY_API_KEY"] = "tvly-dev-key"

# 初始化工具（中文描述帮助模型理解工具用途）
tools = [
    TavilySearchResults(
        max_results=3,
        description="搜索引擎，用于查找实时信息、新闻、百科知识等网络内容"
    )
]

# 初始化本地模型
llm = ChatOllama(model="qwen3:8b", temperature=0)

# 中文 ReAct 提示模板
# 注意：Thought/Action/Action Input/Observation/Final Answer 必须保持英文
# 这些是 Agent 的解析标记，改为中文会导致识别失败
template = """尽可能回答用户问题。你可以使用以下工具：

{tools}

使用以下格式：

Question: 需要回答的输入问题
Thought: 思考应该采取什么行动
Action: 要执行的行动，必须是 [{tool_names}] 之一
Action Input: 行动的输入（直接的问题或关键词）
Observation: 行动执行后的返回结果
...（Thought/Action/Action Input/Observation 可以重复多次）
Thought: 我现在知道最终答案了
Final Answer: 对原始问题的最终回答（用中文回答）

重要提示：当前年份是2026年，如果问题涉及最新事件，必须使用工具搜索，不要依赖预训练知识。

开始回答！

Question: {input}
Thought:{agent_scratchpad}"""

# 创建提示模板
prompt = PromptTemplate.from_template(template)

# 创建 Agent
agent = create_react_agent(llm, tools, prompt)

# 创建执行器
agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=False,  # 关闭详细日志避免乱码
    handle_parsing_errors=True,  # 自动处理解析错误
    max_iterations=5  # 最多思考5步，防止死循环
)

# 运行查询
if __name__ == "__main__":
    question = "2024年春晚节目单？"
    print(f"问题：{question}")
    print("-" * 50)

    try:
        response = agent_executor.invoke({"input": question})
        print(f"答案：{response['output']}")
    except Exception as e:
        print(f"执行出错：{e}")
```

<details>
<summary>结果如下，展开</summary>

```
问题：2024年春晚节目单？
--------------------------------------------------
答案：2024年中央广播电视总台春节联欢晚会节目单如下（按实际顺序整理）：

**主要节目：**
1. **开场节目**《鼓舞龙腾》- 许娣、刘佩琪、苏有朋、陈龙、沙溢、王阳、胡歌、唐嫣、黄轩、辛芷蕾、杨幂、毛晓彤、宋轶、侯雯元、黄曦彦、史仓库、谭金淘、刘影等
2. **歌曲**《嘿 少年》- 王凯、陈伟霆、朱一龙
3. **相声**《我要不一样》- 岳云鹏、孙越
4. **创意年俗秀**《别开生面》- 黑撒乐队、李亮节、白举纲、曾舜晞（特邀乐队：胡歌、唐嫣、辛芷蕾、陈龙）
....
```

</details>


### 2.4 完整RAG问答demo

```python
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import CharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama import ChatOllama, OllamaEmbeddings

# 1. 加载 & 切分（不变）
loader = TextLoader("company_manual.txt", encoding="utf-8")

documents = loader.load()
text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
texts = text_splitter.split_documents(documents)

# 2. 向量数据库（使用本地 Ollama 嵌入，无需 OpenAI API Key）
embeddings = OllamaEmbeddings(model="shaw/dmeta-embedding-zh:latest")
vectorstore = FAISS.from_documents(texts, embeddings)

# 3. 构建 LCEL RAG 链
retriever = vectorstore.as_retriever(search_kwargs={"k": 3})

template = """基于以下上下文回答问题。如果不知道，就说"根据资料无法确定"。

上下文：
{context}

问题：{question}

请用中文回答："""

prompt = ChatPromptTemplate.from_template(template)

def format_docs(docs):
    """将检索到的文档格式化为字符串"""
    return "\n\n".join(f"[来源{i+1}] {doc.page_content}"
                      for i, doc in enumerate(docs))

# 构建链：输入 → 检索+格式化 → 填充模板 → LLM → 输出
rag_chain = (
    {
        "context": retriever | format_docs,  # 检索并格式化文档
        "question": RunnablePassthrough()     # 直接传递用户问题
    }
    | prompt
    | ChatOllama(model="qwen3:8b")
    | StrOutputParser()
)

# 4. 提问（新版用 invoke，不再传字典）
result = rag_chain.invoke("公司的年假政策是什么？")
print(result)

# 5. 如需查看来源（手动获取）
docs = retriever.invoke("公司的年假政策是什么？")
print("\n参考片段：")
for i, doc in enumerate(docs, 1):
    print(f"{i}. {doc.page_content[:100]}...")
```


<details>
<summary>结果如下，展开</summary>


```
公司的年假政策如下：

1. **年假天数**根据入职年限确定：
   - 入职满1年不满3年：每年5天带薪年假  
   - 入职满3年不满5年：每年7天带薪年假  
   - 入职满5年不满10年：每年10天带薪年假  
   - 入职满10年以上：每年15天带薪年假  

2. **年假使用规则**：
   - 年假可累积至次年3月31日前使用，逾期清零。  
   - 申请年假需提前3个工作日通过OA系统提交申请，并经直接上级审批后方可休假。

3. **其他假期**按国家规定执行：
   - **婚假**：3天，晚婚者可享受15天（含周末）。  
   - **产假**：158天（含国家规定的98天基础产假和60天延长产假）。  
   - **男员工陪产假**：15天。  

（依据来源1）

参考片段：
1. 【科技有限公司员工手册】

第一章：考勤与休假制度

1.1 工作时间
公司实行弹性工作制，核心工作时间为上午10:00至下午4:00。标准工作时长为每日8小时，每周40小时。
上班时间可在上午8:3...
2. 6.1 办公区域管理
- 办公位保持整洁，下班时关闭电脑和显示器
- 会议室使用后恢复原状，白板擦拭干净
- 茶水间禁止讨论涉密信息
- 访客需在前台登记并由员工全程陪同

6.2 着装要求
周一至周...
3. 第三章：报销与财务制度

3.1 差旅报销标准
国内出差住宿标准：
- 一线城市（北上广深）：每晚不超过500元
- 二线城市：每晚不超过400元
- 三线城市：每晚不超过300元

交通标准：
- ...
```


</details>
