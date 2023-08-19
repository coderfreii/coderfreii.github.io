##### 前言

本文只要展示部分spring源码的调试流程



```java
...org.springframework.context.annotation.ClassPathBeanDefinitionScanner...
 
protected Set<BeanDefinitionHolder> doScan(String... basePackages) {
   Assert.notEmpty(basePackages, "At least one base package must be specified");
   Set<BeanDefinitionHolder> beanDefinitions = new LinkedHashSet<>();
   for (String basePackage : basePackages) {
      //处理路径找到reader  根据规则获取候选人
      Set<BeanDefinition> candidates = findCandidateComponents(basePackage);
      for (BeanDefinition candidate : candidates) {
         ScopeMetadata scopeMetadata = this.scopeMetadataResolver.resolveScopeMetadata(candidate);
         candidate.setScope(scopeMetadata.getScopeName());
         String beanName = this.beanNameGenerator.generateBeanName(candidate, this.registry);
         if (candidate instanceof AbstractBeanDefinition) {
            postProcessBeanDefinition((AbstractBeanDefinition) candidate, beanName);
         }
         if (candidate instanceof AnnotatedBeanDefinition) {
            AnnotationConfigUtils.processCommonDefinitionAnnotations((AnnotatedBeanDefinition) candidate);
         }
         if (checkCandidate(beanName, candidate)) {
            BeanDefinitionHolder definitionHolder = new BeanDefinitionHolder(candidate, beanName);
            definitionHolder =
                  AnnotationConfigUtils.applyScopedProxyMode(scopeMetadata, definitionHolder, this.registry);
            beanDefinitions.add(definitionHolder);
            registerBeanDefinition(definitionHolder, this.registry);
         }
      }
   }
   return beanDefinitions;
}
```



###### Caching Meta data Reader Factory

```java
...org.springframework.core.type.classreading.CachingMetadataReaderFactory...
    extends SimpleMetadataReaderFactory

    //获取metaData Reader
    @Override
    public MetadataReader getMetadataReader(Resource resource) throws IOException {
    if (this.metadataReaderCache instanceof ConcurrentMap) {
        // No synchronization necessary...
        MetadataReader metadataReader = this.metadataReaderCache.get(resource);
        if (metadataReader == null) {
            //缓存不存在新建一个
            metadataReader = super.getMetadataReader(resource);
            this.metadataReaderCache.put(resource, metadataReader);
        }
        
        //存在的情况就是因为入口类的扫描
        return metadataReader;
    }
    else if (this.metadataReaderCache != null) {
        synchronized (this.metadataReaderCache) {
            MetadataReader metadataReader = this.metadataReaderCache.get(resource);
            if (metadataReader == null) {
                metadataReader = super.getMetadataReader(resource);
                this.metadataReaderCache.put(resource, metadataReader);
            }
            return metadataReader;
        }
    }
    else {
        return super.getMetadataReader(resource);
    }
}


...org.springframework.core.type.classreading.SimpleMetadataReaderFactory...
    implements MetadataReaderFactory
    
    @Override
    public MetadataReader getMetadataReader(Resource resource) throws IOException {
    	//这个reader 
    	return new SimpleMetadataReader(resource, this.resourceLoader.getClassLoader());
	} 

//这里的simple 持有的是 AnnotationMetadataReadingVisitor
...org.springframework.core.type.classreading.SimpleMetadataReader...
SimpleMetadataReader(Resource resource, @Nullable ClassLoader classLoader) throws IOException {
    InputStream is = new BufferedInputStream(resource.getInputStream());
    ClassReader classReader;
    try {
        //这个是读取class文件的
        classReader = new ClassReader(is);
    }
    catch (IllegalArgumentException ex) {
        throw new NestedIOException("ASM ClassReader failed to parse class file - " +
                                    "probably due to a new Java class file version that isn't supported yet: " + resource, ex);
    }
    finally {
        is.close();
    }

   	//这是visitor模式  从 asm  classReader 中获取信息
    AnnotationMetadataReadingVisitor visitor = new AnnotationMetadataReadingVisitor(classLoader);
    //用反射获取metaData
    ##### meta Data AnnotationMetadata implementation that uses standard reflection to introspect a given Class.
    
    
    
    classReader.accept(visitor, ClassReader.SKIP_DEBUG);

    this.annotationMetadata = visitor;
    // (since AnnotationMetadataReadingVisitor extends ClassMetadataReadingVisitor)
    this.classMetadata = visitor;
    this.resource = resource;
}


...org.springframework.asm.ClassReader...
    public ClassReader(final byte[] b, final int off, final int len) {
        this.b = b;
        // checks the class version
		/* SPRING PATCH: REMOVED FOR FORWARD COMPATIBILITY WITH JDK 9
        if (readShort(off + 6) > Opcodes.V1_8) {
            throw new IllegalArgumentException();
        }
		*/
        // parses the constant pool     //类似于视频的传输协议 或 编码封装协议
        items = new int[readUnsignedShort(off + 8)];  
        int n = items.length;
        strings = new String[n];
        int max = 0;
        int index = off + 10;
        for (int i = 1; i < n; ++i) {
            items[i] = index + 1;
            int size;
            switch (b[index]) {
            case ClassWriter.FIELD:
            case ClassWriter.METH:
            case ClassWriter.IMETH:
            case ClassWriter.INT:
            case ClassWriter.FLOAT:
            case ClassWriter.NAME_TYPE:
            case ClassWriter.INDY:
                size = 5;
                break;
            case ClassWriter.LONG:
            case ClassWriter.DOUBLE:
                size = 9;
                ++i;
                break;
            case ClassWriter.UTF8:
                size = 3 + readUnsignedShort(index + 1);
                if (size > max) {
                    max = size;
                }
                break;
            case ClassWriter.HANDLE:
                size = 4;
                break;
            // case ClassWriter.CLASS:
            // case ClassWriter.STR:
            // case ClassWriter.MTYPE
            // case ClassWriter.PACKAGE:
            // case ClassWriter.MODULE:
            default:
                size = 3;
                break;
            }
            index += size;
        }
        maxStringLength = max;
        // the class header information starts just after the constant pool
        header = index;
    }
```



##### getBean流程

~~~java
getObject:95, MapperFactoryBean (org.mybatis.spring.mapper)
doGetObjectFromFactoryBean:171, FactoryBeanRegistrySupport (org.springframework.beans.factory.support)
getObjectFromFactoryBean:101, FactoryBeanRegistrySupport (org.springframework.beans.factory.support)
getObjectForBeanInstance:1645, AbstractBeanFactory (org.springframework.beans.factory.support)
getObjectForBeanInstance:1175, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doGetBean:327, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
//(注入Factory的 Mapper的Bean)
resolveCandidate:251, DependencyDescriptor (org.springframework.beans.factory.config)
doResolveDependency:1135, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveDependency:1062, DefaultListableBeanFactory (org.springframework.beans.factory.support)
inject:583, AutowiredAnnotationBeanPostProcessor$AutowiredFieldElement (org.springframework.beans.factory.annotation)
inject:91, InjectionMetadata (org.springframework.beans.factory.annotation)
postProcessPropertyValues:372, AutowiredAnnotationBeanPostProcessor (org.springframework.beans.factory.annotation)
populateBean:1341, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:572, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 2022689531 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$144)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
//
resolveCandidate:251, DependencyDescriptor (org.springframework.beans.factory.config)
doResolveDependency:1135, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveDependency:1062, DefaultListableBeanFactory (org.springframework.beans.factory.support)
inject:583, AutowiredAnnotationBeanPostProcessor$AutowiredFieldElement (org.springframework.beans.factory.annotation)
inject:91, InjectionMetadata (org.springframework.beans.factory.annotation)
postProcessPropertyValues:372, AutowiredAnnotationBeanPostProcessor (org.springframework.beans.factory.annotation)
populateBean:1341, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:572, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 2022689531 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$144)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
//
preInstantiateSingletons:759, DefaultListableBeanFactory (org.springframework.beans.factory.support)
finishBeanFactoryInitialization:869, AbstractApplicationContext (org.springframework.context.support)
refresh:550, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~

###### 代码

~~~java
...org.springframework.beans.factory.support.AbstractBeanFactory...
@Override
public Object getBean(String name) throws BeansException {
    //
    return doGetBean(name, null, null, false);
}
~~~

~~~java
protected <T> T doGetBean(final String name, @Nullable final Class<T> requiredType,
                          @Nullable final Object[] args, boolean typeCheckOnly) throws BeansException {

    final String beanName = transformedBeanName(name);
    Object bean;

    // Eagerly check singleton cache for manually registered singletons.
    //这里需要展开看
    Object sharedInstance = getSingleton(beanName);
    if (sharedInstance != null && args == null) {
        if (logger.isDebugEnabled()) {
            if (isSingletonCurrentlyInCreation(beanName)) {
                logger.debug("Returning eagerly cached instance of singleton bean '" + beanName +
                             "' that is not fully initialized yet - a consequence of a circular reference");
            }
            else {
                logger.debug("Returning cached instance of singleton bean '" + beanName + "'");
            }
        }
        bean = getObjectForBeanInstance(sharedInstance, name, beanName, null);
    }

    else {
        // Fail if we're already creating this bean instance:
        // We're assumably within a circular reference.
        if (isPrototypeCurrentlyInCreation(beanName)) {
            throw new BeanCurrentlyInCreationException(beanName);
        }

        // Check if bean definition exists in this factory.
        BeanFactory parentBeanFactory = getParentBeanFactory();
        if (parentBeanFactory != null && !containsBeanDefinition(beanName)) {
            // Not found -> check parent.
            String nameToLookup = originalBeanName(name);
            if (parentBeanFactory instanceof AbstractBeanFactory) {
                return ((AbstractBeanFactory) parentBeanFactory).doGetBean(
                    nameToLookup, requiredType, args, typeCheckOnly);
            }
            else if (args != null) {
                // Delegation to parent with explicit args.
                return (T) parentBeanFactory.getBean(nameToLookup, args);
            }
            else {
                // No args -> delegate to standard getBean method.
                return parentBeanFactory.getBean(nameToLookup, requiredType);
            }
        }

        if (!typeCheckOnly) { // 只检查类型的话直接返回
            markBeanAsCreated(beanName);
        }

        try {
            final RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);
            checkMergedBeanDefinition(mbd, beanName, args);

            // Guarantee initialization of beans that the current bean depends on.
            String[] dependsOn = mbd.getDependsOn();
            if (dependsOn != null) {
                for (String dep : dependsOn) {
                    if (isDependent(beanName, dep)) {
                        throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                                                        "Circular depends-on relationship between '" 
                                                        + beanName + "' and '" + dep + "'");
                    }
                    //注册依赖关系	
                    registerDependentBean(dep, beanName);
                    try {
                        getBean(dep);
                    }
                    catch (NoSuchBeanDefinitionException ex) {
                        throw new BeanCreationException(mbd.getResourceDescription(), beanName,
                                                        "'" + beanName + "' depends on missing bean '" + dep + "'", ex);
                    }
                }
            }

            //单例
            // Create bean instance.
            if (mbd.isSingleton()) {
                sharedInstance = getSingleton(beanName, () -> {
                    try {
                        //构建bean
                        return createBean(beanName, mbd, args);
                    }
                    catch (BeansException ex) {
                        // Explicitly remove instance from singleton cache: It might have been put there
                        // eagerly by the creation process, to allow for circular reference resolution.
                        // Also remove any beans that received a temporary reference to the bean.
                        destroySingleton(beanName);
                        throw ex;
                    }
                });
                //getObjectForBeanInstance
                bean = getObjectForBeanInstance(sharedInstance, name, beanName, mbd);
            }
  			//原型
            else if (mbd.isPrototype()) {
                // It's a prototype -> create a new instance.
                Object prototypeInstance = null;
                try {
                    beforePrototypeCreation(beanName);
                    prototypeInstance = createBean(beanName, mbd, args);
                }
                finally {
                    afterPrototypeCreation(beanName);
                }
                bean = getObjectForBeanInstance(prototypeInstance, name, beanName, mbd);
            }

            else {
                String scopeName = mbd.getScope();
                final Scope scope = this.scopes.get(scopeName);
                if (scope == null) {
                    throw new IllegalStateException("No Scope registered for scope name '" + scopeName + "'");
                }
                try {
                    Object scopedInstance = scope.get(beanName, () -> {
                        beforePrototypeCreation(beanName);
                        try {
                            return createBean(beanName, mbd, args);
                        }
                        finally {
                            afterPrototypeCreation(beanName);
                        }
                    });
                    bean = getObjectForBeanInstance(scopedInstance, name, beanName, mbd);
                }
                catch (IllegalStateException ex) {
                    throw new BeanCreationException(beanName,
                                                    "Scope '" + scopeName + "' is not active for the current thread; consider " +
                                                    "defining a scoped proxy for this bean if you intend to refer to it from a singleton",
                                                    ex);
                }
            }
        }
        catch (BeansException ex) {
            cleanupAfterBeanCreationFailure(beanName);
            throw ex;
        }
    }

    // Check if required type matches the type of the actual bean instance.
    if (requiredType != null && !requiredType.isInstance(bean)) {
        try {
            T convertedBean = getTypeConverter().convertIfNecessary(bean, requiredType);
            if (convertedBean == null) {
                throw new BeanNotOfRequiredTypeException(name, requiredType, bean.getClass());
            }
            return convertedBean;
        }
        catch (TypeMismatchException ex) {
            if (logger.isDebugEnabled()) {
                logger.debug("Failed to convert bean '" + name + "' to required type '" +
                             ClassUtils.getQualifiedName(requiredType) + "'", ex);
            }
            throw new BeanNotOfRequiredTypeException(name, requiredType, bean.getClass());
        }
    }
    return (T) bean;
}
~~~

~~~java
@Nullable
protected Object getSingleton(String beanName, boolean allowEarlyReference) {
    Object singletonObject = this.singletonObjects.get(beanName);
    if (singletonObject == null && isSingletonCurrentlyInCreation(beanName)) {
        synchronized (this.singletonObjects) {
            singletonObject = this.earlySingletonObjects.get(beanName);
            //这里解决循环引用
            if (singletonObject == null && allowEarlyReference) {
                ObjectFactory<?> singletonFactory = this.singletonFactories.get(beanName);
                if (singletonFactory != null) {
                    singletonObject = singletonFactory.getObject();
                    this.earlySingletonObjects.put(beanName, singletonObject);
                    this.singletonFactories.remove(beanName);
                }
            }
        }
    }
    return singletonObject;
}
~~~



###### getObjectForBeanInstance

~~~java
...org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory...
@Override
protected Object getObjectForBeanInstance(
    Object beanInstance, String name, String beanName, @Nullable RootBeanDefinition mbd) {

    String currentlyCreatedBean = this.currentlyCreatedBean.get();
    if (currentlyCreatedBean != null) {
        registerDependentBean(beanName, currentlyCreatedBean);
    }

    return super.getObjectForBeanInstance(beanInstance, name, beanName, mbd);
}
~~~

~~~java
...org.springframework.beans.factory.support.AbstractBeanFactory...
	protected Object getObjectForBeanInstance(
			Object beanInstance, String name, String beanName, @Nullable RootBeanDefinition mbd) {

		// Don't let calling code try to dereference the factory if the bean isn't a factory.
		if (BeanFactoryUtils.isFactoryDereference(name)) {
			if (beanInstance instanceof NullBean) {
				return beanInstance;
			}
			if (!(beanInstance instanceof FactoryBean)) {
				throw new BeanIsNotAFactoryException(transformedBeanName(name), beanInstance.getClass());
			}
		}

		// Now we have the bean instance, which may be a normal bean or a FactoryBean.
		// If it's a FactoryBean, we use it to create a bean instance, unless the
		// caller actually wants a reference to the factory.
    
    	//不是FactoryBean  或 FactoryDereference 则返回 否则如下解析FactoryBean
		if (!(beanInstance instanceof FactoryBean) || BeanFactoryUtils.isFactoryDereference(name)) {
			return beanInstance;
		}

		Object object = null;
		if (mbd == null) {
			object = getCachedObjectForFactoryBean(beanName);
		}
		if (object == null) {
			// Return bean instance from factory.
			FactoryBean<?> factory = (FactoryBean<?>) beanInstance;
			// Caches object obtained from FactoryBean if it is a singleton.
			if (mbd == null && containsBeanDefinition(beanName)) {
				mbd = getMergedLocalBeanDefinition(beanName);
			}
			boolean synthetic = (mbd != null && mbd.isSynthetic());
			object = getObjectFromFactoryBean(factory, beanName, !synthetic);
		}
		return object;
	}
~~~







###### 创建bean（工厂bean 单例）

~~~java
...org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory...
	@Override
	protected Object createBean(String beanName, RootBeanDefinition mbd, @Nullable Object[] args)
			throws BeanCreationException {

		if (logger.isDebugEnabled()) {
			logger.debug("Creating instance of bean '" + beanName + "'");
		}
		RootBeanDefinition mbdToUse = mbd;

		// Make sure bean class is actually resolved at this point, and
		// clone the bean definition in case of a dynamically resolved Class
		// which cannot be stored in the shared merged bean definition.
		Class<?> resolvedClass = resolveBeanClass(mbd, beanName);
		if (resolvedClass != null && !mbd.hasBeanClass() && mbd.getBeanClassName() != null) {
			mbdToUse = new RootBeanDefinition(mbd);
			mbdToUse.setBeanClass(resolvedClass);
		}

		// Prepare method overrides.
		try {
			mbdToUse.prepareMethodOverrides();
		}
		catch (BeanDefinitionValidationException ex) {
			throw new BeanDefinitionStoreException(mbdToUse.getResourceDescription(),
					beanName, "Validation of method overrides failed", ex);
		}
		
   		//生成代理类
		try {
			// Give BeanPostProcessors a chance to return a proxy instead of the target bean instance.
			Object bean = resolveBeforeInstantiation(beanName, mbdToUse);
			if (bean != null) {
				return bean;
			}
		}
		catch (Throwable ex) {
			throw new BeanCreationException(mbdToUse.getResourceDescription(), beanName,
					"BeanPostProcessor before instantiation of bean failed", ex);
		}

		try {
            //doCreateBean
			Object beanInstance = doCreateBean(beanName, mbdToUse, args);
			if (logger.isDebugEnabled()) {
				logger.debug("Finished creating instance of bean '" + beanName + "'");
			}
			return beanInstance;
		}
		catch (BeanCreationException | ImplicitlyAppearedSingletonException ex) {
			// A previously detected exception with proper bean creation context already,
			// or illegal singleton state to be communicated up to DefaultSingletonBeanRegistry.
			throw ex;
		}
		catch (Throwable ex) {
			throw new BeanCreationException(
					mbdToUse.getResourceDescription(), beanName, "Unexpected exception during bean creation", ex);
		}
	}   
~~~



~~~java
	protected Object doCreateBean(final String beanName, final RootBeanDefinition mbd, final @Nullable Object[] args)
			throws BeanCreationException {

		// Instantiate the bean.
		BeanWrapper instanceWrapper = null;
		if (mbd.isSingleton()) {
            //获取factoryBeanInstanceCache bean    移除是因为 单例只用一次  每个mapper 有自己对应的工厂bean
			instanceWrapper = this.factoryBeanInstanceCache.remove(beanName);
		}
		if (instanceWrapper == null) {
            //加入没有工厂类 则尝试生成
			instanceWrapper = createBeanInstance(beanName, mbd, args);
		}
		final Object bean = instanceWrapper.getWrappedInstance();
		Class<?> beanType = instanceWrapper.getWrappedClass();
		if (beanType != NullBean.class) {
			mbd.resolvedTargetType = beanType;
		}

		// Allow post-processors to modify the merged bean definition.
		synchronized (mbd.postProcessingLock) {
			if (!mbd.postProcessed) {
				try {
                    //applyMergedBeanDefinitionPostProcessors
					applyMergedBeanDefinitionPostProcessors(mbd, beanType, beanName);
				}
				catch (Throwable ex) {
					throw new BeanCreationException(mbd.getResourceDescription(), beanName,
							"Post-processing of merged bean definition failed", ex);
				}
				mbd.postProcessed = true;
			}
		}

		// Eagerly cache singletons to be able to resolve circular references
		// even when triggered by lifecycle interfaces like BeanFactoryAware.
		boolean earlySingletonExposure = (mbd.isSingleton() && this.allowCircularReferences &&
				isSingletonCurrentlyInCreation(beanName));
		if (earlySingletonExposure) {
			if (logger.isDebugEnabled()) {
				logger.debug("Eagerly caching bean '" + beanName +
						"' to allow for resolving potential circular references");
			}
            //放入未填充的实例化后的bean  解决单例的循环依赖问题
			addSingletonFactory(beanName, () -> getEarlyBeanReference(beanName, mbd, bean));
		}

		// Initialize the bean instance.
		Object exposedObject = bean;
		try {
            //填充
			populateBean(beanName, mbd, instanceWrapper);
            //初始化bean
			exposedObject = initializeBean(beanName, exposedObject, mbd);
		}
		catch (Throwable ex) {
			if (ex instanceof BeanCreationException && beanName.equals(((BeanCreationException) ex).getBeanName())) {
				throw (BeanCreationException) ex;
			}
			else {
				throw new BeanCreationException(
						mbd.getResourceDescription(), beanName, "Initialization of bean failed", ex);
			}
		}

		if (earlySingletonExposure) {
			Object earlySingletonReference = getSingleton(beanName, false);
			if (earlySingletonReference != null) {
				if (exposedObject == bean) {
					exposedObject = earlySingletonReference;
				}
				else if (!this.allowRawInjectionDespiteWrapping && hasDependentBean(beanName)) {
					String[] dependentBeans = getDependentBeans(beanName);
					Set<String> actualDependentBeans = new LinkedHashSet<>(dependentBeans.length);
					for (String dependentBean : dependentBeans) {
						if (!removeSingletonIfCreatedForTypeCheckOnly(dependentBean)) {
							actualDependentBeans.add(dependentBean);
						}
					}
					if (!actualDependentBeans.isEmpty()) {
						throw new BeanCurrentlyInCreationException(beanName,
								"Bean with name '" + beanName + "' has been injected into other beans [" +
								StringUtils.collectionToCommaDelimitedString(actualDependentBeans) +
								"] in its raw version as part of a circular reference, but has eventually been " +
								"wrapped. This means that said other beans do not use the final version of the " +
								"bean. This is often the result of over-eager type matching - consider using " +
								"'getBeanNamesOfType' with the 'allowEagerInit' flag turned off, for example.");
					}
				}
			}
		}

		// Register bean as disposable.
		try {
			registerDisposableBeanIfNecessary(beanName, bean, mbd);
		}
		catch (BeanDefinitionValidationException ex) {
			throw new BeanCreationException(
					mbd.getResourceDescription(), beanName, "Invalid destruction signature", ex);
		}

		return exposedObject;
	}
~~~

~~~java

protected Object initializeBean(final String beanName, final Object bean, @Nullable RootBeanDefinition mbd) {
		if (System.getSecurityManager() != null) {
			AccessController.doPrivileged((PrivilegedAction<Object>) () -> {
				invokeAwareMethods(beanName, bean);
				return null;
			}, getAccessControlContext());
		}
		else {
            //invokeAwareMethods
			invokeAwareMethods(beanName, bean);
		}

		Object wrappedBean = bean;
		if (mbd == null || !mbd.isSynthetic()) {
            //applyBeanPostProcessorsBeforeInitialization
			wrappedBean = applyBeanPostProcessorsBeforeInitialization(wrappedBean, beanName);
		}

		try {
            //invokeInitMethods
			invokeInitMethods(beanName, wrappedBean, mbd);
		}
		catch (Throwable ex) {
			throw new BeanCreationException(
					(mbd != null ? mbd.getResourceDescription() : null),
					beanName, "Invocation of init method failed", ex);
		}
    	//这里aop代理类生成
		if (mbd == null || !mbd.isSynthetic()) {
            //applyBeanPostProcessorsAfterInitialization  aop处理在这里
			wrappedBean = applyBeanPostProcessorsAfterInitialization(wrappedBean, beanName);
		}

		return wrappedBean;
	}
~~~

###### 

###### 创建bean (构造器注入  非工厂bean)

~~~java
autowireConstructor:151, ConstructorResolver (org.springframework.beans.factory.support)
autowireConstructor:1267, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//开始注入
createBeanInstance:1124, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)  
//这里会检查是否有构造器注入
getSingletonFactoryBeanForTypeCheck:943, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
getTypeForFactoryBean:826, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
isTypeMatch:562, AbstractBeanFactory (org.springframework.beans.factory.support)
//这里饥渴实例化了 原因因为是工厂类型 
doGetBeanNamesForType:426, DefaultListableBeanFactory (org.springframework.beans.factory.support)
getBeanNamesForType:389, DefaultListableBeanFactory (org.springframework.beans.factory.support)
beanNamesForTypeIncludingAncestors:208, BeanFactoryUtils (org.springframework.beans.factory)
findAutowireCandidates:1273, DefaultListableBeanFactory (org.springframework.beans.factory.support)
doResolveDependency:1098, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveDependency:1062, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveAutowiredArgument:818, ConstructorResolver (org.springframework.beans.factory.support)
createArgumentArray:724, ConstructorResolver (org.springframework.beans.factory.support)
instantiateUsingFactoryMethod:474, ConstructorResolver (org.springframework.beans.factory.support)
instantiateUsingFactoryMethod:1247, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBeanInstance:1096, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//这个无法找到工厂bean 就只能尝试生成
doCreateBean:535, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 406749219 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$148)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:204, AbstractBeanFactory (org.springframework.beans.factory.support)
//
registerBeanPostProcessors:224, PostProcessorRegistrationDelegate (org.springframework.context.support)
registerBeanPostProcessors:710, AbstractApplicationContext (org.springframework.context.support)
refresh:535, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~

~~~Java
...org.springframework.beans.factory.support.DefaultListableBeanFactory...	
private String[] doGetBeanNamesForType(ResolvableType type, boolean includeNonSingletons, boolean allowEagerInit) {
		List<String> result = new ArrayList<>();

		// Check all bean definitions.  
		for (String beanName : this.beanDefinitionNames) {
			// Only consider bean as eligible if the bean name
			// is not defined as alias for some other bean.
			if (!isAlias(beanName)) {
				try {
					RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);
					// Only check bean definition if it is complete.
					if (!mbd.isAbstract() && (allowEagerInit ||
							(mbd.hasBeanClass() || !mbd.isLazyInit() || isAllowEagerClassLoading()) &&
									!requiresEagerInitForType(mbd.getFactoryBeanName()))) {
						// In case of FactoryBean, match object created by FactoryBean.
						boolean isFactoryBean = isFactoryBean(beanName, mbd);
						BeanDefinitionHolder dbd = mbd.getDecoratedDefinition();
						boolean matchFound =
								(allowEagerInit || !isFactoryBean ||
										(dbd != null && !mbd.isLazyInit()) || containsSingleton(beanName)) &&
								(includeNonSingletons ||
										(dbd != null ? mbd.isSingleton() : isSingleton(beanName))) &&
							//	
                            isTypeMatch(beanName, type);
						if (!matchFound && isFactoryBean) {
							// In case of FactoryBean, try to match FactoryBean instance itself next.
							beanName = FACTORY_BEAN_PREFIX + beanName;
							matchFound = (includeNonSingletons || mbd.isSingleton()) && isTypeMatch(beanName, type);
						}
						if (matchFound) {
							result.add(beanName);
						}
					}
				}
				catch (CannotLoadBeanClassException ex) {
					if (allowEagerInit) {
						throw ex;
					}
					// Probably a class name with a placeholder: let's ignore it for type matching purposes.
					if (logger.isDebugEnabled()) {
						logger.debug("Ignoring bean class loading failure for bean '" + beanName + "'", ex);
					}
					onSuppressedException(ex);
				}
				catch (BeanDefinitionStoreException ex) {
					if (allowEagerInit) {
						throw ex;
					}
					// Probably some metadata with a placeholder: let's ignore it for type matching purposes.
					if (logger.isDebugEnabled()) {
						logger.debug("Ignoring unresolvable metadata in bean definition '" + beanName + "'", ex);
					}
					onSuppressedException(ex);
				}
			}
		}

		// Check manually registered singletons too.
		for (String beanName : this.manualSingletonNames) {
			try {
				// In case of FactoryBean, match object created by FactoryBean.
				if (isFactoryBean(beanName)) {
					if ((includeNonSingletons || isSingleton(beanName)) && isTypeMatch(beanName, type)) {
						result.add(beanName);
						// Match found for this bean: do not match FactoryBean itself anymore.
						continue;
					}
					// In case of FactoryBean, try to match FactoryBean itself next.
					beanName = FACTORY_BEAN_PREFIX + beanName;
				}
				// Match raw bean instance (might be raw FactoryBean).
				if (isTypeMatch(beanName, type)) {
					result.add(beanName);
				}
			}
			catch (NoSuchBeanDefinitionException ex) {
				// Shouldn't happen - probably a result of circular reference resolution...
				if (logger.isDebugEnabled()) {
					logger.debug("Failed to check manually registered singleton with name '" + beanName + "'", ex);
				}
			}
		}

		return StringUtils.toStringArray(result);
	}



...org.springframework.beans.factory.support.AbstractBeanFactory...
	@Override
	public boolean isTypeMatch(String name, ResolvableType typeToMatch) throws NoSuchBeanDefinitionException {
		String beanName = transformedBeanName(name);

		// Check manually registered singletons.
		Object beanInstance = getSingleton(beanName, false);
		if (beanInstance != null && beanInstance.getClass() != NullBean.class) {
			if (beanInstance instanceof FactoryBean) {
				if (!BeanFactoryUtils.isFactoryDereference(name)) {
					Class<?> type = getTypeForFactoryBean((FactoryBean<?>) beanInstance);
					return (type != null && typeToMatch.isAssignableFrom(type));
				}
				else {
					return typeToMatch.isInstance(beanInstance);
				}
			}
			else if (!BeanFactoryUtils.isFactoryDereference(name)) {
				if (typeToMatch.isInstance(beanInstance)) {
					// Direct match for exposed instance?
					return true;
				}
				else if (typeToMatch.hasGenerics() && containsBeanDefinition(beanName)) {
					// Generics potentially only match on the target class, not on the proxy...
					RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);
					Class<?> targetType = mbd.getTargetType();
					if (targetType != null && targetType != ClassUtils.getUserClass(beanInstance) &&
							typeToMatch.isAssignableFrom(targetType)) {
						// Check raw class match as well, making sure it's exposed on the proxy.
						Class<?> classToMatch = typeToMatch.resolve();
						return (classToMatch == null || classToMatch.isInstance(beanInstance));
					}
				}
			}
			return false;
		}
		else if (containsSingleton(beanName) && !containsBeanDefinition(beanName)) {
			// null instance registered
			return false;
		}

		// No singleton instance found -> check bean definition.
		BeanFactory parentBeanFactory = getParentBeanFactory();
		if (parentBeanFactory != null && !containsBeanDefinition(beanName)) {
			// No bean definition found in this factory -> delegate to parent.
			return parentBeanFactory.isTypeMatch(originalBeanName(name), typeToMatch);
		}

		// Retrieve corresponding bean definition.
		RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);

		Class<?> classToMatch = typeToMatch.resolve();
		if (classToMatch == null) {
			classToMatch = FactoryBean.class;
		}
		Class<?>[] typesToMatch = (FactoryBean.class == classToMatch ?
				new Class<?>[] {classToMatch} : new Class<?>[] {FactoryBean.class, classToMatch});

		// Check decorated bean definition, if any: We assume it'll be easier
		// to determine the decorated bean's type than the proxy's type.
		BeanDefinitionHolder dbd = mbd.getDecoratedDefinition();
		if (dbd != null && !BeanFactoryUtils.isFactoryDereference(name)) {
			RootBeanDefinition tbd = getMergedBeanDefinition(dbd.getBeanName(), dbd.getBeanDefinition(), mbd);
			Class<?> targetClass = predictBeanType(dbd.getBeanName(), tbd, typesToMatch);
			if (targetClass != null && !FactoryBean.class.isAssignableFrom(targetClass)) {
				return typeToMatch.isAssignableFrom(targetClass);
			}
		}

		Class<?> beanType = predictBeanType(beanName, mbd, typesToMatch);
		if (beanType == null) {
			return false;
		}

		// Check bean class whether we're dealing with a FactoryBean.
		if (FactoryBean.class.isAssignableFrom(beanType)) {
			if (!BeanFactoryUtils.isFactoryDereference(name) && beanInstance == null) {
				// If it's a FactoryBean, we want to look at what it creates, not the factory class.
                //需要确认 工厂bean返回的是什么 故而将其实例化
				beanType = getTypeForFactoryBean(beanName, mbd);
				if (beanType == null) {
					return false;
				}
			}
		}
		else if (BeanFactoryUtils.isFactoryDereference(name)) {
			// Special case: A SmartInstantiationAwareBeanPostProcessor returned a non-FactoryBean
			// type but we nevertheless are being asked to dereference a FactoryBean...
			// Let's check the original bean class and proceed with it if it is a FactoryBean.
			beanType = predictBeanType(beanName, mbd, FactoryBean.class);
			if (beanType == null || !FactoryBean.class.isAssignableFrom(beanType)) {
				return false;
			}
		}

		ResolvableType resolvableType = mbd.targetType;
		if (resolvableType == null) {
			resolvableType = mbd.factoryMethodReturnType;
		}
		if (resolvableType != null && resolvableType.resolve() == beanType) {
			return typeToMatch.isAssignableFrom(resolvableType);
		}
		return typeToMatch.isAssignableFrom(beanType);
	}

~~~



```java
...org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory...
##this org.springframework.beans.factory.support.DefaultListableBeanFactory   
protected BeanWrapper createBeanInstance(String beanName, RootBeanDefinition mbd, @Nullable Object[] args) {
		// Make sure bean class is actually resolved at this point.
		Class<?> beanClass = resolveBeanClass(mbd, beanName);
	if (beanClass != null && !Modifier.isPublic(beanClass.getModifiers()) && !mbd.isNonPublicAccessAllowed()) {
		throw new BeanCreationException(mbd.getResourceDescription(), beanName,
				"Bean class isn't public, and non-public access not allowed: " + beanClass.getName());
	}

	Supplier<?> instanceSupplier = mbd.getInstanceSupplier();
	if (instanceSupplier != null) {
		return obtainFromSupplier(instanceSupplier, beanName);
	}

	if (mbd.getFactoryMethodName() != null)  {
        //工厂方法
		return instantiateUsingFactoryMethod(beanName, mbd, args);
	}

	// Shortcut when re-creating the same bean...
	boolean resolved = false;
	boolean autowireNecessary = false;
	if (args == null) {
		synchronized (mbd.constructorArgumentLock) {
			if (mbd.resolvedConstructorOrFactoryMethod != null) {
				resolved = true;
				autowireNecessary = mbd.constructorArgumentsResolved;
			}
		}
	}
	if (resolved) {
		if (autowireNecessary) {
			return autowireConstructor(beanName, mbd, null, null);
		}
		else {
			return instantiateBean(beanName, mbd);
		}
	}

	// Need to determine the constructor...
	Constructor<?>[] ctors = determineConstructorsFromBeanPostProcessors(beanClass, beanName);
	if (ctors != null ||
			mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_CONSTRUCTOR ||
			mbd.hasConstructorArgumentValues() || !ObjectUtils.isEmpty(args))  {
		return autowireConstructor(beanName, mbd, ctors, args);
	}

	// No special handling: simply use no-arg constructor.
	return instantiateBean(beanName, mbd);
}
```

##### 注解依赖注入的 （注入类型为 MapperFactoryBean）

~~~java
getObject:95, MapperFactoryBean (org.mybatis.spring.mapper)
doGetObjectFromFactoryBean:171, FactoryBeanRegistrySupport (org.springframework.beans.factory.support)
getObjectFromFactoryBean:101, FactoryBeanRegistrySupport (org.springframework.beans.factory.support)
//处理工厂类的
getObjectForBeanInstance:1645, AbstractBeanFactory (org.springframework.beans.factory.support)
getObjectForBeanInstance:1175, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doGetBean:257, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
//获取依赖bean
resolveCandidate:251, DependencyDescriptor (org.springframework.beans.factory.config)
addCandidateEntry:1322, DefaultListableBeanFactory (org.springframework.beans.factory.support)
findAutowireCandidates:1288, DefaultListableBeanFactory (org.springframework.beans.factory.support)
doResolveDependency:1098, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveDependency:1062, DefaultListableBeanFactory (org.springframework.beans.factory.support)
inject:583, AutowiredAnnotationBeanPostProcessor$AutowiredFieldElement (org.springframework.beans.factory.annotation)
inject:91, InjectionMetadata (org.springframework.beans.factory.annotation)
postProcessPropertyValues:372, AutowiredAnnotationBeanPostProcessor (org.springframework.beans.factory.annotation)
//org.springframework.beans.factory.annotation.AutowiredAnnotationBeanPostProcessor 这个prcessor处理
populateBean:1341, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//填充bean
doCreateBean:572, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//创建bean
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
//获取不到就创建
getObject:-1, 406749219 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$148)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
//获取依赖bean
resolveCandidate:251, DependencyDescriptor (org.springframework.beans.factory.config)
doResolveDependency:1135, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveDependency:1062, DefaultListableBeanFactory (org.springframework.beans.factory.support)
inject:583, AutowiredAnnotationBeanPostProcessor$AutowiredFieldElement (org.springframework.beans.factory.annotation)
inject:91, InjectionMetadata (org.springframework.beans.factory.annotation)
postProcessPropertyValues:372, AutowiredAnnotationBeanPostProcessor (org.springframework.beans.factory.annotation)
populateBean:1341, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:572, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 406749219 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$148)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
preInstantiateSingletons:759, DefaultListableBeanFactory (org.springframework.beans.factory.support)
finishBeanFactoryInitialization:869, AbstractApplicationContext (org.springframework.context.support)
refresh:550, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
    
~~~

~~~java
...org.springframework.beans.factory.annotation.AutowiredAnnotationBeanPostProcessor...
@Override
public PropertyValues postProcessPropertyValues(
    PropertyValues pvs, PropertyDescriptor[] pds, Object bean, String beanName) throws BeanCreationException {

    InjectionMetadata metadata = findAutowiringMetadata(beanName, bean.getClass(), pvs);
    try {
        //
        metadata.inject(bean, beanName, pvs);
    }
    catch (BeanCreationException ex) {
        throw ex;
    }
    catch (Throwable ex) {
        throw new BeanCreationException(beanName, "Injection of autowired dependencies failed", ex);
    }
    return pvs;
}

...org.springframework.beans.factory.annotation.InjectionMetadata...
public void inject(Object target, @Nullable String beanName, @Nullable PropertyValues pvs) throws Throwable {
    Collection<InjectedElement> checkedElements = this.checkedElements;
    Collection<InjectedElement> elementsToIterate =
        (checkedElements != null ? checkedElements : this.injectedElements);
    if (!elementsToIterate.isEmpty()) {
        boolean debug = logger.isDebugEnabled();
        for (InjectedElement element : elementsToIterate) {
            if (debug) {
                logger.debug("Processing injected element of bean '" + beanName + "': " + element);
            }
            //
            element.inject(target, beanName, pvs);
        }
    }
}

...org.springframework.beans.factory.annotation.AutowiredAnnotationBeanPostProcessor...
@Override
protected void inject(Object bean, @Nullable String beanName, @Nullable PropertyValues pvs) throws Throwable {
    Field field = (Field) this.member;
    Object value;
    if (this.cached) {
        value = resolvedCachedArgument(beanName, this.cachedFieldValue);
    }
    else {
        DependencyDescriptor desc = new DependencyDescriptor(field, this.required);
        desc.setContainingClass(bean.getClass());
        Set<String> autowiredBeanNames = new LinkedHashSet<>(1);
        Assert.state(beanFactory != null, "No BeanFactory available");
        TypeConverter typeConverter = beanFactory.getTypeConverter();
        try {
            //
            value = beanFactory.resolveDependency(desc, beanName, autowiredBeanNames, typeConverter);
        }
        catch (BeansException ex) {
            throw new UnsatisfiedDependencyException(null, beanName, new InjectionPoint(field), ex);
        }
        synchronized (this) {
            if (!this.cached) {
                if (value != null || this.required) {
                    this.cachedFieldValue = desc;
                    registerDependentBeans(beanName, autowiredBeanNames);
                    if (autowiredBeanNames.size() == 1) {
                        String autowiredBeanName = autowiredBeanNames.iterator().next();
                        if (beanFactory.containsBean(autowiredBeanName) &&
                            beanFactory.isTypeMatch(autowiredBeanName, field.getType())) {
                            this.cachedFieldValue = new ShortcutDependencyDescriptor(
                                desc, autowiredBeanName, field.getType());
                        }
                    }
                }
                else {
                    this.cachedFieldValue = null;
                }
                this.cached = true;
            }
        }
    }
    if (value != null) {
        ReflectionUtils.makeAccessible(field);
        field.set(bean, value);
    }
}
}

...org.springframework.beans.factory.support.DefaultListableBeanFactory...
@Override
@Nullable
public Object (DependencyDescriptor descriptor, @Nullable String requestingBeanName,
                                @Nullable Set<String> autowiredBeanNames, @Nullable TypeConverter typeConverter) throws BeansException {

    descriptor.initParameterNameDiscovery(getParameterNameDiscoverer());
    if (Optional.class == descriptor.getDependencyType()) {
        return createOptionalDependency(descriptor, requestingBeanName);
    }
    else if (ObjectFactory.class == descriptor.getDependencyType() ||
             ObjectProvider.class == descriptor.getDependencyType()) {
        return new DependencyObjectProvider(descriptor, requestingBeanName);
    }
    else if (javaxInjectProviderClass == descriptor.getDependencyType()) {
        return new Jsr330ProviderFactory().createDependencyProvider(descriptor, requestingBeanName);
    }
    else {
        Object result = getAutowireCandidateResolver().getLazyResolutionProxyIfNecessary(
            descriptor, requestingBeanName);
        if (result == null) {
            //
            result = doResolveDependency(descriptor, requestingBeanName, autowiredBeanNames, typeConverter);
        }
        return result;
    }
}

...org.springframework.beans.factory.support.DefaultListableBeanFactory...
    @Nullable
    public Object doResolveDependency(DependencyDescriptor descriptor, @Nullable String beanName,
                                      @Nullable Set<String> autowiredBeanNames, @Nullable TypeConverter typeConverter) throws BeansException {

    InjectionPoint previousInjectionPoint = ConstructorResolver.setCurrentInjectionPoint(descriptor);
    try {
        Object shortcut = descriptor.resolveShortcut(this);
        if (shortcut != null) {
            return shortcut;
        }

        Class<?> type = descriptor.getDependencyType();
        Object value = getAutowireCandidateResolver().getSuggestedValue(descriptor);
        if (value != null) {
            if (value instanceof String) {
                String strVal = resolveEmbeddedValue((String) value);
                BeanDefinition bd = (beanName != null && containsBean(beanName) ? getMergedBeanDefinition(beanName) : null);
                value = evaluateBeanDefinitionString(strVal, bd);
            }
            TypeConverter converter = (typeConverter != null ? typeConverter : getTypeConverter());
            return (descriptor.getField() != null ?
                    converter.convertIfNecessary(value, type, descriptor.getField()) :
                    converter.convertIfNecessary(value, type, descriptor.getMethodParameter()));
        }

        Object multipleBeans = resolveMultipleBeans(descriptor, beanName, autowiredBeanNames, typeConverter);
        if (multipleBeans != null) {
            return multipleBeans;
        }
		//findAutowireCandidates
        Map<String, Object> matchingBeans = findAutowireCandidates(beanName, type, descriptor);
        if (matchingBeans.isEmpty()) {
            if (isRequired(descriptor)) {
                raiseNoMatchingBeanFound(type, descriptor.getResolvableType(), descriptor);
            }
            return null;
        }

        String autowiredBeanName;
        Object instanceCandidate;

        if (matchingBeans.size() > 1) {
            autowiredBeanName = determineAutowireCandidate(matchingBeans, descriptor);
            if (autowiredBeanName == null) {
                if (isRequired(descriptor) || !indicatesMultipleBeans(type)) {
                    return descriptor.resolveNotUnique(type, matchingBeans);
                }
                else {
                    // In case of an optional Collection/Map, silently ignore a non-unique case:
                    // possibly it was meant to be an empty collection of multiple regular beans
                    // (before 4.3 in particular when we didn't even look for collection beans).
                    return null;
                }
            }
            instanceCandidate = matchingBeans.get(autowiredBeanName);
        }
        else {
            // We have exactly one match.
            Map.Entry<String, Object> entry = matchingBeans.entrySet().iterator().next();
            autowiredBeanName = entry.getKey();
            instanceCandidate = entry.getValue();
        }

        if (autowiredBeanNames != null) {
            autowiredBeanNames.add(autowiredBeanName);
        }
        
        //假如没找到bean  找到 class  resolveCandidate  只根据beanName 进行加载
        if (instanceCandidate instanceof Class) {
            instanceCandidate = descriptor.resolveCandidate(autowiredBeanName, type, this);
        }
        
        Object result = instanceCandidate;
        if (result instanceof NullBean) {
            if (isRequired(descriptor)) {
                raiseNoMatchingBeanFound(type, descriptor.getResolvableType(), descriptor);
            }
            result = null;
        }
        if (!ClassUtils.isAssignableValue(type, result)) {
            throw new BeanNotOfRequiredTypeException(autowiredBeanName, type, instanceCandidate.getClass());
        }
        return result;
    }
    finally {
        ConstructorResolver.setCurrentInjectionPoint(previousInjectionPoint);
    }
}
~~~

~~~java
...org.springframework.beans.factory.support.DefaultListableBeanFactory...
protected Map<String, Object> findAutowireCandidates(
    @Nullable String beanName, Class<?> requiredType, DependencyDescriptor descriptor) {

    String[] candidateNames = BeanFactoryUtils.beanNamesForTypeIncludingAncestors(
        this, requiredType, true, descriptor.isEager());
    Map<String, Object> result = new LinkedHashMap<>(candidateNames.length);
    for (Class<?> autowiringType : this.resolvableDependencies.keySet()) {
        if (autowiringType.isAssignableFrom(requiredType)) {
            Object autowiringValue = this.resolvableDependencies.get(autowiringType);
            autowiringValue = AutowireUtils.resolveAutowiringValue(autowiringValue, requiredType);
            if (requiredType.isInstance(autowiringValue)) {
                result.put(ObjectUtils.identityToString(autowiringValue), autowiringValue);
                break;
            }
        }
    }
    for (String candidate : candidateNames) {
        if (!isSelfReference(beanName, candidate) && isAutowireCandidate(candidate, descriptor)) {
            //这里传入的requireType
            addCandidateEntry(result, candidate, descriptor, requiredType);
        }
    }
    if (result.isEmpty() && !indicatesMultipleBeans(requiredType)) {
        // Consider fallback matches if the first pass failed to find anything...
        DependencyDescriptor fallbackDescriptor = descriptor.forFallbackMatch();
        for (String candidate : candidateNames) {
            if (!isSelfReference(beanName, candidate) && isAutowireCandidate(candidate, fallbackDescriptor)) {
                addCandidateEntry(result, candidate, descriptor, requiredType);
            }
        }
        if (result.isEmpty()) {
            // Consider self references as a final pass...
            // but in the case of a dependency collection, not the very same bean itself.
            for (String candidate : candidateNames) {
                if (isSelfReference(beanName, candidate) &&
                    (!(descriptor instanceof MultiElementDescriptor) || !beanName.equals(candidate)) &&
                    isAutowireCandidate(candidate, fallbackDescriptor)) {
                    addCandidateEntry(result, candidate, descriptor, requiredType);
                }
            }
        }
    }
    return result;
}

//这里传入的requireType 不起作用
private void addCandidateEntry(Map<String, Object> candidates, String candidateName,
                               DependencyDescriptor descriptor, Class<?> requiredType) {

    if (descriptor instanceof MultiElementDescriptor || containsSingleton(candidateName)) {
        //
        Object beanInstance = descriptor.resolveCandidate(candidateName, requiredType, this);
        candidates.put(candidateName, (beanInstance instanceof NullBean ? null : beanInstance));
    }
    else {
        //
        candidates.put(candidateName, getType(candidateName));
    }
}


//此方法根据bean的名字寻找class
@Override
@Nullable
public Class<?> getType(String name) throws NoSuchBeanDefinitionException {
    String beanName = transformedBeanName(name);

    // Check manually registered singletons.
    Object beanInstance = getSingleton(beanName, false);
    if (beanInstance != null && beanInstance.getClass() != NullBean.class) {
        if (beanInstance instanceof FactoryBean && !BeanFactoryUtils.isFactoryDereference(name)) {
            return getTypeForFactoryBean((FactoryBean<?>) beanInstance);
        }
        else {
            return beanInstance.getClass();
        }
    }

    // No singleton instance found -> check bean definition.
    BeanFactory parentBeanFactory = getParentBeanFactory();
    if (parentBeanFactory != null && !containsBeanDefinition(beanName)) {
        // No bean definition found in this factory -> delegate to parent.
        return parentBeanFactory.getType(originalBeanName(name));
    }

    RootBeanDefinition mbd = getMergedLocalBeanDefinition(beanName);

    // Check decorated bean definition, if any: We assume it'll be easier
    // to determine the decorated bean's type than the proxy's type.
    BeanDefinitionHolder dbd = mbd.getDecoratedDefinition();
    if (dbd != null && !BeanFactoryUtils.isFactoryDereference(name)) {
        RootBeanDefinition tbd = getMergedBeanDefinition(dbd.getBeanName(), dbd.getBeanDefinition(), mbd);
        Class<?> targetClass = predictBeanType(dbd.getBeanName(), tbd);
        if (targetClass != null && !FactoryBean.class.isAssignableFrom(targetClass)) {
            return targetClass;
        }
    }

    //这里会执行 SmartInstantiationAwareBeanPostProcessor 处理器
    Class<?> beanClass = predictBeanType(beanName, mbd);

    // Check bean class whether we're dealing with a FactoryBean.
    if (beanClass != null && FactoryBean.class.isAssignableFrom(beanClass)) {
        if (!BeanFactoryUtils.isFactoryDereference(name)) {
            // If it's a FactoryBean, we want to look at what it creates, not at the factory class.
            return getTypeForFactoryBean(beanName, mbd);
        }
        else {
            return beanClass;
        }
    }
    else {
        return (!BeanFactoryUtils.isFactoryDereference(name) ? beanClass : null);
    }
}
~~~

~~~java
...org.springframework.beans.factory.config.DependencyDescriptor...
public Object resolveCandidate(String beanName, Class<?> requiredType, BeanFactory beanFactory)
    throws BeansException {
	//getBean 流程
    return beanFactory.getBean(beanName);
}
~~~





##### 自动注入模式调用栈 （org.mybatis.spring.mapper.MapperFactoryBean）

~~~java
setAddToConfig:146, MapperFactoryBean (org.mybatis.spring.mapper)
invoke0:-1, NativeMethodAccessorImpl (sun.reflect)
invoke:62, NativeMethodAccessorImpl (sun.reflect)
invoke:43, DelegatingMethodAccessorImpl (sun.reflect)
invoke:498, Method (java.lang.reflect)
//反射调用
setValue:332, BeanWrapperImpl$BeanPropertyHandler (org.springframework.beans)
processLocalProperty:458, AbstractNestablePropertyAccessor (org.springframework.beans)
setPropertyValue:278, AbstractNestablePropertyAccessor (org.springframework.beans)
setPropertyValue:266, AbstractNestablePropertyAccessor (org.springframework.beans)
setPropertyValues:97, AbstractPropertyAccessor (org.springframework.beans)
setPropertyValues:77, AbstractPropertyAccessor (org.springframework.beans)
applyPropertyValues:1635, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//自动注入模式
populateBean:1354, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:572, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 635610193 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$148)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
resolveCandidate:251, DependencyDescriptor (org.springframework.beans.factory.config)
doResolveDependency:1135, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveDependency:1062, DefaultListableBeanFactory (org.springframework.beans.factory.support)
inject:583, AutowiredAnnotationBeanPostProcessor$AutowiredFieldElement (org.springframework.beans.factory.annotation)
inject:91, InjectionMetadata (org.springframework.beans.factory.annotation)
postProcessPropertyValues:372, AutowiredAnnotationBeanPostProcessor (org.springframework.beans.factory.annotation)
populateBean:1341, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:572, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 635610193 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$148)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
resolveCandidate:251, DependencyDescriptor (org.springframework.beans.factory.config)
doResolveDependency:1135, DefaultListableBeanFactory (org.springframework.beans.factory.support)
resolveDependency:1062, DefaultListableBeanFactory (org.springframework.beans.factory.support)
inject:583, AutowiredAnnotationBeanPostProcessor$AutowiredFieldElement (org.springframework.beans.factory.annotation)
inject:91, InjectionMetadata (org.springframework.beans.factory.annotation)
postProcessPropertyValues:372, AutowiredAnnotationBeanPostProcessor (org.springframework.beans.factory.annotation)
populateBean:1341, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:572, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 635610193 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$148)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
preInstantiateSingletons:759, DefaultListableBeanFactory (org.springframework.beans.factory.support)
finishBeanFactoryInitialization:869, AbstractApplicationContext (org.springframework.context.support)
refresh:550, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~



~~~java
...org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory...	
    
    
protected void populateBean(String beanName, RootBeanDefinition mbd, @Nullable BeanWrapper bw) {
		if (bw == null) {
			if (mbd.hasPropertyValues()) {
				throw new BeanCreationException(
						mbd.getResourceDescription(), beanName, "Cannot apply property values to null instance");
			}
			else {
				// Skip property population phase for null instance.
				return;
			}
		}

		// Give any InstantiationAwareBeanPostProcessors the opportunity to modify the
		// state of the bean before properties are set. This can be used, for example,
		// to support styles of field injection.
		boolean continueWithPropertyPopulation = true;

		if (!mbd.isSynthetic() && hasInstantiationAwareBeanPostProcessors()) {
			for (BeanPostProcessor bp : getBeanPostProcessors()) {
				if (bp instanceof InstantiationAwareBeanPostProcessor) {
					InstantiationAwareBeanPostProcessor ibp = (InstantiationAwareBeanPostProcessor) bp;
					if (!ibp.postProcessAfterInstantiation(bw.getWrappedInstance(), beanName)) {
						continueWithPropertyPopulation = false;
						break;
					}
				}
			}
		}

		if (!continueWithPropertyPopulation) {
			return;
		}

		PropertyValues pvs = (mbd.hasPropertyValues() ? mbd.getPropertyValues() : null);
		//自动注入模式
		if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_NAME ||
				mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_TYPE) {
			MutablePropertyValues newPvs = new MutablePropertyValues(pvs);

			// Add property values based on autowire by name if applicable.
			if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_NAME) {
				autowireByName(beanName, mbd, bw, newPvs);
			}

			// Add property values based on autowire by type if applicable.
			if (mbd.getResolvedAutowireMode() == RootBeanDefinition.AUTOWIRE_BY_TYPE) {
                //符合要求且pvs不存在的属性 进行按类型注入
				autowireByType(beanName, mbd, bw, newPvs);
			}

			pvs = newPvs;
		}

		boolean hasInstAwareBpps = hasInstantiationAwareBeanPostProcessors();
		boolean needsDepCheck = (mbd.getDependencyCheck() != RootBeanDefinition.DEPENDENCY_CHECK_NONE);

		if (hasInstAwareBpps || needsDepCheck) {
			if (pvs == null) {
				pvs = mbd.getPropertyValues();
			}
			PropertyDescriptor[] filteredPds = filterPropertyDescriptorsForDependencyCheck(bw, mbd.allowCaching);
			if (hasInstAwareBpps) {
				for (BeanPostProcessor bp : getBeanPostProcessors()) {
					if (bp instanceof InstantiationAwareBeanPostProcessor) {
						InstantiationAwareBeanPostProcessor ibp = (InstantiationAwareBeanPostProcessor) bp;
                        //InstantiationAwareBeanPostProcessor 有一个会处理注解注入
						pvs = ibp.postProcessPropertyValues(pvs, filteredPds, bw.getWrappedInstance(), beanName);
						if (pvs == null) {
							return;
						}
					}
				}
			}
			if (needsDepCheck) {
				checkDependencies(beanName, mbd, filteredPds, pvs);
			}
		}

		if (pvs != null) {
            //开始自动注入
			applyPropertyValues(beanName, mbd, bw, pvs);
		}
	}    
    

protected void applyPropertyValues(String beanName, BeanDefinition mbd, BeanWrapper bw, PropertyValues pvs) {
		if (pvs.isEmpty()) {
			return;
		}

		if (System.getSecurityManager() != null && bw instanceof BeanWrapperImpl) {
			((BeanWrapperImpl) bw).setSecurityContext(getAccessControlContext());
		}

		MutablePropertyValues mpvs = null;
		List<PropertyValue> original;

		if (pvs instanceof MutablePropertyValues) {
			mpvs = (MutablePropertyValues) pvs;
			if (mpvs.isConverted()) {
				// Shortcut: use the pre-converted values as-is.
				try {
					bw.setPropertyValues(mpvs);
					return;
				}
				catch (BeansException ex) {
					throw new BeanCreationException(
							mbd.getResourceDescription(), beanName, "Error setting property values", ex);
				}
			}
			original = mpvs.getPropertyValueList();
		}
		else {
			original = Arrays.asList(pvs.getPropertyValues());
		}

		TypeConverter converter = getCustomTypeConverter();
		if (converter == null) {
			converter = bw;
		}
		BeanDefinitionValueResolver valueResolver = new BeanDefinitionValueResolver(this, beanName, mbd, converter);

		// Create a deep copy, resolving any references for values.
		List<PropertyValue> deepCopy = new ArrayList<>(original.size());
		boolean resolveNecessary = false;
		for (PropertyValue pv : original) {
			if (pv.isConverted()) {
				deepCopy.add(pv);
			}
			else {
				String propertyName = pv.getName();
				Object originalValue = pv.getValue();
				Object resolvedValue = valueResolver.resolveValueIfNecessary(pv, originalValue);
				Object convertedValue = resolvedValue;
				boolean convertible = bw.isWritableProperty(propertyName) &&
						!PropertyAccessorUtils.isNestedOrIndexedProperty(propertyName);
				if (convertible) {
					convertedValue = convertForProperty(resolvedValue, propertyName, bw, converter);
				}
				// Possibly store converted value in merged bean definition,
				// in order to avoid re-conversion for every created bean instance.
				if (resolvedValue == originalValue) {
					if (convertible) {
						pv.setConvertedValue(convertedValue);
					}
					deepCopy.add(pv);
				}
				else if (convertible && originalValue instanceof TypedStringValue &&
						!((TypedStringValue) originalValue).isDynamic() &&
						!(convertedValue instanceof Collection || ObjectUtils.isArray(convertedValue))) {
					pv.setConvertedValue(convertedValue);
					deepCopy.add(pv);
				}
				else {
					resolveNecessary = true;
					deepCopy.add(new PropertyValue(pv, convertedValue));
				}
			}
		}
		if (mpvs != null && !resolveNecessary) {
			mpvs.setConverted();
		}

		// Set our (possibly massaged) deep copy.
		try {
            //这里最后反射调用注入
			bw.setPropertyValues(new MutablePropertyValues(deepCopy));
		}
		catch (BeansException ex) {
			throw new BeanCreationException(
					mbd.getResourceDescription(), beanName, "Error setting property values", ex);
		}
	}
~~~

##### @Configuration @Bean 和 继承 ServletContextInitializer接口的bean 的初始化过程

~~~java
<init>:-1, ShiroWebFilterConfiguration$$EnhancerBySpringCGLIB$$ba4cdc32 (org.apache.shiro.spring.config.web.autoconfigure)
//实例化配置类本身
newInstance0:-1, NativeConstructorAccessorImpl (sun.reflect)
newInstance:62, NativeConstructorAccessorImpl (sun.reflect)
newInstance:45, DelegatingConstructorAccessorImpl (sun.reflect)
newInstance:422, Constructor (java.lang.reflect)
instantiateClass:170, BeanUtils (org.springframework.beans)
instantiate:87, SimpleInstantiationStrategy (org.springframework.beans.factory.support)
instantiateBean:1221, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBeanInstance:1128, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:535, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//获取不到则创建
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 422522663 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$138)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
//则获取该工厂
instantiateUsingFactoryMethod:372, ConstructorResolver (org.springframework.beans.factory.support)
instantiateUsingFactoryMethod:1247, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//根据beanDefination发现这个@Bean是由factoryMethod生成 
createBeanInstance:1096, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:535, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
//这里创建的是@Bean
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 422522663 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$138)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:204, AbstractBeanFactory (org.springframework.beans.factory.support)
getOrderedBeansOfType:226, ServletContextInitializerBeans (org.springframework.boot.web.servlet)
getOrderedBeansOfType:214, ServletContextInitializerBeans (org.springframework.boot.web.servlet)
addServletContextInitializerBeans:91, ServletContextInitializerBeans (org.springframework.boot.web.servlet)
<init>:80, ServletContextInitializerBeans (org.springframework.boot.web.servlet)
getServletContextInitializerBeans:250, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
//这里会初始化继承ServletContextInitializer的bean
selfInitialize:237, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
onStartup:-1, 874634941 (org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext$$Lambda$301)
onStartup:54, TomcatStarter (org.springframework.boot.web.embedded.tomcat)
startInternal:5245, StandardContext (org.apache.catalina.core)
// Call ServletContainerInitializers
start:150, LifecycleBase (org.apache.catalina.util)
call:1421, ContainerBase$StartChild (org.apache.catalina.core)
call:1411, ContainerBase$StartChild (org.apache.catalina.core)
run$$$capture:266, FutureTask (java.util.concurrent)
run:-1, FutureTask (java.util.concurrent)
 - Async stack trace
<init>:132, FutureTask (java.util.concurrent)
newTaskFor:102, AbstractExecutorService (java.util.concurrent)
submit:133, AbstractExecutorService (java.util.concurrent)
startInternal:935, ContainerBase (org.apache.catalina.core)
startInternal:872, StandardHost (org.apache.catalina.core)
start:150, LifecycleBase (org.apache.catalina.util)
call:1421, ContainerBase$StartChild (org.apache.catalina.core)
call:1411, ContainerBase$StartChild (org.apache.catalina.core)
run$$$capture:266, FutureTask (java.util.concurrent)
run:-1, FutureTask (java.util.concurrent)
 - Async stack trace
<init>:132, FutureTask (java.util.concurrent)
newTaskFor:102, AbstractExecutorService (java.util.concurrent)
submit:133, AbstractExecutorService (java.util.concurrent)
startInternal:935, ContainerBase (org.apache.catalina.core)
startInternal:262, StandardEngine (org.apache.catalina.core)
start:150, LifecycleBase (org.apache.catalina.util)
startInternal:422, StandardService (org.apache.catalina.core)
start:150, LifecycleBase (org.apache.catalina.util)
startInternal:793, StandardServer (org.apache.catalina.core)
start:150, LifecycleBase (org.apache.catalina.util)
start:367, Tomcat (org.apache.catalina.startup)
initialize:107, TomcatWebServer (org.springframework.boot.web.embedded.tomcat)
<init>:86, TomcatWebServer (org.springframework.boot.web.embedded.tomcat)
getTomcatWebServer:413, TomcatServletWebServerFactory (org.springframework.boot.web.embedded.tomcat)
getWebServer:174, TomcatServletWebServerFactory (org.springframework.boot.web.embedded.tomcat)
createWebServer:179, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
onRefresh:152, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:544, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~

##### @Configuration @Bean 生成beanDefination（spingboot）

~~~java
setFactoryMethodName:785, AbstractBeanDefinition (org.springframework.beans.factory.support)
setUniqueFactoryMethodName:330, RootBeanDefinition (org.springframework.beans.factory.support)
loadBeanDefinitionsForBeanMethod:222, ConfigurationClassBeanDefinitionReader (org.springframework.context.annotation)
loadBeanDefinitionsForConfigurationClass:141, ConfigurationClassBeanDefinitionReader (org.springframework.context.annotation)
loadBeanDefinitions:117, ConfigurationClassBeanDefinitionReader (org.springframework.context.annotation)
processConfigBeanDefinitions:328, ConfigurationClassPostProcessor (org.springframework.context.annotation)
postProcessBeanDefinitionRegistry:233, ConfigurationClassPostProcessor (org.springframework.context.annotation)
//专门处理@Configuration @bean定义的后置处理器
invokeBeanDefinitionRegistryPostProcessors:271, PostProcessorRegistrationDelegate (org.springframework.context.support)
invokeBeanFactoryPostProcessors:91, PostProcessorRegistrationDelegate (org.springframework.context.support)
invokeBeanFactoryPostProcessors:694, AbstractApplicationContext (org.springframework.context.support)
refresh:532, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~

~~~java
// Invoke factory processors registered as beans in the context.
invokeBeanFactoryPostProcessors(beanFactory);
~~~

~~~java
protected void (ConfigurableListableBeanFactory beanFactory) {
    //委任给这个
    PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors(beanFactory, getBeanFactoryPostProcessors());

    // Detect a LoadTimeWeaver and prepare for weaving, if found in the meantime
    // (e.g. through an @Bean method registered by ConfigurationClassPostProcessor)
    if (beanFactory.getTempClassLoader() == null && beanFactory.containsBean(LOAD_TIME_WEAVER_BEAN_NAME)) {
        beanFactory.addBeanPostProcessor(new LoadTimeWeaverAwareProcessor(beanFactory));
        beanFactory.setTempClassLoader(new ContextTypeMatchClassLoader(beanFactory.getBeanClassLoader()));
    }
}


public static void invokeBeanFactoryPostProcessors(
			ConfigurableListableBeanFactory beanFactory, List<BeanFactoryPostProcessor> beanFactoryPostProcessors) {

		// Invoke BeanDefinitionRegistryPostProcessors first, if any.
		Set<String> processedBeans = new HashSet<>();

    	//注册beanDeinition用
		if (beanFactory instanceof BeanDefinitionRegistry) {
			BeanDefinitionRegistry registry = (BeanDefinitionRegistry) beanFactory;
			//平常处理器
			List<BeanFactoryPostProcessor> regularPostProcessors = new ArrayList<>();
            //注册处理器
			List<BeanDefinitionRegistryPostProcessor> registryProcessors = new ArrayList<>();
            //分组操作
			for (BeanFactoryPostProcessor postProcessor : beanFactoryPostProcessors) {
				if (postProcessor instanceof BeanDefinitionRegistryPostProcessor) {
					BeanDefinitionRegistryPostProcessor registryProcessor =
							(BeanDefinitionRegistryPostProcessor) postProcessor;
                    //初始的已经注册过
					registryProcessor.postProcessBeanDefinitionRegistry(registry);
					registryProcessors.add(registryProcessor);
				}
				else {
					regularPostProcessors.add(postProcessor);
				}
			}

			// Do not initialize FactoryBeans here: We need to leave all regular beans
			// uninitialized to let the bean factory post-processors apply to them!
			// Separate between BeanDefinitionRegistryPostProcessors that implement
			// PriorityOrdered, Ordered, and the rest.
			List<BeanDefinitionRegistryPostProcessor> currentRegistryProcessors = new ArrayList<>();

			// First, invoke the BeanDefinitionRegistryPostProcessors that implement PriorityOrdered.
            //初始化实现接口PriorityOrdered的 并调用注册
			String[] postProcessorNames =
					beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
			for (String ppName : postProcessorNames) {
				if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
					currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
					processedBeans.add(ppName);
				}
			}
			sortPostProcessors(currentRegistryProcessors, beanFactory);
			registryProcessors.addAll(currentRegistryProcessors);
			invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
			currentRegistryProcessors.clear();

			// Next, invoke the BeanDefinitionRegistryPostProcessors that implement Ordered.
             //初始化实现接口Ordered的 并调用注册
			postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
			for (String ppName : postProcessorNames) {
				if (!processedBeans.contains(ppName) && beanFactory.isTypeMatch(ppName, Ordered.class)) {
					currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
					processedBeans.add(ppName);
				}
			}
			sortPostProcessors(currentRegistryProcessors, beanFactory);
			registryProcessors.addAll(currentRegistryProcessors);
            //处理
			invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
			currentRegistryProcessors.clear();

			// Finally, invoke all other BeanDefinitionRegistryPostProcessors until no further ones appear.
			boolean reiterate = true;
			while (reiterate) {
				reiterate = false;
				postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
				for (String ppName : postProcessorNames) {
					if (!processedBeans.contains(ppName)) {
						currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
						processedBeans.add(ppName);
						reiterate = true;
					}
				}
				sortPostProcessors(currentRegistryProcessors, beanFactory);
				registryProcessors.addAll(currentRegistryProcessors);
				invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
				currentRegistryProcessors.clear();
			}

			// Now, invoke the postProcessBeanFactory callback of all processors handled so far.
            //再调用BeanFactoryPostProcessor功能   其中这里会给@Configureration的beandef的beanclass设置为代理类
			invokeBeanFactoryPostProcessors(registryProcessors, beanFactory);
			invokeBeanFactoryPostProcessors(regularPostProcessors, beanFactory);
		}

		else {
			// Invoke factory processors registered with the context instance.
			invokeBeanFactoryPostProcessors(beanFactoryPostProcessors, beanFactory);
		}

		// Do not initialize FactoryBeans here: We need to leave all regular beans
		// uninitialized to let the bean factory post-processors apply to them!
		String[] postProcessorNames =
				beanFactory.getBeanNamesForType(BeanFactoryPostProcessor.class, true, false);

		// Separate between BeanFactoryPostProcessors that implement PriorityOrdered,
		// Ordered, and the rest.
		List<BeanFactoryPostProcessor> priorityOrderedPostProcessors = new ArrayList<>();
		List<String> orderedPostProcessorNames = new ArrayList<>();
		List<String> nonOrderedPostProcessorNames = new ArrayList<>();
		for (String ppName : postProcessorNames) {
			if (processedBeans.contains(ppName)) {
				// skip - already processed in first phase above
			}
			else if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
				priorityOrderedPostProcessors.add(beanFactory.getBean(ppName, BeanFactoryPostProcessor.class));
			}
			else if (beanFactory.isTypeMatch(ppName, Ordered.class)) {
				orderedPostProcessorNames.add(ppName);
			}
			else {
				nonOrderedPostProcessorNames.add(ppName);
			}
		}

		// First, invoke the BeanFactoryPostProcessors that implement PriorityOrdered.
		sortPostProcessors(priorityOrderedPostProcessors, beanFactory);
		invokeBeanFactoryPostProcessors(priorityOrderedPostProcessors, beanFactory);

		// Next, invoke the BeanFactoryPostProcessors that implement Ordered.
		List<BeanFactoryPostProcessor> orderedPostProcessors = new ArrayList<>();
		for (String postProcessorName : orderedPostProcessorNames) {
			orderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
		}
		sortPostProcessors(orderedPostProcessors, beanFactory);
		invokeBeanFactoryPostProcessors(orderedPostProcessors, beanFactory);

		// Finally, invoke all other BeanFactoryPostProcessors.
		List<BeanFactoryPostProcessor> nonOrderedPostProcessors = new ArrayList<>();
		for (String postProcessorName : nonOrderedPostProcessorNames) {
			nonOrderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
		}
		invokeBeanFactoryPostProcessors(nonOrderedPostProcessors, beanFactory);

		// Clear cached merged bean definitions since the post-processors might have
		// modified the original metadata, e.g. replacing placeholders in values...
		beanFactory.clearMetadataCache();
	}



	private static void invokeBeanDefinitionRegistryPostProcessors(
			Collection<? extends BeanDefinitionRegistryPostProcessor> postProcessors, BeanDefinitionRegistry registry) {

		for (BeanDefinitionRegistryPostProcessor postProcessor : postProcessors) {
            //这里处理的第一个入口
			postProcessor.postProcessBeanDefinitionRegistry(registry);
		}
	}

~~~

~~~java
...org.springframework.context.annotation.ConfigurationClassPostProcessor...  
      每一个BeanMethod factoryMethodName
@Override
	public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
		int registryId = System.identityHashCode(registry);
		if (this.registriesPostProcessed.contains(registryId)) {
			throw new IllegalStateException(
					"postProcessBeanDefinitionRegistry already called on this post-processor against " + registry);
		}
		if (this.factoriesPostProcessed.contains(registryId)) {
			throw new IllegalStateException(
					"postProcessBeanFactory already called on this post-processor against " + registry);
		}
		this.registriesPostProcessed.add(registryId);
		//
		processConfigBeanDefinitions(registry);
	}
~~~

~~~java
...org.springframework.context.annotation.ConfigurationClassPostProcessor..
	public void processConfigBeanDefinitions(BeanDefinitionRegistry registry) {
		List<BeanDefinitionHolder> configCandidates = new ArrayList<>();
		String[] candidateNames = registry.getBeanDefinitionNames();

		for (String beanName : candidateNames) {
			BeanDefinition beanDef = registry.getBeanDefinition(beanName);
			if (ConfigurationClassUtils.isFullConfigurationClass(beanDef) ||
					ConfigurationClassUtils.isLiteConfigurationClass(beanDef)) {
				if (logger.isDebugEnabled()) {
					logger.debug("Bean definition has already been processed as a configuration class: " + beanDef);
				}
			}
            //@Configuration @Component 等等
            //分为全配置和轻配置
			else if (ConfigurationClassUtils.checkConfigurationClassCandidate(beanDef, this.metadataReaderFactory)) {
				configCandidates.add(new BeanDefinitionHolder(beanDef, beanName));
			}
		}

		// Return immediately if no @Configuration classes were found
		if (configCandidates.isEmpty()) {
			return;
		}

		// Sort by previously determined @Order value, if applicable
		configCandidates.sort((bd1, bd2) -> {
			int i1 = ConfigurationClassUtils.getOrder(bd1.getBeanDefinition());
			int i2 = ConfigurationClassUtils.getOrder(bd2.getBeanDefinition());
			return Integer.compare(i1, i2);
		});

		// Detect any custom bean name generation strategy supplied through the enclosing application context
		SingletonBeanRegistry sbr = null;
		if (registry instanceof SingletonBeanRegistry) {
			sbr = (SingletonBeanRegistry) registry;
			if (!this.localBeanNameGeneratorSet) {
				BeanNameGenerator generator = (BeanNameGenerator) sbr.getSingleton(CONFIGURATION_BEAN_NAME_GENERATOR);
				if (generator != null) {
					this.componentScanBeanNameGenerator = generator;
					this.importBeanNameGenerator = generator;
				}
			}
		}

		if (this.environment == null) {
			this.environment = new StandardEnvironment();
		}

		// Parse each @Configuration class
		ConfigurationClassParser parser = new ConfigurationClassParser(
				this.metadataReaderFactory, this.problemReporter, this.environment,
				this.resourceLoader, this.componentScanBeanNameGenerator, registry);

		Set<BeanDefinitionHolder> candidates = new LinkedHashSet<>(configCandidates);
		Set<ConfigurationClass> alreadyParsed = new HashSet<>(configCandidates.size());
		do {
            //
			parser.parse(candidates);
			parser.validate();

			Set<ConfigurationClass> configClasses = new LinkedHashSet<>(parser.getConfigurationClasses());
			configClasses.removeAll(alreadyParsed);

			// Read the model and create bean definitions based on its content
			if (this.reader == null) {
				this.reader = new ConfigurationClassBeanDefinitionReader(
						registry, this.sourceExtractor, this.resourceLoader, this.environment,
						this.importBeanNameGenerator, parser.getImportRegistry());
			}
            //这里
			this.reader.loadBeanDefinitions(configClasses);
			alreadyParsed.addAll(configClasses);

			candidates.clear();
			if (registry.getBeanDefinitionCount() > candidateNames.length) {
				String[] newCandidateNames = registry.getBeanDefinitionNames();
				Set<String> oldCandidateNames = new HashSet<>(Arrays.asList(candidateNames));
				Set<String> alreadyParsedClasses = new HashSet<>();
				for (ConfigurationClass configurationClass : alreadyParsed) {
					alreadyParsedClasses.add(configurationClass.getMetadata().getClassName());
				}
				for (String candidateName : newCandidateNames) {
					if (!oldCandidateNames.contains(candidateName)) {
						BeanDefinition bd = registry.getBeanDefinition(candidateName);
						if (ConfigurationClassUtils.checkConfigurationClassCandidate(bd, this.metadataReaderFactory) &&
								!alreadyParsedClasses.contains(bd.getBeanClassName())) {
							candidates.add(new BeanDefinitionHolder(bd, candidateName));
						}
					}
				}
				candidateNames = newCandidateNames;
			}
		}
		while (!candidates.isEmpty());

		// Register the ImportRegistry as a bean in order to support ImportAware @Configuration classes
		if (sbr != null && !sbr.containsSingleton(IMPORT_REGISTRY_BEAN_NAME)) {
			sbr.registerSingleton(IMPORT_REGISTRY_BEAN_NAME, parser.getImportRegistry());
		}

		if (this.metadataReaderFactory instanceof CachingMetadataReaderFactory) {
			// Clear cache in externally provided MetadataReaderFactory; this is a no-op
			// for a shared cache since it'll be cleared by the ApplicationContext.
			((CachingMetadataReaderFactory) this.metadataReaderFactory).clearCache();
		}
	}
~~~

~~~java
doProcessConfigurationClass:281, ConfigurationClassParser (org.springframework.context.annotation)
processConfigurationClass:245, ConfigurationClassParser (org.springframework.context.annotation)
parse:202, ConfigurationClassParser (org.springframework.context.annotation)
parse:170, ConfigurationClassParser (org.springframework.context.annotation)
processConfigBeanDefinitions:316, ConfigurationClassPostProcessor (org.springframework.context.annotation)
postProcessBeanDefinitionRegistry:233, ConfigurationClassPostProcessor (org.springframework.context.annotation)
invokeBeanDefinitionRegistryPostProcessors:271, PostProcessorRegistrationDelegate (org.springframework.context.support)
invokeBeanFactoryPostProcessors:91, PostProcessorRegistrationDelegate (org.springframework.context.support)
invokeBeanFactoryPostProcessors:694, AbstractApplicationContext (org.springframework.context.support)
refresh:532, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:17, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~

~~~java
...............
// Recursively process the configuration class and its superclass hierarchy.
SourceClass sourceClass = asSourceClass(configClass);
do {
    sourceClass = doProcessConfigurationClass(configClass, sourceClass);
}
while (sourceClass != null);	
...............

//这是一个解析收集需要注册各种beandefinition信息的过程    
protected final SourceClass doProcessConfigurationClass(ConfigurationClass configClass, SourceClass sourceClass)
			throws IOException {
		// Recursively process any member (nested) classes first
		processMemberClasses(configClass, sourceClass);

		// Process any @PropertySource annotations
		for (AnnotationAttributes propertySource : AnnotationConfigUtils.attributesForRepeatable(
				sourceClass.getMetadata(), PropertySources.class,
				org.springframework.context.annotation.PropertySource.class)) {
			if (this.environment instanceof ConfigurableEnvironment) {
				processPropertySource(propertySource);
			}
			else {
				logger.warn("Ignoring @PropertySource annotation on [" + sourceClass.getMetadata().getClassName() +
						"]. Reason: Environment must implement ConfigurableEnvironment");
			}
		}

		// Process any @ComponentScan annotations
		Set<AnnotationAttributes> componentScans = AnnotationConfigUtils.attributesForRepeatable(
				sourceClass.getMetadata(), ComponentScans.class, ComponentScan.class);
		if (!componentScans.isEmpty() &&
				!this.conditionEvaluator.shouldSkip(sourceClass.getMetadata(), ConfigurationPhase.REGISTER_BEAN)) {
			for (AnnotationAttributes componentScan : componentScans) {
				// The config class is annotated with @ComponentScan -> perform the scan immediately
				Set<BeanDefinitionHolder> scannedBeanDefinitions =
						this.componentScanParser.parse(componentScan, sourceClass.getMetadata().getClassName());
				// Check the set of scanned definitions for any further config classes and parse recursively if needed
				for (BeanDefinitionHolder holder : scannedBeanDefinitions) {
					BeanDefinition bdCand = holder.getBeanDefinition().getOriginatingBeanDefinition();
					if (bdCand == null) {
						bdCand = holder.getBeanDefinition();
					}
                    //这里递归处理了其他的@Configuration  //包括@Component注解
					if (ConfigurationClassUtils.checkConfigurationClassCandidate(bdCand, this.metadataReaderFactory)) {
						parse(bdCand.getBeanClassName(), holder.getBeanName());
					}
				}
			}
		}

		// Process any @Import annotations
		processImports(configClass, sourceClass, getImports(sourceClass), true);

		// Process any @ImportResource annotations
		AnnotationAttributes importResource =
				AnnotationConfigUtils.attributesFor(sourceClass.getMetadata(), ImportResource.class);
		if (importResource != null) {
			String[] resources = importResource.getStringArray("locations");
			Class<? extends BeanDefinitionReader> readerClass = importResource.getClass("reader");
			for (String resource : resources) {
				String resolvedResource = this.environment.resolveRequiredPlaceholders(resource);
				configClass.addImportedResource(resolvedResource, readerClass);
			}
		}
        
		
		// Process individual @Bean methods
		Set<MethodMetadata> beanMethods = retrieveBeanMethodMetadata(sourceClass);
		for (MethodMetadata methodMetadata : beanMethods) {
			configClass.addBeanMethod(new BeanMethod(methodMetadata, configClass));
		}

		// Process default methods on interfaces
		processInterfaces(configClass, sourceClass);

		// Process superclass, if any
		if (sourceClass.getMetadata().hasSuperClass()) {
			String superclass = sourceClass.getMetadata().getSuperClassName();
			if (superclass != null && !superclass.startsWith("java") &&
					!this.knownSuperclasses.containsKey(superclass)) {
				this.knownSuperclasses.put(superclass, configClass);
				// Superclass found, return its annotation metadata and recurse
				return sourceClass.getSuperClass();
			}
		}

		// No superclass -> processing is complete
		return null;
	}
~~~

###### loadBeanDefinitions（这是注册上面解析收集的各种beandefinition信息的过程 ）

~~~java
...org.springframework.context.annotation.ConfigurationClassBeanDefinitionReader...	
public void loadBeanDefinitions(Set<ConfigurationClass> configurationModel) {
		TrackedConditionEvaluator trackedConditionEvaluator = new TrackedConditionEvaluator();
		for (ConfigurationClass configClass : configurationModel) {
            //这里
			loadBeanDefinitionsForConfigurationClass(configClass, trackedConditionEvaluator);
		}
	}

	private void loadBeanDefinitionsForConfigurationClass(
			ConfigurationClass configClass, TrackedConditionEvaluator trackedConditionEvaluator) {

		if (trackedConditionEvaluator.shouldSkip(configClass)) {
			String beanName = configClass.getBeanName();
			if (StringUtils.hasLength(beanName) && this.registry.containsBeanDefinition(beanName)) {
				this.registry.removeBeanDefinition(beanName);
			}
			this.importRegistry.removeImportingClass(configClass.getMetadata().getClassName());
			return;
		}

		if (configClass.isImported()) {
			registerBeanDefinitionForImportedConfigurationClass(configClass);
		}
		for (BeanMethod beanMethod : configClass.getBeanMethods()) {
            //这里
			loadBeanDefinitionsForBeanMethod(beanMethod);
		}

		loadBeanDefinitionsFromImportedResources(configClass.getImportedResources());
		loadBeanDefinitionsFromRegistrars(configClass.getImportBeanDefinitionRegistrars());
	}



	private void loadBeanDefinitionsForBeanMethod(BeanMethod beanMethod) {
		ConfigurationClass configClass = beanMethod.getConfigurationClass();
		MethodMetadata metadata = beanMethod.getMetadata();
		String methodName = metadata.getMethodName();

		// Do we need to mark the bean as skipped by its condition?
		if (this.conditionEvaluator.shouldSkip(metadata, ConfigurationPhase.REGISTER_BEAN)) {
			configClass.skippedBeanMethods.add(methodName);
			return;
		}
		if (configClass.skippedBeanMethods.contains(methodName)) {
			return;
		}

		AnnotationAttributes bean = AnnotationConfigUtils.attributesFor(metadata, Bean.class);
		Assert.state(bean != null, "No @Bean annotation attributes");

		// Consider name and any aliases
		List<String> names = new ArrayList<>(Arrays.asList(bean.getStringArray("name")));
		String beanName = (!names.isEmpty() ? names.remove(0) : methodName);

		// Register aliases even when overridden
		for (String alias : names) {
			this.registry.registerAlias(beanName, alias);
		}

		// Has this effectively been overridden before (e.g. via XML)?
		if (isOverriddenByExistingDefinition(beanMethod, beanName)) {
			if (beanName.equals(beanMethod.getConfigurationClass().getBeanName())) {
				throw new BeanDefinitionStoreException(beanMethod.getConfigurationClass().getResource().getDescription(),
						beanName, "Bean name derived from @Bean method '" + beanMethod.getMetadata().getMethodName() +
						"' clashes with bean name for containing configuration class; please make those names unique!");
			}
			return;
		}
        //这里为每一个BeanMethod 生成一个 beanDef
		ConfigurationClassBeanDefinition beanDef = new ConfigurationClassBeanDefinition(configClass, metadata);
		beanDef.setResource(configClass.getResource());
		beanDef.setSource(this.sourceExtractor.extractSource(metadata, configClass.getResource()));

		if (metadata.isStatic()) {
			// static @Bean method
			beanDef.setBeanClassName(configClass.getMetadata().getClassName());
			beanDef.setFactoryMethodName(methodName);
		}
		else {
			// instance @Bean method    factoryBeanName 意为configClass 作为工厂bean    
			beanDef.setFactoryBeanName(configClass.getBeanName());
            //  factoryMethodName 意为注解@Bean 的方法的名字  也是默认bean的名字  
			beanDef.setUniqueFactoryMethodName(methodName);
		}
		beanDef.setAutowireMode(RootBeanDefinition.AUTOWIRE_CONSTRUCTOR);
		beanDef.setAttribute(RequiredAnnotationBeanPostProcessor.SKIP_REQUIRED_CHECK_ATTRIBUTE, Boolean.TRUE);

		AnnotationConfigUtils.processCommonDefinitionAnnotations(beanDef, metadata);

		Autowire autowire = bean.getEnum("autowire");
		if (autowire.isAutowire()) {
			beanDef.setAutowireMode(autowire.value());
		}

		String initMethodName = bean.getString("initMethod");
		if (StringUtils.hasText(initMethodName)) {
			beanDef.setInitMethodName(initMethodName);
		}

		String destroyMethodName = bean.getString("destroyMethod");
		beanDef.setDestroyMethodName(destroyMethodName);

		// Consider scoping
		ScopedProxyMode proxyMode = ScopedProxyMode.NO;
		AnnotationAttributes attributes = AnnotationConfigUtils.attributesFor(metadata, Scope.class);
		if (attributes != null) {
			beanDef.setScope(attributes.getString("value"));
			proxyMode = attributes.getEnum("proxyMode");
			if (proxyMode == ScopedProxyMode.DEFAULT) {
				proxyMode = ScopedProxyMode.NO;
			}
		}

		// Replace the original bean definition with the target one, if necessary
		BeanDefinition beanDefToRegister = beanDef;
		if (proxyMode != ScopedProxyMode.NO) {
			BeanDefinitionHolder proxyDef = ScopedProxyCreator.createScopedProxy(
					new BeanDefinitionHolder(beanDef, beanName), this.registry,
					proxyMode == ScopedProxyMode.TARGET_CLASS);
			beanDefToRegister = new ConfigurationClassBeanDefinition(
					(RootBeanDefinition) proxyDef.getBeanDefinition(), configClass, metadata);
		}

		if (logger.isDebugEnabled()) {
			logger.debug(String.format("Registering bean definition for @Bean method %s.%s()",
					configClass.getMetadata().getClassName(), beanName));
		}

		this.registry.registerBeanDefinition(beanName, beanDefToRegister);
	}
~~~







##### springAOP

注意：

//多个 DefaultAdvisorAutoProxyCreator  导致  一个bean 代理多次  比如下面的 事务注解



以下(valid 和 事务注解 不在一个类上   一个在controller  一个在 service)

~~~java
...org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory...
	@Override
	public Object applyBeanPostProcessorsAfterInitialization(Object existingBean, String beanName)
			throws BeansException {

		Object result = existingBean;
		for (BeanPostProcessor beanProcessor : getBeanPostProcessors()) {
			Object current = beanProcessor.postProcessAfterInitialization(result, beanName);
			if (current == null) {
				return result;
			}
			result = current;
		}
		return result;
	}

...org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator...
@Override
public Object postProcessAfterInitialization(@Nullable Object bean, String beanName) throws BeansException {
    if (bean != null) {
        Object cacheKey = getCacheKey(bean.getClass(), beanName);
        if (!this.earlyProxyReferences.contains(cacheKey)) {
            //
            return wrapIfNecessary(bean, beanName, cacheKey);
        }
    }
    return bean;
}


protected Object wrapIfNecessary(Object bean, String beanName, Object cacheKey) {
    if (StringUtils.hasLength(beanName) && this.targetSourcedBeans.contains(beanName)) {
        return bean;
    }
    if (Boolean.FALSE.equals(this.advisedBeans.get(cacheKey))) {
        return bean;
    }
    if (isInfrastructureClass(bean.getClass()) || shouldSkip(bean.getClass(), beanName)) {
        this.advisedBeans.put(cacheKey, Boolean.FALSE);
        return bean;
    }

    // Create proxy if we have advice.   这里决定是否生成代理类
    Object[] specificInterceptors = getAdvicesAndAdvisorsForBean(bean.getClass(), beanName, null);
    if (specificInterceptors != DO_NOT_PROXY) {
        this.advisedBeans.put(cacheKey, Boolean.TRUE);
        //创建代理
        Object proxy = createProxy(
            bean.getClass(), beanName, specificInterceptors, new SingletonTargetSource(bean));
        this.proxyTypes.put(cacheKey, proxy.getClass());
        return proxy;
    }

    this.advisedBeans.put(cacheKey, Boolean.FALSE);
    return bean;
}

...org.springframework.aop.framework.autoproxy.AbstractAdvisorAutoProxyCreator...
	@Override
	@Nullable
	protected Object[] getAdvicesAndAdvisorsForBean(
			Class<?> beanClass, String beanName, @Nullable TargetSource targetSource) {

		List<Advisor> advisors = findEligibleAdvisors(beanClass, beanName);
		if (advisors.isEmpty()) {
			return DO_NOT_PROXY;
		}
		return advisors.toArray();
	}


protected List<Advisor> findEligibleAdvisors(Class<?> beanClass, String beanName) { 
    //org.springframework.aop.framework.autoproxy.AbstractAdvisorAutoProxyCreator  
    //isEligibleAdvisorBean 方法决定是不是候选者
    List<Advisor> candidateAdvisors = findCandidateAdvisors();
    //寻找最终绑定的 
    List<Advisor> eligibleAdvisors = findAdvisorsThatCanApply(candidateAdvisors, beanClass, beanName);
    extendAdvisors(eligibleAdvisors);
    if (!eligibleAdvisors.isEmpty()) {
        eligibleAdvisors = sortAdvisors(eligibleAdvisors);
    }
    return eligibleAdvisors;
}


~~~

寻找绑定的

~~~java
matches:92, AuthorizationAttributeSourceAdvisor (org.apache.shiro.spring.security.interceptor)
canApply:251, AopUtils (org.springframework.aop.support)
canApply:288, AopUtils (org.springframework.aop.support)
findAdvisorsThatCanApply:320, AopUtils (org.springframework.aop.support)
findAdvisorsThatCanApply:126, AbstractAdvisorAutoProxyCreator (org.springframework.aop.framework.autoproxy)
findEligibleAdvisors:95, AbstractAdvisorAutoProxyCreator (org.springframework.aop.framework.autoproxy)
getAdvicesAndAdvisorsForBean:76, AbstractAdvisorAutoProxyCreator (org.springframework.aop.framework.autoproxy)
wrapIfNecessary:352, AbstractAutoProxyCreator (org.springframework.aop.framework.autoproxy)
postProcessAfterInitialization:304, AbstractAutoProxyCreator (org.springframework.aop.framework.autoproxy)
applyBeanPostProcessorsAfterInitialization:431, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
initializeBean:1703, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:573, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 976358110 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$147)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:204, AbstractBeanFactory (org.springframework.beans.factory.support)
registerBeanPostProcessors:236, PostProcessorRegistrationDelegate (org.springframework.context.support)
registerBeanPostProcessors:710, AbstractApplicationContext (org.springframework.context.support)
refresh:535, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~

~~~java
...org.springframework.aop.framework.autoproxy.AbstractAutoProxyCreator...	
protected Object createProxy(Class<?> beanClass, @Nullable String beanName,
			@Nullable Object[] specificInterceptors, TargetSource targetSource) {

		if (this.beanFactory instanceof ConfigurableListableBeanFactory) {
            //BeanDefinition 设置被代理类
			AutoProxyUtils.exposeTargetClass((ConfigurableListableBeanFactory) this.beanFactory, beanName, beanClass);
		}

		ProxyFactory proxyFactory = new ProxyFactory();
    	//继承配置
		proxyFactory.copyFrom(this);

		if (!proxyFactory.isProxyTargetClass()) {
			if (shouldProxyTargetClass(beanClass, beanName)) {
				proxyFactory.setProxyTargetClass(true);
			}
			else {
                //代理接口
				evaluateProxyInterfaces(beanClass, proxyFactory);
			}
		}
    
		//合规处理
		Advisor[] advisors = buildAdvisors(beanName, specificInterceptors);
    
		proxyFactory.addAdvisors(advisors);
		proxyFactory.setTargetSource(targetSource);
    	//
		customizeProxyFactory(proxyFactory);
		//
		proxyFactory.setFrozen(this.freezeProxy);
		if (advisorsPreFiltered()) {
			proxyFactory.setPreFiltered(true);
		}
		//
		return proxyFactory.getProxy(getProxyClassLoader());
	}
~~~

~~~java
...org.springframework.aop.framework.ProxyFactory...
public Object getProxy(@Nullable ClassLoader classLoader) {
    return createAopProxy().getProxy(classLoader);
}

...org.springframework.aop.framework.ProxyCreatorSupport...
protected final synchronized AopProxy createAopProxy() {
    if (!this.active) {
        activate();
    }
    return getAopProxyFactory().createAopProxy(this);
}	


...org.springframework.aop.framework.DefaultAopProxyFactory...
public AopProxy createAopProxy(AdvisedSupport config) throws AopConfigException {
    if (config.isOptimize() || config.isProxyTargetClass() || hasNoUserSuppliedProxyInterfaces(config)) {
        Class<?> targetClass = config.getTargetClass();
        if (targetClass == null) {
            throw new AopConfigException("TargetSource cannot determine target class: " +
                                         "Either an interface or a target is required for proxy creation.");
        }
        if (targetClass.isInterface() || Proxy.isProxyClass(targetClass)) {
            return new JdkDynamicAopProxy(config);
        }
        return new ObjenesisCglibAopProxy(config);
    }
    else {
        return new JdkDynamicAopProxy(config);
    }
}
~~~

~~~java
...org.springframework.aop.framework.CglibAopProxy... 		
public Object getProxy(@Nullable ClassLoader classLoader) {
		if (logger.isDebugEnabled()) {
			logger.debug("Creating CGLIB proxy: target source is " + this.advised.getTargetSource());
		}

		try {
			Class<?> rootClass = this.advised.getTargetClass();
			Assert.state(rootClass != null, "Target class must be available for creating a CGLIB proxy");

			Class<?> proxySuperClass = rootClass;
			if (ClassUtils.isCglibProxyClass(rootClass)) {
				proxySuperClass = rootClass.getSuperclass();
				Class<?>[] additionalInterfaces = rootClass.getInterfaces();
				for (Class<?> additionalInterface : additionalInterfaces) {
					this.advised.addInterface(additionalInterface);
				}
			}

			// Validate the class, writing log messages as necessary.
			validateClassIfNecessary(proxySuperClass, classLoader);

			// Configure CGLIB Enhancer...
			Enhancer enhancer = createEnhancer();
			if (classLoader != null) {
				enhancer.setClassLoader(classLoader);
				if (classLoader instanceof SmartClassLoader &&
						((SmartClassLoader) classLoader).isClassReloadable(proxySuperClass)) {
					enhancer.setUseCache(false);
				}
			}
			enhancer.setSuperclass(proxySuperClass);
			enhancer.setInterfaces(AopProxyUtils.completeProxiedInterfaces(this.advised));
			enhancer.setNamingPolicy(SpringNamingPolicy.INSTANCE);
			enhancer.setStrategy(new ClassLoaderAwareUndeclaredThrowableStrategy(classLoader));
			
            //
			Callback[] callbacks = getCallbacks(rootClass);
			Class<?>[] types = new Class<?>[callbacks.length];
			for (int x = 0; x < types.length; x++) {
				types[x] = callbacks[x].getClass();
			}
			// fixedInterceptorMap only populated at this point, after getCallbacks call above
			enhancer.setCallbackFilter(new ProxyCallbackFilter(
					this.advised.getConfigurationOnlyCopy(), this.fixedInterceptorMap, this.fixedInterceptorOffset));
			enhancer.setCallbackTypes(types);

			// Generate the proxy class and create a proxy instance.
			return createProxyClassAndInstance(enhancer, callbacks);
		}
		catch (CodeGenerationException | IllegalArgumentException ex) {
			throw new AopConfigException("Could not generate CGLIB subclass of " + this.advised.getTargetClass() +
					": Common causes of this problem include using a final class or a non-visible class",
					ex);
		}
		catch (Throwable ex) {
			// TargetSource.getTarget() failed
			throw new AopConfigException("Unexpected AOP exception", ex);
		}
	}
~~~





~~~java
createAopProxy:52, DefaultAopProxyFactory (org.springframework.aop.framework)
createAopProxy:105, ProxyCreatorSupport (org.springframework.aop.framework)
getProxy:110, ProxyFactory (org.springframework.aop.framework)
createProxy:473, AbstractAutoProxyCreator (org.springframework.aop.framework.autoproxy)
//创建代理
wrapIfNecessary:355, AbstractAutoProxyCreator (org.springframework.aop.framework.autoproxy)
postProcessAfterInitialization:304, AbstractAutoProxyCreator (org.springframework.aop.framework.autoproxy)
applyBeanPostProcessorsAfterInitialization:431, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
initializeBean:1703, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
doCreateBean:573, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
createBean:495, AbstractAutowireCapableBeanFactory (org.springframework.beans.factory.support)
lambda$doGetBean$0:317, AbstractBeanFactory (org.springframework.beans.factory.support)
getObject:-1, 314364096 (org.springframework.beans.factory.support.AbstractBeanFactory$$Lambda$124)
getSingleton:222, DefaultSingletonBeanRegistry (org.springframework.beans.factory.support)
doGetBean:315, AbstractBeanFactory (org.springframework.beans.factory.support)
getBean:199, AbstractBeanFactory (org.springframework.beans.factory.support)
preInstantiateSingletons:759, DefaultListableBeanFactory (org.springframework.beans.factory.support)
finishBeanFactoryInitialization:869, AbstractApplicationContext (org.springframework.context.support)
refresh:550, AbstractApplicationContext (org.springframework.context.support)
refresh:140, ServletWebServerApplicationContext (org.springframework.boot.web.servlet.context)
refresh:762, SpringApplication (org.springframework.boot)
refreshContext:398, SpringApplication (org.springframework.boot)
run:330, SpringApplication (org.springframework.boot)
run:1258, SpringApplication (org.springframework.boot)
run:1246, SpringApplication (org.springframework.boot)
main:12, CcmsBigScreenApplication (net.zigin.ccmsbigscreen)
~~~

代理拦截过程

~~~java
...org.springframework.aop.framework.CglibAopProxy...
@Override
@Nullable
public Object intercept(Object proxy, Method method, Object[] args, MethodProxy methodProxy) throws Throwable {
    Object oldProxy = null;
    boolean setProxyContext = false;
    Object target = null;
    TargetSource targetSource = this.advised.getTargetSource();
    try {
        if (this.advised.exposeProxy) {
            // Make invocation available if necessary.
            oldProxy = AopContext.setCurrentProxy(proxy);
            setProxyContext = true;
        }
        // Get as late as possible to minimize the time we "own" the target, in case it comes from a pool...
        target = targetSource.getTarget();
        Class<?> targetClass = (target != null ? target.getClass() : null);
        List<Object> chain = this.advised.getInterceptorsAndDynamicInterceptionAdvice(method, targetClass);
        Object retVal;
        // Check whether we only have one InvokerInterceptor: that is,
        // no real advice, but just reflective invocation of the target.
        if (chain.isEmpty() && Modifier.isPublic(method.getModifiers())) {
            // We can skip creating a MethodInvocation: just invoke the target directly.
            // Note that the final invoker must be an InvokerInterceptor, so we know
            // it does nothing but a reflective operation on the target, and no hot
            // swapping or fancy proxying.
            Object[] argsToUse = AopProxyUtils.adaptArgumentsIfNecessary(method, args);
            retVal = methodProxy.invoke(target, argsToUse);
        }
        else {
            // We need to create a method invocation...
            retVal = new CglibMethodInvocation(proxy, target, method, args, targetClass, chain, methodProxy).proceed();
        }
        retVal = processReturnType(proxy, target, method, retVal);
        return retVal;
    }
    finally {
        if (target != null && !targetSource.isStatic()) {
            targetSource.releaseTarget(target);
        }
        if (setProxyContext) {
            // Restore old proxy.
            AopContext.setCurrentProxy(oldProxy);
        }
    }
}
~~~



###### 一层aop代理（class上的验证aop）

~~~java
selectAlarmStatistic:67, AlarmLogController (net.zigin.ccmsbigscreen.controller)
//调用被代理AlarmLogController的原方法
invoke:-1, AlarmLogController$$FastClassBySpringCGLIB$$765144d7 (net.zigin.ccmsbigscreen.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
//joinpoint
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:112, MethodValidationInterceptor (org.springframework.validation.beanvalidation)
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogController$$EnhancerBySpringCGLIB$$14c9f272 (net.zigin.ccmsbigscreen.controller)
//调用AlarmLogController代理
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
doGet:866, FrameworkServlet (org.springframework.web.servlet)
service:635, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:61, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:450, AbstractShiroFilter (org.apache.shiro.web.servlet)
call:365, AbstractShiroFilter$1 (org.apache.shiro.web.servlet)
doCall:90, SubjectCallable (org.apache.shiro.subject.support)
call:83, SubjectCallable (org.apache.shiro.subject.support)
execute:387, DelegatingSubject (org.apache.shiro.subject.support)
doFilterInternal:362, AbstractShiroFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
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
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:493, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:800, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

###### 两层aop代理  （class上的验证aop 和 事务aop）多个process 造成的

~~~java
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor)
//第一次进事务拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogServiceImpl$$EnhancerBySpringCGLIB$$e7a1fd07 (net.zigin.ccmsbigscreen.service.impl)
//调用AlarmLogServiceImplr代理
selectAlarmStatistic:67, AlarmLogController (net.zigin.ccmsbigscreen.controller)
//调用被代理AlarmLogController的原方法
invoke:-1, AlarmLogController$$FastClassBySpringCGLIB$$765144d7 (net.zigin.ccmsbigscreen.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
//joinpoint
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:112, MethodValidationInterceptor (org.springframework.validation.beanvalidation)
//验证拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogController$$EnhancerBySpringCGLIB$$b98804ac (net.zigin.ccmsbigscreen.controller)
//调用AlarmLogController代理
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
doGet:866, FrameworkServlet (org.springframework.web.servlet)
service:635, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:61, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:450, AbstractShiroFilter (org.apache.shiro.web.servlet)
call:365, AbstractShiroFilter$1 (org.apache.shiro.web.servlet)
doCall:90, SubjectCallable (org.apache.shiro.subject.support)
call:83, SubjectCallable (org.apache.shiro.subject.support)
execute:387, DelegatingSubject (org.apache.shiro.subject.support)
doFilterInternal:362, AbstractShiroFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
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
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:493, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:800, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

~~~java
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [2]
//第二次进事务拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogServiceImpl$$EnhancerBySpringCGLIB$$f6da6e0f (net.zigin.ccmsbigscreen.service.impl)
invoke:-1, AlarmLogServiceImpl$$FastClassBySpringCGLIB$$7d489fb7 (net.zigin.ccmsbigscreen.service.impl)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:-1, 896175503 (org.springframework.transaction.interceptor.TransactionInterceptor$$Lambda$544)
invokeWithinTransaction:294, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [1]
//第一次进事务拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogServiceImpl$$EnhancerBySpringCGLIB$$e7a1fd07 (net.zigin.ccmsbigscreen.service.impl)
//调用AlarmLogServiceImplr代理
selectAlarmStatistic:67, AlarmLogController (net.zigin.ccmsbigscreen.controller)
//调用被代理AlarmLogController的原方法
invoke:-1, AlarmLogController$$FastClassBySpringCGLIB$$765144d7 (net.zigin.ccmsbigscreen.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
//joinpoint
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:112, MethodValidationInterceptor (org.springframework.validation.beanvalidation)
//验证拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogController$$EnhancerBySpringCGLIB$$b98804ac (net.zigin.ccmsbigscreen.controller)
//调用AlarmLogController代理
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
doGet:866, FrameworkServlet (org.springframework.web.servlet)
service:635, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:61, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:450, AbstractShiroFilter (org.apache.shiro.web.servlet)
call:365, AbstractShiroFilter$1 (org.apache.shiro.web.servlet)
doCall:90, SubjectCallable (org.apache.shiro.subject.support)
call:83, SubjectCallable (org.apache.shiro.subject.support)
execute:387, DelegatingSubject (org.apache.shiro.subject.support)
doFilterInternal:362, AbstractShiroFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
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
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:493, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:800, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

~~~java
selectAlarmStatistic:78, AlarmLogServiceImpl (net.zigin.ccmsbigscreen.service.impl)
//调用原方法
invoke:-1, AlarmLogServiceImpl$$FastClassBySpringCGLIB$$7d489fb7 (net.zigin.ccmsbigscreen.service.impl)
//调用被代理类方法
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
//这里没有环绕
proceedWithInvocation:-1, 1151416537 (org.springframework.transaction.interceptor.TransactionInterceptor$$Lambda$544)
invokeWithinTransaction:294, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [2]
//第二次进事务拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogServiceImpl$$EnhancerBySpringCGLIB$$f6da6e0f (net.zigin.ccmsbigscreen.service.impl)、
//被代理类也是一个代理类
invoke:-1, AlarmLogServiceImpl$$FastClassBySpringCGLIB$$7d489fb7 (net.zigin.ccmsbigscreen.service.impl)
//调用被代理类方法
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:-1, 896175503 (org.springframework.transaction.interceptor.TransactionInterceptor$$Lambda$544)
invokeWithinTransaction:294, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [1]
//第一次进事务拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogServiceImpl$$EnhancerBySpringCGLIB$$e7a1fd07 (net.zigin.ccmsbigscreen.service.impl)
//调用AlarmLogServiceImplr代理
selectAlarmStatistic:67, AlarmLogController (net.zigin.ccmsbigscreen.controller)
//调用被代理AlarmLogController的原方法
invoke:-1, AlarmLogController$$FastClassBySpringCGLIB$$765144d7 (net.zigin.ccmsbigscreen.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
//joinpoint
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:112, MethodValidationInterceptor (org.springframework.validation.beanvalidation)
//验证拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogController$$EnhancerBySpringCGLIB$$b98804ac (net.zigin.ccmsbigscreen.controller)
//调用AlarmLogController代理
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
doGet:866, FrameworkServlet (org.springframework.web.servlet)
service:635, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:61, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:450, AbstractShiroFilter (org.apache.shiro.web.servlet)
call:365, AbstractShiroFilter$1 (org.apache.shiro.web.servlet)
doCall:90, SubjectCallable (org.apache.shiro.subject.support)
call:83, SubjectCallable (org.apache.shiro.subject.support)
execute:387, DelegatingSubject (org.apache.shiro.subject.support)
doFilterInternal:362, AbstractShiroFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
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
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:493, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:800, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

###### 两层aop代理 加aop环绕（class上的验证aop 和 事务aop和  自定义aop环绕）

~~~java
selectAlarmStatistic:78, AlarmLogServiceImpl (net.zigin.ccmsbigscreen.service.impl)
invoke:-1, AlarmLogServiceImpl$$FastClassBySpringCGLIB$$7d489fb7 (net.zigin.ccmsbigscreen.service.impl)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceed:88, MethodInvocationProceedingJoinPoint (org.springframework.aop.aspectj)
around:33, MyLogAspect (net.zigin.ccmsbigscreen.common.config)
//环绕
invoke0:-1, NativeMethodAccessorImpl (sun.reflect)
invoke:62, NativeMethodAccessorImpl (sun.reflect)
invoke:43, DelegatingMethodAccessorImpl (sun.reflect)
invoke:498, Method (java.lang.reflect)
invokeAdviceMethodWithGivenArgs:644, AbstractAspectJAdvice (org.springframework.aop.aspectj)
invokeAdviceMethod:633, AbstractAspectJAdvice (org.springframework.aop.aspectj)
invoke:70, AspectJAroundAdvice (org.springframework.aop.aspectj)
proceed:174, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:55, AfterReturningAdviceInterceptor (org.springframework.aop.framework.adapter)
proceed:174, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:62, AspectJAfterThrowingAdvice (org.springframework.aop.aspectj)
proceed:174, ReflectiveMethodInvocation (org.springframework.aop.framework)
//这里和没有环绕的有区别
proceedWithInvocation:-1, 1830578541 (org.springframework.transaction.interceptor.TransactionInterceptor$$Lambda$544)
invokeWithinTransaction:294, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [2]
//第二次进入事务拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:92, ExposeInvocationInterceptor (org.springframework.aop.interceptor)
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogServiceImpl$$EnhancerBySpringCGLIB$$fcf2f74e (net.zigin.ccmsbigscreen.service.impl)
invoke:-1, AlarmLogServiceImpl$$FastClassBySpringCGLIB$$7d489fb7 (net.zigin.ccmsbigscreen.service.impl)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:-1, 1830578541 (org.springframework.transaction.interceptor.TransactionInterceptor$$Lambda$544)
invokeWithinTransaction:294, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [1]
//第一次进事务拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogServiceImpl$$EnhancerBySpringCGLIB$$e7a1fd07 (net.zigin.ccmsbigscreen.service.impl)
//调用AlarmLogServiceImplr代理
selectAlarmStatistic:67, AlarmLogController (net.zigin.ccmsbigscreen.controller)
//调用被代理AlarmLogController的原方法
invoke:-1, AlarmLogController$$FastClassBySpringCGLIB$$765144d7 (net.zigin.ccmsbigscreen.controller)
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
//joinpoint
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:112, MethodValidationInterceptor (org.springframework.validation.beanvalidation)
//验证拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogController$$EnhancerBySpringCGLIB$$b98804ac (net.zigin.ccmsbigscreen.controller)
//调用AlarmLogController代理
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
doGet:866, FrameworkServlet (org.springframework.web.servlet)
service:635, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:61, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:450, AbstractShiroFilter (org.apache.shiro.web.servlet)
call:365, AbstractShiroFilter$1 (org.apache.shiro.web.servlet)
doCall:90, SubjectCallable (org.apache.shiro.subject.support)
call:83, SubjectCallable (org.apache.shiro.subject.support)
execute:387, DelegatingSubject (org.apache.shiro.subject.support)
doFilterInternal:362, AbstractShiroFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
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
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:493, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:800, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

###### 环绕增强调用逻辑

~~~java
	public Object proceed() throws Throwable {
		//	We start with an index of -1 and increment early.
        //index不是最后一个，说明是环绕增强
		if (this.currentInterceptorIndex == this.interceptorsAndDynamicMethodMatchers.size() - 1) {
			return invokeJoinpoint();
		}
		
        //这里执行环绕增强逻辑
		Object interceptorOrInterceptionAdvice =
				this.interceptorsAndDynamicMethodMatchers.get(++this.currentInterceptorIndex);
		if (interceptorOrInterceptionAdvice instanceof InterceptorAndDynamicMethodMatcher) {
			// Evaluate dynamic method matcher here: static part will already have
			// been evaluated and found to match.
			InterceptorAndDynamicMethodMatcher dm =
					(InterceptorAndDynamicMethodMatcher) interceptorOrInterceptionAdvice;
			if (dm.methodMatcher.matches(this.method, this.targetClass, this.arguments)) {
				return dm.interceptor.invoke(this);
			}
			else {
				// Dynamic matching failed.
				// Skip this interceptor and invoke the next in the chain.
				return proceed();
			}
		}
		else {
			// It's an interceptor, so we just invoke it: The pointcut will have
			// been evaluated statically before this object was constructed.
			return ((MethodInterceptor) interceptorOrInterceptionAdvice).invoke(this);
		}
	}
~~~



###### 以下(valid 加载controller 类上    事务注解加载方法上 )   valid注解有效

~~~java
selectAlarmStatistic:69, AlarmLogController (net.zigin.ccmsbigscreen.controller)
invoke:-1, AlarmLogController$$FastClassBySpringCGLIB$$765144d7 (net.zigin.ccmsbigscreen.controller)
//fast被代理方法
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:-1, 932165329 (org.springframework.transaction.interceptor.TransactionInterceptor$$Lambda$549)
invokeWithinTransaction:294, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [2]
 //
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogController$$EnhancerBySpringCGLIB$$4ac97ae5 (net.zigin.ccmsbigscreen.controller)
invoke:-1, AlarmLogController$$FastClassBySpringCGLIB$$765144d7 (net.zigin.ccmsbigscreen.controller)
//fast被代理方法
invoke:204, MethodProxy (org.springframework.cglib.proxy)
invokeJoinpoint:746, CglibAopProxy$CglibMethodInvocation (org.springframework.aop.framework)
proceed:163, ReflectiveMethodInvocation (org.springframework.aop.framework)
invoke:112, MethodValidationInterceptor (org.springframework.validation.beanvalidation)
//这里调用了方法验证的拦截器
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
proceedWithInvocation:-1, 932165329 (org.springframework.transaction.interceptor.TransactionInterceptor$$Lambda$549)
invokeWithinTransaction:294, TransactionAspectSupport (org.springframework.transaction.interceptor)
invoke:98, TransactionInterceptor (org.springframework.transaction.interceptor) [1]
//
proceed:185, ReflectiveMethodInvocation (org.springframework.aop.framework)
intercept:688, CglibAopProxy$DynamicAdvisedInterceptor (org.springframework.aop.framework)
selectAlarmStatistic:-1, AlarmLogController$$EnhancerBySpringCGLIB$$250ba69d (net.zigin.ccmsbigscreen.controller)
//调用AlarmLogController代理类
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
doGet:866, FrameworkServlet (org.springframework.web.servlet)
service:635, HttpServlet (javax.servlet.http)
service:851, FrameworkServlet (org.springframework.web.servlet)
service:742, HttpServlet (javax.servlet.http)
internalDoFilter:231, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:52, WsFilter (org.apache.tomcat.websocket.server)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
doFilter:61, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:450, AbstractShiroFilter (org.apache.shiro.web.servlet)
call:365, AbstractShiroFilter$1 (org.apache.shiro.web.servlet)
doCall:90, SubjectCallable (org.apache.shiro.subject.support)
call:83, SubjectCallable (org.apache.shiro.subject.support)
execute:387, DelegatingSubject (org.apache.shiro.subject.support)
doFilterInternal:362, AbstractShiroFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
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
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:493, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:800, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

以下(valid 和 事务注解 在一个类的同一个方法上   都在controller )   valid注解会失效



##### spring事务

~~~java
...org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory...
	@Override
	public Object applyBeanPostProcessorsAfterInitialization(Object existingBean, String beanName)
			throws BeansException {

		Object result = existingBean;
		for (BeanPostProcessor beanProcessor : getBeanPostProcessors()) {
            //事务注解类会代理两次
            //处理事务注解的processor  ...org.springframework.aop.aspectj.annotation.AnnotationAwareAspectJAutoProxyCreator...
			Object current = beanProcessor.postProcessAfterInitialization(result, beanName);
			if (current == null) {
				return result;
			}
			result = current;
		}
		return result;
	}
~~~



##### 验证框架

注意事项  get参数校验必须  @Validated  放在controller上  则会生成代理类  进行校验

###### get代理了校验流程（代理类里面校验）

~~~java

~~~

post  @Validated   放在参数上    因为有@RequestBody 触发 Databinder

###### post校验调用栈

~~~java
isValid:29, NotEmptyValidatorForCharSequence (org.hibernate.validator.internal.constraintvalidators.bv.notempty)
isValid:18, NotEmptyValidatorForCharSequence (org.hibernate.validator.internal.constraintvalidators.bv.notempty)
validateSingleConstraint:171, ConstraintTree (org.hibernate.validator.internal.engine.constraintvalidation)
validateConstraints:68, SimpleConstraintTree (org.hibernate.validator.internal.engine.constraintvalidation)
validateConstraints:73, ConstraintTree (org.hibernate.validator.internal.engine.constraintvalidation)
doValidateConstraint:127, MetaConstraint (org.hibernate.validator.internal.metadata.core)
validateConstraint:120, MetaConstraint (org.hibernate.validator.internal.metadata.core)
validateMetaConstraint:533, ValidatorImpl (org.hibernate.validator.internal.engine)
validateConstraintsForSingleDefaultGroupElement:496, ValidatorImpl (org.hibernate.validator.internal.engine)
validateConstraintsForDefaultGroup:465, ValidatorImpl (org.hibernate.validator.internal.engine)
validateConstraintsForCurrentGroup:430, ValidatorImpl (org.hibernate.validator.internal.engine)
validateInContext:380, ValidatorImpl (org.hibernate.validator.internal.engine)
validateCascadedAnnotatedObjectForCurrentGroup:605, ValidatorImpl (org.hibernate.validator.internal.engine)
validateCascadedConstraints:568, ValidatorImpl (org.hibernate.validator.internal.engine)
validateInContext:389, ValidatorImpl (org.hibernate.validator.internal.engine)
validate:169, ValidatorImpl (org.hibernate.validator.internal.engine)
validate:104, SpringValidatorAdapter (org.springframework.validation.beanvalidation)
validate:64, ValidatorAdapter (org.springframework.boot.autoconfigure.validation)
validate:874, DataBinder (org.springframework.validation)
//dataBinder校验
validateIfApplicable:260, AbstractMessageConverterMethodArgumentResolver (org.springframework.web.servlet.mvc.method.annotation)
resolveArgument:136, RequestResponseBodyMethodProcessor (org.springframework.web.servlet.mvc.method.annotation)
//RequestResponseBodyMethodProcessor
resolveArgument:124, HandlerMethodArgumentResolverComposite (org.springframework.web.method.support)
getMethodArgumentValues:161, InvocableHandlerMethod (org.springframework.web.method.support)
invokeForRequest:131, InvocableHandlerMethod (org.springframework.web.method.support)
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
doFilter:61, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:108, AdviceFilter (org.apache.shiro.web.servlet)
doFilterInternal:137, AdviceFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
doFilter:66, ProxiedFilterChain (org.apache.shiro.web.servlet)
executeChain:450, AbstractShiroFilter (org.apache.shiro.web.servlet)
call:365, AbstractShiroFilter$1 (org.apache.shiro.web.servlet)
doCall:90, SubjectCallable (org.apache.shiro.subject.support)
call:83, SubjectCallable (org.apache.shiro.subject.support)
execute:387, DelegatingSubject (org.apache.shiro.subject.support)
doFilterInternal:362, AbstractShiroFilter (org.apache.shiro.web.servlet)
doFilter:125, OncePerRequestFilter (org.apache.shiro.web.servlet)
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
doFilterInternal:200, CharacterEncodingFilter (org.springframework.web.filter)
doFilter:107, OncePerRequestFilter (org.springframework.web.filter)
internalDoFilter:193, ApplicationFilterChain (org.apache.catalina.core)
doFilter:166, ApplicationFilterChain (org.apache.catalina.core)
invoke:198, StandardWrapperValve (org.apache.catalina.core)
invoke:96, StandardContextValve (org.apache.catalina.core)
invoke:493, AuthenticatorBase (org.apache.catalina.authenticator)
invoke:140, StandardHostValve (org.apache.catalina.core)
invoke:81, ErrorReportValve (org.apache.catalina.valves)
invoke:87, StandardEngineValve (org.apache.catalina.core)
service:342, CoyoteAdapter (org.apache.catalina.connector)
service:800, Http11Processor (org.apache.coyote.http11)
process:66, AbstractProcessorLight (org.apache.coyote)
process:800, AbstractProtocol$ConnectionHandler (org.apache.coyote)
doRun:1471, NioEndpoint$SocketProcessor (org.apache.tomcat.util.net)
run:49, SocketProcessorBase (org.apache.tomcat.util.net)
runWorker:1149, ThreadPoolExecutor (java.util.concurrent)
run:624, ThreadPoolExecutor$Worker (java.util.concurrent)
run:61, TaskThread$WrappingRunnable (org.apache.tomcat.util.threads)
run:748, Thread (java.lang)
~~~

###### post校验主要流程

~~~java
...org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor...	
public Object resolveArgument(MethodParameter parameter, @Nullable ModelAndViewContainer mavContainer,
			NativeWebRequest webRequest, @Nullable WebDataBinderFactory binderFactory) throws Exception {

		parameter = parameter.nestedIfOptional();
		Object arg = readWithMessageConverters(webRequest, parameter, parameter.getNestedGenericParameterType());
		String name = Conventions.getVariableNameForParameter(parameter);

		if (binderFactory != null) {
			WebDataBinder binder = binderFactory.createBinder(webRequest, arg, name);
			if (arg != null) {
				validateIfApplicable(binder, parameter);
				if (binder.getBindingResult().hasErrors() && isBindExceptionRequired(binder, parameter)) {
					throw new MethodArgumentNotValidException(parameter, binder.getBindingResult());
				}
			}
			if (mavContainer != null) {
				mavContainer.addAttribute(BindingResult.MODEL_KEY_PREFIX + name, binder.getBindingResult());
			}
		}

		return adaptArgumentIfNecessary(arg, parameter);
	}


...org.springframework.web.servlet.mvc.method.annotation.AbstractMessageConverterMethodArgumentResolver...
	protected void validateIfApplicable(WebDataBinder binder, MethodParameter parameter) {
		Annotation[] annotations = parameter.getParameterAnnotations();
		for (Annotation ann : annotations) {
			Validated validatedAnn = AnnotationUtils.getAnnotation(ann, Validated.class);
            //判断是否为校验注解
			if (validatedAnn != null || ann.annotationType().getSimpleName().startsWith("Valid")) {
				Object hints = (validatedAnn != null ? validatedAnn.value() : AnnotationUtils.getValue(ann));
				Object[] validationHints = (hints instanceof Object[] ? (Object[]) hints : new Object[] {hints});
				binder.validate(validationHints);
				break;
			}
		}
	}
~~~





目前结论为 放在  方法和字段上都无效

~~~java
...org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory...
	@Override
	public Object applyBeanPostProcessorsAfterInitialization(Object existingBean, String beanName)
			throws BeansException {

		Object result = existingBean;
		for (BeanPostProcessor beanProcessor : getBeanPostProcessors()) {
            //若已生成则不再生成代理类
            //处理接口参数验证注解的processor  ...org.springframework.validation.beanvalidation.MethodValidationPostProcessor...
			Object current = beanProcessor.postProcessAfterInitialization(result, beanName);
			if (current == null) {
				return result;
			}
			result = current;
		}
		return result;
	}



...org.springframework.aop.framework.AbstractAdvisingBeanPostProcessor...
    this  ...org.springframework.validation.beanvalidation.MethodValidationPostProcessor...
	public Object postProcessAfterInitialization(Object bean, String beanName) {
		if (bean instanceof AopInfrastructureBean || this.advisor == null) {
			// Ignore AOP infrastructure such as scoped proxies.
			return bean;
		}

		if (bean instanceof Advised) {
			Advised advised = (Advised) bean;
			if (!advised.isFrozen() && isEligible(AopUtils.getTargetClass(bean))) {
				// Add our local Advisor to the existing proxy's Advisor chain...
				if (this.beforeExistingAdvisors) {
					advised.addAdvisor(0, this.advisor);
				}
				else {
					advised.addAdvisor(this.advisor);
				}
				return bean;
			}
		}

		if (isEligible(bean, beanName)) {
			ProxyFactory proxyFactory = prepareProxyFactory(bean, beanName);
			if (!proxyFactory.isProxyTargetClass()) {
				evaluateProxyInterfaces(bean.getClass(), proxyFactory);
			}
			proxyFactory.addAdvisor(this.advisor);
			customizeProxyFactory(proxyFactory);
			return proxyFactory.getProxy(getProxyClassLoader());
		}

		// No async proxy needed.
		return bean;
	}


protected boolean isEligible(Class<?> targetClass) {
    Boolean eligible = this.eligibleBeans.get(targetClass);
    if (eligible != null) {
        return eligible;
    }
    if (this.advisor == null) {
        return false;
    }
    eligible = AopUtils.canApply(this.advisor, targetClass); //这里返回false  故而失效
    this.eligibleBeans.put(targetClass, eligible);
    return eligible;
}
~~~

###### 这样加注解会使  mapping 读取无效  

~~~java
@Validated
public class AlarmLogController extends BaseController {
    @Autowired
    private AlarmLogService alarmLogService;


    @GetMapping("v1/selectAlarmStatistic")
    @ApiOperation(notes = "按月按日统计报警", value = "按月按日统计报警（当月当日,市分组）")
    @ApiImplicitEnumParams(value = {
            @ApiImplicitParam(name = "deptId", value = "部门Id", required = true),
            @ApiImplicitParam(name = "month", value = " 0,按日查询，1,按月查询", required = true),
    }, enumsValue = {
            @ApiImplicitEnumParam(name = "deptTypeList", value = "部门类型", allowableValue = DeptTypeEnum.class, allowMultiple = true),
    })
    @Transactional
    @MyLog(requestUrl = "1")
    public BaseResult<Collection<AlarmDealSituationVo>> selectAlarmStatistic(
~~~

~~~java
方法上加  @RequiresRoles或@RequiresPermissions 也会
    
此解决方法  
    新建一个DefaultAdvisorAutoProxyCreator bean
    
    
	 @Bean
    public DefaultAdvisorAutoProxyCreator advisorAutoProxyCreator() {
        DefaultAdvisorAutoProxyCreator advisorAutoProxyCreator = new DefaultAdvisorAutoProxyCreator();
    	//这里设置为true
        advisorAutoProxyCreator.setProxyTargetClass(true);
        return advisorAutoProxyCreator;
    }
~~~

