##### 前言

本文完整的包含了spring事务传播机制的源码流程   



只想看用例和结果可以看这个

[Spring事务传播行为详解（有场景） - 明叶师兄。 - 博客园 (cnblogs.com)](https://www.cnblogs.com/renxiuxing/p/15395798.html)



spring事务传播行为分为七个等级

| 事务传播行为类型             | 说明                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| PROPAGATION_REQUIRED（默认） | 如果当前没有事务，就新建一个事务，如果已经存在一个事务中，加入到这个事务中。这是最常见的选择。 |
| PROPAGATION_SUPPORTS         | 支持当前事务，如果当前没有事务，就以非事务方式执行。         |
| PROPAGATION_MANDATORY        | 使用当前的事务，如果当前没有事务，就抛出异常。               |
| PROPAGATION_REQUIRES_NEW     | 新建事务，如果当前存在事务，把当前事务挂起。                 |
| PROPAGATION_NOT_SUPPORTED    | 以非事务方式执行操作，如果当前存在事务，就把当前事务挂起。   |
| PROPAGATION_NEVER            | 以非事务方式执行，如果当前存在事务，则抛出异常。             |
| PROPAGATION_NESTED           | 如果当前存在事务，则在嵌套事务内执行。如果当前没有事务，则执行与PROPAGATION_REQUIRED类似的操作。 |

###### invokeWithinTransaction

```java
/**
 * General delegate for around-advice-based subclasses, delegating to several other template
 * methods on this class. Able to handle {@link CallbackPreferringPlatformTransactionManager}
 * as well as regular {@link PlatformTransactionManager} implementations and
 * {@link ReactiveTransactionManager} implementations for reactive return types.
 * @param method the Method being invoked
 * @param targetClass the target class that we're invoking the method on
 * @param invocation the callback to use for proceeding with the target invocation
 * @return the return value of the method, if any
 * @throws Throwable propagated from the target invocation
 */
@Nullable
protected Object invokeWithinTransaction(Method method, @Nullable Class<?> targetClass,
      final InvocationCallback invocation) throws Throwable {

   // If the transaction attribute is null, the method is non-transactional.
   TransactionAttributeSource tas = getTransactionAttributeSource();
   final TransactionAttribute txAttr = (tas != null ? tas.getTransactionAttribute(method, targetClass) : null);
   final TransactionManager tm = determineTransactionManager(txAttr);

   if (this.reactiveAdapterRegistry != null && tm instanceof ReactiveTransactionManager) {
      boolean isSuspendingFunction = KotlinDetector.isSuspendingFunction(method);
      boolean hasSuspendingFlowReturnType = isSuspendingFunction &&
            COROUTINES_FLOW_CLASS_NAME.equals(new MethodParameter(method, -1).getParameterType().getName());
      if (isSuspendingFunction && !(invocation instanceof CoroutinesInvocationCallback)) {
         throw new IllegalStateException("Coroutines invocation not supported: " + method);
      }
      CoroutinesInvocationCallback corInv = (isSuspendingFunction ? (CoroutinesInvocationCallback) invocation : null);

      ReactiveTransactionSupport txSupport = this.transactionSupportCache.computeIfAbsent(method, key -> {
         Class<?> reactiveType =
               (isSuspendingFunction ? (hasSuspendingFlowReturnType ? Flux.class : Mono.class) : method.getReturnType());
         ReactiveAdapter adapter = this.reactiveAdapterRegistry.getAdapter(reactiveType);
         if (adapter == null) {
            throw new IllegalStateException("Cannot apply reactive transaction to non-reactive return type: " +
                  method.getReturnType());
         }
         return new ReactiveTransactionSupport(adapter);
      });

      InvocationCallback callback = invocation;
      if (corInv != null) {
         callback = () -> CoroutinesUtils.invokeSuspendingFunction(method, corInv.getTarget(), corInv.getArguments());
      }
      Object result = txSupport.invokeWithinTransaction(method, targetClass, callback, txAttr, (ReactiveTransactionManager) tm);
      if (corInv != null) {
         Publisher<?> pr = (Publisher<?>) result;
         return (hasSuspendingFlowReturnType ? KotlinDelegate.asFlow(pr) :
               KotlinDelegate.awaitSingleOrNull(pr, corInv.getContinuation()));
      }
      return result;
   }

   PlatformTransactionManager ptm = asPlatformTransactionManager(tm);
   final String joinpointIdentification = methodIdentification(method, targetClass, txAttr);

   if (txAttr == null || !(ptm instanceof CallbackPreferringPlatformTransactionManager)) {
      //Standard transaction demarcation with getTransaction and commit/rollback calls.
      //这里是决定是否开启事务
      TransactionInfo txInfo = createTransactionIfNecessary(ptm, txAttr, joinpointIdentification);
      //如果事务有继承 则生成一个链表的结构

      Object retVal;
      try {
         // This is an around advice: Invoke the next interceptor in the chain.
         // This will normally result in a target object being invoked.
         retVal = invocation.proceedWithInvocation();
      }
      catch (Throwable ex) {
         // target invocation exception
         completeTransactionAfterThrowing(txInfo, ex);
         //throw 出去
         throw ex;
      }
      finally {
         //该事务处理完毕
         //这里将当前事务的状态恢复为上一个
         cleanupTransactionInfo(txInfo);
      }

      if (retVal != null && vavrPresent && VavrDelegate.isVavrTry(retVal)) {
         // Set rollback-only in case of Vavr failure matching our rollback rules...
         TransactionStatus status = txInfo.getTransactionStatus();
         if (status != null && txAttr != null) {
            retVal = VavrDelegate.evaluateTryFailure(retVal, txAttr, status);
         }
      }
	  //这里进行commit
      commitTransactionAfterReturning(txInfo);
      return retVal;
   }
   //这里是提供callback的
   else {
      Object result;
      final ThrowableHolder throwableHolder = new ThrowableHolder();

      // It's a CallbackPreferringPlatformTransactionManager: pass a TransactionCallback in.
      try {
         result = ((CallbackPreferringPlatformTransactionManager) ptm).execute(txAttr, status -> {
            TransactionInfo txInfo = prepareTransactionInfo(ptm, txAttr, joinpointIdentification, status);
            try {
               Object retVal = invocation.proceedWithInvocation();
               if (retVal != null && vavrPresent && VavrDelegate.isVavrTry(retVal)) {
                  // Set rollback-only in case of Vavr failure matching our rollback rules...
                  retVal = VavrDelegate.evaluateTryFailure(retVal, txAttr, status);
               }
               return retVal;
            }
            catch (Throwable ex) {
               if (txAttr.rollbackOn(ex)) {
                  // A RuntimeException: will lead to a rollback.
                  if (ex instanceof RuntimeException) {
                     throw (RuntimeException) ex;
                  }
                  else {
                     throw new ThrowableHolderException(ex);
                  }
               }
               else {
                  // A normal return value: will lead to a commit.
                  throwableHolder.throwable = ex;
                  return null;
               }
            }
            finally {
               cleanupTransactionInfo(txInfo);
            }
         });
      }
      catch (ThrowableHolderException ex) {
         throw ex.getCause();
      }
      catch (TransactionSystemException ex2) {
         if (throwableHolder.throwable != null) {
            logger.error("Application exception overridden by commit exception", throwableHolder.throwable);
            ex2.initApplicationException(throwableHolder.throwable);
         }
         throw ex2;
      }
      catch (Throwable ex2) {
         if (throwableHolder.throwable != null) {
            logger.error("Application exception overridden by commit exception", throwableHolder.throwable);
         }
         throw ex2;
      }

      // Check result state: It might indicate a Throwable to rethrow.
      if (throwableHolder.throwable != null) {
         throw throwableHolder.throwable;
      }
      return result;
   }
}
```

#### 事务入口

###### getTransaction

~~~java
//...org.springframework.transaction.support.AbstractPlatformTransactionManager...
/**
	 * This implementation handles propagation behavior. Delegates to
	 * {@code doGetTransaction}, {@code isExistingTransaction}
	 * and {@code doBegin}.
	 * @see #doGetTransaction
	 * @see #isExistingTransaction
	 * @see #doBegin
	 */
	@Override
	public final TransactionStatus getTransaction(@Nullable TransactionDefinition definition)
			throws TransactionException {

		// Use defaults if no transaction definition given.
		TransactionDefinition def = (definition != null ? definition : TransactionDefinition.withDefaults());

		Object transaction = doGetTransaction();
		boolean debugEnabled = logger.isDebugEnabled();

        
        //处理已经开启过一个事务后的事务逻辑
		if (isExistingTransaction(transaction)) {
			// Existing transaction found -> check propagation behavior to find out how to behave.
			return handleExistingTransaction(def, transaction, debugEnabled);
		}

		// Check definition settings for new transaction.
		if (def.getTimeout() < TransactionDefinition.TIMEOUT_DEFAULT) {
			throw new InvalidTimeoutException("Invalid transaction timeout", def.getTimeout());
		}

        
        //PROPAGATION_MANDATORY  该等级下如果没有开启过事务则直接报错
		// No existing transaction found -> check propagation behavior to find out how to proceed.
		if (def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_MANDATORY) {
			throw new IllegalTransactionStateException(
					"No existing transaction found for transaction marked with propagation 'mandatory'");
		}

        //下面三种直接生成新的事务
        //org.springframework.jdbc.datasource.ConnectionHolder@434fda9c
		else if (def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRED ||
				def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW ||
				def.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NESTED) {
			SuspendedResourcesHolder suspendedResources = suspend(null);
			if (debugEnabled) {
				logger.debug("Creating new transaction with name [" + def.getName() + "]: " + def);
			}
			try {
				return startTransaction(def, transaction, debugEnabled, suspendedResources);
			}
			catch (RuntimeException | Error ex) {
				resume(null, suspendedResources);
				throw ex;
			}
		}
		else {
            //只做同步
			// Create "empty" transaction: no actual transaction, but potentially synchronization.
			if (def.getIsolationLevel() != TransactionDefinition.ISOLATION_DEFAULT && logger.isWarnEnabled()) {
				logger.warn("Custom isolation level specified but no actual transaction initiated; " +
						"isolation level will effectively be ignored: " + def);
			}
			boolean newSynchronization = (getTransactionSynchronization() == SYNCHRONIZATION_ALWAYS);
			return prepareTransactionStatus(def, null, true, newSynchronization, debugEnabled, null);
		}
	}
~~~

#### 已存在事务的情况

##### handleExistingTransaction

~~~java
//...org.springframework.transaction.support.AbstractPlatformTransactionManager...	
/**
	 * Create a TransactionStatus for an existing transaction.
	 */
	private TransactionStatus handleExistingTransaction(
			TransactionDefinition definition, Object transaction, boolean debugEnabled)
			throws TransactionException {
		
        //PROPAGATION_NEVER 抛出异常
		if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NEVER) {
			throw new IllegalTransactionStateException(
					"Existing transaction found for transaction marked with propagation 'never'");
		}

        //挂起已有的事务并不生成新的事务
		if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NOT_SUPPORTED) {
			if (debugEnabled) {
				logger.debug("Suspending current transaction");
			}
			Object suspendedResources = suspend(transaction);
			boolean newSynchronization = (getTransactionSynchronization() == SYNCHRONIZATION_ALWAYS);
			return prepareTransactionStatus(
					definition, null, false, newSynchronization, debugEnabled, suspendedResources);
		}
		//挂起已有的事务，生成新事物
		if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_REQUIRES_NEW) {
			if (debugEnabled) {
				logger.debug("Suspending current transaction, creating new transaction with name [" +
						definition.getName() + "]");
			}
			SuspendedResourcesHolder suspendedResources = suspend(transaction);
			try {
				return startTransaction(definition, transaction, debugEnabled, suspendedResources);
			}
			catch (RuntimeException | Error beginEx) {
				resumeAfterBeginException(transaction, suspendedResources, beginEx);
				throw beginEx;
			}
		}

        //继承事务
		if (definition.getPropagationBehavior() == TransactionDefinition.PROPAGATION_NESTED) {
			if (!isNestedTransactionAllowed()) {
				throw new NestedTransactionNotSupportedException(
						"Transaction manager does not allow nested transactions by default - " +
						"specify 'nestedTransactionAllowed' property with value 'true'");
			}
			if (debugEnabled) {
				logger.debug("Creating nested transaction with name [" + definition.getName() + "]");
			}
			if (useSavepointForNestedTransaction()) {
				// Create savepoint within existing Spring-managed transaction,
				// through the SavepointManager API implemented by TransactionStatus.
				// Usually uses JDBC 3.0 savepoints. Never activates Spring synchronization.
				DefaultTransactionStatus status =
						prepareTransactionStatus(definition, transaction, false, false, debugEnabled, null);
                //savepoint
				status.createAndHoldSavepoint();
				return status;
			}
			else {
				// Nested transaction through nested begin and commit/rollback calls.
				// Usually only for JTA: Spring synchronization might get activated here
				// in case of a pre-existing JTA transaction.
				return startTransaction(definition, transaction, debugEnabled, null);
			}
		}

		// Assumably PROPAGATION_SUPPORTS or PROPAGATION_REQUIRED.
        //继承事务但是回滚和提交逻辑和nest不同
		if (debugEnabled) {
			logger.debug("Participating in existing transaction");
		}
		if (isValidateExistingTransaction()) {
			if (definition.getIsolationLevel() != TransactionDefinition.ISOLATION_DEFAULT) {
				Integer currentIsolationLevel = TransactionSynchronizationManager.getCurrentTransactionIsolationLevel();
				if (currentIsolationLevel == null || currentIsolationLevel != definition.getIsolationLevel()) {
					Constants isoConstants = DefaultTransactionDefinition.constants;
					throw new IllegalTransactionStateException("Participating transaction with definition [" +
							definition + "] specifies isolation level which is incompatible with existing transaction: " +
							(currentIsolationLevel != null ?
									isoConstants.toCode(currentIsolationLevel, DefaultTransactionDefinition.PREFIX_ISOLATION) :
									"(unknown)"));
				}
			}
			if (!definition.isReadOnly()) {
				if (TransactionSynchronizationManager.isCurrentTransactionReadOnly()) {
					throw new IllegalTransactionStateException("Participating transaction with definition [" +
							definition + "] is not marked as read-only but existing transaction is");
				}
			}
		}
		boolean newSynchronization = (getTransactionSynchronization() != SYNCHRONIZATION_NEVER);
        
        //这个fasle 确保了不会产生新的事务
		return prepareTransactionStatus(definition, transaction, false, newSynchronization, debugEnabled, null);
	}
~~~

##### 继承事务

PROPAGATION_SUPPORTS 

 PROPAGATION_REQUIRED

##### 生成新的事务时

PROPAGATION_REQUIRES_NEW

###### suspend

~~~java
	/**
	 * Suspend the given transaction. Suspends transaction synchronization first,
	 * then delegates to the {@code doSuspend} template method.
	 * @param transaction the current transaction object
	 * (or {@code null} to just suspend active synchronizations, if any)
	 * @return an object that holds suspended resources
	 * (or {@code null} if neither transaction nor synchronization active)
	 * @see #doSuspend
	 * @see #resume
	 */
	@Nullable
	protected final SuspendedResourcesHolder suspend(@Nullable Object transaction) throws TransactionException {
		if (TransactionSynchronizationManager.isSynchronizationActive()) {
            //对应关系  sqlsessionFactory 对上 sqlsession
			List<TransactionSynchronization> suspendedSynchronizations = doSuspendSynchronization();
			try {
				Object suspendedResources = null;
				if (transaction != null) {
                    //  datasouce 对上 具体的 connector
					suspendedResources = doSuspend(transaction);
				}
				String name = TransactionSynchronizationManager.getCurrentTransactionName();
				TransactionSynchronizationManager.setCurrentTransactionName(null);
				boolean readOnly = TransactionSynchronizationManager.isCurrentTransactionReadOnly();
				TransactionSynchronizationManager.setCurrentTransactionReadOnly(false);
				Integer isolationLevel = TransactionSynchronizationManager.getCurrentTransactionIsolationLevel();
				TransactionSynchronizationManager.setCurrentTransactionIsolationLevel(null);
				boolean wasActive = TransactionSynchronizationManager.isActualTransactionActive();
				TransactionSynchronizationManager.setActualTransactionActive(false);
				return new SuspendedResourcesHolder(
						suspendedResources, suspendedSynchronizations, name, readOnly, isolationLevel, wasActive);
			}
			catch (RuntimeException | Error ex) {
				// doSuspend failed - original transaction is still active...
				doResumeSynchronization(suspendedSynchronizations);
				throw ex;
			}
		}
		else if (transaction != null) {
			// Transaction active but no synchronization active.
			Object suspendedResources = doSuspend(transaction);
			return new SuspendedResourcesHolder(suspendedResources);
		}
		else {
			// Neither transaction nor synchronization active.
			return null;
		}
	}
~~~



#### 没有开启事务的情况

###### 调用栈

~~~jAVA
//这里设置sqlsession
bindResource:178, TransactionSynchronizationManager (org.springframework.transaction.support)
registerSessionHolder:138, SqlSessionUtils (org.mybatis.spring)
getSqlSession:107, SqlSessionUtils (org.mybatis.spring)
invoke:423, SqlSessionTemplate$SqlSessionInterceptor (org.mybatis.spring)
insert:-1, $Proxy75 (com.sun.proxy)
insert:271, SqlSessionTemplate (org.mybatis.spring)
execute:62, MapperMethod (org.apache.ibatis.binding)
invoke:152, MapperProxy$PlainMethodInvoker (org.apache.ibatis.binding)
invoke:85, MapperProxy (org.apache.ibatis.binding)
insertUser:-1, $Proxy80 (com.sun.proxy)
test1:78, SysUserServiceImp (com.tcoder.trail.combination.system.service.imps)
invoke:-1, SysUserServiceImp$$FastClassBySpringCGLIB$$bac92f89 (com.tcoder.trail.combination.system.service.imps)
invoke:218, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:779, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:123, TransactionInterceptor$1 (org.springframework.transaction.interceptor)
//这之前连接已经设置了数据库连接
invokeWithinTransaction:388, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:119, TransactionInterceptor (org.springframework.transaction.interceptor)
~~~



###### startTransaction

~~~java
	/**
	 * Start a new transaction.
	 */
	private TransactionStatus startTransaction(TransactionDefinition definition, Object transaction,
			boolean debugEnabled, @Nullable SuspendedResourcesHolder suspendedResources) {

		boolean newSynchronization = (getTransactionSynchronization() != SYNCHRONIZATION_NEVER);
		DefaultTransactionStatus status = newTransactionStatus(
				definition, transaction, true, newSynchronization, debugEnabled, suspendedResources);
		doBegin(transaction, definition);
		prepareSynchronization(status, definition);
		return status;
	}
~~~

###### doBegin

~~~java
	@Override
	protected void doBegin(Object transaction, TransactionDefinition definition) {
		DataSourceTransactionObject txObject = (DataSourceTransactionObject) transaction;
		Connection con = null;

		try {
			if (!txObject.hasConnectionHolder() ||
					txObject.getConnectionHolder().isSynchronizedWithTransaction()) {
				Connection newCon = obtainDataSource().getConnection();
				if (logger.isDebugEnabled()) {
					logger.debug("Acquired Connection [" + newCon + "] for JDBC transaction");
				}
				txObject.setConnectionHolder(new ConnectionHolder(newCon), true);
			}

			txObject.getConnectionHolder().setSynchronizedWithTransaction(true);
			con = txObject.getConnectionHolder().getConnection();

			Integer previousIsolationLevel = DataSourceUtils.prepareConnectionForTransaction(con, definition);
			txObject.setPreviousIsolationLevel(previousIsolationLevel);
			txObject.setReadOnly(definition.isReadOnly());

			// Switch to manual commit if necessary. This is very expensive in some JDBC drivers,
			// so we don't want to do it unnecessarily (for example if we've explicitly
			// configured the connection pool to set it already).
			if (con.getAutoCommit()) {
				txObject.setMustRestoreAutoCommit(true);
				if (logger.isDebugEnabled()) {
					logger.debug("Switching JDBC Connection [" + con + "] to manual commit");
				}
				con.setAutoCommit(false);
			}

			prepareTransactionalConnection(con, definition);
			txObject.getConnectionHolder().setTransactionActive(true);

			int timeout = determineTimeout(definition);
			if (timeout != TransactionDefinition.TIMEOUT_DEFAULT) {
				txObject.getConnectionHolder().setTimeoutInSeconds(timeout);
			}

			// Bind the connection holder to the thread.
            //这里绑定数据库连接
			if (txObject.isNewConnectionHolder()) {
				TransactionSynchronizationManager.bindResource(obtainDataSource(), txObject.getConnectionHolder());
			}
		}

		catch (Throwable ex) {
			if (txObject.isNewConnectionHolder()) {
				DataSourceUtils.releaseConnection(con, obtainDataSource());
				txObject.setConnectionHolder(null, false);
			}
			throw new CannotCreateTransactionException("Could not open JDBC Connection for transaction", ex);
		}
	}
~~~



###### newTransactionStatus

~~~java
	/**
	 * Create a TransactionStatus instance for the given arguments.
	 */
	protected DefaultTransactionStatus newTransactionStatus(
			TransactionDefinition definition, @Nullable Object transaction, boolean newTransaction,
			boolean newSynchronization, boolean debug, @Nullable Object suspendedResources) {

		boolean actualNewSynchronization = newSynchronization &&
				!TransactionSynchronizationManager.isSynchronizationActive();
   	
    	//只有当没有同步的时候才会产生新的同步
		return new DefaultTransactionStatus(
				transaction, newTransaction, actualNewSynchronization,
				definition.isReadOnly(), debug, suspendedResources);
	}
~~~

###### prepareSynchronization

~~~java
	/**
	 * Initialize transaction synchronization as appropriate.
	 */
	protected void prepareSynchronization(DefaultTransactionStatus status, TransactionDefinition definition) 	{
		if (status.isNewSynchronization()) {
			TransactionSynchronizationManager.setActualTransactionActive(status.hasTransaction());
			TransactionSynchronizationManager.setCurrentTransactionIsolationLevel(
					definition.getIsolationLevel() != TransactionDefinition.ISOLATION_DEFAULT ?
							definition.getIsolationLevel() : null);
			TransactionSynchronizationManager.setCurrentTransactionReadOnly(definition.isReadOnly());
			TransactionSynchronizationManager.setCurrentTransactionName(definition.getName());
			TransactionSynchronizationManager.initSynchronization();
		}
	}
~~~

###### sqlsession （mybatis）

sqlsession的设置在  数据库连接之后进行

~~~java
  /**
   * Gets an SqlSession from Spring Transaction Manager or creates a new one if needed. Tries to get a SqlSession out of
   * current transaction. If there is not any, it creates a new one. Then, it synchronizes the SqlSession with the
   * transaction if Spring TX is active and <code>SpringManagedTransactionFactory</code> is configured as a transaction
   * manager.
   *
   * @param sessionFactory
   *          a MyBatis {@code SqlSessionFactory} to create new sessions
   * @param executorType
   *          The executor type of the SqlSession to create
   * @param exceptionTranslator
   *          Optional. Translates SqlSession.commit() exceptions to Spring exceptions.
   * @return an SqlSession managed by Spring Transaction Manager
   * @throws TransientDataAccessResourceException
   *           if a transaction is active and the {@code SqlSessionFactory} is not using a
   *           {@code SpringManagedTransactionFactory}
   * @see SpringManagedTransactionFactory
   */
  public static SqlSession getSqlSession(SqlSessionFactory sessionFactory, ExecutorType executorType,
      PersistenceExceptionTranslator exceptionTranslator) {

    notNull(sessionFactory, NO_SQL_SESSION_FACTORY_SPECIFIED);
    notNull(executorType, NO_EXECUTOR_TYPE_SPECIFIED);

    SqlSessionHolder holder = (SqlSessionHolder) TransactionSynchronizationManager.getResource(sessionFactory);

    SqlSession session = sessionHolder(executorType, holder);
    if (session != null) {
      return session;
    }

    LOGGER.debug(() -> "Creating a new SqlSession");
    //事务管理器里面没有sqlsession的话则生成
    session = sessionFactory.openSession(executorType);

    registerSessionHolder(sessionFactory, executorType, exceptionTranslator, session);

    return session;
  }
~~~

###### 新的sqlsession

新的sqlsession获取的数据连接为之前spring事务设置的

```java
doGetResource:153, TransactionSynchronizationManager (org.springframework.transaction.support)
getResource:140, TransactionSynchronizationManager (org.springframework.transaction.support)
doGetConnection:104, DataSourceUtils (org.springframework.jdbc.datasource)
getConnection:79, DataSourceUtils (org.springframework.jdbc.datasource)
openConnection:80, SpringManagedTransaction (org.mybatis.spring.transaction)
getConnection:67, SpringManagedTransaction (org.mybatis.spring.transaction)
//新生成的sqlsession 回去寻找之前TransactionSynchronizationManager设置的数据库连接
getConnection:337, BaseExecutor (org.apache.ibatis.executor)
prepareStatement:86, SimpleExecutor (org.apache.ibatis.executor)
doQuery:62, SimpleExecutor (org.apache.ibatis.executor)
queryFromDatabase:325, BaseExecutor (org.apache.ibatis.executor)
query:156, BaseExecutor (org.apache.ibatis.executor)
query:109, CachingExecutor (org.apache.ibatis.executor)
intercept:111, PageInterceptor (com.github.pagehelper)
invoke:61, Plugin (org.apache.ibatis.plugin)
query:-1, $Proxy115 (com.sun.proxy)
selectList:147, DefaultSqlSession (org.apache.ibatis.session.defaults)
selectList:140, DefaultSqlSession (org.apache.ibatis.session.defaults)
selectOne:76, DefaultSqlSession (org.apache.ibatis.session.defaults)
invoke0:-1, NativeMethodAccessorImpl (jdk.internal.reflect)
invoke:62, NativeMethodAccessorImpl (jdk.internal.reflect)
invoke:43, DelegatingMethodAccessorImpl (jdk.internal.reflect)
invoke:566, Method (java.lang.reflect)
invoke:426, SqlSessionTemplate$SqlSessionInterceptor (org.mybatis.spring)
selectOne:-1, $Proxy75 (com.sun.proxy)
selectOne:159, SqlSessionTemplate (org.mybatis.spring)
execute:87, MapperMethod (org.apache.ibatis.binding)
invoke:152, MapperProxy$PlainMethodInvoker (org.apache.ibatis.binding)
invoke:85, MapperProxy (org.apache.ibatis.binding)
selectUserByUsername:-1, $Proxy80 (com.sun.proxy)
createUserByUsernamePassword:64, SysUserServiceImp (com.tcoder.trail.combination.system.service.imps)
invoke:-1, SysUserServiceImp$$FastClassBySpringCGLIB$$bac92f89 (com.tcoder.trail.combination.system.service.imps)
invoke:218, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:779, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:123, TransactionInterceptor$1 (org.springframework.transaction.interceptor)
invokeWithinTransaction:388, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:119, TransactionInterceptor (org.springframework.transaction.interceptor)
proceed:186, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
intercept:692, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
createUserByUsernamePassword:-1, SysUserServiceImp$$EnhancerBySpringCGLIB$$2b4ed80 (com.tcoder.trail.combination.system.service.imps)
createUser:31, SysUserController (com.tcoder.trail.sys_controllers)
```





#### 事务提交

###### 调用栈

~~~java
processCommit:745, AbstractPlatformTransactionManager (org.springframework.transaction.support)
commit:711, AbstractPlatformTransactionManager (org.springframework.transaction.support)
commitTransactionAfterReturning:654, TransactionAspectSupport (org.springframework.transaction.interceptor)
invokeWithinTransaction:407, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:119, TransactionInterceptor (org.springframework.transaction.interceptor)
proceed:186, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
intercept:692, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
test1:-1, SysUserServiceImp$$EnhancerBySpringCGLIB$$74d2e937 (com.tcoder.trail.combination.system.service.imps)
createUserByUsernamePassword:70, SysUserServiceImp (com.tcoder.trail.combination.system.service.imps)
invoke:-1, SysUserServiceImp$$FastClassBySpringCGLIB$$bac92f89 (com.tcoder.trail.combination.system.service.imps)
invoke:218, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:779, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:123, TransactionInterceptor$1 (org.springframework.transaction.interceptor)
invokeWithinTransaction:388, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:119, TransactionInterceptor (org.springframework.transaction.interceptor)
proceed:186, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
intercept:692, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
createUserByUsernamePassword:-1, SysUserServiceImp$$EnhancerBySpringCGLIB$$74d2e937 (com.tcoder.trail.combination.system.service.imps)
createUser:31, SysUserController (com.tcoder.trail.sys_controllers)
~~~

###### commit

~~~java
//...org.springframework.transaction.support.AbstractPlatformTransactionManager...	
/**
	 * This implementation of commit handles participating in existing
	 * transactions and programmatic rollback requests.
	 * Delegates to {@code isRollbackOnly}, {@code doCommit}
	 * and {@code rollback}.
	 * @see org.springframework.transaction.TransactionStatus#isRollbackOnly()
	 * @see #doCommit
	 * @see #rollback
	 */
	@Override
	public final void commit(TransactionStatus status) throws TransactionException {
		if (status.isCompleted()) {
			throw new IllegalTransactionStateException(
					"Transaction is already completed - do not call commit or rollback more than once per transaction");
		}

		DefaultTransactionStatus defStatus = (DefaultTransactionStatus) status;
		if (defStatus.isLocalRollbackOnly()) {
			if (defStatus.isDebug()) {
				logger.debug("Transactional code has requested rollback");
			}
			processRollback(defStatus, false);
			return;
		}

        //isGlobalRollbackOnly 这里检查数据库连接持有者rollback的状态
		if (!shouldCommitOnGlobalRollbackOnly() && defStatus.isGlobalRollbackOnly()) {
			if (defStatus.isDebug()) {
				logger.debug("Global transaction is marked as rollback-only but transactional code requested commit");
			}
			processRollback(defStatus, true);
			return;
		}

		processCommit(defStatus);
	}
~~~

###### processCommit

~~~java
	/**
	 * Process an actual commit.
	 * Rollback-only flags have already been checked and applied.
	 * @param status object representing the transaction
	 * @throws TransactionException in case of commit failure
	 */
	private void processCommit(DefaultTransactionStatus status) throws TransactionException {
		try {
			boolean beforeCompletionInvoked = false;

			try {
				boolean unexpectedRollback = false;
				prepareForCommit(status);
				triggerBeforeCommit(status);
				triggerBeforeCompletion(status);
				beforeCompletionInvoked = true;
				
                //检查是否是嵌套事务 是的话不会commit
				if (status.hasSavepoint()) {
					if (status.isDebug()) {
						logger.debug("Releasing transaction savepoint");
					}
					unexpectedRollback = status.isGlobalRollbackOnly();
					status.releaseHeldSavepoint();
				}
                //这里会检查当前事务是否为共享的事务，如果不是则不会commit
				else if (status.isNewTransaction()) {
					if (status.isDebug()) {
						logger.debug("Initiating transaction commit");
					}
					unexpectedRollback = status.isGlobalRollbackOnly();
					doCommit(status);
				}
				else if (isFailEarlyOnGlobalRollbackOnly()) {
					unexpectedRollback = status.isGlobalRollbackOnly();
				}

				// Throw UnexpectedRollbackException if we have a global rollback-only
				// marker but still didn't get a corresponding exception from commit.
				if (unexpectedRollback) {
					throw new UnexpectedRollbackException(
							"Transaction silently rolled back because it has been marked as rollback-only");
				}
			}
			catch (UnexpectedRollbackException ex) {
				// can only be caused by doCommit
				triggerAfterCompletion(status, TransactionSynchronization.STATUS_ROLLED_BACK);
				throw ex;
			}
			catch (TransactionException ex) {
				// can only be caused by doCommit
				if (isRollbackOnCommitFailure()) {
					doRollbackOnCommitException(status, ex);
				}
				else {
					triggerAfterCompletion(status, TransactionSynchronization.STATUS_UNKNOWN);
				}
				throw ex;
			}
			catch (RuntimeException | Error ex) {
				if (!beforeCompletionInvoked) {
					triggerBeforeCompletion(status);
				}
				doRollbackOnCommitException(status, ex);
				throw ex;
			}

			// Trigger afterCommit callbacks, with an exception thrown there
			// propagated to callers but the transaction still considered as committed.
			try {
				triggerAfterCommit(status);
			}
			finally {
				triggerAfterCompletion(status, TransactionSynchronization.STATUS_COMMITTED);
			}

		}
		finally {
			cleanupAfterCompletion(status);
		}
	}
~~~

###### cleanupAfterCompletion

~~~java
	/**
	 * Clean up after completion, clearing synchronization if necessary,
	 * and invoking doCleanupAfterCompletion.
	 * @param status object representing the transaction
	 * @see #doCleanupAfterCompletion
	 */
	private void cleanupAfterCompletion(DefaultTransactionStatus status) {
		status.setCompleted();
		if (status.isNewSynchronization()) {
			TransactionSynchronizationManager.clear();
		}
		if (status.isNewTransaction()) {
			doCleanupAfterCompletion(status.getTransaction());
		}
        //这里会恢复被禁止的资源
		if (status.getSuspendedResources() != null) {
			if (status.isDebug()) {
				logger.debug("Resuming suspended transaction after completion of inner transaction");
			}
			Object transaction = (status.hasTransaction() ? x.getTransaction() : null);
			resume(transaction, (SuspendedResourcesHolder) status.getSuspendedResources());
		}
	}
~~~

#### 事务发生错误

###### 调用栈

~~~java
rollbackOn:187, DefaultTransactionAttribute (org.springframework.transaction.interceptor)
rollbackOn:156, RuleBasedTransactionAttribute (org.springframework.transaction.interceptor)
rollbackOn:65, DelegatingTransactionAttribute (org.springframework.transaction.interceptor)
completeTransactionAfterThrowing:670, TransactionAspectSupport (org.springframework.transaction.interceptor)
invokeWithinTransaction:392, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:119, TransactionInterceptor (org.springframework.transaction.interceptor)
proceed:186, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
intercept:692, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
test2:-1, SysUserServiceImp$$EnhancerBySpringCGLIB$$74d2e937 (com.tcoder.trail.combination.system.service.imps)
createUserByUsernamePassword:72, SysUserServiceImp (com.tcoder.trail.combination.system.service.imps)
invoke:-1, SysUserServiceImp$$FastClassBySpringCGLIB$$bac92f89 (com.tcoder.trail.combination.system.service.imps)
invoke:218, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:779, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:123, TransactionInterceptor$1 (org.springframework.transaction.interceptor)
invokeWithinTransaction:388, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:119, TransactionInterceptor (org.springframework.transaction.interceptor)
proceed:186, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:750, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
intercept:692, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
createUserByUsernamePassword:-1, SysUserServiceImp$$EnhancerBySpringCGLIB$$74d2e937 (com.tcoder.trail.combination.system.service.imps)
createUser:31, SysUserController (com.tcoder.trail.sys_controllers)
~~~

###### completeTransactionAfterThrowing

```java
/**
 * Handle a throwable, completing the transaction.
 * We may commit or roll back, depending on the configuration.
 * @param txInfo information about the current transaction
 * @param ex throwable encountered
 */
protected void completeTransactionAfterThrowing(@Nullable TransactionInfo txInfo, Throwable ex) {
   if (txInfo != null && txInfo.getTransactionStatus() != null) {
      if (logger.isTraceEnabled()) {
         logger.trace("Completing transaction for [" + txInfo.getJoinpointIdentification() +
               "] after exception: " + ex);
      }
      if (txInfo.transactionAttribute != null && txInfo.transactionAttribute.rollbackOn(ex)) {
         try {
            txInfo.getTransactionManager().rollback(txInfo.getTransactionStatus());
         }
         catch (TransactionSystemException ex2) {
            logger.error("Application exception overridden by rollback exception", ex);
            ex2.initApplicationException(ex);
            throw ex2;
         }
         catch (RuntimeException | Error ex2) {
            logger.error("Application exception overridden by rollback exception", ex);
            throw ex2;
         }
      }
      else {
         // We don't roll back on this exception.
         // Will still roll back if TransactionStatus.isRollbackOnly() is true.
         try {
            txInfo.getTransactionManager().commit(txInfo.getTransactionStatus());
         }
         catch (TransactionSystemException ex2) {
            logger.error("Application exception overridden by commit exception", ex);
            ex2.initApplicationException(ex);
            throw ex2;
         }
         catch (RuntimeException | Error ex2) {
            logger.error("Application exception overridden by commit exception", ex);
            throw ex2;
         }
      }
   }
}
```

###### rollbackOn

(这是为什么spring默认回滚RuntimeException和Error 的原因 )

~~~java
//...org.springframework.transaction.interceptor.DefaultTransactionAttribute...	
/**
	 * The default behavior is as with EJB: rollback on unchecked exception
	 * ({@link RuntimeException}), assuming an unexpected outcome outside of any
	 * business rules. Additionally, we also attempt to rollback on {@link Error} which
	 * is clearly an unexpected outcome as well. By contrast, a checked exception is
	 * considered a business exception and therefore a regular expected outcome of the
	 * transactional business method, i.e. a kind of alternative return value which
	 * still allows for regular completion of resource operations.
	 * <p>This is largely consistent with TransactionTemplate's default behavior,
	 * except that TransactionTemplate also rolls back on undeclared checked exceptions
	 * (a corner case). For declarative transactions, we expect checked exceptions to be
	 * intentionally declared as business exceptions, leading to a commit by default.
	 * @see org.springframework.transaction.support.TransactionTemplate#execute
	 */
	@Override
	public boolean rollbackOn(Throwable ex) {
		return (ex instanceof RuntimeException || ex instanceof Error);
	}
~~~

###### processRollback

~~~java
	/**
	 * Process an actual rollback.
	 * The completed flag has already been checked.
	 * @param status object representing the transaction
	 * @throws TransactionException in case of rollback failure
	 */
	private void processRollback(DefaultTransactionStatus status, boolean unexpected) {
		try {
			boolean unexpectedRollback = unexpected;

			try {
				triggerBeforeCompletion(status);
				//检查事务是否是嵌套事务  如果是则只会回滚当前保存点的sql
                //
				if (status.hasSavepoint()) {
					if (status.isDebug()) {
						logger.debug("Rolling back transaction to savepoint");
					}
					status.rollbackToHeldSavepoint();
				}
                //最终异常抛到这里事务不是继承的，也不是嵌套的
                //回滚所有的sql
				else if (status.isNewTransaction()) {
					if (status.isDebug()) {
						logger.debug("Initiating transaction rollback");
					}
					doRollback(status);
				}
				else {
                    //PROPAGATION_REQUIRED的子事务 
                    
					// Participating in larger transaction
					if (status.hasTransaction()) {
						if (status.isLocalRollbackOnly() || isGlobalRollbackOnParticipationFailure()) {
							if (status.isDebug()) {
								logger.debug("Participating transaction failed - marking existing transaction as rollback-only");
							}
             //设置对数据库连接持有者设置rollback状态  
            //org.springframework.transaction.support.AbstractPlatformTransactionManager#commit 中会检查该状态
            //但是这个设置如果没将异常catch掉 则不会读取，但是又因为接下来会抛出异常，父事务会整体rollback
            //假如catch掉的话 父事务在commit的时候会读取整个值
            //所以无论是否catch都会整体rollback
       		//而nest模式不会走这段逻辑 不会设置该值故而 如果捕获子事务的异常则不会整体回滚           
							doSetRollbackOnly(status);
						}
						else {
							if (status.isDebug()) {
								logger.debug("Participating transaction failed - letting transaction originator decide on rollback");
							}
						}
					}
					else {
						logger.debug("Should roll back transaction but cannot - no transaction available");
					}
					// Unexpected rollback only matters here if we're asked to fail early
					if (!isFailEarlyOnGlobalRollbackOnly()) {
						unexpectedRollback = false;
					}
				}
			}
			catch (RuntimeException | Error ex) {
				triggerAfterCompletion(status, TransactionSynchronization.STATUS_UNKNOWN);
				throw ex;
			}
			
			triggerAfterCompletion(status, TransactionSynchronization.STATUS_ROLLED_BACK);

			// Raise UnexpectedRollbackException if we had a global rollback-only marker
			if (unexpectedRollback) {
				throw new UnexpectedRollbackException(
						"Transaction rolled back because it has been marked as rollback-only");
			}
		}
		finally {
			cleanupAfterCompletion(status);
		}
        
        //没有命中则向上抛出异常
	}
~~~

