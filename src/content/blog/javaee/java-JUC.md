---
title: "Java JUC包"
pubDate: 2024-03-20
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
> 
## Synchronized 锁实现

### MonitorEnter & MonitorExit
synchronized分为三种：
- 普通方法锁当前实例对象
- 静态方法锁当前类
- 同步方法块锁括号里面的对象

## AQS 抽象队列同步器：state、CLH 变体队列、独占/共享模式

## ReentrantLock：公平锁（FIFO）vs 非公平锁（抢锁）

## Condition 条件队列：await/signal 与 Object.wait/notify 区别

## Semaphore、CountDownLatch、CyclicBarrier 使用场景