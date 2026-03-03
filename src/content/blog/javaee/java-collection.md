---
title: "Java 集合"
pubDate: 2025-02-24
description: "Java 集合源码深度解析与高频面试题总结"
tags: [ "Java", "集合" ]
#coverImage: "/images/docker-cover.jpg"
readingTime: 25
pinned: true

# 系列文章
series:
  name: "Java 基础"
  order: 1
---

## 一、Java 集合框架概览

### 1.1 集合类继承结构

```
Iterable
  └── Collection
        ├── List（有序，可重复）
        │     ├── ArrayList
        │     ├── LinkedList
        │     └── Vector → Stack（已废弃）
        ├── Set（无序，不重复）
        │     ├── HashSet
        │     │     └── LinkedHashSet（保持插入顺序）
        │     └── SortedSet → TreeSet（有序）
        └── Queue（队列）
              ├── PriorityQueue（优先级队列）
              └── Deque（双端队列）
                    ├── ArrayDeque
                    └── LinkedList

Map（键值对，Key 唯一）
  ├── HashMap
  │     └── LinkedHashMap（保持插入/访问顺序）
  ├── Hashtable（已废弃）
  │     └── Properties
  ├── SortedMap → TreeMap（有序）
  └── ConcurrentHashMap（线程安全）
```

### 1.2 核心接口对比

| 特性      | List                  | Set                        | Map                          |
|---------|-----------------------|----------------------------|------------------------------|
| 元素重复    | 允许                    | 不允许                        | Key 不允许，Value 允许             |
| 顺序性     | 有序                    | 无序（TreeSet 除外）             | 无序（TreeMap/LinkedHashMap 除外） |
| 实现类     | ArrayList, LinkedList | HashSet, TreeSet           | HashMap, TreeMap             |
| null 元素 | 允许多个                  | HashSet 允许 1 个，TreeSet 不允许 | HashMap 允许 1 个 null key      |

---

## 二、List 详解

### 2.1 ArrayList

#### 核心源码分析

```java
// 默认初始容量
transient Object[] elementData;  // 底层数组
private static final int DEFAULT_CAPACITY = 10;
private static final Object[] EMPTY_ELEMENTDATA = {};
private static final Object[] DEFAULTCAPACITY_EMPTY_ELEMENTDATA = {};

// 构造函数
public ArrayList() {
    this.elementData = DEFAULTCAPACITY_EMPTY_ELEMENTDATA;  // 延迟初始化
}

public ArrayList(int initialCapacity) {
    if (initialCapacity > 0) {
        this.elementData = new Object[initialCapacity];
    } else if (initialCapacity == 0) {
        this.elementData = EMPTY_ELEMENTDATA;
    } else {
        throw new IllegalArgumentException("Illegal Capacity: " + initialCapacity);
    }
}
```

#### add 操作与扩容机制

```java
public boolean add(E e) {
    ensureCapacityInternal(size + 1);  // 确保容量足够
    elementData[size++] = e;
    return true;
}

private void ensureCapacityInternal(int minCapacity) {
    // 如果是默认空数组，取 max(10, minCapacity)
    if (elementData == DEFAULTCAPACITY_EMPTY_ELEMENTDATA) {
        minCapacity = Math.max(DEFAULT_CAPACITY, minCapacity);
    }
    ensureExplicitCapacity(minCapacity);
}

private void ensureExplicitCapacity(int minCapacity) {
    modCount++;  // 修改次数+1（fail-fast 机制）
    if (minCapacity - elementData.length > 0)
        grow(minCapacity);  // 扩容
}

// 扩容核心逻辑：1.5 倍扩容
private void grow(int minCapacity) {
    int oldCapacity = elementData.length;
    // newCapacity = oldCapacity + oldCapacity/2 = 1.5 * oldCapacity
    int newCapacity = oldCapacity + (oldCapacity >> 1);

    // 如果 1.5 倍还不够，使用所需的最小容量
    if (newCapacity - minCapacity < 0)
        newCapacity = minCapacity;

    // 超过 MAX_ARRAY_SIZE (Integer.MAX_VALUE - 8) 则使用 Integer.MAX_VALUE
    if (newCapacity - MAX_ARRAY_SIZE > 0)
        newCapacity = hugeCapacity(minCapacity);

    // 数组拷贝（System.arraycopy 是 native 方法，高效）
    elementData = Arrays.copyOf(elementData, newCapacity);
}
```

#### remove 操作

```java
public E remove(int index) {
    rangeCheck(index);
    modCount++;
    E oldValue = elementData(index);

    int numMoved = size - index - 1;  // 需要移动的元素个数
    if (numMoved > 0)
        // 将 index 后的元素前移一位
        System.arraycopy(elementData, index + 1, elementData, index, numMoved);

    elementData[--size] = null;  // 置空，帮助 GC
    return oldValue;
}
```

#### 优缺点分析

| 优点        | 缺点               |
|-----------|------------------|
| 随机访问 O(1) | 插入/删除需要移动元素 O(n) |
| 内存连续，缓存友好 | 扩容需要数组拷贝，有一定开销   |
| 尾部操作 O(1) | 非尾部插入/删除效率低      |

**适用场景**：查询多、随机访问多的场景；已知数据量时可指定初始容量避免扩容。

### 2.2 LinkedList

#### 核心结构：双向链表

```java
// 节点定义
transient int size = 0;
transient Node<E> first;  // 头节点
transient Node<E> last;   // 尾节点

private static class Node<E> {
    E item;
    Node<E> next;
    Node<E> prev;

    Node(Node<E> prev, E element, Node<E> next) {
        this.item = element;
        this.next = next;
        this.prev = prev;
    }
}
```

#### add 操作

```java
public boolean add(E e) {
    linkLast(e);  // 默认尾插
    return true;
}

void linkLast(E e) {
    final Node<E> l = last;
    final Node<E> newNode = new Node<>(l, e, null);
    last = newNode;
    if (l == null)
        first = newNode;  // 空链表
    else
        l.next = newNode;
    size++;
    modCount++;
}

// 指定位置插入
public void add(int index, E element) {
    checkPositionIndex(index);
    if (index == size)
        linkLast(element);
    else
        linkBefore(element, node(index));  // 在 node(index) 之前插入
}

// 查找指定位置节点：根据 index 决定从前还是从后遍历
Node<E> node(int index) {
    if (index < (size >> 1)) {  // 在前半部分，从头遍历
        Node<E> x = first;
        for (int i = 0; i < index; i++)
            x = x.next;
        return x;
    } else {  // 在后半部分，从尾遍历
        Node<E> x = last;
        for (int i = size - 1; i > index; i--)
            x = x.prev;
        return x;
    }
}
```

#### 优缺点分析

| 优点                 | 缺点                     |
|--------------------|------------------------|
| 插入/删除 O(1)（已知节点位置） | 随机访问 O(n)              |
| 不需要扩容              | 每个节点额外开销（prev/next 指针） |
| 内存按需分配             | 缓存不友好（非连续内存）           |

**适用场景**：频繁插入/删除；实现栈/队列。

### 2.3 ArrayList vs LinkedList

| 特性      | ArrayList | LinkedList |
|---------|-----------|------------|
| 底层结构    | 动态数组      | 双向链表       |
| 随机访问    | O(1)      | O(n)       |
| 头部插入/删除 | O(n)      | O(1)       |
| 尾部插入/删除 | O(1) 均摊   | O(1)       |
| 中间插入/删除 | O(n)      | O(n)（查找耗时） |
| 内存占用    | 较少        | 较多（指针开销）   |

---

## 三、Set 详解

### 3.1 HashSet

HashSet 底层使用 **HashMap** 实现，只使用 key，value 固定为一个 Object 占位符。

```java
public class HashSet<E> extends AbstractSet<E> implements Set<E> {
    private transient HashMap<E, Object> map;
    private static final Object PRESENT = new Object();  // 占位符

    public boolean add(E e) {
        return map.put(e, PRESENT) == null;  // 返回 null 表示新增成功
    }

    public boolean remove(Object o) {
        return map.remove(o) == PRESENT;
    }

    public boolean contains(Object o) {
        return map.containsKey(o);
    }
}
```

**特点**：

- 不保证顺序
- 允许 null 元素（只能一个，因为 key 唯一）
- 判断重复使用 `hashCode()` + `equals()`

### 3.2 TreeSet

TreeSet 底层使用 **TreeMap** 实现，基于红黑树，元素有序。

```java
public class TreeSet<E> extends AbstractSet<E> implements NavigableSet<E> {
    private transient NavigableMap<E, Object> m;

    public TreeSet() {
        this(new TreeMap<>());  // 自然排序
    }

    public TreeSet(Comparator<? super E> comparator) {
        this(new TreeMap<>(comparator));  // 自定义比较器
    }
}
```

**特点**：

- 元素有序（自然排序或自定义 Comparator）
- 不允许 null 元素（无法比较大小）
- 增删改查 O(log n)

### 3.3 LinkedHashSet

LinkedHashSet 继承自 HashSet，底层使用 **LinkedHashMap**，保持插入顺序。

```java
// 继承 HashSet，使用 LinkedHashMap
HashSet(int initialCapacity, float loadFactor, boolean dummy) {
    map = new LinkedHashMap<>(initialCapacity, loadFactor);
}
```

---

## 四、Queue / Deque 详解

### 4.1 PriorityQueue（优先级队列）

基于**小顶堆**实现，队首是最小元素。

```java
transient Object[] queue;  // 堆数组
private int size = 0;
private final Comparator<? super E> comparator;  // 比较器

// 核心操作：上浮（添加元素后）
private void siftUp(int k, E x) {
    while (k > 0) {
        int parent = (k - 1) >>> 1;  // 父节点索引
        Object e = queue[parent];
        if (comparator != null) {
            if (comparator.compare(x, (E) e) >= 0) break;
        } else {
            if (((Comparable<? super E>) x).compareTo((E) e) >= 0) break;
        }
        queue[k] = e;
        k = parent;
    }
    queue[k] = x;
}

// 下沉（删除队首后调整）
private void siftDown(int k, E x) {
    int half = size >>> 1;
    while (k < half) {
        int child = (k << 1) + 1;  // 左子节点
        Object c = queue[child];
        int right = child + 1;  // 右子节点
        if (right < size &&
                ((comparator == null) ?
                        ((Comparable<? super E>) c).compareTo((E) queue[right]) > 0 :
                        comparator.compare((E) c, (E) queue[right]) > 0))
            c = queue[child = right];
        if ((comparator == null) ?
                ((Comparable<? super E>) x).compareTo((E) c) <= 0 :
                comparator.compare(x, (E) c) <= 0)
            break;
        queue[k] = c;
        k = child;
    }
    queue[k] = x;
}
```

**时间复杂度**：

- 插入：`O(log n)`
- 删除队首：`O(log n)`
- 查看队首：`O(1)`

### 4.2 ArrayDeque（双端队列）

基于**循环数组**实现，两端操作都是 O(1)。

```java
transient Object[] elements;
transient int head;  // 头部索引（指向下一个插入位置）
transient int tail;  // 尾部索引

// 头部添加
public void addFirst(E e) {
    if (e == null) throw new NullPointerException();
    // head - 1，如果为负数则循环到数组末尾
    elements[head = (head - 1) & (elements.length - 1)] = e;
    if (head == tail)  // 满了，扩容
        doubleCapacity();
}

// 尾部添加
public void addLast(E e) {
    if (e == null) throw new NullPointerException();
    elements[tail] = e;
    // tail + 1，如果超过数组长度则循环到开头
    if ((tail = (tail + 1) & (elements.length - 1)) == head)
        doubleCapacity();
}

// 扩容：容量翻倍
private void doubleCapacity() {
    assert head == tail;
    int p = head;
    int n = elements.length;
    int r = n - p;  // head 到数组末尾的元素个数
    int newCapacity = n << 1;  // 翻倍
    Object[] a = new Object[newCapacity];

    // 复制：head -> 末尾，0 -> tail
    System.arraycopy(elements, p, a, 0, r);
    System.arraycopy(elements, 0, a, r, p);
    elements = a;
    head = 0;
    tail = n;
}
```

---

## 五、HashMap 深度解析

### 5.1 Hash 计算与寻址

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
(n -1)&hash
```

### 5.2 HashMap Put 主流程（JDK 1.8）

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
                    p.next = newNode(hash, key, value, null);  // 尾插法
                    if (binCount >= TREEIFY_THRESHOLD - 1)  // >=7 转树
                        treeifyBin(tab, i);
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

### 5.3 HashMap 扩容（Resize）详解

#### 扩容触发条件

- `size > threshold`（threshold = capacity × loadFactor，默认 0.75）
- 首次初始化：`new HashMap()` 时 table 为 null，首次 put 触发初始化（capacity 为 16）
- 单个链表长度 > 8 且 `table.length < 64`：转红黑树前优先扩容

#### 扩容机制（2 倍扩容）

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
        // 容量翻倍 [<< 1 等同 * 2]，阈值翻倍
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
                oldTab[j] = null;  // 手动GC

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

#### 高低位拆分算法原理

扩容时容量从 n 变为 2n，元素的新位置只可能是：

- **原位置 j**（低位）
- **原位置 + 旧容量 j+oldCap**（高位）

判断依据：`e.hash & oldCap`

- 结果为 0：hash 的高位为 0，位置不变（j）
- 结果非 0：hash 的高位为 1，位置变为 `j+oldCap`

```
假设:
  旧容量 (oldCap)：16 (二进制 0001 0000)
  Key 的哈希值 (hash)：27 (二进制 0001 1011)
  
判断: 27 & 16 = 0001 1011 & 0001 0000 = 0001 0000 ≠ 0
结果: 位置变为 j + 16（高位链）
```

#### JDK 1.7 vs 1.8 迁移差异

| 特性   | JDK 1.7             | JDK 1.8               |
|------|---------------------|-----------------------|
| 插入方式 | 头插法（倒序）             | 尾插法（保序）               |
| 并发安全 | 并发 resize 导致死循环（环链） | 不解决并发问题（仍可能丢数据），但无死循环 |
| 拆分逻辑 | 逐个 rehash 计算新位置     | 高低位双链拆分（O(n) 且高效）     |

**JDK 1.7 死循环原因**：

```
线程 A 记录：e = A, next = B
线程 B 完成扩容：B → A（头插法倒序）
线程 A 继续：e=A 放入新表，e.next=B（此时 B.next 已经是 A，形成 A→B→A 环）
```

---

## 六、ConcurrentHashMap 深度解析

### 6.1 JDK 1.7：Segment 分段锁

#### 核心结构

```java
// 1.7 的 Segment 继承 ReentrantLock，本身就是一把锁
static final class Segment<K, V> extends ReentrantLock implements Serializable {
    transient volatile HashEntry<K, V>[] table;  // 每个 Segment 独立的哈希表
    transient int count;                        // 元素个数（需加锁读取）
    transient int modCount;
    transient int threshold;
    final float loadFactor;

    // put 时先尝试获取锁：lock()
    final V put(K key, int hash, V value, boolean onlyIfAbsent) {
        HashEntry<K, V> node = tryLock() ? null : scanAndLockForPut(key, hash, value);
        // ... 实际插入逻辑
    }
}

// HashEntry：value 和 next 为 final，保证读安全（不可变模式）
static final class HashEntry<K, V> {
    final int hash;
    final K key;
    volatile V value;      // volatile 保证可见性
    final HashEntry<K, V> next;
}
```

#### 双重 Hash 定位

```java
// 1.7 定位需要两次哈希
public V put(K key, V value) {
    Segment<K, V> s;
    if (value == null) throw new NullPointerException();
    int hash = hash(key);  // 第一次：计算 key 的 hash
    int j = (hash >>> segmentShift) & segmentMask;  // 定位 Segment
    if ((s = (Segment<K, V>) UNSAFE.getObject(segments, (j << SSHIFT) + SBASE)) == null)
        s = ensureSegment(j);  // 延迟初始化 Segment
    return s.put(key, hash, value, false);  // 第二次：在 Segment 内定位桶
}
```

#### 1.7 的局限

1. **锁粒度粗**：虽然比 Hashtable（synchronized 方法）细，但 Segment 不可动态增加，并发度固定（默认 16）
2. **查询效率低**：链表过长时遍历慢（没有红黑树优化）
3. **内存占用**：每个 Segment 是独立的小 HashMap，空节点也占用内存

### 6.2 JDK 1.8：CAS + synchronized + 红黑树

#### 核心字段与常量

```java
// 核心数组，延迟初始化（第一次 put 时初始化）
transient volatile Node<K, V>[] table;

// 下一个使用的表，仅在扩容时非空（多线程迁移的目标数组）
private transient volatile Node<K, V>[] nextTable;

// 控制标识符，多用途：
// - 负数表示正在初始化或扩容
// - -1 表示正在初始化
// - -(1 + n) 表示有 n 个线程正在扩容
// - 0 或正数表示下次扩容的阈值
private transient volatile int sizeCtl;

// 转移时的基础索引，多线程扩容时分配任务
private transient volatile int transferIndex;

// 其他关键常量
static final int MOVED = -1;  // ForwardingNode 的 hash 值
static final int TREEBIN = -2;  // TreeBin 的 hash 值
static final int RESERVED = -3;  // ReservationNode 的 hash 值
static final int HASH_BITS = 0x7fffffff;  // 用于消除 hash 的符号位
```

#### 四大核心节点类

```java
// 1. 基础节点（链表节点）
static class Node<K, V> implements Map.Entry<K, V> {
    final int hash;
    final K key;
    volatile V val;           // 保证读可见性
    volatile Node<K, V> next;  // 链表下一个
}

// 2. 红黑树节点（继承 Node）
static final class TreeNode<K, V> extends Node<K, V> {
    TreeNode<K, V> parent;
    TreeNode<K, V> left;
    TreeNode<K, V> right;
    TreeNode<K, V> prev;       // 删除时需要
    boolean red;
}

// 3. 树容器（代理对象，持有树根节点）
static final class TreeBin<K, V> extends Node<K, V> {
    TreeNode<K, V> root;
    volatile Thread waiter;   // 等待线程（写时阻塞读）
    volatile int lockState;   // 读写锁状态
    // 树化后的桶，外部看到的头节点是 TreeBin，而非 TreeNode
}

// 4. 转发节点（扩容期间使用，hash = -1）
static final class ForwardingNode<K, V> extends Node<K, V> {
    final Node<K, V>[] nextTable;  // 指向新数组

    ForwardingNode(Node<K, V>[] tab) {
        super(MOVED, null, null, null);
        this.nextTable = tab;
    }

    // 查找时直接转发到新数组
    Node<K, V> find(int h, Object k) {
        return nextTable[tabAt(nextTable, (n - 1) & h)].find(h, k);
    }
}
```

#### putVal 源码深度解析

```java
final V putVal(K key, V value, boolean onlyIfAbsent) {
    if (key == null || value == null) throw new NullPointerException();
    int hash = spread(key.hashCode());  // 扰动函数，减少冲突
    int binCount = 0;

    // 自旋 CAS（乐观锁）
    for (Node<K, V>[] tab = table; ; ) {
        Node<K, V> f;
        int n, i, fh;

        // 场景 1：table 未初始化，初始化
        if (tab == null || (n = tab.length) == 0)
            tab = initTable();

            // 场景 2：目标桶为空，CAS 直接插入（无锁快速路径）
        else if ((f = tabAt(tab, i = (n - 1) & hash)) == null) {
            if (casTabAt(tab, i, null, new Node<K, V>(hash, key, value, null)))
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
                        for (Node<K, V> e = f; ; ++binCount) {
                            K ek;
                            // 找到相同 key，覆盖 value
                            if (e.hash == hash &&
                                    ((ek = e.key) == key || (ek != null && key.equals(ek)))) {
                                oldVal = e.val;
                                if (!onlyIfAbsent)
                                    e.val = value;
                                break;
                            }
                            Node<K, V> pred = e;
                            // 尾插法插入新节点
                            if ((e = e.next) == null) {
                                pred.next = new Node<K, V>(hash, key, value, null);
                                break;
                            }
                        }
                    } else if (f instanceof TreeBin) {  // 红黑树
                        Node<K, V> p;
                        binCount = 2;
                        if ((p = ((TreeBin<K, V>) f).putTreeVal(hash, key, value)) != null) {
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

#### initTable 初始化

```java
private final Node<K, V>[] initTable() {
    Node<K, V>[] tab;
    int sc;
    while ((tab = table) == null || tab.length == 0) {
        if ((sc = sizeCtl) < 0)
            Thread.yield();  // 其他线程正在初始化，让出 CPU

            // CAS 将 sizeCtl 设为 -1，表示本线程正在初始化
        else if (U.compareAndSwapInt(this, SIZECTL, sc, -1)) {
            try {
                if ((tab = table) == null || tab.length == 0) {
                    int n = (sc > 0) ? sc : DEFAULT_CAPACITY;  // 默认 16
                    @SuppressWarnings("unchecked")
                    Node<K, V>[] nt = (Node<K, V>[]) new Node<?, ?>[n];
                    table = tab = nt;
                    sc = n - (n >>> 2);  // 阈值 = 0.75 * n
                }
            } finally {
                sizeCtl = sc;
            }
            break;
        }
    }
    return tab;
}
```

#### addCount 计数与扩容触发

```java
// 增加计数，并在达到阈值时触发扩容
private final void addCount(long x, int check) {
    CounterCell[] as;
    long b, s;

    // 尝试直接更新 baseCount，失败则使用 CounterCell
    if ((as = counterCells) != null ||
            !U.compareAndSwapLong(this, BASECOUNT, b = baseCount, s = b + x)) {
        CounterCell a;
        long v;
        int m;
        boolean uncontended = true;
        if (as == null || (m = as.length - 1) < 0 ||
                (a = as[ThreadLocalRandom.getProbe() & m]) == null ||
                !(uncontended =
                        U.compareAndSwapLong(a, CELLVALUE, v = a.value, v + x))) {
            fullAddCount(x, uncontended);  // 竞争激烈时的兜底方案
            return;
        }
        if (check <= 1)
            return;
        s = sumCount();  // 计算总元素个数
    }

    // 检查是否需要扩容
    if (check >= 0) {
        Node<K, V>[] tab, nt;
        int n, sc;
        while (s >= (long) (sc = sizeCtl) && (tab = table) != null &&
                (n = tab.length) < MAXIMUM_CAPACITY) {
            int rs = resizeStamp(n);  // 生成扩容戳
            if (sc < 0) {  // 已有线程在扩容
                if ((sc >>> RESIZE_STAMP_SHIFT) != rs || sc == rs + 1 ||
                        sc == rs + MAX_RESIZERS || (nt = nextTable) == null ||
                        transferIndex <= 0)
                    break;
                if (U.compareAndSwapInt(this, SIZECTL, sc, sc + 1))
                    transfer(tab, nt);  // 协助扩容
            }
            // 本线程是第一个扩容的线程
            else if (U.compareAndSwapInt(this, SIZECTL, sc,
                    (rs << RESIZE_STAMP_SHIFT) + 2))
                transfer(tab, null);  // 发起扩容
            s = sumCount();
        }
    }
}
```

#### size 计算：CounterCell 机制

```java
// CounterCell 数组，用于分散计数热点
@sun.misc.Contended
static final class CounterCell {
    volatile long value;

    CounterCell(long x) {
        value = x;
    }
}

private transient volatile long baseCount;  // 基础计数

// 计算总元素数
final long sumCount() {
    CounterCell[] as = counterCells;
    CounterCell a;
    long sum = baseCount;
    if (as != null) {
        for (int i = 0; i < as.length; ++i) {
            if ((a = as[i]) != null)
                sum += a.value;
        }
    }
    return sum;
}

public int size() {
    long n = sumCount();
    return ((n < 0L) ? 0 :
            (n > (long) Integer.MAX_VALUE) ? Integer.MAX_VALUE : (int) n);
}
```

**CounterCell 原理**：

- 当多线程竞争激烈时，每个线程通过 `ThreadLocalRandom.getProbe()` 映射到不同的 CounterCell
- 避免所有线程竞争同一个 `baseCount`，类似 `LongAdder` 的设计
- 最终 size = baseCount + sum(CounterCell values)

#### transfer 并发扩容

```java
private final void transfer(Node<K, V>[] tab, Node<K, V>[] nextTab) {
    int n = tab.length, stride;

    // 计算每个线程负责处理的桶数量（最小 16）
    if ((stride = (NCPU > 1) ? (n >>> 3) / NCPU : n) < MIN_TRANSFER_STRIDE)
        stride = MIN_TRANSFER_STRIDE;

    // 新数组初始化
    if (nextTab == null) {
        try {
            @SuppressWarnings("unchecked")
            Node<K, V>[] nt = (Node<K, V>[]) new Node<?, ?>[n << 1];  // 容量翻倍
            nextTable = nextTab = nt;
        } catch (Throwable ex) {
            sizeCtl = Integer.MAX_VALUE;
            return;
        }
        transferIndex = n;  // 从后往前分配任务
    }

    int nextn = nextTab.length;
    ForwardingNode<K, V> fwd = new ForwardingNode<K, V>(nextTab);
    boolean advance = true;
    boolean finishing = false;

    // 自旋处理桶迁移
    for (int i = 0, bound = 0; ; ) {
        Node<K, V> f;
        int fh;

        // 分配下一个处理区间
        while (advance) {
            int nextIndex, nextBound;
            if (--i >= bound || finishing)
                advance = false;
            else if ((nextIndex = transferIndex) <= 0) {
                i = -1;
                advance = false;
            }
            // CAS 更新 transferIndex，分配任务区间
            else if (U.compareAndSwapInt(this, TRANSFERINDEX, nextIndex,
                    nextBound = (nextIndex > stride ? nextIndex - stride : 0))) {
                bound = nextBound;
                i = nextIndex - 1;
                advance = false;
            }
        }

        // 处理完成
        if (i < 0 || i >= n || i + n >= nextn) {
            if (finishing) {
                nextTable = null;
                table = nextTab;
                sizeCtl = (n << 1) - (n >>> 1);  // 新阈值 = 0.75 * 2n
                return;
            }
            // CAS 递减活跃线程数
            if (U.compareAndSwapInt(this, SIZECTL, sc = sizeCtl, sc - 1)) {
                if ((sc - 2) != resizeStamp(n) << RESIZE_STAMP_SHIFT)
                    return;
                finishing = advance = true;
                i = n;
            }
        }

        // 桶为空，直接放置 ForwardingNode
        else if ((f = tabAt(tab, i)) == null)
            advance = casTabAt(tab, i, null, fwd);

            // 已有 ForwardingNode，说明已被处理
        else if ((fh = f.hash) == MOVED)
            advance = true;

            // 迁移非空桶
        else {
            synchronized (f) {
                if (tabAt(tab, i) == f) {
                    Node<K, V> ln, hn;
                    if (fh >= 0) {  // 链表迁移
                        // 高低位拆分（同 HashMap）
                        int runBit = fh & n;
                        Node<K, V> lastRun = f;
                        for (Node<K, V> p = f.next; p != null; p = p.next) {
                            int b = p.hash & n;
                            if (b != runBit) {
                                runBit = b;
                                lastRun = p;
                            }
                        }
                        if (runBit == 0) {
                            ln = lastRun;
                            hn = null;
                        } else {
                            hn = lastRun;
                            ln = null;
                        }
                        for (Node<K, V> p = f; p != lastRun; p = p.next) {
                            int ph = p.hash;
                            K pk = p.key;
                            V pv = p.val;
                            if ((ph & n) == 0)
                                ln = new Node<K, V>(ph, pk, pv, ln);
                            else
                                hn = new Node<K, V>(ph, pk, pv, hn);
                        }
                        setTabAt(nextTab, i, ln);      // 低位链放原位置
                        setTabAt(nextTab, i + n, hn);  // 高位链放新位置
                        setTabAt(tab, i, fwd);         // 原桶标记为已迁移
                    } else if (f instanceof TreeBin) {  // 红黑树迁移
                        TreeBin<K, V> t = (TreeBin<K, V>) f;
                        TreeNode<K, V> lo = null, loTail = null;
                        TreeNode<K, V> hi = null, hiTail = null;
                        int lc = 0, hc = 0;
                        for (Node<K, V> e = t.first; e != null; e = e.next) {
                            int h = e.hash;
                            TreeNode<K, V> p = new TreeNode<K, V>
                                    (h, e.key, e.val, null, null);
                            if ((h & n) == 0) {
                                if ((p.prev = loTail) == null)
                                    lo = p;
                                else
                                    loTail.next = p;
                                loTail = p;
                                ++lc;
                            } else {
                                if ((p.prev = hiTail) == null)
                                    hi = p;
                                else
                                    hiTail.next = p;
                                hiTail = p;
                                ++hc;
                            }
                        }
                        // 根据数量决定是否转回链表
                        ln = (lc <= UNTREEIFY_THRESHOLD) ? untreeify(lo) :
                                (hc != 0) ? new TreeBin<K, V>(lo) : t;
                        hn = (hc <= UNTREEIFY_THRESHOLD) ? untreeify(hi) :
                                (lc != 0) ? new TreeBin<K, V>(hi) : t;
                        setTabAt(nextTab, i, ln);
                        setTabAt(nextTab, i + n, hn);
                        setTabAt(tab, i, fwd);
                    }
                }
            }
        }
    }
}
```

#### get 操作（无锁设计）

```java
public V get(Object key) {
    Node<K, V>[] tab;
    Node<K, V> e, p;
    int n, eh;
    K ek;
    int h = spread(key.hashCode());  // 计算 hash

    // 1. 检查 table 是否初始化且桶不为空
    if ((tab = table) != null && (n = tab.length) > 0 &&
            (e = tabAt(tab, (n - 1) & h)) != null) {

        // 2. 首节点就是目标
        if ((eh = e.hash) == h) {
            if ((ek = e.key) == key || (ek != null && key.equals(ek)))
                return e.val;
        }

        // 3. hash < 0，可能是红黑树或 ForwardingNode
        else if (eh < 0)
            return (p = e.find(h, key)) != null ? p.val : null;

        // 4. 遍历链表
        while ((e = e.next) != null) {
            if (e.hash == h &&
                    ((ek = e.key) == key || (ek != null && key.equals(ek))))
                return e.val;
        }
    }
    return null;
}
```

**无锁原理**：

- `tabAt()` 使用 `Unsafe.getObjectVolatile()` 保证读取可见性
- Node 的 `val` 和 `next` 字段是 `volatile`，保证读到最新值
- 利用 **happens-before** 规则，写操作的修改对后续读操作可见

### 6.3 JDK 1.7 vs 1.8 对比

| 特性      | JDK 1.7                  | JDK 1.8                 |
|---------|--------------------------|-------------------------|
| 数据结构    | Segment + HashEntry + 链表 | Node + 链表 + 红黑树         |
| 锁机制     | Segment 继承 ReentrantLock | CAS + synchronized（桶级别） |
| 并发度     | 固定 16（Segment 数量）        | 理论上无上限（桶级别）             |
| 哈希冲突    | 链表遍历                     | 链表 → 红黑树（长度≥8）          |
| size 计算 | 分段统计后求和                  | CounterCell 分散热点        |
| 扩容      | 单个 Segment 独立扩容          | 多线程并发协助扩容               |
| 读取      | 无需加锁                     | 无需加锁，volatile 保证可见性     |

---

## 七、高频面试题总结

### 7.1 HashMap 相关

**Q1: HashMap 的底层数据结构是什么？**
> JDK 1.7：数组 + 链表；JDK 1.8：数组 + 链表 + 红黑树。当链表长度 ≥ 8 且数组长度 ≥ 64 时，链表转为红黑树，将查找时间复杂度从
> O(n) 优化到 O(log n)。

**Q2: 为什么 HashMap 的容量要是 2 的幂次方？**
> 1. 可以用位运算 `(n-1)&hash` 代替取模运算 `hash%n`，效率更高；
> 2. 扩容时元素的新位置只可能是原位置或原位置+旧容量，便于高低位拆分。

**Q3: HashMap 中 equals 和 hashCode 的关系？**
> - 两个对象 equals 相等，hashCode 必须相等；
> - hashCode 相等，equals 不一定相等（哈希冲突）；
> - 重写 equals 必须重写 hashCode，否则可能导致相同 key 存多个值。

**Q4: HashMap 为什么是线程不安全的？**
> - JDK 1.7：并发扩容可能导致环形链表，引发死循环；
> - JDK 1.8：虽然修复了死循环，但并发 put 可能导致数据丢失（覆盖写入）。

**Q5: 为什么用红黑树而不是 AVL 树？**
> 红黑树插入/删除的旋转操作更少（最多 2 次旋转），在频繁增删场景下性能更好。AVL 树查询更快，但维护成本更高。

### 7.2 ConcurrentHashMap 相关

**Q1: ConcurrentHashMap 如何保证线程安全？**
> - JDK 1.7：Segment 分段锁，每个 Segment 是一个独立的哈希表，互不影响；
> - JDK 1.8：CAS + synchronized（锁单个桶），锁粒度更细，并发度更高。

**Q2: ConcurrentHashMap 的 size 方法如何保证准确性？**
> 使用 CounterCell 数组分散计数热点，每个线程更新不同的 Cell，最终求和。不保证强一致性，但保证最终一致性。

**Q3: 为什么 1.8 用 synchronized 代替 ReentrantLock？**
> - synchronized 在 JDK 1.6 后经过优化（偏向锁、轻量级锁、重量级锁），性能已经很好；
> - synchronized 是 JVM 内置支持，代码更简洁；
> - 锁的是桶的头节点，持有时间极短，轻量级锁即可满足。

**Q4: ConcurrentHashMap 的扩容机制？**
> 支持多线程并发扩容，每个线程负责一个 stride（默认 16 个桶）的迁移任务。通过 `ForwardingNode` 标记已迁移的桶，其他线程遇到后协助扩容或跳过。

**Q5: get 操作需要加锁吗？**
> 不需要。使用 `volatile` + `Unsafe` 的可见性读取，保证读到最新值。Node 的 `val` 和 `next` 都是 volatile。

### 7.3 List 相关

**Q1: ArrayList 和 LinkedList 的区别？**
> | 特性 | ArrayList | LinkedList |
> |------|-----------|------------|
> | 底层 | 动态数组 | 双向链表 |
> | 随机访问 | O(1) | O(n) |
> | 插入/删除 | O(n)（需要移动元素） | O(1)（已知节点位置） |
> | 内存占用 | 较少 | 较多（指针开销） |

**Q2: ArrayList 扩容机制？**
> 默认初始容量 10，扩容为原来的 1.5 倍（`oldCapacity + (oldCapacity >> 1)`）。扩容使用 `Arrays.copyOf`，内部调用
`System.arraycopy`（native 方法）。

**Q3: 如何实现线程安全的 List？**
> - `Collections.synchronizedList()`：包装器，所有方法加 synchronized；
> - `CopyOnWriteArrayList`：写时复制，读无锁，适合读多写少场景。

### 7.4 其他

**Q1: HashSet 和 TreeSet 的区别？**
> - HashSet：基于 HashMap，无序，O(1) 增删查，允许 null；
> - TreeSet：基于 TreeMap（红黑树），有序，O(log n) 增删查，不允许 null。

**Q2: PriorityQueue 的底层实现？**
> 基于小顶堆（数组实现），插入和删除 O(log n)，查看队首 O(1)。

**Q3: 快速失败（fail-fast）和安全失败（fail-safe）？**
> - **fail-fast**：迭代过程中修改集合结构（非迭代器方法）会立即抛出 `ConcurrentModificationException`。实现：modCount 检查。
> - **fail-safe**：迭代时操作的是集合的副本，不会抛出异常。如 `CopyOnWriteArrayList`、`ConcurrentHashMap`。

---

## 八、总结

| 集合类               | 底层结构      | 线程安全 | 适用场景                        |
|-------------------|-----------|------|-----------------------------|
| ArrayList         | 动态数组      | ❌    | 查询多、随机访问                    |
| LinkedList        | 双向链表      | ❌    | 频繁插入/删除、实现栈/队列              |
| HashMap           | 数组+链表+红黑树 | ❌    | 通用键值存储                      |
| ConcurrentHashMap | 数组+链表+红黑树 | ✅    | 高并发键值存储                     |
| HashSet           | HashMap   | ❌    | 去重、无序集合                     |
| TreeSet           | 红黑树       | ❌    | 有序集合                        |
| PriorityQueue     | 小顶堆       | ❌    | 优先级队列、TopK 问题               |
| ArrayDeque        | 循环数组      | ❌    | 双端队列（比 Stack/LinkedList 更快） |
