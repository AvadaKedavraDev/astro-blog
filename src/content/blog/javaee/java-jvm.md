---
title: "JVM 详解"
pubDate: 2024-03-21
description: "深入理解 JVM 核心原理：类加载器、运行时数据区、执行引擎"
tags: [ "Java", "JVM", "后端" ]
readingTime: 35
pinned: true

# 系列文章
series:
  name: "Java 基础"
  order: 4
---

> JVM（Java Virtual Machine）是 Java 程序的运行环境，本文深入解析其三大核心组件：类加载子系统、运行时数据区、执行引擎。

---

## 一、Class Loader SubSystem（类加载子系统）

负责将静态 `.class` 字节码文件转化为 JVM 可用的运行时数据结构。

### 1.1 类加载流程

```
Class File → Loading → Linking → Initialization → 使用/卸载
```

#### Loading（加载阶段）

采用**双亲委派模型**（Parent Delegation Model）逐层向上委托查找：

| 类加载器 | 负责范围 | 备注 |
|---------|---------|------|
| **Bootstrap Class Loader** | `$JAVA_HOME/jre/lib` 核心类库 | JVM 内置，C++ 实现 |
| **Extension Class Loader** | `$JAVA_HOME/jre/lib/ext` 扩展类 | `sun.misc.Launcher.ExtClassLoader` |
| **Application Class Loader** | 用户类路径（ClassPath） | `sun.misc.Launcher.AppClassLoader` |

```
Class File 
    ↓
Application Class Loader（先检查缓存）
    ↓（未找到）
Extension Class Loader
    ↓（未找到）
Bootstrap Class Loader
    ↓（未找到）
ClassNotFoundException
```

> [!tip] 双亲委派机制的好处：防止类被重复加载，保证 Java 核心类库的稳定性。例如用户自定义的 `java.lang.String` 不会被加载，因为会优先使用 Bootstrap 加载的 rt.jar 中的 String。

#### Linking（链接阶段）

分为三个严格顺序的子阶段：

**1. Verify（验证）**：字节码合法性检查
- 文件格式验证：魔数、版本号
- 元数据验证：继承关系、语义检查
- 字节码验证：指令合法性、数据流分析
- 符号引用验证：类、字段、方法是否存在

**2. Prepare（准备）**：为类变量分配内存并设置零值

```java
public class Demo {
    // 准备阶段：value = 0（零值）
    // 初始化阶段：value = 10
    public static int value = 10;
    
    // 准备阶段：reference = null
    public static String name;
    
    // 常量在编译时已放入常量池，准备阶段即赋值
    public static final int CONST = 100;
}
```

**3. Resolve（解析）**：将常量池中的符号引用转换为直接引用

```java
// 符号引用：CONSTANT_Class_info 指向 "com.example.Demo"
// 解析后：直接指向方法区中的类元数据地址
```

#### Initialization（初始化阶段）

执行类构造器 `<clinit>()` 方法：

```java
public class Demo {
    static {
        System.out.println("静态代码块执行");
    }
    
    static int value = 10;  // 静态变量赋值
    
    static {
        value = 20;  // 可以在静态代码块中修改
    }
}

// <clinit>() 方法等价于：
static int value;
static {
    value = 10;
    value = 20;
}
```

> [!warning] `<clinit>()` 线程安全，JVM 保证多线程环境下只有一个线程执行初始化。

### 1.2 类加载器示例

```java
public class ClassLoaderDemo {
    public static void main(String[] args) {
        // 获取当前类的类加载器
        ClassLoader loader = ClassLoaderDemo.class.getClassLoader();
        System.out.println(loader);  // sun.misc.Launcher$AppClassLoader
        
        // 向上获取父加载器
        System.out.println(loader.getParent());  // sun.misc.Launcher$ExtClassLoader
        
        // Bootstrap 无父加载器，返回 null
        System.out.println(loader.getParent().getParent());  // null
    }
}
```

### 1.3 自定义类加载器

```java
public class MyClassLoader extends ClassLoader {
    private String classPath;
    
    public MyClassLoader(String classPath) {
        this.classPath = classPath;
    }
    
    @Override
    protected Class<?> findClass(String name) throws ClassNotFoundException {
        try {
            byte[] data = loadClassData(name);
            return defineClass(name, data, 0, data.length);
        } catch (Exception e) {
            throw new ClassNotFoundException(name);
        }
    }
    
    private byte[] loadClassData(String name) throws Exception {
        String path = classPath + "/" + name.replace('.', '/') + ".class";
        FileInputStream fis = new FileInputStream(path);
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        byte[] buffer = new byte[1024];
        int len;
        while ((len = fis.read(buffer)) != -1) {
            bos.write(buffer, 0, len);
        }
        fis.close();
        return bos.toByteArray();
    }
}
```

---

## 二、Runtime Data Areas（运行时数据区）

JVM 管理的内存区块，分为**线程共享**与**线程私有**两大区域。

### 2.1 内存结构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                        JVM 进程内存                              │
├─────────────────────────────────────────────────────────────────┤
│  线程共享区（Method Area + Heap）                                │
│  ┌─────────────────────┬─────────────────────────────────────┐  │
│  │   Method Area       │            Heap Area                │  │
│  │  类元数据、常量池、    │     对象实例、数组                  │  │
│  │  静态变量、JIT代码缓存 │     新生代 + 老年代                 │  │
│  └─────────────────────┴─────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  线程私有区（每个线程独立）                                       │
│  ┌───────────────┬───────────────┬───────────────────────────┐  │
│  │ VM Stack      │ PC Registers │ Native Method Stack       │  │
│  │ 虚拟机栈       │ 程序计数器    │ 本地方法栈                 │  │
│  └───────────────┴───────────────┴───────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 线程共享区

#### Method Area（方法区）

存储内容：
- 类元数据（类的修饰符、父类、接口）
- 常量池（字面量、符号引用）
- 字段信息（字段名、类型、修饰符）
- 方法信息（方法名、返回类型、参数、字节码）
- 静态变量
- JIT 编译后的代码缓存

> [!tip] JDK 8 前：PermGen（永久代）- 受限于堆大小
> JDK 8 后：Metaspace（元空间）- 使用本地内存，可动态扩展

```java
// 验证方法区存储
public class MethodAreaDemo {
    // 静态变量 - 存储在方法区
    public static int staticVar = 10;
    public static final int CONST = 100;  // 常量存储在常量池
    
    public static void main(String[] args) {
        // new 创建的对象实例 - 存储在堆
        MethodAreaDemo obj = new MethodAreaDemo();
        
        // Class 对象引用 - 存储在堆
        Class<?> clazz = MethodAreaDemo.class;
        
        // 类的元数据信息 - 存储在方法区
        System.out.println("类名: " + clazz.getName());
        System.out.println("修饰符: " + Modifier.toString(clazz.getModifiers()));
    }
}
```

#### Heap Area（堆区）

所有对象实例和数组的存储区域，GC 的主要工作区。

```
┌────────────────────────────────────────┐
│              Heap Area                 │
├──────────────────┬─────────────────────┤
│    Young Gen     │    Old Gen         │
│  ┌─────┬─────┐   │                     │
│  │Eden │Surv1│   │                     │
│  │     │     │   │                     │
│  └─────┴─────┘   │                     │
│      ↑           │                     │
│    Survivor      │                     │
│      To           │                     │
│  ┌─────┐         │                     │
│  │Surv2│         │                     │
│  └─────┘         │                     │
└──────────────────┴─────────────────────┘
```

| 区域 | 比例 | 说明 |
|------|------|------|
| Eden | 80% | 新对象分配区 |
| Survivor From | 10% | 第一次 Minor GC 后存活对象 |
| Survivor To | 10% | 第二次 Minor GC 后存活对象 |
| Old Gen | 1/3~1/2 | 长期存活对象 |

```java
// 堆内存分配示例
public class HeapDemo {
    public static void main(String[] args) {
        // Eden 区分配
        byte[] arr1 = new byte[1024 * 1024];  // 1MB
        
        // 大对象直接进入老年代（-XX:PretenureSizeThreshold）
        byte[] largeObj = new byte[10 * 1024 * 1024];  // 10MB
        
        // 对象晋升老年代的年龄阈值（-XX:MaxTenuringThreshold，默认15）
        // 每次 Minor GC 后，年龄 +1
        
        // 查看堆内存使用
        Runtime runtime = Runtime.getRuntime();
        System.out.println("最大堆: " + runtime.maxMemory() / 1024 / 1024 + "MB");
        System.out.println("总堆: " + runtime.totalMemory() / 1024 / 1024 + "MB");
        System.out.println("空闲堆: " + runtime.freeMemory() / 1024 / 1024 + "MB");
    }
}
```

### 2.3 线程私有区

#### VM Stack（虚拟机栈）

每个线程创建时分配独立的栈空间，每个方法执行时创建一个栈帧（Stack Frame）。

```java
public class StackDemo {
    public static void main(String[] args) {
        methodA();  // 栈帧 A 入栈
    }
    
    public static void methodA() {
        int a = 10;        // 局部变量表 slot 0
        int b = 20;        // 局部变量表 slot 1
        int c = a + b;     // 操作数栈计算
        methodB(c);        // 栈帧 B 入栈（methodA 栈帧暂停）
    }
    
    public static void methodB(int num) {  // 参数1：num → slot 0
        int result = num * 2;  // 操作数栈计算
        System.out.println(result);
    }  // methodB 栈帧出栈
}
```

#### Stack Frame（栈帧）结构

```
┌─────────────────────────────┐
│        Stack Frame          │
├─────────────────────────────┤
│  Local Variable Array (LVA)│  ← 局部变量表：参数 + 局部变量
│  ┌────┬────┬────┬────┐     │
│  │this│ arg│var1│var2│     │
│  └────┴────┴────┴────┘     │
├─────────────────────────────┤
│   Operand Stack (OS)        │  ← 操作数栈：字节码指令工作区
│  ┌────┬────┬────┐          │
│  │    │    │    │          │
│  └────┴────┴────┘          │
├─────────────────────────────┤
│    Frame Data (FD)          │  ← 动态链接、返回地址
└─────────────────────────────┘
```

#### PC Register（程序计数器）

每个线程独立的寄存器，记录当前执行的字节码行号。

```java
// 示例：字节码与行号对应
public class PCDemo {
    public static void main(String[] args) {
        int a = 10;  // 行号 0: bipush 10, istore_1
        int b = 20;  // 行号 2: bipush 20, istore_2
        int c = a + b;  // 行号 4: iload_1, iload_2, iadd, istore_3
    }
}
```

> [!note] 执行 Native 方法时，PC 寄存器值为 undefined。

#### Native Method Stack（本地方法栈）

为 Native 方法（C/C++ 编写）服务的栈空间。

```java
// 常见 Native 方法示例
public class NativeDemo {
    // hashCode() 是 native 方法
    public static void main(String[] args) {
        Object obj = new Object();
        obj.hashCode();  // 调用 C++ 实现的 hashCode()
        
        // 其他常见 native 方法：
        // System.currentTimeMillis()
        // Thread.start()
        // Object.clone()
    }
}
```

---

## 三、Execution Engine（执行引擎）

负责将字节码指令转换为机器码并执行，同时管理内存回收。

### 3.1 Interpreter（解释器）

逐条读取字节码，解释为对应平台的机器码并立即执行。

```java
// 源代码
int a = 10;
int b = 20;
int c = a + b;

// 对应字节码（javap -c 查看）
0: bipush          10    // 将 10 压入操作数栈
2: istore_1              // 弹出存入局部变量表 slot 1
3: bipush          20    // 将 20 压入操作数栈
5: istore_2              // 弹出存入局部变量表 slot 2
6: iload_1               // 加载 slot 1 到操作数栈
7: iload_2               // 加载 slot 2 到操作数栈
8: iadd                  // 弹出两个值相加，结果压回栈
9: istore_3              // 弹出存入 slot 3
10: return                // 返回
```

> [!warning] 解释器启动快，但重复代码每次都要重新解释，执行效率较低。

### 3.2 JIT Compiler（即时编译器）

#### 热点代码检测

- **热点方法**：默认执行次数 > 10000 次
- **热点循环**：循环体执行次数多

```java
// 示例：热点代码
public class HotSpotDemo {
    public static void main(String[] args) {
        long start = System.currentTimeMillis();
        int sum = 0;
        for (int i = 0; i < 100000; i++) {
            sum += i;  // 这段代码会被 JIT 编译成本地机器码
        }
        System.out.println("耗时: " + (System.currentTimeMillis() - start) + "ms");
    }
}
```

#### JIT 编译流程

```
字节码 → Profiler 监控 → 识别热点代码 
    → 中间代码生成（IR）→ 代码优化（内联、逃逸分析）
    → 生成机器码 → 缓存到方法区 → 直接执行
```

**常见优化手段**：

| 优化手段 | 说明 |
|---------|------|
| **方法内联** | 将被调用方法体直接嵌入调用处，减少调用开销 |
| **逃逸分析** | 分析对象是否逃逸出方法 scope，未逃逸可分配在栈上 |
| **锁消除** | 分析同步块是否安全，安全则消除 synchronized |
| **公共子表达式消除** | 重复计算相同表达式时复用结果 |

```java
// 示例：锁消除
public class LockElimination {
    public static void main(String[] args) {
        // JIT 编译后，sync 锁被消除（对象不逃逸）
        synchronized (new Object()) {
            System.out.println("无锁执行");
        }
    }
}
```

### 3.3 Garbage Collection（垃圾收集器）

#### GC Roots 根节点

可作为 GC Roots 的对象：
- 虚拟机栈中引用的对象
- 方法区中静态属性引用的对象
- 方法区中常量引用的对象
- 本地方法栈中 JNI 引用的对象

#### 垃圾回收算法

**1. 标记-清除（Mark-Sweep）**

```
标记阶段：标记所有存活对象
   ┌─────┐    ┌─────┐    ┌─────┐
   │obj1 │    │obj2 │    │obj3 │  ← 存活
   └─────┘    └─────┘    └─────┘
      ↑          ✗          ↑
   已标记     已标记清除     已标记

清除阶段：清除未标记对象
   ┌─────┐              ┌─────┐
   │obj1 │              │obj3 │  ← 保留
   └─────┘              └─────┘
      空洞              空洞
```

- 缺点：产生内存碎片

**2. 复制算法（Copying）**

```
Eden → Survivor From → Survivor To
┌───────────────┐     ┌───────────────┐
│ Eden │  From  │ →   │      To      │
│ obj1 │  obj2  │     │  obj1, obj2  │
└───────────────┘     └───────────────┘
     清空                  交换角色
```

- 优点：无碎片，效率高
- 缺点：空间利用率低（50%）

**3. 标记-整理（Mark-Compact）**

```
整理前：
[obj1][空洞][obj2][空洞][obj3]

整理后：
[obj1][obj2][obj3][  空洞  ][  空洞  ]
```

- 优点：无碎片，空间利用率高
- 缺点：整理耗时

#### 分代收集

| 区域 | GC 类型 | 使用算法 | 触发条件 |
|------|---------|---------|----------|
| 新生代 | Minor GC | 复制算法 | Eden 区满 |
| 老年代 | Major GC | 标记-整理 | 老年代满 |
| 整堆 | Full GC | 标记-整理 | 以上两者或 System.gc() |

```java
// 查看 GC 日志
// -XX:+PrintGCDetails -XX:+PrintGCDateStamps
// -Xlog:gc*:file=gc.log

// 常用 JVM 参数
// -Xms512m -Xmx512m           初始/最大堆
// -Xmn200m                    新生代大小
// -XX:SurvivorRatio=8         Eden:Survivor=8:1
// -XX:+UseG1GC                使用 G1 收集器
```

### 3.4 JNI 与本地库

```java
// JNI 调用示例
public class JNICDemo {
    // 声明 native 方法
    public native String sayHello(String name);
    
    static {
        // 加载本地库
        System.loadLibrary("hello");
    }
    
    public static void main(String[] args) {
        JNICDemo demo = new JNICDemo();
        String result = demo.sayHello("World");
        System.out.println(result);
    }
}
```

---

## 总结：JVM 核心流程

```
┌──────────────────────────────────────────────────────────────────┐
│                        程序员编写代码                              │
└──────────────────────────────┬───────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Class File (.class)                            │
│                         ↓                                        │
│            ClassLoader SubSystem                                 │
│    Loading → Linking(Verify/Prepare/Resolve) → Initialization   │
└──────────────────────────────┬───────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                   Runtime Data Areas                             │
│  ┌──────────┬──────────────┐  ┌───────────┐  ┌───────────────┐ │
│  │ Method   │    Heap      │  │ VM Stack  │  │   PC Register │ │
│  │  Area    │  (对象实例)   │  │ (栈帧)    │  │  (行号指示器)  │ │
│  └──────────┴──────────────┘  └───────────┘  └───────────────┘ │
└──────────────────────────────┬───────────────────────────────────┘
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                  Execution Engine                                │
│    Interpreter (解释器)  ←→  JIT Compiler (即时编译器)            │
│           ↓                                         ↓           │
│    逐行解释执行                            热点代码编译为机器码      │
│           ↓                                         ↓           │
│    ←────────────  GC (垃圾收集器)  ─────────────→                │
│           ↓                                         ↓           │
│    ←───────────  JNI (本地方法接口)  ───────────→               │
└──────────────────────────────────────────────────────────────────┘
```

---

> [!tip] 性能调优建议
> - 减少对象创建次数，复用对象（对象池）
> - 合理设置堆大小，避免频繁 GC 或 OOM
> - 使用逃逸分析优化栈上分配
> - 热点代码避免过多分支（利于 JIT 优化）

---

> [!note]
> 了解 JVM 原理有助于编写高性能 Java 程序，解决 OOM、GC 频繁等问题。
