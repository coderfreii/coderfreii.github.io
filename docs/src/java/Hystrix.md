#### HystrixCommand 初始化

##### 调用栈

~~~java
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
subscribe:10423, Observable (rx)
subscribe:10390, Observable (rx)
subscribe:10298, Observable (rx)
startCachingStreamValuesIfUnstarted:88, BucketedCounterStream (com.netflix.hystrix.metric.consumer)
getInstance:83, HealthCountsStream (com.netflix.hystrix.metric.consumer)
getInstance:62, HealthCountsStream (com.netflix.hystrix.metric.consumer)
<init>:192, HystrixCommandMetrics (com.netflix.hystrix)
getInstance:134, HystrixCommandMetrics (com.netflix.hystrix)
initMetrics:240, AbstractCommand (com.netflix.hystrix)
<init>:166, AbstractCommand (com.netflix.hystrix)
<init>:148, HystrixCommand (com.netflix.hystrix)
<init>:134, HystrixCommand (com.netflix.hystrix)
//调用一个构造函数
<init>:104, HystrixInvocationHandler$1 (feign.hystrix)
//
invoke:104, HystrixInvocationHandler (feign.hystrix)
//
createUser:-1, $Proxy194 (com.sun.proxy)
create:52, AccountServiceImpl (com.piggymetrics.account.service)
//
createNewAccount:37, AccountController (com.piggymetrics.account.controller)
invoke:-1, AccountController$$FastClassBySpringCGLIB$$794775f6 (com.piggymetrics.account.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
intercept:684, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
createNewAccount:-1, AccountController$$EnhancerBySpringCGLIB$$57530093 (com.piggymetrics.account.controller)
//
invoke0:-1, NativeMethodAccessorImpl (sun.reflect)
invoke:62, NativeMethodAccessorImpl (sun.reflect)
invoke:43, DelegatingMethodAccessorImpl (sun.reflect)
invoke:497, Method (java.lang.reflect)
doInvoke:209, InvocableHandlerMethod (org.springframework.web.method.support)
invokeForRequest:136, InvocableHandlerMethod (org.springframework.web.method.support)
invokeAndHandle:102, ServletInvocableHandlerMethod (org.springframework.web.servlet.mvc.method.annotation)
invokeHandlerMethod:877, RequestMappingHandlerAdapter (org.springframework.web.servlet.mvc.method.annotation)
handleInternal:783, RequestMappingHandlerAdapter (org.springframework.web.servlet.mvc.method.annotation)
handle:87, AbstractHandlerMethodAdapter (org.springframework.web.servlet.mvc.method)
doDispatch:991, DispatcherServlet (org.springframework.web.servlet)
doService:925, DispatcherServlet (org.springframework.web.servlet)
processRequest:974, FrameworkServlet (org.springframework.web.servlet)
doPost:877, FrameworkServlet (org.springframework.web.servlet)
service:661, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:60, OAuth2ClientContextFilter (org.springframework.security.oauth2.client.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
filterAndRecordMetrics:158, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
filterAndRecordMetrics:126, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
doFilterInternal:111, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:90, HttpTraceFilter (org.springframework.boot.actuate.web.trace.servlet)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:320, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
invoke:127, FilterSecurityInterceptor (org.springframework.security.web.access.intercept)
doFilter:91, FilterSecurityInterceptor (org.springframework.security.web.access.intercept)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:119, ExceptionTranslationFilter (org.springframework.security.web.access)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:137, SessionManagementFilter (org.springframework.security.web.session)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:111, AnonymousAuthenticationFilter (org.springframework.security.web.authentication)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:170, SecurityContextHolderAwareRequestFilter (org.springframework.security.web.servletapi)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:63, RequestCacheAwareFilter (org.springframework.security.web.savedrequest)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:176, OAuth2AuthenticationProcessingFilter (org.springframework.security.oauth2.provider.authentication)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:116, LogoutFilter (org.springframework.security.web.authentication.logout)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:66, HeaderWriterFilter (org.springframework.security.web.header)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:105, SecurityContextPersistenceFilter (org.springframework.security.web.context)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:56, WebAsyncManagerIntegrationFilter (org.springframework.security.web.context.request.async)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:215, FilterChainProxy (org.springframework.security.web)
doFilter:178, FilterChainProxy (org.springframework.security.web)
invokeDelegate:357, DelegatingFilterProxy (org.springframework.web.filter)
doFilter:270, DelegatingFilterProxy (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:99, RequestContextFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:109, HttpPutFormContentFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:93, HiddenHttpMethodFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:48, ExceptionLoggingFilter (org.springframework.cloud.sleuth.instrument.web)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:86, TracingFilter (brave.servlet)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:496, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:803, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:790, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1468, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1142, ThreadPoolExecutor (java.util.concurrent)
run:617, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:745, Thread (java.lang)
~~~

##### 构造器

###### HystrixCommand

~~~java
protected HystrixCommand(Setter setter) {
    // use 'null' to specify use the default
    this(setter.groupKey, setter.commandKey, setter.threadPoolKey, null, null, setter.commandPropertiesDefaults, setter.threadPoolPropertiesDefaults, null, null, null, null, null);
}

/* package for testing */HystrixCommand(HystrixCommandGroupKey group, HystrixCommandKey key, HystrixThreadPoolKey threadPoolKey, HystrixCircuitBreaker circuitBreaker, HystrixThreadPool threadPool,
                                        HystrixCommandProperties.Setter commandPropertiesDefaults, HystrixThreadPoolProperties.Setter threadPoolPropertiesDefaults,
                                        HystrixCommandMetrics metrics, TryableSemaphore fallbackSemaphore, TryableSemaphore executionSemaphore,
                                        HystrixPropertiesStrategy propertiesStrategy, HystrixCommandExecutionHook executionHook) {
    super(group, key, threadPoolKey, circuitBreaker, threadPool, commandPropertiesDefaults, threadPoolPropertiesDefaults, metrics, fallbackSemaphore, executionSemaphore, propertiesStrategy, executionHook);
}
~~~

###### AbstractCommand

```java
...com.netflix.hystrix.AbstractCommand...
protected AbstractCommand(HystrixCommandGroupKey group, HystrixCommandKey key, HystrixThreadPoolKey threadPoolKey, HystrixCircuitBreaker circuitBreaker, HystrixThreadPool threadPool,
            HystrixCommandProperties.Setter commandPropertiesDefaults, HystrixThreadPoolProperties.Setter threadPoolPropertiesDefaults,
            HystrixCommandMetrics metrics, TryableSemaphore fallbackSemaphore, TryableSemaphore executionSemaphore,
            HystrixPropertiesStrategy propertiesStrategy, HystrixCommandExecutionHook executionHook) {
 	//auth-service
    //准备key
    this.commandGroup = initGroupKey(group);
    //AuthServiceClient#createUser(User)
    //准备key
    this.commandKey = initCommandKey(key, getClass());
    //生成commandKey的property 工厂函数有缓存
    this.properties = initCommandProperties(this.commandKey, propertiesStrategy, commandPropertiesDefaults);
    //auth-service
   	//准备key
    this.threadPoolKey = initThreadPoolKey(threadPoolKey, this.commandGroup, 	this.properties.executionIsolationThreadPoolKeyOverride().get());
    //初始化测量组件
    this.metrics = initMetrics(metrics, this.commandGroup, this.threadPoolKey, this.commandKey, this.properties);
    this.circuitBreaker = initCircuitBreaker(this.properties.circuitBreakerEnabled().get(), circuitBreaker, this.commandGroup, this.commandKey, this.properties, this.metrics);
    this.threadPool = initThreadPool(threadPool, this.threadPoolKey, threadPoolPropertiesDefaults);

    //Strategies from plugins
    this.eventNotifier = HystrixPlugins.getInstance().getEventNotifier();
    this.concurrencyStrategy = HystrixPlugins.getInstance().getConcurrencyStrategy();
    HystrixMetricsPublisherFactory.createOrRetrievePublisherForCommand(this.commandKey, this.commandGroup, this.metrics, this.circuitBreaker, this.properties);
    this.executionHook = initExecutionHook(executionHook);

    this.requestCache = HystrixRequestCache.getInstance(this.commandKey, this.concurrencyStrategy);
    this.currentRequestLog = initRequestLog(this.properties.requestLogEnabled().get(), this.concurrencyStrategy);

    /* fallback semaphore override if applicable */
    this.fallbackSemaphoreOverride = fallbackSemaphore;

    /* execution semaphore override if applicable */
    this.executionSemaphoreOverride = executionSemaphore;
}
```

###### initMetrics

~~~java

private static HystrixCommandMetrics initMetrics(HystrixCommandMetrics fromConstructor, HystrixCommandGroupKey groupKey,
                                                 HystrixThreadPoolKey threadPoolKey, HystrixCommandKey commandKey,
                                                 HystrixCommandProperties properties) {
    if (fromConstructor == null) {
        return HystrixCommandMetrics.getInstance(commandKey, groupKey, threadPoolKey, properties);
    } else {
        return fromConstructor;
    }
}
~~~

###### HystrixCommandMetrics

~~~java
...com.netflix.hystrix.HystrixCommandMetrics... 
/* package */HystrixCommandMetrics(final HystrixCommandKey key, HystrixCommandGroupKey commandGroup, HystrixThreadPoolKey threadPoolKey, HystrixCommandProperties properties, HystrixEventNotifier eventNotifier) {
        super(null);
        this.key = key;
        this.group = commandGroup;
        this.threadPoolKey = threadPoolKey;
        this.properties = properties;
		//
        healthCountsStream = HealthCountsStream.getInstance(key, properties);
        rollingCommandEventCounterStream = RollingCommandEventCounterStream.getInstance(key, properties);
        cumulativeCommandEventCounterStream = CumulativeCommandEventCounterStream.getInstance(key, properties);

        rollingCommandLatencyDistributionStream = RollingCommandLatencyDistributionStream.getInstance(key, properties);
        rollingCommandUserLatencyDistributionStream = RollingCommandUserLatencyDistributionStream.getInstance(key, properties);
        rollingCommandMaxConcurrencyStream = RollingCommandMaxConcurrencyStream.getInstance(key, properties);
    }
~~~

##### HealthCountsStream

~~~java
...com.netflix.hystrix.metric.consumer.HealthCountsStream...
public static HealthCountsStream getInstance(HystrixCommandKey commandKey, HystrixCommandProperties properties) {
    final int healthCountBucketSizeInMs = properties.metricsHealthSnapshotIntervalInMilliseconds().get();
    if (healthCountBucketSizeInMs == 0) {
        throw new RuntimeException("You have set the bucket size to 0ms.  Please set a positive number, so that the metric stream can be properly consumed");
    }
    
    //numHealthCountBuckets
    final int numHealthCountBuckets = properties.metricsRollingStatisticalWindowInMilliseconds().get() / healthCountBucketSizeInMs;

    return getInstance(commandKey, numHealthCountBuckets, healthCountBucketSizeInMs);
}


...com.netflix.hystrix.metric.consumer.HealthCountsStream...
public static HealthCountsStream getInstance(HystrixCommandKey commandKey, int numBuckets, int bucketSizeInMs) {
    HealthCountsStream initialStream = streams.get(commandKey.name());
    if (initialStream != null) {
        return initialStream;
    } else {
        final HealthCountsStream healthStream;
        synchronized (HealthCountsStream.class) {
            HealthCountsStream existingStream = streams.get(commandKey.name());
            if (existingStream == null) {
                HealthCountsStream newStream = new HealthCountsStream(commandKey, numBuckets, bucketSizeInMs,
                                                                      HystrixCommandMetrics.appendEventToBucket);

                streams.putIfAbsent(commandKey.name(), newStream);
                healthStream = newStream;
            } else {
                healthStream = existingStream;
            }
        }
        //这里订阅
        healthStream.startCachingStreamValuesIfUnstarted();
        return healthStream;
    }
}

public void startCachingStreamValuesIfUnstarted() {
    if (subscription.get() == null) {
        //the stream is not yet started
        Subscription candidateSubscription = observe().subscribe(counterSubject);
        if (subscription.compareAndSet(null, candidateSubscription)) {
            //won the race to set the subscription
        } else {
            //lost the race to set the subscription, so we need to cancel this one
            candidateSubscription.unsubscribe();
        }
    }
}


...com.netflix.hystrix.metric.consumer.BucketedRollingCounterStream...
...this......com.netflix.hystrix.metric.consumer.HealthCountsStream...
    protected BucketedRollingCounterStream(HystrixEventStream<Event> stream, final int numBuckets, int bucketSizeInMs,
                                           final Func2<Bucket, Event, Bucket> appendRawEventToBucket,
                                           final Func2<Output, Bucket, Output> reduceBucket) {
    //
    super(stream, numBuckets, bucketSizeInMs, appendRawEventToBucket);
    Func1<Observable<Bucket>, Observable<Output>> reduceWindowToSummary = new Func1<Observable<Bucket>, Observable<Output>>() {
        @Override
        public Observable<Output> call(Observable<Bucket> window) {
            return window.scan(getEmptyOutputValue(), reduceBucket).skip(numBuckets);
        }
    };
    
    //这种链式操作一般就是一层包一层
    this.sourceStream = bucketedStream     
        .window(numBuckets, 1)
         //stream broken up into buckets
        .flatMap(reduceWindowToSummary)
        //emit overlapping windows of buckets
        .doOnSubscribe(new Action0() {
            @Override
            public void call() {
                isSourceCurrentlySubscribed.set(true);
            }
        })
        //convert a window of bucket-summaries into a single summary
        .doOnUnsubscribe(new Action0() {
            @Override
            public void call() {
                isSourceCurrentlySubscribed.set(false);
            }
        })
        .share()                        //multiple subscribers should get same data
        .onBackpressureDrop();          //if there are slow consumers, data should not buffer
}


...com.netflix.hystrix.metric.consumer.BucketedCounterStream...
    protected BucketedCounterStream(final HystrixEventStream<Event> inputEventStream, 
                                    final int numBuckets, final int bucketSizeInMs,
                                    final Func2<Bucket, Event, Bucket> appendRawEventToBucket) {
    this.numBuckets = numBuckets;
    //
    this.reduceBucketToSummary = new Func1<Observable<Event>, Observable<Bucket>>() {
        @Override
        public Observable<Bucket> call(Observable<Event> eventBucket) {
            return eventBucket.reduce(getEmptyBucketSummary(), appendRawEventToBucket);
        }
    };

    final List<Bucket> emptyEventCountsToStart = new ArrayList<Bucket>();
    for (int i = 0; i < numBuckets; i++) {
        emptyEventCountsToStart.add(getEmptyBucketSummary());
    }

    this.bucketedStream = Observable.defer(new Func0<Observable<Bucket>>() {
        @Override
        public Observable<Bucket> call() {
            return inputEventStream
                .observe()
                .window(bucketSizeInMs, TimeUnit.MILLISECONDS) 
                //bucket it by the counter window so we can emit to the next operator in time chunks, not on every OnNext
                .flatMap(reduceBucketToSummary)                
                //for a given bucket, turn it into a long array containing counts of event types
                .startWith(emptyEventCountsToStart);           
            	//start it with empty arrays to make consumer logic as generic as possible (windows are always full)
        }
    });
}










#### HystrixCommand 执行

```java
getRestTemplate:110, ResourceServerConfig$LoadBalancedClientCredentialsAccessTokenProvider (com.piggymetrics.account.config)
getResponseExtractor:120, ResourceServerConfig$LoadBalancedClientCredentialsAccessTokenProvider (com.piggymetrics.account.config)
retrieveToken:127, OAuth2AccessTokenSupport (org.springframework.security.oauth2.client.token)
obtainAccessToken:44, ClientCredentialsAccessTokenProvider (org.springframework.security.oauth2.client.token.grant.client)
obtainNewAccessTokenInternal:148, AccessTokenProviderChain (org.springframework.security.oauth2.client.token)
obtainAccessToken:121, AccessTokenProviderChain (org.springframework.security.oauth2.client.token)
acquireAccessToken:171, OAuth2FeignRequestInterceptor (org.springframework.cloud.security.oauth2.client.feign)
getToken:127, OAuth2FeignRequestInterceptor (org.springframework.cloud.security.oauth2.client.feign)
extract:112, OAuth2FeignRequestInterceptor (org.springframework.cloud.security.oauth2.client.feign)
apply:100, OAuth2FeignRequestInterceptor (org.springframework.cloud.security.oauth2.client.feign)
//Feign拦截器
targetRequest:158, SynchronousMethodHandler (feign)
executeAndDecode:88, SynchronousMethodHandler (feign)
invoke:76, SynchronousMethodHandler (feign)
run:108, HystrixInvocationHandler$1 (feign.hystrix)
call:302, HystrixCommand$2 (com.netflix.hystrix)
call:298, HystrixCommand$2 (com.netflix.hystrix)
call:46, OnSubscribeDefer (rx.internal.operators)
call:35, OnSubscribeDefer (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:51, OnSubscribeDefer (rx.internal.operators)
call:35, OnSubscribeDefer (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:100, OperatorSubscribeOn$SubscribeOnSubscriber (rx.internal.operators)
call:56, HystrixContexSchedulerAction$1 (com.netflix.hystrix.strategy.concurrency)
call:47, HystrixContexSchedulerAction$1 (com.netflix.hystrix.strategy.concurrency)
call:63, TraceCallable (org.springframework.cloud.sleuth.instrument.async)
call:69, HystrixContexSchedulerAction (com.netflix.hystrix.strategy.concurrency)
run:55, ScheduledAction (rx.internal.schedulers)
call:511, Executors$RunnableAdapter (java.util.concurrent)
run$$$capture:266, FutureTask (java.util.concurrent)
run:-1, FutureTask (java.util.concurrent)
 - Async stack trace
<init>:151, FutureTask (java.util.concurrent)
newTaskFor:87, AbstractExecutorService (java.util.concurrent)
submit:111, AbstractExecutorService (java.util.concurrent)
schedule:172, HystrixContextScheduler$ThreadPoolWorker (com.netflix.hystrix.strategy.concurrency)
schedule:106, HystrixContextScheduler$HystrixContextSchedulerWorker (com.netflix.hystrix.strategy.concurrency)
call:50, OperatorSubscribeOn (rx.internal.operators)
call:30, OperatorSubscribeOn (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:51, OnSubscribeDefer (rx.internal.operators)
call:35, OnSubscribeDefer (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:48, OnSubscribeMap (rx.internal.operators)
call:33, OnSubscribeMap (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:41, OnSubscribeDoOnEach (rx.internal.operators)
call:30, OnSubscribeDoOnEach (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:51, OnSubscribeDefer (rx.internal.operators)
call:35, OnSubscribeDefer (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
subscribe:10423, Observable (rx)
subscribe:10390, Observable (rx)
toFuture:51, BlockingOperatorToFuture (rx.internal.operators)
toFuture:410, BlockingObservable (rx.observables)
queue:378, HystrixCommand (com.netflix.hystrix)
execute:344, HystrixCommand (com.netflix.hystrix)
invoke:159, HystrixInvocationHandler (feign.hystrix)
createUser:-1, $Proxy194 (com.sun.proxy)
//远程调用
create:52, AccountServiceImpl (com.piggymetrics.account.service)
createNewAccount:37, AccountController (com.piggymetrics.account.controller)
invoke:-1, AccountController$$FastClassBySpringCGLIB$$794775f6 (com.piggymetrics.account.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
intercept:684, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
//Advised 拦截器
createNewAccount:-1, AccountController$$EnhancerBySpringCGLIB$$73867b61 (com.piggymetrics.account.controller)
//反射调用  controler 方法
invoke0:-2, NativeMethodAccessorImpl (sun.reflect)
invoke:62, NativeMethodAccessorImpl (sun.reflect)
invoke:43, DelegatingMethodAccessorImpl (sun.reflect)
invoke:497, Method (java.lang.reflect)
doInvoke:209, InvocableHandlerMethod (org.springframework.web.method.support)
invokeForRequest:136, InvocableHandlerMethod (org.springframework.web.method.support)
invokeAndHandle:102, ServletInvocableHandlerMethod (org.springframework.web.servlet.mvc.method.annotation)
invokeHandlerMethod:877, RequestMappingHandlerAdapter (org.springframework.web.servlet.mvc.method.annotation)
handleInternal:783, RequestMappingHandlerAdapter (org.springframework.web.servlet.mvc.method.annotation)
handle:87, AbstractHandlerMethodAdapter (org.springframework.web.servlet.mvc.method)
doDispatch:991, DispatcherServlet (org.springframework.web.servlet)
//分发
doService:925, DispatcherServlet (org.springframework.web.servlet)
processRequest:974, FrameworkServlet (org.springframework.web.servlet)
doPost:877, FrameworkServlet (org.springframework.web.servlet)
service:661, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
//处理请求
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:60, OAuth2ClientContextFilter (org.springframework.security.oauth2.client.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
filterAndRecordMetrics:158, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
filterAndRecordMetrics:126, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
doFilterInternal:111, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:90, HttpTraceFilter (org.springframework.boot.actuate.web.trace.servlet)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:320, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
invoke:127, FilterSecurityInterceptor (org.springframework.security.web.access.intercept)
doFilter:91, FilterSecurityInterceptor (org.springframework.security.web.access.intercept)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:119, ExceptionTranslationFilter (org.springframework.security.web.access)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:137, SessionManagementFilter (org.springframework.security.web.session)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:111, AnonymousAuthenticationFilter (org.springframework.security.web.authentication)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:170, SecurityContextHolderAwareRequestFilter (org.springframework.security.web.servletapi)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:63, RequestCacheAwareFilter (org.springframework.security.web.savedrequest)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:176, OAuth2AuthenticationProcessingFilter (org.springframework.security.oauth2.provider.authentication)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:116, LogoutFilter (org.springframework.security.web.authentication.logout)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:66, HeaderWriterFilter (org.springframework.security.web.header)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:105, SecurityContextPersistenceFilter (org.springframework.security.web.context)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:56, WebAsyncManagerIntegrationFilter (org.springframework.security.web.context.request.async)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:215, FilterChainProxy (org.springframework.security.web)
doFilter:178, FilterChainProxy (org.springframework.security.web)
invokeDelegate:357, DelegatingFilterProxy (org.springframework.web.filter)
doFilter:270, DelegatingFilterProxy (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:99, RequestContextFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:109, HttpPutFormContentFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:93, HiddenHttpMethodFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:48, ExceptionLoggingFilter (org.springframework.cloud.sleuth.instrument.web)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:86, TracingFilter (brave.servlet)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
//过滤器
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:496, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:803, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:790, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1468, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1142, ThreadPoolExecutor (java.util.concurrent)
run:617, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:745, Thread (java.lang)
```



~~~java
...com.netflix.hystrix.AbstractCommand...    
public Observable<R> toObservable() {
        final AbstractCommand<R> _cmd = this;

        //doOnCompleted handler already did all of the SUCCESS work
        //doOnError handler already did all of the FAILURE/TIMEOUT/REJECTION/BAD_REQUEST work
        final Action0 terminateCommandCleanup = new Action0() {

            @Override
            public void call() {
                if (_cmd.commandState.compareAndSet(CommandState.OBSERVABLE_CHAIN_CREATED, CommandState.TERMINAL)) {
                    handleCommandEnd(false); //user code never ran
                } else if (_cmd.commandState.compareAndSet(CommandState.USER_CODE_EXECUTED, CommandState.TERMINAL)) {
                    handleCommandEnd(true); //user code did run
                }
            }
        };

        //mark the command as CANCELLED and store the latency (in addition to standard cleanup)
        final Action0 unsubscribeCommandCleanup = new Action0() {
            @Override
            public void call() {
                if (_cmd.commandState.compareAndSet(CommandState.OBSERVABLE_CHAIN_CREATED, CommandState.UNSUBSCRIBED)) {
                    if (!_cmd.executionResult.containsTerminalEvent()) {
                        _cmd.eventNotifier.markEvent(HystrixEventType.CANCELLED, _cmd.commandKey);
                        try {
                            executionHook.onUnsubscribe(_cmd);
                        } catch (Throwable hookEx) {
                            logger.warn("Error calling HystrixCommandExecutionHook.onUnsubscribe", hookEx);
                        }
                        _cmd.executionResultAtTimeOfCancellation = _cmd.executionResult
                                .addEvent((int) (System.currentTimeMillis() - _cmd.commandStartTimestamp), HystrixEventType.CANCELLED);
                    }
                    handleCommandEnd(false); //user code never ran
                } else if (_cmd.commandState.compareAndSet(CommandState.USER_CODE_EXECUTED, CommandState.UNSUBSCRIBED)) {
                    if (!_cmd.executionResult.containsTerminalEvent()) {
                        _cmd.eventNotifier.markEvent(HystrixEventType.CANCELLED, _cmd.commandKey);
                        try {
                            executionHook.onUnsubscribe(_cmd);
                        } catch (Throwable hookEx) {
                            logger.warn("Error calling HystrixCommandExecutionHook.onUnsubscribe", hookEx);
                        }
                        _cmd.executionResultAtTimeOfCancellation = _cmd.executionResult
                                .addEvent((int) (System.currentTimeMillis() - _cmd.commandStartTimestamp), HystrixEventType.CANCELLED);
                    }
                    handleCommandEnd(true); //user code did run
                }
            }
        };
		
    
    	//applyHystrixSemantics
        final Func0<Observable<R>> applyHystrixSemantics = new Func0<Observable<R>>() {
            @Override
            public Observable<R> call() {
                if (commandState.get().equals(CommandState.UNSUBSCRIBED)) {
                    return Observable.never();
                }
                return applyHystrixSemantics(_cmd);
            }
        };

        final Func1<R, R> wrapWithAllOnNextHooks = new Func1<R, R>() {
            @Override
            public R call(R r) {
                R afterFirstApplication = r;

                try {
                    afterFirstApplication = executionHook.onComplete(_cmd, r);
                } catch (Throwable hookEx) {
                    logger.warn("Error calling HystrixCommandExecutionHook.onComplete", hookEx);
                }

                try {
                    return executionHook.onEmit(_cmd, afterFirstApplication);
                } catch (Throwable hookEx) {
                    logger.warn("Error calling HystrixCommandExecutionHook.onEmit", hookEx);
                    return afterFirstApplication;
                }
            }
        };
		
    	//
        final Action0 fireOnCompletedHook = new Action0() {
            @Override
            public void call() {
                try {
                    executionHook.onSuccess(_cmd);
                } catch (Throwable hookEx) {
                    logger.warn("Error calling HystrixCommandExecutionHook.onSuccess", hookEx);
                }
            }
        };

        return Observable.defer(new Func0<Observable<R>>() {
            @Override
            public Observable<R> call() {
                 /* this is a stateful object so can only be used once */
                if (!commandState.compareAndSet(CommandState.NOT_STARTED, CommandState.OBSERVABLE_CHAIN_CREATED)) {
                    IllegalStateException ex = new IllegalStateException("This instance can only be executed once. Please instantiate a new instance.");
                    //TODO make a new error type for this
                    throw new HystrixRuntimeException(FailureType.BAD_REQUEST_EXCEPTION, _cmd.getClass(), getLogMessagePrefix() + " command executed multiple times - this is not permitted.", ex, null);
                }

                commandStartTimestamp = System.currentTimeMillis();

                if (properties.requestLogEnabled().get()) {
                    // log this command execution regardless of what happened
                    if (currentRequestLog != null) {
                        currentRequestLog.addExecutedCommand(_cmd);
                    }
                }

                final boolean requestCacheEnabled = isRequestCachingEnabled();
                final String cacheKey = getCacheKey();

                /* try from cache first */
                if (requestCacheEnabled) {
                    HystrixCommandResponseFromCache<R> fromCache = (HystrixCommandResponseFromCache<R>) requestCache.get(cacheKey);
                    if (fromCache != null) {
                        isResponseFromCache = true;
                        return handleRequestCacheHitAndEmitValues(fromCache, _cmd);
                    }
                }

                Observable<R> hystrixObservable =
                        Observable.defer(applyHystrixSemantics)
                                .map(wrapWithAllOnNextHooks);

                Observable<R> afterCache;

                // put in cache
                if (requestCacheEnabled && cacheKey != null) {
                    // wrap it for caching
                    HystrixCachedObservable<R> toCache = HystrixCachedObservable.from(hystrixObservable, _cmd);
                    HystrixCommandResponseFromCache<R> fromCache = (HystrixCommandResponseFromCache<R>) requestCache.putIfAbsent(cacheKey, toCache);
                    if (fromCache != null) {
                        // another thread beat us so we'll use the cached value instead
                        toCache.unsubscribe();
                        isResponseFromCache = true;
                        return handleRequestCacheHitAndEmitValues(fromCache, _cmd);
                    } else {
                        // we just created an ObservableCommand so we cast and return it
                        afterCache = toCache.toObservable();
                    }
                } else {
                    afterCache = hystrixObservable;
                }

                return afterCache
                        .doOnTerminate(terminateCommandCleanup)     // perform cleanup once (either on normal terminal state (this line), or unsubscribe (next line))
                        .doOnUnsubscribe(unsubscribeCommandCleanup) // perform cleanup once
                        .doOnCompleted(fireOnCompletedHook);
            }
        });
    }


// 
private Observable<R> applyHystrixSemantics(final AbstractCommand<R> _cmd) {
    // mark that we're starting execution on the ExecutionHook
    // if this hook throws an exception, then a fast-fail occurs with no fallback.  No state is left inconsistent
    executionHook.onStart(_cmd);

    /* determine if we're allowed to execute */
    if (circuitBreaker.attemptExecution()) {
        final TryableSemaphore executionSemaphore = getExecutionSemaphore();
        final AtomicBoolean semaphoreHasBeenReleased = new AtomicBoolean(false);
        final Action0 singleSemaphoreRelease = new Action0() {
            @Override
            public void call() {
                if (semaphoreHasBeenReleased.compareAndSet(false, true)) {
                    executionSemaphore.release();
                }
            }
        };

        final Action1<Throwable> markExceptionThrown = new Action1<Throwable>() {
            @Override
            public void call(Throwable t) {
                eventNotifier.markEvent(HystrixEventType.EXCEPTION_THROWN, commandKey);
            }
        };

        if (executionSemaphore.tryAcquire()) {
            try {
                /* used to track userThreadExecutionTime */
                executionResult = executionResult.setInvocationStartTime(System.currentTimeMillis());
                return executeCommandAndObserve(_cmd)
                    .doOnError(markExceptionThrown)
                    .doOnTerminate(singleSemaphoreRelease)
                    .doOnUnsubscribe(singleSemaphoreRelease);
            } catch (RuntimeException e) {
                return Observable.error(e);
            }
        } else {
            return handleSemaphoreRejectionViaFallback();
        }
    } else {
        return handleShortCircuitViaFallback();
    }
}
~~~

#### HystrixCommand 调用

~~~java
~~~





### Rxjava

#### Observable大致流程

##### Observable订阅调用栈（具体执行顺序）

~~~java
onNext:94, OperatorOnBackpressureDrop$2 (rx.internal.operators)
onNext:120, OnSubscribeRefCount$2 (rx.internal.operators)
dispatch:585, OperatorPublish$PublishSubscriber (rx.internal.operators)
onNext:283, OperatorPublish$PublishSubscriber (rx.internal.operators)
onNext:235, Subscribers$5 (rx.observers)
onNext:235, Subscribers$5 (rx.observers)
emitScalar:395, OperatorMerge$MergeSubscriber (rx.internal.operators)
tryEmit:355, OperatorMerge$MergeSubscriber (rx.internal.operators)
onNext:846, OperatorMerge$InnerSubscriber (rx.internal.operators)
onNext:60, OperatorSkip$1 (rx.internal.operators)
emitLoop:323, OperatorScan$InitialProducer (rx.internal.operators)
emit:295, OperatorScan$InitialProducer (rx.internal.operators)
onNext:202, OperatorScan$InitialProducer (rx.internal.operators)
onNext:144, OperatorScan$3 (rx.internal.operators)
replay:333, UnicastSubject$State (rx.subjects)
onNext:214, UnicastSubject$State (rx.subjects)
onNext:126, UnicastSubject (rx.subjects)
onNext:345, OperatorWindowWithSize$WindowOverlap (rx.internal.operators)
onNext:235, Subscribers$5 (rx.observers)
onNext:91, SerializedObserver (rx.observers)
onNext:94, SerializedSubscriber (rx.observers)
innerNext:182, OnSubscribeConcatMap$ConcatMapSubscriber (rx.internal.operators)
onNext:335, OnSubscribeConcatMap$ConcatMapInnerSubscriber (rx.internal.operators)
fastPath:173, OnSubscribeFromIterable$IterableProducer (rx.internal.operators)
request:86, OnSubscribeFromIterable$IterableProducer (rx.internal.operators)
setProducer:126, ProducerArbiter (rx.internal.producers)
setProducer:329, OnSubscribeConcatMap$ConcatMapInnerSubscriber (rx.internal.operators)
call:63, OnSubscribeFromIterable (rx.internal.operators)
call:34, OnSubscribeFromIterable (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
drain:286, OnSubscribeConcatMap$ConcatMapSubscriber (rx.internal.operators)
onNext:144, OnSubscribeConcatMap$ConcatMapSubscriber (rx.internal.operators)
//此时调用next  这里的Observable 才会直接调用subscribe的onNext 并一层一层由外而内之前包裹的subsiber的next
slowPath:100, OnSubscribeFromArray$FromArrayProducer (rx.internal.operators)
request:63, OnSubscribeFromArray$FromArrayProducer (rx.internal.operators)
setProducer:211, Subscriber (rx)
call:32, OnSubscribeFromArray (rx.internal.operators)
call:24, OnSubscribeFromArray (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:94, OnSubscribeConcatMap (rx.internal.operators)
call:42, OnSubscribeConcatMap (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
//这里经过层层包装的subscriber  订阅defer产生的Observable
call:51, OnSubscribeDefer (rx.internal.operators)
call:35, OnSubscribeDefer (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
call:48, OnSubscribeMap (rx.internal.operators)
call:33, OnSubscribeMap (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
connect:214, OperatorPublish (rx.internal.operators)
call:67, OnSubscribeRefCount (rx.internal.operators)
call:34, OnSubscribeRefCount (rx.internal.operators)
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
subscribe:10423, Observable (rx)
subscribe:10390, Observable (rx)
subscribe:10298, Observable (rx)
startCachingStreamValuesIfUnstarted:88, BucketedCounterStream (com.netflix.hystrix.metric.consumer)
//这里开始订阅
getInstance:83, HealthCountsStream (com.netflix.hystrix.metric.consumer)
getInstance:62, HealthCountsStream (com.netflix.hystrix.metric.consumer)
<init>:192, HystrixCommandMetrics (com.netflix.hystrix)
getInstance:134, HystrixCommandMetrics (com.netflix.hystrix)
initMetrics:240, AbstractCommand (com.netflix.hystrix)
<init>:166, AbstractCommand (com.netflix.hystrix)
<init>:148, HystrixCommand (com.netflix.hystrix)
<init>:134, HystrixCommand (com.netflix.hystrix)
<init>:104, HystrixInvocationHandler$1 (feign.hystrix)
invoke:104, HystrixInvocationHandler (feign.hystrix)
createUser:-1, $Proxy196 (com.sun.proxy)
create:52, AccountServiceImpl (com.piggymetrics.account.service)
createNewAccount:37, AccountController (com.piggymetrics.account.controller)
invoke:-1, AccountController$$FastClassBySpringCGLIB$$794775f6 (com.piggymetrics.account.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
intercept:684, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
createNewAccount:-1, AccountController$$EnhancerBySpringCGLIB$$b3f18e3e (com.piggymetrics.account.controller)
invoke0:-1, NativeMethodAccessorImpl (sun.reflect)
invoke:62, NativeMethodAccessorImpl (sun.reflect)
invoke:43, DelegatingMethodAccessorImpl (sun.reflect)
invoke:498, Method (java.lang.reflect)
doInvoke:209, InvocableHandlerMethod (org.springframework.web.method.support)
invokeForRequest:136, InvocableHandlerMethod (org.springframework.web.method.support)
invokeAndHandle:102, ServletInvocableHandlerMethod (org.springframework.web.servlet.mvc.method.annotation)
invokeHandlerMethod:877, RequestMappingHandlerAdapter (org.springframework.web.servlet.mvc.method.annotation)
handleInternal:783, RequestMappingHandlerAdapter (org.springframework.web.servlet.mvc.method.annotation)
handle:87, AbstractHandlerMethodAdapter (org.springframework.web.servlet.mvc.method)
doDispatch:991, DispatcherServlet (org.springframework.web.servlet)
doService:925, DispatcherServlet (org.springframework.web.servlet)
processRequest:974, FrameworkServlet (org.springframework.web.servlet)
doPost:877, FrameworkServlet (org.springframework.web.servlet)
service:661, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:60, OAuth2ClientContextFilter (org.springframework.security.oauth2.client.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
filterAndRecordMetrics:158, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
filterAndRecordMetrics:126, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
doFilterInternal:111, WebMvcMetricsFilter (org.springframework.boot.actuate.metrics.web.servlet)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:90, HttpTraceFilter (org.springframework.boot.actuate.web.trace.servlet)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:320, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
invoke:127, FilterSecurityInterceptor (org.springframework.security.web.access.intercept)
doFilter:91, FilterSecurityInterceptor (org.springframework.security.web.access.intercept)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:119, ExceptionTranslationFilter (org.springframework.security.web.access)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:137, SessionManagementFilter (org.springframework.security.web.session)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:111, AnonymousAuthenticationFilter (org.springframework.security.web.authentication)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:170, SecurityContextHolderAwareRequestFilter (org.springframework.security.web.servletapi)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:63, RequestCacheAwareFilter (org.springframework.security.web.savedrequest)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:176, OAuth2AuthenticationProcessingFilter (org.springframework.security.oauth2.provider.authentication)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:116, LogoutFilter (org.springframework.security.web.authentication.logout)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:66, HeaderWriterFilter (org.springframework.security.web.header)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilter:105, SecurityContextPersistenceFilter (org.springframework.security.web.context)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:56, WebAsyncManagerIntegrationFilter (org.springframework.security.web.context.request.async)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
doFilter:334, FilterChainProxy$VirtualFilterChain (org.springframework.security.web)
doFilterInternal:215, FilterChainProxy (org.springframework.security.web)
doFilter:178, FilterChainProxy (org.springframework.security.web)
invokeDelegate:357, DelegatingFilterProxy (org.springframework.web.filter)
doFilter:270, DelegatingFilterProxy (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:99, RequestContextFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:109, HttpPutFormContentFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:93, HiddenHttpMethodFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:48, ExceptionLoggingFilter (org.springframework.cloud.sleuth.instrument.web)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:86, TracingFilter (brave.servlet)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:496, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:803, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:790, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1468, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

##### 构造Obserable(构造顺序 跟执行顺序的关系)

~~~java
public class Observable<T> {

    final OnSubscribe<T> onSubscribe;
    
}
    
每一个链式调用生成一个 Observable 并持有OnSubscribe包裹的上一个Observable     
最后调用的在最外层    例如    Observable.a0() ....   a().b().c();    c生成的Observable在最外层
    
    
//数据从调用next开始向外流  
    
//假设 a0() 直接调用了 subscriber 的onNext    
当 subscribe 一个订阅者时会 从外到内(c -> a0) 包裹 subscribe   c先包裹subscriber 最后a0在较外层
则会 按照包裹顺序依次调用 a0.onNext()  ....  a.onNext()  ....  c.onNext()
    
//假设 b() 直接调用了 subscriber 的onNext       
当 subscribe 一个订阅者时会 从外到内(c -> b) 包裹 subscribe   c先包裹subscriber 最后b在较外层
则会 按照包裹顺序依次调用 b.onNext()   c.onNext()
~~~



#### defer

~~~java
//...rx.Observable...
public static <T> Observable<T> defer(Func0<Observable<T>> observableFactory) {
    //传入的是一个工厂 
    //OnSubscribeDefer 包装一下工厂
    return unsafeCreate(new OnSubscribeDefer<T>(observableFactory));
}


public static <T> Observable<T> unsafeCreate(OnSubscribe<T> f) {
    //执行一边全局生命周期
    return new Observable<T>(RxJavaHooks.onCreate(f));
}


protected Observable(OnSubscribe<T> f) {
    //
    this.onSubscribe = f;
}
~~~

#### flatMap

```java
public final <R> Observable<R> flatMap(Func1<? super T, ? extends Observable<? extends R>> func) {
    if (getClass() == ScalarSynchronousObservable.class) {
        return ((ScalarSynchronousObservable<T>)this).scalarFlatMap(func);
    }
    return merge(map(func));
}


public static <T> Observable<T> merge(Observable<? extends Observable<? extends T>> source) {
    if (source.getClass() == ScalarSynchronousObservable.class) {
        return ((ScalarSynchronousObservable<T>)source).scalarFlatMap((Func1)UtilityFunctions.identity());
    }
    return source.lift(OperatorMerge.<T>instance(false));
}

OperatorMerge
```

#### map

~~~java
public final <R> Observable<R> map(Func1<? super T, ? extends R> func) {
    return unsafeCreate(new OnSubscribeMap<T, R>(this, func));
}
~~~

#### lift

```java
public final <R> Observable<R> lift(final Operator<? extends R, ? super T> operator) {
    //当前obserable的onSubscribe
    return unsafeCreate(new OnSubscribeLift<T, R>(onSubscribe, operator));
}
```



~~~java
public final class OnSubscribeLift<T, R> implements OnSubscribe<R> {

    final OnSubscribe<T> parent;

    final Operator<? extends R, ? super T> operator;

    public OnSubscribeLift(OnSubscribe<T> parent, Operator<? extends R, ? super T> operator) {
        //当前的即parent 会随operator后调用
        this.parent = parent;
        this.operator = operator;
    }

    @Override
    public void call(Subscriber<? super R> o) {
        try {
            //这里是一个流转机制 OnSubscribeLift 一般为包装一下subscriber
            //这里通过operator包装完 或执行subscriber(调用subscriber的onNext)后
            Subscriber<? super T> st = RxJavaHooks.onObservableLift(operator).call(o);
            try {
                //new Subscriber created and being subscribed with so 'onStart' it
                st.onStart();
                //再交给父的parent去包装完或执行subscriber(调用subscribe的onNext)后
                parent.call(st);
            } catch (Throwable e) {
                // localized capture of errors rather than it skipping all operators
                // and ending up in the try/catch of the subscribe method which then
                // prevents onErrorResumeNext and other similar approaches to error handling
                Exceptions.throwIfFatal(e);
                st.onError(e);
            }
        } catch (Throwable e) {
            Exceptions.throwIfFatal(e);
            // if the lift function failed all we can do is pass the error to the final Subscriber
            // as we don't have the operator available to us
            o.onError(e);
        }
    }
}
~~~







##### onBackpressureDrop

~~~java
public final Observable<T> onBackpressureDrop() {
    return lift(OperatorOnBackpressureDrop.<T>instance());
}
~~~

##### window

~~~java
public final Observable<Observable<T>> window(int count, int skip) {
    if (count <= 0) {
        throw new IllegalArgumentException("count > 0 required but it was " + count);
    }
    if (skip <= 0) {
        throw new IllegalArgumentException("skip > 0 required but it was " + skip);
    }
    //
    return lift(new OperatorWindowWithSize<T>(count, skip));
}
~~~

##### OperatorMerge

~~~java
public static <T> Observable<T> merge(Observable<? extends Observable<? extends T>> source) {
    if (source.getClass() == ScalarSynchronousObservable.class) {
        return ((ScalarSynchronousObservable<T>)source).scalarFlatMap((Func1)UtilityFunctions.identity());
    }
    return source.lift(OperatorMerge.<T>instance(false));
}
~~~

##### OperatorDoOnSubscribe

~~~java
public final Observable<T> doOnSubscribe(final Action0 subscribe) {
    return lift(new OperatorDoOnSubscribe<T>(subscribe));
}
~~~









#### subscribe

~~~java
...rx.Observable...
public final Subscription subscribe(final Observer<? super T> observer) {
    if (observer instanceof Subscriber) {
        return subscribe((Subscriber<? super T>)observer);
    }
    if (observer == null) {
        throw new NullPointerException("observer is null");
    }
    //包装一层
    return subscribe(new ObserverSubscriber<T>(observer));
}


static <T> Subscription subscribe(Subscriber<? super T> subscriber, Observable<T> observable) {
    // validate and proceed
    if (subscriber == null) {
        throw new IllegalArgumentException("subscriber can not be null");
    }
    if (observable.onSubscribe == null) {
        throw new IllegalStateException("onSubscribe function can not be null.");
        /*
             * the subscribe function can also be overridden but generally that's not the appropriate approach
             * so I won't mention that in the exception
             */
    }

    // new Subscriber so onStart it
    subscriber.onStart();

    /*
         * See https://github.com/ReactiveX/RxJava/issues/216 for discussion on "Guideline 6.4: Protect calls
         * to user code from within an Observer"
         */
    // if not already wrapped
    if (!(subscriber instanceof SafeSubscriber)) {
        // assign to `observer` so we return the protected version
        //这里处理了一些异常再包一层
        subscriber = new SafeSubscriber<T>(subscriber);
    }

    // The code below is exactly the same an unsafeSubscribe but not used because it would
    // add a significant depth to already huge call stacks.
    try {
        // allow the hook to intercept and/or decorate
        RxJavaHooks.onObservableStart(observable, observable.onSubscribe).call(subscriber);
        return RxJavaHooks.onObservableReturn(subscriber);
    } catch (Throwable e) {
        // special handling for certain Throwable/Error/Exception types
        Exceptions.throwIfFatal(e);
        // in case the subscriber can't listen to exceptions anymore
        if (subscriber.isUnsubscribed()) {
            RxJavaHooks.onError(RxJavaHooks.onObservableError(e));
        } else {
            // if an unhandled error occurs executing the onSubscribe we will propagate it
            try {
                subscriber.onError(RxJavaHooks.onObservableError(e));
            } catch (Throwable e2) {
                Exceptions.throwIfFatal(e2);
                // if this happens it means the onError itself failed (perhaps an invalid function implementation)
                // so we are unable to propagate the error correctly and will just throw
                RuntimeException r = new OnErrorFailedException("Error occurred attempting to subscribe [" + e.getMessage() + "] and then again while trying to pass to onError.", e2);
                // TODO could the hook be the cause of the error in the on error handling.
                RxJavaHooks.onObservableError(r);
                // TODO why aren't we throwing the hook's return value.
                throw r; // NOPMD
            }
        }
        return Subscriptions.unsubscribed();
    }
}
~~~

#### unsafeSubscribe

~~~java
//不检查直接执行
public final Subscription unsafeSubscribe(Subscriber<? super T> subscriber) {
    try {
        // new Subscriber so onStart it
        subscriber.onStart();
        // allow the hook to intercept and/or decorate
        RxJavaHooks.onObservableStart(this, onSubscribe).call(subscriber);
        return RxJavaHooks.onObservableReturn(subscriber);
    } catch (Throwable e) {
        // special handling for certain Throwable/Error/Exception types
        Exceptions.throwIfFatal(e);
        // if an unhandled error occurs executing the onSubscribe we will propagate it
        try {
            subscriber.onError(RxJavaHooks.onObservableError(e));
        } catch (Throwable e2) {
            Exceptions.throwIfFatal(e2);
            // if this happens it means the onError itself failed (perhaps an invalid function implementation)
            // so we are unable to propagate the error correctly and will just throw
            RuntimeException r = new OnErrorFailedException("Error occurred attempting to subscribe [" + e.getMessage() + "] and then again while trying to pass to onError.", e2);
            // TODO could the hook be the cause of the error in the on error handling.
            RxJavaHooks.onObservableError(r);
            // TODO why aren't we throwing the hook's return value.
            throw r; // NOPMD
        }
        return Subscriptions.unsubscribed();
    }
}
~~~





##### OnSubscribeRefCount

~~~java
...rx.internal.operators.OnSubscribeRefCount...
public void call(final Subscriber<? super T> subscriber) {

    lock.lock();
    if (subscriptionCount.incrementAndGet() == 1) {

        final AtomicBoolean writeLocked = new AtomicBoolean(true);

        try {
            // need to use this overload of connect to ensure that
            // baseSubscription is set in the case that source is a
            // synchronous Observable
            source.connect(onSubscribe(subscriber, writeLocked));
        } finally {
            // need to cover the case where the source is subscribed to
            // outside of this class thus preventing the Action1 passed
            // to source.connect above being called
            if (writeLocked.get()) {
                // Action1 passed to source.connect was not called
                lock.unlock();
            }
        }
    } else {
        try {
            // ready to subscribe to source so do it
            doSubscribe(subscriber, baseSubscription);
        } finally {
            // release the read lock
            lock.unlock();
        }
    }

}


private Action1<Subscription> onSubscribe(final Subscriber<? super T> subscriber,
                                          final AtomicBoolean writeLocked) {
    return new Action1<Subscription>() {
        @Override
        //
        public void call(Subscription subscription) {
            try {
                baseSubscription.add(subscription);
                // ready to subscribe to source so do it
                doSubscribe(subscriber, baseSubscription);
            } finally {
                // release the write lock
                lock.unlock();
                writeLocked.set(false);
            }
        }
    };
}
~~~

##### OperatorPublish

~~~java
...rx.internal.operators.OperatorPublish...
public void connect(Action1<? super Subscription> connection) {
    boolean doConnect;
    PublishSubscriber<T> ps;
    // we loop because concurrent connect/disconnect and termination may change the state
    for (;;) {
        // retrieve the current subscriber-to-source instance
        ps = current.get();
        // if there is none yet or the current has unsubscribed
        if (ps == null || ps.isUnsubscribed()) {
            // create a new subscriber-to-source
            PublishSubscriber<T> u = new PublishSubscriber<T>(current);
            // initialize out the constructor to avoid 'this' to escape
            u.init();
            // try setting it as the current subscriber-to-source
            if (!current.compareAndSet(ps, u)) {
                // did not work, perhaps a new subscriber arrived
                // and created a new subscriber-to-source as well, retry
                continue;
            }
            ps = u;
        }
        // if connect() was called concurrently, only one of them should actually
        // connect to the source
        doConnect = !ps.shouldConnect.get() && ps.shouldConnect.compareAndSet(false, true);
        break; // NOPMD
    }
    /*
         * Notify the callback that we have a (new) connection which it can unsubscribe
         * but since ps is unique to a connection, multiple calls to connect() will return the
         * same Subscription and even if there was a connect-disconnect-connect pair, the older
         * references won't disconnect the newer connection.
         * Synchronous source consumers have the opportunity to disconnect via unsubscribe on the
         * Subscription as unsafeSubscribe may never return in its own.
         *
         * Note however, that asynchronously disconnecting a running source might leave
         * child-subscribers without any terminal event; PublishSubject does not have this
         * issue because the unsubscription was always triggered by the child-subscribers
         * themselves.
         */
    
    //
    connection.call(ps);
    if (doConnect) {
        //
        source.unsafeSubscribe(ps);
    }
}
~~~



~~~java
...rx.internal.operators.OnSubscribeRefCount...    
void doSubscribe(final Subscriber<? super T> subscriber, final CompositeSubscription currentBase) {
        // handle unsubscribing from the base subscription
        subscriber.add(disconnect(currentBase));

    	//这里会调用订阅者的onNext
        source.unsafeSubscribe(new Subscriber<T>(subscriber) {
            @Override
            public void onError(Throwable e) {
                cleanup();
                subscriber.onError(e);
            }
            @Override
            public void onNext(T t) {
                subscriber.onNext(t);
            }
            @Override
            public void onCompleted() {
                cleanup();
                subscriber.onCompleted();
            }
            void cleanup() {
                // on error or completion we need to unsubscribe the base subscription
                // and set the subscriptionCount to 0
                lock.lock();
                try {

                    if (baseSubscription == currentBase) {
                        // backdoor into the ConnectableObservable to cleanup and reset its state
                        if (source instanceof Subscription) {
                            ((Subscription)source).unsubscribe();
                        }

                        baseSubscription.unsubscribe();
                        baseSubscription = new CompositeSubscription();
                        subscriptionCount.set(0);
                    }
                } finally {
                    lock.unlock();
                }
            }
        });
    }
~~~



~~~java
    public static <T> ConnectableObservable<T> create(Observable<? extends T> source) {
        // the current connection to source needs to be shared between the operator and its onSubscribe call
        final AtomicReference<PublishSubscriber<T>> curr = new AtomicReference<PublishSubscriber<T>>();
        OnSubscribe<T> onSubscribe = new OnSubscribe<T>() {
            @Override
            //connection.call(ps)
            public void call(Subscriber<? super T> child) {
                // concurrent connection/disconnection may change the state,
                // we loop to be atomic while the child subscribes
                for (;;) {
                    // get the current subscriber-to-source
                    PublishSubscriber<T> r = curr.get();
                    // if there isn't one or it is unsubscribed
                    if (r == null || r.isUnsubscribed()) {
                        // create a new subscriber to source
                        PublishSubscriber<T> u = new PublishSubscriber<T>(curr);
                        // perform extra initialization to avoid 'this' to escape during construction
                        u.init();
                        // let's try setting it as the current subscriber-to-source
                        if (!curr.compareAndSet(r, u)) {
                            // didn't work, maybe someone else did it or the current subscriber
                            // to source has just finished
                            continue;
                        }
                        // we won, let's use it going onwards
                        r = u;
                    }

                    // create the backpressure-managing producer for this child
                    InnerProducer<T> inner = new InnerProducer<T>(r, child);
                    /*
                     * Try adding it to the current subscriber-to-source, add is atomic in respect
                     * to other adds and the termination of the subscriber-to-source.
                     */
                    if (r.add(inner)) {
                        // the producer has been registered with the current subscriber-to-source so
                        // at least it will receive the next terminal event
                        child.add(inner);
                        // setting the producer will trigger the first request to be considered by
                        // the subscriber-to-source.
                        child.setProducer(inner);
                        break; // NOPMD
                    }
                    /*
                     * The current PublishSubscriber has been terminated, try with a newer one.
                     */
                    /*
                     * Note: although technically correct, concurrent disconnects can cause
                     * unexpected behavior such as child subscribers never receiving anything
                     * (unless connected again). An alternative approach, similar to
                     * PublishSubject would be to immediately terminate such child
                     * subscribers as well:
                     *
                     * Object term = r.terminalEvent;
                     * if (NotificationLite.isCompleted(term)) {
                     *     child.onCompleted();
                     * } else {
                     *     child.onError(NotificationLite.getError(term));
                     * }
                     * return;
                     *
                     * The original concurrent behavior was non-deterministic in this regard as well.
                     * Allowing this behavior, however, may introduce another unexpected behavior:
                     * after disconnecting a previous connection, one might not be able to prepare
                     * a new connection right after a previous termination by subscribing new child
                     * subscribers asynchronously before a connect call.
                     */
                }
            }
        };
        return new OperatorPublish<T>(onSubscribe, source, curr);
    }
~~~

### demo

##### demo1

~~~java
rx.Observable.from(initial())
    .flatMap(new Func1<Student, rx.Observable<Course>>() {
        @Override
        public rx.Observable<Course> call(Student student) {
            return rx.Observable.from(student.getCourseList());
        }
    })
    .subscribe(new Subscriber<Course>() {
        @Override
        public void onCompleted() {
            System.out.println("onCompleted");
        }

        @Override
        public void onError(Throwable e) {
            System.out.println("onError");
        }

        @Override
        public void onNext(Course courses) {
            System.out.println("onNext" + courses.getName());
        }
    });
~~~

###### 调用栈（merge operator 分支）

~~~java
emitLoop:589, OperatorMerge$MergeSubscriber (rx.internal.operators)
emit:568, OperatorMerge$MergeSubscriber (rx.internal.operators)
request:133, OperatorMerge$MergeProducer (rx.internal.operators)
setProducer:209, Subscriber (rx)
setProducer:205, Subscriber (rx)
//
call:111, OperatorMerge (rx.internal.operators) //
call:55, OperatorMerge (rx.internal.operators)  //第一个就是flatMap组合的merge操作符
call:44, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)//merge操作符的lift   这里传进来的 subscriber为包装后的safeSubscriber
subscribe:10423, Observable (rx)
subscribe:10390, Observable (rx)
test4:170, Test1 (com.piggymetrics.account)
invoke0:-1, NativeMethodAccessorImpl (sun.reflect)
invoke:62, NativeMethodAccessorImpl (sun.reflect)
invoke:43, DelegatingMethodAccessorImpl (sun.reflect)
invoke:498, Method (java.lang.reflect)
runReflectiveCall:50, FrameworkMethod$1 (org.junit.runners.model)
run:12, ReflectiveCallable (org.junit.internal.runners.model)
invokeExplosively:47, FrameworkMethod (org.junit.runners.model)
evaluate:17, InvokeMethod (org.junit.internal.runners.statements)
runLeaf:325, ParentRunner (org.junit.runners)
runChild:78, BlockJUnit4ClassRunner (org.junit.runners)
runChild:57, BlockJUnit4ClassRunner (org.junit.runners)
run:290, ParentRunner$3 (org.junit.runners)
schedule:71, ParentRunner$1 (org.junit.runners)
runChildren:288, ParentRunner (org.junit.runners)
access$000:58, ParentRunner (org.junit.runners)
evaluate:268, ParentRunner$2 (org.junit.runners)
run:363, ParentRunner (org.junit.runners)
run:137, JUnitCore (org.junit.runner)
startRunnerWithArgs:69, JUnit4IdeaTestRunner (com.intellij.junit4)
startRunnerWithArgs:33, IdeaTestRunner$Repeater (com.intellij.rt.junit)
prepareStreamsAndStart:235, JUnitStarter (com.intellij.rt.junit)
main:54, JUnitStarter (com.intellij.rt.junit)
~~~

###### OperatorMerge

~~~java
...rx.internal.operators.OperatorMerge...
@Override
public Subscriber<Observable<? extends T>> call(final Subscriber<? super T> child) {
    //这里不是持有关系（没有设置 subscriber 该值)
    MergeSubscriber<T> subscriber = new MergeSubscriber<T>(child, delayErrors, maxConcurrent);
   	//这里直接订阅了上面包装为MergeSubscriber的 subscriber  故而生产数据的时候能给到最终的订阅者
    MergeProducer<T> producer = new MergeProducer<T>(subscriber);
    //这里直接赋值
    subscriber.producer = producer;
    
    //这里为什么用child来执行这些操作
	//add的意义不明
    child.add(subscriber);
    //这里则通过set方法
    child.setProducer(producer);
    
    return subscriber;
}
~~~

###### Subscriber.request

~~~java
protected final void request(long n) {
    if (n < 0) {
        throw new IllegalArgumentException("number requested cannot be negative: " + n);
    }

    // if producer is set then we will request from it
    // otherwise we increase the requested count by n    
    
    //含义是如果 没设置producer的话 会将该次请求累加起来，等设置setProducer时一并拉取， 如果设置了去生产者哪里请求
    Producer producerToRequestFrom;
    synchronized (this) {
        //producer存在直接拉取
        if (producer != null) {
            producerToRequestFrom = producer;
        } else {
                addToRequested(n);
            return;
        }
    }
    // after releasing lock (we should not make requests holding a lock)
    producerToRequestFrom.request(n);
}
~~~

###### Subscriber.addToRequested

~~~java

private void addToRequested(long n) {
    if (requested == NOT_SET) {
        requested = n;
    } else {
        final long total = requested + n;
        // check if overflow occurred
        if (total < 0) { 
            //如果 生产者尚未准备好 则请求过多溢出  则说明下游消费的过来 不做背压限制
            requested = Long.MAX_VALUE;
        } else {
            requested = total;
        }
    }
}
~~~

###### Subscriber.setProducer(这个方法处理递归意义何在)

~~~java
public void setProducer(Producer p) {
    long toRequest;
    boolean passToSubscriber = false;
    synchronized (this) {
        toRequest = requested;
        //Subscriber.request会用到
        producer = p;
        if (subscriber != null) {
            // middle operator ... we pass through unless a request has been made
            if (toRequest == NOT_SET) {
                // we pass through to the next producer as nothing has been requested
                passToSubscriber = true;
            }
        }
    }
    // do after releasing lock
    if (passToSubscriber) {
       	//递归持有的subscriber  意在为每一个subscriber设置producer 使其具备调用 Subscriber.request的能力
        subscriber.setProducer(producer);
    } else {
        // we execute the request with whatever has been requested (or Long.MAX_VALUE)
        
        //设置producer的时候会取producer 设置的requested 数量 不设置意味着
        if (toRequest == NOT_SET) {
            producer.request(Long.MAX_VALUE);
        } else {
            producer.request(toRequest);
        }
    }
}
~~~

######  调用栈（parent分支）                                                                                                                                                                                      

~~~java
onNext:183, Test1$6 (com.piggymetrics.account)
//没有被包裹的Subscriber
onNext:170, Test1$6 (com.piggymetrics.account)
onNext:134, SafeSubscriber (rx.observers)
emitScalar:395, OperatorMerge$MergeSubscriber (rx.internal.operators)
tryEmit:355, OperatorMerge$MergeSubscriber (rx.internal.operators)
onNext:846, OperatorMerge$InnerSubscriber (rx.internal.operators)
//这里调用OperatorMerge$MergeSubscriber.tryEmit
slowPath:117, OnSubscribeFromIterable$IterableProducer (rx.internal.operators)
request:89, OnSubscribeFromIterable$IterableProducer (rx.internal.operators)
setProducer:211, Subscriber (rx)
call:63, OnSubscribeFromIterable (rx.internal.operators)
call:34, OnSubscribeFromIterable (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
onNext:248, OperatorMerge$MergeSubscriber (rx.internal.operators)
//这里为什么不直接调用OperatorMerge$MergeSubscriber.tryEmit 而要在上面调用
//为了做被压处理还是什么？？？    
onNext:148, OperatorMerge$MergeSubscriber (rx.internal.operators)
onNext:77, OnSubscribeMap$MapSubscriber (rx.internal.operators)
fastPath:173, OnSubscribeFromIterable$IterableProducer (rx.internal.operators)
request:86, OnSubscribeFromIterable$IterableProducer (rx.internal.operators)
setProducer:211, Subscriber (rx)
setProducer:102, OnSubscribeMap$MapSubscriber (rx.internal.operators)
//为什么不在这一步调用producer的request  
//而要通过调用 actual.setProducer(p)(Subscriber.setProducer)  来触发 producer的request
//这里借由通用方法的处理不确定的嵌套关系的缘故吗，就是actual 不是真正的 actual？
call:63, OnSubscribeFromIterable (rx.internal.operators)
call:34, OnSubscribeFromIterable (rx.internal.operators)
unsafeSubscribe:10327, Observable (rx)
//
call:48, OnSubscribeMap (rx.internal.operators)
call:33, OnSubscribeMap (rx.internal.operators)
//这里进入OnSubscribeLift中的 parent.call
call:48, OnSubscribeLift (rx.internal.operators)
call:30, OnSubscribeLift (rx.internal.operators)
subscribe:10423, Observable (rx)
subscribe:10390, Observable (rx)
test4:170, Test1 (com.piggymetrics.account)
invoke0:-1, NativeMethodAccessorImpl (sun.reflect)
invoke:62, NativeMethodAccessorImpl (sun.reflect)
invoke:43, DelegatingMethodAccessorImpl (sun.reflect)
invoke:498, Method (java.lang.reflect)
runReflectiveCall:50, FrameworkMethod$1 (org.junit.runners.model)
run:12, ReflectiveCallable (org.junit.internal.runners.model)
invokeExplosively:47, FrameworkMethod (org.junit.runners.model)
evaluate:17, InvokeMethod (org.junit.internal.runners.statements)
runLeaf:325, ParentRunner (org.junit.runners)
runChild:78, BlockJUnit4ClassRunner (org.junit.runners)
runChild:57, BlockJUnit4ClassRunner (org.junit.runners)
run:290, ParentRunner$3 (org.junit.runners)
schedule:71, ParentRunner$1 (org.junit.runners)
runChildren:288, ParentRunner (org.junit.runners)
access$000:58, ParentRunner (org.junit.runners)
evaluate:268, ParentRunner$2 (org.junit.runners)
run:363, ParentRunner (org.junit.runners)
run:137, JUnitCore (org.junit.runner)
startRunnerWithArgs:69, JUnit4IdeaTestRunner (com.intellij.junit4)
startRunnerWithArgs:33, IdeaTestRunner$Repeater (com.intellij.rt.junit)
prepareStreamsAndStart:235, JUnitStarter (com.intellij.rt.junit)
main:54, JUnitStarter (com.intellij.rt.junit)
~~~

###### OnSubscribeMap

~~~java
...rx.internal.operators.OnSubscribeMap...
@Override
public void call(final Subscriber<? super R> o) {
    //这里不是持有关系（没有设置 subscriber 该值)
    MapSubscriber<T, R> parent = new MapSubscriber<T, R>(o, transformer);
    //这里同样add了包裹后的
    o.add(parent);
    
    //source消费
    source.unsafeSubscribe(parent);
}
~~~

~~~java
@Override
public void call(final Subscriber<? super T> o) {
    Iterator<? extends T> it;
    boolean b;

    try {
        //获取遍历器
        it = is.iterator();

        b = it.hasNext();
    } catch (Throwable ex) {
        Exceptions.throwOrReport(ex, o);
        return;
    }

    if (!o.isUnsubscribed()) {
        if (!b) {
            o.onCompleted();
        } else {
            o.setProducer(new IterableProducer<T>(o, it));
        }
    }
}
~~~

###### OnSubscribeFromIterable.fastPath

~~~java
...rx.internal.operators.OnSubscribeFromIterable...
void fastPath() {
    // fast-path without backpressure
    final Subscriber<? super T> o = this.o;
    final Iterator<? extends T> it = this.it;

    for (;;) {
        if (o.isUnsubscribed()) {
            return;
        }

        T value;

        try {
            value = it.next();
        } catch (Throwable ex) {
            Exceptions.throwOrReport(ex, o);
            return;
        }
		//这里调用外层Subscriber 此demo 即 rx.internal.operators.OnSubscribeMap$MapSubscriber@4ba2ca36
        o.onNext(value);

        if (o.isUnsubscribed()) {
            return;
        }

        boolean b;

        try {
            b  = it.hasNext();
        } catch (Throwable ex) {
            Exceptions.throwOrReport(ex, o);
            return;
        }

        if (!b) {
            if (!o.isUnsubscribed()) {
                o.onCompleted();
            }
            return;
        }
    }
}
~~~

###### OnSubscribeMap.onNext

~~~java
...rx.internal.operators.OnSubscribeMap...
@Override
public void onNext(T t) {
    R result;

    try {
        //此mapper为转换的方法
        result = mapper.call(t);
    } catch (Throwable ex) {
        Exceptions.throwIfFatal(ex);
        unsubscribe();
        onError(OnErrorThrowable.addValueAsLastCause(ex, t));
        return;
    }
	//处理过后传达给真的真正的订阅者 此处为SafeSubscriber
    actual.onNext(result);
}
~~~

OperatorMerge.onNext

```java
...rx.internal.operators.OperatorMerge...
@Override
public void onNext(Observable<? extends T> t) {
    if (t == null) {
        return;
    }
    if (t == Observable.empty()) {
        emitEmpty();
    } else
    if (t instanceof ScalarSynchronousObservable) {
        tryEmit(((ScalarSynchronousObservable<? extends T>)t).get());
    } else {
        //这里为什么要加一层   （加一层的意义在于需要以订阅的流程  而上有逻辑订阅会订阅会调用onNext 形成死循环）
        InnerSubscriber<T> inner = new InnerSubscriber<T>(this, uniqueId++);
        addInner(inner);
        //这个 虽然简单遍历 tryEmit() 可以实现展开逻辑, 但无法适配Observable 链式逻辑(不知道有几层链式调用)）
        t.unsafeSubscribe(inner);
        //这个  有啥区别
        emit();
    }
}
```

##### demo2（背压）

~~~java
new Thread() {
    @Override
    public void run() {
        //被观察者将产生100000个事件
        Observable observable = Observable.range(1, 100000);
        observable.observeOn(Schedulers.newThread())
            .subscribe(new Subscriber<Object>() {
                @Override
                public void onStart() {
                    //若未设置则表示没有背压 会设置为Long的最大值
                    //一定要在onStart中通知被观察者先发送一个事件
                    request(1);       
                }

                @Override
                public void onCompleted() {

                }

                @Override
                public void onError(Throwable e) {

                }

                @Override
                public void onNext(Object n) {
                    System.out.println(n);
                }
            });
    }
}.start();
~~~



~~~java
public void call(Subscriber<? super R> o) {
    try {                                                      //OperatorObserveOn  ①
        Subscriber<? super T> st = RxJavaHooks.onObservableLift(operator).call(o);
        try {
            // new Subscriber created and being subscribed with so 'onStart' it
            st.onStart();
            
            //OnSubscribeRange  ②
            parent.call(st);
        } catch (Throwable e) {
            // localized capture of errors rather than it skipping all operators
            // and ending up in the try/catch of the subscribe method which then
            // prevents onErrorResumeNext and other similar approaches to error handling
            Exceptions.throwIfFatal(e);
            st.onError(e);
        }
    } catch (Throwable e) {
        Exceptions.throwIfFatal(e);
        // if the lift function failed all we can do is pass the error to the final Subscriber
        // as we don't have the operator available to us
        o.onError(e);
    }
}
~~~

###### OperatorObserveOn.call

~~~java
...rx.internal.operators.OperatorObserveOn...
@Override
public Subscriber<? super T> call(Subscriber<? super T> child) {
    if (scheduler instanceof ImmediateScheduler) {
        // avoid overhead, execute directly
        return child;
    } else if (scheduler instanceof TrampolineScheduler) {
        // avoid overhead, execute directly
        return child;
    } else {
        ObserveOnSubscriber<T> parent = new ObserveOnSubscriber<T>(scheduler, child, delayError, bufferSize);
        //这里初始化的时候便
        parent.init();
        return parent;
    }
}
~~~



~~~java
rx.internal.operators.OperatorObserveOn.ObserveOnSubscriber...
static final class ObserveOnSubscriber<T> extends Subscriber<T> implements Action0 {
    ...
        //这个是下游请求过来的
        final AtomicLong requested = new AtomicLong();
		
    	//这个是当任务运行计数，保证只有一个任务运行
        final AtomicLong counter = new AtomicLong();    
    ...
    
    public ObserveOnSubscriber(Scheduler scheduler, Subscriber<? super T> child, boolean delayError, int bufferSize) {
        this.child = child;
        this.recursiveScheduler = scheduler.createWorker();
        this.delayError = delayError;
        int calculatedSize = (bufferSize > 0) ? bufferSize : RxRingBuffer.SIZE;
        // this formula calculates the 75% of the bufferSize, rounded up to the next integer
        this.limit = calculatedSize - (calculatedSize >> 2);
        if (UnsafeAccess.isUnsafeAvailable()) {
            queue = new SpscArrayQueue<Object>(calculatedSize);
        } else {
            queue = new SpscAtomicArrayQueue<Object>(calculatedSize);
        }
        // signal that this is an async operator capable of receiving this many    
        
        //这个应该是通知上游用的     当没有设置producer是 表明当前订阅者每次需要请求的个数  设置过后直接去 producer那里去请求
        request(calculatedSize);
    }
    
    void init() {
        // don't want this code in the constructor because `this` can escape through the
        // setProducer call
        Subscriber<? super T> localChild = child;

        //这样设置producer的含义是：  localChild(Subscriber) 的 request 请求交由 给定的Subscriber处理
        localChild.setProducer(new Producer() {

            @Override
            public void request(long n) {
                if (n > 0L) {
                    //记录并增加 请求的个数
                    BackpressureUtils.getAndAddRequest(requested, n);
                    //开启数据的推送   //这次调用不知道意义何在 因为数据源一直为空this.queue;
                    schedule();
                }
            }

        });
        localChild.add(recursiveScheduler);
        localChild.add(this);
    }
    
    
    @Override
    public void onNext(final T t) {
        if (isUnsubscribed() || finished) {
            return;
        }
        //这里来自上游的数据
        if (!queue.offer(NotificationLite.next(t))) {
            onError(new MissingBackpressureException());
            return;
        }
        //这里再开启就有数据发送给下游了
        schedule();
    }
    
    
    // only execute this from schedule()
    @Override
    public void call() {
        long missed = 1L;
        long currentEmission = emitted;

        // these are accessed in a tight loop around atomics so
        // loading them into local variables avoids the mandatory re-reading
        // of the constant fields
        final Queue<Object> q = this.queue;
        final Subscriber<? super T> localChild = this.child;

        // requested and counter are not included to avoid JIT issues with register spilling
        // and their access is is amortized because they are part of the outer loop which runs
        // less frequently (usually after each bufferSize elements)

        for (;;) {
            long requestAmount = requested.get();

            while (requestAmount != currentEmission) {
                boolean done = finished;
                Object v = q.poll();
                boolean empty = v == null;

                if (checkTerminated(done, empty, localChild, q)) {
                    return;
                }

                if (empty) {
                    break;
                }

                localChild.onNext(NotificationLite.<T>getValue(v));

                currentEmission++;
                //消费了 75%时
                if (currentEmission == limit) {
                    //到达限制会重置requested
                    requestAmount = BackpressureUtils.produced(requested, currentEmission);
                    //并设置Subscriber.requested 为 limit  (开始向producer<即上游>要数据, 即开启背压循环)
                    request(currentEmission);
                    //置零
                    currentEmission = 0L;
                }
            }
            
			//下游没有请求 检查是否终止
            if (requestAmount == currentEmission) {
                if (checkTerminated(finished, q.isEmpty(), localChild, q)) {
                    return;
                }
            }
			
            //更新已发送的
            emitted = currentEmission;
            
            //取消引用任务引用  当前任务执行完毕 break  （为什么不是放在finally里执行）
            missed = counter.addAndGet(-missed);
            if (missed == 0L) {
                break;
            }
        }
    }
    
    //
    protected final void request(long n) {
        if (n < 0) {
            throw new IllegalArgumentException("number requested cannot be negative: " + n);
        }

        // if producer is set then we will request from it
        // otherwise we increase the requested count by n
        Producer producerToRequestFrom;
        synchronized (this) {
            if (producer != null) {
                producerToRequestFrom = producer;
            } else {
                addToRequested(n);
                return;
            }
        }
        // after releasing lock (we should not make requests holding a lock)
        //向上游的producer要数据
        producerToRequestFrom.request(n);
    }
}

~~~

###### OnSubscribeRange.request(最上游)

~~~java
...rx.internal.operators.OnSubscribeRange...  
//除了初始化会调用一次  会被当 ObserveOnSubscriber  向下游发送值到达ObserveOnSubscriber.limit  会调用此方法拉取
@Override
public void request(long requestedAmount) {
    if (get() == Long.MAX_VALUE) {
        // already started with fast-path
        return;
    }
    if (requestedAmount == Long.MAX_VALUE && compareAndSet(0L, Long.MAX_VALUE)) {
        // fast-path without backpressure
        fastPath();
    } else if (requestedAmount > 0L) {
        long c = BackpressureUtils.getAndAddRequest(this, requestedAmount);
        if (c == 0L) {
            // backpressure is requested(背压路线)
            slowPath(requestedAmount);
        }
    }
}
~~~

###### OnSubscribeRange.slowPath

~~~java
/**
         * Emits as many values as requested or remaining from the range, whichever is smaller.
         */
void slowPath(long requestedAmount) {
    long emitted = 0L;
    long endIndex = endOfRange + 1L;
    long index = currentIndex;

    final Subscriber<? super Integer> childSubscriber = this.childSubscriber;

    for (;;) {
		//将下游请求的数量都发出去
        while (emitted != requestedAmount && index != endIndex) {
            if (childSubscriber.isUnsubscribed()) {
                return;
            }

            childSubscriber.onNext((int)index);

            index++;
            emitted++;
        }
		//检查下游状态
        if (childSubscriber.isUnsubscribed()) {
            return;
        }

        if (index == endIndex) {
            childSubscriber.onCompleted();
            return;
        }

        requestedAmount = get();

        if (requestedAmount == emitted) {
            currentIndex = index;
            requestedAmount = addAndGet(-emitted);
            //判断发送完成则 结束该循环
            if (requestedAmount == 0L) {
                break;
            }
            emitted = 0L;
        }
    }
}
~~~

