---
title: "MYSQL 数据库架构设计"
pubDate: 2025-01-15
description: "深入 InnoDB 索引底层实现，剖析页分裂、锁竞争、覆盖索引等高阶原理，结合生产环境复杂案例分析索引设计陷阱与调优策略"
tags: [ "MySQL", "数据库", "索引", "性能优化" ]
#coverImage: "/images/mysql-index-cover.jpg"
readingTime: 45
pinned: true

# 系列文章
series:
  name: "MySQL 核心"
  order: 3
---

## 引言

单库性能天花板（量化数据）

| 指标      | MySQL 8.0 实测极限                 | 业务影响                          |
|---------|--------------------------------|-------------------------------|
| **行数**  | 5000 万行（InnoDB 16KB 页，B+树 3 层） | 查询回表现象严重，随机 IO 占比 > 80%       |
| **QPS** | 3000-4000（NVMe SSD，32 核）       | 高峰期 CPU iowait > 30%          |
| **TPS** | 800-1200（单行写入，双 1 配置）          | 并发写入产生大量 gap lock 等待          |
| **连接数** | 1000-1500（线程池模式下）              | 连接风暴导致 `Too many connections` |

> **拐点现象**：当单表超过 3GB（约 2000 万行标准宽表），索引命中率从 99% 骤降至 85%，此时必须考虑分片。

## 一、分库分表

### 1.1 水平拆分

典型场景：

- 单表数据量超过5000w行，超过mysql性能拐点
- 并发压力超过单机承载

核心思想： 将同一个表的数据按照某种规则分散到多个库或者表中，**每个库表结构相同，数据不同。**

#### 1.1.1 组件：ShardingSphere 与 ShardingSphere 实现架构

| 层级  | 组件             | 功能                                       |
|-----|----------------|------------------------------------------|
| 接入层 | Sharding-JDBC  | 客户端直连，无中间件依赖，性能损耗 < 3%                   |
|     | Sharding-Proxy | 独立部署，支持异构语言（Python/Go），类似 MyCat          |
| 路由层 | 分片策略           | 	Standard（标准分片）、Complex（复合分片）、Hint（强制路由） |
| 执行层 | 执行引擎           | 内存归并、流式归并、并行执行                           |

--- 

选型决策矩阵：

| 维度     | Sharding-JDBC                 | Sharding-Proxy |
|--------|-------------------------------|----------------|
| 技术栈    | Java 首选                       | 多语言混合团队        |
| 运维成本   | 应用内嵌，无额外节点                    | 需维护 Proxy 集群   |
| SQL 兼容 | 部分函数不支持（如 `LAST_INSERT_ID()`） | 更接近原生 MySQL    |
| 分库灵活性  | 应用重启生效                        | 动态热更新          |

#### 1.1.2 SQL 改写与执行引擎

以查询 SELECT * FROM order WHERE user_id=100 AND create_time>'2025-01-01' 为例：

1. 解析阶段：Druid/ANTLR 生成 AST, 提取分片键 user_id
2. 路由阶段：
    ```java
        String shard = "ds" + (user_id % 2); // 路由到 ds0 或者 ds1
        String table = "order_" + (user_id % 16); // 路由到具体表
    ```
3. 改写阶段：将 SQL 改写为 路由 SQL 分为 (2库 * 2表场景)：
    ```sql
    SELECT * FROM ds0.order_0 WHERE user_id=100...
    SELECT * FROM ds0.order_8 WHERE user_id=100...
    SELECT * FROM ds1.order_0 WHERE user_id=100...
    SELECT * FROM ds1.order_8 WHERE user_id=100...
    ```
4. 归并阶段
    - 流式归并： 游标逐条拉取（内存占用 O(1)，适合 LIMIT/OFFSET）
    - 内存归并： 全量加载排序（ORDER BY 必须全量数据，警惕 OOM）

#### 1.1.3 分片算法详解 (超越简单HASH)

- 一致性哈希 （Consistent Hashing）
    - 解决扩容时的数据迁移量过大的问题：
        - 传统HASH: 从16分片扩到32分片，50%需要迁移
        - 一致性HASH: 仅需要迁移 1/N 数据，其中 N 为分片数
    - ShardingSphere 配置：
        ```yaml
       shardingAlgorithms:
         consistent-hash:
           type: INLINE
           props:
           algorithm-expression: ds${hashCode(order_id).abs() % 2}
          # 或使用自定义类实现 ConsistentHashShardingAlgorithm
       ```

#### 1.1.4 时间分片与冷热分离

```yaml
actual-data-nodes: ds0.order_${2024..2025}${(1..12).collect{t -> t.toString().padLeft(2,'0')}}
```

- 适用场景：日志、流水类数据，天然按时间有序
- 查询陷阱：跨月查询需扫描 2 个分片，必须带时间范围索引

### 1.2 垂直拆分 (业务解耦)

#### 1.2.1 垂直分库的边界划分（DDD 视角）

反模式警示：按表名前缀粗暴拆分（如 t_user 去用户库，t_order 去订单库）会导致分布式事务爆炸。

正确姿势（聚合根原则）：

```text
电商核心域划分：
├─ 用户域（User BC）：用户表、用户地址、用户等级（C 端高频读）
├─ 交易域（Trade BC）：订单主表、订单明细、购物车（高并发写）
├─ 支付域（Payment BC）：支付流水、退款记录（强一致性要求）
└─ 履约域（Fulfillment BC）：物流轨迹、库存扣减（异步容忍）
```

数据一致性策略：

- 同域内：本地事务（ACID）
- 跨域交互：领域事件（Event Sourcing）+ 消息队列最终一致

#### 1.2.2 垂直分表的 IO 优化原理

InnoDB 行格式分析：

- 单行超过 半页（8KB） 时，变长字段（VARCHAR/BLOB/TEXT）会存储到 溢出页（Off-page），导致查询产生随机 IO。

拆分示例（商品表）：

| 表名               | 字段                        | 访问频率 | 存储策略             |
|------------------|---------------------------|------|------------------|
| `product_base`   | id, name, price, category | 100% | 热数据，SSD 存储       |
| `product_detail` | description, specs（JSON）  | 15%  | 冷数据，SATA 存储      |
| `product_media`  | images（外链），video          | 5%   | 对象存储（OSS），表存 URL |

### 1.3 分片键选择与数据分布策略

分片键的选择直接决定数据分布均匀度和查询效率，是水平拆分的核心决策。

#### 1.3.1 分片键选择原则

| 原则        | 说明             | 反面案例                             |
|-----------|----------------|----------------------------------|
| **高基数**   | 字段值域足够大，避免数据倾斜 | 用 `status`（仅3个值）作分片键，导致热点        |
| **访问均衡**  | 各分片读写压力大致相等    | 时间分片导致最新分片成为热点                   |
| **查询亲和**  | 高频查询条件包含分片键    | 按 `user_id` 分片，但大量查询用 `order_id` |
| **单调性回避** | 避免自增 ID 直接取模   | `auto_increment` 顺序写入导致尾部热点      |

#### 1.3.2 复合分片策略

当单一字段无法满足需求时，采用复合分片：

```yaml
# ShardingSphere 复合分片配置
shardingTables:
  t_order:
    actualDataNodes: ds${0..1}.t_order_${0..15}
    tableStrategy:
      complex:
        shardingColumns: user_id, order_date
        algorithmClassName: com.example.UserDateShardingAlgorithm
```

算法实现示例（先按用户分库，再按时间分表）：

```java
public String doSharding(Collection<String> targets, ComplexKeysShardingValue<Comparable<?>> value) {
    // 提取 user_id 和 order_date
    Long userId = (Long) value.getColumnNameAndShardingValuesMap().get("user_id").iterator().next();
    Date orderDate = (Date) value.getColumnNameAndShardingValuesMap().get("order_date").iterator().next();

    // 先按 user_id % 2 路由到库
    String ds = "ds" + (userId % 2);
    // 再按月份路由到表
    String month = new SimpleDateFormat("MM").format(orderDate);
    String table = "t_order_" + month;

    return ds + "." + table;
}
```

#### 1.3.3 数据倾斜监控与治理

```sql
-- 检测各分片数据量差异（标准差应 < 20%）
SELECT shard_key,
       COUNT(*)                                           as cnt,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as pct
FROM t_order
GROUP BY user_id % 16;
```

**数据迁移方案**：当检测到严重倾斜（某分片超过平均值 150%）时，采用在线迁移：

1. 双写阶段：新数据同时写入旧分片和新分片
2. 增量同步：使用 Canal 同步历史数据
3. 一致性校验：对比校验和与抽样数据
4. 切换读流量：灰度放量到新分片
5. 停写旧分片：完成迁移

---

## 二、全局ID

分库分表后，自增 ID 无法保证全局唯一，需要独立的全局 ID 生成方案。

### 2.1 方案对比与选型

| 方案             | 性能       | 连续性 | 趋势递增 | 依赖    | 适用场景          |
|----------------|----------|-----|------|-------|---------------|
| **Snowflake**  | 100w+/s  | 不连续 | 是    | 无     | 高并发、分布式环境     |
| **号段模式**       | 5000+/s  | 连续  | 是    | DB    | 中等并发，需要连续性    |
| **Redis incr** | 10000+/s | 连续  | 是    | Redis | 已有 Redis 基础设施 |
| **UUID**       | 100w+/s  | 不连续 | 否    | 无     | 数据归档、日志       |

### 2.2 Snowflake 深度优化

#### 2.2.1 原版架构分析

```
| 1 bit | 41 bit 时间戳 | 10 bit 工作节点 | 12 bit 序列号 |
| 符号位 | 毫秒级时间差 | 数据中心(5) + 机器(5) | 每毫秒 4096 个 |
```

**时钟回拨问题**：当系统时间被调回，可能产生重复 ID。

#### 2.2.2 优化方案：Leaf-Snowflake（美团）

```java
// 基于 ZooKeeper 的时钟校准
public class LeafSnowflake {
    private static final long TIME_BITS = 41L;
    private static final long WORKER_BITS = 10L;
    private static final long SEQUENCE_BITS = 12L;

    // 关键优化：ZK 持久节点存储最大时间戳
    private long lastTimestamp = -1L;

    public synchronized long nextId() {
        long currTimestamp = getCurrentTimestamp();

        // 时钟回拨检测（容忍 5ms）
        if (currTimestamp < lastTimestamp) {
            long offset = lastTimestamp - currTimestamp;
            if (offset <= 5) {
                // 短暂等待
                wait(offset << 1);
                currTimestamp = getCurrentTimestamp();
            } else {
                // 严重回拨，上报告警，使用 ZK 存储的最大时间戳
                currTimestamp = zkMaxTimestamp;
            }
        }

        // 同毫秒内序列号递增
        if (currTimestamp == lastTimestamp) {
            sequence = (sequence + 1) & SEQUENCE_MASK;
            if (sequence == 0) {
                // 序列号溢出，等待下一毫秒
                currTimestamp = tilNextMillis(lastTimestamp);
            }
        } else {
            sequence = 0L;
        }

        lastTimestamp = currTimestamp;
        return ((currTimestamp - EPOCH) << TIMESTAMP_SHIFT)
                | (workerId << WORKER_SHIFT)
                | sequence;
    }
}
```

#### 2.2.3 百度 UIDGenerator 优化

采用 `RingBuffer` 预生成机制，消除同步等待：

```java
// 双 RingBuffer 交替填充
private final RingBuffer[] buffers = new RingBuffer[2];
private volatile int currentBuffer = 0;

// 后台线程预填充
void paddingBuffer() {
    while (running) {
        RingBuffer buffer = buffers[currentBuffer ^ 1];
        if (buffer.remaining() < threshold) {
            // 批量生成 ID 填充备用 Buffer
            for (int i = 0; i < batchSize; i++) {
                buffer.put(generateId());
            }
        }
        Thread.sleep(50);
    }
}
```

### 2.3 号段模式（Leaf-Segment）

适合需要连续 ID 的业务场景（如物流单号）。

```sql
-- 号段分配表
CREATE TABLE id_segment
(
    biz_tag     VARCHAR(64) PRIMARY KEY,
    max_id      BIGINT NOT NULL DEFAULT 0,
    step        INT    NOT NULL DEFAULT 1000,
    update_time TIMESTAMP       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 原子性获取号段
UPDATE id_segment
SET max_id = max_id + step
WHERE biz_tag = 'order';
SELECT max_id - step, max_id
FROM id_segment
WHERE biz_tag = 'order';
```

**双 Buffer 优化**：

```java
public class SegmentBuffer {
    private Segment current;  // 当前使用的号段
    private Segment next;     // 预加载的号段
    private volatile boolean nextReady = false;

    public long nextId() {
        long id = current.next();
        if (current.remaining() < 0.1 * step && !nextReady) {
            // 异步加载下一个号段
            executor.execute(this::loadNextSegment);
        }
        if (current.isExhausted()) {
            // 切换号段
            current = next;
            nextReady = false;
        }
        return id;
    }
}
```

### 2.4 业务 ID 设计实践

```java
// 订单号设计：时间 + 分片信息 + 随机
public String generateOrderNo(Long userId) {
    // 20250115 + 用户ID后4位 + 8位随机
    String date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
    String userPart = String.format("%04d", userId % 10000);
    String random = RandomStringUtils.randomNumeric(8);
    return date + userPart + random;  // 如：20250115012387654321
}

// 优势：
// 1. 从订单号可解析分片键（userId）
// 2. 天然按时间有序，便于归档
// 3. 无外部依赖，生成性能极高
```

---

## 三、读写分离

### 3.1 架构演进路径

```
阶段一：单库直连
    App → MySQL Master

阶段二：一主一从（手动切换）
    App → 主库（写）
        ↘ 从库（读，故障时切主库）

阶段三：读写分离中间件
    App → Sharding-Proxy / MyCat → 主库（写）
                                  → 从库1（读）
                                  → 从库2（读）

阶段四：分布式集群
    App → 负载均衡 → 多主多从 + 分片
```

### 3.2 数据同步延迟与一致性策略

#### 3.2.1 延迟来源分析

| 阶段             | 耗时      | 优化手段          |
|----------------|---------|---------------|
| 事务提交（redo log） | 0.1~1ms | 组提交优化         |
| binlog 传输      | 0~10ms  | 压缩传输、专线网络     |
| relay log 重放   | 1~100ms | 并行复制、WRITESET |
| 合计典型延迟         | 1~100ms | 业务层容忍或强制读主    |

#### 3.2.2 主从延迟监控

```sql
-- 查看复制延迟（秒）
SHOW SLAVE STATUS \G
-- Seconds_Behind_Master: 12

-- 更精确的延迟计算（基于心跳表）
-- 主库每分钟更新：REPLACE INTO heartbeat (id, ts) VALUES (1, NOW(6))
SELECT TIMESTAMPDIFF(MICROSECOND, ts, NOW(6)) / 1000 as delay_ms
FROM heartbeat
WHERE id = 1;
```

#### 3.2.3 延迟解决方案

**方案一：强制走主库（Hint 机制）**

```java
// 刚写入后需要立即读取的场景
@Transactional
public Order createAndGet(Order order) {
    orderMapper.insert(order);

    // 强制走主库查询
    HintManager hintManager = HintManager.getInstance();
    hintManager.setMasterRouteOnly();
    try {
        return orderMapper.selectById(order.getId());
    } finally {
        hintManager.close();
    }
}
```

**方案二：缓存补偿**

```java
// 写入时同步写缓存，读取时先查缓存
public Order getOrder(Long orderId) {
    // 1. 先读缓存
    Order order = cache.get(orderId);
    if (order != null) {
        return order;
    }

    // 2. 缓存未命中，查从库
    order = orderMapper.selectById(orderId);
    if (order != null) {
        cache.put(orderId, order, 5, TimeUnit.MINUTES);
    }
    return order;
}

// 写入时双写
public void createOrder(Order order) {
    orderMapper.insert(order);
    cache.put(order.getId(), order, 5, TimeUnit.MINUTES);
}
```

**方案三：半同步复制（Semi-Sync）**

```ini
# my.cnf 配置半同步
plugin-load = rpl_semi_sync_master=semisync_master.so;rpl_semi_sync_slave=semisync_slave.so
rpl_semi_sync_master_enabled = 1
rpl_semi_sync_slave_enabled = 1
rpl_semi_sync_master_timeout = 1000  # 1s 超时降级异步
```

> **注意**：半同步保证至少一个从库收到 binlog，但不保证重放完成，极端情况下仍有延迟。

### 3.3 负载均衡策略

| 策略       | 算法     | 适用场景      |
|----------|--------|-----------|
| **轮询**   | 依次分发   | 各从库配置相同   |
| **权重**   | 按权重比例  | 从库配置不同    |
| **最小延迟** | 实时探测延迟 | 对一致性要求高   |
| **标签路由** | 按业务标签  | 报表查询走专属从库 |

```yaml
# ShardingSphere 负载均衡配置
loadBalancers:
  read-random:
    type: RANDOM
  read-weight:
    type: WEIGHT
    props:
      ds-slave-0: 3  # 权重 3
      ds-slave-1: 1  # 权重 1
```

### 3.4 高可用与故障转移

#### 3.4.1 MHA（Master High Availability）架构

```
        Manager 节点（监控 + 决策）
              │
    ┌─────────┼─────────┐
    ↓         ↓         ↓
 Master    Slave1    Slave2
(写入)    (读取/候选) (读取/候选)
```

**故障检测与切换流程**：

1. **检测阶段**：Manager 每 3 秒 ping 主库，连续 3 次失败判定为宕机
2. **选主阶段**：根据 `relay_log` 位置选择数据最新的从库
3. **切换阶段**：
    - 补偿从库缺失的 binlog
    - 将新主库提升为可写
    - 其余从库 change master 到新主库
4. **通知阶段**：调用 `master_ip_failover_script` 切换 VIP 或通知配置中心

**典型切换耗时**：10~30 秒（可接受范围内）

#### 3.4.2 基于 Orchestrator 的可视化运维

Orchestrator 提供 Web UI 管理和自动故障转移：

```bash
# 拓扑发现
orchestrator-client -c topology -i master.host:3306

# 手动切换
orchestrator-client -c graceful-master-takeover -i old-master:3306
```

**优势**：

- 支持 GTID 复制，故障恢复更精确
- 可视化复制拓扑图
- 支持批量从库重连

---

## 四、分布式事务

### 4.1 分布式事务场景与权衡

| 方案           | 一致性  | 性能 | 实现复杂度 | 适用场景      |
|--------------|------|----|-------|-----------|
| **本地消息表**    | 最终一致 | 高  | 低     | 异步场景，如发短信 |
| **TCC**      | 最终一致 | 高  | 高     | 金融扣款、库存扣减 |
| **Saga**     | 最终一致 | 高  | 中     | 长事务业务流程   |
| **Seata AT** | 最终一致 | 中  | 低     | 快速接入现有业务  |
| **2PC/XA**   | 强一致  | 低  | 低     | 极少使用      |

### 4.2 TCC 模式详解

TCC（Try-Confirm-Cancel）将事务拆分为三个阶段：

```java

@Service
public class OrderTccService {

    // Try 阶段：预留资源
    @Transactional
    public boolean tryCreate(OrderContext context) {
        // 1. 创建订单，状态为 TRYING
        orderMapper.insert(context.getOrder().setStatus("TRYING"));

        // 2. 调用库存服务：冻结库存
        inventoryService.tryFreeze(context.getSkuId(), context.getCount());

        // 3. 调用账户服务：冻结金额
        accountService.tryFreeze(context.getUserId(), context.getAmount());

        return true;
    }

    // Confirm 阶段：确认执行
    @Transactional
    public boolean confirm(OrderContext context) {
        // 1. 更新订单状态为 SUCCESS
        orderMapper.updateStatus(context.getOrderId(), "SUCCESS");

        // 2. 确认扣减库存
        inventoryService.confirmFreeze(context.getSkuId(), context.getCount());

        // 3. 确认扣款
        accountService.confirmFreeze(context.getUserId(), context.getAmount());

        return true;
    }

    // Cancel 阶段：回滚释放
    @Transactional
    public boolean cancel(OrderContext context) {
        // 1. 更新订单状态为 CANCELLED
        orderMapper.updateStatus(context.getOrderId(), "CANCELLED");

        // 2. 释放冻结库存
        inventoryService.cancelFreeze(context.getSkuId(), context.getCount());

        // 3. 释放冻结金额
        accountService.cancelFreeze(context.getUserId(), context.getAmount());

        return true;
    }
}
```

**幂等性保障**：

```sql
-- 事务记录表，用于幂等判断
CREATE TABLE tcc_transaction
(
    xid          VARCHAR(64) PRIMARY KEY,
    status       TINYINT COMMENT '1:TRYING 2:CONFIRMING 3:CANCELLING 4:SUCCESS 5:CANCELLED',
    try_time     TIMESTAMP,
    confirm_time TIMESTAMP,
    cancel_time  TIMESTAMP
);
```

### 4.3 Saga 模式与状态机

适合长事务业务流程（如电商下单：创建订单→扣库存→支付→发货→签收）。

```java
// 使用状态机定义 Saga 流程
StateMachineBuilder<OrderState, OrderEvent> builder = StateMachineBuilder.newBuilder();

builder.

externalTransition()
    .

from(OrderState.CREATED)
    .

to(OrderState.INVENTORY_DEDUCTED)
    .

on(OrderEvent.DEDUCT_INVENTORY)
    .

perform(deductInventoryAction());

        builder.

externalTransition()
    .

from(OrderState.INVENTORY_DEDUCTED)
    .

to(OrderState.PAID)
    .

on(OrderEvent.PAY)
    .

perform(payAction());

// 定义补偿操作
        builder.

setCompensateAction(OrderState.INVENTORY_DEDUCTED, restoreInventoryAction());
        builder.

setCompensateAction(OrderState.PAID, refundAction());
```

**正向执行失败时的补偿顺序**：

```
正向：创建订单 → 扣库存 → 支付 → 发货
补偿：退款 ← 恢复库存 ← 取消订单
      （按正向逆序执行补偿）
```

### 4.4 Seata AT 模式原理

Seata AT 模式对业务代码无侵入，通过代理数据源实现：

```
业务应用                    Seata Server (TC)
    │                             │
    ├─ 1. 注册分支事务 ───────────→│
    │                             │
    ├─ 2. 执行业务 SQL ───┐       │
    │    (记录 UNDO_LOG)  │       │
    │                     ↓       │
    ├─ 3. 申请全局锁 ◄────┘       │
    │                             │
    ├─ 4. 提交本地事务 ───────────→│
    │                             │
    └─ 5. 全局提交/回滚 ←─────────│
```

**UNDO_LOG 结构**：

```json
{
  "branchId": 123456789,
  "undoItems": [
    {
      "afterImage": {
        "tableName": "t_order",
        "rows": [
          {
            "id": 1001,
            "status": 1,
            "amount": 99.00
          }
        ]
      },
      "beforeImage": {
        "tableName": "t_order",
        "rows": [
          {
            "id": 1001,
            "status": 0,
            "amount": 99.00
          }
        ]
      },
      "sqlType": "UPDATE"
    }
  ]
}
```

**性能优化**：

- 全局锁存储在 TC，支持批量释放
- 异步删除 UNDO_LOG
- 支持脏写检查（校验前后镜像）

---

## 五、数据迁移与平滑扩容

### 5.1 不停机迁移方案

#### 阶段一：双写准备期（2~4 周）

```java

@Service
public class OrderService {

    @Autowired
    private OrderMapper oldMapper;  // 原单库

    @Autowired
    private OrderMapper newMapper;  // 新分片库

    @Transactional
    public void createOrder(Order order) {
        // 1. 写旧库（主）
        oldMapper.insert(order);

        // 2. 异步写新库（从）
        asyncExecutor.execute(() -> {
            try {
                newMapper.insert(order);
            } catch (Exception e) {
                // 记录补偿日志，定时任务重试
                compensateLog.save(order);
            }
        });
    }
}
```

#### 阶段二：历史数据迁移

使用 **DataX** 或 **Canal** 进行全量 + 增量迁移：

```json
{
  "job": {
    "content": [
      {
        "reader": {
          "name": "mysqlreader",
          "parameter": {
            "username": "root",
            "password": "xxx",
            "column": [
              "*"
            ],
            "splitPk": "id",
            "connection": [
              {
                "jdbcUrl": [
                  "jdbc:mysql://old-db:3306/order"
                ],
                "table": [
                  "t_order"
                ]
              }
            ]
          }
        },
        "writer": {
          "name": "mysqlwriter",
          "parameter": {
            "writeMode": "insert",
            "column": [
              "*"
            ],
            "connection": [
              {
                "jdbcUrl": "jdbc:mysql://new-db-shard0:3306/order_0",
                "table": [
                  "t_order_0"
                ]
              }
            ]
          }
        }
      }
    ]
  }
}
```

#### 阶段三：数据校验

```sql
-- 校验行数
SELECT 'old' as source, COUNT(*) as cnt
FROM old_db.t_order
UNION ALL
SELECT 'new', SUM(cnt)
FROM (SELECT COUNT(*) as cnt
      FROM new_db_0.t_order_0
      UNION ALL
      SELECT COUNT(*)
      FROM new_db_0.t_order_1
         -- ...
     ) t;

-- 校验抽样数据一致性（MD5 比对）
SELECT MD5(CONCAT(id, amount, status)) as checksum
FROM t_order
WHERE id % 1000 = 0; -- 抽样 0.1%
```

#### 阶段四：流量切换

```yaml
# 灰度配置，按用户 ID 尾号切换
routing:
  rules:
    - condition: "user_id % 100 < 10"  # 10% 流量走新库
      datasource: new-shard
    - condition: "default"
      datasource: old-db
```

逐步扩大灰度比例：10% → 50% → 100%

#### 阶段五：旧库下线

保留旧库 **3~6 个月** 作为备份，定期对比校验确保无数据遗漏。

---

## 六、架构设计决策 checklist

### 6.1 选型决策树

```
是否需要分库分表？
├── 单表 < 1000万行 AND QPS < 2000
│   └── 否 → 优先优化索引、SQL、缓存
│
└── 是
    ├── 是否需要跨分片 JOIN/事务？
    │   ├── 是 → 考虑垂直拆分（按业务域）
    │   └── 否 → 水平拆分
    │
    ├── 分片键是否明确？
    │   ├── 是 → 标准分片
    │   └── 否 → 考虑全局表、ES 异构查询
    │
    └── 读多写少？
        ├── 是 → 读写分离 + 一主多从
        └── 否 → 考虑写入优化（批量、队列）
```

### 6.2 关键指标监控

| 层级       | 指标         | 告警阈值  | 处理建议             |
|----------|------------|-------|------------------|
| **应用层**  | 慢查询比例      | > 1%  | 分析执行计划，优化索引      |
|          | 分片路由命中率    | < 95% | 检查 SQL 是否带分片键    |
| **数据库层** | 主从延迟       | > 5s  | 检查从库 IO、网络，或强制读主 |
|          | 连接数使用率     | > 80% | 扩容或优化连接池         |
|          | 锁等待时间      | > 1s  | 优化事务粒度，减少持有锁时间   |
| **基础设施** | 磁盘使用率      | > 85% | 扩容或归档历史数据        |
|          | CPU iowait | > 20% | 检查慢查询，考虑 SSD 升级  |

### 6.3 常见反模式

| 反模式           | 后果        | 正确做法          |
|---------------|-----------|---------------|
| 单表自增 ID 作主键   | 分片后 ID 冲突 | 使用分布式 ID      |
| 跨分片分页查询       | 内存归并 OOM  | 限制深度分页，或使用 ES |
| 大量 IN 查询跨分片   | 全分片扫描     | 拆分为多次单分片查询    |
| 全局表频繁更新       | 多节点同步开销   | 将更新频繁字段拆分到业务表 |
| 不带分片键的 DELETE | 误删全库数据    | 强制校验必须带分片键    |

---

## 七、总结

数据库架构设计没有银弹，核心在于**理解业务数据特征**与**权衡一致性、可用性、性能**。

| 场景      | 推荐方案        | 关键决策点                         |
|---------|-------------|-------------------------------|
| 电商订单    | 水平拆分 + TCC  | 分片键选 buyer_id 或 order_id，冷热分离 |
| 社交 Feed | 写扩散 + 时间分片  | 拉模式改推模式，预计算关注列表               |
| 金融交易    | 垂直拆分 + Saga | 强一致性要求，补偿逻辑完备性                |
| 日志系统    | 时间分片 + TTL  | 自动过期删除，对象存储归档                 |
| 配置数据    | 全局表         | 数据量小，多节点冗余                    |

**演进原则**：

1. **先垂直后水平**：先按业务域拆分，再考虑单表水平扩展
2. **先缓存后分片**：优先通过缓存降低数据库压力
3. **先读写分离后分片**：单主多从可支撑 10x 读扩展
4. **数据驱动决策**：基于监控数据而非预估进行拆分

> **最终目标**：让数据库回归本质——可靠的数据存储，复杂的计算逻辑上浮到应用层或通过异构存储（Redis、ES、OLAP）解决。