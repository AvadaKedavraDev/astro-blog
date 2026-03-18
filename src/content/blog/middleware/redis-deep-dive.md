---
title: "Redis 深度剖析：从入门到源码级精通"
pubDate: 2026-03-17
description: "深入 Redis 底层实现原理，剖析 SDS、跳表、字典、持久化、主从复制、哨兵、集群等核心机制，结合生产环境案例讲解性能优化与最佳实践"
tags: ["Redis", "中间件", "缓存", "性能优化", "分布式"]
#coverImage: "/images/redis-deep-dive-cover.jpg"
readingTime: 60
pinned: true

# 系列文章
series:
  name: "中间件核心"
  order: 1


---

import Image from "@components/ui/Image.astro";

## 一、Redis 架构全景：从宏观到微观

### 1.1 Redis 是什么？为什么快？

Redis（Remote Dictionary Server）是一个开源的内存数据结构存储系统，可用作数据库、缓存、消息代理和流引擎。

**Redis 的核心特性：**

| 特性     | 说明                                                      | 优势               |
|--------|---------------------------------------------------------|------------------|
| 内存存储   | 数据主要存储在内存                                               | 读写速度极快（10万+ QPS） |
| 数据结构丰富 | String、Hash、List、Set、ZSet、Bitmap、HyperLogLog、Geo、Stream | 满足不同场景需求         |
| 持久化    | RDB 快照 + AOF 日志                                         | 兼顾性能与数据安全        |
| 高可用    | 主从复制 + 哨兵 + 集群                                          | 自动故障转移、水平扩展      |
| 原子操作   | 单线程执行命令                                                 | 避免竞态条件           |
| 发布订阅   | Pub/Sub 机制                                              | 实时消息推送           |

**Redis 为什么这么快？**

```
┌─────────────────────────────────────────────────────────────┐
│  Redis 高性能的核心原因                                        
├─────────────────────────────────────────────────────────────┤
│  1. 纯内存操作    → 纳秒级访问延迟                               
│  2. 单线程模型    → 避免上下文切换和锁竞争                         
│  3. IO多路复用    → 单线程处理数万并发连接                        
│  4. 高效数据结构  → SDS、跳表、压缩列表等优化                      
│  5. C语言实现     → 接近硬件的性能                              
└─────────────────────────────────────────────────────────────┘
```

> [!note]
> Redis 6.0 之后引入多线程 IO，但命令执行仍是单线程。这意味着单个命令的原子性仍然得到保证。

### 1.2 Redis 的线程模型演进

```
Redis 4.0 及以前：
┌─────────────────────────────────────┐
│  主线程                              
│  ├─ 接收连接                         
│  ├─ 读取请求                         
│  ├─ 执行命令（单线程）                
│  └─ 发送响应                         
└─────────────────────────────────────┘

Redis 6.0+：
┌─────────────────────────────────────────────────────┐
│  主线程（命令执行）        多个 IO 线程（网络读写）      
│  ├─ 执行命令              ├─ 接收连接                 
│  └─ 命令排队              ├─ 读取请求                 
│                          └─ 发送响应                 
└─────────────────────────────────────────────────────┘
```

```bash
# 开启多线程 IO（Redis 6.0+）
# redis.conf
io-threads 4                  # 启用 4 个 IO 线程
io-threads-do-reads yes       # IO 线程也处理读操作
```

---

## 二、数据结构的底层实现：从源码看本质

### 2.1 SDS（Simple Dynamic String）：动态字符串

Redis 没有直接使用 C 语言的字符串，而是实现了自己的 SDS。

**为什么不用 C 字符串？**
- 获取长度需要遍历（O(n)）
- 缓冲区溢出风险
- 二进制不安全（遇到 `\0` 结束）
- 频繁的内存重新分配

**SDS 结构（Redis 3.2+）：**

```c
// sdshdr8 结构（字符串长度 < 256）
struct __attribute__ ((__packed__)) sdshdr8 {
    uint8_t len;        // 已使用长度
    uint8_t alloc;      // 分配的总长度
    unsigned char flags; // 类型标识
    char buf[];         // 柔性数组，实际存储数据
};

// sdshdr16 结构（字符串长度 < 65536）
struct __attribute__ ((__packed__)) sdshdr16 {
    uint16_t len;
    uint16_t alloc;
    unsigned char flags;
    char buf[];
};
```

```
SDS 内存布局示例：存储 "Redis"
┌─────────┬─────────┬───────┬─────────────────┐
│  len=5  │ alloc=5 │ flags │  R  e  d  i  s  │
│  1 byte │ 1 byte  │ 1byte │     5 bytes     │
└─────────┴─────────┴───────┴─────────────────┘
         ↑                                     ↑
       头部                                  数据（末尾有 \0，兼容 C 函数）
```

**SDS 的空间预分配策略：**

```c
// 扩容策略源码简化
if (len + addlen < 1MB) {
    // 小于 1MB，翻倍扩容
    newlen = (len + addlen) * 2;
} else {
    // 大于 1MB，只增加 1MB
    newlen = (len + addlen) + 1MB;
}
```

**惰性释放策略：**

```c
// 缩短字符串时，不立即释放内存
void sdsclear(sds s) {
    struct sdshdr *sh = (void*)(s - sizeof(struct sdshdr));
    sh->len = 0;           // 长度置 0
    sh->buf[0] = '\0';     // 第一个字符置结束符
    // 注意：alloc 不变，内存不释放！
}
```

### 2.2 跳表（Skip List）：有序集合的实现

ZSet（Sorted Set）使用跳表 + 哈希表的组合实现。

**跳表结构：**

```
level 3:  head ───────────────────────────────→  NULL
                ↓
level 2:  head ───────────────→ [70] ─────────→  NULL
                ↓                 ↓
level 1:  head ─────→ [30] ───→ [70] ───→ [99] → NULL
                ↓       ↓         ↓         ↓
level 0:  head → [3] → [30] → [55] → [70] → [99] → NULL
                  ↓      ↓       ↓       ↓       ↓
                score=3 score=30 score=55 score=70 score=99
```

**Redis 跳表节点定义：**

```c
typedef struct zskiplistNode {
    sds ele;                    // 成员对象
    double score;               // 分值
    struct zskiplistNode *backward;  // 后退指针（用于反向遍历）
    struct zskiplistLevel {
        struct zskiplistNode *forward;  // 前进指针
        unsigned int span;       // 跨度（用于计算排名）
    } level[];                  // 柔性数组，层级数组
} zskiplistNode;

typedef struct zskiplist {
    struct zskiplistNode *header, *tail;  // 头尾指针
    unsigned long length;       // 节点数量
    int level;                  // 最大层数
} zskiplist;
```

**跳表层级随机算法：**

```c
// 随机生成层级（概率 0.5，最大 32 层）
int zslRandomLevel(void) {
    int level = 1;
    while ((random() & 0xFFFF) < (ZSKIPLIST_P * 0xFFFF))
        level += 1;
    return (level < ZSKIPLIST_MAXLEVEL) ? level : ZSKIPLIST_MAXLEVEL;
}
// 期望层级：1 + 0.5 + 0.25 + ... ≈ 2
```

**跳表 vs 红黑树/AVL树：**

| 特性 | 跳表 | 红黑树 |
|------|------|--------|
| 实现复杂度 | 简单 | 复杂 |
| 范围查询 | 高效（顺序遍历） | 需要中序遍历 |
| 并发控制 | 更简单（锁粒度粗） | 复杂 |
| 内存占用 | 稍多（存指针） | 较少 |
| 插入/删除 | O(log n)，常数较小 | O(log n) |

### 2.3 字典（Dict）：哈希表的实现

Redis 的字典使用两个哈希表实现渐进式 rehash。

```c
typedef struct dictEntry {
    void *key;                  // 键
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v;                        // 值
    struct dictEntry *next;     // 拉链法解决冲突
} dictEntry;

typedef struct dictht {
    dictEntry **table;          // 哈希表数组
    unsigned long size;         // 表大小（2^n）
    unsigned long sizemask;     // 掩码 = size - 1
    unsigned long used;         // 已有节点数
} dictht;

typedef struct dict {
    dictType *type;             // 类型特定函数
    void *privdata;             // 私有数据
    dictht ht[2];               // 两个哈希表，rehash 时使用
    long rehashidx;             // rehash 进度，-1 表示未在进行
    unsigned long iterators;    // 正在运行的迭代器数量
} dict;
```

**渐进式 Rehash 过程：**

```
Rehash 前：
ht[0]: size=4, used=4    ht[1]: size=0, used=0
┌───┬───┬───┬───┐
│ 0 │ 1 │ 2 │ 3 │
└─┬─┴─┬─┴─┬─┴─┬─┘
  A   B   C   D

Rehash 中（rehashidx=1）：
ht[0]: size=4, used=3    ht[1]: size=8, used=1
┌───┬───┬───┬───┐        ┌───┬───┬───┬───┬───┬───┬───┬───┐
│ X │ X │ 2 │ 3 │        │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │
└───┴───┴─┬─┴─┬─┘        └─┬─┴───┴───┴───┴───┴───┴───┴───┘
          C   D            A
          ↑ rehashidx=1
          B 已迁移

Rehash 后：
ht[0]: size=0, used=0    ht[1]: size=8, used=4
                         ┌───┬───┬───┬───┬───┬───┬───┬───┐
                         │ 0 │ 1 │ 2 │ 3 │ 4 │ 5 │ 6 │ 7 │
                         └─┬─┴─┬─┴─┬─┴─┬─┴───┴───┴───┴───┘
                           A   B   C   D
```

**Hash 冲突处理：**

```c
// 使用 MurmurHash2 算法计算 hash 值
uint64_t dictGenHashFunction(const void *key, int len) {
    return MurmurHash2_64(key, len, dict_hash_function_seed);
}

// 冲突解决：头插法拉链
// 新节点插入链表头部（O(1)）
```

### 2.4 压缩列表（ziplist）与快表（quicklist）

**压缩列表（Redis 7.0 前 List 的底层实现之一）：**

```
<zlbytes> <zltail> <zllen> <entry> <entry> ... <entry> <zlend>
  4字节    4字节    2字节   变长     变长        变长    1字节

entry 结构：
<prevlen> <encoding> <content>
  变长      变长       变长
```

**快表（quicklist）：Redis 3.2+ List 的实现**

```c
typedef struct quicklist {
    quicklistNode *head;        // 头节点
    quicklistNode *tail;        // 尾节点
    unsigned long count;        // 总元素数
    unsigned long len;          // 节点数
    int fill : 16;              // 单个 ziplist 大小限制
    unsigned int compress : 16; // 两端不压缩的节点数
} quicklist;

typedef struct quicklistNode {
    struct quicklistNode *prev;
    struct quicklistNode *next;
    unsigned char *zl;          // 指向 ziplist 或 listpack
    unsigned int sz;            // ziplist 大小
    unsigned int count : 16;    // 元素数量
    unsigned int encoding : 2;  // RAW==1 or LZF==2
    unsigned int container : 2; // NONE==1 or ZIPLIST==2 or LISTPACK==3
    unsigned int recompress : 1; // 是否被解压过
    unsigned int attempted_compress : 1;
    unsigned int extra : 10;
} quicklistNode;
```

```
quicklist 结构示意：
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Node 1 │ ↔  │  Node 2 │ ↔  │  Node 3 │ ↔  │  Node 4 │
│ (ziplist)│    │ (ziplist)│    │ (ziplist)│    │ (ziplist)│
│ 2 items │    │ 2 items │    │ 2 items │    │ 1 item  │
└─────────┘    └─────────┘    └─────────┘    └─────────┘
    ↑                                              ↑
  head（热数据，不压缩）                        tail（热数据，不压缩）

中间节点可以使用 LZF 压缩节省内存
```

**listpack（紧凑列表）：Redis 5.0 引入，替代 ziplist**

```
listpack 结构：
<total-bytes> <num-elements> <element> ... <element> <end-marker>
   4字节         2字节       变长            变长       1字节(0xFF)

element 结构：
<encoding-type> <element-data> <element-tot-len>
    变长           变长            变长（逆向遍历用）
```

> [!tip]
> listpack 解决了 ziplist 的级联更新问题。ziplist 中每个 entry 保存前一个 entry 的长度，当插入大数据时可能导致后续所有 entry 的 prevlen 都变化（级联更新）。listpack 将长度信息放在 entry 尾部，避免了这个问题。

---

## 三、核心命令与使用模式

> 1. 连接数据库 `redis-cli -h 127.0.0.1 -p 6379`
> 2. 账户验证 `AUTH password`
    
### 3.1 String：最常用但不止于字符串

```bash
# 基础操作
SET key value [EX seconds|PX milliseconds|EXAT timestamp|PXAT milliseconds-timestamp|KEEPTTL] [NX|XX] [GET]
GET key
DEL key
```

```bash
# 原子递增（常用于计数器、限流）
INCR key          # 原子 +1
INCRBY key 100    # 原子 +100
DECR key
INCRBYFLOAT key 0.5
```

```bash
# 位操作（Bitmap）
SETBIT key 7 1           # 设置第 7 位为 1
GETBIT key 7             # 获取第 7 位
BITCOUNT key             # 统计 1 的个数
BITOP AND dest key1 key2 # 位运算
```

```bash
# 分布式锁实现
SET resource_lock my_value NX EX 10  # NX: 不存在才设置，EX: 10秒过期
```

**String 的内部编码：**

| 编码       | 条件             | 说明             |
|----------|----------------|----------------|
| `int`    | 值是整数且能用 8 字节表示 | 直接存数字          |
| `embstr` | 字符串 <= 44 字节   | 嵌入式 SDS，一次内存分配 |
| `raw`    | 字符串 > 44 字节    | 独立 SDS，两次内存分配  |

```bash
# 查看内部编码
OBJECT ENCODING mykey
```

**Bitmap 实战：用户签到系统**

```bash
# 用户 1000 在 2024 年第 100 天签到
SETBIT user:1000:sign:2024 100 1

# 检查某天是否签到
GETBIT user:1000:sign:2024 100

# 统计全年签到次数
BITCOUNT user:1000:sign:2024

# 统计 1-30 天的签到次数
BITCOUNT user:1000:sign:2024 0 3  # 字节范围，0-3 字节 = 0-31 位

# 计算连续签到（使用位运算在客户端处理）
```

### 3.2 Hash：对象存储的最佳选择

```bash
# 基础操作
HSET user:1000 name "张三" age 25 city "北京"
HGET user:1000 name
HGETALL user:1000
HMGET user:1000 name age

# 增量操作
HINCRBY user:1000 visit_count 1

# 获取所有字段/值
HKEYS user:1000
HVALS user:1000
HLEN user:1000
```

**Hash 的编码转换：**

| 编码 | 条件 | 结构 |
|------|------|------|
| `ziplist/listpack` | 字段数 < 512 且所有值 < 64 字节 | 连续内存块 |
| `hashtable` | 超出上述限制 | 标准哈希表 |

```bash
# 配置阈值
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
```

**Hash 实战：购物车**

```bash
# 用户 1000 的购物车
HSET cart:1000 sku:1001 2    # sku 1001 数量 2
HSET cart:1000 sku:1002 1
HINCRBY cart:1000 sku:1001 1  # 增加数量
HDEL cart:1000 sku:1001       # 删除商品
HLEN cart:1000                # 商品种类数
HGETALL cart:1000             # 获取所有商品
```

### 3.3 List：消息队列与时间线

```bash
# 栈操作（LPUSH + LPOP 或 RPUSH + RPOP）
LPUSH mylist a b c    # 列表: c, b, a
LPOP mylist           # 弹出 c

# 队列操作（LPUSH + RPOP）
LPUSH queue job1 job2
RPOP queue

# 阻塞弹出（实现阻塞队列）
BLPOP queue 30        # 阻塞等待 30 秒
BRPOP queue 0         # 永久阻塞

# 范围查询
LRANGE mylist 0 -1    # 获取所有
LRANGE mylist 0 9     # 获取前 10 个（分页）
LTRIM mylist 0 99     # 只保留前 100 个
```

**List 实战：消息队列**

```bash
# 生产者
LPUSH msg_queue "{\"user_id\":1000,\"content\":\"hello\"}"

# 消费者（阻塞模式）
BRPOP msg_queue 0

# 优先队列（使用多个列表）
LPUSH queue:high priority_task
LPUSH queue:normal normal_task
# 消费者先检查 high，再检查 normal
```

### 3.4 Set：去重与集合运算

```bash
# 基础操作
SADD tags:redis "cache" "nosql" "database"
SISMEMBER tags:redis "cache"
SMEMBERS tags:redis
SCARD tags:redis           # 集合大小

# 集合运算（可用于推荐系统）
SINTER user:1000:follows user:1001:follows   # 共同关注
SUNION store:follows                         # 并集
SDIFF user:1000:follows user:1001:follows    # 1000 关注但 1001 没关注的

# 随机操作
SRANDMEMBER tags:redis 3   # 随机取 3 个（不删除）
SPOP tags:redis 1          # 随机弹出 1 个
```

**Set 的编码：**

| 编码 | 条件 |
|------|------|
| `intset` | 元素都是整数且数量 < 512 |
| `hashtable` | 超出上述限制 |

### 3.5 ZSet（Sorted Set）：排行榜与延迟队列

```bash
# 基础操作
ZADD leaderboard 100 "player1" 200 "player2" 150 "player3"
ZRANGE leaderboard 0 -1 WITHSCORES     # 按分数升序
ZREVRANGE leaderboard 0 9 WITHSCORES   # 按分数降序（Top 10）
ZSCORE leaderboard "player1"
ZINCRBY leaderboard 10 "player1"       # 增加分数

# 按分数范围查询
ZRANGEBYSCORE leaderboard 100 200
ZREMRANGEBYSCORE leaderboard 0 99      # 删除低分玩家

# 排名查询
ZRANK leaderboard "player1"            # 升序排名
ZREVRANK leaderboard "player1"         # 降序排名

# 集合运算
ZUNIONSTORE result 2 leaderboard1 leaderboard2 WEIGHTS 1 2
```

**ZSet 实战：游戏排行榜**

```bash
# 添加玩家分数
ZADD game:leaderboard:weekly 1500 "user:1000"
ZADD game:leaderboard:weekly 2300 "user:1001"
ZADD game:leaderboard:weekly 1800 "user:1002"

# 获取 Top 10
ZREVRANGE game:leaderboard:weekly 0 9 WITHSCORES

# 获取用户排名
ZREVRANK game:leaderboard:weekly "user:1000"

# 获取用户附近排名（如前后 5 名）
ZREVRANGEBYRANK game:leaderboard:weekly 5 15

# 清理一周前的数据
ZREMRANGEBYSCORE game:leaderboard:weekly 0 (last_week_max_score
```

**ZSet 实战：延迟队列**

```bash
# 添加延迟任务（score 为执行时间戳）
ZADD delay_queue 1710739200 "task:1001"   # 2024-03-18 执行
ZADD delay_queue 1710825600 "task:1002"   # 2024-03-19 执行

# 消费端轮询（每秒执行）
ZRANGEBYSCORE delay_queue 0 1710739200 LIMIT 0 1
# 如果有返回值，ZREM 删除并执行任务
```

---

## 四、持久化机制：RDB 与 AOF

### 4.1 RDB（Redis Database）：快照持久化

**RDB 触发方式：**

```bash
# 手动触发
SAVE        # 阻塞主线程（不推荐）
BGSAVE      # 后台 fork 子进程生成

# 自动触发配置
save 900 1      # 900 秒内至少 1 次修改
save 300 10     # 300 秒内至少 10 次修改
save 60 10000   # 60 秒内至少 10000 次修改
```

**RDB 执行流程：**

```
1. 执行 BGSAVE
        ↓
2. Redis fork() 子进程（Copy-on-Write）
   ┌─────────────────┬─────────────────┐
   │    父进程        │     子进程       │
   │  继续处理请求     │   生成 RDB 文件  │
   │  写时复制修改页   │   读取内存快照   │
   └─────────────────┴─────────────────┘
        ↓
3. 子进程完成 RDB 写入临时文件
        ↓
4. 原子替换旧 RDB 文件
```

**Copy-on-Write 机制：**

```
fork() 时刻：
父进程内存页: [A][B][C][D]
                   ↓ fork
子进程内存页: [A][B][C][D]  （共享同一物理内存，引用计数+1）

父进程写入页 B 时：
父进程: [A][B'][C][D]  （B' 是新分配的页）
子进程: [A][B][C][D]   （仍然读取原来的 B）

写操作越频繁，COW 开销越大
```

**RDB 文件结构：**

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  "REDIS"    │  RDB_VERSION│  SELECT_DB  │  KEY_VALUE  │   EOF       │
│   5字节      │   4字节      │   变长      │    pairs    │  8字节校验和  │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

KEY_VALUE 对编码：
- 过期时间（可选）
- 值类型（1字节）
- 键（长度编码 + 内容）
- 值（根据类型编码）
```

**RDB 优缺点：**

| 优点 | 缺点 |
|------|------|
| 紧凑，适合备份 | 可能丢失最后一次快照后的数据 |
| 恢复速度快 | 大数据集 fork() 可能耗时 |
| 对性能影响小 | |

### 4.2 AOF（Append Only File）：日志持久化

**AOF 配置：**

```bash
appendonly yes
appendfilename "appendonly.aof"

# 同步策略
appendfsync always      # 每个命令都 sync（最安全，最慢）
appendfsync everysec    # 每秒 sync（推荐，默认）
appendfsync no          # 由 OS 决定（最快，最不安全）

# AOF 重写
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**AOF 重写（Rewrite）：**

```
原 AOF 文件（多次修改同一 key）：
SET counter 0
INCR counter
INCR counter
INCR counter
...（10000 次 INCR）

重写后（只保留最终结果）：
SET counter 10000

重写流程：
1. fork 子进程
2. 子进程遍历当前内存数据，写入新 AOF
3. 父进程继续处理请求，同时将新命令写入 AOF 缓冲区和重写缓冲区
4. 子进程完成后，父进程将重写缓冲区的数据追加到新 AOF
5. 原子替换旧 AOF
```

**AOF 重写源码逻辑：**

```c
// 重写时，直接读取内存中的键值对
int rewriteAppendOnlyFile(char *filename) {
    // 遍历所有数据库
    for (j = 0; j < server.dbnum; j++) {
        // 遍历数据库中的所有键
        while((de = dictNext(di)) != NULL) {
            keystr = dictGetKey(de);
            o = dictGetVal(de);
            
            // 根据类型写入对应的命令
            if (o->type == OBJ_STRING) {
                // 写入 SET 命令
                rewriteStringObject(f, key, o);
            } else if (o->type == OBJ_LIST) {
                // 写入 RPUSH 命令序列
                rewriteListObject(f, key, o);
            }
            // ... 其他类型
        }
    }
}
```

**混合持久化（Redis 4.0+）：**

```bash
aof-use-rdb-preamble yes
```

```
混合 AOF 文件结构：
┌─────────────────┬─────────────────┐
│   RDB 格式头部   │   AOF 格式增量   │
│  （全量数据）     │  （重写后的命令） │
└─────────────────┴─────────────────┘

优势：
- 结合了 RDB 的快速恢复和 AOF 的完整性
- 重写时先写 RDB 格式，后续命令以 AOF 格式追加
```

### 4.3 持久化方案选择

| 方案 | 适用场景 | 数据安全 | 性能 |
|------|----------|----------|------|
| 仅 RDB | 可接受分钟级数据丢失 | ★★☆ | ★★★ |
| 仅 AOF | 不能丢失数据 | ★★★ | ★★☆ |
| RDB + AOF | 生产环境推荐 | ★★★ | ★★☆ |
| 混合持久化 | Redis 4.0+ 推荐 | ★★★ | ★★★ |

---

## 五、高可用架构：主从、哨兵与集群

### 5.1 主从复制（Replication）

**复制架构：**

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Master  │ ──────→ │ Slave 1 │         │ Slave 2 │
│  写+读   │         │   读    │         │   读    │
└─────────┘         └─────────┘         └─────────┘
     ↓
┌─────────┐
│ Slave 3 │
│   读    │
└─────────┘
```

**复制过程：**

```
1. 建立连接
Slave ───── SYNC/PSYNC ─────→ Master

2. 全量同步（首次或复制偏移量太旧）
Master ───── RDB 文件 ─────→ Slave
Master ───── 缓冲区命令 ───→ Slave

3. 增量同步（复制偏移量在缓冲区范围内）
Master ───── 缺失的命令 ───→ Slave

4. 持续复制
Master 每执行一个写命令，异步发送给所有 Slave
```

**PSYNC 2.0 协议（Redis 4.0+）：**

```c
// 部分重同步条件：
// 1. Master 的复制 ID 匹配
// 2. 请求的复制偏移量在 Master 的复制积压缓冲区中

// 复制积压缓冲区（replication backlog）
// 固定大小（默认 1MB），循环缓冲区
// 存储最近传播的写命令
```

**复制相关的配置：**

```bash
# Slave 配置
replicaof 192.168.1.10 6379
masterauth <password>

# 复制行为
replica-read-only yes        # Slave 只读
replica-serve-stale-data yes # 复制中断时是否继续服务

# 磁盘化复制（磁盘 IO 差时关闭）
repl-diskless-sync yes       # 直接通过网络传输 RDB
repl-diskless-sync-delay 5   # 等待多个 Slave 连接
```

### 5.2 哨兵（Sentinel）：自动故障转移

**哨兵架构：**

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│Sentinel1│───→│Sentinel2│←───│Sentinel3│
│  (投票)  │    │  (投票)  │    │  (投票)  │
└────┬────┘    └────┬────┘    └────┬────┘
     └──────────────┼──────────────┘
                    ↓
              ┌─────────┐
              │  Master │ ←── 监控
              └────┬────┘
                   │
         ┌─────────┼─────────┐
         ↓         ↓         ↓
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │ Slave 1 │ │ Slave 2 │ │ Slave 3 │ ←── 监控
    └─────────┘ └─────────┘ └─────────┘
```

**哨兵的核心功能：**

1. **监控**：持续检查 Master 和 Slave 是否正常工作
2. **通知**：通过 API 向管理员或其他应用发送通知
3. **自动故障转移**：Master 故障时，自动将一个 Slave 提升为 Master
4. **配置提供者**：客户端向 Sentinel 询问当前 Master 地址

**故障转移过程：**

```
1. 主观下线（SDOWN）
   单个 Sentinel 认为 Master 不可用（超过 down-after-milliseconds）

2. 客观下线（ODOWN）
   足够多的 Sentinel 同意 Master 不可用（达到 quorum）

3. 选举 Leader Sentinel
   使用 Raft 算法在 Sentinel 之间选举领导者

4. 选择新 Master
   - 过滤掉不健康的 Slave
   - 选择优先级最高的（replica-priority）
   - 选择复制偏移量最大的（数据最新）
   - 选择 Run ID 最小的

5. 提升新 Master
   SLAVEOF NO ONE

6. 重新配置其他 Slave
   SLAVEOF new_master_ip new_master_port

7. 更新配置
   将旧 Master 标记为 Slave（恢复后自动同步）
```

**哨兵配置：**

```bash
# sentinel.conf
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel parallel-syncs mymaster 1
sentinel failover-timeout mymaster 60000
sentinel auth-pass mymaster mypassword
```

### 5.3 集群（Cluster）：水平扩展

**Redis Cluster 架构：**

```
         ┌─────────┐
         │ Client  │
         └────┬────┘
              │
    ┌─────────┼─────────┐
    ↓         ↓         ↓
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Master A│ │ Master B│ │ Master C│  (16384 个槽位)
│ (0-5460)│ │(5461-10922)│(10923-16383)│
└────┬────┘ └────┬────┘ └────┬────┘
     ↓          ↓          ↓
┌─────────┐ ┌─────────┐ ┌─────────┐
│ Slave A1│ │ Slave B1│ │ Slave C1│
└─────────┘ └─────────┘ └─────────┘
```

**哈希槽（Hash Slot）：**

```
CRC16(key) % 16384 = slot

示例：
"user:1000" → CRC16 → 12345 % 16384 = 12345 → 属于 Master C
"user:1001" → CRC16 → 5000 % 16384 = 5000 → 属于 Master B
```

**集群命令：**

```bash
# 创建集群
redis-cli --cluster create \
    192.168.1.11:6379 192.168.1.12:6379 192.168.1.13:6379 \
    192.168.1.14:6379 192.168.1.15:6379 192.168.1.16:6379 \
    --cluster-replicas 1

# 查看集群信息
CLUSTER INFO
CLUSTER NODES

# 槽位操作
CLUSTER ADDSLOTS 0 1 2 ... 5460
CLUSTER DELSLOTS 100
CLUSTER FLUSHSLOTS

# 重新分片
redis-cli --cluster reshard 192.168.1.11:6379
```

**MOVED 和 ASK 重定向：**

```
场景 1：槽位已迁移（MOVED）
Client ── GET key ──→ Node A
Node A ── MOVED 12345 192.168.1.12:6379 ──→ Client
Client ── 更新槽位映射 ──→ 重试请求 Node B

场景 2：槽位正在迁移（ASK）
Client ── GET key ──→ Node A
Node A ── ASKING ──→ Client （提示去目标节点试试）
Client ── ASKING + GET key ──→ Node B
```

**集群的限制：**

1. 只支持单个数据库（默认 0）
2. MGET、MSET 等批量操作要求所有 key 在同一个槽
3. 事务需要所有 key 在同一个槽
4. Lua 脚本需要所有 key 在同一个槽

**解决跨槽操作：**

```bash
# 使用 Hash Tag 强制 key 在同一个槽
{user:1000}:profile
{user:1000}:orders
{user:1000}:cart
# 只有 user:1000 参与计算槽位
```

---

## 六、性能优化与最佳实践

### 6.1 内存优化

**内存分析：**

```bash
# 查看内存使用
INFO memory

# 查看大 key
redis-cli --bigkeys
redis-cli --memkeys

# 详细分析某个 key
MEMORY USAGE myhash
MEMORY DOCTOR
```

**内存优化策略：**

```bash
# 1. 使用 Hash 存储小对象
# 原方案：
SET user:1000:name "张三"
SET user:1000:age 25
# 内存：2 个 key 的开销

# 优化方案：
HSET user:1000 name "张三" age 25
# 内存：1 个 key 的开销，字段共享 key 的元数据

# 2. 合理设置过期时间
EXPIRE session:1000 3600

# 3. 使用 ziplist/listpack 编码的小集合
hash-max-ziplist-entries 512
list-max-ziplist-size -2  # 单个元素不超过 64 字节

# 4. 启用内存淘汰
maxmemory 2gb
maxmemory-policy allkeys-lru  # 常用策略
```

**内存淘汰策略：**

| 策略 | 说明 |
|------|------|
| `noeviction` | 不淘汰，直接返回错误（默认） |
| `allkeys-lru` | 所有 key 中，淘汰最近最少使用 |
| `volatile-lru` | 只在设置了过期时间的 key 中淘汰 LRU |
| `allkeys-random` | 所有 key 中随机淘汰 |
| `volatile-random` | 过期 key 中随机淘汰 |
| `volatile-ttl` | 淘汰即将过期的 key |
| `allkeys-lfu` | 所有 key 中，淘汰使用频率最少（Redis 4.0+） |
| `volatile-lfu` | 过期 key 中，淘汰使用频率最少（Redis 4.0+） |

### 6.2 管道与批量操作

```python
# Python 示例：Pipeline 批量操作
import redis

r = redis.Redis()
pipe = r.pipeline()

# 批量写入
for i in range(10000):
    pipe.set(f"key:{i}", f"value:{i}")
    
# 一次发送所有命令
pipe.execute()

# 对比：逐个发送需要 10000 次网络往返
# Pipeline 只需要 1 次（或几次，如果命令太多）
```

**Lua 脚本原子操作：**

```lua
-- 实现原子扣减库存
local stock = redis.call('GET', KEYS[1])
if tonumber(stock) > 0 then
    redis.call('DECR', KEYS[1])
    return 1  -- 扣减成功
else
    return 0  -- 库存不足
end

-- 调用
-- EVAL "脚本内容" 1 stock:1001
```

### 6.3 缓存设计模式

**Cache Aside（旁路缓存）：**

```
读操作：
1. 先读 Cache
2. Cache 未命中，读 Database
3. 将数据写入 Cache

写操作：
1. 先写 Database
2. 再删 Cache（不是更新 Cache）

为什么删除而不是更新？
- 并发场景下，更新可能导致脏数据
- 懒加载思想，下次读时再加载
```

**缓存穿透、击穿、雪崩：**

```
缓存穿透：查询不存在的数据（绕过缓存直达 DB）
解决：布隆过滤器、缓存空值

缓存击穿：热点 key 过期，大量请求打到 DB
解决：互斥锁、逻辑过期、热点 key 永不过期

缓存雪崩：大量 key 同时过期
解决：随机过期时间、多级缓存、熔断降级
```

**布隆过滤器实现：**

```bash
# Redis 4.0+ 需要安装布隆过滤器模块
# 或者使用 Redisson 客户端实现

# 添加元素
BF.ADD bf_filter user:1000
BF.ADD bf_filter user:1001

# 检查元素可能存在
BF.EXISTS bf_filter user:1000   # 返回 1（可能存在）
BF.EXISTS bf_filter user:9999   # 返回 0（一定不存在）

# 注意：布隆过滤器可能有误判，但不会有漏判
```

### 6.4 慢查询优化

```bash
# 配置慢查询日志
slowlog-log-slower-than 10000    # 超过 10ms 记录
slowlog-max-len 128              # 保留 128 条

# 查看慢查询
SLOWLOG GET 10
SLOWLOG LEN
SLOWLOG RESET
```

**常见慢查询原因：**

1. **大 key 操作**：使用 `UNLINK`（异步删除）替代 `DEL`
2. **大范围操作**：`KEYS *` 改为 `SCAN`
3. **批量操作过大**：控制每次批量数量
4. **复杂聚合**：考虑在客户端聚合或使用 Lua 脚本

```bash
# 使用 SCAN 替代 KEYS
SCAN 0 MATCH user:* COUNT 100

# 使用 UNLINK 替代 DEL（异步删除大 key）
UNLINK big_hash
```

---

## 七、Redis 源码级深度理解

### 7.1 事件循环（Event Loop）

Redis 使用自己实现的事件库 `ae`（Antirez Event）。

```c
// 事件循环主流程
void aeMain(aeEventLoop *eventLoop) {
    eventLoop->stop = 0;
    while (!eventLoop->stop) {
        // 1. 处理 beforesleep 回调
        if (eventLoop->beforesleep != NULL)
            eventLoop->beforesleep(eventLoop);
            
        // 2. 多路复用等待事件
        aeProcessEvents(eventLoop, AE_ALL_EVENTS|AE_CALL_AFTER_SLEEP);
    }
}
```

```c
// aeProcessEvents 核心逻辑
int aeProcessEvents(aeEventLoop *eventLoop, int flags) {
    // 1. 计算最近的定时器事件
    shortest = aeSearchNearestTimer(eventLoop);
    
    // 2. 调用多路复用 API（epoll/kqueue/select）
    numevents = aeApiPoll(eventLoop, tvp);
    
    // 3. 处理文件事件（可读/可写）
    for (j = 0; j < numevents; j++) {
        aeFileEvent *fe = &eventLoop->events[eventLoop->fired[j].fd];
        // 调用读/写回调函数
    }
    
    // 4. 处理时间事件（定时器）
    processTimeEvents(eventLoop);
}
```

### 7.2 命令执行流程

```
Client 发送: SET key value
                    ↓
            读取到 querybuf
                    ↓
            使用 RESP 协议解析
                    ↓
            查找命令表 (lookupCommand)
                    ↓
            执行权限检查
                    ↓
            调用命令处理函数 (call)
                    ↓
            写回响应到 client buf
                    ↓
            添加到 write 队列
                    ↓
            事件循环发送响应
```

**命令表结构：**

```c
struct redisCommand {
    char *name;                     // 命令名
    redisCommandProc *proc;         // 处理函数
    int arity;                      // 参数个数
    char *sflags;                   // 字符串标志
    uint64_t flags;                 // 实际标志位
    redisGetKeysProc *getkeys_proc;
    int firstkey, lastkey, keystep;
    long long microseconds;         // 执行时间统计
    long long calls;                // 调用次数统计
    int id;                         // 命令 ID
};

// 命令标志
#define CMD_READONLY 1      // 只读命令
#define CMD_WRITE 2         // 写命令
#define CMD_DENYOOM 4       // 可能使内存超限
#define CMD_FAST 8          // 快速命令（O(1)）
```

### 7.3 网络模型：RESP 协议

Redis Serialization Protocol（RESP）：

```
简单字符串：+OK\r\n
错误：-ERR unknown command\r\n
整数：:1000\r\n
批量字符串：$6\r\nfoobar\r\n  （$后面是长度）
数组：*2\r\n$3\r\nGET\r\n$3\r\nkey\r\n

示例：SET mykey myvalue
*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$7\r\nmyvalue\r\n
```

---

## 八、生产环境实战案例

### 8.1 案例：电商秒杀系统

**挑战：**
- 高并发下库存扣减的准确性
- 防止超卖
- 流量削峰

**方案：**

```lua
-- 秒杀扣减库存脚本（原子执行）
local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil then
    return -1  -- 商品不存在
end
if stock <= 0 then
    return 0   -- 已售罄
end
if stock < tonumber(ARGV[1]) then
    return -2  -- 库存不足
end
redis.call('DECRBY', KEYS[1], ARGV[1])
return 1       -- 扣减成功
```

```bash
# 系统架构
1. 库存预热：秒杀前将库存加载到 Redis
   SETNX seckill:sku:1001 1000

2. 请求过滤：使用令牌桶或漏桶限流
   CL.THROTTLE user:1000 15 30 60 1

3. 异步下单：扣减成功后发送 MQ，异步创建订单
   LPUSH seckill:orders "{user:1000,sku:1001,qty:1}"

4. 库存回补：订单超时未支付，释放库存
   INCR seckill:sku:1001
```

### 8.2 案例：实时排行榜

```bash
# 全局实时排行榜
ZADD global:rank 1500 "user:1000"
ZADD global:rank 2300 "user:1001"

# 获取 Top 100
ZREVRANGE global:rank 0 99 WITHSCORES

# 获取用户排名（实时计算）
ZREVRANK global:rank "user:1000"

# 获取用户附近的人（如前后 5 名）
ZREVRANGEBYRANK global:rank 5 15

# 周榜/月榜（使用不同的 key，定时归档）
ZADD weekly:rank:2024W10 1500 "user:1000"
EXPIRE weekly:rank:2024W10 604800  # 一周后自动删除
```

### 8.3 案例：分布式锁 RedLock

```bash
# 简单分布式锁（单节点）
SET resource:lock my_random_value NX PX 30000

# 释放锁（使用 Lua 保证原子性）
if redis.call("get",KEYS[1]) == ARGV[1] then
    return redis.call("del",KEYS[1])
else
    return 0
end

# RedLock 算法（多主节点，超过半数获取成功才算成功）
# 1. 获取当前时间戳
# 2. 依次向 N 个独立的 Redis 节点获取锁
# 3. 计算获取锁的总耗时
# 4. 如果成功获取锁的节点数 > N/2，且耗时 < 锁的有效期，则获取成功
# 5. 如果获取失败，向所有节点发送释放锁的命令
```

---

## 九、Redis 生态系统与扩展

### 9.1 Redis 模块

**RedisJSON：**
```bash
# 存储和查询 JSON
JSON.SET user:1000 $ '{"name":"张三","age":25,"tags":["redis","json"]}'
JSON.GET user:1000 $.name
JSON.ARRAPPEND user:1000 $.tags '"mongodb"'
```

**RediSearch：**
```bash
# 全文搜索
FT.CREATE myindex ON HASH PREFIX 1 doc: SCHEMA name TEXT price NUMERIC
FT.ADD myindex doc:1 1.0 FIELDS name "Redis Tutorial" price 29.99
FT.SEARCH myindex "redis"
```

**RedisTimeSeries：**
```bash
# 时序数据
TS.CREATE temperature:room1 RETENTION 86400 LABELS room 1 sensor abc
TS.ADD temperature:room1 1234567890 25.5
TS.RANGE temperature:room1 - + AGGREGATION AVG 3600
```

### 9.2 Redis 与云原生

**Redis Operator（Kubernetes）：**
```yaml
apiVersion: databases.spotahome.com/v1
kind: RedisFailover
metadata:
  name: redis-cluster
spec:
  sentinel:
    replicas: 3
  redis:
    replicas: 3
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 400m
        memory: 512Mi
```

---

## 十、总结与进阶路线

### 10.1 学习路线图

```
Level 1: 基础使用
├── 5 大数据类型的基本操作
├── 持久化配置与选择
└── 简单的缓存应用

Level 2: 进阶使用
├── 主从复制与高可用架构
├── Lua 脚本与事务
├── 性能优化与问题排查
└── 缓存设计模式

Level 3: 深入理解
├── 底层数据结构实现
├── 源码阅读（事件循环、命令执行）
├── 网络协议与通信模型
└── 分布式算法（Raft、Gossip）

Level 4: 生产实战
├── 大规模集群运维
├── 自定义模块开发
├── 内核优化与调优
└── 贡献开源社区
```

### 10.2 关键知识点回顾

| 主题 | 核心要点 |
|------|----------|
| 数据结构 | SDS 优于 C 字符串、跳表实现 ZSet、渐进式 rehash |
| 持久化 | RDB 适合备份恢复、AOF 更适合实时、混合模式最佳 |
| 高可用 | 主从复制 + 哨兵自动故障转移 + 集群水平扩展 |
| 性能 | 单线程避免锁竞争、IO 多路复用、内存操作 |
| 缓存 | Cache Aside 模式、防穿透/击穿/雪崩 |

---

> [!tip]
> **本文学习建议：**
> 1. 先实践基础命令，再理解底层原理
> 2. 结合源码阅读（从简单的 SDS、dict 开始）
> 3. 多在生产环境中踩坑，积累经验
> 4. 关注 Redis 官方博客和新版本特性

**参考资料：**
- [Redis 官方文档](https://redis.io/documentation)
- [Redis 设计与实现](http://redisbook.com/)
- [Redis 源码](https://github.com/redis/redis)
- [Redis 命令参考](http://redisdoc.com/)

**相关文章：**
- [Kafka 深度剖析：高吞吐消息队列的实现原理](/blog/middleware/kafka-deep-dive)
- [MongoDB 实战：文档数据库的设计与优化](/blog/middleware/mongodb-practice)
