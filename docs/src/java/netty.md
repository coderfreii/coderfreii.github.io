# Netty

## 初始化流程

run

~~~java
// here build all child NioEventLoop  and  every eventLoop will wrapper origin java nio component 
eventLoopGroup = new NioEventLoopGroup();

ServerBootstrap b = new ServerBootstrap();
DefaultEventExecutorGroup executor = new DefaultEventExecutorGroup(handlerThreadPoolSize);
b.group(eventLoopGroup)
    .channel(NioServerSocketChannel.class)
    .childHandler(new ChannelInitializer<SocketChannel>() {
        @Override
        public void initChannel(SocketChannel ch) throws Exception {
            ch.pipeline()
                .addLast(new ConnectionAdapter())  // printf logs
                .addLast(new HandShakeDecoder())	//  handshake
                .addLast(new ChunkDecoder())		// decode
                .addLast(new ChunkEncoder())		// encode
                .addLast(executor, new RtmpMessageHandler(streamManager));  //
        }
    })
    .option(ChannelOption.SO_BACKLOG, 128)
    .childOption(ChannelOption.SO_KEEPALIVE, true);

//初始化入口
channelFuture = b.bind(port).sync();
~~~



ServerBootstrap.bind

~~~java
//***io.netty.bootstrap.AbstractBootstrap***

public ChannelFuture bind(SocketAddress localAddress) {
    //验证
    validate();
    //绑定
    return doBind(ObjectUtil.checkNotNull(localAddress, "localAddress"));
}



private ChannelFuture doBind(final SocketAddress localAddress) {
    //** 初始化并注册
    final ChannelFuture regFuture = initAndRegister();
    final Channel channel = regFuture.channel();
    if (regFuture.cause() != null) {
        return regFuture;
    }

    if (regFuture.isDone()) {
        // At this point we know that the registration was complete and successful.
        ChannelPromise promise = channel.newPromise();
        
        //**  dobind
        doBind0(regFuture, channel, localAddress, promise);
        return promise;
    } else {
        // Registration future is almost always fulfilled already, but just in case it's not.
        final PendingRegistrationPromise promise = new PendingRegistrationPromise(channel);
        
        //
        regFuture.addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture future) throws Exception {
                Throwable cause = future.cause();
                if (cause != null) {
                    // Registration on the EventLoop failed so fail the ChannelPromise directly to not cause  										//an
                    // IllegalStateException once we try to access the EventLoop of the Channel.
                    promise.setFailure(cause);
                } else {
                    // Registration was successful, so set the correct executor to use.
                    // See https://github.com/netty/netty/issues/2586
                    
                    //if done modify the promise‘s status
                    promise.registered();
					
                    //**
                    doBind0(regFuture, channel, localAddress, promise);
                }
            }
        });
        return promise;
    }
}
~~~



final ChannelFuture regFuture = initAndRegister();

~~~java
//***io.netty.bootstrap.AbstractBootstrap***

final ChannelFuture initAndRegister() {
    Channel channel = null;
    try {
        //1.* get channel instance
        channel = channelFactory.newChannel();
        //initial channel
        init(channel);
    } catch (Throwable t) {
        if (channel != null) {
            // channel can be null if newChannel crashed (eg SocketException("too many open files"))
            channel.unsafe().closeForcibly();
            // as the Channel is not registered yet we need to force the usage of the GlobalEventExecutor
            return new DefaultChannelPromise(channel, GlobalEventExecutor.INSTANCE).setFailure(t);
        }
        // as the Channel is not registered yet we need to force the usage of the GlobalEventExecutor
        return new DefaultChannelPromise(new FailedChannel(), GlobalEventExecutor.INSTANCE).setFailure(t);
    }
	
    //4.* register channel to group whicth provide by user it hold a collection of  eventLoop
    // will select an eventLoop by remainder to register channel  
    // return future
    ChannelFuture regFuture = config().group().register(channel);
    
    
    if (regFuture.cause() != null) {
        if (channel.isRegistered()) {
            channel.close();
        } else {
            channel.unsafe().closeForcibly();
        }
    }

    // If we are here and the promise is not failed, it's one of the following cases:
    // 1) If we attempted registration from the event loop, the registration has been completed at this point.
    //    i.e. It's safe to attempt bind() or connect() now because the channel has been registered.
    // 2) If we attempted registration from the other thread, the registration request has been successfully
    //    added to the event loop's task queue for later execution.
    //    i.e. It's safe to attempt bind() or connect() now:
    //         because bind() or connect() will be executed *after* the scheduled registration task is executed
    //         because register(), bind(), and connect() are all bound to the same thread.

    return regFuture;
}
~~~

### init(channel);初始化server channel

~~~java
//...io.netty.bootstrap.ServerBootstrap...
@Override
void init(Channel channel) {
    // get options was setted by user
    setChannelOptions(channel, options0().entrySet().toArray(newOptionArray(0)), logger);
    setAttributes(channel, attrs0().entrySet().toArray(newAttrArray(0)));
	
    // 2.* get default pipeline instance
    ChannelPipeline p = channel.pipeline();
	
    // get childGroup was setted by user
    final EventLoopGroup currentChildGroup = childGroup;
    
    // get ChanelInitializer was setted by user
    final ChannelHandler currentChildHandler = childHandler;
    
    // get children options was setted by user    
    final Entry<ChannelOption<?>, Object>[] currentChildOptions =
        childOptions.entrySet().toArray(newOptionArray(0));
    
    final Entry<AttributeKey<?>, Object>[] currentChildAttrs = childAttrs.entrySet().toArray(newAttrArray(0));

    //wrap user's ChannelInitializer and  add into pipeline   
    p.addLast(new ChannelInitializer<Channel>() {
        @Override
        public void initChannel(final Channel ch) {
            // same instance as prvious p
            final ChannelPipeline pipeline = ch.pipeline();
            
            // this handler possibility  passed by user in some other ways
            ChannelHandler handler = config.handler();
            if (handler != null) {
                pipeline.addLast(handler);
            }

            //the previous added ctx was remove at some time before here   need checking 
            ch.eventLoop().execute(new Runnable() {
                @Override
                public void run() {
                    pipeline.addLast(new ServerBootstrapAcceptor(
                        ch, currentChildGroup, currentChildHandler, currentChildOptions, currentChildAttrs));
                }
            });
        }
    });
}
~~~



~~~java
//...io.netty.channel.DefaultChannelPipeline...
protected DefaultChannelPipeline(Channel channel) {
    this.channel = ObjectUtil.checkNotNull(channel, "channel");
    succeededFuture = new SucceededChannelFuture(channel, null);
    voidPromise =  new VoidChannelPromise(channel, true);
	
    //尾部的TailContext   final class TailContext extends AbstractChannelHandlerContext implements ChannelInboundHandler
    tail = new TailContext(this);
    //头部      
    //final class HeadContext extends AbstractChannelHandlerContext implements ChannelOutboundHandler, ChannelInboundHandler
    head = new HeadContext(this);

    head.next = tail;
    tail.prev = head;
}
~~~



p.addLast(new ChannelInitializer<Channel>() {

~~~java
//...io.netty.channel.DefaultChannelPipeline...

//add handler by batch
@Override
public final ChannelPipeline addLast(ChannelHandler... handlers) {
    return addLast(null, handlers);
}

// reload method for add handlers with given excutor
@Override
public final ChannelPipeline addLast(EventExecutorGroup executor, ChannelHandler... handlers) {
    if (handlers == null) {
        throw new NullPointerException("handlers");
    }

    for (ChannelHandler h: handlers) {
        if (h == null) {
            break;
        }
        //**
        addLast(executor, null, h);
    }

    return this;
}


//addLast(executor, null, h);
@Override
public final ChannelPipeline addLast(EventExecutorGroup group, String name, ChannelHandler handler) {
    final AbstractChannelHandlerContext newCtx;
    synchronized (this) {
        //检查是否共享
        checkMultiplicity(handler);
		
        //3.* create a channelhandlerContext    
        //filterName(name, handler)  create handler name
        newCtx = newContext(group, filterName(name, handler), handler);

        //actual add channelHandlerContext into link list
        addLast0(newCtx);

        // If the registered is false it means that the channel was not registered on an eventLoop yet.
        // In this case we add the context to the pipeline and add a task that will call
        // ChannelHandler.handlerAdded(...) once the channel is registered.
        if (!registered) {
            newCtx.setAddPending();
            //** 
            //channel注册后的回调函数  初始化handler
            callHandlerCallbackLater(newCtx, true);
            return this;
        }
		
        //  if executor is set null  then return channel().eventLoop()
        EventExecutor executor = newCtx.executor();
        if (!executor.inEventLoop()) {
            callHandlerAddedInEventLoop(newCtx, executor);
            return this;
        }
    }
    //** io.netty.bootstrap.ServerBootstrap.ServerBootstrapAcceptor  if ctx's handler is instance of previous class do nothing
    callHandlerAdded0(newCtx);
    return this;
}
~~~

checkMultiplicity(handler);

~~~java
//...io.netty.channel.DefaultChannelPipeline...
private static void checkMultiplicity(ChannelHandler handler) {
    if (handler instanceof ChannelHandlerAdapter) {
        ChannelHandlerAdapter h = (ChannelHandlerAdapter) handler;
        
        //check if ChannelHandlerAdapter was non-shared and added  if did thow an error 
        if (!h.isSharable() && h.added) {
            throw new ChannelPipelineException(
                h.getClass().getName() +
                " is not a @Sharable handler, so can't be added or removed multiple times.");
        }
        
        // mark as added
        h.added = true;
    }
}
~~~

newCtx = newContext(group, filterName(name, handler), handler);

```java
//...io.netty.channel.DefaultChannelPipeline...
private AbstractChannelHandlerContext newContext(EventExecutorGroup group, String name, ChannelHandler handler) {
    // create a default one
    return new DefaultChannelHandlerContext(this, childExecutor(group), name, handler);
}


//return new DefaultChannelHandlerContext(this, childExecutor(group), name, handler);
//...io.netty.channel.AbstractChannelHandlerContext...
AbstractChannelHandlerContext(DefaultChannelPipeline pipeline, EventExecutor executor,
                              String name, Class<? extends ChannelHandler> handlerClass) {
    this.name = ObjectUtil.checkNotNull(name, "name");
    this.pipeline = pipeline;
    this.executor = executor;
    // get mask 
    this.executionMask = mask(handlerClass);
    // Its ordered if its driven by the EventLoop or the given Executor is an instanceof OrderedEventExecutor.
    ordered = executor == null || executor instanceof OrderedEventExecutor;
}

//is.executionMask = mask(handlerClass);
//...io.netty.channel.ChannelHandlerMask...
static int mask(Class<? extends ChannelHandler> clazz) {
    // Try to obtain the mask from the cache first. If this fails calculate it and put it in the cache for fast
    // lookup in the future.
    Map<Class<? extends ChannelHandler>, Integer> cache = MASKS.get();
    Integer mask = cache.get(clazz);
    if (mask == null) {
        //根据规则生成mask
        mask = mask0(clazz);
        cache.put(clazz, mask);
    }
    return mask;
}
```

callHandlerCallbackLater(newCtx, true);

~~~java
//...io.netty.channel.DefaultChannelPipeline...
private void callHandlerCallbackLater(AbstractChannelHandlerContext ctx, boolean added) {
    assert !registered;

    PendingHandlerCallback task = added ? new PendingHandlerAddedTask(ctx) : new PendingHandlerRemovedTask(ctx);
    PendingHandlerCallback pending = pendingHandlerCallbackHead;
    if (pending == null) {
        pendingHandlerCallbackHead = task;
    } else {
        // Find the tail of the linked-list.
        while (pending.next != null) {
            pending = pending.next;
        }
        pending.next = task;
    }
}
~~~

ChannelFuture regFuture = config().group().register(channel);

~~~java
@Override
public ChannelFuture register(Channel channel) {
    return next().register(channel);
}
~~~

return next().register(channel);

```java
//...io.netty.channel.SingleThreadEventLoop...

@Override
public ChannelFuture register(Channel channel) {
    return register(new DefaultChannelPromise(channel, this));
}


@Override
public ChannelFuture register(final ChannelPromise promise) {
    ObjectUtil.checkNotNull(promise, "promise");
    promise.channel().unsafe().register(this, promise);
    return promise;
}
```



~~~java
//...io.netty.channel.DefaultChannelPromise...
~~~

~~~java
//...io.netty.channel.AbstractChannel.AbstractUnsafe..


@Override
public final void register(EventLoop eventLoop, final ChannelPromise promise) {
    if (eventLoop == null) {
        throw new NullPointerException("eventLoop");
    }
    if (isRegistered()) {
        promise.setFailure(new IllegalStateException("registered to an event loop already"));
        return;
    }
    if (!isCompatible(eventLoop)) {
        promise.setFailure(
            new IllegalStateException("incompatible event loop type: " + eventLoop.getClass().getName()));
        return;
    }
	
    // a channel holds an eventloop
    AbstractChannel.this.eventLoop = eventLoop;

    if (eventLoop.inEventLoop()) {         //current thread is as same as the thread eventloop holds 
        register0(promise);
    } else {  
        try {
            eventLoop.execute(new Runnable() {
                @Override
                public void run() {
                    register0(promise);
                }
            });
        } catch (Throwable t) {
            logger.warn(
                "Force-closing a channel whose registration task was not accepted by an event loop: {}",
                AbstractChannel.this, t);
            closeForcibly();
            closeFuture.setClosed();
            safeSetFailure(promise, t);
        }
    }
}

//...io.netty.channel.AbstractChannel...
private void register0(ChannelPromise promise) {
    try {
        // check if the channel is still open as it could be closed in the mean time when the register
        // call was outside of the eventLoop
        if (!promise.setUncancellable() || !ensureOpen(promise)) {
            return;
        }
        boolean firstRegistration = neverRegistered;
        //注册进selecor
        doRegister();
        neverRegistered = false;
        registered = true;

        
        // Ensure we call handlerAdded(...) before we actually notify the promise. This is needed as the
        // user may already fire events through the pipeline in the ChannelFutureListener.
        
        // !!!here will initialize channel pipeline  with  user setting
        pipeline.invokeHandlerAddedIfNeeded();

        
        //**  //最后dobind绑定
        safeSetSuccess(promise);
        pipeline.fireChannelRegistered();
        // Only fire a channelActive if the channel has never been registered. This prevents firing
        // multiple channel actives if the channel is deregistered and re-registered.
        if (isActive()) {
            if (firstRegistration) {
                //**
                //first will do
                pipeline.fireChannelActive();
            } else if (config().isAutoRead()) {
                // This channel was registered before and autoRead() is set. This means we need to begin     
                 //read
                // again so that we process inbound data.
                //
                // See https://github.com/netty/netty/issues/4805
                beginRead();
            }
        }
    } catch (Throwable t) {
        // Close the channel directly to avoid FD leak.
        closeForcibly();
        closeFuture.setClosed();
        safeSetFailure(promise, t);
    }
}


//doRegister();
//...io.netty.channel.nio.AbstractNioChannel...
protected void doRegister() throws Exception {
    boolean selected = false;
    for (;;) {
        try {
            //注册为selector
            selectionKey = javaChannel().register(eventLoop().unwrappedSelector(), 0, this);
            return;
        } catch (CancelledKeyException e) {
            if (!selected) {
                // Force the Selector to select now as the "canceled" SelectionKey may still be
                // cached and not removed because no Select.select(..) operation was called yet.
                eventLoop().selectNow();
                selected = true;
            } else {
                // We forced a select operation on the selector before but the SelectionKey is still cached
                // for whatever reason. JDK bug ?
                throw e;
            }
        }
    }
}

~~~

### eventLoop.execute(new Runnable() {

~~~java
//...io.netty.util.concurrent.SingleThreadEventExecutor...
@Override
public void execute(Runnable task) {
    if (task == null) {
        throw new NullPointerException("task");
    }
	//
    boolean inEventLoop = inEventLoop();
    //
    addTask(task);
    if (!inEventLoop) {
        //
        startThread();
        if (isShutdown()) {
            boolean reject = false;
            try {
                if (removeTask(task)) {
                    reject = true;
                }
            } catch (UnsupportedOperationException e) {
                // The task queue does not support removal so the best thing we can do is to just move on 
                // and
                // hope we will be able to pick-up the task before its completely terminated.
                // In worst case we will log on termination.
            }
            if (reject) {
                reject();
            }
        }
    }

    if (!addTaskWakesUp && wakesUpForTask(task)) {
        //**
        wakeup(inEventLoop);
    }
}


private void startThread() {
    if (state == ST_NOT_STARTED) {
        if (STATE_UPDATER.compareAndSet(this, ST_NOT_STARTED, ST_STARTED)) {
            boolean success = false;
            try {
                //**
                doStartThread();
                success = true;
            } finally {
                if (!success) {
                    STATE_UPDATER.compareAndSet(this, ST_STARTED, ST_NOT_STARTED);
                }
            }
        }
    }
}


//doStartThread();
private void doStartThread() {
    assert thread == null;
    //**
    executor.execute(new Runnable() {
        @Override
        public void run() {
            //bind this thread to eventloop
            thread = Thread.currentThread();
            if (interrupted) {
                thread.interrupt();
            }

            boolean success = false;
            updateLastExecutionTime();
            try {
                //
                SingleThreadEventExecutor.this.run();
                success = true;
            } catch (Throwable t) {
                logger.warn("Unexpected exception from an event executor: ", t);
            } finally {
                for (;;) {
                    int oldState = state;
                    if (oldState >= ST_SHUTTING_DOWN || STATE_UPDATER.compareAndSet(
                        SingleThreadEventExecutor.this, oldState, ST_SHUTTING_DOWN)) {
                        break;
                    }
                }

                // Check if confirmShutdown() was called at the end of the loop.
                if (success && gracefulShutdownStartTime == 0) {
                    if (logger.isErrorEnabled()) {
                        logger.error("Buggy " + 
                            EventExecutor.class.getSimpleName() + 
                            "implementation; " +
                            SingleThreadEventExecutor.class.getSimpleName() + 
                            ".confirmShutdown() must" +
                            "be called before run() implementation terminates.");
                    }
                }

                try {
                    // Run all remaining tasks and shutdown hooks.
                    for (;;) {
                        if (confirmShutdown()) {
                            break;
                        }
                    }
                } finally {
                    try {
                        cleanup();
                    } finally {
                  // Lets remove all FastThreadLocals for the Thread as we are about to terminate and notify
                  // the future. The user may block on the future and once it unblocks the JVM may terminate
                        // and start unloading classes.
                        // See https://github.com/netty/netty/issues/6596.
                        FastThreadLocal.removeAll();

                        STATE_UPDATER.set(SingleThreadEventExecutor.this, ST_TERMINATED);
                        threadLock.countDown();
                        if (logger.isWarnEnabled() && !taskQueue.isEmpty()) {
                            logger.warn("An event executor terminated with " +
                                        "non-empty task queue (" + taskQueue.size() + ')');
                        }
                        terminationFuture.setSuccess(null);
                    }
                }
            }
        }
    });
}
~~~

wakeup(inEventLoop);

~~~java
//...io.netty.channel.nio.NioEventLoop...

@Override
protected void wakeup(boolean inEventLoop) {
    if (!inEventLoop && wakenUp.compareAndSet(false, true)) {
        // wakeup the selector
        selector.wakeup();
    }
}
~~~

executor.execute(new Runnable() {

~~~java
//...io.netty.util.internal.ThreadExecutorMap...

//Decorate the given Executor and ensure currentExecutor() will return eventExecutor when called from within the Runnable during execution.
public static Executor apply(final Executor executor, final EventExecutor eventExecutor) {
    ObjectUtil.checkNotNull(executor, "executor");
    ObjectUtil.checkNotNull(eventExecutor, "eventExecutor");
    return new Executor() {
        @Override
        public void execute(final Runnable command) {
            //
            executor.execute(
                //
                apply(command, eventExecutor)
            );
        }
    };
}

public static Runnable apply(final Runnable command, final EventExecutor eventExecutor) {
    ObjectUtil.checkNotNull(command, "command");
    ObjectUtil.checkNotNull(eventExecutor, "eventExecutor");
    return new Runnable() {
        @Override
        public void run() {
            // setCurrentExecutor
            setCurrentEventExecutor(eventExecutor);
            try {
                // run command
                command.run();
            } finally {
                setCurrentEventExecutor(null);
            }
        }
    };
}
~~~

###### ==SingleThreadEventExecutor.this.run();==  

==here  a  dead  loop to  handle  tasks  and  selectKeys  if  any==

~~~java
//...io.netty.channel.nio.NioEventLoop...
protected void run() {
    for (;;) {
        try {
            try {
                //有任务就 select 尝试获取selector 事件
                //无任务 
                switch (selectStrategy.calculateStrategy(selectNowSupplier, hasTasks())) {
                    case SelectStrategy.CONTINUE:
                        continue;

                    case SelectStrategy.BUSY_WAIT:
                        // fall-through to SELECT since the busy-wait is not supported with NIO

                    case SelectStrategy.SELECT:
                        //**  there is no left task in taskqueue
                        //这里开始阻塞   会被channel 时间唤醒 以及强制唤醒
                        select(wakenUp.getAndSet(false));

                        // 'wakenUp.compareAndSet(false, true)' is always evaluated
                        // before calling 'selector.wakeup()' to reduce the wake-up
                        // overhead. (Selector.wakeup() is an expensive operation.)
                        //
                        // However, there is a race condition in this approach.
                        // The race condition is triggered when 'wakenUp' is set to
                        // true too early.
                        //
                        // 'wakenUp' is set to true too early if:
                        // 1) Selector is waken up between 'wakenUp.set(false)' and
                        //    'selector.select(...)'. (BAD)
                        // 2) Selector is waken up between 'selector.select(...)' and
                        //    'if (wakenUp.get()) { ... }'. (OK)
                        //
                        // In the first case, 'wakenUp' is set to true and the
                        // following 'selector.select(...)' will wake up immediately.
                        // Until 'wakenUp' is set to false again in the next round,
                        // 'wakenUp.compareAndSet(false, true)' will fail, and therefore
                        // any attempt to wake up the Selector will fail, too, causing
                        // the following 'selector.select(...)' call to block
                        // unnecessarily.
                        //
                        // To fix this problem, we wake up the selector again if wakenUp
                        // is true immediately after selector.select(...).
                        // It is inefficient in that it wakes up the selector for both
                        // the first case (BAD - wake-up required) and the second case
                        // (OK - no wake-up required).

                        if (wakenUp.get()) {
                            selector.wakeup();
                        }
                        // fall through
                    default:
                }
            } catch (IOException e) {
                // If we receive an IOException here its because the Selector is messed up. Let's 
                //rebuild
                // the selector and retry. https://github.com/netty/netty/issues/8566
                rebuildSelector0();
                handleLoopException(e);
                continue;
            }

            cancelledKeys = 0;
            needsToSelectAgain = false;
            //平衡 io和non-io任务之间花费的时间
            final int ioRatio = this.ioRatio;
            if (ioRatio == 100) {
                try {
                    processSelectedKeys();
                } finally {
                    // Ensure we always run tasks.
                    runAllTasks();
                }
            } else {
                final long ioStartTime = System.nanoTime();
                try {
                    //**
                    processSelectedKeys();
                } finally {
                    // Ensure we always run tasks.
                    final long ioTime = System.nanoTime() - ioStartTime;
                    //**
                    runAllTasks(ioTime * (100 - ioRatio) / ioRatio);
                }
            }
        } catch (Throwable t) {
            handleLoopException(t);
        }
        // Always handle shutdown even if the loop processing threw an exception.
        try {
            if (isShuttingDown()) {
                closeAll();
                if (confirmShutdown()) {
                    return;
                }
            }
        } catch (Throwable t) {
            handleLoopException(t);
        }
    }
}
~~~

###### selectStrategy.calculateStrategy(selectNowSupplier, hasTasks())

~~~java
//...io.netty.channel.DefaultSelectStrategy...
public int calculateStrategy(IntSupplier selectSupplier, boolean hasTasks) throws Exception {
    return hasTasks ? selectSupplier.get() : SelectStrategy.SELECT;
}
~~~



###### runAllTasks(ioTime * (100 - ioRatio) / ioRatio);

~~~java
//...io.netty.util.concurrent.SingleThreadEventExecutor...
protected boolean runAllTasks(long timeoutNanos) {
    //**
    fetchFromScheduledTaskQueue();
    Runnable task = pollTask();
    if (task == null) {
        afterRunningAllTasks();
        return false;
    }

    final long deadline = ScheduledFutureTask.nanoTime() + timeoutNanos;
    long runTasks = 0;
    long lastExecutionTime;
    for (;;) {
        //执行任务
        safeExecute(task);

        runTasks ++;

        // Check timeout every 64 tasks because nanoTime() is relatively expensive.
        // XXX: Hard-coded value - will make it configurable if it is really a problem.
        if ((runTasks & 0x3F) == 0) {
            lastExecutionTime = ScheduledFutureTask.nanoTime();
            if (lastExecutionTime >= deadline) {
                break;
            }
        }
		//上面执行的任务会新添任务
        task = pollTask();
        if (task == null) {  //无任务跳出
            lastExecutionTime = ScheduledFutureTask.nanoTime();
            break;
        }
    }

    afterRunningAllTasks();
    this.lastExecutionTime = lastExecutionTime;
    return true;
}
~~~

fetchFromScheduledTaskQueue();

~~~java
//...io.netty.util.concurrent.SingleThreadEventExecutor...

// poll Task from ScheduledTaskQueue to taskQueue if any exist  
//尝试从ScheduledTaskQueue 获取 任务到 taskQueue
private boolean fetchFromScheduledTaskQueue() {
    if (scheduledTaskQueue == null || scheduledTaskQueue.isEmpty()) {
        return true;
    }
    long nanoTime = AbstractScheduledEventExecutor.nanoTime();
    for (;;) {
        Runnable scheduledTask = pollScheduledTask(nanoTime);
        if (scheduledTask == null) {
            return true;
        }
        if (!taskQueue.offer(scheduledTask)) {
            // No space left in the task queue add it back to the scheduledTaskQueue so we pick it up again.
            scheduledTaskQueue.add((ScheduledFutureTask<?>) scheduledTask);
            return false;
        }
    }
}
~~~

safeExecute(task);

~~~java
//...io.netty.util.concurrent.AbstractEventExecutor...
protected static void safeExecute(Runnable task) {
    try {
        // first task after boostrap is call register0();
        task.run();
    } catch (Throwable t) {
        logger.warn("A task raised an exception. Task: {}", task, t);
    }
}
~~~

###     doRegister();

~~~java
//...io.netty.channel.nio.AbstractNioChannel...
@Override
protected void doRegister() throws Exception {
    boolean selected = false;
    for (;;) {
        try {
            // call java nio api do the actual register operation and return selectionkey 
            //with netty channel attached on
            //and then restore it
            selectionKey = javaChannel().register(eventLoop().unwrappedSelector(), 0, this);
            return;
        } catch (CancelledKeyException e) {
            if (!selected) {
                // Force the Selector to select now as the "canceled" SelectionKey may still be
                // cached and not removed because no Select.select(..) operation was called yet.
                eventLoop().selectNow();
                selected = true;
            } else {
                // We forced a select operation on the selector before but the SelectionKey is still cached
                // for whatever reason. JDK bug ?
                throw e;
            }
        }
    }
}

~~~

pipeline.invokeHandlerAddedIfNeeded();

~~~java
//...io.netty.channel.DefaultChannelPipeline...
final void invokeHandlerAddedIfNeeded() {
    assert channel.eventLoop().inEventLoop();
    // ensure is never registration before this time
    if (firstRegistration) {
        firstRegistration = false;
        // We are now registered to the EventLoop. It's time to call the callbacks for the ChannelHandlers,
        // that were added before the registration was done. 
        //**
        callHandlerAddedForAllHandlers();
    }
}


//callHandlerAddedForAllHandlers
private void callHandlerAddedForAllHandlers() {
    final PendingHandlerCallback pendingHandlerCallbackHead;
    synchronized (this) {
        assert !registered;

        // This Channel itself was registered.
        registered = true;

        // get the task added before when call addLast 
        pendingHandlerCallbackHead = this.pendingHandlerCallbackHead;
        // Null out so it can be GC'ed.
        this.pendingHandlerCallbackHead = null;
    }

    // This must happen outside of the synchronized(...) block as otherwise handlerAdded(...) may be called while
    // holding the lock and so produce a deadlock if handlerAdded(...) will try to add another handler from outside
    // the EventLoop.
    PendingHandlerCallback task = pendingHandlerCallbackHead;
    while (task != null) {
        //**    first task is set default by netty if not configure by user  
        task.execute();
        task = task.next;
    }
}
~~~

###### task.execute()（handler 添加后的任务）

~~~java
//...io.netty.channel.DefaultChannelPipeline.PendingHandlerAddedTask...
private final class PendingHandlerAddedTask extends PendingHandlerCallback {

    PendingHandlerAddedTask(AbstractChannelHandlerContext ctx) {
        super(ctx);
    }

    @Override
    public void run() {
        callHandlerAdded0(ctx);
    }

    @Override
    void execute() {
        EventExecutor executor = ctx.executor();
        if (executor.inEventLoop()) {
            //**
            callHandlerAdded0(ctx);
        } else {
            try {
                executor.execute(this);
            } catch (RejectedExecutionException e) {
                if (logger.isWarnEnabled()) {
                    logger.warn(
                        "Can't invoke handlerAdded() as the EventExecutor {} rejected it, removing handler {}.",
                        executor, ctx.name(), e);
                }
                atomicRemoveFromHandlerList(ctx);
                ctx.setRemoved();
            }
        }
    }
}

//callHandlerAdded0(newCtx);
//callHandlerAdded0(ctx);
// call ctx.callHandlerAdded  and handler the any exception will ocur
private void callHandlerAdded0(final AbstractChannelHandlerContext ctx) {
    try {
        //**
        ctx.callHandlerAdded();
    } catch (Throwable t) {
        boolean removed = false;
        try {
            atomicRemoveFromHandlerList(ctx);
            ctx.callHandlerRemoved();
            removed = true;
        } catch (Throwable t2) {
            if (logger.isWarnEnabled()) {
                logger.warn("Failed to remove a handler: " + ctx.name(), t2);
            }
        }

        if (removed) {
            fireExceptionCaught(new ChannelPipelineException(
                ctx.handler().getClass().getName() +
                ".handlerAdded() has thrown an exception; removed.", t));
        } else {
            fireExceptionCaught(new ChannelPipelineException(
                ctx.handler().getClass().getName() +
                ".handlerAdded() has thrown an exception; also failed to remove.", t));
        }
    }
}

//...io.netty.channel.AbstractChannelHandlerContext...
final void callHandlerAdded() throws Exception {
    // We must call setAddComplete before calling handlerAdded. Otherwise if the handlerAdded method generates
    // any pipeline events ctx.handler() will miss them because the state will not allow it.
    if (setAddComplete()) {
        // get handler binded before andl call its handlerAdded() method
        handler().handlerAdded(this);
    }
}
~~~

###  handler().handlerAdded(this);

```java
//...io.netty.channel.ChannelInitializer...

/**
 * {@inheritDoc} If override this method ensure you call super!
 */
@Override
public void handlerAdded(ChannelHandlerContext ctx) throws Exception {
    if (ctx.channel().isRegistered()) {
        // This should always be true with our current DefaultChannelPipeline implementation.
        // The good thing about calling initChannel(...) in handlerAdded(...) is that there will be no ordering
        // surprises if a ChannelInitializer will add another ChannelInitializer. This is as all handlers
        // will be added in the expected order.
        if (
            //**
            initChannel(ctx)
        ) {

            // We are done with init the Channel, removing the initializer now.
            removeState(ctx);
        }
    }
}

//if (initChannel(ctx)) {
private boolean initChannel(ChannelHandlerContext ctx) throws Exception {
    if (initMap.add(ctx)) { // Guard against re-entrance.
        try {
            initChannel(
                // here channel eventually find in pipeline
                (C) ctx.channel()
            );
        } catch (Throwable cause) {
            // Explicitly call exceptionCaught(...) as we removed the handler before calling initChannel(...).
            // We do so to prevent multiple calls to initChannel(...).
            exceptionCaught(ctx, cause);
        } finally {
            ChannelPipeline pipeline = ctx.pipeline();
            // if find this handler's  ctx then do remove
            if (pipeline.context(this) != null) {
                // here remove the ctx
                pipeline.remove(this);
            }
        }
        return true;
    }
    return false;
}
```

###### doBind0(regFuture, channel, localAddress, promise)

~~~java
//...io.netty.bootstrap.AbstractBootstrap...
private static void doBind0(
    final ChannelFuture regFuture, final Channel channel,
    final SocketAddress localAddress, final ChannelPromise promise) {

    // This method is invoked before channelRegistered() is triggered.  Give user handlers a chance to set up
    // the pipeline in its channelRegistered() implementation.
    channel.eventLoop().execute(new Runnable() {
        @Override
        public void run() {
            if (regFuture.isSuccess()) {
                //**
                channel.bind(localAddress, promise)
                //**
                .addListener(ChannelFutureListener.CLOSE_ON_FAILURE);
            } else {
                promise.setFailure(regFuture.cause());
            }
        }
    });
}

// channel.bind(localAddress, promise)
//...io.netty.channel.AbstractChannel...
@Override
public ChannelFuture bind(SocketAddress localAddress, ChannelPromise promise) {
    //**
    return pipeline.bind(localAddress, promise);
}

//return pipeline.bind(localAddress, promise);
//...io.netty.channel.DefaultChannelPipeline...
@Override
public final ChannelFuture bind(SocketAddress localAddress, ChannelPromise promise) {
    //**
    return tail.bind(localAddress, promise);
}

//return tail.bind(localAddress, promise);
//...io.netty.channel.AbstractChannelHandlerContext...
@Override
public ChannelFuture bind(final SocketAddress localAddress, final ChannelPromise promise) {
    if (localAddress == null) {
        throw new NullPointerException("localAddress");
    }
    if (isNotValidPromise(promise, false)) {
        // cancelled
        return promise;
    }

    final AbstractChannelHandlerContext next = findContextOutbound(MASK_BIND);
    EventExecutor executor = next.executor();
    if (executor.inEventLoop()) {
        //**
        next.invokeBind(localAddress, promise);
    } else {
        safeExecute(executor, new Runnable() {
            @Override
            public void run() {
                //**
                next.invokeBind(localAddress, promise);
            }
        }, promise, null);
    }
    return promise;
}

//next.invokeBind(localAddress, promise);
//...io.netty.channel.AbstractChannelHandlerContext...
private void invokeBind(SocketAddress localAddress, ChannelPromise promise) {
    if (invokeHandler()) {
        try {
            //**
            ((ChannelOutboundHandler) handler()).bind(this, localAddress, promise);
        } catch (Throwable t) {
            notifyOutboundHandlerException(t, promise);
        }
    } else {
        bind(localAddress, promise);
    }
}

//((ChannelOutboundHandler) handler()).bind(this, localAddress, promise);
//...io.netty.channel.AbstractChannelHandlerContext...
@Override
public void bind(
    ChannelHandlerContext ctx, SocketAddress localAddress, ChannelPromise promise) {
    //**
    unsafe.bind(localAddress, promise);
}


//unsafe.bind(localAddress, promise);
//...io.netty.channel.AbstractChannel.AbstractUnsafe...
@Override
public final void bind(final SocketAddress localAddress, final ChannelPromise promise) {
    assertEventLoop();

    if (!promise.setUncancellable() || !ensureOpen(promise)) {
        return;
    }

    // See: https://github.com/netty/netty/issues/576
    if (Boolean.TRUE.equals(config().getOption(ChannelOption.SO_BROADCAST)) &&
        localAddress instanceof InetSocketAddress &&
        !((InetSocketAddress) localAddress).getAddress().isAnyLocalAddress() &&
        !PlatformDependent.isWindows() && !PlatformDependent.maybeSuperUser()) {
        // Warn a user about the fact that a non-root user can't receive a
        // broadcast packet on *nix if the socket is bound on non-wildcard address.
        logger.warn(
            "A non-root user can't receive a broadcast packet if the socket " +
            "is not bound to a wildcard address; binding to a non-wildcard " +
            "address (" + localAddress + ") anyway as requested.");
    }

    boolean wasActive = isActive();
    try {
        // here is actually dobind port to server
        doBind(localAddress);
    } catch (Throwable t) {
        safeSetFailure(promise, t);
        closeIfClosed();
        return;
    }

    if (!wasActive && isActive()) {
        invokeLater(new Runnable() {
            @Override
            public void run() {
                pipeline.fireChannelActive();
            }
        });
    }

    safeSetSuccess(promise);
}
~~~

###### doBind(真正绑定到java channel）

~~~java
protected void doBind(SocketAddress localAddress) throws Exception {
    if (PlatformDependent.javaVersion() >= 7) {
        javaChannel().bind(localAddress, config.getBacklog());
    } else {
        javaChannel().socket().bind(localAddress, config.getBacklog());
    }
}
~~~



select(wakenUp.getAndSet(false));

~~~java
//...io.netty.channel.nio.NioEventLoop...
private void select(boolean oldWakenUp) throws IOException {
    Selector selector = this.selector;
    try {
        int selectCnt = 0;
        long currentTimeNanos = System.nanoTime();
        long selectDeadLineNanos = currentTimeNanos + delayNanos(currentTimeNanos);

        long normalizedDeadlineNanos = selectDeadLineNanos - initialNanoTime();
        if (nextWakeupTime != normalizedDeadlineNanos) {
            nextWakeupTime = normalizedDeadlineNanos;
        }

        for (;;) {
            long timeoutMillis = (selectDeadLineNanos - currentTimeNanos + 500000L) / 1000000L;
            if (timeoutMillis <= 0) {
                if (selectCnt == 0) {
                    selector.selectNow();
                    selectCnt = 1;
                }
                break;
            }

            // If a task was submitted when wakenUp value was true, the task didn't get a chance to call
            // Selector#wakeup. So we need to check task queue again before executing select operation.
            // If we don't, the task might be pended until select operation was timed out.
            // It might be pended until idle timeout if IdleStateHandler existed in pipeline.
            if (hasTasks() && wakenUp.compareAndSet(false, true)) {
                selector.selectNow();
                selectCnt = 1;
                break;
            }

            int selectedKeys = selector.select(timeoutMillis);
            selectCnt ++;

            if (selectedKeys != 0 || oldWakenUp || wakenUp.get() || hasTasks() || hasScheduledTasks()) {
                // - Selected something,
                // - waken up by user, or
                // - the task queue has a pending task.
                // - a scheduled task is ready for processing
                break;
            }
            if (Thread.interrupted()) {
                // Thread was interrupted so reset selected keys and break so we not run into a busy loop.
                // As this is most likely a bug in the handler of the user or it's client library we will
                // also log it.
                //
                // See https://github.com/netty/netty/issues/2426
                if (logger.isDebugEnabled()) {
                    logger.debug("Selector.select() returned prematurely because " +
                                 "Thread.currentThread().interrupt() was called. Use " +
                                 "NioEventLoop.shutdownGracefully() to shutdown the NioEventLoop.");
                }
                selectCnt = 1;
                break;
            }

            long time = System.nanoTime();
            if (time - TimeUnit.MILLISECONDS.toNanos(timeoutMillis) >= currentTimeNanos) {
                // timeoutMillis elapsed without anything selected.
                selectCnt = 1;
            } else if (SELECTOR_AUTO_REBUILD_THRESHOLD > 0 &&
                       selectCnt >= SELECTOR_AUTO_REBUILD_THRESHOLD) {
                // The code exists in an extra method to ensure the method is not too big to inline as this
                // branch is not very likely to get hit very frequently.
                selector = selectRebuildSelector(selectCnt);
                selectCnt = 1;
                break;
            }

            currentTimeNanos = time;
        }

        if (selectCnt > MIN_PREMATURE_SELECTOR_RETURNS) {
            if (logger.isDebugEnabled()) {
                logger.debug("Selector.select() returned prematurely {} times in a row for Selector {}.",
                             selectCnt - 1, selector);
            }
        }
    } catch (CancelledKeyException e) {
        if (logger.isDebugEnabled()) {
            logger.debug(CancelledKeyException.class.getSimpleName() + " raised by a Selector {} - JDK bug?",
                         selector, e);
        }
        // Harmless exception - log anyway
    }
}
~~~

## 工作流程

##### connect调用栈

~~~java
doStartThread:978, SingleThreadEventExecutor (io.netty.util.concurrent)
startThread:947, SingleThreadEventExecutor (io.netty.util.concurrent)
//则开启一个线程
execute:830, SingleThreadEventExecutor (io.netty.util.concurrent)
execute:818, SingleThreadEventExecutor (io.netty.util.concurrent)
register:483, AbstractChannel$AbstractUnsafe (io.netty.channel)
register:87, SingleThreadEventLoop (io.netty.channel)
register:81, SingleThreadEventLoop (io.netty.channel)
register:86, MultithreadEventLoopGroup (io.netty.channel)
//一个channel 注册一次
channelRead:215, ServerBootstrap$ServerBootstrapAcceptor (io.netty.bootstrap)
invokeChannelRead:379, AbstractChannelHandlerContext (io.netty.channel)
invokeChannelRead:365, AbstractChannelHandlerContext (io.netty.channel)
fireChannelRead:357, AbstractChannelHandlerContext (io.netty.channel)
channelRead:1410, DefaultChannelPipeline$HeadContext (io.netty.channel)
invokeChannelRead:379, AbstractChannelHandlerContext (io.netty.channel)
invokeChannelRead:365, AbstractChannelHandlerContext (io.netty.channel)
fireChannelRead:919, DefaultChannelPipeline (io.netty.channel)
read:97, AbstractNioMessageChannel$NioMessageUnsafe (io.netty.channel.nio)
processSelectedKey:719, NioEventLoop (io.netty.channel.nio)
processSelectedKeysOptimized:655, NioEventLoop (io.netty.channel.nio)
processSelectedKeys:581, NioEventLoop (io.netty.channel.nio)
run:493, NioEventLoop (io.netty.channel.nio)
run:989, SingleThreadEventExecutor$4 (io.netty.util.concurrent)
run:74, ThreadExecutorMap$2 (io.netty.util.internal)
run:30, FastThreadLocalRunnable (io.netty.util.concurrent)
run:748, Thread (java.lang)
~~~

###### processSelectedKeys();

~~~java
//...io.netty.channel.nio.NioEventLoop...

private void processSelectedKeys() {
    if (selectedKeys != null) {
        // just a optimized method to below one
        //**
        processSelectedKeysOptimized();
    } else {
        processSelectedKeysPlain(selector.selectedKeys());
    }
}
~~~

###### processSelectedKeysOptimized();

~~~java
private void processSelectedKeysOptimized() {
    for (int i = 0; i < selectedKeys.size; ++i) {
        final SelectionKey k = selectedKeys.keys[i];
        // null out entry in the array to allow to have it GC'ed once the Channel close
        // See https://github.com/netty/netty/issues/2363
        selectedKeys.keys[i] = null;

        final Object a = k.attachment();

        if (a instanceof AbstractNioChannel) {
            //**
            processSelectedKey(k, (AbstractNioChannel) a);
        } else {
            @SuppressWarnings("unchecked")
            NioTask<SelectableChannel> task = (NioTask<SelectableChannel>) a;
            //**
            processSelectedKey(k, task);
        }

        if (needsToSelectAgain) {
            // null out entries in the array to allow to have it GC'ed once the Channel close
            // See https://github.com/netty/netty/issues/2363
            selectedKeys.reset(i + 1);

            selectAgain();
            i = -1;
        }
    }
}
~~~

###### processSelectedKey(k, (AbstractNioChannel) a);

~~~java
private void processSelectedKey(SelectionKey k, AbstractNioChannel ch) {
    final AbstractNioChannel.NioUnsafe unsafe = ch.unsafe();
    // check if the selectKey is valid
    if (!k.isValid()) {
        final EventLoop eventLoop;
        try {
            eventLoop = ch.eventLoop();
        } catch (Throwable ignored) {
            // If the channel implementation throws an exception because there is no event loop, we ignore this
            // because we are only trying to determine if ch is registered to this event loop and thus has authority
            // to close ch.
            return;
        }
        // Only close ch if ch is still registered to this EventLoop. ch could have deregistered from the event loop
        // and thus the SelectionKey could be cancelled as part of the deregistration process, but the channel is
        // still healthy and should not be closed.
        // See https://github.com/netty/netty/issues/5125
        if (eventLoop != this || eventLoop == null) {
            return;
        }
        // close the channel if the key is not valid anymore
        unsafe.close(unsafe.voidPromise());
        return;
    }
	
    // check passed  do the job
    try {
        int readyOps = k.readyOps();
        // We first need to call finishConnect() before try to trigger a read(...) or write(...) as otherwise
        // the NIO JDK channel implementation may throw a NotYetConnectedException.
        if ((readyOps & SelectionKey.OP_CONNECT) != 0) {
            // remove OP_CONNECT as otherwise Selector.select(..) will always return without blocking
            // See https://github.com/netty/netty/issues/924
            int ops = k.interestOps();
            ops &= ~SelectionKey.OP_CONNECT;
            k.interestOps(ops);

            unsafe.finishConnect();
        }

        // Process OP_WRITE first as we may be able to write some queued buffers and so free memory.
        if ((readyOps & SelectionKey.OP_WRITE) != 0) {
            // Call forceFlush which will also take care of clear the OP_WRITE once there is nothing left to write
            ch.unsafe().forceFlush();
        }

        // Also check for readOps of 0 to workaround possible JDK bug which may otherwise lead
        // to a spin loop
        if ((readyOps & (SelectionKey.OP_READ | SelectionKey.OP_ACCEPT)) != 0 || readyOps == 0) {
            //** 读
            unsafe.read();
        }
    } catch (CancelledKeyException ignored) {
        unsafe.close(unsafe.voidPromise());
    }
}
~~~

###### unsafe.read();

~~~java
@Override
public void read() {
    assert eventLoop().inEventLoop();
    final ChannelConfig config = config();
    final ChannelPipeline pipeline = pipeline();
    final RecvByteBufAllocator.Handle allocHandle = unsafe().recvBufAllocHandle();
    allocHandle.reset(config);

    boolean closed = false;
    Throwable exception = null;
    try {
        try {
            do {
                //**    readBuf  this buf use to store socket channel between server and client 
                //  实现类为io.netty.channel.socket.nio.NioServerSocketChannel 时 	
                //  会将客户端的channel连接伪装成 一个 message 交给 pipline 去读取 
                //  pipline中有专们的handler去处理这种消息
                int localRead = doReadMessages(readBuf);
                if (localRead == 0) {
                    break;
                }
                if (localRead < 0) {
                    closed = true;
                    break;
                }

                allocHandle.incMessagesRead(localRead);
            } while (allocHandle.continueReading());
        } catch (Throwable t) {
            exception = t;
        }

        int size = readBuf.size();
        for (int i = 0; i < size; i ++) {
            readPending = false;
            //**   here read channel 
            pipeline.fireChannelRead(readBuf.get(i));
        }
        readBuf.clear();
        allocHandle.readComplete();
        pipeline.fireChannelReadComplete();

        if (exception != null) {
            closed = closeOnReadError(exception);

            pipeline.fireExceptionCaught(exception);
        }

        if (closed) {
            inputShutdown = true;
            if (isOpen()) {
                close(voidPromise());
            }
        }
    } finally {
        // Check if there is a readPending which was not processed yet.
        // This could be for two reasons:
        // * The user called Channel.read() or ChannelHandlerContext.read() in channelRead(...) method
        // * The user called Channel.read() or ChannelHandlerContext.read() in channelReadComplete(...) 	
        //method
        //
        // See https://github.com/netty/netty/issues/2254
        if (!readPending && !config.isAutoRead()) {
            removeReadOp();
        }
    }
}
}
~~~

###### int localRead = doReadMessages(readBuf);

~~~java
//...io.netty.channel.socket.nio.NioServerSocketChannel...
@Override
protected int doReadMessages(List<Object> buf) throws Exception {
    // here build socketChannel between client and server by java Api
    SocketChannel ch = SocketUtils.accept(javaChannel());

    try {
        if (ch != null) {
            // register key to ch  n NioSocketChannel constructor
            //**   if accept method create a channel  return 1   
            buf.add(new NioSocketChannel(this, ch));
            return 1;
        }
    } catch (Throwable t) {
        logger.warn("Failed to create a new channel from an accepted socket.", t);

        try {
            ch.close();
        } catch (Throwable t2) {
            logger.warn("Failed to close a socket.", t2);
        }
    }

    return 0;
}
~~~

new NioSocketChannel(this, ch)

~~~java
//...io.netty.channel.socket.nio.NioSocketChannel...
public NioSocketChannel(Channel parent, SocketChannel socket) {
    super(parent, socket);
    config = new NioSocketChannelConfig(this, socket.socket());
}

//...io.netty.channel.nio.AbstractNioByteChannel...
protected AbstractNioByteChannel(Channel parent, SelectableChannel ch) {
    super(parent, ch, SelectionKey.OP_READ);
}

//...io.netty.channel.nio.AbstractNioChannel...
protected AbstractNioChannel(Channel parent, SelectableChannel ch, int readInterestOp) {
    super(parent);
    this.ch = ch;
    this.readInterestOp = readInterestOp;
    try {
        ch.configureBlocking(false);
    } catch (IOException e) {
        try {
            ch.close();
        } catch (IOException e2) {
            logger.warn(
                "Failed to close a partially initialized socket.", e2);
        }

        throw new ChannelException("Failed to enter non-blocking mode.", e);
    }
}

//...io.netty.channel.AbstractChannel...
protected AbstractChannel(Channel parent) {
    this.parent = parent;
    id = newId();
    unsafe = newUnsafe();
    pipeline = newChannelPipeline();
}
~~~

######  pipeline.fireChannelRead(readBuf.get(i));

~~~java
//...io.netty.channel.DefaultChannelPipeline...
@Override
public final ChannelPipeline fireChannelRead(Object msg) {
    //**
   	//pipline的fire 转 head handlerContext的Invoke
    AbstractChannelHandlerContext.invokeChannelRead(head, msg);
    return this;
}
~~~

######  AbstractChannelHandlerContext.invokeChannelRead(head, msg);

```java
static void invokeChannelRead(final AbstractChannelHandlerContext next, Object msg) {
    //
    final Object m = next.pipeline.touch(ObjectUtil.checkNotNull(msg, "msg"), next);
    EventExecutor executor = next.executor();
    if (executor.inEventLoop()) {
        //**
        next.invokeChannelRead(m);
    } else {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                next.invokeChannelRead(m);
            }
        });
    }
}
```

 next.invokeChannelRead(m); （找到handler）

~~~java
//...io.netty.channel.AbstractChannelHandlerContext...
private void invokeChannelRead(Object msg) {
    if (invokeHandler()) {
        try {
            //**notice here  head ctx handler() return itself
            ((ChannelInboundHandler) handler()).channelRead(this, msg);
        } catch (Throwable t) {
            notifyHandlerException(t);
        }
    } else {
        fireChannelRead(msg);
    }
}
~~~

######  ((ChannelInboundHandler) handler()).channelRead(this, msg);

```java
//...io.netty.channel.DefaultChannelPipeline...
@Override
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    //**
    
    //handler 继续往下传
    ctx.fireChannelRead(msg);
}
```

###### ctx.fireChannelRead(msg);

```java
//...io.netty.channel.AbstractChannelHandlerContext...
@Override
public ChannelHandlerContext fireChannelRead(final Object msg) {
    //**
    
    //继续往下传   invoke 下一个合适的channel
    invokeChannelRead(findContextInbound(MASK_CHANNEL_READ), msg);
    return this;
}

//find a ctx match the mask
private AbstractChannelHandlerContext findContextInbound(int mask) {
    AbstractChannelHandlerContext ctx = this;
    do {
        ctx = ctx.next;
    } while ((ctx.executionMask & mask) == 0);
    return ctx;
}
```

###### invokeChannelRead(findContextInbound(MASK_CHANNEL_READ), msg);

```java
//...io.netty.channel.AbstractChannelHandlerContext...
static void invokeChannelRead(final AbstractChannelHandlerContext next, Object msg) {
    final Object m = next.pipeline.touch(ObjectUtil.checkNotNull(msg, "msg"), next);
    EventExecutor executor = next.executor();
    if (executor.inEventLoop()) {
        next.invokeChannelRead(m);
    } else {
        executor.execute(new Runnable() {
            @Override
            public void run() {
                next.invokeChannelRead(m);
            }
        });
    }
}
```

######  ((ChannelInboundHandler) handler()).channelRead(this, msg)注册 client channel

```java
//...io.netty.bootstrap.ServerBootstrap...  
@Override
@SuppressWarnings("unchecked")
public void channelRead(ChannelHandlerContext ctx, Object msg) {
    final Channel child = (Channel) msg;

    child.pipeline().addLast(childHandler);

    setChannelOptions(child, childOptions, logger);
    setAttributes(child, childAttrs);

    try {
        //**  do register
        childGroup.register(child).addListener(new ChannelFutureListener() {
            @Override
            public void operationComplete(ChannelFuture future) throws Exception {
                if (!future.isSuccess()) {
                    forceClose(child, future.cause());
                }
            }
        });
    } catch (Throwable t) {
        forceClose(child, t);
    }
}
```



##### 阿松大

###### pipeline.fireChannelActive();

~~~java
//...io.netty.channel.DefaultChannelPipeline...

//same as read  find  handler by mask in pipeline then call oppsition method 
@Override
public final ChannelPipeline fireChannelActive() {
    AbstractChannelHandlerContext.invokeChannelActive(head);
    return this;
}

.......

//...io.netty.channel.DefaultChannelPipeline...
@Override
public void channelActive(ChannelHandlerContext ctx) {
    ctx.fireChannelActive();
	
    //**
    readIfIsAutoRead();
}

//readIfIsAutoRead();
private void readIfIsAutoRead() {
    if (channel.config().isAutoRead()) {
        channel.read();
    }
}

//readIfIsAutoRead();
//...io.netty.channel.AbstractChannel...
@Override
public Channel read() {
    //**
    pipeline.read();
    return this;
}

//pipeline.read();
//...io.netty.channel.DefaultChannelPipeline...
@Override
public final ChannelPipeline read() {
    //**
    tail.read();
    return this;
}

// tail.read();
//...io.netty.channel.AbstractChannelHandlerContext...
@Override
public ChannelHandlerContext read() {
    //here will return the headctx  read from beginning
    final AbstractChannelHandlerContext next = findContextOutbound(MASK_READ);
    EventExecutor executor = next.executor();
    if (executor.inEventLoop()) {
        next.invokeRead();
    } else {
        Tasks tasks = next.invokeTasks;
        if (tasks == null) {
            next.invokeTasks = tasks = new Tasks(next);
        }
        executor.execute(tasks.invokeReadTask);
    }

    return this;
}
~~~

