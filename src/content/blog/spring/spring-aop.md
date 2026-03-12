---
title: "Spring AOP 原理深度剖析"
pubDate: 2025-03-09
description: "深入理解 Spring AOP 实现机制：JDK 动态代理与 CGLIB 原理、切面织入时机、AbstractAutoProxyCreator 创建流程"
tags: ["Spring", "AOP", "代理模式", "源码分析"]
readingTime: 22
pinned: true
series:
  name: "Spring 核心原理"
  order: 2
---

> Spring AOP（Aspect-Oriented Programming）为面向切面编程提供了优雅的实现。本文从代理创建、方法拦截到切面织入，逐层深入 Spring AOP 的核心机制。

---

## 一、动态代理：JDK Proxy vs CGLIB

### 1.1 两种代理方式对比

| 特性 | JDK 动态代理 | CGLIB 代理 |
|------|--------------|------------|
| **实现原理** | 实现 InvocationHandler 接口 | 继承目标类，重写方法 |
| **要求** | 目标类必须实现接口 | 目标类不能是 final |
| **生成方式** | 运行时生成字节码（ProxyGenerator） | ASM 生成字节码 |
| **性能** | 反射调用，略慢 | FastClass 机制，更快 |
| **目标方法限制** | 接口定义的方法 | 非 final、非 private 方法 |
| **Spring 选择** | 目标有接口时优先 | 无接口或强制指定时使用 |

### 1.2 JDK 动态代理原理

```java
// ========== 核心接口 ==========
public interface InvocationHandler {
    // proxy: 代理对象本身
    // method: 被调用的方法
    // args: 方法参数
    Object invoke(Object proxy, Method method, Object[] args) throws Throwable;
}

// ========== 使用示例 ==========
public interface UserService {
    void saveUser(String name);
}

public class UserServiceImpl implements UserService {
    public void saveUser(String name) {
        System.out.println("保存用户: " + name);
    }
}

// 创建代理
UserService proxy = (UserService) Proxy.newProxyInstance(
    UserService.class.getClassLoader(),           // 类加载器
    new Class<?>[] { UserService.class },         // 代理接口数组
    new InvocationHandler() {
        private final UserService target = new UserServiceImpl();
        
        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            System.out.println("[前置增强] 方法: " + method.getName());
            Object result = method.invoke(target, args);  // 反射调用目标
            System.out.println("[后置增强] 返回值: " + result);
            return result;
        }
    }
);

proxy.saveUser("张三");
```

#### 生成的代理类结构

```java
// 运行时生成的代理类（大致结构）
public final class $Proxy0 extends Proxy implements UserService {
    private static Method m1;  // saveUser 方法
    private static Method m0;  // equals 方法
    private static Method m2;  // toString 方法
    private static Method m3;  // hashCode 方法
    
    // 构造器接收 InvocationHandler
    public $Proxy0(InvocationHandler handler) {
        super(handler);
    }
    
    @Override
    public void saveUser(String name) {
        try {
            // 所有方法调用都转发给 InvocationHandler
            h.invoke(this, m1, new Object[]{name});
        } catch (Throwable e) {
            throw new UndeclaredThrowableException(e);
        }
    }
    
    // equals、toString、hashCode 同理...
}
```

> [!note]
> **JDK 代理的限制**：只能代理接口中定义的方法。如果目标类有自定义方法未在接口中声明，无法被代理。

### 1.3 CGLIB 代理原理

```java
// ========== CGLIB 核心组件 ==========

// 1. Enhancer：增强器，用于生成代理类
Enhancer enhancer = new Enhancer();

// 2. MethodInterceptor：方法拦截器（相当于 JDK 的 InvocationHandler）
public interface MethodInterceptor extends Callback {
    // obj: 代理对象
    // method: 被拦截的方法
    // args: 方法参数
    // proxy: 用于调用父类（目标类）的方法
    Object intercept(Object obj, Method method, Object[] args, 
                     MethodProxy proxy) throws Throwable;
}

// ========== 使用示例 ==========
public class OrderService {
    public void createOrder(String orderId) {
        System.out.println("创建订单: " + orderId);
    }
    
    public void cancelOrder(String orderId) {
        System.out.println("取消订单: " + orderId);
    }
}

// CGLIB 代理创建
Enhancer enhancer = new Enhancer();
enhancer.setSuperclass(OrderService.class);  // 设置父类
enhancer.setCallback(new MethodInterceptor() {
    @Override
    public Object intercept(Object obj, Method method, Object[] args, 
                           MethodProxy proxy) throws Throwable {
        System.out.println("[CGLIB 前置] " + method.getName());
        
        // 调用父类（目标类）的方法
        // proxy.invokeSuper 是 CGLIB 的优化调用
        Object result = proxy.invokeSuper(obj, args);
        
        System.out.println("[CGLIB 后置] " + method.getName());
        return result;
    }
});

OrderService proxy = (OrderService) enhancer.create();
proxy.createOrder("ORD-001");
```

#### CGLIB 生成的代理类

```java
// CGLIB 生成的代理类（反编译后）
public class OrderService$$EnhancerByCGLIB$$a1b2c3d extends OrderService {
    private MethodInterceptor interceptor;
    private static final Method createOrder$Method;
    private static final MethodProxy createOrder$Proxy;
    
    // 生成的代理方法
    @Override
    public final void createOrder(String orderId) {
        if (interceptor != null) {
            // 通过方法拦截器调用
            interceptor.intercept(this, createOrder$Method, 
                                  new Object[]{orderId}, createOrder$Proxy);
        } else {
            super.createOrder(orderId);
        }
    }
    
    // FastClass 机制优化反射调用
    static {
        CGLIB$STATICHOOK1();
    }
    static void CGLIB$STATICHOOK1() {
        ClassLoader loader = OrderService$$EnhancerByCGLIB$$a1b2c3d.class.getClassLoader();
        Class[] args = new Class[]{String.class};
        
        // 创建 MethodProxy，内部使用 FastClass 优化
        createOrder$Proxy = MethodProxy.create(
            loader,                                        // 类加载器
            OrderService.class,                           // 目标类
            OrderService$$EnhancerByCGLIB$$a1b2c3d.class, // 代理类
            args,                                         // 参数类型
            CGLIB$createOrder$0$Method,                   // 代理方法签名
            CGLIB$createOrder$0$Proxy                     // 增强方法签名
        );
    }
}
```

#### FastClass 优化机制

```java
// CGLIB 为每个类生成对应的 FastClass，避免反射开销
public class OrderService$$FastClassByCGLIB$$e4f5g6h extends FastClass {
    
    // 为每个方法分配索引
    @Override
    public int getIndex(String name, Class[] params) {
        if (name.equals("createOrder") && params.length == 1 
            && params[0] == String.class) {
            return 12;  // createOrder 方法索引为 12
        }
        if (name.equals("cancelOrder") && params.length == 1 
            && params[0] == String.class) {
            return 15;  // cancelOrder 方法索引为 15
        }
        return -1;
    }
    
    // 通过索引直接调用，无需反射
    @Override
    public Object invoke(int index, Object target, Object[] args) {
        OrderService service = (OrderService) target;
        switch (index) {
            case 12:  // createOrder
                service.createOrder((String) args[0]);
                return null;
            case 15:  // cancelOrder
                service.cancelOrder((String) args[0]);
                return null;
            default:
                throw new IllegalArgumentException("非法索引: " + index);
        }
    }
}
```

> [!tip] 性能对比
> 
> | 调用方式 | 1.8 JVM | 17+ JVM（反射优化后）|
> |----------|---------|---------------------|
> | 直接调用 | 1x | 1x |
> | JDK 反射 | ~10x | ~1.5x |
> | CGLIB FastClass | ~3x | ~2x |
> 
> 现代 JVM 对反射做了大量优化（MethodHandle、 inflatable 机制），JDK 代理与 CGLIB 的性能差距已大幅缩小。

---

## 二、切面织入时机

### 2.1 三种织入时机对比

| 织入时机 | 代表技术 | 原理                               | 特点 |
|----------|----------|----------------------------------|------|
| **编译期** | AspectJ（AJC 编译器） | 编译时修改源代码                         | 性能最好，需要特定编译器 |
| **类加载期** | AspectJ（LTW） | ClassLoader 加载时修改字节码,适用无法获取源码的情况 | 需要 javaagent |
| **运行期** | Spring AOP | 运行时创建代理对象                        | 使用简单，有一定性能开销 |

```
编译期织入:

    Java 源码 ──► AJC 编译器 ──► 字节码(已织入切面)

类加载期织入:

    字节码 ──► Agent 拦截 ──► Instrument 修改 ──► 加载到 JVM

运行期织入 (Spring AOP):

    目标类 ──► 创建代理对象 ──► 代理拦截调用 ──► 执行增强逻辑
```

### 2.2 Spring AOP 的运行期织入

```
1. 定义切面类
   │
   ├── @Aspect @Component
   └── @Before / @After / @Around
   │
   ▼

2. 解析切面 (AnnotationAwareAspectJAutoProxyCreator)
   │
   ├── 解析为 Advisor
   │       ├── Pointcut: execution 表达式
   │       └── Advice: 通知实现类
   │
   ▼

3. 创建代理 (BeanPostProcessor 介入)
   │
   ├── postProcessAfterInitialization
   │
   ├── 匹配 Advisor
   │
   └── 匹配成功?
       │
       ├── 是 ──► 创建代理 (JDK/CGLIB)
       │
       └── 否 ──► 原 Bean 返回
       │
       ▼

4. 方法调用拦截
   │
   ├── 代理对象调用
   │
   ├── ExposeInvocationInterceptor
   │
   ├── AspectJAfterThrowingAdvice (异常通知)
   │
   ├── AspectJAfterReturningAdvice (返回通知)
   │
   ├── AspectJAfterAdvice (后置通知 finally)
   │
   ├── AspectJAroundAdvice / AspectJMethodBeforeAdvice
   │
   └── 目标方法执行
```

### 2.3 通知执行顺序

```java
@Aspect
@Component
public class AuditAspect {
    
    @Around("servicePointcut()")
    public Object around(ProceedingJoinPoint pjp) throws Throwable {
        System.out.println("Around - 前");
        try {
            Object result = pjp.proceed();  // 执行目标方法
            System.out.println("Around - 后");
            return result;
        } catch (Exception e) {
            System.out.println("Around - 异常");
            throw e;
        }
    }
    
    @Before("servicePointcut()")
    public void before() {
        System.out.println("Before");
    }
    
    @After("servicePointcut()")
    public void after() {
        System.out.println("After（finally）");
    }
    
    @AfterReturning("servicePointcut()")
    public void afterReturning() {
        System.out.println("AfterReturning");
    }
    
    @AfterThrowing("servicePointcut()")
    public void afterThrowing() {
        System.out.println("AfterThrowing");
    }
}
```

**正常执行输出**：
```
Around - 前
Before
[目标方法执行]
AfterReturning
After（finally）
Around - 后
```

**异常执行输出**：
```
Around - 前
Before
[目标方法抛出异常]
AfterThrowing
After（finally）
Around - 异常
```

> [!warning]
> **通知顺序陷阱**：
> - Spring 4.x：通知执行顺序与声明顺序相反
> - Spring 5.x+：按 @Order 或声明顺序执行
> - 同类中多个同类型通知，顺序不可预期

---

## 三、代理对象创建：AbstractAutoProxyCreator

### 3.1 核心类继承关系

```
BeanPostProcessor (接口)
    │
    ├── postProcessBeforeInitialization()
    └── postProcessAfterInitialization() ── 代理创建入口
    │
    InstantiationAwareBeanPostProcessor (子接口)
    │
    ├── postProcessBeforeInstantiation() ── 可返回代理替代目标
    ├── postProcessAfterInstantiation()
    └── postProcessProperties()
    │
    SmartInstantiationAwareBeanPostProcessor (子接口)
    │
    ├── getEarlyBeanReference() ─────────── 三级缓存中提前暴露代理
    ├── predictBeanType()
    └── determineCandidateConstructors()
    │
    AbstractAutoProxyCreator (抽象类)
    │
    ├── postProcessAfterInstantiation() ─── 核心方法
    ├── getAdvicesAndAdvisorsForBean() ──── 模板方法
    └── createProxy() ───────────────────── 创建代理对象
    │
    ├── AspectJAwareAdvisorAutoProxyCreator ── 默认 AOP 实现
    │
    └── InfrastructureAdvisorAutoProxyCreator ── 事务代理创建
```

### 3.2 AbstractAutoProxyCreator 核心源码

```java
public abstract class AbstractAutoProxyCreator 
        extends ProxyProcessorSupport
        implements SmartInstantiationAwareBeanPostProcessor, BeanFactoryAware {
    
    // ========== 1. 提前暴露代理（解决循环依赖）==========
    @Override
    public Object getEarlyBeanReference(Object bean, String beanName) {
        Object cacheKey = getCacheKey(bean.getClass(), beanName);
        this.earlyProxyReferences.put(cacheKey, bean);
        return wrapIfNecessary(bean, beanName, cacheKey);
    }
    
    // ========== 2. Bean 初始化后创建代理 ==========
    @Override
    public Object postProcessAfterInitialization(@Nullable Object bean, String beanName) {
        if (bean != null) {
            Object cacheKey = getCacheKey(bean.getClass(), beanName);
            
            // 如果早期引用阶段已经创建过代理，跳过
            if (this.earlyProxyReferences.remove(cacheKey) != bean) {
                return wrapIfNecessary(bean, beanName, cacheKey);
            }
        }
        return bean;
    }
    
    // ========== 3. 包装代理的核心逻辑 ==========
    protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
        // 跳过不需要代理的 Bean（基础设施类、已处理过的）
        if (Boolean.FALSE.equals(advisedBeans.get(cacheKey))) {
            return bean;
        }
        
        // 【核心】获取适用于当前 Bean 的 Advisors
        Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(
            bean.getClass(), beanName, null);
        
        // 如果没有匹配的 Advisor，标记为不需要代理
        if (specificInterceptors == DO_NOT_PROXY) {
            advisedBeans.put(cacheKey, Boolean.FALSE);
            return bean;
        }
        
        // 需要代理，标记为已处理
        advisedBeans.put(cacheKey, Boolean.TRUE);
        
        // 【核心】创建代理对象
        Object proxy = createProxy(
            bean.getClass(), beanName, specificInterceptors, 
            new SingletonTargetSource(bean));
        
        // 缓存代理类型
        proxyTypes.put(cacheKey, proxy.getClass());
        return proxy;
    }
}
```

### 3.3 Advisor 匹配流程

```java
// AbstractAdvisorAutoProxyCreator.java

protected Object[] getAdvicesAndAdvisorsForBean(
        Class<?> beanClass, String beanName, @Nullable TargetSource targetSource) {
    
    // 1. 查找所有候选 Advisor
    List<Advisor> advisors = findEligibleAdvisors(beanClass, beanName);
    
    // 2. 如果没有匹配的，返回 DO_NOT_PROXY
    if (advisors.isEmpty()) {
        return DO_NOT_PROXY;
    }
    
    // 3. 返回匹配的 Advisors
    return advisors.toArray();
}

protected List<Advisor> findEligibleAdvisors(Class<?> beanClass, String beanName) {
    // 1. 获取所有 Advisor（包括 @Aspect 解析出的和手动注册的）
    List<Advisor> candidateAdvisors = findCandidateAdvisors();
    
    // 2. 筛选适用于当前 Bean 的 Advisor
    List<Advisor> eligibleAdvisors = findAdvisorsThatCanApply(
        candidateAdvisors, beanClass, beanName);
    
    // 3. 扩展 Advisor 链（添加 ExposeInvocationInterceptor）
    extendAdvisors(eligibleAdvisors);
    
    // 4. 排序（@Order 或 Ordered 接口）
    if (!eligibleAdvisors.isEmpty()) {
        eligibleAdvisors = sortAdvisors(eligibleAdvisors);
    }
    
    return eligibleAdvisors;
}
```

### 3.4 Pointcut 匹配原理

```java
// AopUtils.canApply() ── 判断 Advisor 是否适用于目标类
public static boolean canApply(Pointcut pc, Class<?> targetClass, boolean hasIntroductions) {
    // 1. 类级别匹配
    if (!pc.getClassFilter().matches(targetClass)) {
        return false;
    }
    
    // 2. 获取方法匹配器
    MethodMatcher methodMatcher = pc.getMethodMatcher();
    
    // 3. 遍历目标类及父类的所有方法
    for (Class<?> clazz : targetClass.getClass()) {
        Method[] methods = clazz.getDeclaredMethods();
        for (Method method : methods) {
            // 4. 方法级别匹配
            if (methodMatcher.matches(method, targetClass)) {
                return true;  // 任一方法匹配即适用
            }
        }
    }
    
    return false;
}
```

### 3.5 创建代理对象

```java
protected Object createProxy(Class<?> beanClass, @Nullable String beanName,
        @Nullable Object[] specificInterceptors, TargetSource targetSource) {
    
    // 1. 创建 ProxyFactory
    ProxyFactory proxyFactory = new ProxyFactory();
    proxyFactory.copyFrom(this);
    
    // 2. 设置目标源
    proxyFactory.setTargetSource(targetSource);
    
    // 3. 设置代理接口（决定使用 JDK 还是 CGLIB）
    if (!proxyFactory.isProxyTargetClass()) {
        // 检查目标类是否实现了接口
        if (shouldProxyTargetClass(beanClass, beanName)) {
            proxyFactory.setProxyTargetClass(true);  // 强制 CGLIB
        } else {
            // 评估并添加代理接口
            evaluateProxyInterfaces(beanClass, proxyFactory);
        }
    }
    
    // 4. 构建 Advisor 数组
    Advisor[] advisors = buildAdvisors(beanName, specificInterceptors);
    proxyFactory.addAdvisors(advisors);
    
    // 5. 生成代理对象
    return proxyFactory.getProxy(getProxyClassLoader());
}
```

### 3.6 代理选择策略

```java
// ProxyFactory.getProxy()
public Object getProxy(@Nullable ClassLoader classLoader) {
    // 根据配置创建对应的 AopProxy
    return createAopProxy().getProxy(classLoader);
}

// DefaultAopProxyFactory.createAopProxy()
public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
    // 强制 CGLIB 的情况：
    // 1. proxyTargetClass = true（@EnableAspectJAutoProxy(proxyTargetClass=true)）
    // 2. 没有实现接口
    // 3. 目标类是接口（只能 CGLIB）
    if (config.isProxyTargetClass() || 
        config.getProxiedInterfaces().length == 0 ||
        (config.getTargetClass() != null && config.getTargetClass().isInterface())) {
        return new ObjenesisCglibAopProxy(config);
    }
    
    // 否则使用 JDK 动态代理
    return new JdkDynamicAopProxy(config);
}
```

---

## 四、方法调用拦截链

### 4.1 ReflectiveMethodInvocation 责任链

```java
// JdkDynamicAopProxy.invoke() ── 代理方法入口
public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
    MethodInvocation invocation;
    
    // 获取当前方法的拦截器链
    List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(
        method, targetClass);
    
    if (chain.isEmpty()) {
        // 无拦截器，直接反射调用
        retVal = AopUtils.invokeJoinpointUsingReflection(target, method, argsToUse);
    } else {
        // 创建 MethodInvocation，启动责任链
        invocation = new ReflectiveMethodInvocation(
            proxy, target, method, args, targetClass, chain);
        retVal = invocation.proceed();
    }
    
    return retVal;
}
```

### 4.2 拦截器链执行流程

```java
public class ReflectiveMethodInvocation implements ProxyMethodInvocation {
    private int currentInterceptorIndex = -1;
    private final List<?> interceptorsAndDynamicMethodMatchers;
    
    public Object proceed() throws Throwable {
        // 所有拦截器执行完毕，调用目标方法
        if (this.currentInterceptorIndex == 
            this.interceptorsAndDynamicMethodMatchers.size() - 1) {
            return invokeJoinpoint();  // 执行目标方法
        }
        
        // 获取下一个拦截器
        Object interceptorOrInterceptionAdvice =
            this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);
        
        if (interceptorOrInterceptionAdvice instanceof InterceptorAndDynamicMethodMatcher) {
            // 动态匹配（运行时决定）
            InterceptorAndDynamicMethodMatcher dm = 
                (InterceptorAndDynamicMethodMatcher) interceptorOrInterceptionAdvice;
            Class<?> targetClass = (this.targetClass != null ? this.targetClass : 
                                   this.method.getDeclaringClass());
            
            if (dm.methodMatcher.matches(this.method, targetClass, this.arguments)) {
                return dm.interceptor.invoke(this);
            } else {
                // 不匹配，跳过
                return proceed();
            }
        } else {
            // 静态匹配，直接调用
            return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
        }
    }
}
```

### 4.3 各类通知的拦截器实现

```java
// ========== 前置通知 ==========
public class MethodBeforeAdviceInterceptor implements MethodInterceptor {
    private final MethodBeforeAdvice advice;
    
    public Object invoke(MethodInvocation mi) throws Throwable {
        this.advice.before(mi.getMethod(), mi.getArguments(), mi.getThis());
        return mi.proceed();  // 继续链
    }
}

// ========== 后置通知 ==========
public class AspectJAfterAdvice extends AbstractAspectJAdvice implements MethodInterceptor {
    public Object invoke(MethodInvocation mi) throws Throwable {
        try {
            return mi.proceed();
        } finally {
            invokeAdviceMethod(getJoinPointMatch(), null, null);  // finally 执行
        }
    }
}

// ========== 返回通知 ==========
public class AfterReturningAdviceInterceptor implements MethodInterceptor {
    public Object invoke(MethodInvocation mi) throws Throwable {
        Object retVal = mi.proceed();
        this.advice.afterReturning(retVal, mi.getMethod(), mi.getArguments(), mi.getThis());
        return retVal;
    }
}

// ========== 异常通知 ==========
public class AspectJAfterThrowingAdvice extends AbstractAspectJAdvice implements MethodInterceptor {
    public Object invoke(MethodInvocation mi) throws Throwable {
        try {
            return mi.proceed();
        } catch (Throwable ex) {
            if (shouldInvokeOnThrowing(ex)) {
                invokeAdviceMethod(getJoinPointMatch(), null, ex);
            }
            throw ex;
        }
    }
}

// ========== 环绕通知 ==========
public class AspectJAroundAdvice extends AbstractAspectJAdvice implements MethodInterceptor {
    public Object invoke(MethodInvocation mi) throws Throwable {
        // 创建 ProceedingJoinPoint
        ProxyMethodInvocation pmi = (ProxyMethodInvocation) mi;
        ProceedingJoinPoint pjp = lazyGetProceedingJoinPoint(pmi);
        
        // 调用用户定义的环绕通知方法
        return invokeAdviceMethod(pjp, null, null);
        // 用户代码中需要手动调用 pjp.proceed() 才会继续
    }
}
```

---

## 五、总结

```
                       Spring AOP 整体架构

    声明层（开发者使用）
    │
    ├── @Aspect / @Pointcut / @Before / @After / @Around
    └── @EnableAspectJAutoProxy
    │
    ▼

    解析层（配置转换）
    │
    ├── AspectJAutoProxyBeanDefinitionParser
    ├── AnnotationAwareAspectJAutoProxyCreator（BeanPostProcessor）
    └── 解析 @Aspect → Advisor（Pointcut + Advice）
    │
    ▼

    代理层（对象创建）
    │
    ├── AbstractAutoProxyCreator.postProcessAfterInitialization()
    ├── 匹配判断：AopUtils.canApply()
    ├── 代理选择：JdkDynamicAopProxy vs ObjenesisCglibAopProxy
    └── ProxyFactory.getProxy()
    │
    ▼

    执行层（方法拦截）
    │
    ├── ReflectiveMethodInvocation（责任链模式）
    ├── MethodInterceptor.invoke()
    └── 各类 Advice 实现：Before/After/AfterReturning/AfterThrowing
```

---

> [!tip] 面试常考点
> 
> 1. **Spring AOP 与 AspectJ 的区别？**
>    - Spring AOP 基于代理，运行期织入，仅支持方法级别
>    - AspectJ 基于字节码修改，编译期/类加载期织入，支持构造器、字段等更细粒度
>
> 2. **JDK 代理与 CGLIB 代理的区别与选择？**
>    - 有接口默认用 JDK，无接口用 CGLIB
>    - 可通过 `proxyTargetClass=true` 强制使用 CGLIB
>    - CGLIB 使用 FastClass 优化，但无法代理 final 类和方法
>
> 3. **AOP 代理是在哪个阶段创建的？**
>    - BeanPostProcessor.postProcessAfterInitialization
>    - 循环依赖场景下，通过 getEarlyBeanReference 提前暴露
>
> 4. **多个切面的执行顺序如何控制？**
>    - 实现 Ordered 接口或使用 @Order 注解
>    - 数值越小优先级越高