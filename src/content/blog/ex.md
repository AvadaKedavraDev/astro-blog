---
title: MySQL原理
pubDate: 2024-10-23 16:00:40
tags:
  - 面试题
  - Spring
  - 原理
---
> Spring面试题
---
### Spring
> [!note] 
> 开发者通常不和 AbstractApplicationContext 直接打交道，
> 而是通过其子类如 ClassPathXmlApplicationContext ( xml 配置方式) 或 AnnotationConfigApplicationContext (注解配置方式)来交互
---
> Spring启动大致流程：[调用构造器链来填充前置信息](#Ts-function_-ClassPathXmlApplicationContext)->扫描xml配置信息->[启动容器刷新](#Ts-function_-refresh)
> 容器刷新流程:
> 1. [准备前置刷新，初始化启动信息](#Ts-function_-prepareBeanFactory)
> 2. 获取配置工厂核心类,通常实现交由[默认工厂](#Ts-function_-preInstantiateSingletons)类实现
> 3. [工厂前置加载处理](#Ts-function_-prepareBeanFactory)
> 4. 完成刷新，发布刷新事件
#### Spring 的启动
> Spring 的启动通常要去加载xml配置或者通过注解去扫描Bean
##### xml 配置方式
  1. 配置文件`example.xml`
      ```xml
     <beans xmlns="http://www.springframework.org/schema/beans"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
               xsi:schemaLocation="http://www.springframework.org/schema/beans
                   http://www.springframework.org/schema/beans/spring-beans.xsd">
         <bean id="exampleBean" class="com.example.ExampleBean">
              <property name="someProperty" value="someValue"/>
         </bean>
      </beans>   
      ```
  2. 设置`启动类`
     ```java
     public static void main(String[] args) {
        // 读取启动配置文件(此处的位置为类加载路径下且为非SpringBoot的原生Spring配置)
        ApplicationContext ac = new ClassPathXmlApplicationContext("classpath:example.xml");
        // 获取 bean 实例
        MyService myService = (MyService) context.getBean("myService");    
      }
    ```
##### 注解方式配置
  1. 声明 Bean
     ```java
     import org.springframework.context.annotation.Bean;
     import org.springframework.context.annotation.Configuration;

     @Configuration
     public class AppConfig {
  
        @Bean
        public ExampleBean exampleBean() {
            ExampleBean bean = new ExampleBean();
            bean.setSomeProperty("someValue");
            return bean;
        }
     }
     ```
  2. 手动扫描注解配置启动类  
     ```java
     public static void main(String[] args) {
        ApplicationContext context = new AnnotationConfigApplicationContext(AppConfig.class);
        ExampleBean myBean = (ExampleBean) context.getBean("exampleBean");
     }
    ```

- 其他涉及注解的方式(这些方法需要对Java的类添加指定注解，还需指定扫描的路径以及其他设置，此篇文章重点不在于此)

---
>   作为加载配置的启动类，不管是`AnnotationConfigApplicationContext`还是`ClassPathXmlApplicationContext`都是继承或实现了大量的模版抽象类才具有了“启动”的功能，所以想要快速学习Spring的编码和思维方式，模版类的学习是非常容易突破且入手的


- 以xml启动类的继承一览
   ![](https://cdn.jsdelivr.net/gh/AvadaKedavraDev/AKD@main/img/20241010141210.png)
   
   > 虽然在基础启动类ClassPathXmlApplicationContext上继承和实现了大量类，
   > 但对分析源码来说，所有的继承通常都是扩展，即是扩展就存在单一类可体现所有父类行为
   > 综上，此处只对分支最多且最典型的AbstractApplicationContext进行梳理
   
   
  - `AbstractApplicationContext`抽象类
     ```java
      /*
          在new ClassPathXmlApplicationContext("classpath:example.xml")中，
          调用了ClassPathXmlApplicationContext类的String类型的构造参数，
          而此构造参数以及重载构造参数最终都指向一个三参构造参数，关系如下
       */
      public class ClassPathXmlApplicationContext extends AbstractXmlApplicationContext {
          // 默认使用的构造参数
          public ClassPathXmlApplicationContext(String configLocation) throws BeansException {
              this(new String[]{configLocation}, true, (ApplicationContext)null);
          }
          // 重载参数指向的三参构造参数
          public ClassPathXmlApplicationContext(String[] configLocations, boolean refresh, ApplicationContext parent) throws BeansException {
              /*
                  调用父级构造器，构造多层构造器链，确保每层父类被正确初始化，若不显式调用，则会在编译后默认添加super()到第一行 
                  若是无此项采用默认的空参构造器，会缺少与父级上下文同步的设置，此设置可减少子级重新配置通用参数的工作
                  但是默认使用的都是String类型的构造器 其实parent为null，故此项等同于super()
              */
              super(parent); 
              this.setConfigLocations(configLocations); // 此项为配置文件挂载，文件不存在等健壮报错等处理
              if (refresh) {
              /*
                  此处为Spring启动核心所在，详见下面的类
              */
                  this.refresh();
              }
          }
      }
     ```
    `AbstractApplicationContext`抽象模版启动核心类
    ```java
      /*
         抽象模版启动核心类
      */
      public abstract class AbstractApplicationContext extends DefaultResourceLoader implements ConfigurableApplicationContext, DisposableBean {
          //...
          public void refresh() throws BeansException, IllegalStateException {
              // 锁Monitor，保证线程安全(ps:用来启停互斥，你总不能无脑开关吧？！等等，你刚刚是不是开啦?)
              synchronized(this.startupShutdownMonitor) {
                  /*
                      prepareRefresh做准备工作，日志你得加吧，时间戳，版本号，运行环境也得加吧
                      这可是Spring。（ps:看源码要知道学什么，自己的接口方法也要加日志，
                      工作的越久就会发现，这些边边角角不注意的地方，往往是开发优劣之分的关键点）
                  */
                  this.prepareRefresh(); 
                  // 获取一个BeanFactory,包含启动载入的配置Bean,简言之，就是封装了一个包含Bean名称的Map(beanDefinitionMap)
                  ConfigurableListableBeanFactory beanFactory = this.obtainFreshBeanFactory();
                  /*
                      1.设置BeanFactory的类加载器。
                      2.设置表达式解析器（Expression Resolver），如SpEL（Spring Expression Language）解析器。
                      3.添加一些特殊的bean后处理器，比如用于处理@Autowired注解的自动装配基础设施。
                      4.注册可以解析占位符配置值的属性编辑器（PropertyEditor）。
                      5.注册可解决资源路径的转换服务。
                  */
                  this.prepareBeanFactory(beanFactory);

                  try {
                      /* 
                          下面三行代码体现了共性的功能，都是类钩子函数
                          1.暴露方法给子类实现，在BeanFactory准备好，BeanFactoryPostProcessor之前调用(Bean实例化前)
                          2.调用所有已注册的BeanFactoryPostProcessor实例，在bean实例化之前修改bean定义。
                          3.这些处理器可以修改BeanFactory的配置元数据，在bean实例化之后但在初始化完成之前对bean实例进行处理。
                      */ 
                      this.postProcessBeanFactory(beanFactory);
                      this.invokeBeanFactoryPostProcessors(beanFactory);
                      this.registerBeanPostProcessors(beanFactory);
                    
                      // 国际化i18n
                      this.initMessageSource();
                      // 初始化应用事件广播器，这是一个用于发布应用事件到监听器的组件。
                      // 如果配置了applicationEventMulticaster bean，则使用该bean；否则，将创建一个默认的实现。(applicationEventMulticaster默认是单例)
                      this.initApplicationEventMulticaster();
                      // 自定义刷新方法
                      this.onRefresh();
                      // 注册所有应用监听器(指由Spring配置注解或者xml且实现ApplicationListener接口的Bean)，
                      // 这些监听器可以接收并响应由应用上下文发布的事件
                      this.registerListeners();
                      /*
                         完成Bean工厂的初始化，包含工厂中所有的Bean，
                         确保了所有的非懒加载单例 Bean 都被实例化和初始化
                         SpringBean的生命周期所在
                      */
                      this.finishBeanFactoryInitialization(beanFactory);
                      this.finishRefresh();
                  } catch (BeansException var9) {
                     //...
                  } finally {
                      this.resetCommonCaches();
                  }

              }
          }
  
          /*
              finishBeanFactoryInitialization
          */
          protected void finishBeanFactoryInitialization(ConfigurableListableBeanFactory beanFactory) {
              // 看是否存在转换器Bean 有的话实例化
              if (beanFactory.containsBean("conversionService") && beanFactory.isTypeMatch("conversionService", ConversionService.class)) {
                  beanFactory.setConversionService((ConversionService)beanFactory.getBean("conversionService", ConversionService.class));
              }
            
              /* 
                  处理Spring的语法解析器 eg:
                  <bean id="myBean" class="com.example.MyBean">
                    <property name="message" value="${app.message}"/>
                  </bean>
                  此处配置语法解析器 则会将上述的${app.message}转化为environment.getProperty("property.name")
              */
              if (!beanFactory.hasEmbeddedValueResolver()) {
                  beanFactory.addEmbeddedValueResolver(new StringValueResolver() {
                      public String resolveStringValue(String strVal) {
                          return AbstractApplicationContext.this.getEnvironment().resolvePlaceholders(strVal);
                      }
                  });
              }
    
              // LoadTimeWeaverAware 是一个未实现的接口
              // 主要提供给需要在Jvm加载Class时提供对Bean的增强或者修改
              String[] weaverAwareNames = beanFactory.getBeanNamesForType(LoadTimeWeaverAware.class, false, false);
              String[] var3 = weaverAwareNames;
              int var4 = weaverAwareNames.length;
    
              for(int var5 = 0; var5 < var4; ++var5) {
                  String weaverAwareName = var3[var5];
                  this.getBean(weaverAwareName);
              }
            
            
              // 设置临时类加载器
              beanFactory.setTempClassLoader((ClassLoader)null);
              // 冻结配置信息（这个时候了你还想改？）
              beanFactory.freezeConfiguration();
              /*
                  预实例化所有的单例Bean
                  此处接口由DefaultListableBeanFactory类实现
              */
              beanFactory.preInstantiateSingletons();
          }
      }
    ```
    `ConfigurableListableBeanFactory`装配工厂集大成者
    ```java
      /*
          装配工厂(集大成者),扩展了父类的功能是非常核心的接口，
          拥有自动装配，管理 Bean 的定义、注册 Bean 后处理器、获取 Bean 列表等功能
      */
      public interface ConfigurableListableBeanFactory extends ListableBeanFactory, AutowireCapableBeanFactory, ConfigurableBeanFactory {
          // ...
          protected void prepareBeanFactory(ConfigurableListableBeanFactory beanFactory) {
              // 设置类加载器 用来进行动态加载类，同时支持AOP等功能
              beanFactory.setBeanClassLoader(this.getClassLoader());
              // 设置 Bean 表达式解析器
              beanFactory.setBeanExpressionResolver(new StandardBeanExpressionResolver(beanFactory.getBeanClassLoader()));
              // 注册资源编辑器 注册器
              beanFactory.addPropertyEditorRegistrar(new ResourceEditorRegistrar(this, this.getEnvironment()));
              /*
                  向BeanFactory注册一个后处理器，这个后处理器会在每个bean实例化之后但在其初始化方法（例如@PostConstruct或InitializingBean.afterPropertiesSet()）被调用之前运行。
                  对于实现了ApplicationContextAware接口的bean，ApplicationContextAwareProcessor会自动设置它们的ApplicationContext属性 
                  ApplicationContextAware: 允许bean获取到应用上下文。
                  BeanFactoryAware: 允许bean获取到创建它的BeanFactory。
                  MessageSourceAware: 允许bean获取到消息源，通常用于国际化。
                  ResourceLoaderAware: 允许bean获取到资源加载器，这可以用来加载文件或其他类型的资源。
                  ApplicationEventPublisherAware: 允许bean发布事件到应用上下文中。
                  ServletConfigAware 和 ServletContextAware: 在Web环境中使用，分别允许bean获取到Servlet配置和Servlet上下文
                  ps：其实就是只要这个工厂Bean提供了这些方法的实现，那么就可以提供其需要的上下文环境和服务
              */
              beanFactory.addBeanPostProcessor(new ApplicationContextAwareProcessor(this));
            
              // 忽略依赖注入 这些接口通常由Spring自动管理
              beanFactory.ignoreDependencyInterface();
              // ...
            
              // 注册一些依赖供启动后直接调用，略去显示声明
              beanFactory.registerResolvableDependency(BeanFactory.class, beanFactory);
              beanFactory.registerResolvableDependency(ResourceLoader.class, this);
              beanFactory.registerResolvableDependency(ApplicationEventPublisher.class, this);
              beanFactory.registerResolvableDependency(ApplicationContext.class, this);
  
              // 添加监听器
              beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(this));
            
              // 特殊Bean处理 
              if (beanFactory.containsBean("loadTimeWeaver")) {
                  beanFactory.addBeanPostProcessor(new LoadTimeWeaverAwareProcessor(beanFactory));
                  beanFactory.setTempClassLoader(new ContextTypeMatchClassLoader(beanFactory.getBeanClassLoader()));
              }
    
              // 单例模式的特殊Bean
              if (!beanFactory.containsLocalBean("environment")) {
                  beanFactory.registerSingleton("environment", this.getEnvironment());
              }
    
              if (!beanFactory.containsLocalBean("systemProperties")) {
                  beanFactory.registerSingleton("systemProperties", this.getEnvironment().getSystemProperties());
              }
    
              if (!beanFactory.containsLocalBean("systemEnvironment")) {
                  beanFactory.registerSingleton("systemEnvironment", this.getEnvironment().getSystemEnvironment());
              }
          }
      }
    ```
    `DefaultListableBeanFactory`[跳转到特定代码](#highlight-line-hljs-title-function_-preInstantiateSingletons)
    ```java
    public class DefaultListableBeanFactory extends AbstractAutowireCapableBeanFactory implements ConfigurableListableBeanFactory, BeanDefinitionRegistry, Serializable {
          public void preInstantiateSingletons() throws BeansException {
              if (this.logger.isDebugEnabled()) {
                  this.logger.debug("Pre-instantiating singletons in " + this);
              }
             /*
              *  在此处this.beanDefinitionNames即为配置文件或者注解中配置的bean的名称
              *  此处比较抽象,beanDefinitionNames是在refresh方法的
              *   ConfigurableListableBeanFactory beanFactory = this.obtainFreshBeanFactory();
              *  处完成的填充,此处涉及知识点比较多，obtainFreshBeanFactory的最终实现是一个抽象方法，
              *  需要追溯到DefaultListableBeanFactory的构造器链,且中间还穿插了许多接口模型。包括注解方法填充
              */
             
             List<String> beanNames = new ArrayList(this.beanDefinitionNames);
             Iterator var2 = beanNames.iterator();
              //  下面是对已经获取到的bean进行判断，只针对
              while(true) {
                  while(true) {
                      String beanName;
                      RootBeanDefinition bd;
                      do {
                          do {
                              do {
                                  if (!var2.hasNext()) {
                                      var2 = beanNames.iterator();
    
                                      while(var2.hasNext()) {
                                          beanName = (String)var2.next();
                                          /*
                                              getSingleton很有说法，此处涉及一个常见面试点：Spring单例作用域下的循环依赖（三级缓存）
                                              概念: 正常来说Spring会依次创建类A,B,Spring创建类A,
                                                    发现类A依赖于B,此时B仍未创建，则先去创建B,Spring创建
                                                    B时发现又依赖于A,此时则出现了循环依赖
                                              方法： 1.解决方法则是在创建B时发现依赖与A的时候，Spring创建A的过程仍未结束
                                                      那么此时则把A的ObjectFactory放入singleFactories,
                                                      并将A的实例放入earlySingletonObjects 中。
                                                    2.之后继续B的创建，此时Spring可以从earlySingletonObjects中获取
                                                      到A的实例，注入到自己的bean中完成B的初始化并且添加到singleFactories中
                                                    3.此时再次返回A的创建时，即可完成A的创建
                                              三级缓存： singletonObjects：
                                                            存储已经完全初始化的单例 Bean 实例。
                                                            当 Bean 完全初始化后，会被放入这个缓存中。
                                                        earlySingletonObjects：
                                                            存储早期引用的单例 Bean 实例。
                                                            在 Bean 创建过程中，如果需要提前引用某个 Bean，会先将它放入这个缓存中。
                                                        singletonFactories：
                                                            存储用于生成早期引用的 ObjectFactory 对象。
                                                            如果某个 Bean 还未完全初始化，但需要提前引用，会先将它的 ObjectFactory 放入这个缓存中。
                                           */ 
                                          Object singletonInstance = this.getSingleton(beanName);
                                          // 判断当前Bean是否是SmartInitializingSingleton的实例，该实例可在所有单例Bean初始化完成后执行后置操作
                                          if (singletonInstance instanceof SmartInitializingSingleton) {
                                              final SmartInitializingSingleton smartSingleton = (SmartInitializingSingleton)singletonInstance;
                                              // 判断当前虚拟机是否有安全管理器，如果存在，则说明当前在一个受限的环境中
                                              // 如果存在受限环境，那么就通过doPrivileged获取当前线程所拥有的权限
                                              if (System.getSecurityManager() != null) {
                                                  AccessController.doPrivileged(new PrivilegedAction<Object>() {
                                                      public Object run() {
                                                          smartSingleton.afterSingletonsInstantiated();
                                                          return null;
                                                      }
                                                  }, this.getAccessControlContext());
                                              } else {
                                                  smartSingleton.afterSingletonsInstantiated();
                                              }
                                          }
                                      }
    
                                      return;
                                  }
    
                                  beanName = (String)var2.next();
                                  bd = this.getMergedLocalBeanDefinition(beanName);
                              } while(bd.isAbstract());
                          } while(!bd.isSingleton());
                      } while(bd.isLazyInit());
    
                      if (this.isFactoryBean(beanName)) {
                          final FactoryBean<?> factory = (FactoryBean)this.getBean("&" + beanName);
                          boolean isEagerInit;
                          if (System.getSecurityManager() != null && factory instanceof SmartFactoryBean) {
                              isEagerInit = (Boolean)AccessController.doPrivileged(new PrivilegedAction<Boolean>() {
                                  public Boolean run() {
                                      return ((SmartFactoryBean)factory).isEagerInit();
                                  }
                              }, this.getAccessControlContext());
                          } else {
                              isEagerInit = factory instanceof SmartFactoryBean && ((SmartFactoryBean)factory).isEagerInit();
                          }
    
                          if (isEagerInit) {
                              this.getBean(beanName);
                          }
                      } else {
                          this.getBean(beanName);
                      }
                  }
              }
          }
           /*
              getSingleton很有说法，此处涉及一个常见面试点：Spring单例作用域下的循环依赖（三级缓存）
              概念: 正常来说Spring会依次创建类A,B,Spring创建类A,
                    发现类A依赖于B,此时B仍未创建，则先去创建B,Spring创建
                    B时发现又依赖于A,此时则出现了循环依赖
              方法： 1.解决方法则是在创建B时发现依赖与A的时候，Spring创建A的过程仍未结束
                      那么此时则把A的ObjectFactory放入singleFactories,
                      并将A的实例放入earlySingletonObjects 中。
                    2.之后继续B的创建，此时Spring可以从earlySingletonObjects中获取
                      到A的实例，注入到自己的bean中完成B的初始化并且添加到singleFactories中
                    3.此时再次返回A的创建时，即可完成A的创建
              三级缓存： singletonObjects：
                            存储已经完全初始化的单例 Bean 实例。
                            当 Bean 完全初始化后，会被放入这个缓存中。
                        earlySingletonObjects：
                            存储早期引用的单例 Bean 实例。
                            在 Bean 创建过程中，如果需要提前引用某个 Bean，会先将它放入这个缓存中。
                        singletonFactories：
                            存储用于生成早期引用的 ObjectFactory 对象。
                            如果某个 Bean 还未完全初始化，但需要提前引用，会先将它的 ObjectFactory 放入这个缓存中。
            */
           protected Object getSingleton(String beanName, boolean allowEarlyReference) {
                Object singletonObject = this.singletonObjects.get(beanName);
                if (singletonObject == null && this.isSingletonCurrentlyInCreation(beanName)) {
                    synchronized(this.singletonObjects) {
                        singletonObject = this.earlySingletonObjects.get(beanName);
                        if (singletonObject == null && allowEarlyReference) {
                            ObjectFactory<?> singletonFactory = (ObjectFactory)this.singletonFactories.get(beanName);
                            if (singletonFactory != null) {
                                singletonObject = singletonFactory.getObject();
                                this.earlySingletonObjects.put(beanName, singletonObject);
                                this.singletonFactories.remove(beanName);
                            }
                        }
                    }
                }
            }
    }
    ```

