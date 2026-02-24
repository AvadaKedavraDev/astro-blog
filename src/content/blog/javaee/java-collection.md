---
title: "Java 集合"
pubDate: 2025-02-24
description: "Java 集合速查"
tags: [ "Java", "集合" ]
#coverImage: "/images/docker-cover.jpg"
readingTime: 15
pinned: true

# 系列文章
series:
  name: "Java 基础"
  order: 2
---

## 一、 HashMap

### 一、HashMap Put 核心源码逻辑

#### 1. Hash 计算与寻址

```java
// 扰动函数：高 16 位与低 16 位异或，增加散列性
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

/**
 * 寻址：等价于 hash % n，但位运算更快
 * 假设: hash = 53, n = 16
 * 原理：当 n 为2的次幂时, 则正常计算流程为
 *          53 % 16 = 3...5 [3 * 16 + 5]
 *      当采用  (n - 1) & hash 时，则为：
 *          0000 1111 & 0011 0101 = 0000 0101 = 5
 */
(n -1)&hash
```

#### 2. HashMap Put 主流程（JDK 1.8）

```java
final V putVal(int hash, K key, V value, boolean onlyIfAbsent, boolean evict) {
    Node<K, V>[] tab;
    Node<K, V> p;
    int n, i;

    // 1. 首次初始化（懒加载）
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;

    // 2. 无冲突，直接插入
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);

    else {
        Node<K, V> e;
        K k;

        // 3. 首节点即目标 key，覆盖
        if (p.hash == hash && ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;

            // 4. 红黑树处理
        else if (p instanceof TreeNode)
            e = ((TreeNode<K, V>) p).putTreeVal(this, tab, hash, key, value);

            // 5. 链表遍历
        else {
            for (int binCount = 0; ; ++binCount) {
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null); // 尾插法
                    if (binCount >= TREEIFY_THRESHOLD - 1) //  >=7 转树
                        treeifyBin(tab, hash);
                    break;
                }
                if (e.hash == hash && ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }

        // 6. 覆盖旧值
        if (e != null) {
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }

    ++modCount;
    // 7. 检查扩容
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}
```

### 二、HashMap 扩容（Resize）与数据迁移详解

#### 1. 扩容触发条件

- size > threshold（threshold = capacity × loadFactor[默认 0.75]）
- 首次初始化：new HashMap() 时 table 为 null，首次 put 触发初始化（capacity 为 16）
- 单个链表长度 > 8 且 table.length < 64：转红黑树前优先扩容

#### 2. 扩容机制（2 倍扩容）

```java
final Node<K, V>[] resize() {
    Node<K, V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;

    if (oldCap > 0) {
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        // 容量翻倍 [<< 1 等同 * 2的1次幂]，阈值翻倍
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                oldCap >= DEFAULT_INITIAL_CAPACITY)
            newThr = oldThr << 1;
    }
    // ... 省略初始化逻辑

    threshold = newThr;
    @SuppressWarnings({"rawtypes", "unchecked"})
    Node<K, V>[] newTab = (Node<K, V>[]) new Node[newCap];
    table = newTab;

    // 数据迁移关键逻辑
    if (oldTab != null) {
        for (int j = 0; j < oldCap; ++j) {
            Node<K, V> e;
            if ((e = oldTab[j]) != null) {
                oldTab[j] = null; // 手动GC

                if (e.next == null)
                    // 单节点：直接重哈希
                    newTab[e.hash & (newCap - 1)] = e;

                else if (e instanceof TreeNode)
                    // 红黑树拆分
                    ((TreeNode<K, V>) e).split(this, newTab, j, oldCap);

                else {
                    // 链表拆分（核心！）
                    Node<K, V> loHead = null, loTail = null;
                    Node<K, V> hiHead = null, hiTail = null;
                    Node<K, V> next;

                    do {
                        next = e.next;
                        // 判断 hash 新增的高位是否为 1
                        if ((e.hash & oldCap) == 0) {
                            // 低位链：位置不变（仍在 j）
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        } else {
                            // 高位链：位置迁移到 j + oldCap
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);

                    // 放置两个子链
                    if (loTail != null) {
                        loTail.next = null;
                        newTab[j] = loHead;
                    }
                    if (hiTail != null) {
                        hiTail.next = null;
                        newTab[j + oldCap] = hiHead;
                    }
                }
            }
        }
    }
    return newTab;
}
```

### 三、HashMap 数据迁移的核心原理

#### 1. 高低位拆分算法（JDK 1.8 优化）

扩容时容量从 n 变为 2n ，元素的新位置只可能是：

- 原位置 j （低位）
- 原位置 + 旧容量 j+oldCap （高位）

判断依据：e.hash & oldCap

- 结果为 0：hash 的高位为 0，位置不变（j ）
- 结果非 0：hash 的高位为 1，位置变为 j+oldCap

示例：

```plain
假设有:
  1. 旧容量 (oldCap)：16 (二进制 0001 0000)，Key 的哈希值 (hash)：27 (二进制 0001 1011)，结果为 0000 1011 = 11
  2. 新容量 (newCap)：32 (二进制 0010 0000)，Key 的哈希值 (hash)：27 (二进制 0001 1011)，结果为 0001 1011 = 27
但这种得计算 27&31，e.hash & oldCap 则不会，只判断了高位是否存在1 
```

#### 2. JDK 1.7 vs 1.8 迁移差异

|      |                     |                       |
|------|---------------------|-----------------------|
| 特性   | 	JDK 1.7            | JDK 1.8               |
| 插入方式 | 头插法（倒序）             | 	尾插法（保序）              |
| 并发安全 | 并发 resize 导致死循环（环链） | 不解决并发问题（仍可能丢数据），但无死循环 |
| 拆分逻辑 | 逐个 rehash 计算新位置     | 高低位双链拆分（O(n) 且高效）     |

JDK 1.7 死循环原因：

```plain
线程 A 记录：e = A, next = B
线程 B 完成扩容：B → A（头插法倒序）
线程 A 继续：e=A 放入新表，e.next=B（此时 B.next 已经是 A，形成 A→B→A 环）
```

#### 3. 数据迁移示意图

1. 扩容前的状态（Capacity = 4）
   掩码（Mask）: 4 - 1 = 3（二进制 011）
   探测位（oldCap）: 4（二进制 100）
2. | 节点 | 假设hash值 | 计算值         |
   |----|---------|-------------|
   | A  | ...001  | 001&011=001 |
   | B  | ...101  | 101&011=001 |
   | C  | ...001  | 001&011=001 |
   | D  | ...110  | 110&011=010 |
3. 此时有值 A->B->C
4. 当容量为8时，观察高位有 100 有 
   - A->C 
   - B 
   - D 
   
---

## 二、ConcurrentHashMap
