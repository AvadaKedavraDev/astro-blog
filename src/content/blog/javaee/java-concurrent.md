---
title: "Java 并发"
pubDate: 2024-02-15
description: "Java并发速查"
tags: [ "Java", "并发" ]
#coverImage: "/images/docker-cover.jpg"
readingTime: 15
pinned: true

# 系列文章
series:
  name: "Java 基础"
  order: 1
---

## 线程的生命周期？

![线程生命周期](https://cdn.image.moonpeak.cn/20260211155915121.webp)

### 线程的创建方式和实现

::: code-group labels=[方式一,方式二,方式三,方式四]

```java [方式一]

@Test
void createThreadNewThread() {
    new Thread(() -> System.out.println("线程启动")).start();
}
```

```java [方式二]
2
```

```java [方式三]
3
```

```java [方式四]
4
```

:::

### 线程异常会怎么样？如何处理异常？

- 若异常没有捕获，则会导致改线程停止执行，同时若该线程持有某个对象的监视器，此时也会释放。
- 正常来说线程异常和线程内任务执行异常
- [图片使用指南](/blog/test/image-guide/)

### 手写线程池参数配置，解释为什么这样设置

```java
public class MoonpeakThreadPool {
    // 获取 CPU 核心数
    private static final int CPU_CORES = Runtime.getRuntime().availableProcessors();

    public static ThreadPoolExecutor createExecutor() {
        return new ThreadPoolExecutor(
                CPU_CORES + 1,                 // 1. corePoolSize 核心线程数
                CPU_CORES * 2,                 // 2. maximumPoolSize 最大线程数
                60L,                           // 3. keepAliveTime 最大空闲存活时间
                TimeUnit.SECONDS,              // 4. unit 单位
                new LinkedBlockingQueue<>(500),// 5. workQueue 工作队列
                new ThreadFactoryBuilder()     // 6. threadFactory 线程
                        .setNameFormat("moonpeak-pool-%d").build(),
                new ThreadPoolExecutor.CallerRunsPolicy() // 7. handler
        );
    }
}
```

1. 参数配置详解与逻辑
    1. 核心线程数 (corePoolSize)：CPU + 1 如果是 CPU 密集型（如加密、大量计算），核心数设为 N 左右可以减少上下文切换。多出的
       +1 是为了在偶发页缺失（Page Fault）或其他暂停时，多出一个线程顶上，保证 CPU 满载。
       > [!tip]  moonpeak 笔记：如果是 I/O 密集型（如访问数据库、请求 MLLP 接口），这个值通常设为 2N 甚至更多

    2. 最大线程数 (maximumPoolSize)：2 * CPU：为了应对突发流量。当队列满了，系统需要临时增加“临时工”线程来处理任务，防止系统卡死。
    3. 任务队列 (workQueue)：必须是有界队列。如果设为无界（默认），当任务堆积时会撑爆内存，导致 OOM。 容量选择：根据业务响应时间（RT）和
       QPS 计算。例如：如果系统每秒产生 100 个任务，处理一个任务需 1s，队列设为 500 可以缓冲 5 秒的压力。
    4. 拒绝策略 (handler)：CallerRunsPolicy是最稳健的策略。当线程池和队列全满时，让提交任务的线程（比如主线程）自己去执行这个任务。
       这会产生一个“回压”信号，减慢生产者的速度，给线程池腾出喘息时间，同时保证任务不丢失。
2. 动态配置公式：
   $$线程数 = CPU 核心数 \times 目标 CPU 利用率 \times (1 + \frac{等待时间}{计算时间})$$
    - 计算时间 (W/C)：线程处理业务逻辑的时间。
    - 等待时间 (Wait)：线程等待 I/O（如请求数据库、MLLP 响应）的时间。
    - 结论：I/O 等待时间越长，线程数就应该设得越大。