---
title: "Spring 事务管理深度解析"
pubDate: 2025-03-09
description: "深入剖析 Spring 事务传播行为、隔离级别、失效场景及 DataSourceTransactionManager 挂起恢复机制"
tags: ["Spring", "事务", "源码分析"]
readingTime: 28
pinned: true
series:
  name: "Spring 核心原理"
  order: 3
---

> Spring 事务管理为业务开发提供了声明式事务支持。本文深入分析事务传播行为、隔离级别、失效场景以及底层的事务挂起与恢复机制。

---

## 一、传播行为（Propagation）

### 1.1 七种传播行为对比

| 传播行为 | 含义 | 当前有事务 | 当前无事务 |
|----------|------|-----------|-----------|
| **REQUIRED**（默认） | 需要事务 | 加入 | 新建 |
| **REQUIRES_NEW** | 需要新事务 | 挂起当前，新建 | 新建 |
| **NESTED** | 嵌套事务 | 创建 savepoint | 新建 |
| **SUPPORTS** | 支持事务 | 加入 | 非事务执行 |
| **NOT_SUPPORTED** | 不支持事务 | 挂起当前，非事务执行 | 非事务执行 |
| **MANDATORY** | 强制要求 | 加入 | 抛异常 |
| **NEVER** | 禁止事务 | 抛异常 | 非事务执行 |

### 1.2 REQUIRED：默认传播行为

```java
@Service
public class OrderService {
    
    @Transactional
    public void createOrder(Order order) {
        // 当前无事务：开启新事务 T1
        // 当前有事务：加入已有事务
        orderDao.save(order);
        
        // 内部调用，传播行为同样适用
        logService.recordLog("创建订单", order.getId());
    }
}

@Service
public class LogService {
    
    @Transactional(propagation = Propagation.REQUIRED)
    public void recordLog(String action, Long orderId) {
        // 如果外部有事务，加入外部事务
        // 外部异常时，日志也会回滚
        logDao.insert(new Log(action, orderId));
    }
}
```

**执行流程**：

```
外部无事务:                           外部有事务 T1:

    createOrder                          事务 T1 中
        │                                    │
        ▼                                    ▼
    开启事务 T1 ───────►                   createOrder
        │                                    │
        ▼                                    ▼
    save order                           加入 T1
        │                                    │
        ▼                                    ▼
    recordLog                            save order
        │                                    │
        ▼                                    ▼
    加入 T1                              recordLog
        │                                    │
        ▼                                    ▼
    insert log                           加入 T1 (共享)
        │                                    │
        ▼                                    ▼
    commit T1                            insert log
                                             │
                                             ▼
                                         随 T1 commit
```

### 1.3 REQUIRES_NEW：独立事务

```java
@Service
public class LogService {
    
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLog(String action, Long orderId) {
        // 无论外部是否有事务，都开启独立事务
        // 外部异常不影响日志记录
        logDao.insert(new Log(action, orderId));
    }
}

@Service
public class OrderService {
    
    @Transactional
    public void createOrder(Order order) {
        orderDao.save(order);
        
        try {
            logService.recordLog("创建订单", order.getId());
        } catch (Exception e) {
            // 即使日志服务异常，也不影响订单创建
            // 注意：默认情况下，日志异常会导致订单事务回滚
            // 需要 catch 并处理
        }
        
        // 如果这里抛异常，日志不会回滚（已独立提交）
        // if (true) throw new RuntimeException("模拟异常");
    }
}
```

**执行流程**：

```
REQUIRES_NEW 事务挂起与恢复流程

    事务 T1 (外部)
        │
        ├── save(order)
        │
        ├── 【挂起 T1】suspend(T1)
        │       │
        │       └── 保存 T1 的 ConnectionHolder、隔离级别等
        │
        ├── 【开启 T2】新事务
        │       │
        │       ├── 从 DataSource 获取新连接 Connection@2
        │       │
        │       ├── insert(log)
        │       │
        │       └── 【提交 T2】commit()
        │               │
        │               └── T2 完全提交，与 T1 独立
        │
        ├── 【恢复 T1】resume(T1)
        │       │
        │       └── 恢复之前的 ConnectionHolder
        │
        ├── 继续执行业务逻辑
        │
        └── commit/rollback T1

    关键点: T1 和 T2 完全独立，T2 提交后即使 T1 回滚，T2 数据仍然保留
```

### 1.4 NESTED：嵌套 Savepoint

```java
@Service
public class OrderService {
    
    @Transactional
    public void createOrder(Order order) {
        orderDao.save(order);
        
        try {
            // NESTED 传播：在当前事务中创建 savepoint
            auditService.recordAudit(order);
        } catch (Exception e) {
            // audit 失败，只回滚到 savepoint
            // order 数据仍然保留
        }
        
        // 继续执行其他操作
        notificationService.sendNotification(order);
    }
}

@Service
public class AuditService {
    
    @Transactional(propagation = Propagation.NESTED)
    public void recordAudit(Order order) {
        // 创建 JDBC savepoint
        // 如果这里异常，只回滚到 savepoint，不整个回滚
        auditDao.insert(new AuditLog(order));
        
        // 模拟异常
        throw new RuntimeException("审计服务异常");
    }
}
```

**REQUIRES_NEW vs NESTED 对比**：

| 特性 | REQUIRES_NEW | NESTED |
|------|--------------|--------|
| 事务关系 | 完全独立的新事务 | 父事务的子事务 |
| 底层实现 | 挂起/恢复 | JDBC Savepoint |
| 回滚范围 | 只影响自己 | 可回滚到 savepoint |
| 提交时机 | 立即提交 | 随父事务一起提交 |
| 异常传播 | 独立 | 可捕获，不强制影响父事务 |

---

## 二、隔离级别（Isolation）

### 2.1 四种隔离级别

```java
public enum Isolation {
    DEFAULT(-1),           // 使用数据库默认隔离级别
    READ_UNCOMMITTED(1),   // 读未提交
    READ_COMMITTED(2),     // 读已提交
    REPEATABLE_READ(4),    // 可重复读
    SERIALIZABLE(8)        // 串行化
}
```

### 2.2 隔离级别与问题

| 隔离级别 | 脏读 | 不可重复读 | 幻读 | MySQL | Oracle |
|----------|------|-----------|------|-------|--------|
| READ_UNCOMMITTED | ✗ | ✗ | ✗ | ✅ | ❌ |
| READ_COMMITTED | ✅ | ✗ | ✗ | ✅ | 默认 |
| REPEATABLE_READ | ✅ | ✅ | ✗ | 默认 | ❌ |
| SERIALIZABLE | ✅ | ✅ | ✅ | ✅ | ✅ |

> [!note]
> **Spring 的隔离级别 vs 数据库隔离级别**：
> - Spring 只是将隔离级别传递给底层数据库
> - 实际效果取决于数据库实现
> - 数据库不支持时，Spring 会警告但不会阻止

### 2.3 Spring 设置隔离级别

```java
@Service
public class AccountService {
    
    // 显式指定隔离级别
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void transfer(String from, String to, BigDecimal amount) {
        // 确保读到已提交的数据
        Account fromAccount = accountDao.findById(from);
        Account toAccount = accountDao.findById(to);
        
        fromAccount.debit(amount);
        toAccount.credit(amount);
        
        accountDao.update(fromAccount);
        accountDao.update(toAccount);
    }
    
    // 报表查询可以使用更低隔离级别提高并发
    @Transactional(isolation = Isolation.READ_UNCOMMITTED, readOnly = true)
    public List<Transaction> queryTransactions(Date start, Date end) {
        // 允许脏读，提高查询性能
        return transactionDao.findByDateRange(start, end);
    }
}
```

---

## 三、事务失效场景

### 3.1 同类内部调用（this 引用）

```java
@Service
public class UserService {
    
    @Autowired
    private UserDao userDao;
    
    // 【问题】非事务方法调用事务方法
    public void createUserWithLog(User user) {
        saveUser(user);  // this.saveUser()，事务不生效！
        logService.recordLog("创建用户");
    }
    
    @Transactional
    public void saveUser(User user) {
        userDao.insert(user);
    }
}
```

**失效原因**：

```
✅ 外部调用 (事务生效):

    userService.createUserWithLog()
        │
        ▼
    代理对象.createUserWithLog()
        │
        ▼
    代理拦截 ──► 开启事务 ──► 调用目标方法 ──► 提交事务

❌ 同类内部调用 (事务失效):

    createUserWithLog() {
        │
        ├── this.saveUser(user) ──► 非代理调用!
        │       │
        │       ▼
        │   直接调用目标对象的方法
        │       │
        │       ▼
        │   不经过代理，无事务拦截
        │
        └── 事务不生效
```

**解决方案**：

```java
@Service
public class UserService {
    
    // 方案 1：注入自身代理
    @Autowired
    private UserService self;
    
    public void createUserWithLog(User user) {
        self.saveUser(user);  // 通过代理调用
        logService.recordLog("创建用户");
    }
    
    // 方案 2：拆分到另一个 Service
    @Autowired
    private UserCoreService userCoreService;
    
    public void createUserWithLog(User user) {
        userCoreService.saveUser(user);  // 不同类，走代理
        logService.recordLog("创建用户");
    }
    
    // 方案 3：使用 AopContext 获取当前代理
    public void createUserWithLog(User user) {
        ((UserService) AopContext.currentProxy()).saveUser(user);
        logService.recordLog("创建用户");
    }
}
```

### 3.2 非 public 方法

```java
@Service
public class OrderService {
    
    // 【失效】非 public 方法
    @Transactional
    private void internalProcess(Order order) {
        // 事务不会生效
    }
    
    // 【失效】protected 方法在某些情况下也可能失效
    @Transactional
    protected void protectedProcess(Order order) {
        // 依赖于代理实现，可能不生效
    }
    
    // ✅ 正确：public 方法
    @Transactional
    public void publicProcess(Order order) {
        // 事务生效
    }
}
```

**源码原因**：
```java
// AbstractFallbackTransactionAttributeSource.computeTransactionAttribute()
protected TransactionAttribute computeTransactionAttribute(
        Method method, @Nullable Class<?> targetClass) {
    
    // 只处理 public 方法
    if (allowPublicMethodsOnly() && !Modifier.isPublic(method.getModifiers())) {
        return null;  // 非 public 方法，不创建事务
    }
    
    // ... 继续处理
}
```

### 3.3 异常被捕获

```java
@Service
public class PaymentService {
    
    @Transactional
    public void processPayment(Payment payment) {
        try {
            // 扣减库存
            inventoryService.deduct(payment.getProductId(), payment.getQuantity());
            
            // 创建订单
            orderService.createOrder(payment);
            
            // 扣款
            balanceService.deduct(payment.getUserId(), payment.getAmount());
            
        } catch (InsufficientBalanceException e) {
            // 【问题】捕获异常后未抛出，事务认为成功，会提交！
            log.error("余额不足", e);
            // 应该：throw e; 或手动回滚
        }
    }
}
```

**正确做法**：

```java
@Service
public class PaymentService {
    
    @Autowired
    private PlatformTransactionManager transactionManager;
    
    @Transactional
    public void processPayment(Payment payment) {
        try {
            inventoryService.deduct(payment.getProductId(), payment.getQuantity());
            orderService.createOrder(payment);
            balanceService.deduct(payment.getUserId(), payment.getAmount());
            
        } catch (InsufficientBalanceException e) {
            log.error("余额不足", e);
            
            // 方案 1：继续抛出
            throw new BusinessException("支付失败：余额不足", e);
            
            // 方案 2：手动设置回滚
            // TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
        }
    }
}
```

### 3.4 rollbackFor 配置错误

```java
@Service
public class TransferService {
    
    // 【问题】默认只回滚 RuntimeException 和 Error
    @Transactional
    public void transfer(String from, String to, BigDecimal amount) 
            throws SQLException {
        // SQLException 是 Checked Exception
        // 默认不回滚，事务会提交！
        accountDao.transfer(from, to, amount);
    }
    
    // ✅ 正确：显式指定回滚异常
    @Transactional(rollbackFor = Exception.class)  // 所有异常都回滚
    public void transferSafe(String from, String to, BigDecimal amount) 
            throws Exception {
        accountDao.transfer(from, to, amount);
    }
    
    // 更精确的控制
    @Transactional(
        rollbackFor = {SQLException.class, BusinessException.class},
        noRollbackFor = {IllegalArgumentException.class}
    )
    public void transferPrecise(String from, String to, BigDecimal amount) {
        accountDao.transfer(from, to, amount);
    }
}
```

### 3.5 异步方法

```java
@Service
public class AsyncService {
    
    // 【问题】@Async 和 @Transactional 混用
    @Async
    @Transactional
    public CompletableFuture<Void> asyncProcess(Data data) {
        // 事务可能不生效，或在新线程中独立事务
        // 两个注解都会创建代理，顺序和优先级需要注意
        dao.save(data);
        return CompletableFuture.completedFuture(null);
    }
    
    // ✅ 正确做法：拆分，外层事务，内层异步
    @Service
    public class OuterService {
        @Autowired
        private InnerService innerService;
        
        @Transactional
        public void process(List<Data> datas) {
            for (Data data : datas) {
                // 异步执行，但事务边界在异步方法内
                innerService.asyncSave(data);
            }
        }
    }
    
    @Service
    public class InnerService {
        @Async
        @Transactional(propagation = Propagation.REQUIRES_NEW)
        public void asyncSave(Data data) {
            dao.save(data);
        }
    }
}
```

---

## 四、事务挂起与恢复机制

### 4.1 核心数据结构

```java
// TransactionSynchronizationManager ── 事务同步管理器
public abstract class TransactionSynchronizationManager {
    
    // 存储当前线程绑定的 ConnectionHolder（Key 是 DataSource）
    private static final ThreadLocal<Map<Object, Object>> resources =
        new NamedThreadLocal<>("Transactional resources");
    
    // 当前事务同步是否激活
    private static final ThreadLocal<Boolean> synchronizations =
        new NamedThreadLocal<>("Transaction synchronizations");
    
    // 当前事务名称
    private static final ThreadLocal<String> currentTransactionName =
        new NamedThreadLocal<>("Current transaction name");
    
    // 当前事务隔离级别
    private static final ThreadLocal<Integer> currentTransactionIsolationLevel =
        new NamedThreadLocal<>("Current transaction isolation level");
    
    // 当前事务是否只读
    private static final ThreadLocal<Boolean> actualTransactionActive =
        new NamedThreadLocal<>("Actual transaction active");
}

// SuspendedResourcesHolder ── 挂起的资源持有者
public static final class SuspendedResourcesHolder {
    private final Object suspendedResources;        // 挂起的 ConnectionHolder
    private final List<TransactionSynchronization> suspendedSynchronizations;
    private final String name;                      // 事务名称
    private final boolean readOnly;
    private final Integer isolationLevel;
    private final boolean wasActive;                // 原事务是否激活
}
```

### 4.2 事务挂起：suspend()

```java
// AbstractPlatformTransactionManager.suspend()
protected final SuspendedResourcesHolder suspend(@Nullable Object transaction) 
        throws TransactionSystemException {
    
    // 1. 检查并清空当前线程的事务同步
    if (TransactionSynchronizationManager.isSynchronizationActive()) {
        // 解绑所有资源（ConnectionHolder）
        List<TransactionSynchronization> suspendedSynchronizations = 
            TransactionSynchronizationManager.getSynchronizations();
        for (TransactionSynchronization synchronization : suspendedSynchronizations) {
            synchronization.suspend();
        }
        TransactionSynchronizationManager.clearSynchronization();
    }
    
    // 2. 保存当前事务状态
    String name = TransactionSynchronizationManager.getCurrentTransactionName();
    boolean readOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
    Integer isolationLevel = TransactionSynchronizationManager.getCurrentTransactionIsolationLevel();
    boolean wasActive = TransactionSynchronizationManager.isActualTransactionActive();
    
    // 3. 解绑当前线程的数据库连接
    Object suspendedResources = null;
    if (transaction != null) {
        suspendedResources = doSuspend(transaction);
    }
    
    // 4. 清空当前线程的事务属性
    TransactionSynchronizationManager.setActualTransactionActive(false);
    TransactionSynchronizationManager.setCurrentTransactionIsolationLevel(null);
    TransactionSynchronizationManager.setCurrentTransactionReadOnly(false);
    TransactionSynchronizationManager.setCurrentTransactionName(null);
    
    // 5. 返回挂起的资源持有者
    return new SuspendedResourcesHolder(
        suspendedResources, suspendedSynchronizations, 
        name, readOnly, isolationLevel, wasActive);
}
```

### 4.3 事务恢复：resume()

```java
// AbstractPlatformTransactionManager.resume()
protected final void resume(@Nullable Object transaction, 
        @Nullable SuspendedResourcesHolder resourcesHolder)
        throws TransactionSystemException {
    
    if (resourcesHolder != null) {
        Object suspendedResources = resourcesHolder.suspendedResources;
        
        // 1. 恢复数据库连接绑定
        if (suspendedResources != null) {
            doResume(transaction, suspendedResources);
        }
        
        // 2. 恢复事务属性
        TransactionSynchronizationManager.setCurrentTransactionName(resourcesHolder.name);
        TransactionSynchronizationManager.setCurrentTransactionReadOnly(resourcesHolder.readOnly);
        TransactionSynchronizationManager.setCurrentTransactionIsolationLevel(
            resourcesHolder.isolationLevel);
        TransactionSynchronizationManager.setActualTransactionActive(resourcesHolder.wasActive);
        
        // 3. 恢复事务同步
        if (resourcesHolder.suspendedSynchronizations != null) {
            TransactionSynchronizationManager.initSynchronization();
            for (TransactionSynchronization synchronization : 
                    resourcesHolder.suspendedSynchronizations) {
                synchronization.resume();
                TransactionSynchronizationManager.registerSynchronization(synchronization);
            }
        }
    }
}
```

### 4.4 REQUIRES_NEW 完整执行流程

```java
// AbstractPlatformTransactionManager.handleExistingTransaction()
private TransactionStatus handleExistingTransaction(
        TransactionDefinition definition, Object transaction, boolean debugEnabled)
        throws TransactionException {
    
    // 传播行为是 REQUIRES_NEW
    if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW) {
        // 1. 【挂起】当前事务
        SuspendedResourcesHolder suspendedResources = suspend(transaction);
        
        try {
            // 2. 【开启】新事务
            return startTransaction(definition, transaction, debugEnabled, suspendedResources);
            
            // 新事务执行期间，当前线程绑定的是新 ConnectionHolder
            // 原事务的 ConnectionHolder 保存在 suspendedResources 中
            
        } catch (Exception ex) {
            // 3. 异常时恢复（正常提交/回滚后也会恢复）
            resumeAfterBeginException(transaction, suspendedResources, ex);
            throw ex;
        }
    }
    
    // ... 其他传播行为处理
}
```

### 4.5 挂起恢复流程图

```
ThreadLocal 状态变化:

初始状态:
    resources = {DataSource@1: ConnectionHolder@1(T1)}
    currentTransactionName = "T1"
    actualTransactionActive = true
    │
    │ 调用 REQUIRES_NEW 方法
    ▼

1. suspend() ── 挂起 T1
    │
    ├── suspendedResources = ConnectionHolder@1
    ├── resources.remove(DataSource@1) ──► 解绑
    └── 保存 T1 的名称、隔离级别、只读状态到 SuspendedResourcesHolder
    │
    ▼

ThreadLocal 状态 (空):
    resources = {}
    currentTransactionName = null
    actualTransactionActive = false
    │
    ▼

2. startTransaction() ── 开启 T2
    │
    ├── 从 DataSource 获取新连接 Connection@2
    ├── resources.put(DataSource@1, ConnectionHolder@2(T2))
    └── 设置 T2 的事务属性
    │
    ▼

ThreadLocal 状态 (T2):
    resources = {DataSource@1: ConnectionHolder@2(T2)}
    currentTransactionName = "T2"
    actualTransactionActive = true
    │
    │ T2 执行完毕
    ▼

3. commit/rollback T2
    │
    ├── Connection@2.commit() / rollback()
    ├── 关闭 Connection@2
    └── resources.remove(DataSource@1)
    │
    ▼

ThreadLocal 状态 (空):
    resources = {}
    │
    ▼

4. resume() ── 恢复 T1
    │
    ├── resources.put(DataSource@1, ConnectionHolder@1(T1))
    └── 恢复 T1 的事务属性
    │
    ▼

最终状态 (恢复原状):
    resources = {DataSource@1: ConnectionHolder@1(T1)}
    currentTransactionName = "T1"
    actualTransactionActive = true
    │
    │ T1 继续执行
    ▼

【完成】T2 独立提交，T1 继续执行，两者完全隔离
```

---

## 五、事务同步机制

### 5.1 TransactionSynchronization 接口

```java
public interface TransactionSynchronization extends Flushable {
    
    // 事务挂起时调用
    default void suspend() {}
    
    // 事务恢复时调用
    default void resume() {}
    
    // 刷新时调用（如 Hibernate Session.flush()）
    @Override
    default void flush() {}
    
    // 事务提交前调用（仍在事务中，可回滚）
    default void beforeCommit(boolean readOnly) {}
    
    // 事务提交/回滚前调用
    default void beforeCompletion() {}
    
    // 事务提交后调用（已提交，无法回滚）
    default void afterCommit() {}
    
    // 事务完成（提交或回滚）后调用
    default void afterCompletion(int status) {}
}

// 状态常量
int STATUS_COMMITTED = 0;
int STATUS_ROLLED_BACK = 1;
int STATUS_UNKNOWN = 2;
```

### 5.2 典型应用场景

```java
@Service
public class OrderService {
    
    @Transactional
    public void createOrder(Order order) {
        // 保存订单
        orderDao.save(order);
        
        // 注册事务同步：提交后发送消息
        TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    // 事务成功提交后执行
                    // 发送订单创建消息到 MQ
                    messageProducer.sendOrderCreatedMessage(order);
                }
                
                @Override
                public void afterCompletion(int status) {
                    if (status == STATUS_ROLLED_BACK) {
                        // 事务回滚后的清理工作
                        log.warn("订单创建事务回滚，orderId={}", order.getId());
                    }
                }
            }
        );
    }
}
```

> [!tip]
> **为什么要在 afterCommit 中发消息？**
> - 如果在事务中直接发消息，事务回滚后消息已发出，导致数据不一致
> - afterCommit 确保数据库事务已提交成功后再发消息
> - 实现了最终一致性

---

## 六、总结

```
                    Spring 事务管理核心架构

    声明层 @Transactional
    │
    ├── 传播行为: REQUIRED / REQUIRES_NEW / NESTED
    ├── 隔离级别: READ_COMMITTED / REPEATABLE_READ
    └── 回滚规则: rollbackFor / noRollbackFor
    │
    ▼

    拦截层 AOP代理
    │
    ├── TransactionInterceptor (事务拦截器)
    └── 匹配规则: Transactional 注解或 XML 配置
    │
    ▼

    核心层 PlatformTransactionManager
    │
    ├── DataSourceTransactionManager ── JDBC/MyBatis
    ├── JpaTransactionManager ───────── JPA
    └── 职责: 事务开启/提交/回滚/挂起/恢复
    │
    ▼

    资源层 ThreadLocal
    │
    ├── TransactionSynchronizationManager
    │       └── ConnectionHolder 管理
    ├── suspend() ──► 保存当前状态
    └── resume() ───► 恢复之前状态
    │
    ▼

    底层实现
    │
    ├── JDBC: Connection.setAutoCommit(false) / commit() / rollback()
    ├── Savepoint: Connection.setSavepoint() ── NESTED 实现
    └── 隔离级别: Connection.setTransactionIsolation()
```

---

> [!tip] 面试常考点
> 
> 1. **REQUIRED、REQUIRES_NEW、NESTED 的区别？**
>    - REQUIRED：加入已有事务，无则新建
>    - REQUIRES_NEW：挂起当前事务，新建独立事务（完全隔离）
>    - NESTED：在已有事务中创建 savepoint，可独立回滚
>
> 2. **Spring 事务失效的常见场景？**
>    - 同类内部 this 调用
>    - 非 public 方法
>    - 异常被捕获未抛出
>    - rollbackFor 配置不当（默认不回滚 Checked Exception）
>
> 3. **事务挂起和恢复是如何实现的？**
>    - 通过 ThreadLocal 存储当前事务的 ConnectionHolder 和属性
>    - suspend() 将当前状态保存到 SuspendedResourcesHolder，清空 ThreadLocal
>    - resume() 从 SuspendedResourcesHolder 恢复状态，重新绑定到 ThreadLocal
>
> 4. **为什么 NESTED 传播依赖数据库 savepoint？**
>    - NESTED 是 JDBC 3.0 特性，不是所有数据库都支持
>    - Spring 通过 Connection.setSavepoint() 和 rollback(savepoint) 实现
>    - 数据库不支持时，会降级为 REQUIRED