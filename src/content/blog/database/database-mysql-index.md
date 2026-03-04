---
title: "MySQL 索引详解"
pubDate: 2024-01-15
description: "深入理解 MySQL 索引原理、类型、优化策略及最佳实践"
tags: ["MySQL", "数据库", "索引", "性能优化"]
#coverImage: "/images/mysql-index-cover.jpg"
readingTime: 25
pinned: true

# 系列文章
series:
  name: "MySQL 核心"
  order: 2
---

## 一、索引概述

### 1.1 什么是索引

索引（Index）是帮助 MySQL 高效获取数据的数据结构。它类似于书籍的目录，通过索引可以快速定位到数据所在的位置，避免全表扫描。

### 1.2 为什么需要索引

| 场景 | 无索引 | 有索引 |
|------|--------|--------|
| 查询 100 万条数据中的一条 | 需要扫描 100 万行 | 仅需 3-4 次磁盘 IO |
| 时间复杂度 | O(n) | O(log n) |
| 磁盘 IO 次数 | 大量 | 极少 |

### 1.3 索引的优缺点

**优点：**
- 大大提高数据查询速度
- 加速表与表之间的连接（JOIN）
- 在使用分组和排序时，显著减少时间
- 通过创建唯一索引，保证数据的唯一性

**缺点：**
- 占用额外的存储空间
- 降低写操作（INSERT/UPDATE/DELETE）的性能
- 需要定期维护（碎片整理、统计信息更新）

---

## 二、索引数据结构

### 2.1 常见数据结构对比

| 数据结构 | 特点 | 适用场景 |
|----------|------|----------|
| 哈希表 (Hash) | 等值查询 O(1)，不支持范围查询 | Memory 引擎、自适应哈希索引 |
| 有序数组 | 等值和范围查询快，插入慢 | 静态数据 |
| 二叉搜索树 | 查询 O(log n)，可能退化为链表 | 理论基础 |
| 平衡二叉树 (AVL/红黑树) | 保持平衡，但树高度较高 | 内存数据库 |
| B 树 (B-Tree) | 多叉树，降低树高，适合磁盘 IO | 文件系统 |
| B+ 树 (B+Tree) | 数据都在叶子节点，支持范围查询 | **MySQL 默认索引结构** |

### 2.2 B+ 树详解

MySQL InnoDB 引擎使用 **B+ 树** 作为索引的数据结构。

#### B+ 树的特点：

1. **多路平衡查找树**：每个节点可以有多个子节点，降低树的高度
2. **非叶子节点只存储键值**：不存储实际数据，可以存储更多键值
3. **叶子节点存储所有数据**：并且通过指针相互连接，形成有序链表
4. **查询稳定**：任何数据的查找都需要从根节点走到叶子节点

```
                    [10 | 20 | 30]
                   /    |    |    \
              [5|9]  [15]  [25]  [35|40]
               / \     /     /     /   \
            数据页  数据页  数据页  数据页  数据页
            (1-9)  (10-19) (20-29) (30-39) (40+)
               ↓      ↓      ↓      ↓      ↓
            ←←←←←←←←←←←← 双向链表 →→→→→→→→→→→
```

#### 为什么不用 B 树？

| 特性 | B 树 | B+ 树 |
|------|------|-------|
| 数据存储 | 非叶子节点也存数据 | 只在叶子节点存数据 |
| 范围查询 | 需要中序遍历 | 叶子节点链表直接遍历 |
| 树高度 | 相对较高 | 更低（非叶子节点存更多键） |
| 查询稳定性 | 不稳定 | 稳定（都在叶子节点） |

### 2.3 Hash 索引

```sql
-- 创建哈希索引（仅 Memory 引擎支持显式创建）
CREATE TABLE test_hash (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    INDEX USING HASH (name)
) ENGINE = MEMORY;
```

**Hash 索引特点：**
- 等值查询效率极高（O(1)）
- 不支持范围查询（>、<、BETWEEN）
- 不支持排序（ORDER BY）
- 不支持最左前缀匹配
- 存在哈希冲突问题

---

## 三、索引类型

### 3.1 按数据结构分类

| 类型 | 说明 | 使用场景 |
|------|------|----------|
| B+ 树索引 | 默认索引类型 | 大多数场景 |
| Hash 索引 | 哈希表实现 | 精确匹配查询 |
| 全文索引 | 倒排索引 | 文本搜索 |
| 空间索引 | R 树实现 | 地理数据（GIS） |

### 3.2 按功能分类

#### 3.2.1 主键索引 (Primary Key)

```sql
-- 创建主键索引
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL
);

-- 或单独添加
ALTER TABLE users ADD PRIMARY KEY (id);
```

**特点：**
- 自动创建，不能为空，不能重复
- 一个表只能有一个主键索引
- InnoDB 中，主键索引就是聚簇索引
- 建议使用自增整数作为主键

#### 3.2.2 唯一索引 (Unique Key)

```sql
-- 创建唯一索引
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20)
);

-- 单独创建
CREATE UNIQUE INDEX idx_unique_email ON users(email);
```

**特点：**
- 保证列值的唯一性
- 允许 NULL 值（MySQL 中多个 NULL 视为不同）
- 一个表可以有多个唯一索引

#### 3.2.3 普通索引 (Index/Key)

```sql
-- 创建普通索引
CREATE INDEX idx_username ON users(username);

-- 复合索引
CREATE INDEX idx_name_age ON users(username, age);
```

#### 3.2.4 前缀索引

```sql
-- 对字符串前 N 个字符创建索引
CREATE INDEX idx_name_prefix ON users(username(10));

-- 确定前缀长度（选择性接近完整列）
SELECT 
    COUNT(DISTINCT LEFT(username, 5)) / COUNT(DISTINCT username) as selectivity_5,
    COUNT(DISTINCT LEFT(username, 10)) / COUNT(DISTINCT username) as selectivity_10
FROM users;
```

#### 3.2.5 全文索引 (Fulltext)

```sql
-- 创建全文索引
CREATE FULLTEXT INDEX idx_content ON articles(content);

-- 使用全文索引
SELECT * FROM articles 
WHERE MATCH(content) AGAINST('MySQL 索引' IN NATURAL LANGUAGE MODE);
```

**注意：** MySQL 5.6 之前仅 MyISAM 支持，5.6 之后 InnoDB 也支持。

### 3.3 按存储方式分类

#### 3.3.1 聚簇索引 (Clustered Index)

**特点：**
- 数据行和索引存储在一起
- 叶子节点就是数据页
- 一个表只能有一个聚簇索引
- InnoDB 的主键索引就是聚簇索引

```
聚簇索引结构：

[主键值] → [完整数据行]

非叶子节点：存储主键值
叶子节点：存储完整的数据记录
```

#### 3.3.2 非聚簇索引 (Secondary/Non-clustered Index)

**特点：**
- 索引和数据分开存储
- 叶子节点存储主键值（回表查询）
- 一个表可以有多个非聚簇索引

```
非聚簇索引结构：

[索引列值] → [主键值]

查询时需要回表：通过主键值再到聚簇索引查找完整数据
```

#### 3.3.3 覆盖索引 (Covering Index)

当查询的所有列都在索引中时，无需回表，直接返回索引中的数据。

```sql
-- 创建复合索引
CREATE INDEX idx_name_age ON users(username, age);

-- 覆盖索引查询（无需回表）
SELECT username, age FROM users WHERE username = '张三';

-- 非覆盖索引查询（需要回表）
SELECT username, age, email FROM users WHERE username = '张三';
```

---

## 四、InnoDB 索引实现

### 4.1 InnoDB 索引组织方式

InnoDB 使用 **聚簇索引** 组织数据：

1. **有主键**：使用主键作为聚簇索引
2. **无主键**：使用第一个非空唯一索引作为聚簇索引
3. **无主键且无唯一索引**：自动生成 6 字节的隐藏列 `row_id` 作为聚簇索引

### 4.2 索引页结构

```
+------------------+
|  File Header     |  ← 文件头（38 字节）
+------------------+
|  Page Header     |  ← 页头（56 字节）
+------------------+
|  Infimum         |  ← 虚拟最小记录
+------------------+
|  Supremum        |  ← 虚拟最大记录
+------------------+
|  User Records    |  ← 用户记录（索引数据）
|  (按主键排序)     |
+------------------+
|  Free Space      |  ← 空闲空间
+------------------+
|  Page Directory  |  ← 页目录（稀疏索引）
+------------------+
|  File Trailer    |  ← 文件尾（校验和）
+------------------+
```

### 4.3 回表查询

当使用非主键索引查询时，需要两次索引查找：

```sql
SELECT * FROM users WHERE username = '张三';
```

查询过程：
1. 在 `idx_username` 索引中找到 `username = '张三'` 的记录，获取主键值 `id = 1`
2. 在聚簇索引中根据 `id = 1` 找到完整数据行

### 4.4 索引下推 (ICP - Index Condition Pushdown)

MySQL 5.6 引入的优化，减少回表次数。

```sql
-- 有索引 INDEX (name, age)
SELECT * FROM users WHERE name LIKE '张%' AND age = 20;
```

**不使用 ICP：**
1. 找到所有 `name LIKE '张%'` 的记录（可能 100 条）
2. 回表查询这 100 条的完整数据
3. 在 Server 层过滤 `age = 20`

**使用 ICP：**
1. 找到 `name LIKE '张%'` 的记录
2. **在存储引擎层** 就判断 `age = 20`，过滤掉不符合的
3. 只回表符合条件的记录（可能只有 10 条）

```sql
-- 查看 ICP 是否开启
SHOW VARIABLES LIKE 'optimizer_switch';
-- index_condition_pushdown=on 表示开启
```

---

## 五、索引使用原则

### 5.1 适合创建索引的列

| 场景 | 原因 |
|------|------|
| 频繁作为查询条件的列 | 加快查询速度 |
| 经常用于 JOIN 的列 | 加快连接速度 |
| 经常用于排序的列 | 避免 filesort |
| 经常用于分组（GROUP BY）的列 | 避免临时表 |
| 字段值区分度高的列 | 提高索引选择性 |

### 5.2 不适合创建索引的列

| 场景 | 原因 |
|------|------|
| 很少作为查询条件的列 | 浪费存储空间 |
| 数据重复度高的列（如性别） | 索引效果差 |
| 频繁更新的列 | 增加维护成本 |
| 小表（数据量 < 1000） | 全表扫描更快 |
| 长文本/大字段 | 索引占用空间大 |

### 5.3 最左前缀原则

对于复合索引 `(a, b, c)`，查询条件必须从最左边开始使用：

```sql
-- 能使用索引
WHERE a = 1
WHERE a = 1 AND b = 2
WHERE a = 1 AND b = 2 AND c = 3
WHERE a = 1 AND c = 3  -- a 能用，c 不能用
WHERE a = 1 AND b > 2 AND c = 3  -- a、b 能用，c 不能用（范围查询后停止）

-- 不能使用索引
WHERE b = 2
WHERE b = 2 AND c = 3
WHERE c = 3
```

### 5.4 索引选择性

选择性 = 不重复值的数量 / 总记录数

```sql
-- 计算列的选择性
SELECT 
    COUNT(DISTINCT username) / COUNT(*) AS username_selectivity,
    COUNT(DISTINCT gender) / COUNT(*) AS gender_selectivity
FROM users;
```

**原则：** 选择性越接近 1，索引效果越好。选择性低于 0.1 的列不建议建索引。

---

## 六、索引优化策略

### 6.1 复合索引设计原则

```sql
-- 创建复合索引
CREATE INDEX idx_multi ON table_name(col1, col2, col3);
```

**设计原则：**

1. **等值查询列放前面**：`=` 条件的列放在最左边
2. **区分度高的列放前面**：选择性高的列优先
3. **范围查询列放后面**：`>`、`<`、`BETWEEN` 等放后面
4. **控制索引列数**：一般不超过 5 列

```sql
-- 推荐：区分度高 + 等值查询在前
CREATE INDEX idx_age_status ON users(age, status);

-- 不推荐：范围查询在前会导致后面列无法用索引
CREATE INDEX idx_age_salary ON users(age, salary);  -- WHERE age > 20 AND salary = 5000
```

### 6.2 覆盖索引优化

```sql
-- 原查询（需要回表）
SELECT id, username, age FROM users WHERE username = '张三';

-- 优化：创建覆盖索引
CREATE INDEX idx_username_age ON users(username, age);

-- 优化后查询（无需回表）
SELECT username, age FROM users WHERE username = '张三';
```

### 6.3 避免索引失效

```sql
-- 1. 避免对索引列进行函数操作
WHERE DATE(create_time) = '2024-01-01'  -- 失效
WHERE create_time >= '2024-01-01' AND create_time < '2024-01-02'  -- 有效

-- 2. 避免隐式类型转换
WHERE phone = 13800138000  -- 失效（字符串列用数字查）
WHERE phone = '13800138000'  -- 有效

-- 3. 避免使用 != 或 <>
WHERE status != 1  -- 可能失效

-- 4. 避免使用 OR（部分场景）
WHERE id = 1 OR id = 2  -- 可用索引
WHERE id = 1 OR age = 20  -- 可能失效（age 无索引）

-- 5. LIKE 通配符在前
WHERE username LIKE '%张'  -- 失效
WHERE username LIKE '张%'  -- 有效
```

### 6.4 索引提示

```sql
-- 强制使用某个索引
SELECT * FROM users FORCE INDEX (idx_username) WHERE username = '张三';

-- 建议优化器使用某个索引
SELECT * FROM users USE INDEX (idx_username) WHERE username = '张三';

-- 忽略某个索引
SELECT * FROM users IGNORE INDEX (idx_username) WHERE username = '张三';
```

### 6.5 索引优化实践案例

#### 案例 1：分页优化

```sql
-- 深分页问题
SELECT * FROM users ORDER BY id LIMIT 1000000, 10;

-- 优化方案 1：使用覆盖索引 + 子查询
SELECT * FROM users 
WHERE id >= (SELECT id FROM users ORDER BY id LIMIT 1000000, 1) 
LIMIT 10;

-- 优化方案 2：使用游标（推荐）
SELECT * FROM users WHERE id > last_id ORDER BY id LIMIT 10;
```

#### 案例 2：ORDER BY 优化

```sql
-- 需要 filesort
SELECT * FROM users WHERE age = 20 ORDER BY create_time;

-- 优化：创建复合索引
CREATE INDEX idx_age_ctime ON users(age, create_time);

-- 现在可以直接使用索引排序
```

#### 案例 3：JOIN 优化

```sql
-- 确保被驱动表的连接列有索引
SELECT * FROM orders o 
JOIN users u ON o.user_id = u.id;

-- 确保 user_id 有索引
CREATE INDEX idx_user_id ON orders(user_id);
```

---

## 七、索引失效场景

### 7.1 常见失效场景总结

| 场景 | 示例 | 说明 |
|------|------|------|
| 违反最左前缀 | `INDEX(a,b)` 查 `WHERE b=1` | 缺少最左列 |
| 对列做函数操作 | `WHERE YEAR(time)=2024` | 索引列参与运算 |
| 隐式类型转换 | `WHERE phone=13800138000` | 字符串列用数字查 |
| 使用 != 或 <> | `WHERE status!=1` | 可能全表扫描 |
| 使用 IS NULL | `WHERE name IS NULL` | 可能失效 |
| LIKE 通配符在前 | `WHERE name LIKE '%张'` | 无法使用索引 |
| OR 条件不当 | `WHERE a=1 OR b=2` | b 无索引则失效 |
| 数据类型不匹配 | 字符串 vs 数字 | 隐式转换 |
| 查询条件使用参数 | `WHERE id=@id`（存储过程） | 可能失效 |
| 全表扫描更快 | 小表、高选择性条件 | 优化器选择 |

### 7.2 验证索引是否生效

```sql
-- 使用 EXPLAIN 分析
EXPLAIN SELECT * FROM users WHERE username = '张三';

-- 关键字段
-- type: 访问类型（system > const > eq_ref > ref > range > index > ALL）
-- possible_keys: 可能使用的索引
-- key: 实际使用的索引
-- rows: 扫描的行数
-- Extra: 额外信息（Using index 表示覆盖索引）
```

---

## 八、索引维护与监控

### 8.1 查看索引信息

```sql
-- 查看表的索引
SHOW INDEX FROM users;

-- 查看索引大小
SELECT 
    table_name,
    index_name,
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'your_database'
GROUP BY table_name, index_name;
```

### 8.2 索引维护操作

```sql
-- 删除索引
DROP INDEX idx_username ON users;
ALTER TABLE users DROP INDEX idx_username;

-- 重建索引（MySQL 8.0）
ALTER TABLE users DROP INDEX idx_username, ADD INDEX idx_username(username);

-- 分析表（更新统计信息）
ANALYZE TABLE users;

-- 优化表（整理碎片）
OPTIMIZE TABLE users;
```

### 8.3 慢查询分析

```sql
-- 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- 查看慢查询
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

### 8.4 查看索引使用情况

```sql
-- 查看索引使用统计
SELECT 
    table_name,
    index_name,
    rows_selected,
    rows_inserted,
    rows_deleted,
    rows_updated
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL;

-- 查找未使用的索引
SELECT 
    object_schema,
    object_name,
    index_name
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE index_name IS NOT NULL 
    AND count_star = 0 
    AND object_schema NOT IN ('mysql', 'performance_schema');
```

---

## 九、总结

### 9.1 索引设计 checklist

- [ ] 是否为高频查询条件创建索引？
- [ ] 复合索引是否遵循最左前缀原则？
- [ ] 是否避免了在区分度低的列上建索引？
- [ ] 是否考虑使用覆盖索引减少回表？
- [ ] 索引数量是否适中（单表一般不超过 5 个）？
- [ ] 是否定期检查并删除无用索引？
- [ ] 是否避免了对索引列做函数操作？
- [ ] 是否使用了正确的数据类型？

### 9.2 关键要点回顾

1. **B+ 树** 是 MySQL 默认的索引数据结构，适合范围查询和等值查询
2. **聚簇索引** 决定数据物理存储顺序，非聚簇索引需要回表
3. **覆盖索引** 可以避免回表，显著提高查询性能
4. **最左前缀原则** 是复合索引使用的核心原则
5. **索引选择性** 决定了索引的效率
6. **索引维护** 需要权衡查询性能和写入性能

### 9.3 延伸阅读

- [MySQL 官方文档 - 索引](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [高性能 MySQL](https://book.douban.com/subject/23008813/)
- [MySQL 技术内幕：InnoDB 存储引擎](https://book.douban.com/subject/24708143/)

---

> **提示**：索引不是越多越好，需要根据实际查询场景合理设计。建议通过 `EXPLAIN` 分析查询计划，持续优化索引策略。
