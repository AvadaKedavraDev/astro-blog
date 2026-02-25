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

### HashMap Put 核心源码逻辑

#### Hash 计算与寻址

```java
// 扰动函数：高 16 位与低 16 位异或，增加散列性
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

/*
  寻址：等价于 hash % n，但位运算更快
  假设: hash = 53, n = 16
  原理：当 n 为2的次幂时, 则正常计算流程为
           53 % 16 = 3...5 [3 * 16 + 5]
       当采用  (n - 1) & hash 时，则为：
           0000 1111 & 0011 0101 = 0000 0101 = 5
 */
(n -1) & hash
```

#### HashMap Put 主流程（JDK 1.8）

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

### HashMap 扩容（Resize）与数据迁移详解

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

### HashMap 数据迁移的核心原理

#### 1. 高低位拆分算法（JDK 1.8 优化）

扩容时容量从 n 变为 2n ，元素的新位置只可能是：

- 原位置 j （低位）
- 原位置 + 旧容量 j+oldCap （高位）

判断依据：e.hash & oldCap

- 结果为 0：hash 的高位为 0，位置不变（j ）
- 结果非 0：hash 的高位为 1，位置变为 j+oldCap

示例：

```text
假设有:
  1. 旧容量 (oldCap)：16 (二进制 0001 0000)，
     Key 的哈希值 (hash)：27 (二进制 0001 1011)，
     结果为 0000 1011 = 11
  2. 新容量 (newCap)：32 (二进制 0010 0000)，
     Key 的哈希值 (hash)：27 (二进制 0001 1011)，
     结果为 0001 1011 = 27
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

### JDK 1.7：Segment 分段锁（ReentrantLock）

#### 1.核心结构

```java
/// 1.7 的 Segment 继承 ReentrantLock，本身就是一把锁
static final class Segment<K,V> extends ReentrantLock implements Serializable {
    transient volatile HashEntry<K,V>[] table;  // 每个 Segment 独立的哈希表
    transient int count;                        // 元素个数（需加锁读取）
    transient int modCount;
    transient int threshold;
    final float loadFactor;

    // put 时先尝试获取锁：lock()
    final V put(K key, int hash, V value, boolean onlyIfAbsent) {
        HashEntry<K,V> node = tryLock() ? null : scanAndLockForPut(key, hash, value);
        // ... 实际插入逻辑
    }
}

// HashEntry：value 和 next 为 final，保证读安全（不可变模式）
static final class HashEntry<K,V> {
    final int hash;
    final K key;
    volatile V value;      // volatile 保证可见性
    final HashEntry<K,V> next;
}
```

#### 2. 双重 Hash 定位

```java
// 1.7 定位需要两次哈希
public V put(K key, V value) {
    Segment<K,V> s;
    if (value == null) throw new NullPointerException();
    int hash = hash(key);  // 第一次：计算 key 的 hash
    int j = (hash >>> segmentShift) & segmentMask;  // 定位 Segment
    if ((s = (Segment<K,V>)UNSAFE.getObject(segments, (j << SSHIFT) + SBASE)) == null)
        s = ensureSegment(j);  // 延迟初始化 Segment
    return s.put(key, hash, value, false);  // 第二次：在 Segment 内定位桶
}
```

- 锁机制详解
    1. 分段粒度：默认创建 16 个 Segment（不可扩容），每个 Segment 继承 ReentrantLock
    2. 锁范围：先定位到 Segment，再对该 Segment 加锁，而非锁住整个 Map
    3. 并发度：理论上支持 16 个线程真正并行写入不同 Segment
    4. get 操作：无需加锁，利用 volatile 的内存语义保证可见性（HashEntry 的 value 和 next 都是 volatile）
- 1.7 的局限
   1. 锁粒度粗：虽然比 Hashtable（synchronized 方法）细，但 Segment 不可动态增加，并发度固定
   2. 查询效率低：链表过长时遍历慢（没有红黑树优化）
   3. 内存占用：每个 Segment 是独立的小 HashMap，空节点也占用内存

### JDK 1.8：CAS + synchronized + 红黑树

#### 1. 核心字段与常量

```java
// 核心数组，延迟初始化（第一次 put 时初始化）
transient volatile Node<K,V>[] table;

// 下一个使用的表，仅在扩容时非空（多线程迁移的目标数组）
private transient volatile Node<K,V>[] nextTable;

// 控制标识符，多用途（详见下文）
private transient volatile int sizeCtl;

// 转移时的基础索引，多线程扩容时分配任务
private transient volatile int transferIndex;

// 其他关键常量
static final int MOVED     = -1;  // ForwardingNode 的 hash 值
static final int TREEBIN   = -2;  // TreeBin 的 hash 值
static final int RESERVED  = -3;  // ReservationNode 的 hash 值
static final int HASH_BITS = 0x7fffffff;  // 用于消除 hash 的符号位
```

#### 2. 四大核心节点类

```java
// 1. 基础节点（链表节点）
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;
    final K key;
    volatile V val;        // 保证读可见性
    volatile Node<K,V> next;  // 链表下一个
}

// 2. 红黑树节点（继承 Node）
static final class TreeNode<K,V> extends Node<K,V> {
    TreeNode<K,V> parent;
    TreeNode<K,V> left;
    TreeNode<K,V> right;
    TreeNode<K,V> prev;    // 删除时需要
    boolean red;
}

// 3. 树容器（代理对象，持有树根节点）
static final class TreeBin<K,V> extends Node<K,V> {
    TreeNode<K,V> root;
    volatile Thread waiter;  // 等待线程（写时阻塞读）
    volatile int lockState;  // 读写锁状态
    // 树化后的桶，外部看到的头节点是 TreeBin，而非 TreeNode
}

// 4. 转发节点（扩容期间使用，hash = -1）
static final class ForwardingNode<K,V> extends Node<K,V> {
    final Node<K,V>[] nextTable;  // 指向新数组
    ForwardingNode(Node<K,V>[] tab) {
        super(MOVED, null, null, null);
        this.nextTable = tab;
    }
    // 查找时直接转发到新数组
    Node<K,V> find(int h, Object k) {
        return nextTable[tabAt(nextTable, (n - 1) & h)].find(h, k);
    }
}
```

#### 3. putVal 源码深度走读

```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException();
    int hash = spread(key.hashCode());  // 扰动函数，减少冲突
    int binCount = 0;
    
    // 自旋 CAS（乐观锁）
    for (Node<K,V>[] tab = table;;) {
        Node<K,V> f; int n, i, fh;
        
        // 场景 1：table 未初始化，初始化
        if (tab == null || (n = tab.length) == 0)
            tab = initTable();
        
        // 场景 2：目标桶为空，CAS 直接插入（无锁快速路径）
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            if (casTabAt(tab, i, null, new Node<K,V>(hash, key, value, null)))
                break;  // CAS 成功，跳出循环
            // CAS 失败，自旋重试
        }
        
        // 场景 3：发现 ForwardingNode，说明正在扩容，协助迁移
        else if ((fh = f.hash) == MOVED)
            tab = helpTransfer(tab, f);
        
        // 场景 4：桶非空且未扩容，synchronized 锁住头节点
        else {
            V oldVal = null;
            synchronized (f) {  // **细粒度锁：只锁当前桶的头节点**
                if (tabAt(tab, i) == f) {  // 再次确认锁对象
                    if (fh >= 0) {  // 链表
                        binCount = 1;
                        for (Node<K,V> e = f;; ++binCount) {
                            K ek;
                            // 找到相同 key，覆盖 value
                            if (e.hash == hash &&
                                ((ek = e.key) == key || (ek != null && key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value;
                                break;
                            }
                            Node<K,V> pred = e;
                            // 尾插法插入新节点
                            if ((e = e.next) == null) {
                                pred.next = new Node<K,V>(hash, key, value, null);
                                break;
                            }
                        }
                    }
                    else if (f instanceof TreeBin) {  // 红黑树
                        Node<K,V> p;
                        binCount = 2;
                        if ((p = ((TreeBin<K,V>)f).putTreeVal(hash, key, value)) != null) {
                            oldVal = p.val;
                            if (!onlyIfAbsent)
                                p.val = value;
                        }
                    }
                }
            }
            
            // 检查树化条件：链表长度 >= 8
            if (binCount != 0) {
                if (binCount >= TREEIFY_THRESHOLD)
                    treeifyBin(tab, i);  // 可能树化（需检查数组长度 >= 64）
                if (oldVal != null)
                    return oldVal;
                break;
            }
        }
    }
    addCount(1L, binCount);  // 计数并检查扩容
    return null;
}
```

关键细节：
- spread() 方法：hash ^ (hash >>> 16) & HASH_BITS，强制高位参与运算，减少桶冲突
- tabAt() / casTabAt()：基于 Unsafe 的 volatile 读取和 CAS 操作，保证原子性
- synchronized (f)：锁的是桶的第一个节点，粒度极细