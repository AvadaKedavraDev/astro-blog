---
title: "Java 并发基础"
pubDate: 2024-02-15
description: "Java并发编程基础速查：线程生命周期、创建方式、线程池配置"
tags: [ "Java", "并发" ]
#coverImage: "/images/docker-cover.jpg"
readingTime: 25
pinned: true

# 系列文章
series:
  name: "Java 基础"
  order: 2
---

> Java 并发编程是后端开发的核心技能，本文涵盖线程基础、生命周期、创建方式及线程池配置。

---

## 线程的生命周期

### 线程的 6 种状态

```
NEW → RUNNABLE → (BLOCKED/WAITING/TIMED_WAITING) → TERMINATED
```

| 状态                | 说明   | 触发条件                                      |
|-------------------|------|-------------------------------------------|
| **NEW**           | 新建状态 | 创建 Thread 对象，未调用 `start()`                |
| **RUNNABLE**      | 可运行  | 调用 `start()`，可能正在运行或在等待 CPU 时间片           |
| **BLOCKED**       | 阻塞   | 等待获取监视器锁（如 `synchronized`）                |
| **WAITING**       | 无限等待 | 调用 `wait()`、`join()`、`LockSupport.park()` |
| **TIMED_WAITING** | 限时等待 | 调用 `sleep(ms)`、`wait(ms)`、`join(ms)`      |
| **TERMINATED**    | 终止   | 线程执行完毕或异常退出                               |

### 线程状态流转图

![线程生命周期](https://cdn.image.moonpeak.cn/20260211155915121.webp)

### 状态转换详解

```
┌─────────┐   start()   ┌───────────┐
│   NEW   │ ──────────→ │ RUNNABLE  │
└─────────┘             └─────┬─────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────────┐
│    BLOCKED    │    │   WAITING     │    │  TIMED_WAITING    │
│ (等待同步锁)   │    │ (无限期等待)   │    │   (限期等待)       │
└───────┬───────┘    └───────┬───────┘    └─────────┬─────────┘
        │                    │                      │
        │ lock acquired      │ notify/interrupt     │ timeout/interrupt
        └────────────────────┴──────────────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  TERMINATED │
                    └─────────────┘
```

---

## 线程的创建方式

Java 中有 4 种创建线程的方式：

::: code-group labels=[继承Thread,实现Runnable,实现Callable,线程池创建]

```java [继承Thread]
// 方式一：继承 Thread 类
class MyThread extends Thread {
    @Override
    public void run() {
        System.out.println(Thread.currentThread().getName() + " 执行");
    }
}

// 使用
MyThread thread = new MyThread();
thread.

start();
```

```java [实现Runnable]
// 方式二：实现 Runnable 接口（推荐）
class MyRunnable implements Runnable {
    @Override
    public void run() {
        System.out.println(Thread.currentThread().getName() + " 执行");
    }
}

// 使用
Thread thread = new Thread(new MyRunnable());
thread.

start();

// Lambda 简化
new

Thread(() ->System.out.

println("线程启动")).

start();
```

```java [实现Callable]
// 方式三：实现 Callable 接口（可返回结果、可抛异常）

import java.util.concurrent.*;

class MyCallable implements Callable<String> {
    @Override
    public String call() throws Exception {
        Thread.sleep(1000);
        return "任务结果";
    }
}

// 使用（需要 FutureTask 包装）
FutureTask<String> futureTask = new FutureTask<>(new MyCallable());
new

Thread(futureTask).

start();

// 获取结果（阻塞）
try{
String result = futureTask.get();
    System.out.

println(result);
}catch(
Exception e){
        e.

printStackTrace();
}
```

```java [线程池创建]
// 方式四：使用线程池（最佳实践）

import java.util.concurrent.*;

// 创建固定线程池
ExecutorService executor = Executors.newFixedThreadPool(4);

// 提交 Runnable 任务（无返回值）
executor.

        execute(() ->System.out.

        println("Runnable 任务"));

        // 提交 Callable 任务（有返回值）
        Future<Integer> future = executor.submit(() -> {
            return 42;
        });

// 获取结果
try{
        Integer result = future.get(5, TimeUnit.SECONDS);
}catch(
        Exception e){
        e.

        printStackTrace();
}

// 关闭线程池
        executor.

        shutdown();
```

:::

### 四种方式对比

| 方式          | 优点          | 缺点             | 适用场景       |
|-------------|-------------|----------------|------------|
| 继承 Thread   | 简单直接        | 无法继承其他类，耦合度高   | 简单任务       |
| 实现 Runnable | 解耦任务和线程，可共享 | 无返回值           | 大多数场景      |
| 实现 Callable | 有返回值，可抛异常   | 需要 Future 获取结果 | 需要返回结果的任务  |
| 线程池         | 复用线程，可控管理   | 需要正确关闭         | **生产环境首选** |

> [!tip]
> 生产环境**严禁**使用 `Executors` 的便捷方法创建线程池（有 OOM 风险），应使用 `ThreadPoolExecutor` 手动配置参数。

---

## 线程异常处理

### 异常影响

- **未捕获异常**：导致线程终止执行，但**不会**影响其他线程或主线程
- **持有锁时异常**：异常会释放当前线程持有的所有监视器锁（`synchronized`）
- **线程池中的异常**：线程会被销毁，线程池会创建新线程替代

### 异常处理方式

#### 1. 任务内 try-catch

```java
new Thread(() ->{
        try{
// 业务逻辑
int result = 1 / 0;  // 可能抛出异常
    }catch(
Exception e){
        System.out.

println("捕获异常: "+e.getMessage());
        }
        }).

start();
```

#### 2. 设置未捕获异常处理器

```java
Thread thread = new Thread(() -> {
    int result = 1 / 0;
});

// 设置线程级别的处理器
thread.

setUncaughtExceptionHandler((t, e) ->{
        System.out.

println("线程 "+t.getName() +" 发生异常: "+e.

getMessage());
        // 可记录日志、发送告警等
        });

// 或设置全局默认处理器
        Thread.

setDefaultUncaughtExceptionHandler((t, e) ->{
        System.err.

println("全局异常捕获: "+e.getMessage());
        });

        thread.

start();
```

#### 3. 线程池异常处理

```java
// 包装 Callable/Runnable 捕获异常
ExecutorService executor = Executors.newFixedThreadPool(4);

Future<?> future = executor.submit(() -> {
    try {
        // 任务逻辑
        throw new RuntimeException("业务异常");
    } catch (Exception e) {
        // 方式1：任务内捕获
        System.err.println("任务内捕获: " + e.getMessage());
        throw e;  // 如需让外层感知，可重新抛出
    }
});

// 方式2：通过 Future.get() 捕获
try{
        future.

get();
}catch(
ExecutionException e){
        System.err.

println("执行异常: "+e.getCause().

getMessage());
        }
```

#### 4. 自定义 ThreadFactory

```java
class ExceptionHandlingThreadFactory implements ThreadFactory {
    private final AtomicInteger counter = new AtomicInteger(1);

    @Override
    public Thread newThread(Runnable r) {
        Thread thread = new Thread(r, "custom-pool-" + counter.getAndIncrement());
        thread.setUncaughtExceptionHandler((t, e) -> {
            System.err.println("线程池线程异常: " + t.getName() + ", 原因: " + e.getMessage());
            // 记录日志、上报监控等
        });
        return thread;
    }
}

// 使用
ExecutorService executor = new ThreadPoolExecutor(
        2, 4, 60, TimeUnit.SECONDS,
        new LinkedBlockingQueue<>(100),
        new ExceptionHandlingThreadFactory()
);
```

---

## 线程池详解

### ThreadPoolExecutor 核心参数

```java
public ThreadPoolExecutor(
        int corePoolSize,           // 核心线程数
        int maximumPoolSize,        // 最大线程数
        long keepAliveTime,         // 非核心线程空闲存活时间
        TimeUnit unit,              // 时间单位
        BlockingQueue<Runnable> workQueue,  // 任务队列
        ThreadFactory threadFactory,        // 线程工厂
        RejectedExecutionHandler handler    // 拒绝策略
)
```

### 任务提交流程

```
提交任务
    │
    ▼
当前运行线程数 < corePoolSize?
    │ 是
    ▼
创建新线程执行任务
    │
    │ 否
    ▼
任务队列未满?
    │ 是
    ▼
加入任务队列等待
    │
    │ 否
    ▼
当前运行线程数 < maximumPoolSize?
    │ 是
    ▼
创建非核心线程执行任务
    │
    │ 否
    ▼
执行拒绝策略
```

### 手写线程池配置（生产级）

```java
public class MoonpeakThreadPool {

    // 获取 CPU 核心数
    private static final int CPU_CORES = Runtime.getRuntime().availableProcessors();

    /**
     * 创建 CPU 密集型线程池
     * 适用于：复杂计算、数据处理、加密解密等
     */
    public static ThreadPoolExecutor createCpuIntensivePool() {
        return new ThreadPoolExecutor(
                CPU_CORES + 1,                    // 核心线程数：CPU + 1
                CPU_CORES + 1,                    // 最大线程数：与核心数相同
                0L,                               // 存活时间：0（核心线程不回收）
                TimeUnit.MILLISECONDS,
                new LinkedBlockingQueue<>(1000),  // 有界队列
                new ThreadFactoryBuilder()
                        .setNameFormat("cpu-pool-%d")
                        .build(),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    /**
     * 创建 IO 密集型线程池
     * 适用于：网络请求、数据库操作、文件读写等
     */
    public static ThreadPoolExecutor createIOIntensivePool() {
        // IO 密集型：2 * CPU 或更高
        int ioThreads = CPU_CORES * 2;
        return new ThreadPoolExecutor(
                ioThreads,                        // 核心线程数
                ioThreads * 2,                    // 最大线程数
                60L,                              // 空闲线程存活 60 秒
                TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(5000),  // IO 场景队列可更大
                new ThreadFactoryBuilder()
                        .setNameFormat("io-pool-%d")
                        .build(),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }

    /**
     * 创建混合型线程池（基于公式计算）
     */
    public static ThreadPoolExecutor createOptimizedPool(
            double targetCpuUtilization,  // 目标 CPU 利用率 (0-1)
            double computeTime,           // 计算时间
            double waitTime) {            // 等待时间

        // 公式：线程数 = CPU 核心数 * 目标利用率 * (1 + 等待时间/计算时间)
        int optimalThreads = (int) (CPU_CORES * targetCpuUtilization *
                (1 + waitTime / computeTime));

        // 至少保留 2 个线程
        optimalThreads = Math.max(optimalThreads, 2);

        return new ThreadPoolExecutor(
                optimalThreads,
                optimalThreads * 2,
                60L, TimeUnit.SECONDS,
                new LinkedBlockingQueue<>(1000),
                new ThreadFactoryBuilder()
                        .setNameFormat("optimized-pool-%d")
                        .build(),
                new ThreadPoolExecutor.CallerRunsPolicy()
        );
    }
}
```

### 参数配置详解

#### 1. 核心线程数 (corePoolSize)

| 场景      | 推荐值           | 原因                       |
|---------|---------------|--------------------------|
| CPU 密集型 | `CPU + 1`     | 减少上下文切换，+1 保证页缺失时 CPU 满载 |
| IO 密集型  | `2 * CPU` 或更高 | 线程等待 IO 时释放 CPU，可多开线程    |
| 混合型     | 按公式计算         | 根据计算/等待时间比例动态调整          |

#### 2. 最大线程数 (maximumPoolSize)

- **作用**：应对突发流量，作为"临时工"
- **建议**：通常为 `corePoolSize * 2` 或更高
- **风险**：过大导致频繁上下文切换，过小无法应对突发

#### 3. 任务队列 (workQueue)

| 队列类型                    | 特点         | 风险                |
|-------------------------|------------|-------------------|
| `LinkedBlockingQueue`   | 链表结构，默认无界  | **必须指定容量**，否则 OOM |
| `ArrayBlockingQueue`    | 数组结构，有界    | 容量固定，需预估          |
| `SynchronousQueue`      | 不存储任务，直接移交 | 需要足够大的线程数         |
| `PriorityBlockingQueue` | 优先级排序      | 需实现 Comparable    |

> [!warning]
> **绝对不要使用无界队列**！当生产者速度远大于消费者时，队列会无限增长导致 OOM。

#### 4. 拒绝策略

| 策略                    | 行为                              | 适用场景            |
|-----------------------|---------------------------------|-----------------|
| `AbortPolicy` (默认)    | 直接抛出 RejectedExecutionException | 需要快速失败          |
| `CallerRunsPolicy`    | 由提交任务的线程（调用者）执行                 | **推荐**，产生回压保护系统 |
| `DiscardPolicy`       | 静默丢弃任务                          | 可容忍丢任务          |
| `DiscardOldestPolicy` | 丢弃队列最老的任务，重试提交                  | 新任务优先           |

### 线程数计算公式
$$
\text{线程数} = \text{CPU 核心数} \times \text{目标利用率} \times \left(1 + \frac{\text{等待时间}}{\text{计算时间}}\right)
$$

**参数说明**：

- **目标 CPU 利用率**：通常 0.8~1.0
- **等待时间 (Wait)**：线程等待 IO、网络、锁的时间
- **计算时间 (Compute)**：线程实际 CPU 计算时间

**计算示例**：

```
CPU: 8 核
目标利用率: 0.8
计算时间: 100ms
等待时间: 900ms (数据库查询)

线程数 = 8 * 0.8 * (1 + 900/100) = 6.4 * 10 = 64
```

---

## 线程池最佳实践

### 1. 优雅关闭线程池

```java
public void shutdownGracefully(ExecutorService executor, long timeout, TimeUnit unit) {
    // 第一阶段：优雅关闭，等待已提交任务完成
    executor.shutdown();
    try {
        // 等待指定时间
        if (!executor.awaitTermination(timeout, unit)) {
            // 第二阶段：强制关闭
            executor.shutdownNow();
            // 再次等待
            if (!executor.awaitTermination(timeout, unit)) {
                System.err.println("线程池未完全关闭");
            }
        }
    } catch (InterruptedException e) {
        // 被中断，强制关闭
        executor.shutdownNow();
        Thread.currentThread().interrupt();
    }
}
```

### 2. 线程池监控

```java
public class ThreadPoolMonitor {

    public static void printStats(ThreadPoolExecutor executor) {
        System.out.println("===== 线程池状态 =====");
        System.out.println("核心线程数: " + executor.getCorePoolSize());
        System.out.println("最大线程数: " + executor.getMaximumPoolSize());
        System.out.println("当前线程数: " + executor.getPoolSize());
        System.out.println("活跃线程数: " + executor.getActiveCount());
        System.out.println("任务队列大小: " + executor.getQueue().size());
        System.out.println("已完成任务数: " + executor.getCompletedTaskCount());
        System.out.println("总任务数: " + executor.getTaskCount());
        System.out.println("拒绝任务数: " + getRejectedCount(executor));
    }

    private static long getRejectedCount(ThreadPoolExecutor executor) {
        // 需要通过自定义 RejectedExecutionHandler 来统计
        return 0;
    }
}
```

### 3. 线程池隔离原则

```java
// ❌ 错误：所有任务共用一个大池
ExecutorService globalPool = Executors.newFixedThreadPool(100);

// ✅ 正确：按业务类型隔离
// 1. 核心业务流程独立线程池
ThreadPoolExecutor orderPool = createOrderThreadPool();
// 2. 非核心任务另建线程池
ThreadPoolExecutor reportPool = createReportThreadPool();
// 3. 第三方调用单独线程池（防止拖垮主业务）
ThreadPoolExecutor thirdPartyPool = createThirdPartyThreadPool();
```

---

## 速查表

| 问题      | 答案                                                                              |
|---------|---------------------------------------------------------------------------------|
| 线程启动方式  | `start()`（不能重复调用）                                                               |
| 线程休眠    | `Thread.sleep(ms)`（不释放锁）                                                        |
| 线程让步    | `Thread.yield()`（提示调度器，不保证生效）                                                   |
| 线程插队    | `thread.join()`（等待该线程执行完）                                                       |
| 线程中断    | `thread.interrupt()` + 检查 `isInterrupted()`                                     |
| 停止线程    | 使用 volatile 标志位 + 中断协作停止                                                        |
| 线程池核心参数 | 7 个：corePoolSize、maxPoolSize、keepAliveTime、unit、workQueue、threadFactory、handler |
| 推荐拒绝策略  | `CallerRunsPolicy`（产生回压）                                                        |

---

> [!note]
> 更多高级并发工具类（AQS、ReentrantLock、CountDownLatch 等）请参考 [Java JUC 包详解](/blog/javaee/java-juc/)
