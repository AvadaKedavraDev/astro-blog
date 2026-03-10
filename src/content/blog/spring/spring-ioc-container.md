---
title: "Spring IoC 容器深度解析"
pubDate: 2025-03-09
description: "深入剖析 Spring IoC 容器核心机制：Bean 生命周期、三级缓存解决循环依赖、BeanDefinition 元数据模型"
tags: ["Spring", "IoC", "Java", "源码分析"]
readingTime: 25
pinned: true
series:
  name: "Spring 核心原理"
  order: 1
---

> Spring IoC（Inversion of Control）容器是整个 Spring 框架的基石。本文从源码层面深入解析 Bean 生命周期、循环依赖解决机制以及 BeanDefinition 的元数据模型。

---

## 一、Bean 生命周期：从源码看完整流程

### 1.1 生命周期时序图

```
开始
  │
  ▼
1. 实例化阶段 createBeanInstance
  │  (反射调用构造方法)
  ▼
2. 属性赋值阶段 populateBean
  │  (解析Autowired)
  ▼
3. Aware接口回调 invokeAwareMethods
  │
  ├── BeanNameAware
  ├── BeanFactoryAware
  └── ApplicationContextAware
  │
  ▼
4. BeanPostProcessor前置 postProcessBeforeInitialization
  │
  ▼
5. 初始化阶段 invokeInitMethods
  │
  ├── InitializingBean.afterPropertiesSet()
  └── 自定义 init-method
  │
  ▼
6. BeanPostProcessor后置 postProcessAfterInitialization
  │  (AOP代理创建 AbstractAutoProxyCreator)
  ▼
7. Bean就绪 → 存入 singletonObjects
  │
  ▼
供业务使用
  │
  ▼ (容器关闭)
8. 销毁阶段 destroyBean
  │
  ├── @PreDestroy
  ├── DisposableBean.destroy()
  └── 自定义 destroy-method
  │
  ▼
结束
```

### 1.2 核心源码解析

#### AbstractAutowireCapableBeanFactory.doCreateBean()

```java
protected Object doCreateBean(String beanName, RootBeanDefinition mbd, @Nullable Object[] args)
        throws BeanCreationException {
    
    // ========== 1. 实例化阶段 ==========
    // 创建 BeanWrapper，包装原始实例
    BeanWrapper instanceWrapper = createBeanInstance(beanName, mbd, args);
    Object bean = instanceWrapper.getWrappedInstance();
    
    // 如果是单例且允许循环依赖，提前暴露 ObjectFactory
    boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
            isSingletonCurrentlyInCreation(beanName));
    if (earlySingletonExposure) {
        // 【关键】将 lambda 表达式加入三级缓存 singletonFactories
        addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
    }
    
    // ========== 2. 属性赋值阶段 ==========
    // 填充属性，处理 @Autowired 依赖
    populateBean(beanName, mbd, instanceWrapper);
    
    // ========== 3. 初始化阶段 ==========
    // 执行初始化回调、Aware 接口、BeanPostProcessor
    Object exposedObject = initializeBean(beanName, bean, mbd);
    
    return exposedObject;
}
```

#### initializeBean() 方法详解

```java
protected Object initializeBean(String beanName, Object bean, @Nullable RootBeanDefinition mbd) {
    
    // 1. 执行 Aware 接口回调
    invokeAwareMethods(beanName, bean);
    
    // 2. BeanPostProcessor.postProcessBeforeInitialization
    Object wrappedBean = bean;
    if (mbd == null || !mbd.isSynthetic()) {
        wrappedBean = applyBeanPostProcessorsBeforeInitialization(wrappedBean, beanName);
    }
    
    // 3. 执行初始化方法
    invokeInitMethods(beanName, wrappedBean, mbd);
    
    // 4. BeanPostProcessor.postProcessAfterInitialization
    // 【关键】AOP 代理在此创建
    if (mbd == null || !mbd.isSynthetic()) {
        wrappedBean = applyBeanPostProcessorsAfterInitialization(wrappedBean, beanName);
    }
    
    return wrappedBean;
}
```

### 1.3 BeanPostProcessor 执行链

```java
// Spring 内置的 BeanPostProcessor 执行顺序：

// 1. AutowiredAnnotationBeanPostProcessor
//    - @Autowired/@Value 注入（实际在 populateBean 阶段完成）

// 2. CommonAnnotationBeanPostProcessor  
//    - @PostConstruct / @PreDestroy 处理
//    - JSR-250 标准注解

// 3. ApplicationContextAwareProcessor
//    - 处理各种 Aware 接口回调

// 4. AbstractAutoProxyCreator（继承自 BeanPostProcessor）
//    - postProcessAfterInitialization 中创建 AOP 代理
//    - 检查所有 Advisor，匹配则创建代理对象
```

> [!note]
> **关键理解**：BeanPostProcessor 是 Spring 扩展机制的核心。AOP 代理的创建时机是在 `postProcessAfterInitialization`，这意味着代理对象包装的是**已完成初始化的原始 Bean**。

---

## 二、循环依赖解决：三级缓存机制

### 2.1 什么是循环依赖

```java
@Component
public class A {
    @Autowired
    private B b;  // A 依赖 B
}

@Component
public class B {
    @Autowired
    private A a;  // B 依赖 A → 循环依赖
}
```

### 2.2 三级缓存数据结构

```java
// DefaultSingletonBeanRegistry.java

// 【一级缓存】完整单例 Bean：已完成实例化、属性填充、初始化
private final Map<String, Object> singletonObjects = new ConcurrentHashMap<>(256);

// 【二级缓存】早期引用：已实例化但未初始化（用于解决循环依赖）
private final Map<String, Object> earlySingletonObjects = new ConcurrentHashMap<>(16);

// 【三级缓存】单例工厂：用于生成早期引用的 lambda 表达式
private final Map<String, ObjectFactory<?>> singletonFactories = new HashMap<>(16);

// 当前正在创建的 Bean 名称（用于检测循环依赖）
private final Set<String> singletonsCurrentlyInCreation = Collections.newSetFromMap(new ConcurrentHashMap<>());
```

### 2.3 三级缓存解决流程

```
getBean("A")                                    singletonObjects (一级缓存)
    │                                               │
    ▼                                               ▼
doGetBean()                                      earlySingletonObjects (二级缓存)
    │                                               │
    ├── 标记 A 正在创建                             singletonFactories (三级缓存)
    │                                               │
    ▼                                               ▼
createBean("A")
    │
    ├── 实例化 A (构造方法) ──► A 的原始对象创建完成
    │
    ├── addSingletonFactory("A", lambda) ──► 放入三级缓存
    │
    ├── populateBean("A") 填充属性
    │       │
    │       └── 发现依赖 B → getBean("B")
    │               │
    │               ▼
    │           创建 B 流程
    │               │
    │               ├── 实例化 B
    │               │
    │               ├── addSingletonFactory("B", ...) ──► 放入三级缓存
    │               │
    │               ├── populateBean("B")
    │               │       │
    │               │       └── 发现依赖 A → getBean("A")
    │               │               │
    │               │               ▼
    │               │           getSingleton("A")
    │               │               │
    │               │               ├── 查一级缓存: null
    │               │               ├── 查二级缓存: null
    │               │               └── 【命中】三级缓存 ──► 执行lambda
    │               │                       │
    │               │                       ▼
    │               │                   返回 A 的早期引用
    │               │                       │
    │               │                       ▼
    │               │                   放入二级缓存
    │               │
    │               ├── 完成属性填充 (a 字段指向 A 的早期引用)
    │               │
    │               ├── 完成初始化
    │               │
    │               └── 加入一级缓存
    │                       │
    │                       ▼
    │               返回完整的 B 对象
    │
    ├── A 的 b 字段被赋值为完整的 B 对象
    │
    ├── 完成初始化
    │
    └── 加入一级缓存
```

### 2.4 核心源码：getSingleton()

```java
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    // 1. 先查一级缓存
    Object singletonObject = this.singletonObjects.get(beanName);
    
    // 2. 如果一级缓存没有，且该 Bean 正在创建中
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        // 3. 查二级缓存
        singletonObject = this.earlySingletonObjects.get(beanName);
        
        // 4. 二级缓存也没有，且允许早期引用
        if (singletonObject == null && allowEarlyReference) {
            // 5. 查三级缓存
            ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
            if (singletonFactory != null) {
                // 6. 执行工厂方法获取早期引用
                singletonObject = singletonFactory.getObject();
                // 7. 提升到二级缓存
                this.earlySingletonObjects.put(beanName, singletonObject);
                this.singletonFactories.remove(beanName);
            }
        }
    }
    return singletonObject;
}
```

### 2.5 为什么需要三级缓存？

> [!tip] 设计思考
> 
> **如果只有两级缓存（singletonObjects + earlySingletonObjects）**：
> - 循环依赖发生时，需要将半成品 Bean 直接放入 earlySingletonObjects
> - 但此时可能需要进行 AOP 代理，直接暴露原始对象会导致代理失效
> 
> **三级缓存的优势（singletonFactories）**：
> - 存储的是 `ObjectFactory` lambda 表达式，而非直接存储对象
> - 当需要获取早期引用时，lambda 可以智能决定：
>   - 如果需要 AOP，返回代理对象
>   - 如果不需要，返回原始对象
> - 保证**单个 Bean 的引用唯一性**

```java
// getEarlyBeanReference 源码
protected Object getEarlyBeanReference(String beanName, RootBeanDefinition mbd, Object bean) {
    Object exposedObject = bean;
    // 遍历所有 SmartInstantiationAwareBeanPostProcessor
    // 其中 AbstractAutoProxyCreator 会在此创建代理（如果需要）
    for (BeanPostProcessor bp : getBeanPostProcessors()) {
        if (bp instanceof SmartInstantiationAwareBeanPostProcessor) {
            SmartInstantiationAwareBeanPostProcessor ibp = 
                (SmartInstantiationAwareBeanPostProcessor) bp;
            exposedObject = ibp.getEarlyBeanReference(exposedObject, beanName);
        }
    }
    return exposedObject;
}
```

### 2.6 无法解决的循环依赖场景

> [!warning] 构造器循环依赖无法自动解决

```java
@Component
public class A {
    private final B b;
    
    // 构造器注入导致的循环依赖
    public A(B b) {  
        this.b = b;
    }
}

@Component
public class B {
    private final A a;
    
    public B(A a) {
        this.a = a;
    }
}
```

**原因分析**：
- 构造器注入时，必须先完成依赖的实例化才能创建当前对象
- 此时无法提前暴露 ObjectFactory（实例都还没创建）

**解决方案**：

```java
// 方案 1：使用 @Lazy 延迟注入
@Component
public class A {
    private final B b;
    
    public A(@Lazy B b) {  // 注入的是 B 的代理对象
        this.b = b;
    }
}

// 方案 2：改为 Setter/Field 注入
@Component
public class A {
    @Autowired
    private B b;
}
```

---

## 三、BeanFactory vs ApplicationContext

### 3.1 继承体系

```
BeanFactory (接口)
    │
    ├── getBean()
    ├── containsBean()
    ├── isSingleton()
    └── isPrototype()
    │
    ├── HierarchicalBeanFactory (接口) ────────┐
    │   └── 层级支持                           │
    │                                          │
    ├── AutowireCapableBeanFactory (接口) ─────┤
    │   └── 自动装配能力                       │
    │                                          │
    └── ListableBeanFactory (接口) ────────────┤
        └── 枚举能力                           │
                                               │
        DefaultListableBeanFactory (默认实现) ◄┘
        │
        ├── 完整 IoC 容器实现
        ├── BeanDefinition 注册
        └── 依赖注入
        │
        ApplicationContext (接口)
        │
        ├── 面向开发者
        ├── EnvironmentCapable
        ├── MessageSource
        ├── ApplicationEventPublisher
        └── ResourcePatternResolver
        │
        ├── ClassPathXmlApplicationContext
        │   └── XML 配置时代
        │
        └── AnnotationConfigApplicationContext
            └── 注解配置时代
```

### 3.2 功能对比

| 特性 | BeanFactory | ApplicationContext |
|------|-------------|-------------------|
| **Bean 实例化/依赖注入** | ✅ | ✅ |
| **Bean 生命周期管理** | 基础 | 完整（支持更多扩展点） |
| **国际化（i18n）** | ❌ | ✅ MessageSource |
| **事件发布** | ❌ | ✅ ApplicationEventPublisher |
| **资源加载** | 基础 URL | ✅ ResourcePatternResolver（通配符） |
| **AOP 集成** | 手动配置 | 自动代理创建 |
| **MessageSource** | ❌ | ✅ 国际化消息 |
| **Environment 抽象** | ❌ | ✅  profiles、properties |
| **ApplicationListener** | ❌ | ✅ 事件监听 |

### 3.3 ApplicationContext 核心实现

```java
// AbstractApplicationContext.refresh() ── 容器启动入口
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // 1. 准备刷新：初始化环境、验证必要属性
        prepareRefresh();
        
        // 2. 获取/刷新 BeanFactory
        // 子类实现：XML 方式或注解方式读取 BeanDefinition
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();
        
        // 3. 准备 BeanFactory：添加标准后置处理器、注册默认环境 Bean
        prepareBeanFactory(beanFactory);
        
        // 4. 【扩展点】子类重写，在 Bean 定义加载后、实例化前处理
        postProcessBeanFactory(beanFactory);
        
        // 5. 执行 BeanFactoryPostProcessor
        // 例如：ConfigurationClassPostProcessor 处理 @Configuration 类
        invokeBeanFactoryPostProcessors(beanFactory);
        
        // 6. 注册 BeanPostProcessor（注意：此时还未执行）
        registerBeanPostProcessors(beanFactory);
        
        // 7. 初始化 MessageSource（国际化）
        initMessageSource();
        
        // 8. 初始化 ApplicationEventMulticaster（事件广播器）
        initApplicationEventMulticaster();
        
        // 9. 【扩展点】子类重写，初始化其他特殊 Bean
        onRefresh();
        
        // 10. 注册 ApplicationListener
        registerListeners();
        
        // 11. 【核心】实例化所有非懒加载的单例 Bean
        finishBeanFactoryInitialization(beanFactory);
        
        // 12. 完成刷新：发布 ContextRefreshedEvent
        finishRefresh();
    }
}
```

---

## 四、BeanDefinition：元数据模型

### 4.1 BeanDefinition 继承体系

```
BeanDefinition (接口)
    │
    └── Bean 元数据定义：类名 / 作用域 / 依赖
    │
    AbstractBeanDefinition (抽象类)
    │
    ├── 公共属性存储
    └── 克隆方法
    │
    ├── GenericBeanDefinition ────────────────┐
    │   └── 通用定义                          │
    │       └── 支持任意 Bean 类型            │
    │                                         │
    ├── RootBeanDefinition                    │
    │   └── 运行时合并后的完整定义            │
    │                                         │
    ├── ChildBeanDefinition                   │
    │   └── 继承父配置的子定义                │
    │                                         │
    └── ScannedGenericBeanDefinition ◄────────┘
        └── 注解扫描场景
            └── @Component / @Service / @Repository
```

### 4.2 核心属性详解

```java
public interface BeanDefinition extends AttributeAccessor, BeanMetadataElement {
    
    // ========== 基础标识 ==========
    String getBeanClassName();           // 全限定类名
    void setScope(@Nullable String scope); // singleton/prototype
    boolean isSingleton();
    boolean isPrototype();
    boolean isLazyInit();                // 是否延迟初始化
    
    // ========== 依赖关系 ==========
    String[] getDependsOn();             // 显式依赖的 Bean 名称
    boolean isAutowireCandidate();       // 是否可以作为注入候选
    boolean isPrimary();                 // 同类型时的优先选择
    
    // ========== 工厂方法相关 ==========
    String getFactoryBeanName();         // 工厂 Bean 名称
    String getFactoryMethodName();       // 工厂方法名称
    
    // ========== 构造参数 & 属性值 ==========
    ConstructorArgumentValues getConstructorArgumentValues();
    MutablePropertyValues getPropertyValues();
    
    // ========== 初始化/销毁回调 ==========
    String getInitMethodName();
    String getDestroyMethodName();
    
    // ========== 角色标识 ==========
    int ROLE_APPLICATION = 0;    // 用户定义的 Bean
    int ROLE_SUPPORT = 1;        // 支持性功能（非重要）
    int ROLE_INFRASTRUCTURE = 2; // 内部基础设施（如后置处理器）
}
```

### 4.3 不同场景下的 BeanDefinition

```java
// 场景 1：XML 配置
<bean id="userService" class="com.example.UserService" 
      scope="singleton" init-method="init">
    <property name="userDao" ref="userDao"/>
</bean>
// 对应：GenericBeanDefinition

// 场景 2：注解扫描
@Component
@Service
@Repository
// 对应：ScannedGenericBeanDefinition

// 场景 3：@Bean 方法
@Configuration
public class Config {
    @Bean(initMethod = "init")
    public UserService userService() {
        return new UserService();
    }
}
// 对应：ConfigurationClassBeanDefinition

// 场景 4：Bean 定义继承
<bean id="parent" abstract="true" class="com.example.BaseService">
    <property name="commonProp" value="xxx"/>
</bean>
<bean id="child" parent="parent" class="com.example.ChildService"/>
// parent：AbstractBeanDefinition
// child：ChildBeanDefinition，继承 parent 的属性
```

### 4.4 BeanDefinition 合并：MergedBeanDefinition

```java
// 父子 BeanDefinition 合并流程
protected RootBeanDefinition getMergedBeanDefinition(
        String beanName, BeanDefinition bd, @Nullable BeanDefinition containingBd) {
    
    synchronized (this.mergedBeanDefinitions) {
        RootBeanDefinition mbd = null;
        
        // 检查缓存
        mbd = this.mergedBeanDefinitions.get(beanName);
        if (mbd != null) {
            return mbd;
        }
        
        // 如果有父定义，进行合并
        if (bd.getParentName() == null) {
            // 无父定义，直接转换
            if (bd instanceof RootBeanDefinition) {
                mbd = ((RootBeanDefinition) bd).cloneBeanDefinition();
            } else {
                mbd = new RootBeanDefinition(bd);
            }
        } else {
            // 有父定义，递归合并
            String parentBeanName = bd.getParentName();
            BeanDefinition pbd = getMergedBeanDefinition(parentBeanName);
            
            // 深拷贝父定义
            mbd = new RootBeanDefinition(pbd);
            // 用子定义覆盖父定义属性
            mbd.overrideFrom(bd);
        }
        
        // 设置默认作用域
        if (!StringUtils.hasLength(mbd.getScope())) {
            mbd.setScope(RootBeanDefinition.SCOPE_SINGLETON);
        }
        
        // 缓存合并后的定义
        this.mergedBeanDefinitions.put(beanName, mbd);
        return mbd;
    }
}
```

> [!important]
> **MergedBeanDefinition 的意义**：
> - XML 时代常用父子继承减少重复配置
> - 运行时统一使用 RootBeanDefinition，简化后续处理逻辑
> - 合并后的定义包含完整的继承属性

---

## 五、总结

```
                    Spring IoC 容器核心架构

    BeanDefinition 元数据层
    │
    ├── 描述 Bean 的类、作用域、依赖、生命周期回调
    ├── ScannedGenericBeanDefinition（注解扫描）
    └── RootBeanDefinition（运行时合并后）
    │
    ▼

    BeanFactory 核心容器层
    │
    ├── DefaultListableBeanFactory：完整 IoC 实现
    └── 三级缓存：singletonObjects/earlySingletonObjects/
                 singletonFactories（解决循环依赖）
    │
    ▼

    ApplicationContext 应用上下文层
    │
    ├── 继承 BeanFactory 的所有能力
    ├── 扩展：国际化、事件发布、资源加载、AOP集成
    └── refresh() 启动容器，完成所有非懒加载 Bean 的初始化

    Bean 生命周期核心扩展点
    │
    ├── BeanFactoryPostProcessor：修改 BeanDefinition
    ├── BeanPostProcessor：干预 Bean 实例化/初始化过程
    ├── Aware 接口：获取容器基础设施
    └── InitializingBean/DisposableBean：生命周期回调
```

---

> [!tip] 面试常考点
> 
> 1. **三级缓存具体是哪三个？为什么需要三级而不是两级？**
>    - 答：singletonObjects、earlySingletonObjects、singletonFactories；三级缓存存储的是 ObjectFactory，可以在获取早期引用时智能创建 AOP 代理，保证引用唯一性。
>
> 2. **Bean 生命周期中，AOP 代理是在哪一步创建的？**
>    - 答：BeanPostProcessor.postProcessAfterInitialization，在初始化方法执行之后。
>
> 3. **构造器循环依赖为什么无法解决？**
>    - 答：构造器注入需要先完成依赖的实例化才能创建当前对象，此时无法提前暴露 ObjectFactory。
>
> 4. **BeanFactory 和 ApplicationContext 的本质区别？**
>    - 答：BeanFactory 是基础 IoC 容器；ApplicationContext 是面向开发者的完整容器，额外提供国际化、事件、资源加载等企业级功能。