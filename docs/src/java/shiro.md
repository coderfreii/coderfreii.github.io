## shiro

和spring securty的核心逻辑几乎差不多 都是在过滤器里面做文章，

但是spring securty要更重一些，功能要更丰富，不过一般来说使用shiro足以，只需要做一下前后端分离的改造即可

###### 坑

~~~java
@ModelAttribute 方法 如果有Session 就会设置 Set-Cookie=JessionId=xxxxxxxxxxxxx
~~~



在 `org.apache.catalina.core.ApplicationFilterChain` 里

嵌入 一个` org.springframework.web.filter.DelegatingFilterProxy `代理了 `org.apache.shiro.spring.web.ShiroFilterFactoryBean$SpringShiroFilter`

~~~java
架构图 
url - filterChain
      
filterChain 由url配置的标识符 和 全局的filter组成
当一个url 需要多个时则需要配置多个标志符 且顺序敏感   全局在前
~~~

#### 生成filterChain时

~~~java
...org.apache.shiro.spring.web.ShiroFilterFactoryBean...
protected AbstractShiroFilter createInstance() throws Exception {

    log.debug("Creating Shiro Filter instance.");

    SecurityManager securityManager = getSecurityManager();
    if (securityManager == null) {
        String msg = "SecurityManager property must be set.";
        throw new BeanInitializationException(msg);
    }

    if (!(securityManager instanceof WebSecurityManager)) {
        String msg = "The security manager does not implement the WebSecurityManager interface.";
        throw new BeanInitializationException(msg);
    }

    //这里
    FilterChainManager manager = createFilterChainManager();

    //Expose the constructed FilterChainManager by first wrapping it in a
    // FilterChainResolver implementation. The AbstractShiroFilter implementations
    // do not know about FilterChainManagers - only resolvers:
    PathMatchingFilterChainResolver chainResolver = new PathMatchingFilterChainResolver();
    chainResolver.setFilterChainManager(manager);

    //Now create a concrete ShiroFilter instance and apply the acquired SecurityManager and built
    //FilterChainResolver.  It doesn't matter that the instance is an anonymous inner class
    //here - we're just using it because it is a concrete AbstractShiroFilter instance that accepts
    //injection of the SecurityManager and FilterChainResolver:
    return new SpringShiroFilter((WebSecurityManager) securityManager, chainResolver);
}


protected FilterChainManager createFilterChainManager() {

    DefaultFilterChainManager manager = new DefaultFilterChainManager();
    Map<String, Filter> defaultFilters = manager.getFilters();
    //apply global settings if necessary:
    for (Filter filter : defaultFilters.values()) {
        applyGlobalPropertiesIfNecessary(filter);
    }
	
    //这里设置filter
    //Apply the acquired and/or configured filters:
    Map<String, Filter> filters = getFilters();
    if (!CollectionUtils.isEmpty(filters)) {
        for (Map.Entry<String, Filter> entry : filters.entrySet()) {
            String name = entry.getKey();
            Filter filter = entry.getValue();
            applyGlobalPropertiesIfNecessary(filter);
            if (filter instanceof Nameable) {
                ((Nameable) filter).setName(name);
            }
            //'init' argument is false, since Spring-configured filters should be initialized
            //in Spring (i.e. 'init-method=blah') or implement InitializingBean:
            manager.addFilter(name, filter, false);
        }
    }

    // set the global filters
    manager.setGlobalFilters(this.globalFilters);

    //build up the chains:
    Map<String, String> chains = getFilterChainDefinitionMap();
    if (!CollectionUtils.isEmpty(chains)) {
        for (Map.Entry<String, String> entry : chains.entrySet()) {
            String url = entry.getKey();
            String chainDefinition = entry.getValue();
            manager.createChain(url, chainDefinition);
        }
    }

    // create the default chain, to match anything the path matching would have missed
    manager.createDefaultChain("/**"); // TODO this assumes ANT path matching, which might be OK here

    return manager;
}
~~~

~~~java
...org.apache.shiro.web.filter.mgt.DefaultFilterChainManager...
protected void addDefaultFilters(boolean init) {
    for (DefaultFilter defaultFilter : DefaultFilter.values()) {
        addFilter(defaultFilter.name(), defaultFilter.newInstance(), init, false);
    }
}

//默认如图
anon(AnonymousFilter.class),
authc(FormAuthenticationFilter.class),
authcBasic(BasicHttpAuthenticationFilter.class),
authcBearer(BearerHttpAuthenticationFilter.class),
logout(LogoutFilter.class),
noSessionCreation(NoSessionCreationFilter.class),
perms(PermissionsAuthorizationFilter.class),
port(PortFilter.class),
rest(HttpMethodPermissionFilter.class),
roles(RolesAuthorizationFilter.class),
ssl(SslFilter.class),
user(UserFilter.class),
invalidRequest(InvalidRequestFilter.class);
~~~





#### //运行时

SpringShiroFilter 中 根据 request 创建 subject

~~~java
.this. ...org.apache.shiro.spring.web.ShiroFilterFactoryBean$SpringShiroFilter ...
... org.apache.shiro.web.servlet.AbstractShiroFilter...

    
..doFilterInternal()..
//根据请求生成 subject这个逻辑服务与session  (先生成subject 在执行过滤链)
final Subject subject = createSubject(request, response);

// 绑定subject到线程 以便随后获取
subject.execute(new Callable() {
    public Object call() throws Exception {
        //更新session最新访问时间
        updateSessionLastAccessTime(request, response);
        //执行过滤链条
        executeChain(request, response, chain);
        return null;
    }
});



//...org.apache.shiro.mgt.DefaultSecurityManager...
public Subject createSubject(SubjectContext subjectContext) {
    //create a copy so we don't modify the argument's backing map:
    SubjectContext context = copy(subjectContext);

    //ensure that the context has a SecurityManager instance, and if not, add one:
    context = ensureSecurityManager(context);

    //Resolve an associated Session (usually based on a referenced session ID), and place it in the context before
    //sending to the SubjectFactory.  The SubjectFactory should not need to know how to acquire sessions as the
    //process is often environment specific - better to shield the SF from these details:
    context = resolveSession(context);

    //Similarly, the SubjectFactory should not require any concept of RememberMe - translate that here first
    //if possible before handing off to the SubjectFactory:
    context = resolvePrincipals(context);

    Subject subject = doCreateSubject(context);

    //save this subject for future reference if necessary:
    //(this is needed here in case rememberMe principals were resolved and they need to be stored in the
    //session, so we don't constantly rehydrate the rememberMe PrincipalCollection on every operation).
    //Added in 1.2:
    
    
    //**
    save(subject);

    return subject;
}

//context = resolvePrincipals(context);
//...org.apache.shiro.mgt.DefaultSecurityManager...
protected SubjectContext resolvePrincipals(SubjectContext context) {

    PrincipalCollection principals = context.resolvePrincipals();

    if (CollectionUtils.isEmpty(principals)) {
        log.trace("No identity (PrincipalCollection) found in the context.  Looking for a remembered identity.");

        principals = getRememberedIdentity(context);

        if (!CollectionUtils.isEmpty(principals)) {
            log.debug("Found remembered PrincipalCollection.  Adding to the context to be used " +
                      "for subject construction by the SubjectFactory.");

            context.setPrincipals(principals);

            // The following call was removed (commented out) in Shiro 1.2 because it uses the session as an
            // implementation strategy.  Session use for Shiro's own needs should be controlled in a single place
            // to be more manageable for end-users: there are a number of stateless (e.g. REST) applications that
            // use Shiro that need to ensure that sessions are only used when desirable.  If Shiro's internal
            // implementations used Subject sessions (setting attributes) whenever we wanted, it would be much
            // harder for end-users to control when/where that occurs.
            //
            // Because of this, the SubjectDAO was created as the single point of control, and session state logic
            // has been moved to the DefaultSubjectDAO implementation.

            // Removed in Shiro 1.2.  SHIRO-157 is still satisfied by the new DefaultSubjectDAO implementation
            // introduced in 1.2
            // Satisfies SHIRO-157:
            // bindPrincipalsToSession(principals, context);

        } else {
            log.trace("No remembered identity found.  Returning original context.");
        }
    }

    return context;
}


//save(subject);
//...org.apache.shiro.mgt.DefaultSubjectDAO...
public Subject save(Subject subject) {
    if (isSessionStorageEnabled(subject)) {
        saveToSession(subject);
    } else {
        log.trace("Session storage of subject state for Subject [{}] has been disabled: identity and " +
                  "authentication state are expected to be initialized on every request or invocation.", subject);
    }

    return subject;
}




//...org.apache.shiro.subject.support.DelegatingSubject...
//subject.execute(new Callable() {
public <V> V execute(Callable<V> callable) throws ExecutionException {
    //***
    Callable<V> associated = associateWith(callable);
    try {
        return associated.call();
    } catch (Throwable t) {
        throw new ExecutionException(t);
    }
}

//Callable<V> associated = associateWith(callable);
public <V> Callable<V> associateWith(Callable<V> callable) {
    //**
    return new SubjectCallable<V>(this, callable);

    
//return new SubjectCallable<V>(this, callable);
public SubjectCallable(Subject subject, Callable<V> delegate) {
	this(new SubjectThreadState(subject), delegate);
}
    

.this. ...org.apache.shiro.spring.web.ShiroFilterFactoryBean$SpringShiroFilter ...
... org.apache.shiro.web.servlet.AbstractShiroFilter...
......

protected void executeChain(ServletRequest request, ServletResponse response, FilterChain origChain)
    throws IOException, ServletException {
    //根据路径选择 filter
    FilterChain chain = getExecutionChain(request, response, origChain);
    chain.doFilter(request, response);
}


......
    
 protected FilterChain getExecutionChain(ServletRequest request, ServletResponse response, FilterChain origChain) {
    FilterChain chain = origChain;
	//获取Resolver
    FilterChainResolver resolver = getFilterChainResolver();
    if (resolver == null) {
        log.debug("No FilterChainResolver configured.  Returning original FilterChain.");
        return origChain;
    }
	//根据请求 获取FilterChain
    FilterChain resolved = resolver.getChain(request, response, origChain);
    if (resolved != null) {
        log.trace("Resolved a configured FilterChain for the current request.");
        chain = resolved;
    } else {
        log.trace("No FilterChain configured for the current request.  Using the default.");
    }

    return chain;
}
~~~



~~~java
... org.apache.shiro.web.filter.mgt.PathMatchingFilterChainResolver ...

    
......
    
public FilterChain getChain(ServletRequest request, ServletResponse response, FilterChain originalChain) {
    	//获取过滤连管理器   这里维护了一个 key为资源路径  value为过滤规则的map
        FilterChainManager filterChainManager = getFilterChainManager();
        if (!filterChainManager.hasChains()) {
            return null;
        }

   		//请求路径
        String requestURI = getPathWithinApplication(request);

        //the 'chain names' in this implementation are actually path patterns defined by the user.  We just use them
        //as the chain name for the FilterChainManager's requirements
    
    	//执行定义的资源， xml 、里配置决定和java代码配置的
    	//简单遍历匹配 返回匹配的第一个
        for (String pathPattern : filterChainManager.getChainNames()) {
            // If the path does match, then pass on to the subclass implementation for specific checks:
            if (pathMatches(pathPattern, requestURI)) {
                if (log.isTraceEnabled()) {
                    log.trace("Matched path pattern [" + pathPattern + "] for requestURI [" + requestURI + "].  " +
                            "Utilizing corresponding filter chain...");
                }
                
                //返回匹配的
                return filterChainManager.proxy(originalChain, pathPattern);
            }
        }

        return null;
    }
~~~



~~~java
//...org.apache.shiro.web.servlet.ProxiedFilterChain...
public void doFilter(ServletRequest request, ServletResponse response) throws IOException, ServletException {
    if (this.filters == null || this.filters.size() == this.index) {
        //we've reached the end of the wrapped chain, so invoke the original one:
        if (log.isTraceEnabled()) {
            log.trace("Invoking original filter chain.");
        }
        this.orig.doFilter(request, response);
    } else {
        if (log.isTraceEnabled()) {
            log.trace("Invoking wrapped filter at index [" + this.index + "]");
        }
        this.filters.get(this.index++).doFilter(request, response, this);
    }
}
~~~





~~~java
//...org.apache.shiro.web.servlet.OncePerRequestFilter...
//.this.  ... org.apache.shiro.web.filter.authc.FormAuthenticationFilter ...
public final void doFilter(ServletRequest request, ServletResponse response, FilterChain filterChain)
    throws ServletException, IOException {
    String alreadyFilteredAttributeName = getAlreadyFilteredAttributeName();
    if ( request.getAttribute(alreadyFilteredAttributeName) != null ) {
        log.trace("Filter '{}' already executed.  Proceeding without invoking this filter.", getName());
        filterChain.doFilter(request, response);
    } else //noinspection deprecation
        if (/* added in 1.2: */ !isEnabled(request, response) ||
            /* retain backwards compatibility: */ shouldNotFilter(request) ) {
            log.debug("Filter '{}' is not enabled for the current request.  Proceeding without invoking this filter.",
                      getName());
            filterChain.doFilter(request, response);
        } else {
            // Do invoke this filter...
            log.trace("Filter '{}' not yet executed.  Executing now.", getName());
            request.setAttribute(alreadyFilteredAttributeName, Boolean.TRUE);

            try {
                //**
                doFilterInternal(request, response, filterChain);
            } finally {
                // Once the request has finished, we're done and we don't
                // need to mark as 'already filtered' any more.
                request.removeAttribute(alreadyFilteredAttributeName);
            }
        }
}
~~~





~~~java
.this.  ... org.apache.shiro.web.filter.authc.FormAuthenticationFilter ...

... org.apache.shiro.web.servlet.AdviceFilter ...

public void doFilterInternal(ServletRequest request, ServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        Exception exception = null;

        try {
			//这里执行
            boolean continueChain = preHandle(request, response);
            if (log.isTraceEnabled()) {
                log.trace("Invoked preHandle method.  Continuing chain?: [" + continueChain + "]");
            }

            if (continueChain) {
                executeChain(request, response, chain);
            }

            postHandle(request, response);
            if (log.isTraceEnabled()) {
                log.trace("Successfully invoked postHandle method");
            }

        } catch (Exception e) {
            exception = e;
        } finally {
            cleanup(request, response, exception);
        }
    }
~~~



认证逻辑 假设登陆过 直接确认登陆标志位 如果没有 并且 是登录操作 则 尝试登录 最后 鉴权



~~~java
//...org.apache.shiro.web.filter.PathMatchingFilter...
private boolean isFilterChainContinued(ServletRequest request, ServletResponse response,
                                       String path, Object pathConfig) throws Exception {

    if (isEnabled(request, response, path, pathConfig)) { //isEnabled check added in 1.2
        if (log.isTraceEnabled()) {
            log.trace("Filter '{}' is enabled for the current request under path '{}' with config [{}].  " +
                      "Delegating to subclass implementation for 'onPreHandle' check.",
                      new Object[]{getName(), path, pathConfig});
        }
        //The filter is enabled for this specific request, so delegate to subclass implementations
        //so they can decide if the request should continue through the chain or not:
        
        //**
        return onPreHandle(request, response, pathConfig);
    }

    if (log.isTraceEnabled()) {
        log.trace("Filter '{}' is disabled for the current request under path '{}' with config [{}].  " +
                  "The next element in the FilterChain will be called immediately.",
                  new Object[]{getName(), path, pathConfig});
    }
    //This filter is disabled for this specific request,
    //return 'true' immediately to indicate that the filter will not process the request
    //and let the request/response to continue through the filter chain:
    return true;
}
~~~



~~~java
//...org.apache.shiro.web.filter.AccessControlFilter...
//return onPreHandle(request, response, pathConfig);

public boolean onPreHandle(ServletRequest request, ServletResponse response, Object mappedValue) throws Exception {
    //**
    return isAccessAllowed(request, response, mappedValue) || onAccessDenied(request, response, mappedValue);
}


//...org.apache.shiro.web.filter.authc.AuthenticatingFilter...

//return isAccessAllowed(request, response, mappedValue) || onAccessDenied(request, response, mappedValue);
@Override
protected boolean isAccessAllowed(ServletRequest request, ServletResponse response, Object mappedValue) {
    return super.isAccessAllowed(request, response, mappedValue) ||
        (!isLoginRequest(request, response) && isPermissive(mappedValue));
}


//...org.apache.shiro.web.filter.authc.AuthenticationFilter...
//return super.isAccessAllowed(request, response, mappedValue)
protected boolean isAccessAllowed(ServletRequest request, ServletResponse response, Object mappedValue) {
    Subject subject = getSubject(request, response);
    return subject.isAuthenticated() && subject.getPrincipal() != null;
}
~~~



// 利用 shiro 框架登录失败 会继续传递请到 contoller /login 实现自定义登录

~~~java
protected boolean onLoginFailure(AuthenticationToken token, AuthenticationException e,
ServletRequest request, ServletResponse response) {
setFailureAttribute(request, e);
//login failed, let request continue back to the login page:
return true;
}
~~~



