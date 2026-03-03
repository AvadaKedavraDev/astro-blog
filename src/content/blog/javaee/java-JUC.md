---
title: "Java JUC包"
pubDate: 2024-03-20
description: "Java并发速查"
tags: [ "Java", "并发" ]
#coverImage: "/images/docker-cover.jpg"
readingTime: 30
pinned: true

# 系列文章
series:
  name: "Java 基础"
  order: 3
---

> Java JUC（`java.util.concurrent`）包提供了丰富的并发工具类，是现代 Java 并发编程的核心。

---

## Synchronized 锁实现

### MonitorEnter & MonitorExit

#### 锁的三种形式

| 锁类型   | 目标对象        | 字节码标识                          |
|-------|-------------|--------------------------------|
| 实例方法  | 当前实例 `this` | `ACC_SYNCHRONIZED`             |
| 静态方法  | 当前 Class 对象 | `ACC_SYNCHRONIZED`             |
| 同步代码块 | 括号内指定的对象    | `monitorenter` / `monitorexit` |

#### synchronized 锁原理

1. **同步代码块**：使用 `monitorenter` 和 `monitorexit` 指令，依赖 **Monitor 监视器**（由 JVM 实现，C++ 编写的
   ObjectMonitor）
2. **同步方法**：通过 `ACC_SYNCHRONIZED` 访问标志，由 JVM 自动隐式调用 Monitor

#### 锁升级过程（JDK 1.6+）

```
无锁 → 偏向锁 → 轻量级锁 → 重量级锁


CAS: 1. 通过比较期望值与实际值不断自旋，保证修改结果正确
     2. 不会无限制自旋，超过次数自动阻塞【1.6以后优化措施】 
ABA: 期望值对应的实际值通过修改后匹配，发生了结果符合，过程无法预知
```

| 锁状态      | 适用场景          | 特点                               |
|----------|---------------|----------------------------------|
| **偏向锁**  | 只有一个线程访问同步块   | 无 CAS，只需 Mark Word 记录线程 ID，约等于无锁 |
| **轻量级锁** | 多个线程交替执行（无竞争） | CAS 自旋，避免线程阻塞/唤醒开销               |
| **重量级锁** | 多个线程同时竞争      | 使用 Monitor，线程阻塞，需要用户态↔内核态切换      |

> [!tip]
> 锁只能升级，不能降级（除偏向锁撤销）。偏向锁在 JDK 15 后默认禁用。

#### Mark Word 结构（64位 JVM）


| 锁状态  | 62 bit              | 2 bit |
|------|---------------------|-------|
| 无锁   | hashCode + 分代年龄     | 01    |
| 偏向锁  | 线程ID + Epoch + 分代年龄 | 01    |
| 轻量级锁 | 指向栈中锁记录的指针          | 00    |
| 重量级锁 | 指向互斥量（Monitor）的指针   | 10    |
| GC标记 | 空                   | 11    |

#### 锁图示 64 位 JVM Mark Word 位分布总览

```text
| unused:25  | hash:31 | unused:1 | age:4 | biased_lock:0 | lock:01 // 无锁
| threadID:54| epoch:2 | unused:1 | age:4 | biased_lock:1 | lock:01 // 偏向锁
|                  ptr_to_lock_record:62                  | lock:00 // 轻量级锁
|                  ptr_to_monitor:62                      | lock:10 // 重量级锁         
```

---

## AQS 抽象队列同步器

### 1. 核心组件

```
┌─────────────────────────────────────┐
│            AQS 抽象队列同步器        │
├─────────────────────────────────────┤
│  state: volatile int                │  ← 资源状态
│  head: Node                         │  ← CLH 变体队列头
│  tail: Node                         │  ← CLH 变体队列尾
│  exclusiveOwnerThread: Thread       │  ← 独占模式持有线程
└─────────────────────────────────────┘
```

### 2. 核心字段

| 字段                | 说明                                                               |
|-------------------|------------------------------------------------------------------|
| `state`           | 同步状态，`volatile` 修饰，0=未锁定，>0=已锁定（可重入计数）                           |
| `head` / `tail`   | 等待队列的头尾节点，**虚拟头节点**设计（头节点不存线程）                                   |
| `Node.waitStatus` | 节点状态：`CANCELLED(1)`、`SIGNAL(-1)`、`CONDITION(-2)`、`PROPAGATE(-3)` |

### 3. AQS Java结构

```java
static final class Node {
    volatile int waitStatus;    // 节点状态：SIGNAL/CANCELLED/CONDITION/PROPAGATE
    volatile Node prev;         // 前驱节点（用于检查状态）
    volatile Node next;         // 后继节点（用于唤醒）
    volatile Thread thread;     // 绑定的线程
    Node nextWaiter;            // 共享/独占模式标记 或 Condition 队列链接
}
```
> [!tip] 关键设计：双向链表 + 状态驱动——前驱节点负责唤醒后继。

### 4. 两种模式

#### 4.1 独占模式（Exclusive）

```java
// 获取锁（子类需实现 tryAcquire）
acquire(int arg) →

tryAcquire(arg) →

addWaiter(Node.EXCLUSIVE) →

acquireQueued()

// 释放锁（子类需实现 tryRelease）
release(int arg) →

tryRelease(arg) →

unparkSuccessor()
```

**代表实现**：`ReentrantLock`、`ReentrantReadWriteLock.WriteLock`

#### 4.2 共享模式（Shared）

```java
// 获取共享锁
acquireShared(int arg) →

tryAcquireShared(arg) →

doAcquireShared()

// 释放共享锁（可能唤醒多个后继）
releaseShared(int arg) →

tryReleaseShared(arg) →

doReleaseShared()
```

**代表实现**：`Semaphore`、`CountDownLatch`、`ReentrantReadWriteLock.ReadLock`

### 5. AQS 等待队列图示

```
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│ head │ →  │ Node │ →  │ Node │ →  │ Node │ →  ...（等待获取锁）
│ 虚拟  │   │  T2  │    │  T3  │    │  T4  │
└──────┘    └──────┘    └──────┘    └──────┘
              ↑
              │ waitStatus = -1 (SIGNAL)
              │ 表示释放锁时需唤醒后继
```

### 6. AQS 入队、出队

#### 6.1 入队流程

```java
// 简化流程：
1. 调用 tryAcquire() 尝试获取（子类实现）
2. 失败 → 创建 Node 节点
3. CAS 入队（加到队尾，可能重试）
4. 找到前驱，将前驱 waitStatus 设为 SIGNAL（表示"我后面有人，记得唤醒我"）
5. LockSupport.park(this) 挂起自己
```

#### 6.2 释放资源 → 唤醒

```java
// 简化流程：
1. 调用 tryRelease() 释放资源（子类实现）
2. state 修改成功
3. 检查队头节点 waitStatus
4. 如果是 SIGNAL → unpark 后继线程
5. 被唤醒线程从 park 处恢复，再次 tryAcquire
```
---

## ReentrantLock

### 与 synchronized 对比

| 特性   | ReentrantLock           | synchronized       |
|------|-------------------------|--------------------|
| 锁类型  | API 级                   | JVM 内置             |
| 可重入  | ✅ 支持                    | ✅ 支持               |
| 公平性  | ✅ 支持公平/非公平              | ❌ 非公平              |
| 可中断  | ✅ `lockInterruptibly()` | ❌ 不可中断             |
| 超时获取 | ✅ `tryLock(timeout)`    | ❌ 不支持              |
| 条件变量 | ✅ 多个 Condition          | ❌ 只有一个 wait/notify |
| 性能   | JDK6+ 相近                | 自动优化               |
| 释放要求 | 必须手动 `unlock()`         | 自动释放（JVM 保证）       |

> 可重入关键：通过 exclusiveOwnerThread 记录持有线程，同一线程再次获取时只需增加 state 计数。

### 公平锁 vs 非公平锁

```java
// 非公平锁（默认）- 吞吐量更高
ReentrantLock lock = new ReentrantLock();

// 公平锁 - 按请求顺序获取，避免饥饿
ReentrantLock fairLock = new ReentrantLock(true);
```

**非公平锁优势**：

- 刚释放锁时，新来的线程可以直接 CAS 尝试获取（减少上下文切换）
- 吞吐量比公平锁高约 5-10 倍

**公平锁适用场景**：

- 需要避免线程饥饿
- 持有锁时间较长的场景

### 使用示例

```java
class Counter {
    private final ReentrantLock lock = new ReentrantLock();
    private int count = 0;

    public void increment() {
        lock.lock();
        try {
            count++;
            // 可重入：同一线程可再次获取锁
            nestedMethod();
        } finally {
            lock.unlock();  // 必须在 finally 中释放
        }
    }

    // 带超时的获取
    public boolean tryIncrement(long timeout, TimeUnit unit) {
        try {
            if (lock.tryLock(timeout, unit)) {
                try {
                    count++;
                    return true;
                } finally {
                    lock.unlock();
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return false;
    }

    private void nestedMethod() {
        lock.lock();  // 可重入，不会死锁
        try {
            // do something
        } finally {
            lock.unlock();
        }
    }
}
```

---

## Condition 条件队列

### 与 Object.wait/notify 对比

| 特性     | Condition           | Object.wait/notify     |
|--------|---------------------|------------------------|
| 条件队列数量 | 多个（每个 Condition 一个） | 只有一个                   |
| 唤醒精准度  | `signal()` 唤醒指定条件队列 | `notifyAll()` 唤醒所有等待线程 |
| 阻塞位置   | `await()` 释放锁并阻塞    | `wait()` 释放锁并阻塞        |
| 等待位置   | 条件队列                | 对象监视器队列                |
| 组合使用   | 必须与 Lock 配合使用       | 必须与 synchronized 配合使用  |

### 核心方法

| 方法                       | 说明                              |
|--------------------------|---------------------------------|
| `await()`                | 释放锁，进入等待状态，直到被 signal/interrupt |
| `awaitNanos(long)`       | 带超时的等待，返回剩余纳秒数                  |
| `awaitUntil(Date)`       | 等待到指定截止时间                       |
| `awaitUninterruptibly()` | 不可中断的等待                         |
| `signal()`               | 唤醒一个等待线程（转移到 AQS 同步队列）          |
| `signalAll()`            | 唤醒所有等待线程                        |

### 经典用法：生产者-消费者

```java
class BoundedBuffer<T> {
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    private final Object[] items;
    private int putIndex, takeIndex, count;

    public BoundedBuffer(int capacity) {
        items = new Object[capacity];
    }

    public void put(T x) throws InterruptedException {
        lock.lock();
        try {
            // 必须用 while，防止虚假唤醒
            while (count == items.length) {
                notFull.await();  // 满了，等待"非满"条件
            }
            items[putIndex] = x;
            putIndex = (putIndex + 1) % items.length;
            count++;
            notEmpty.signal();  // 通知消费者可以取了
        } finally {
            lock.unlock();
        }
    }

    @SuppressWarnings("unchecked")
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) {
                notEmpty.await();  // 空了，等待"非空"条件
            }
            T x = (T) items[takeIndex];
            takeIndex = (takeIndex + 1) % items.length;
            count--;
            notFull.signal();  // 通知生产者可以放
            return x;
        } finally {
            lock.unlock();
        }
    }
}
```

### 线程状态流转

```
         ┌─────────────┐
         │  运行状态    │
         └──────┬──────┘
                │ lock.lock()
                ▼
┌─────────────────────────────┐
│      获取锁成功，执行业务      │
└─────────────┬───────────────┘
              │ condition.await()
              ▼
┌─────────────────────────────┐
│    释放锁，加入条件等待队列    │ ← 线程状态：WAITING
└─────────────┬───────────────┘
              │ condition.signal()
              ▼
┌─────────────────────────────┐
│   转移到 AQS 同步队列，竞争锁  │ ← 线程状态：BLOCKED
└─────────────┬───────────────┘
              │ 获取锁成功
              ▼
         ┌─────────────┐
         │  继续执行    │
         └─────────────┘
```

---

## 常用同步工具类

### Semaphore（信号量）- 限流控制

**原理**：控制同时访问某个资源的线程数量，基于 AQS 共享模式。

```java
// 创建信号量，允许 10 个线程同时访问
Semaphore semaphore = new Semaphore(10);

// 获取许可（state - 1）
semaphore.

acquire();
// 释放许可（state + 1）  
semaphore.

release();
```

#### 使用场景

| 场景         | 示例          |
|------------|-------------|
| **数据库连接池** | 限制最大连接数     |
| **API 限流** | 控制并发请求数量    |
| **资源池管理**  | 对象池、线程池入口控制 |

#### 代码示例

```java
// 数据库连接池限流
class ConnectionPool {
    private final Semaphore semaphore;
    private final List<Connection> connections;

    public ConnectionPool(int maxConnections) {
        semaphore = new Semaphore(maxConnections);
        connections = new ArrayList<>(maxConnections);
        // 初始化连接...
    }

    public Connection borrow() throws InterruptedException {
        semaphore.acquire();  // 获取许可
        return connections.remove(connections.size() - 1);
    }

    public void release(Connection conn) {
        connections.add(conn);
        semaphore.release();  // 归还许可
    }
}
```

---

### CountDownLatch（倒计时门闩）- 等待多任务完成

**原理**：初始化一个计数器，`countDown()` 减一，直到为 0 时唤醒所有等待线程。

```java
// 创建，计数器 = 3
CountDownLatch latch = new CountDownLatch(3);

// 每个任务完成时调用
latch.

countDown();  // 计数器 - 1

// 主线程等待
latch.

await();      // 阻塞，直到计数器 = 0
```

#### 使用场景

| 场景          | 说明                |
|-------------|-------------------|
| **多线程任务汇总** | 启动多个线程并行处理，等待全部完成 |
| **服务启动检查**  | 等待所有依赖服务就绪后才启动主服务 |
| **压测场景**    | 等待所有线程就绪后同时开始     |

#### 代码示例

```java
// 主服务等待多个依赖服务启动
public void startService() throws InterruptedException {
    CountDownLatch readyLatch = new CountDownLatch(3);

    // 启动数据库连接池
    new Thread(() -> {
        initDbPool();
        readyLatch.countDown();
    }).start();

    // 启动缓存服务
    new Thread(() -> {
        initCache();
        readyLatch.countDown();
    }).start();

    // 启动消息队列
    new Thread(() -> {
        initMQ();
        readyLatch.countDown();
    }).start();

    // 等待所有依赖就绪
    readyLatch.await();
    System.out.println("所有依赖服务已就绪，启动主服务...");
}
```

> [!warning]
> CountDownLatch **不可重用**，计数器到 0 后不能重置。如需重复使用，请用 CyclicBarrier 或 Phaser。

---

### CyclicBarrier（循环屏障）- 多线程互相等待

**原理**：设置一个屏障点，线程到达后阻塞，直到所有线程都到达后才继续执行，**可循环使用**。

```java
// 创建屏障，3 个线程到达后触发
CyclicBarrier barrier = new CyclicBarrier(3);

// 每个线程到达屏障
barrier.

await();  // 阻塞，等待其他线程

// 带超时的等待
barrier.

await(10,TimeUnit.SECONDS);
```

#### CountDownLatch vs CyclicBarrier

| 特性    | CountDownLatch     | CyclicBarrier         |
|-------|--------------------|-----------------------|
| 等待方向  | 一个/多个线程等待其他线程      | 线程之间互相等待              |
| 可重用   | ❌ 一次性              | ✅ 自动重置                |
| 计数器操作 | 其他线程调用 countDown() | 线程自己调用 await()        |
| 回调功能  | 无                  | 可设置 Runnable 在屏障触发时执行 |
| 异常处理  | 无                  | 线程中断/超时会破坏屏障          |

#### 使用场景

| 场景        | 示例               |
|-----------|------------------|
| **分阶段计算** | 多线程分片处理，每阶段结束后汇总 |
| **并行测试**  | 所有测试线程准备就绪后同时开始  |
| **游戏回合制** | 所有玩家操作完成后进入下一回合  |

#### 代码示例

```java
// 多线程分阶段计算
class ParallelCompute {
    private final CyclicBarrier barrier;
    private int[] data;
    private int[] partialSums;

    public ParallelCompute(int[] data, int threads) {
        this.data = data;
        this.partialSums = new int[threads];

        // 屏障触发时，执行汇总操作
        this.barrier = new CyclicBarrier(threads, () -> {
            int total = 0;
            for (int sum : partialSums) {
                total += sum;
            }
            System.out.println("阶段完成，当前总和: " + total);
        });
    }

    public void compute() {
        int threadId = (int) Thread.currentThread().getId() % partialSums.length;
        int chunkSize = data.length / partialSums.length;
        int start = threadId * chunkSize;
        int end = (threadId == partialSums.length - 1) ? data.length : start + chunkSize;

        // 阶段1：计算部分和
        for (int i = start; i < end; i++) {
            partialSums[threadId] += data[i];
        }

        try {
            barrier.await();  // 等待其他线程

            // 阶段2：数据归一化（所有线程同步进入）
            for (int i = start; i < end; i++) {
                data[i] = data[i] * 2;  // 示例操作
            }

            barrier.await();  // 再次等待

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

---

## 其他重要工具类

### ReadWriteLock（读写锁）

```java
ReentrantReadWriteLock rwLock = new ReentrantReadWriteLock();
Lock readLock = rwLock.readLock();
Lock writeLock = rwLock.writeLock();

// 读锁：共享，多个线程可同时获取
readLock.

lock();
try{
        // 读取操作
        }finally{
        readLock.

unlock();
}

// 写锁：独占，与其他读写锁互斥
        writeLock.

lock();
try{
        // 写入操作
        }finally{
        writeLock.

unlock();
}
```

**特点**：

- **读读共享**：多个线程可同时持有读锁
- **读写互斥**：读锁与写锁互斥
- **写写互斥**：写锁与写锁互斥
- **锁降级**：持有写锁的线程可以获取读锁（防止看到不一致数据）

### StampedLock（戳记锁，JDK 8）

```java
StampedLock lock = new StampedLock();

// 乐观读
long stamp = lock.tryOptimisticRead();
// 读取数据...
if(!lock.

validate(stamp)){
// 乐观读失败，转为悲观读
stamp =lock.

readLock();
    try{
            // 重新读取
            }finally{
            lock.

unlockRead(stamp);
    }
            }

// 写锁
long stamp = lock.writeLock();
try{
        // 写入操作
        }finally{
        lock.

unlockWrite(stamp);
}
```

**优势**：比 ReadWriteLock 性能更好，支持乐观读（无锁读取）。

---

## JUC 并发工具速查表

| 工具类              | 核心方法                 | 适用场景     | 注意事项           |
|------------------|----------------------|----------|----------------|
| `ReentrantLock`  | `lock/unlock`        | 需要更灵活锁控制 | 必须在 finally 释放 |
| `Condition`      | `await/signal`       | 多条件等待唤醒  | 与 Lock 配合使用    |
| `Semaphore`      | `acquire/release`    | 限流、资源池   | 注意释放次数         |
| `CountDownLatch` | `await/countDown`    | 等待多任务完成  | 不可重用           |
| `CyclicBarrier`  | `await`              | 多线程分阶段协作 | 可重用，注意异常处理     |
| `ReadWriteLock`  | `readLock/writeLock` | 读多写少场景   | 支持锁降级          |
| `StampedLock`    | `tryOptimisticRead`  | 高并发读场景   | 不支持重入          |

---

> [!note]
> 本文档持续更新，建议结合 JDK 源码深入学习 AQS 实现细节。
