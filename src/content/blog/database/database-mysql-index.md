---
title: "MySQL 索引深度剖析：从 B+ 树原理到生产级优化实践"
pubDate: 2024-01-15
description: "深入 InnoDB 索引底层实现，剖析页分裂、锁竞争、覆盖索引等高阶原理，结合生产环境复杂案例分析索引设计陷阱与调优策略"
tags: ["MySQL", "数据库", "索引", "性能优化"]
#coverImage: "/images/mysql-index-cover.jpg"
readingTime: 45
pinned: true

# 系列文章
series:
  name: "MySQL 核心"
  order: 2
---

## 一、InnoDB 索引页物理结构深度解析

### 1.1 数据页（Page）的 16KB 布局

InnoDB 的最小存储单元是页（默认 16KB），理解页的物理结构是索引优化的基础。

```
┌─────────────────────────────────────────────────────────────┐
│  File Header (38 bytes)                                     │
│  ├─ FIL_PAGE_SPACE: 表空间 ID                               │
│  ├─ FIL_PAGE_OFFSET: 页号（4 字节，最大 2^32 页 ≈ 64TB）     │
│  ├─ FIL_PAGE_PREV: 上一页指针（双向链表）                    │
│  ├─ FIL_PAGE_NEXT: 下一页指针                               │
│  └─ FIL_PAGE_LSN: 最后修改的 LSN（用于 Recovery）           │
├─────────────────────────────────────────────────────────────┤
│  Page Header (56 bytes)                                     │
│  ├─ PAGE_N_DIR_SLOTS: Page Directory 槽位数                 │
│  ├─ PAGE_HEAP_TOP: 堆顶位置（空闲空间起始）                  │
│  ├─ PAGE_N_HEAP: 记录数（含已删除）                         │
│  ├─ PAGE_FREE: 删除记录链表头                                │
│  ├─ PAGE_GARBAGE: 删除记录总字节数（碎片）                   │
│  ├─ PAGE_N_RECS: 实际记录数                                 │
│  ├─ PAGE_MAX_TRX_ID: 最大事务 ID（二级索引）                 │
│  ├─ PAGE_LEVEL: B+ 树层级（0 表示叶子页）                    │
│  └─ PAGE_INDEX_ID: 索引 ID                                  │
├─────────────────────────────────────────────────────────────┤
│  Infimum Record (13 bytes) - 最小虚拟记录                    │
├─────────────────────────────────────────────────────────────┤
│  Supremum Record (13 bytes) - 最大虚拟记录                   │
├─────────────────────────────────────────────────────────────┤
│  User Records - 用户记录（按主键排序的链表）                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Record Header (5 bytes)                             │    │
│  │ ├─ delete_mask (1 bit): 是否已删除                  │    │
│  │ ├─ min_rec_mask (1 bit): B+ 树非叶子节点最小记录    │    │
│  │ ├─ n_owned (4 bits): 该组拥有的记录数               │    │
│  │ ├─ heap_no (13 bits): 堆中位置（0=Infimum,1=Supremum）│   │
│  │ ├─ record_type (3 bits): 0=普通,1=非叶子节点,2=Infimum,3=Supremum │
│  │ └─ next_record (16 bits): 下一条记录偏移量          │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │ [Row Data]                                          │    │
│  │ ├─ 变长字段长度列表（逆序）                          │    │
│  │ ├─ NULL 值列表（逆序）                               │    │
│  │ ├─ 记录头信息（5 bytes，如上）                       │    │
│  │ ├─ Row ID (6 bytes, 隐藏主键)                        │    │
│  │ ├─ Transaction ID (6 bytes)                         │    │
│  │ ├─ Roll Pointer (7 bytes) → undo log                │    │
│  │ └─ 实际列数据                                        │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│  Free Space - 空闲空间                                      │
├─────────────────────────────────────────────────────────────┤
│  Page Directory - 页目录（稀疏索引）                         │
│  ├─ 每个槽（slot）2 字节，指向组内最大记录的偏移              │
│  ├─ 默认每组 4-8 条记录，二分查找定位组                       │
│  └─ 槽数量 ≈ 记录数 / 4                                     │
├─────────────────────────────────────────────────────────────┤
│  File Trailer (8 bytes)                                     │
│  ├─ 旧校验和（4 bytes，兼容老版本）                          │
│  └─ 新校验和（4 bytes，CRC32）                               │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 页内记录的存储格式

InnoDB 使用 **Compact Row Format**（默认），理解其存储格式对索引设计至关重要：

```sql
-- 创建一个示例表
CREATE TABLE user (
    id BIGINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    age TINYINT,
    created_at DATETIME
) ENGINE=InnoDB ROW_FORMAT=COMPACT;
```

一条记录的物理存储：

```
┌─────────────────────────────────────────────────────────────┐
│  变长字段长度列表（逆序存储）                                │
│  ├─ email 长度（假设 16）: 0x10                             │
│  ├─ name 长度（假设 8）: 0x08                               │
│  └─ 变长字段数 = 所有 VARCHAR/TEXT/BLOB 字段               │
├─────────────────────────────────────────────────────────────┤
│  NULL 值位图（逆序，每列 1 bit）                            │
│  ├─ bit 0: id (NOT NULL) → 0                               │
│  ├─ bit 1: name (NOT NULL) → 0                             │
│  ├─ bit 2: email → 1 (NULL) 或 0 (NOT NULL)                │
│  ├─ bit 3: age → 1 (NULL) 或 0 (NOT NULL)                  │
│  └─ bit 4: created_at → 1 (NULL) 或 0 (NOT NULL)           │
├─────────────────────────────────────────────────────────────┤
│  记录头信息（5 bytes）                                       │
├─────────────────────────────────────────────────────────────┤
│  隐藏列                                                      │
│  ├─ DB_ROW_ID (6 bytes): 无主键时生成                       │
│  ├─ DB_TRX_ID (6 bytes): 最后修改的事务 ID                   │
│  └─ DB_ROLL_PTR (7 bytes): 回滚指针 → undo 记录              │
├─────────────────────────────────────────────────────────────┤
│  实际列数据（按定义顺序）                                    │
│  ├─ id (8 bytes BIGINT)                                     │
│  ├─ name (8 bytes VARCHAR)                                  │
│  ├─ email (16 bytes VARCHAR 或不存在如果是 NULL)             │
│  ├─ age (1 byte TINYINT 或不存在如果是 NULL)                 │
│  └─ created_at (5 bytes DATETIME 或不存在)                   │
└─────────────────────────────────────────────────────────────┘
```

**关键洞察：**
- `NULL` 值不占用数据空间（除了 NULL 位图的 1 bit），但会占用记录头的空间
- 变长字段长度列表只存在于实际有变长字段的表中
- 每行记录至少有 27 bytes 的额外开销（5 + 6 + 6 + 7 + 可能 3 bytes 变长列表）

### 1.3 页目录（Page Directory）的二分查找机制

页内查找不是线性扫描，而是通过 Page Directory 实现近似二分查找：

```
记录链表（按主键排序）:

Infimum → R1 → R2 → R3 → R4 → R5 → R6 → R7 → R8 → Supremum

Page Directory（槽数组）:
┌─────┬─────┬─────┐
│  S0 │  S1 │  S2 │
└─────┴─────┴─────┘
   ↓     ↓     ↓
  Infimum  R4    R8  (每组最大记录)

查找 R6 的过程:
1. 二分查找 Page Directory: S0=Infimum < R6 < S2=R8 → 落在 S1 组
2. 从 S1 指向的 R4 开始线性扫描: R4 → R5 → R6 (找到)

时间复杂度: O(log(n/4)) + O(4) ≈ O(log n)
```

槽的数量计算公式：
```
slot_count = (n_recs + 8 - 1) / 4  // 向上取整，每组最多 8 条
```

---

## 二、B+ 树索引的深层机制

### 2.1 索引页的分裂（Page Split）机制

当页满（16KB 用完）时发生页分裂，这是索引性能退化的主要原因。

**分裂过程详解：**

```
分裂前（16KB 已满）:
[1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]

插入 16（中间位置插入）：

1. 申请新的空页（Page B）
2. 计算分裂点（约 50% 处）
3. 将 [17, 19, 21, 23, 25, 27, 29, 31] 移动到新页
4. 插入 16 到原页
5. 更新双向链表指针

分裂后:
Page A: [1, 3, 5, 7, 9, 11, 13, 15, 16]  →→  Page B: [17, 19, 21, 23, 25, 27, 29, 31]

6. 向上层父节点插入指向 Page B 的索引项（key=17, page_no=B）
```

**页分裂的代价：**
1. **I/O 成本**：申请新页、写入旧页、写入新页、更新父节点（至少 4 次 I/O）
2. **锁竞争**：分裂期间需要持有页级锁，影响并发
3. **空间碎片**：页不再满，空间利用率下降（通常降至 50%）
4. **树高度增加**：频繁分裂可能导致树高度增加

**监控页分裂：**

```sql
-- 查看页分裂次数
SHOW STATUS LIKE 'Innodb_pages_%';

-- 更详细的统计（MySQL 8.0）
SELECT 
    event_name,
    count_star,
    sum_timer_wait/1000000000000 as wait_ms
FROM performance_schema.events_waits_summary_global_by_event_name
WHERE event_name LIKE '%innodb%page%';
```

**减少页分裂的策略：**

```sql
-- 1. 使用自增主键（顺序插入，只在页尾追加）
CREATE TABLE t (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ...
);

-- 2. 预留页空间（FILLFACTOR 概念，MySQL 不支持，但可通过预插入实现）
-- 对于已知会有大量插入的表，可预先插入一些占位数据后删除

-- 3. 避免随机主键（如 UUID）
-- 坏：UUID 导致随机插入，频繁页分裂
-- 好：使用 AUTO_INCREMENT 或时间戳+自增组合

-- 4. 调整页大小（较少用，需重建实例）
-- 对于纯读表，可以使用更大的页（32KB/64KB）减少树高度
```

### 2.2 索引的并发控制：锁与索引的关系

InnoDB 的锁是基于索引的，理解这一点对排查死锁和性能问题至关重要。

**锁的类型与索引的关系：**

```sql
-- 表结构
CREATE TABLE accounts (
    id INT PRIMARY KEY,
    user_id INT UNIQUE,
    balance DECIMAL(10,2),
    status TINYINT,
    INDEX idx_status (status)
);

-- 案例 1: 主键查询加锁
SELECT * FROM accounts WHERE id = 100 FOR UPDATE;
-- 只在聚簇索引（主键索引）的 id=100 记录上加 X 锁

-- 案例 2: 唯一索引查询加锁
SELECT * FROM accounts WHERE user_id = 1000 FOR UPDATE;
-- 1. 在二级索引 idx_user_id 的 user_id=1000 记录上加 X 锁
-- 2. 回表到聚簇索引，对 id=? 的记录加 X 锁
-- 共持有 2 个锁

-- 案例 3: 非唯一索引查询加锁
SELECT * FROM accounts WHERE status = 1 FOR UPDATE;
-- 1. 在 idx_status 的 status=1 的所有记录上加 X 锁（可能有多个）
-- 2. 对每个匹配的记录，回表到聚簇索引加 X 锁
-- 3. 同时，为了防止幻读，还会在间隙加 Gap 锁
```

**间隙锁（Gap Lock）与索引：**

```sql
-- 事务 A
BEGIN;
SELECT * FROM accounts WHERE id > 100 AND id < 200 FOR UPDATE;

-- 锁的范围：
-- 1. 对 id ∈ (100, 200) 的所有记录加 X 锁
-- 2. 对间隙 (100, next_record) 和 (prev_record, 200) 加 Gap Lock
-- 3. 阻止其他事务在 (100, 200) 范围内插入新记录

-- 事务 B（阻塞）
INSERT INTO accounts (id, ...) VALUES (150, ...); -- 等待事务 A 释放间隙锁
```

**Next-Key Lock = Record Lock + Gap Lock**

```
索引记录: [10] [20] [30] [40]

Next-Key Lock on 20 覆盖范围:
(-∞, 10] [10, 20] (20, 30]
         ↑ 锁定这个区间

实际锁定的范围：(10, 20] 左开右闭
```

**死锁案例分析：**

```sql
-- 表: CREATE TABLE t (id INT PRIMARY KEY, a INT, b INT, INDEX idx_a(a));
-- 数据: (1, 1, 1), (2, 2, 2), (3, 3, 3)

-- 事务 A                    -- 事务 B
BEGIN;                      BEGIN;
DELETE FROM t WHERE a = 1;  DELETE FROM t WHERE a = 2;
-- 锁住 idx_a 的 a=1 记录   -- 锁住 idx_a 的 a=2 记录
-- 锁住 id=1 的聚簇索引     -- 锁住 id=2 的聚簇索引

UPDATE t SET b = 100        UPDATE t SET b = 200
WHERE id = 2;               WHERE id = 1;
-- 等待事务 B 释放 id=2 锁   -- 等待事务 A 释放 id=1 锁
-- ↓ 死锁发生 ↓
```

**锁优化的关键：**
1. **索引设计影响锁粒度**：WHERE 条件走索引时只锁匹配行；全表扫描会锁所有扫描过的行
2. **减少二级索引回表**：使用覆盖索引可以减少需要加锁的行数
3. **主键顺序访问**：按主键顺序操作可以减少死锁概率

### 2.3 覆盖索引（Covering Index）的深层原理

覆盖索引不仅仅是 "避免回表" 这么简单，它还能显著减少锁竞争。

```sql
-- 表结构
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id INT,
    order_no VARCHAR(32),
    status TINYINT,
    amount DECIMAL(10,2),
    created_at DATETIME,
    INDEX idx_user_status (user_id, status, created_at)
);

-- 非覆盖索引查询
SELECT * FROM orders WHERE user_id = 100 AND status = 1;
-- 执行过程：
-- 1. 在 idx_user_status 找到匹配记录
-- 2. 对每条记录，通过主键回表获取完整数据
-- 3. 总共访问：N 个二级索引页 + N 个聚簇索引页

-- 覆盖索引查询
SELECT user_id, status, created_at FROM orders 
WHERE user_id = 100 AND status = 1;
-- 执行过程：
-- 1. 在 idx_user_status 找到匹配记录
-- 2. 直接返回索引中的数据
-- 3. 总共访问：N 个二级索引页（可能 1-2 个页）
```

**覆盖索引的性能优势量化：**

| 指标 | 非覆盖索引 | 覆盖索引 | 提升倍数 |
|------|-----------|----------|----------|
| 页访问次数 | 2N ~ 3N | N/10 ~ N | 10x+ |
| I/O 次数 | 高（随机 I/O） | 极低（顺序 I/O） | 100x+ |
| 锁持有数量 | 2N（二级+聚簇） | N（仅二级） | 2x |
| CPU 消耗 | 高（解析行数据） | 低（直接返回） | 3x+ |

**设计高效覆盖索引的策略：**

```sql
-- 策略 1: 查询列全部包含在索引中
-- 原索引
CREATE INDEX idx_user ON orders(user_id);
-- 查询
SELECT user_id, status, created_at FROM orders WHERE user_id = ?;
-- 需要回表获取 status 和 created_at

-- 优化后（覆盖索引）
CREATE INDEX idx_user_status_ctime ON orders(user_id, status, created_at);
-- 完全覆盖查询，无需回表

-- 策略 2: 利用最左前缀原则的覆盖索引
-- 索引: (a, b, c)
-- 覆盖查询: SELECT a, b FROM t WHERE a = ?
-- 不覆盖: SELECT a, b, d FROM t WHERE a = ? (d 不在索引中)

-- 策略 3: 延迟关联（Deferred Join）优化深分页
-- 原查询（深分页性能差）
SELECT * FROM orders 
WHERE status = 1 
ORDER BY created_at DESC 
LIMIT 1000000, 10;

-- 优化：先覆盖索引查出 ID，再关联
SELECT o.* 
FROM orders o
JOIN (
    SELECT id FROM orders 
    WHERE status = 1 
    ORDER BY created_at DESC 
    LIMIT 1000000, 10
) tmp ON o.id = tmp.id;
-- 子查询使用覆盖索引 idx_status_ctime(id)，只扫描索引
-- 大幅减少 I/O
```

---

## 三、复合索引的高阶设计技巧

### 3.1 索引列顺序的科学决策

复合索引的列顺序不是随意的，需要基于 **选择性（Cardinality）** 和 **查询模式** 科学决策。

```sql
-- 假设表结构
CREATE TABLE logs (
    id BIGINT PRIMARY KEY,
    app_id INT,           -- 100 个不同值
    level TINYINT,        -- 5 个不同值 (DEBUG/INFO/WARN/ERROR/FATAL)
    user_id INT,          -- 1000000 个不同值
    created_at DATETIME,
    message TEXT
);

-- 问题：如何设计 (app_id, level, user_id) 的索引顺序？
```

**错误的设计：**

```sql
-- 顺序：区分度低的在前
CREATE INDEX idx_wrong ON logs(level, app_id, user_id);

-- 查询: WHERE app_id = 5 AND level = 3
-- 只能用到 level 列，app_id 无法使用（违反最左前缀）
```

**科学的设计方法：**

```sql
-- 步骤 1: 计算各列选择性
SELECT 
    COUNT(DISTINCT app_id) / COUNT(*) as app_id_sel,
    COUNT(DISTINCT level) / COUNT(*) as level_sel,
    COUNT(DISTINCT user_id) / COUNT(*) as user_id_sel,
    COUNT(*)
FROM logs;
-- 结果: app_id_sel = 0.0001, level_sel = 0.0000005, user_id_sel = 1

-- 步骤 2: 分析查询模式
-- Q1: WHERE app_id = ? AND user_id = ? (最频繁)
-- Q2: WHERE app_id = ? AND level = ? ORDER BY created_at
-- Q3: WHERE user_id = ?

-- 步骤 3: 设计索引
-- 对于 Q1：CREATE INDEX idx_app_user ON logs(app_id, user_id, created_at);
-- 对于 Q2：CREATE INDEX idx_app_level_ctime ON logs(app_id, level, created_at);
-- 对于 Q3：CREATE INDEX idx_user ON logs(user_id);

-- 步骤 4: 合并索引（减少索引数量）
-- 观察：Q1 和 Q2 都用到 app_id，可以合并
CREATE INDEX idx_optimal ON logs(app_id, level, user_id, created_at);

-- 验证各查询是否能使用该索引：
-- Q1: WHERE app_id = ? AND user_id = ? → 使用 app_id（等值），跳过 level，user_id（等值）✓
-- Q2: WHERE app_id = ? AND level = ? ORDER BY created_at → 完美匹配 ✓
-- Q3: WHERE user_id = ? → 无法使用（缺少最左列 app_id）✗
-- 需要额外索引：CREATE INDEX idx_user ON logs(user_id);
```

**进阶技巧：索引的 "跳跃扫描"（Index Skip Scan）**

MySQL 8.0.13+ 支持松散索引扫描，允许跳过最左前缀：

```sql
-- 索引: INDEX (a, b)
-- 查询: WHERE b = 2

-- MySQL 8.0.13+ 会自动优化为：
-- 1. 找出所有不同的 a 值
-- 2. 对每个 a 值，执行 WHERE a = ? AND b = 2
-- 3. 合并结果

-- 查看执行计划
EXPLAIN SELECT * FROM t WHERE b = 2;
-- Extra: Using index for skip scan
```

### 3.2 范围查询与等值查询的索引设计

范围查询（`>`、`<`、`BETWEEN`、`LIKE 'prefix%'`）会阻断其后的列使用索引。

```sql
-- 表结构
CREATE TABLE products (
    id INT PRIMARY KEY,
    category_id INT,
    price DECIMAL(10,2),
    brand_id INT,
    status TINYINT,
    INDEX idx_cat_price_brand (category_id, price, brand_id)
);

-- 查询 1：范围查询在中间
SELECT * FROM products 
WHERE category_id = 1 
  AND price BETWEEN 100 AND 200 
  AND brand_id = 5;

-- 索引使用情况：
-- category_id: 等值匹配 ✓
-- price: 范围匹配 ✓
-- brand_id: 无法使用索引 ✗（被范围查询阻断）

-- 优化方案 1：调整列顺序，等值查询在前
DROP INDEX idx_cat_price_brand ON products;
CREATE INDEX idx_cat_brand_price ON products(category_id, brand_id, price);

-- 现在：
-- category_id: 等值 ✓
-- brand_id: 等值 ✓
-- price: 范围 ✓（最后）

-- 优化方案 2：如果 price 范围查询和高选择性 brand_id 组合频繁，考虑冗余索引
CREATE INDEX idx_cat_price ON products(category_id, price);  -- 用于纯价格筛选
CREATE INDEX idx_cat_brand_price ON products(category_id, brand_id, price);  -- 用于品牌+价格筛选
```

**IN 查询的特殊处理：**

```sql
-- 索引: (a, b)

-- IN 等值查询 - 可以使用 b
SELECT * FROM t WHERE a IN (1, 2, 3) AND b = 4;
-- 执行方式：分别执行 (a=1 AND b=4) OR (a=2 AND b=4) OR (a=3 AND b=4)
-- 都可以使用 b

-- 但 IN 元素过多会退化为范围扫描
SELECT * FROM t WHERE a IN (1, 2, ..., 1000) AND b = 4;
-- 可能只使用 a，b 无法使用
```

### 3.3 排序与分组的索引优化

索引不仅可以加速 WHERE，还可以消除排序（Using filesort）和临时表。

```sql
-- 表结构
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id INT,
    status TINYINT,
    amount DECIMAL(10,2),
    created_at DATETIME,
    INDEX idx_user_status_ctime (user_id, status, created_at)
);

-- 案例 1: ORDER BY 优化
SELECT * FROM orders 
WHERE user_id = 100 
ORDER BY created_at DESC 
LIMIT 10;

-- 没有合适索引时：Using where; Using filesort（内存排序，数据量大时创建临时表）
-- 有 idx_user_status_ctime 时：Using index condition（直接使用索引顺序）

-- 关键点：ORDER BY 列必须紧跟在 WHERE 等值条件列之后
-- 索引: (user_id, status, created_at)
-- WHERE user_id = ? ORDER BY created_at → 无法使用索引排序（status 在中间）
-- WHERE user_id = ? AND status = ? ORDER BY created_at → 可以使用索引排序 ✓

-- 案例 2: 多列排序
SELECT * FROM orders 
WHERE user_id = 100 
ORDER BY status ASC, created_at DESC;

-- 索引: (user_id, status, created_at)
-- 结果：Using filesort（排序方向不一致）

-- 优化：创建反向索引（MySQL 8.0 支持 DESC 索引）
CREATE INDEX idx_user_status_ctime_desc ON orders(user_id, status, created_at DESC);
-- 或使用：
CREATE INDEX idx_user_status_desc_ctime_desc ON orders(user_id, status DESC, created_at DESC);

-- 案例 3: GROUP BY 优化
SELECT status, COUNT(*) FROM orders 
WHERE user_id = 100 
GROUP BY status;

-- 有索引 (user_id, status) 时：
-- 按索引顺序扫描 user_id=100 的所有记录，status 已经是有序的
-- 无需临时表：Using index for group-by
```

**索引与排序的最佳实践：**

```sql
-- 设计索引时同时考虑 WHERE、ORDER BY、GROUP BY

-- 查询模式：
-- SELECT * FROM orders 
-- WHERE user_id = ? AND status = ? 
-- ORDER BY created_at DESC 
-- LIMIT ?

-- 最佳索引：
CREATE INDEX idx_optimal ON orders(user_id, status, created_at DESC);

-- 验证：
EXPLAIN SELECT * FROM orders 
WHERE user_id = 100 AND status = 1 
ORDER BY created_at DESC 
LIMIT 10;
-- Extra: Using index condition（无 filesort）
```

---

## 四、生产环境索引问题诊断与调优

### 4.1 索引失效的深层原因分析

索引失效不仅限于 "对列做函数操作"，还有很多隐藏陷阱。

```sql
-- 陷阱 1: 隐式字符集转换
-- 表: name VARCHAR(50) CHARACTER SET utf8mb4
SELECT * FROM users WHERE name = '张三';
-- 如果连接字符集是 latin1，会发生隐式转换，导致索引失效

-- 陷阱 2: 多表 JOIN 的字符集/排序规则不一致
-- table_a.name utf8mb4_general_ci
-- table_b.name utf8mb4_unicode_ci
SELECT * FROM table_a JOIN table_b ON table_a.name = table_b.name;
-- 会发生字符集转换，索引失效

-- 陷阱 3: 数据类型隐式转换（不止是字符串 vs 数字）
-- 表: id VARCHAR(20)
SELECT * FROM t WHERE id = 123;
-- 实际执行: WHERE CAST(id AS SIGNED) = 123，索引失效

-- 陷阱 4: NOT IN 和 <> 的优化器选择
SELECT * FROM orders WHERE status != 0;
-- 如果 status 只有 0 和 1，且数据分布 1:1，优化器可能选择全表扫描

-- 陷阱 5: 日期范围的边界问题
SELECT * FROM logs WHERE DATE(created_at) = '2024-01-15';
-- 优化：
SELECT * FROM logs 
WHERE created_at >= '2024-01-15 00:00:00' 
  AND created_at < '2024-01-16 00:00:00';

-- 陷阱 6: 前缀索引与排序
CREATE INDEX idx_name_prefix ON users(name(10));
SELECT * FROM users WHERE name LIKE '张%' ORDER BY name;
-- 虽然可以用索引过滤，但 ORDER BY 需要全排序（Using filesort）
-- 因为前缀索引不知道第 11 位之后的内容
```

### 4.2 索引选择性陷阱与解决

```sql
-- 问题：status 字段只有 0 和 1，但 99% 是 1，查询 WHERE status = 0
-- 索引 idx_status 的选择性很低（0.5），但实际查询时选择性很高（status=0 的记录很少）

-- 解决方案 1: 组合索引（低选择性 + 高选择性）
CREATE INDEX idx_status_created_at ON orders(status, created_at);

-- 解决方案 2: 条件索引（MySQL 不支持，但可用虚拟列变通）
-- 创建虚拟列标记需要查询的数据
ALTER TABLE orders ADD COLUMN is_pending TINYINT 
    GENERATED ALWAYS AS (CASE WHEN status = 0 THEN 1 ELSE NULL END) STORED;
CREATE INDEX idx_is_pending ON orders(is_pending);
-- 查询: WHERE is_pending = 1

-- 解决方案 3: 分区表
-- 按 status 分区，status=0 的数据在一个小分区中
```

### 4.3 深分页问题的终极解决方案

深分页是生产环境的经典性能问题。

```sql
-- 问题查询（百万级数据深分页）
SELECT * FROM orders 
WHERE status = 1 
ORDER BY created_at DESC 
LIMIT 1000000, 10;
-- 需要扫描 1000010 行，然后丢弃前 1000000 行
```

**方案 1: 游标分页（推荐）**

```sql
-- 上一页最后一条记录的 created_at 和 id
SELECT * FROM orders 
WHERE status = 1 
  AND (created_at < '2024-01-15 10:00:00' 
       OR (created_at = '2024-01-15 10:00:00' AND id < 123456))
ORDER BY created_at DESC, id DESC
LIMIT 10;

-- 索引: INDEX (status, created_at, id)
-- 优势：O(log n) 时间复杂度，与页码无关
-- 劣势：不支持跳转到任意页
```

**方案 2: 延迟关联 + 覆盖索引**

```sql
SELECT o.* 
FROM orders o
INNER JOIN (
    SELECT id FROM orders 
    WHERE status = 1 
    ORDER BY created_at DESC 
    LIMIT 1000000, 10
) tmp ON o.id = tmp.id;

-- 子查询只用覆盖索引 idx_status_ctime_id，在索引中完成排序和分页
-- 只需回表 10 次
```

**方案 3: 预估分页（业务妥协）**

```sql
-- 对于超大数据量的 "跳到第 10000 页" 需求，改为估算
SELECT COUNT(*) FROM orders WHERE status = 1; -- 假设 1000 万
-- 第 10000 页 ≈ id > (1000万 / 每页10条 * 偏移) 的位置
-- 或者使用 ES 等搜索引擎处理翻页
```

### 4.4 索引冗余与重复索引识别

```sql
-- 查看表的索引
SHOW INDEX FROM orders;

-- 冗余索引案例：
-- INDEX idx_a (a)
-- INDEX idx_ab (a, b)
-- idx_a 是冗余的，因为 idx_ab 可以替代它

-- 查找重复索引的查询
SELECT 
    t.table_schema,
    t.table_name,
    t.index_name,
    GROUP_CONCAT(t.column_name ORDER BY t.seq_in_index) AS columns
FROM information_schema.statistics t
WHERE t.table_schema = 'your_database'
GROUP BY t.table_schema, t.table_name, t.index_name;

-- 使用 pt-duplicate-key-checker 工具（Percona Toolkit）
pt-duplicate-key-checker --host=localhost --user=root --password=xxx --database=your_db

-- 查找未使用的索引（MySQL 8.0）
SELECT 
    object_schema,
    object_name,
    index_name
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL 
    AND count_star = 0 
    AND object_schema NOT IN ('mysql', 'performance_schema', 'sys')
ORDER BY object_schema, object_name;
```

---

## 五、InnoDB 索引的高阶特性

### 5.1 自适应哈希索引（Adaptive Hash Index, AHI）

InnoDB 在内存中维护了一个哈希表，用于加速等值查询。

```sql
-- 查看 AHI 状态
SHOW ENGINE INNODB STATUS\G
-- -------------------------------------
-- INSERT BUFFER AND ADAPTIVE HASH INDEX
-- -------------------------------------
-- Hash table size 2267, node heap has 1 buffer(s)
-- Hash table size 2267, node heap has 1 buffer(s)
-- ...
-- 0.00 hash searches/s, 0.00 non-hash searches/s

-- AHI 命中率 = hash searches / (hash searches + non-hash searches)
-- 如果命中率 > 90%，说明 AHI 很有效
```

**AHI 的工作机制：**
1. 监控 B+ 树索引的查询模式
2. 如果发现某些页被频繁以等值方式访问，为这些页构建哈希索引
3. 下次等值查询时，先查 AHI，直接定位到页

**AHI 的局限：**
- 只支持等值查询（=）
- 不适用于范围查询
- 高并发写入时可能成为瓶颈（需要维护哈希表）

```sql
-- 关闭 AHI（如果 CPU 成为瓶颈且写入很多）
SET GLOBAL innodb_adaptive_hash_index = OFF;
```

### 5.2  change Buffer 与二级索引

change Buffer 是 InnoDB 的写优化机制，专门针对二级索引。

```sql
-- 查看 change buffer 状态
SHOW VARIABLES LIKE 'innodb_change_buffer%';
-- innodb_change_buffer_max_size = 25 （占缓冲池的 25%）
-- innodb_change_buffering = all （INSERT/DELETE/UPDATE 都缓冲）
```

**change Buffer 原理：**
1. 对于二级索引的 INSERT/UPDATE/DELETE，如果对应的数据页不在内存中
2. 不立即读取磁盘页，而是将变更记录在 change Buffer 中
3. 当该页被读入内存时（或后台 merge 线程），合并 change Buffer 中的变更
4. 大幅减少随机 I/O

**change Buffer 的收益：**
- 写密集型负载下可提升 2-5 倍写入性能
- 特别适合二级索引很多的表

**change Buffer 的代价：**
- 增加内存消耗（需要存储变更记录）
- 读取时需要额外检查 change Buffer（CPU 开销）
- 崩溃恢复时间更长（需要 merge change buffer）

### 5.3 索引的在线 DDL（Online DDL）

MySQL 5.6+ 支持在线索引操作，避免锁表。

```sql
-- MySQL 5.5: 创建索引会锁表（COPY 算法）
ALTER TABLE orders ADD INDEX idx_test (user_id); -- 阻塞读写

-- MySQL 5.6+: 在线 DDL（INPLACE 算法）
ALTER TABLE orders ADD INDEX idx_test (user_id), ALGORITHM=INPLACE, LOCK=NONE;
-- 允许并发读写

-- 查看 DDL 进度（MySQL 8.0）
SELECT * FROM performance_schema.events_stages_current 
WHERE EVENT_NAME LIKE '%alter%';

-- pt-online-schema-change（Percona Toolkit，适用于所有版本）
pt-online-schema-change \
    --alter "ADD INDEX idx_test (user_id)" \
    --execute \
    --max-load Threads_running=25 \
    --critical-load Threads_running=50 \
    --chunk-size=1000 \
    D=your_db,t=orders
```

---

## 六、实战案例：从慢查询到索引优化

### 6.1 案例：电商订单查询优化

**背景：**
```sql
CREATE TABLE orders (
    id BIGINT PRIMARY KEY,
    user_id INT NOT NULL,
    status TINYINT NOT NULL,  -- 0=待支付, 1=已支付, 2=已发货, 3=已完成
    pay_status TINYINT,       -- 支付状态
    created_at DATETIME NOT NULL,
    updated_at DATETIME,
    amount DECIMAL(10,2),
    -- 其他字段...
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_ctime (created_at)
);

-- 慢查询（平均 5 秒）
SELECT * FROM orders 
WHERE user_id = 12345 
  AND status IN (0, 1)
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC 
LIMIT 20;
```

**问题分析：**
```sql
EXPLAIN SELECT * FROM orders 
WHERE user_id = 12345 
  AND status IN (0, 1)
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC 
LIMIT 20;

-- 结果：
-- type: ref
-- key: idx_user
-- rows: 50000  （用户有 5 万订单）
-- Extra: Using where; Using filesort
-- 问题：只用了 idx_user，然后在内存中过滤和排序
```

**优化方案：**

```sql
-- 步骤 1: 创建复合索引
CREATE INDEX idx_user_status_ctime ON orders(user_id, status, created_at);

-- 验证
EXPLAIN SELECT * FROM orders 
WHERE user_id = 12345 
  AND status IN (0, 1)
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC 
LIMIT 20;

-- 结果：
-- type: range
-- key: idx_user_status_ctime
-- rows: 1000
-- Extra: Using index condition（无 filesort）
-- 查询时间：50ms
```

**进一步优化（覆盖索引）：**

```sql
-- 如果业务只需要部分字段
SELECT id, user_id, status, created_at, amount FROM orders 
WHERE user_id = 12345 
  AND status IN (0, 1)
  AND created_at >= '2024-01-01'
ORDER BY created_at DESC 
LIMIT 20;

-- 创建覆盖索引
CREATE INDEX idx_cover ON orders(user_id, status, created_at, amount);
-- Extra: Using index（完全覆盖）
-- 查询时间：5ms
```

### 6.2 案例：社交 Feed 流的时间线查询

**背景：** 查询用户关注的人的动态，按时间倒序。

```sql
CREATE TABLE feeds (
    id BIGINT PRIMARY KEY,
    author_id INT NOT NULL,
    content TEXT,
    created_at DATETIME NOT NULL,
    INDEX idx_author_ctime (author_id, created_at)
);

-- 查询：获取关注用户的 Feed（IN 列表可能很长）
SELECT * FROM feeds 
WHERE author_id IN (100, 101, 102, ..., 500)  -- 400 个关注
  AND created_at > '2024-01-01'
ORDER BY created_at DESC 
LIMIT 20;
```

**问题：**
- IN 列表太长，优化器可能放弃使用索引
- 即使使用索引，需要合并 400 个索引扫描结果

**解决方案：**

```sql
-- 方案 1: 限制 IN 列表长度，分多次查询在应用层合并
-- 每次查 50 个，查 8 次，在应用层归并排序

-- 方案 2: 使用临时表（适用于关注数极多的场景）
CREATE TEMPORARY TABLE tmp_following (user_id INT PRIMARY KEY);
INSERT INTO tmp_following VALUES (100), (101), ...;

SELECT f.* 
FROM feeds f
JOIN tmp_following t ON f.author_id = t.user_id
WHERE f.created_at > '2024-01-01'
ORDER BY f.created_at DESC 
LIMIT 20;

-- 方案 3: 使用推送模式（写扩散）替代拉取模式
-- 每个用户有一个时间线表，关注后发件箱写入粉丝收件箱
```

---

## 七、索引设计 Checklist

### 7.1 设计阶段

- [ ] **主键选择**：使用自增整数（BIGINT UNSIGNED），避免 UUID/MD5 等随机值
- [ ] **选择性分析**：使用 `COUNT(DISTINCT col) / COUNT(*)` 评估索引价值
- [ ] **查询覆盖度**：分析 TOP 10 慢查询，确保高频查询走索引
- [ ] **索引合并**：检查是否可以合并多个单列索引为复合索引
- [ ] **排序优化**：为 `ORDER BY` 和 `GROUP BY` 设计合适的索引顺序
- [ ] **写放大评估**：计算索引带来的写入性能损耗（每多一个索引，写操作多一次 I/O）

### 7.2 上线前验证

- [ ] **EXPLAIN 分析**：所有核心查询使用 EXPLAIN 验证索引使用
- [ ] **边界测试**：测试深分页、大 IN 列表等边界场景
- [ ] **并发测试**：模拟高并发写入，检查锁竞争
- [ ] **空间估算**：评估索引占用空间（`SHOW TABLE STATUS`）

### 7.3 生产监控

- [ ] **慢查询日志**：开启 `log_queries_not_using_indexes`
- [ ] **索引使用监控**：定期检查 `performance_schema.table_io_waits_summary_by_index_usage`
- [ ] **锁等待监控**：关注 `performance_schema.data_lock_waits`
- [ ] **定期清理**：删除未使用的索引，重建碎片化严重的索引

---

## 八、总结

### 核心要点

1. **页是索引的基本单位**：理解 16KB 页的物理结构，才能明白为什么顺序插入比随机插入快、为什么页分裂会降低性能。

2. **索引即锁**：InnoDB 的锁是基于索引的，索引设计直接影响并发性能。

3. **覆盖索引是银弹**：在合适的场景下，覆盖索引可以将查询性能提升 10-100 倍。

4. **最左前缀是铁律**：复合索引的列顺序必须基于查询模式精心设计，等值查询列在前，范围查询列在后。

5. **没有银弹**：索引是空间换时间的权衡，过多索引会严重影响写入性能。

### 延伸阅读

- [《MySQL 技术内幕：InnoDB 存储引擎》](https://book.douban.com/subject/24708143/)
- [《高性能 MySQL》第四版](https://book.douban.com/subject/35136348/)
- [MySQL 8.0 Reference Manual - Optimization and Indexes](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [InnoDB 存储引擎源码分析](http://mysql.taobao.org/monthly/)

---

> **核心原则**：索引不是魔法，它是数据结构（B+ 树）的空间换时间实现。理解底层页结构、锁机制、查询优化器的行为，才能设计出真正高效的索引。
