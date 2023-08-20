# nacos

## 前言总结:

​     一开始接触微服务的时候十分好奇，微服务是怎么运作的，具体地说是如何进行服务注册与发现的，经过一番源码查看对其原理有了进一步的了解。

### 下面简单概括工作流程：

​	微服务的注册已发现基本原理就是典型的 CS模型 C就是客户端 S就是服务端

~~~powershell
sh startup.sh -m standalone
~~~

​	以上命令即是启动一个服务端S    会开启一个restful的服务等待接收客户端的注册和发现

~~~java
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
~~~

我们自己的项目在引入上述依赖的时候，会通过通过springboot的自动装配功能自动的读取yml配置文件中的nacos里面的信息，拿到这些信息即知道注册中心的地址，通过访问和服务端约定的restful地址完成注册和发现。



### 其它比较好奇的原理

###### 	负载均衡是如何实现的，和nacos有什么联系？

​	首先负载均衡是由loadbalance实现的，

​    nacos是服务注册发现，loadbalance主要利用其服务发现的功能实现负载均衡

​	具体代码的实现是通过SPI技术实现的

​	注册中心如nacos  eureka等会实现 loadbalance提供的接口

​	通过SPI进行实例化给loadbalance使用， 由于该类是注册中心提供的自然有能力拉取注册中心的服务列表

###### 	nacos如何推送服务的变化？

​    这是因为客户端配置订阅服务变化后，会开启的udp的Server端，在自动配置时会一并将是否订阅和订阅的udpServer的端口发送给nacos， nacos感知到服务列表变化例如（没有心跳）即会查找进行订阅的客户端，通过udp将消息发送给客户端。

###### 	nacos如何实现配置自动更新？

​	因为这部分源码是很早看的，没有看那么仔细， 不妨合理猜测一下，

​	首先nacos也是配置中心，nacos可以感知自己上面储存的配置信息的变化，并且可以对应到具体的服务的名字，那么nacos只需要通知到对应具体客户端即可，即通过网络通信,。

​	随之而来就有一个问题客户端是如何找到并更新的配置类呢？

​	这个问题关键在于如何找到配置类的bean ，nacos 提供了注解例如 @RefreshScope， nacos则可以通过该注解找到具体的bean并管理。再辅助一些手段例如 nacos服务端和客户端采用同样的生成`资源签名标识`的策略（这个比较常用）来定位具体需要修改的内容，有了这些信息通过反射修改配置属性即可。

​	至此便可以实现配置信息的自动更新。



以下为之前学习源码时记录的一些细节

---

### spring注解

~~~java
@ConditionalOnProperty

//只说明 该配置类在 参数内这些配置类  可执行的时候执行完成后执行   //若参数内配置类因依赖关系不能执行 则随后执行
@AutoConfigureAfter

//执行顺序  Constructor >> @Autowired >> @PostConstruct
@PostConstruct

~~~

### spring接口

```java
ApplicationEventPublisherAware 
    
//会在 org.springframework.context.support.DefaultLifecycleProcessor.onRefresh()执行    
SmartLifecycle
    
ApplicationListener   // ApplicationListener 比  SmartLifecycle 要晚
```



### 客户端

####  服务注册的初始化配置过程

##### springboot自动配置过程

~~~java
//NacosServiceRegistryAutoConfiguration
...com.alibaba.cloud.nacos.registry.NacosServiceRegistryAutoConfiguration...
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties
@ConditionalOnNacosDiscoveryEnabled
@ConditionalOnProperty(value = "spring.cloud.service-registry.auto-registration.enabled",
		matchIfMissing = true)
@AutoConfigureAfter({ 
    	AutoServiceRegistrationConfiguration.class,
        //该配置类  最终启用了 org.springframework.cloud.client.serviceregistry.AutoServiceRegistrationProperties
		AutoServiceRegistrationAutoConfiguration.class,
        //仅仅为了检查有无 实现AutoServiceRegistration该接口的bean   没有则报错  并@import
   		//org.springframework.cloud.client.serviceregistry.AutoServiceRegistrationConfiguration
		NacosDiscoveryAutoConfiguration.class 
        //生成了NacosServiceManager  见下 服务发现
        })
public class NacosServiceRegistryAutoConfiguration {

    
    //生成bean nacosServiceRegistry
	@Bean
	public NacosServiceRegistry nacosServiceRegistry(
			NacosDiscoveryProperties nacosDiscoveryProperties) {
		return new NacosServiceRegistry(nacosDiscoveryProperties);
	}

    
    //生成bean NacosRegistration 
    //持有
    //acosDiscoveryProperties
    //context
	@Bean
	@ConditionalOnBean(AutoServiceRegistrationProperties.class)
	public NacosRegistration nacosRegistration(
			ObjectProvider<List<NacosRegistrationCustomizer>> registrationCustomizers,
        	//nacosDiscoveryProperties
			NacosDiscoveryProperties nacosDiscoveryProperties,
			ApplicationContext context) {
		return new NacosRegistration(registrationCustomizers.getIfAvailable(),
				nacosDiscoveryProperties, context);
	}

    //生成bean NacosAutoServiceRegistration	
    //持有前面生成的 nacosServiceRegistry  NacosRegistration  以及 AutoServiceRegistrationProperties
	@Bean
	@ConditionalOnBean(AutoServiceRegistrationProperties.class)
	public NacosAutoServiceRegistration nacosAutoServiceRegistration(
			NacosServiceRegistry registry,
			AutoServiceRegistrationProperties autoServiceRegistrationProperties,
			NacosRegistration registration) {
		return new NacosAutoServiceRegistration(registry,
				autoServiceRegistrationProperties, registration);
	}
}


com.alibaba.cloud.nacos.registry.NacosAutoServiceRegistration   
    //继承  
org.springframework.cloud.client.serviceregistry.AbstractAutoServiceRegistration
    //实现接口
AutoServiceRegistration, ApplicationContextAware,
	    ApplicationListener<WebServerInitializedEvent>  
~~~

##### 服务启动初始化过程

~~~java
//...com.alibaba.cloud.nacos.registry.NacosServiceRegistry...
//最终由 NacosAutoServiceRegistration 持有的 com.alibaba.cloud.nacos.registry.NacosServiceRegistry  完成注册
public void register(Registration registration) {

   if (StringUtils.isEmpty(registration.getServiceId())) {
        log.warn("No service to register for nacos client...");
         return;
    }
   //获取namingService
   NamingService namingService = namingService();
   //获取注册的键值信息
   String serviceId = registration.getServiceId();
   String group = nacosDiscoveryProperties.getGroup();
	
   //生成服务注册元信息 以及配置信息 例如心跳间隔
   Instance instance = getNacosInstanceFromRegistration(registration);

   try {
       //注册
       namingService.registerInstance(serviceId, group, instance);
       log.info("nacos registry, {} {} {}:{} register finished", group, serviceId,
                 nstance.getIp(), instance.getPort());
   }
   catch (Exception e) {
       log.error("nacos registry, {} register failed...{},", serviceId,
                 registration.toString(), e);
       // rethrow a RuntimeException if the registration is failed.
       // issue : https://github.com/alibaba/spring-cloud-alibaba/issues/1132
       rethrowRuntimeException(e);
   }}


//...com.alibaba.nacos.client.naming.NacosNamingService...
public void registerInstance(String serviceName, String groupName, Instance instance) throws NacosException {
    //检查合法性
    NamingUtils.checkInstanceIsLegal(instance);
   	//生成
    String groupedServiceName = NamingUtils.getGroupedName(serviceName, groupName);
    if (instance.isEphemeral()) {
        //创建心跳信息
        BeatInfo beatInfo = beatReactor.buildBeatInfo(groupedServiceName, instance);
        //添加心跳信息
        beatReactor.addBeatInfo(groupedServiceName, beatInfo);
    }
    serverProxy.registerService(groupedServiceName, groupName, instance);
}

//...com.alibaba.nacos.client.naming.beat.BeatReactor...
public void addBeatInfo(String serviceName, BeatInfo beatInfo) {
    NAMING_LOGGER.info("[BEAT] adding beat: {} to beat map.", beatInfo);
    String key = buildKey(serviceName, beatInfo.getIp(), beatInfo.getPort());
    BeatInfo existBeat = null;
    //fix #1733
    if ((existBeat = dom2Beat.remove(key)) != null) {
        existBeat.setStopped(true);
    }
    //缓存起来
    dom2Beat.put(key, beatInfo);
    //放入线程池执行
    executorService.schedule(new BeatTask(beatInfo), beatInfo.getPeriod(), TimeUnit.MILLISECONDS);
    //监控dom2Beat.size()
    MetricsMonitor.getDom2BeatSizeMonitor().set(dom2Beat.size());
}

//...com.alibaba.nacos.client.naming.beat.BeatReactor.BeatTask..
class BeatTask implements Runnable {

    BeatInfo beatInfo;

    public BeatTask(BeatInfo beatInfo) {
        this.beatInfo = beatInfo;
    }

    @Override
    public void run() {
        if (beatInfo.isStopped()) {
            return;
        }
        long nextTime = beatInfo.getPeriod();
        try {
            //发送心跳信息
            JsonNode result = serverProxy.sendBeat(beatInfo, BeatReactor.this.lightBeatEnabled);
            //获取心跳间隔
            long interval = result.get("clientBeatInterval").asLong();
            boolean lightBeatEnabled = false;
            if (result.has(CommonParams.LIGHT_BEAT_ENABLED)) {
                lightBeatEnabled = result.get(CommonParams.LIGHT_BEAT_ENABLED).asBoolean();
            }
            //根据nacos 服务端 返回结果
            BeatReactor.this.lightBeatEnabled = lightBeatEnabled;
            if (interval > 0) {
                nextTime = interval;
            }
            int code = NamingResponseCode.OK;
            //解析服务端code
            if (result.has(CommonParams.CODE)) {
                code = result.get(CommonParams.CODE).asInt();
            }
            if (code == NamingResponseCode.RESOURCE_NOT_FOUND) {
                //资源未找到
                Instance instance = new Instance();
                instance.setPort(beatInfo.getPort());
                instance.setIp(beatInfo.getIp());
                instance.setWeight(beatInfo.getWeight());
                instance.setMetadata(beatInfo.getMetadata());
                instance.setClusterName(beatInfo.getCluster());
                instance.setServiceName(beatInfo.getServiceName());
                instance.setInstanceId(instance.getInstanceId());
                instance.setEphemeral(true);
                try {
                    //尝试再次注册实例
                    //这里可防止nacos服务丢失 比如重启
                    serverProxy.registerService(beatInfo.getServiceName(),
                                                NamingUtils.getGroupName(beatInfo.getServiceName()), instance);
                } catch (Exception ignore) {
                }
            }
        } catch (NacosException ex) {
            NAMING_LOGGER.error("[CLIENT-BEAT] failed to send beat: {}, code: {}, msg: {}",
                                JacksonUtils.toJson(beatInfo), ex.getErrCode(), ex.getErrMsg());

        }
        //修改后的时间间隔
        executorService.schedule(new BeatTask(beatInfo), nextTime, TimeUnit.MILLISECONDS);
    }
}
~~~



####  服务发现的初始化配置过程

##### SpringBoot自动配置过程

~~~java
//...com.alibaba.cloud.nacos.NacosServiceAutoConfiguration...
@Configuration(proxyBeanMethods = false)
@ConditionalOnDiscoveryEnabled
@ConditionalOnNacosDiscoveryEnabled
public class NacosServiceAutoConfiguration {
    
	//简单生成NacosServiceManager 
	@Bean
	public NacosServiceManager nacosServiceManager() {
		return new NacosServiceManager();
	}

}


@Configuration(proxyBeanMethods = false)
@ConditionalOnDiscoveryEnabled
@ConditionalOnNacosDiscoveryEnabled
public class NacosDiscoveryAutoConfiguration {

    //读取xml里 nacos  discovery的配置   @ConfigurationProperties("spring.cloud.nacos.discovery")
	@Bean
	@ConditionalOnMissingBean
	public NacosDiscoveryProperties nacosProperties() {
		return new NacosDiscoveryProperties();
	}
	
    
    //持有上述生成的 discoveryProperties、nacosServiceManager
	@Bean
	@ConditionalOnMissingBean
	public NacosServiceDiscovery nacosServiceDiscovery(
			NacosDiscoveryProperties discoveryProperties,
			NacosServiceManager nacosServiceManager) {
		return new NacosServiceDiscovery(discoveryProperties, nacosServiceManager);
	}

}


//...com.alibaba.cloud.nacos.discovery.NacosDiscoveryClientConfiguration...
@Configuration(proxyBeanMethods = false)
@ConditionalOnDiscoveryEnabled
@ConditionalOnBlockingDiscoveryEnabled
@ConditionalOnNacosDiscoveryEnabled
    
//SimpleDiscoveryClientAutoConfiguration 该配置类 简单的封装了服务注册发现需要的信息
@AutoConfigureBefore({ SimpleDiscoveryClientAutoConfiguration.class,
		CommonsClientAutoConfiguration.class })
    
//在NacosDiscoveryAutoConfiguration配置类 完成配置后  拿到nacosServiceDiscovery 即可进行
@AutoConfigureAfter(NacosDiscoveryAutoConfiguration.class)
public class NacosDiscoveryClientConfiguration {

    //NacosDiscoveryClient持有nacosServiceDiscovery
	@Bean
	public DiscoveryClient nacosDiscoveryClient(
			NacosServiceDiscovery nacosServiceDiscovery) {
		return new NacosDiscoveryClient(nacosServiceDiscovery);
	}

	@Bean
	@ConditionalOnMissingBean
	@ConditionalOnProperty(value = "spring.cloud.nacos.discovery.watch.enabled",
			matchIfMissing = true)
	public NacosWatch nacosWatch(NacosServiceManager nacosServiceManager,
			NacosDiscoveryProperties nacosDiscoveryProperties,
			ObjectProvider<ThreadPoolTaskScheduler> taskExecutorObjectProvider) {
        //持有一个定时线程池taskExecutorObjectProvide、nacosServiceManager 、nacosDiscoveryProperties
		return new NacosWatch(nacosServiceManager, nacosDiscoveryProperties,
				taskExecutorObjectProvider);
	}

}

~~~

##### 服务启动初始化过程

~~~java
...com.alibaba.cloud.nacos.discovery.NacosWatch ...
public class NacosWatch implements ApplicationEventPublisherAware, SmartLifecycle {

	....

	private Map<String, EventListener> listenerMap = new ConcurrentHashMap<>(16);

	....

	private ApplicationEventPublisher publisher;

	private ScheduledFuture<?> watchFuture;
	....

	private final ThreadPoolTaskScheduler taskScheduler;

	public NacosWatch(NacosServiceManager nacosServiceManager,
			NacosDiscoveryProperties properties,
			ObjectProvider<ThreadPoolTaskScheduler> taskScheduler) {
		this.nacosServiceManager = nacosServiceManager;
		this.properties = properties;
		this.taskScheduler = taskScheduler.stream().findAny()
				.orElseGet(NacosWatch::getTaskScheduler);
	}

	private static ThreadPoolTaskScheduler getTaskScheduler() {
		ThreadPoolTaskScheduler taskScheduler = new ThreadPoolTaskScheduler();
		taskScheduler.setBeanName("Nacos-Watch-Task-Scheduler");
		taskScheduler.initialize();
		return taskScheduler;
	}

   //入口
	@Override
	public void start() {
		if (this.running.compareAndSet(false, true)) {
			EventListener eventListener = listenerMap.computeIfAbsent(buildKey(),
					event -> new EventListener() {
						@Override
						public void onEvent(Event event) {
							if (event instanceof NamingEvent) {
								List<Instance> instances = ((NamingEvent) event)
										.getInstances();
								Optional<Instance> instanceOptional = selectCurrentInstance(
										instances);
								instanceOptional.ifPresent(currentInstance -> {
									resetIfNeeded(currentInstance);
								});
							}
						}
					});
			//这里根据 xml 的配置生成了很多东西   持有 hostReactor 该实力构造函数内初始化很多重要的组件
			NamingService namingService = nacosServiceManager
					.getNamingService(properties.getNacosProperties());
			try {
            //根据 服务坐标 注册 eventListener  并通过订阅的方式获取信息
				namingService.subscribe(properties.getService(), properties.getGroup(),
						Arrays.asList(properties.getClusterName()), eventListener);
			}
			catch (Exception e) {
				log.error("namingService subscribe failed, properties:{}", properties, e);
			}

            //这里调用线程池
			this.watchFuture = this.taskScheduler.scheduleWithFixedDelay(
					this::nacosServicesWatch, this.properties.getWatchDelay());
		}
	}

	private String buildKey() {
		return String.join(":", properties.getService(), properties.getGroup());
	}

	private void resetIfNeeded(Instance instance) {
		if (!properties.getMetadata().equals(instance.getMetadata())) {
			properties.setMetadata(instance.getMetadata());
		}
	}

	private Optional<Instance> selectCurrentInstance(List<Instance> instances) {
		return instances.stream()
				.filter(instance -> properties.getIp().equals(instance.getIp())
						&& properties.getPort() == instance.getPort())
				.findFirst();
	}

    ....

	public void nacosServicesWatch() {
        
		// nacos doesn't support watch now , publish an event every 30 seconds.
		this.publisher.publishEvent(
				new HeartbeatEvent(this, nacosWatchIndex.getAndIncrement()));

	}

}



...com.alibaba.nacos.client.naming.core.HostReactor...
    
public HostReactor(NamingProxy serverProxy, BeatReactor beatReactor, String cacheDir, boolean loadCacheAtStart,
                       boolean pushEmptyProtection, int pollingThreadCount) {
    // init executorService
    this.executor = new ScheduledThreadPoolExecutor(pollingThreadCount, new ThreadFactory() {
        @Override
        public Thread newThread(Runnable r) {
            Thread thread = new Thread(r);
            thread.setDaemon(true);
            thread.setName("com.alibaba.nacos.client.naming.updater");
            return thread;
        }
    });

    this.beatReactor = beatReactor;
    this.serverProxy = serverProxy;
    this.cacheDir = cacheDir;
    if (loadCacheAtStart) {
        this.serviceInfoMap = new ConcurrentHashMap<String, ServiceInfo>(DiskCache.read(this.cacheDir));
    } else {
        this.serviceInfoMap = new ConcurrentHashMap<String, ServiceInfo>(16);
    }
    this.pushEmptyProtection = pushEmptyProtection;
    this.updatingMap = new ConcurrentHashMap<String, Object>();
    //故障转移反应器
    this.failoverReactor = new FailoverReactor(this, cacheDir);
    //开启socket连接 等待接收nacos 服务端推送过来的信息
    this.pushReceiver = new PushReceiver(this);
    //服务实例改变通知者  注册服务
    this.notifier = new InstancesChangeNotifier();

    
    //这里第一次调用 静态初始化了 通知中心
    NotifyCenter.registerToPublisher(InstancesChangeEvent.class, 16384);
    //添加订阅者
    NotifyCenter.registerSubscriber(notifier);
}



...com.alibaba.nacos.common.notify.NotifyCenter...
static {
    // Internal ArrayBlockingQueue buffer size. For applications with high write throughput,
    // this value needs to be increased appropriately. default value is 16384
    String ringBufferSizeProperty = "nacos.core.notify.ring-buffer-size";
    ringBufferSize = Integer.getInteger(ringBufferSizeProperty, 16384);

    // The size of the public publisher's message staging queue buffer
    String shareBufferSizeProperty = "nacos.core.notify.share-buffer-size";
    shareBufferSize = Integer.getInteger(shareBufferSizeProperty, 1024);

    //spi
    final ServiceLoader<EventPublisher> loader = ServiceLoader.load(EventPublisher.class);
    Iterator<EventPublisher> iterator = loader.iterator();

    if (iterator.hasNext()) {
        clazz = iterator.next().getClass();
    } else {
       	//动态加载不到使用默认的
        clazz = DefaultPublisher.class;
    }

    //等待初始化
    publisherFactory = new BiFunction<Class<? extends Event>, Integer, EventPublisher>() {
        @Override
        public EventPublisher apply(Class<? extends Event> cls, Integer buffer) {
            try {
                EventPublisher publisher = clazz.newInstance();
                //这里的初始化  并启动线程   线程内持有阻塞队列等待接收事件
                publisher.init(cls, buffer);
                return publisher;
            } catch (Throwable ex) {
                LOGGER.error("Service class newInstance has error : {}", ex);
                throw new NacosRuntimeException(SERVER_ERROR, ex);
            }
        }
    };

    try {
		//初始化共享发布者
        // Create and init DefaultSharePublisher instance.
        INSTANCE.sharePublisher = new DefaultSharePublisher();
        INSTANCE.sharePublisher.init(SlowEvent.class, shareBufferSize);

    } catch (Throwable ex) {
        LOGGER.error("Service class newInstance has error : {}", ex);
    }

    ThreadUtils.addShutdownHook(new Runnable() {
        @Override
        public void run() {
            shutdown();
        }
    });
}

//注册一个发布者
public static EventPublisher registerToPublisher(final Class<? extends Event> eventType, final int queueMaxSize) {
    if (ClassUtils.isAssignableFrom(SlowEvent.class, eventType)) {
        return INSTANCE.sharePublisher;
    }

    final String topic = ClassUtils.getCanonicalName(eventType);
    //确保线程安全
    synchronized (NotifyCenter.class) {
        // MapUtils.computeIfAbsent is a unsafe method.
        //调用工厂函数publisherFactory   初始化实例信息改变的发布线程   
        MapUtils.computeIfAbsent(INSTANCE.publisherMap, topic, publisherFactory, eventType, queueMaxSize);
    }
    return INSTANCE.publisherMap.get(topic);
}



...com.alibaba.nacos.client.naming.NacosNamingService...
    @Override
    public void subscribe(String serviceName, String groupName, List<String> clusters, EventListener listener)
    throws NacosException {
    //调用持有的  hostReactor 
    hostReactor.subscribe(NamingUtils.getGroupedName(serviceName, groupName), StringUtils.join(clusters, ","),
                          listener);
}


...com.alibaba.nacos.client.naming.core.HostReactor...
    public void subscribe(String serviceName, String clusters, EventListener eventListener) {
    //先注册eventListener
    notifier.registerListener(serviceName, clusters, eventListener);
    //根据 服务坐标  获取ServiceInfo
    getServiceInfo(serviceName, clusters);
}

//...com.alibaba.nacos.client.naming.core.HostReactor..
public ServiceInfo getServiceInfo(final String serviceName, final String clusters) {

    NAMING_LOGGER.debug("failover-mode: " + failoverReactor.isFailoverSwitch());
    String key = ServiceInfo.getKey(serviceName, clusters);
    if (failoverReactor.isFailoverSwitch()) {
        return failoverReactor.getService(key);
    }

    ServiceInfo serviceObj = getServiceInfo0(serviceName, clusters);

    if (null == serviceObj) {
        serviceObj = new ServiceInfo(serviceName, clusters);

        serviceInfoMap.put(serviceObj.getKey(), serviceObj);

        updatingMap.put(serviceName, new Object());
        //立即更新服务信息
        updateServiceNow(serviceName, clusters);
        updatingMap.remove(serviceName);

    } else if (updatingMap.containsKey(serviceName)) { //如果条件为true 说明正在更新该服务信息  

        if (UPDATE_HOLD_INTERVAL > 0) {
            // hold a moment waiting for update finish
            synchronized (serviceObj) {     //试图更新同一个serviceObj的线程等待
                try {
                    serviceObj.wait(UPDATE_HOLD_INTERVAL);
                } catch (InterruptedException e) {
                    NAMING_LOGGER
                        .error("[getServiceInfo] serviceName:" + serviceName + ", clusters:" + clusters, e);
                }
            }
        }
    }

    scheduleUpdateIfAbsent(serviceName, clusters);

    return serviceInfoMap.get(serviceObj.getKey());
}


private void updateServiceNow(String serviceName, String clusters) {
    try {
        //真正更新
        updateService(serviceName, clusters);
    } catch (NacosException e) {
        NAMING_LOGGER.error("[NA] failed to update serviceName: " + serviceName, e);
    }
}


public void updateService(String serviceName, String clusters) throws NacosException {
    //获取旧的信息
    ServiceInfo oldService = getServiceInfo0(serviceName, clusters);
    try {
		//查询新的服务信息 并订阅
        String result = serverProxy.queryList(serviceName, clusters, pushReceiver.getUdpPort(), false);

        if (StringUtils.isNotEmpty(result)) {
            //重点  处理信息
            processServiceJson(result);
        }
    } finally {
        if (oldService != null) {
            synchronized (oldService) {
                oldService.notifyAll();
            }
        }
    }
}


//处理结果
public ServiceInfo processServiceJson(String json) {
    ServiceInfo serviceInfo = JacksonUtils.toObj(json, ServiceInfo.class);
    //旧的服务信息
    ServiceInfo oldService = serviceInfoMap.get(serviceInfo.getKey());

    if (pushEmptyProtection && !serviceInfo.validate()) {
        //empty or error push, just ignore
        return oldService;
    }

    boolean changed = false;
	
    //如果拉取过该服务信息
    if (oldService != null) {
	
        //检验新新服务信息的时效性
        if (oldService.getLastRefTime() > serviceInfo.getLastRefTime()) {
            NAMING_LOGGER.warn("out of date data received, old-t: " + oldService.getLastRefTime() + ", new-t: "
                               + serviceInfo.getLastRefTime());
        }
		
        //覆盖旧的信息
        serviceInfoMap.put(serviceInfo.getKey(), serviceInfo);

        //取出旧信息的服务实例列表
        Map<String, Instance> oldHostMap = new HashMap<String, Instance>(oldService.getHosts().size());
        for (Instance host : oldService.getHosts()) {
            oldHostMap.put(host.toInetAddr(), host);
        }
       //取出刚拉取的服务信息的 服务实例列表
        Map<String, Instance> newHostMap = new HashMap<String, Instance>(serviceInfo.getHosts().size());
        for (Instance host : serviceInfo.getHosts()) {
            newHostMap.put(host.toInetAddr(), host);
        }

        //修改的服务实例
        Set<Instance> modHosts = new HashSet<Instance>();
        //新增的服务实例
        Set<Instance> newHosts = new HashSet<Instance>();
       	//删除的服务实例
        Set<Instance> remvHosts = new HashSet<Instance>();

        //新拉取的服务实例列表
        List<Map.Entry<String, Instance>> newServiceHosts = new ArrayList<Map.Entry<String, Instance>>(
            newHostMap.entrySet());
        
        for (Map.Entry<String, Instance> entry : newServiceHosts) {
            Instance host = entry.getValue();
            String key = entry.getKey();
      
           // Instance{
           //instanceId='192.168.1.157#8888#DEFAULT#DEFAULT_GROUP@@gateway', 
           //ip='192.168.1.157', 
           //port=8888, 
           //weight=1.0, 
           //healthy=true, 
           //enabled=true, 
           //ephemeral=true, 
           //clusterName='DEFAULT', 
           //serviceName='DEFAULT_GROUP@@gateway', 
           //metadata={preserved.register.source=SPRING_CLOUD}
           //}
            
            
            //判断以上信息是否修改  若修改 加入的修改的map里
            if (oldHostMap.containsKey(key) && !StringUtils
                .equals(host.toString(), oldHostMap.get(key).toString())) {
                modHosts.add(host);
                continue;
            }
			//旧map里不存在 添加到新增里
            if (!oldHostMap.containsKey(key)) {
                newHosts.add(host);
            }
        }

        for (Map.Entry<String, Instance> entry : oldHostMap.entrySet()) {
            Instance host = entry.getValue();
            String key = entry.getKey();
            if (newHostMap.containsKey(key)) {
                continue;
            }
			// 筛选出被移除的服务
            if (!newHostMap.containsKey(key)) {
                remvHosts.add(host);
            }

        }
		
        //此后三种情况都表明状态改变
        if (newHosts.size() > 0) {
            changed = true;
            NAMING_LOGGER.info("new ips(" + newHosts.size() + ") service: " + serviceInfo.getKey() + " -> "
                               + JacksonUtils.toJson(newHosts));
        }

        if (remvHosts.size() > 0) {
            changed = true;
            NAMING_LOGGER.info("removed ips(" + remvHosts.size() + ") service: " + serviceInfo.getKey() + " -> "
                               + JacksonUtils.toJson(remvHosts));
        }
		
        if (modHosts.size() > 0) {
            changed = true;
            //有修改要更新  心跳信息
            updateBeatInfo(modHosts);
            NAMING_LOGGER.info("modified ips(" + modHosts.size() + ") service: " + serviceInfo.getKey() + " -> "
                               + JacksonUtils.toJson(modHosts));
        }

        serviceInfo.setJsonFromServer(json);

        if (newHosts.size() > 0 || remvHosts.size() > 0 || modHosts.size() > 0) {
         //这里发送事件
            NotifyCenter.publishEvent(new InstancesChangeEvent(serviceInfo.getName(), serviceInfo.getGroupName(),
                                                               serviceInfo.getClusters(), serviceInfo.getHosts()));
         //将服务信息写入磁盘
            DiskCache.write(serviceInfo, cacheDir);
        }

    } else {  //第一次拉取服务信息
        changed = true;
        NAMING_LOGGER.info("init new ips(" + serviceInfo.ipCount() + ") service: " + serviceInfo.getKey() + " -> "
                           + JacksonUtils.toJson(serviceInfo.getHosts()));
        serviceInfoMap.put(serviceInfo.getKey(), serviceInfo);
        //直接发送事件
        NotifyCenter.publishEvent(new InstancesChangeEvent(serviceInfo.getName(), serviceInfo.getGroupName(),
                                                           serviceInfo.getClusters(), serviceInfo.getHosts()));
        serviceInfo.setJsonFromServer(json);
        //写入硬盘
        DiskCache.write(serviceInfo, cacheDir);
    }

    MetricsMonitor.getServiceInfoMapSizeMonitor().set(serviceInfoMap.size());

    if (changed) {
        NAMING_LOGGER.info("current ips:(" + serviceInfo.ipCount() + ") service: " + serviceInfo.getKey() + " -> "
                           + JacksonUtils.toJson(serviceInfo.getHosts()));
    }

    return serviceInfo;
}


//...com.alibaba.nacos.common.notify.NotifyCenter...
public static boolean publishEvent(final Event event) {
    try {
        //发布事件
        return publishEvent(event.getClass(), event);
    } catch (Throwable ex) {
        LOGGER.error("There was an exception to the message publishing : {}", ex);
        return false;
    }
}


private static boolean publishEvent(final Class<? extends Event> eventType, final Event event) {
    if (ClassUtils.isAssignableFrom(SlowEvent.class, eventType)) {
        return INSTANCE.sharePublisher.publish(event);
    }

    final String topic = ClassUtils.getCanonicalName(eventType);
	
   //寻找事件绑定的发布者  
    EventPublisher publisher = INSTANCE.publisherMap.get(topic);
    if (publisher != null) {
        //发布事件
        return publisher.publish(event);
    }
    LOGGER.warn("There are no [{}] publishers for this event, please register", topic);
    return false;
}


//...com.alibaba.nacos.common.notify.DefaultPublisher...
public boolean publish(Event event) {
    //检查启动
    checkIsStart();
    // 阻塞的线程会取值执行
    boolean success = this.queue.offer(event);
    if (!success) {
        LOGGER.warn("Unable to plug in due to interruption, synchronize sending time, event : {}", event);
        //阻塞对了无法处理， 交由主线程接收处理  并给与警告!
        receiveEvent(event);
        return true;
    }
    return true;
}

//
void receiveEvent(Event event) {
    final long currentEventSequence = event.sequence();

    // Notification single event listener
    for (Subscriber subscriber : subscribers) {
        // Whether to ignore expiration events
        if (subscriber.ignoreExpireEvent() && lastEventSequence > currentEventSequence) {
            LOGGER.debug("[NotifyCenter] the {} is unacceptable to this subscriber, because had expire",
                         event.getClass());
            continue;
        }

        // Because unifying smartSubscriber and subscriber, so here need to think of compatibility.
        // Remove original judge part of codes.
        //通知订阅者
        notifySubscriber(subscriber, event);
    }
}


public void notifySubscriber(final Subscriber subscriber, final Event event) {

    LOGGER.debug("[NotifyCenter] the {} will received by {}", event, subscriber);

    //new Runnable
    final Runnable job = new Runnable() {
        @Override
        public void run() {
            subscriber.onEvent(event);
        }
    };
    
	//获取发布者自己的线程池
    final Executor executor = subscriber.executor();

    if (executor != null) {	//存在则放在线程池内执行
        executor.execute(job);
    } else {  //否则在本线程内执行
        try {
            job.run();
        } catch (Throwable e) {
            LOGGER.error("Event callback exception : {}", e);
        }
    }
}


public void onEvent(InstancesChangeEvent event) {
    String key = ServiceInfo.getKey(event.getServiceName(), event.getClusters());
    ConcurrentHashSet<EventListener> eventListeners = listenerMap.get(key);
    if (CollectionUtils.isEmpty(eventListeners)) {
        return;
    }
    for (final EventListener listener : eventListeners) {
        final com.alibaba.nacos.api.naming.listener.Event namingEvent = transferToNamingEvent(event);
        //可用自己的线程池执行
        if (listener instanceof AbstractEventListener && ((AbstractEventListener) listener).getExecutor() != null) {
            ((AbstractEventListener) listener).getExecutor().execute(new Runnable() {
                @Override
                public void run() {
                    listener.onEvent(namingEvent);
                }
            });
            continue;
        }
        //执行
        listener.onEvent(namingEvent);
    }
}
~~~





~~~java
...org.springframework.cloud.client.discovery.simple.SimpleDiscoveryClientAutoConfiguration...
   
//该配置类 简单的将服务注册发现的信息封装起来 spring提供
@Configuration(proxyBeanMethods = false)
@AutoConfigureBefore({ NoopDiscoveryClientAutoConfiguration.class,
		CommonsClientAutoConfiguration.class })
public class SimpleDiscoveryClientAutoConfiguration
		implements ApplicationListener<WebServerInitializedEvent> {

	private ServerProperties server;

	private InetUtils inet;

	private int port = 0;

	private SimpleDiscoveryProperties simple = new SimpleDiscoveryProperties();

	@Autowired(required = false)
	public void setServer(ServerProperties server) {
		this.server = server;
	}

	@Autowired
	public void setInet(InetUtils inet) {
		this.inet = inet;
	}

    //读取配置文件生成 properties
	@Bean
	@ConditionalOnMissingBean
	public SimpleDiscoveryProperties simpleDiscoveryProperties(
			@Value("${spring.application.name:application}") String serviceId) {
		simple.getLocal().setServiceId(serviceId);
		simple.getLocal()
				.setUri(URI.create(
						"http://" + this.inet.findFirstNonLoopbackHostInfo().getHostname()
								+ ":" + findPort()));
		return simple;
	}
    
    //client 持有 properties
	@Bean
	@Order
	public DiscoveryClient simpleDiscoveryClient(SimpleDiscoveryProperties properties) {
		return new SimpleDiscoveryClient(properties);
	}

	private int findPort() {
		if (port > 0) {
			return port;
		}
		if (this.server != null && this.server.getPort() != null
				&& this.server.getPort() > 0) {
			return this.server.getPort();
		}
		return 8080;
	}

	@Override
	public void onApplicationEvent(WebServerInitializedEvent webServerInitializedEvent) {
		this.port = webServerInitializedEvent.getWebServer().getPort();
		if (this.port > 0) {
			simple.getLocal()
					.setUri(URI.create("http://"
							+ this.inet.findFirstNonLoopbackHostInfo().getHostname() + ":"
							+ this.port));
		}
	}

}
~~~



~~~java
...org.springframework.cloud.client.discovery.simple.reactive.SimpleReactiveDiscoveryClientAutoConfiguration...
@Configuration(proxyBeanMethods = false)
@ConditionalOnDiscoveryEnabled
@ConditionalOnReactiveDiscoveryEnabled
@EnableConfigurationProperties(DiscoveryClientHealthIndicatorProperties.class)
@AutoConfigureBefore(ReactiveCommonsClientAutoConfiguration.class)
@AutoConfigureAfter(ReactiveCompositeDiscoveryClientAutoConfiguration.class)
public class SimpleReactiveDiscoveryClientAutoConfiguration
		implements ApplicationListener<WebServerInitializedEvent> {

	@Autowired(required = false)
	private ServerProperties server;

	@Value("${spring.application.name:application}")
	private String serviceId;

	@Autowired
	private InetUtils inet;

	private int port = 0;

	private SimpleReactiveDiscoveryProperties simple = new SimpleReactiveDiscoveryProperties();

	@Bean
	public SimpleReactiveDiscoveryProperties simpleReactiveDiscoveryProperties() {
		simple.getLocal().setServiceId(serviceId);
		simple.getLocal().setUri(URI.create("http://"
				+ inet.findFirstNonLoopbackHostInfo().getHostname() + ":" + findPort()));
		return simple;
	}

	@Bean
	@Order
	public SimpleReactiveDiscoveryClient simpleReactiveDiscoveryClient() {
		return new SimpleReactiveDiscoveryClient(simpleReactiveDiscoveryProperties());
	}

	private int findPort() {
		if (port > 0) {
			return port;
		}
		if (server != null && server.getPort() != null && server.getPort() > 0) {
			return server.getPort();
		}
		return 8080;
	}

	@Override
	public void onApplicationEvent(WebServerInitializedEvent webServerInitializedEvent) {
		port = webServerInitializedEvent.getWebServer().getPort();
		if (port > 0) {
			simple.getLocal().setUri(URI.create("http://"
					+ inet.findFirstNonLoopbackHostInfo().getHostname() + ":" + port));
		}
	}

	@Configuration(proxyBeanMethods = false)
	@ConditionalOnClass(ReactiveHealthIndicator.class)
	protected static class HealthConfiguration {

		@Bean
		@ConditionalOnDiscoveryHealthIndicatorEnabled
		public ReactiveDiscoveryClientHealthIndicator simpleReactiveDiscoveryClientHealthIndicator(
				DiscoveryClientHealthIndicatorProperties properties,
				SimpleReactiveDiscoveryClient simpleReactiveDiscoveryClient) {
			return new ReactiveDiscoveryClientHealthIndicator(
					simpleReactiveDiscoveryClient, properties);
		}

	}

}

~~~

### 服务端

#### 服务注册

~~~java
/**
 * Register new instance.
 *
 * @param request http request
 * @return 'ok' if success
 * @throws Exception any error during register
*/

//...com.alibaba.nacos.naming.controllers.InstanceController...
@CanDistro
@PostMapping
@Secured(parser = NamingResourceParser.class, action = ActionTypes.WRITE)
public String register(HttpServletRequest request) throws Exception {

    final String namespaceId = WebUtils
        .optional(request, CommonParams.NAMESPACE_ID, Constants.DEFAULT_NAMESPACE_ID);
    final String serviceName = WebUtils.required(request, CommonParams.SERVICE_NAME);
    NamingUtils.checkServiceNameFormat(serviceName);

    final Instance instance = parseInstance(request);
	
    //注册
    serviceManager.registerInstance(namespaceId, serviceName, instance);
    return "ok";
}

//...com.alibaba.nacos.naming.core.ServiceManager...

 /**
 * Map(namespace, Map(group::serviceName, Service)).
 */
private final Map<String, Map<String, Service>> serviceMap = new ConcurrentHashMap<>();


/**
 * Register an instance to a service in AP mode.
 *
 * <p>This method creates service or cluster silently if they don't exist.
 *
 * @param namespaceId id of namespace
 * @param serviceName service name
 * @param instance    instance to register
 * @throws Exception any error occurred in the process
 */
public void registerInstance(String namespaceId, String serviceName, Instance instance) throws NacosException {
	//客户端传来的是所属服务  以及服务实例信息
    
    //创建空的服务
    createEmptyService(namespaceId, serviceName, instance.isEphemeral());

    Service service = getService(namespaceId, serviceName);

    if (service == null) {
        throw new NacosException(NacosException.INVALID_PARAM,
                                 "service not found, namespace: " + namespaceId + ", service: " + serviceName);
    }
	//将服务实例添加进服务   一对多  一服务对应多个服务实例
    addInstance(namespaceId, serviceName, instance.isEphemeral(), instance);
}

public void createEmptyService(String namespaceId, String serviceName, boolean local) throws NacosException {
    createServiceIfAbsent(namespaceId, serviceName, local, null);
}

/**
     * Create service if not exist.
     *
     * @param namespaceId namespace
     * @param serviceName service name
     * @param local       whether create service by local
     * @param cluster     cluster
     * @throws NacosException nacos exception
     */
public void createServiceIfAbsent(String namespaceId, String serviceName, boolean local, Cluster cluster)
    throws NacosException {
    Service service = getService(namespaceId, serviceName);
    if (service == null) {

        Loggers.SRV_LOG.info("creating empty service {}:{}", namespaceId, serviceName);
        service = new Service();
        service.setName(serviceName);
        service.setNamespaceId(namespaceId);
        service.setGroupName(NamingUtils.getGroupName(serviceName));
        // now validate the service. if failed, exception will be thrown
        service.setLastModifiedMillis(System.currentTimeMillis());
        service.recalculateChecksum();
        //
        if (cluster != null) {
            cluster.setService(service);
            service.getClusterMap().put(cluster.getName(), cluster);
        }
        service.validate();

        //放入分级缓存并初始化
        putServiceAndInit(service);
        if (!local) {
            addOrReplaceService(service);
        }
    }
}


private void putServiceAndInit(Service service) throws NacosException {
    //放入  该方法线程安全
    putService(service);
    //再拿出
    service = getService(service.getNamespaceId(), service.getName());
    //初始化  （开启了任务）
    service.init();
    
    //临时实例监听  （service）
    consistencyService
        .listen(KeyBuilder.buildInstanceListKey(service.getNamespaceId(), service.getName(), true), service);
    //永久实例监听  （service）
    consistencyService
        .listen(KeyBuilder.buildInstanceListKey(service.getNamespaceId(), service.getName(), false), service);
    Loggers.SRV_LOG.info("[NEW-SERVICE] {}", service.toJson());
}


//...com.alibaba.nacos.naming.core.Service..
public void init() {
    //！！！开启客户端心跳检测任务！！！
    HealthCheckReactor.scheduleCheck(clientBeatCheckTask);
    
   //放入集群  初始化集群
    for (Map.Entry<String, Cluster> entry : clusterMap.entrySet()) {
        entry.getValue().setService(this);
        entry.getValue().init();
    }
}

//...com.alibaba.nacos.naming.healthcheck.HealthCheckReactor...
public static void scheduleCheck(ClientBeatCheckTask task) {
    //确保心跳检测定时任务只开启一次
    futureMap.computeIfAbsent(task.taskKey(),
                              k -> GlobalExecutor.scheduleNamingHealth(task, 5000, 5000, TimeUnit.MILLISECONDS));
}


//...com.alibaba.nacos.naming.healthcheck.ClientBeatCheckTask#ClientBeatCheckTask...
public void run() {
    try {
        //检测是否该节点相应
        if (!getDistroMapper().responsible(service.getName())) {
            return;
        }
		//是否开启健康检查
        if (!getSwitchDomain().isHealthCheckEnabled()) {
            return;
        }
		
        //获取所有临时实例
        List<Instance> instances = service.allIPs(true);
		
        // first set health status of instances:
        for (Instance instance : instances) {
            //心跳超时
            if (System.currentTimeMillis() - instance.getLastBeat() > instance.getInstanceHeartBeatTimeOut()) {
                //无标记
                if (!instance.isMarked()) {
                    if (instance.isHealthy()) {//实例健康
                        instance.setHealthy(false); // 修改实例健康为不健康
                        Loggers.EVT_LOG
                            .info("{POS} {IP-DISABLED} valid: {}:{}@{}@{}, region: {}, msg: client timeout after {}, last beat: {}",
                                  instance.getIp(), instance.getPort(), instance.getClusterName(),
                                  service.getName(), UtilsAndCommons.LOCALHOST_SITE,
                                  instance.getInstanceHeartBeatTimeOut(), instance.getLastBeat());
                        //发布实例更新事件
                        getPushService().serviceChanged(service);
                        //发布心跳超时事件
                        ApplicationUtils.publishEvent(new InstanceHeartbeatTimeoutEvent(this, instance));
                    }
                }
            }
        }

        if (!getGlobalConfig().isExpireInstance()) {
            return;
        }

        // then remove obsolete instances:
        for (Instance instance : instances) {

            if (instance.isMarked()) {
                continue;
            }

            if (System.currentTimeMillis() - instance.getLastBeat() > instance.getIpDeleteTimeout()) {
                // delete instance
                Loggers.SRV_LOG.info("[AUTO-DELETE-IP] service: {}, ip: {}", service.getName(),
                                     JacksonUtils.toJson(instance));
                deleteIp(instance);
            }
        }

    } catch (Exception e) {
        Loggers.SRV_LOG.warn("Exception while processing client beat time out.", e);
    }

}


//...com.alibaba.nacos.naming.consistency.DelegateConsistencyServiceImpl...
@Override
public void listen(String key, RecordListener listener) throws NacosException {

    // this special key is listened by both:
    if (KeyBuilder.SERVICE_META_KEY_PREFIX.equals(key)) {
        persistentConsistencyService.listen(key, listener);
        ephemeralConsistencyService.listen(key, listener);
        return;
    }
	
    //选一个一致性服务进行监听
    mapConsistencyService(key).listen(key, listener);
}

private ConsistencyService mapConsistencyService(String key) {
    //根据key 从永久实例一致性服务和 暂时实例一致性服务服务中选一个
    return KeyBuilder.matchEphemeralKey(key) ? ephemeralConsistencyService : persistentConsistencyService;
}


//...com.alibaba.nacos.naming.consistency.ephemeral.distro.DistroConsistencyServiceImpl...
//选中的临时实例一致性服务
@Override
public void listen(String key, RecordListener listener) throws NacosException {
    if (!listeners.containsKey(key)) {
        listeners.put(key, new ConcurrentLinkedQueue<>());
    }

    if (listeners.get(key).contains(listener)) {
        return;
    }
    
	//服务入队
    listeners.get(key).add(listener);
}


//...com.alibaba.nacos.naming.consistency.persistent.PersistentConsistencyServiceDelegateImpl...
public void listen(String key, RecordListener listener) throws NacosException {
    //添加进内部的notefer
    oldPersistentConsistencyService.listen(key, listener);  //弃用的 略过
   	//添加进内部的notefer
    newPersistentConsistencyService.listen(key, listener);
}

//...com.alibaba.nacos.naming.consistency.persistent.impl.StandalonePersistentServiceProcessor...
public void listen(String key, RecordListener listener) throws NacosException {
    //注册 监听器
    notifier.registerListener(key, listener);
    if (startNotify) {
        //开始通知
        notifierDatumIfAbsent(key, listener);
    }
}


//...com.alibaba.nacos.naming.consistency.persistent.PersistentNotifier...
public void registerListener(final String key, final RecordListener listener) {
    listenerMap.computeIfAbsent(key, s -> new ConcurrentHashSet<>());
    listenerMap.get(key).add(listener);
}

//饥饿通知
protected void notifierDatumIfAbsent(String key, RecordListener listener) throws NacosException {
    if (KeyBuilder.SERVICE_META_KEY_PREFIX.equals(key)) {
        notifierAllServiceMeta(listener);
    } else {
        //封装的Google数据类型
        Datum datum = get(key);
        if (null != datum) {
            //
            notifierDatum(key, datum, listener);
        }
    }
}


public Datum get(String key) throws NacosException {
    final List<byte[]> keys = Collections.singletonList(ByteUtils.toBytes(key));
    final ReadRequest req = ReadRequest.newBuilder().setGroup(Constants.NAMING_PERSISTENT_SERVICE_GROUP)
        .setData(ByteString.copyFrom(serializer.serialize(keys))).build();
    try {
        //
        final Response resp = onRequest(req);
        if (resp.getSuccess()) {
            BatchReadResponse response = serializer
                .deserialize(resp.getData().toByteArray(), BatchReadResponse.class);
            final List<byte[]> rValues = response.getValues();
            return rValues.isEmpty() ? null : serializer.deserialize(rValues.get(0), getDatumTypeFromKey(key));
        }
        throw new NacosException(ErrorCode.ProtoReadError.getCode(), resp.getErrMsg());
    } catch (Throwable e) {
        throw new NacosException(ErrorCode.ProtoReadError.getCode(), e.getMessage());
    }
}


public Response onRequest(ReadRequest request) {
    //反序列化
    final List<byte[]> keys = serializer
        .deserialize(request.getData().toByteArray(), TypeUtils.parameterize(List.class, byte[].class));
    final Lock lock = readLock;
    lock.lock();
    try {
        //缓存里取
        final Map<byte[], byte[]> result = kvStorage.batchGet(keys);
        final BatchReadResponse response = new BatchReadResponse();
        result.forEach(response::append);
        return Response.newBuilder().setSuccess(true).setData(ByteString.copyFrom(serializer.serialize(response)))
            .build();
    } catch (KvStorageException e) {
        return Response.newBuilder().setSuccess(false).setErrMsg(e.getErrMsg()).build();
    } finally {
        lock.unlock();
    }
}


//...com.alibaba.nacos.naming.core.ServiceManager...
public void addInstance(String namespaceId, String serviceName, boolean ephemeral, Instance... ips)
    throws NacosException {

    String key = KeyBuilder.buildInstanceListKey(namespaceId, serviceName, ephemeral);

    Service service = getService(namespaceId, serviceName);

    synchronized (service) {
        //给空的服务添加 服务实例
        List<Instance> instanceList = addIpAddresses(service, ephemeral, ips);

        //
        Instances instances = new Instances();
        //
        instances.setInstanceList(instanceList);
		
       //@将服务实例列表添加进  一致性服务@   这里触发事件
        consistencyService.put(key, instances);
    }
}

// @@ 将服务实例列表添加进  一致性服务 @@
//...com.alibaba.nacos.naming.consistency.ephemeral.distro.DistroConsistencyServiceImpl...
@PostConstruct
public void init() {
    //开启分布式通知服务
    GlobalExecutor.submitDistroNotifyTask(notifier);
}


public void put(String key, Record value) throws NacosException {
    onPut(key, value);
    
    //分布式  同步服务实例 给其它nacos 节点
    distroProtocol.sync(new DistroKey(key, KeyBuilder.INSTANCE_LIST_KEY_PREFIX), DataOperation.CHANGE,
                        globalConfig.getTaskDispatchPeriod() / 2);
}

// 
public void onPut(String key, Record value) {

    if (KeyBuilder.matchEphemeralInstanceListKey(key)) {
        Datum<Instances> datum = new Datum<>();
        datum.value = (Instances) value;
        datum.key = key;
        datum.timestamp.incrementAndGet();
        
        //将实例缓存起来
        dataStore.put(key, datum);
    }

    if (!listeners.containsKey(key)) {
        return;
    }
	
    //存在匹配的 listener则添加任务
    notifier.addTask(key, DataOperation.CHANGE);
}

//...com.alibaba.nacos.naming.consistency.ephemeral.distro.DistroConsistencyServiceImpl.Notifier...
public void addTask(String datumKey, DataOperation action) {
    if (services.containsKey(datumKey) && action == DataOperation.CHANGE) {
        return;
    }
    if (action == DataOperation.CHANGE) {
        services.put(datumKey, StringUtils.EMPTY);
    }
    
    //添加一个任务
    tasks.offer(Pair.with(datumKey, action));
}

//
@Override
public void run() {
    Loggers.DISTRO.info("distro notifier started");

    for (; ; ) {
        try {
            //阻塞队列
            Pair<String, DataOperation> pair = tasks.take();
            handle(pair);
        } catch (Throwable e) {
            Loggers.DISTRO.error("[NACOS-DISTRO] Error while handling notifying task", e);
        }
    }
}

//处理
private void handle(Pair<String, DataOperation> pair) {
    try {
        String datumKey = pair.getValue0();
        DataOperation action = pair.getValue1();

        services.remove(datumKey);

        int count = 0;

        if (!listeners.containsKey(datumKey)) {
            return;
        }

        for (RecordListener listener : listeners.get(datumKey)) {

            count++;

            try {
                if (action == DataOperation.CHANGE) 
                    //change        //这里取到了  dataStore.get(datumKey).value
                    listener.onChange(datumKey, dataStore.get(datumKey).value);
                    continue;
                }

                if (action == DataOperation.DELETE) {
                    //删除
                    listener.onDelete(datumKey);
                    continue;
                }
            } catch (Throwable e) {
                Loggers.DISTRO.error("[NACOS-DISTRO] error while notifying listener of key: {}", datumKey, e);
            }
        }

        if (Loggers.DISTRO.isDebugEnabled()) {
            Loggers.DISTRO
                .debug("[NACOS-DISTRO] datum change notified, key: {}, listener count: {}, action: {}",
                       datumKey, count, action.name());
        }
    } catch (Throwable e) {
        Loggers.DISTRO.error("[NACOS-DISTRO] Error while handling notifying task", e);
    }
}
}

//...com.alibaba.nacos.naming.core.Service...
//参数 Instances 该服务下的所以实例 永久或临时实例
@Override
    public void onChange(String key, Instances value) throws Exception {
        
        Loggers.SRV_LOG.info("[NACOS-RAFT] datum is changed, key: {}, value: {}", key, value);
        
        for (Instance instance : value.getInstanceList()) {
            
            if (instance == null) {
                // Reject this abnormal instance list:
                throw new RuntimeException("got null instance " + key);
            }
            
            //参数修正
            if (instance.getWeight() > 10000.0D) {
                instance.setWeight(10000.0D);
            }
               //参数修正
            if (instance.getWeight() < 0.01D && instance.getWeight() > 0.0D) {
                instance.setWeight(0.01D);
            }
        }
        
        updateIPs(value.getInstanceList(), KeyBuilder.matchEphemeralInstanceListKey(key));
        
        recalculateChecksum();
    }

//更新实例列表
public void updateIPs(Collection<Instance> instances, boolean ephemeral) {
    Map<String, List<Instance>> ipMap = new HashMap<>(clusterMap.size());
    for (String clusterName : clusterMap.keySet()) {
        ipMap.put(clusterName, new ArrayList<>());
    }

    for (Instance instance : instances) {
        try {
            if (instance == null) {
                Loggers.SRV_LOG.error("[NACOS-DOM] received malformed ip: null");
                continue;
            }

            if (StringUtils.isEmpty(instance.getClusterName())) {
                instance.setClusterName(UtilsAndCommons.DEFAULT_CLUSTER_NAME);
            }

            if (!clusterMap.containsKey(instance.getClusterName())) {
                Loggers.SRV_LOG
                    .warn("cluster: {} not found, ip: {}, will create new cluster with default configuration.",
                          instance.getClusterName(), instance.toJson());
                Cluster cluster = new Cluster(instance.getClusterName(), this);
                cluster.init();
                getClusterMap().put(instance.getClusterName(), cluster);
            }

            List<Instance> clusterIPs = ipMap.get(instance.getClusterName());
            if (clusterIPs == null) {
                clusterIPs = new LinkedList<>();
                ipMap.put(instance.getClusterName(), clusterIPs);
            }

            clusterIPs.add(instance);
        } catch (Exception e) {
            Loggers.SRV_LOG.error("[NACOS-DOM] failed to process ip: " + instance, e);
        }
    }

    for (Map.Entry<String, List<Instance>> entry : ipMap.entrySet()) {
        //make every ip mine
        List<Instance> entryIPs = entry.getValue();
        //根据集群更新
        clusterMap.get(entry.getKey()).updateIps(entryIPs, ephemeral);
    }

    setLastModifiedMillis(System.currentTimeMillis());
    //这里通知订阅客户端
    getPushService().serviceChanged(this);
    StringBuilder stringBuilder = new StringBuilder();

    for (Instance instance : allIPs()) {
        stringBuilder.append(instance.toIpAddr()).append("_").append(instance.isHealthy()).append(",");
    }

    Loggers.EVT_LOG.info("[IP-UPDATED] namespace: {}, service: {}, ips: {}", getNamespaceId(), getName(),
                         stringBuilder.toString());

}
//@@ 服务改变通知订阅的客户端 @@
//...com.alibaba.nacos.naming.push.PushService...
static {
    try {
        //初始化一个线程去接收
        udpSocket = new DatagramSocket();

        Receiver receiver = new Receiver();

        Thread inThread = new Thread(receiver);
        inThread.setDaemon(true);
        inThread.setName("com.alibaba.nacos.naming.push.receiver");
        inThread.start();

        //移除死去的客户端连接
        GlobalExecutor.scheduleRetransmitter(() -> {
            try {
                removeClientIfZombie();
            } catch (Throwable e) {
                Loggers.PUSH.warn("[NACOS-PUSH] failed to remove client zombie");
            }
        }, 0, 20, TimeUnit.SECONDS);

    } catch (SocketException e) {
        Loggers.SRV_LOG.error("[NACOS-PUSH] failed to init push service");
    }
}

public void serviceChanged(Service service) {
    // merge some change events to reduce the push frequency:
    if (futureMap
        .containsKey(UtilsAndCommons.assembleFullServiceName(service.getNamespaceId(), service.getName()))) {
        return;
    }

    this.applicationContext.publishEvent(new ServiceChangeEvent(this, service));
}

public void onApplicationEvent(ServiceChangeEvent event) {
    Service service = event.getService();
    String serviceName = service.getName();
    String namespaceId = service.getNamespaceId();

    Future future = GlobalExecutor.scheduleUdpSender(() -> {
        try {
            Loggers.PUSH.info(serviceName + " is changed, add it to push queue.");
            //获取订阅该服务的客户端
            ConcurrentMap<String, PushClient> clients = clientMap
                .get(UtilsAndCommons.assembleFullServiceName(namespaceId, serviceName));
            if (MapUtils.isEmpty(clients)) {
                return;
            }
			
            //这个缓存暂时不知道做什么的
            Map<String, Object> cache = new HashMap<>(16);
            long lastRefTime = System.nanoTime();
            //遍历客户端
            for (PushClient client : clients.values()) {
                if (client.zombie()) { //去除僵尸
                    Loggers.PUSH.debug("client is zombie: " + client.toString());
                    clients.remove(client.toString());
                    Loggers.PUSH.debug("client is zombie: " + client.toString());
                    continue;
                }
				
                Receiver.AckEntry ackEntry;
                Loggers.PUSH.debug("push serviceName: {} to client: {}", serviceName, client.toString());
                String key = getPushCacheKey(serviceName, client.getIp(), client.getAgent());
                byte[] compressData = null;
                Map<String, Object> data = null;
                if (switchDomain.getDefaultPushCacheMillis() >= 20000 && cache.containsKey(key)) {
                    org.javatuples.Pair pair = (org.javatuples.Pair) cache.get(key);
                    compressData = (byte[]) (pair.getValue0());
                    data = (Map<String, Object>) pair.getValue1();

                    Loggers.PUSH.debug("[PUSH-CACHE] cache hit: {}:{}", serviceName, client.getAddrStr());
                }

                if (compressData != null) {
                    ackEntry = prepareAckEntry(client, compressData, data, lastRefTime);
                } else {
                    //生成数据推送给客户端
                    ackEntry = prepareAckEntry(client, prepareHostsData(client), lastRefTime);
                    if (ackEntry != null) {
                        cache.put(key, new org.javatuples.Pair<>(ackEntry.origin.getData(), ackEntry.data));
                    }
                }

                Loggers.PUSH.info("serviceName: {} changed, schedule push for: {}, agent: {}, key: {}",
                                  client.getServiceName(), client.getAddrStr(), client.getAgent(),
                                  (ackEntry == null ? null : ackEntry.key));
				//推送
                udpPush(ackEntry);
            }
        } catch (Exception e) {
            Loggers.PUSH.error("[NACOS-PUSH] failed to push serviceName: {} to client, error: {}", serviceName, e);

        } finally {
            //执行完缓存移除
            futureMap.remove(UtilsAndCommons.assembleFullServiceName(namespaceId, serviceName));
        }

    }, 1000, TimeUnit.MILLISECONDS);
    //添加进缓存表示正在推送更新
    futureMap.put(UtilsAndCommons.assembleFullServiceName(namespaceId, serviceName), future);

}


//
private static Receiver.AckEntry udpPush(Receiver.AckEntry ackEntry) {
    if (ackEntry == null) {
        Loggers.PUSH.error("[NACOS-PUSH] ackEntry is null.");
        return null;
    }

    if (ackEntry.getRetryTimes() > MAX_RETRY_TIMES) {
        Loggers.PUSH.warn("max re-push times reached, retry times {}, key: {}", ackEntry.retryTimes, ackEntry.key);
        ackMap.remove(ackEntry.key);
        udpSendTimeMap.remove(ackEntry.key);
        failedPush += 1;
        return ackEntry;
    }

    try {
        if (!ackMap.containsKey(ackEntry.key)) {
            totalPush++;
        }
        ackMap.put(ackEntry.key, ackEntry);
        udpSendTimeMap.put(ackEntry.key, System.currentTimeMillis());

        Loggers.PUSH.info("send udp packet: " + ackEntry.key);
        //发送
        udpSocket.send(ackEntry.origin);

        ackEntry.increaseRetryTime();
		
        //重发一次
        GlobalExecutor.scheduleRetransmitter(new Retransmitter(ackEntry),
                                             TimeUnit.NANOSECONDS.toMillis(ACK_TIMEOUT_NANOS), TimeUnit.MILLISECONDS);
        return ackEntry;
    } catch (Exception e) {
        Loggers.PUSH.error("[NACOS-PUSH] failed to push data: {} to client: {}, error: {}", ackEntry.data,
                           ackEntry.origin.getAddress().getHostAddress(), e);
        ackMap.remove(ackEntry.key);
        udpSendTimeMap.remove(ackEntry.key);
        failedPush += 1;

        return null;
    }
}
//@@ 服务改变通知订阅的客户端 @@
 

//...com.alibaba.nacos.naming.core.Cluster...
public void updateIps(List<Instance> ips, boolean ephemeral) {
	
    Set<Instance> toUpdateInstances = ephemeral ? ephemeralInstances : persistentInstances;

    HashMap<String, Instance> oldIpMap = new HashMap<>(toUpdateInstances.size());

    for (Instance ip : toUpdateInstances) {
        oldIpMap.put(ip.getDatumKey(), ip);
    }
    
    //获取到旧的实例后
    
    //获取更新后的实例列表
    List<Instance> updatedIPs = updatedIps(ips, oldIpMap.values());
    
    if (updatedIPs.size() > 0) {
        for (Instance ip : updatedIPs) {
            Instance oldIP = oldIpMap.get(ip.getDatumKey());

            // do not update the ip validation status of updated ips
            // because the checker has the most precise result
            // Only when ip is not marked, don't we update the health status of IP:
            if (!ip.isMarked()) {
                ip.setHealthy(oldIP.isHealthy());
            }
			
            //有标记 并 健康状态有变化 记录日志
            if (ip.isHealthy() != oldIP.isHealthy()) {
                // ip validation status updated
                Loggers.EVT_LOG.info("{} {SYNC} IP-{} {}:{}@{}", getService().getName(),
                                     (ip.isHealthy() ? "ENABLED" : "DISABLED"), ip.getIp(), ip.getPort(), getName());
            }
			
            //实例权重有变化  记录日志
            if (ip.getWeight() != oldIP.getWeight()) {
                // ip validation status updated
                Loggers.EVT_LOG.info("{} {SYNC} {IP-UPDATED} {}->{}", getService().getName(), oldIP.toString(),
                                     ip.toString());
            }
        }
    }
	
    //提取新的 服务实例列表
    List<Instance> newIPs = subtract(ips, oldIpMap.values());
    if (newIPs.size() > 0) {
        Loggers.EVT_LOG
            .info("{} {SYNC} {IP-NEW} cluster: {}, new ips size: {}, content: {}", getService().getName(),
                  getName(), newIPs.size(), newIPs.toString());

        for (Instance ip : newIPs) {
            //生成一个全新的  健康检查状态实例
            HealthCheckStatus.reset(ip);
        }
    }
	
    List<Instance> deadIPs = subtract(oldIpMap.values(), ips);

    if (deadIPs.size() > 0) {
        Loggers.EVT_LOG
            .info("{} {SYNC} {IP-DEAD} cluster: {}, dead ips size: {}, content: {}", getService().getName(),
                  getName(), deadIPs.size(), deadIPs.toString());

        for (Instance ip : deadIPs) {
            //移除死亡的 健康状态
            HealthCheckStatus.remv(ip);
        }
    }
	//这里是所有的
    toUpdateInstances = new HashSet<>(ips);

    if (ephemeral) {
        ephemeralInstances = toUpdateInstances;
    } else {
        persistentInstances = toUpdateInstances;
    }
}


private List<Instance> updatedIps(Collection<Instance> newInstance, Collection<Instance> oldInstance) {
    //求交集(相同则返回第一个map中的)   并转换为map  
    List<Instance> intersects = (List<Instance>) CollectionUtils.intersection(newInstance, oldInstance);
    Map<String, Instance> stringIpAddressMap = new ConcurrentHashMap<>(intersects.size());

    for (Instance instance : intersects) {
        stringIpAddressMap.put(instance.getIp() + ":" + instance.getPort(), instance);
    }
	
    Map<String, Integer> intersectMap = new ConcurrentHashMap<>(newInstance.size() + oldInstance.size());
    Map<String, Instance> updatedInstancesMap = new ConcurrentHashMap<>(newInstance.size());
    Map<String, Instance> newInstancesMap = new ConcurrentHashMap<>(newInstance.size());
    for (Instance instance : oldInstance) {
        //交集包括旧实例
        if (stringIpAddressMap.containsKey(instance.getIp() + ":" + instance.getPort())) {
            //这个key 包括很多实例状态信息   这里只作计数
            intersectMap.put(instance.toString(), 1);
        }
    }
    
    for (Instance instance : newInstance) {
        //交集包括新实例
        if (stringIpAddressMap.containsKey(instance.getIp() + ":" + instance.getPort())) {

            if (intersectMap.containsKey(instance.toString())) {
                //已添加 状态一致
                intersectMap.put(instance.toString(), 2);
            } else {
                //状态不一致
                intersectMap.put(instance.toString(), 1);
            }
        }
		
        //放入新的实例map
        newInstancesMap.put(instance.toString(), instance);
    }

    //处理交集实例map
    for (Map.Entry<String, Integer> entry : intersectMap.entrySet()) {
        String key = entry.getKey();
        Integer value = entry.getValue();
		
        //value 为 1 说明状态需要更新
        if (value == 1) {
            if (newInstancesMap.containsKey(key)) {
                updatedInstancesMap.put(key, newInstancesMap.get(key));
            }
        }
    }
	//返回更新后的列表 (不包括新增的)
    return new ArrayList<>(updatedInstancesMap.values());
}

private List<Instance> subtract(Collection<Instance> oldIp, Collection<Instance> ips) {
    Map<String, Instance> ipsMap = new HashMap<>(ips.size());
    for (Instance instance : ips) {
        ipsMap.put(instance.getIp() + ":" + instance.getPort(), instance);
    }

    List<Instance> instanceResult = new ArrayList<>();

    for (Instance instance : oldIp) {
        if (!ipsMap.containsKey(instance.getIp() + ":" + instance.getPort())) {
            instanceResult.add(instance);
        }
    }
    return instanceResult;
}

// @@ 将服务实例列表添加进  一致性服务 @@


private List<Instance> addIpAddresses(Service service, boolean ephemeral, Instance... ips) throws NacosException {
    //更新动作UPDATE_INSTANCE_ACTION_ADD
    return updateIpAddresses(service, UtilsAndCommons.UPDATE_INSTANCE_ACTION_ADD, ephemeral, ips);
}


public List<Instance> updateIpAddresses(Service service, String action, boolean ephemeral, Instance... ips)
    throws NacosException {
	//操作datum     相当于vue的  vuex
    Datum datum = consistencyService
        .get(KeyBuilder.buildInstanceListKey(service.getNamespaceId(), service.getName(), ephemeral));

   	//获取当前的服务的所有临时实例
    List<Instance> currentIPs = service.allIPs(ephemeral);
    Map<String, Instance> currentInstances = new HashMap<>(currentIPs.size());
    Set<String> currentInstanceIds = Sets.newHashSet();

    for (Instance instance : currentIPs) {
        currentInstances.put(instance.toIpAddr(), instance);
        currentInstanceIds.add(instance.getInstanceId());
    }

    Map<String, Instance> instanceMap;
    if (datum != null && null != datum.value) {
        //根据 currentInstances  更新 datum 内的服务实例的 健康、心跳信息    是当下内存里的currentInstances
        
        //根据datum   
        instanceMap = setValid(((Instances) datum.value).getInstanceList(), currentInstances);
    } else {
        instanceMap = new HashMap<>(ips.length);
    }

    for (Instance instance : ips) {
        if (!service.getClusterMap().containsKey(instance.getClusterName())) { //无集群
            //创建为服务实例创建集群  绑定服务 
            Cluster cluster = new Cluster(instance.getClusterName(), service);
           	//初始化
            cluster.init();
            service.getClusterMap().put(instance.getClusterName(), cluster);
            Loggers.SRV_LOG
                .warn("cluster: {} not found, ip: {}, will create new cluster with default configuration.",
                      instance.getClusterName(), instance.toJson());
        }

        if (UtilsAndCommons.UPDATE_INSTANCE_ACTION_REMOVE.equals(action)) {
            instanceMap.remove(instance.getDatumKey());
        } else {
            //这个key192.168.1.157:8888:unknown:DEFAULT
            //代表 一个集群的且在同一台服务器上
            Instance oldInstance = instanceMap.get(instance.getDatumKey());
            if (oldInstance != null) {
                //旧的存在  更新新的setInstanceId
                instance.setInstanceId(oldInstance.getInstanceId());
            } else {
                instance.setInstanceId(instance.generateInstanceId(currentInstanceIds));
            }
            //将新实例与dataStore 里合并返回
            instanceMap.put(instance.getDatumKey(), instance);
        }

    }
	
    //健壮检查  添加后 缓存没有则报错
    if (instanceMap.size() <= 0 && UtilsAndCommons.UPDATE_INSTANCE_ACTION_ADD.equals(action)) {
        throw new IllegalArgumentException(
            "ip list can not be empty, service: " + service.getName() + ", ip list: " + JacksonUtils
            .toJson(instanceMap.values()));
    }

    return new ArrayList<>(instanceMap.values());
}


//...com.alibaba.nacos.naming.core.Cluster...
public void init() {
    if (inited) {
        return;
    }
    //这个任务好像是为了 注定检测永久实例的健康状况    ！！！ 健康检查
    checkTask = new HealthCheckTask(this);
	//开启定时任务  ##  ##
    HealthCheckReactor.scheduleCheck(checkTask);
    inited = true;
}

//...com.alibaba.nacos.naming.healthcheck.HealthCheckTask...
public HealthCheckTask(Cluster cluster) {
    this.cluster = cluster;
    //解决分布式的nacos 问题
    distroMapper = ApplicationUtils.getBean(DistroMapper.class);
    //应该路由到其它节点的nacos
    switchDomain = ApplicationUtils.getBean(SwitchDomain.class);
    
    //健康检测的 委派模式
    healthCheckProcessor = ApplicationUtils.getBean(HealthCheckProcessorDelegate.class);
    initCheckRT();
}

public void run() {

    try {
        //检查分布式
        if (distroMapper.responsible(cluster.getService().getName()) && switchDomain
            .isHealthCheckEnabled(cluster.getService().getName())) {
            //处理心跳检查
            healthCheckProcessor.process(this);
            if (Loggers.EVT_LOG.isDebugEnabled()) {
                Loggers.EVT_LOG
                    .debug("[HEALTH-CHECK] schedule health check task: {}", cluster.getService().getName());
            }
        }
    } catch (Throwable e) {
        Loggers.SRV_LOG
            .error("[HEALTH-CHECK] error while process health check for {}:{}", cluster.getService().getName(),
                   cluster.getName(), e);
    } finally {
        if (!cancelled) {
            //没有取消  继续检查
            HealthCheckReactor.scheduleCheck(this);

            // worst == 0 means never checked
            if (this.getCheckRtWorst() > 0 && switchDomain.isHealthCheckEnabled(cluster.getService().getName())
                && distroMapper.responsible(cluster.getService().getName())) {
                // TLog doesn't support float so we must convert it into long
                long diff =
                    ((this.getCheckRtLast() - this.getCheckRtLastLast()) * 10000) / this.getCheckRtLastLast();

                this.setCheckRtLastLast(this.getCheckRtLast());

                Cluster cluster = this.getCluster();

                if (Loggers.CHECK_RT.isDebugEnabled()) {
                    Loggers.CHECK_RT.debug("{}:{}@{}->normalized: {}, worst: {}, best: {}, last: {}, diff: {}",
                                           cluster.getService().getName(), cluster.getName(), cluster.getHealthChecker().getType(),
                                           this.getCheckRtNormalized(), this.getCheckRtWorst(), this.getCheckRtBest(),
                                           this.getCheckRtLast(), diff);
                }
            }
        }
    }
}



//...com.alibaba.nacos.naming.healthcheck.TcpSuperSenseProcessor...
public TcpSuperSenseProcessor() {
    try {
        //打开selector  
        selector = Selector.open();
        
		//开启定时任务   线程池名字  ##com.alibaba.nacos.naming.tcp.check.worker##
        GlobalExecutor.submitTcpCheck(this);
    } catch (Exception e) {
        throw new IllegalStateException("Error while initializing SuperSense(TM).");
    }
}


public void process(HealthCheckTask task) {
    //获取所有永久实例
    List<Instance> ips = task.getCluster().allIPs(false);

    if (CollectionUtils.isEmpty(ips)) {
        return;
    }

    for (Instance ip : ips) {

        if (ip.isMarked()) {
            if (SRV_LOG.isDebugEnabled()) {
                SRV_LOG.debug("tcp check, ip is marked as to skip health check, ip:" + ip.getIp());
            }
            continue;
        }

        if (!ip.markChecking()) {
            SRV_LOG.warn("tcp check started before last one finished, service: " + task.getCluster().getService()
                         .getName() + ":" + task.getCluster().getName() + ":" + ip.getIp() + ":" + ip.getPort());

            healthCheckCommon
                .reEvaluateCheckRT(task.getCheckRtNormalized() * 2, task, switchDomain.getTcpHealthParams());
            continue;
        }

        Beat beat = new Beat(ip, task);
        //将集群内的心跳任务  添加进队列
        taskQueue.add(beat);
        MetricsMonitor.getTcpHealthCheckMonitor().incrementAndGet();
    }
}

//
public void run() {
    while (true) {
        try {
            //处理任务
            processTask();
			
            //
            int readyCount = selector.selectNow();
            if (readyCount <= 0) {
                continue;
            }

            Iterator<SelectionKey> iter = selector.selectedKeys().iterator();
            while (iter.hasNext()) {
                SelectionKey key = iter.next();
                iter.remove();

                GlobalExecutor.executeTcpSuperSense(new PostProcessor(key));
            }
        } catch (Throwable e) {
            SRV_LOG.error("[HEALTH-CHECK] error while processing NIO task", e);
        }
    }
}

//
private void processTask() throws Exception {
    Collection<Callable<Void>> tasks = new LinkedList<>();
    do {
        Beat beat = taskQueue.poll(CONNECT_TIMEOUT_MS / 2, TimeUnit.MILLISECONDS);
        if (beat == null) {
            //这里return掉了
            return;
        }

        tasks.add(new TaskProcessor(beat));
    } while (taskQueue.size() > 0 && tasks.size() < NIO_THREAD_COUNT * 64);

    //64个任务后  一次性放入线程池进行处理
    for (Future<?> f : GlobalExecutor.invokeAllTcpSuperSenseTask(tasks)) {
        f.get();
    }
}

//...com.alibaba.nacos.naming.healthcheck.TcpSuperSenseProcessor.TaskProcessor...
private class TaskProcessor implements Callable<Void> {

    private static final int MAX_WAIT_TIME_MILLISECONDS = 500;

    Beat beat;

    public TaskProcessor(Beat beat) {
        this.beat = beat;
    }

    @Override
    public Void call() {
        long waited = System.currentTimeMillis() - beat.getStartTime();
        if (waited > MAX_WAIT_TIME_MILLISECONDS) {
            Loggers.SRV_LOG.warn("beat task waited too long: " + waited + "ms");
        }

        SocketChannel channel = null;
        try {
            //获取 Instance
            Instance instance = beat.getIp();
			//
            BeatKey beatKey = keyMap.get(beat.toString());
            
            if (beatKey != null && beatKey.key.isValid()) {
                if (System.currentTimeMillis() - beatKey.birthTime < TCP_KEEP_ALIVE_MILLIS) {
                    instance.setBeingChecked(false);
                    return null;
                }

                beatKey.key.cancel();
                beatKey.key.channel().close();
            }
			
            //开启 SocketChannel
            channel = SocketChannel.open();
            //设置为非阻塞
            channel.configureBlocking(false);
            // only by setting this can we make the socket close event asynchronous
            channel.socket().setSoLinger(false, -1);
            channel.socket().setReuseAddress(true);
            channel.socket().setKeepAlive(true);
            channel.socket().setTcpNoDelay(true);
			
            //获取集群
            Cluster cluster = beat.getTask().getCluster();
            int port = cluster.isUseIPPort4Check() ? instance.getPort() : cluster.getDefCkport();
            
            //channel 连接
            channel.connect(new InetSocketAddress(instance.getIp(), port));
			
            //注册channel到selector
            SelectionKey key = channel.register(selector, SelectionKey.OP_CONNECT | SelectionKey.OP_READ);
            //attach
            key.attach(beat);
            
            //放的是 包装后的SelectionKey
            keyMap.put(beat.toString(), new BeatKey(key));
			
            //设置心跳的开始时间
            beat.setStartTime(System.currentTimeMillis());
			
            //再次开启了一个线程池
            GlobalExecutor
                .scheduleTcpSuperSenseTask(new TimeOutTask(key), CONNECT_TIMEOUT_MS, TimeUnit.MILLISECONDS);
        } catch (Exception e) {
            beat.finishCheck(false, false, switchDomain.getTcpHealthParams().getMax(),
                             "tcp:error:" + e.getMessage());

            if (channel != null) {
                try {
                    channel.close();
                } catch (Exception ignore) {
                }
            }
        }

        return null;
    }
}



//...com.alibaba.nacos.naming.healthcheck.TcpSuperSenseProcessor.TimeOutTask...
private static class TimeOutTask implements Runnable {

    SelectionKey key;

    public TimeOutTask(SelectionKey key) {
        this.key = key;
    }

    @Override
    public void run() {
        //整个逻辑检查是否任务是否超时  超时则关闭
        if (key != null && key.isValid()) {
            SocketChannel channel = (SocketChannel) key.channel();
            Beat beat = (Beat) key.attachment();

            if (channel.isConnected()) {
                return;
            }

            try {
                channel.finishConnect();
            } catch (Exception ignore) {
            }

            try {
                beat.finishCheck(false, false, beat.getTask().getCheckRtNormalized() * 2, "tcp:timeout");
                key.cancel();
                key.channel().close();
            } catch (Exception ignore) {
            }
        }
    }
}
~~~

#### 客户端更新心跳接口 

~~~java
@CanDistro
@PutMapping("/beat")
@Secured(parser = NamingResourceParser.class, action = ActionTypes.WRITE)
public ObjectNode beat(HttpServletRequest request) throws Exception {

    ObjectNode result = JacksonUtils.createEmptyJsonNode();
    result.put(SwitchEntry.CLIENT_BEAT_INTERVAL, switchDomain.getClientBeatInterval());

    String beat = WebUtils.optional(request, "beat", StringUtils.EMPTY);
    RsInfo clientBeat = null;
    if (StringUtils.isNotBlank(beat)) {
        clientBeat = JacksonUtils.toObj(beat, RsInfo.class);
    }
    String clusterName = WebUtils
        .optional(request, CommonParams.CLUSTER_NAME, UtilsAndCommons.DEFAULT_CLUSTER_NAME);
    String ip = WebUtils.optional(request, "ip", StringUtils.EMPTY);
    int port = Integer.parseInt(WebUtils.optional(request, "port", "0"));
    if (clientBeat != null) {
        if (StringUtils.isNotBlank(clientBeat.getCluster())) {
            clusterName = clientBeat.getCluster();
        } else {
            // fix #2533
            clientBeat.setCluster(clusterName);
        }
        ip = clientBeat.getIp();
        port = clientBeat.getPort();
    }
    String namespaceId = WebUtils.optional(request, CommonParams.NAMESPACE_ID, Constants.DEFAULT_NAMESPACE_ID);
    String serviceName = WebUtils.required(request, CommonParams.SERVICE_NAME);
    NamingUtils.checkServiceNameFormat(serviceName);
    Loggers.SRV_LOG.debug("[CLIENT-BEAT] full arguments: beat: {}, serviceName: {}", clientBeat, serviceName);
    Instance instance = serviceManager.getInstance(namespaceId, serviceName, clusterName, ip, port);

    if (instance == null) {
        if (clientBeat == null) {
            result.put(CommonParams.CODE, NamingResponseCode.RESOURCE_NOT_FOUND);
            return result;
        }

        Loggers.SRV_LOG.warn("[CLIENT-BEAT] The instance has been removed for health mechanism, "
                             + "perform data compensation operations, beat: {}, serviceName: {}", clientBeat, serviceName);

        instance = new Instance();
        instance.setPort(clientBeat.getPort());
        instance.setIp(clientBeat.getIp());
        instance.setWeight(clientBeat.getWeight());
        instance.setMetadata(clientBeat.getMetadata());
        instance.setClusterName(clusterName);
        instance.setServiceName(serviceName);
        instance.setInstanceId(instance.getInstanceId());
        instance.setEphemeral(clientBeat.isEphemeral());

        serviceManager.registerInstance(namespaceId, serviceName, instance);
    }

    Service service = serviceManager.getService(namespaceId, serviceName);

    if (service == null) {
        throw new NacosException(NacosException.SERVER_ERROR,
                                 "service not found: " + serviceName + "@" + namespaceId);
    }
    if (clientBeat == null) {
        clientBeat = new RsInfo();
        clientBeat.setIp(ip);
        clientBeat.setPort(port);
        clientBeat.setCluster(clusterName);
    }
    service.processClientBeat(clientBeat);

    result.put(CommonParams.CODE, NamingResponseCode.OK);
    if (instance.containsMetadata(PreservedMetadataKeys.HEART_BEAT_INTERVAL)) {
        result.put(SwitchEntry.CLIENT_BEAT_INTERVAL, instance.getInstanceHeartBeatInterval());
    }
    result.put(SwitchEntry.LIGHT_BEAT_ENABLED, switchDomain.isLightBeatEnabled());
    return result;
}
~~~







