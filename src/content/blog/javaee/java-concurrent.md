---
title: "Java 并发"
pubDate: 2024-02-15
description: "Java并发速查"
tags: ["Java", "并发"]
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
void createThreadNewThread()  {
    new Thread(()-> System.out.println("线程启动")).start();
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
### 