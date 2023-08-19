# 前言

第一个深入阅读的源码，由于当时水平有限，看了许久，中间断断续续，因而显得愈发凌乱，有机会整理一下。

## Security Filters

The Security Filters are inserted into the [FilterChainProxy](https://docs.spring.io/spring-security/reference/servlet/architecture.html#servlet-filterchainproxy) with the [SecurityFilterChain](https://docs.spring.io/spring-security/reference/servlet/architecture.html#servlet-securityfilterchain) API. The [order of `Filter`](https://docs.spring.io/spring-security/reference/servlet/architecture.html#servlet-filters-review)s matters. It is typically not necessary to know the ordering of Spring Security’s `Filter`s. However, there are times that it is beneficial to know the ordering

Below is a comprehensive list of Spring Security Filter ordering:

- ChannelProcessingFilter
- WebAsyncManagerIntegrationFilter
- SecurityContextPersistenceFilter
- HeaderWriterFilter
- CorsFilter
- ==CsrfFilter==  
- LogoutFilter
- OAuth2AuthorizationRequestRedirectFilter
- Saml2WebSsoAuthenticationRequestFilter
- X509AuthenticationFilter
- AbstractPreAuthenticatedProcessingFilter
- CasAuthenticationFilter
- OAuth2LoginAuthenticationFilter
- Saml2WebSsoAuthenticationFilter
- ==[`UsernamePasswordAuthenticationFilter`](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/form.html#servlet-authentication-usernamepasswordauthenticationfilter)==
- OpenIDAuthenticationFilter
- DefaultLoginPageGeneratingFilter
- DefaultLogoutPageGeneratingFilter
- ConcurrentSessionFilter
- [`DigestAuthenticationFilter`](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/digest.html#servlet-authentication-digest)
- BearerTokenAuthenticationFilter
- [`BasicAuthenticationFilter`](https://docs.spring.io/spring-security/reference/servlet/authentication/passwords/basic.html#servlet-authentication-basic)
- RequestCacheAwareFilter
- SecurityContextHolderAwareRequestFilter
- JaasApiIntegrationFilter
- RememberMeAuthenticationFilter
- ==AnonymousAuthenticationFilter==
- OAuth2AuthorizationCodeGrantFilter
- SessionManagementFilter
- ==[`ExceptionTranslationFilter`](https://docs.spring.io/spring-security/reference/servlet/architecture.html#servlet-exceptiontranslationfilter)==
- [`FilterSecurityInterceptor`](https://docs.spring.io/spring-security/reference/servlet/authorization/authorize-requests.html#servlet-authorization-filtersecurityinterceptor)
- SwitchUserFilter





















package org.springframework.security.config.annotation.web.configuration.WebSecurityConfiguration

应该是入口



~~~java
//设置configure
@Autowired(required = false)
	public void setFilterChainProxySecurityConfigurer(ObjectPostProcessor<Object> objectPostProcessor,
			@Value("#{@autowiredWebSecurityConfigurersIgnoreParents.getWebSecurityConfigurers()}") List<SecurityConfigurer<Filter, WebSecurity>> webSecurityConfigurers)
			throws Exception {
       
        
   @Value("#{@autowiredWebSecurityConfigurersIgnoreParents.getWebSecurityConfigurers()}") 
   
   // 此注解负责注入spring管理的 WebSecurityConfigurer.class  即用户自行配置的
        
        
    //AutowiredWebSecurityConfigurersIgnoreParents 内部
  	@SuppressWarnings({ "rawtypes", "unchecked" })
	public List<SecurityConfigurer<Filter, WebSecurity>> getWebSecurityConfigurers() {
		List<SecurityConfigurer<Filter, WebSecurity>> webSecurityConfigurers = new ArrayList<>();
		Map<String, WebSecurityConfigurer> beansOfType = this.beanFactory.getBeansOfType(WebSecurityConfigurer.class);
		for (Entry<String, WebSecurityConfigurer> entry : beansOfType.entrySet()) {
			webSecurityConfigurers.add(entry.getValue());
		}
		return webSecurityConfigurers;
	}  
    //AutowiredWebSecurityConfigurersIgnoreParents 内部
        
        
        
  //设置完configer后 
        
  	/**
	 * Creates the Spring Security Filter Chain
	 * @return the {@link Filter} that represents the security filter chain
	 * @throws Exception
	 */
	@Bean(name = AbstractSecurityWebApplicationInitializer.DEFAULT_FILTER_NAME)
	public Filter springSecurityFilterChain() throws Exception {
		boolean hasConfigurers = this.webSecurityConfigurers != null && !this.webSecurityConfigurers.isEmpty();
		boolean hasFilterChain = !this.securityFilterChains.isEmpty();
		Assert.state(!(hasConfigurers && hasFilterChain),
				"Found WebSecurityConfigurerAdapter as well as SecurityFilterChain. Please select just one.");
		if (!hasConfigurers && !hasFilterChain) {
			WebSecurityConfigurerAdapter adapter = this.objectObjectPostProcessor
					.postProcess(new WebSecurityConfigurerAdapter() {
					});
			this.webSecurity.apply(adapter);
		}
		for (SecurityFilterChain securityFilterChain : this.securityFilterChains) {
			this.webSecurity.addSecurityFilterChainBuilder(() -> securityFilterChain);
			for (Filter filter : securityFilterChain.getFilters()) {
				if (filter instanceof FilterSecurityInterceptor) {
					this.webSecurity.securityInterceptor((FilterSecurityInterceptor) filter);
					break;
				}
			}
		}
		for (WebSecurityCustomizer customizer : this.webSecurityCustomizers) {
			customizer.customize(this.webSecurity);
		}
        
        //进行构建的初始化
		return this.webSecurity.build();
	}      
        

~~~









# 创建时

~~~java
public final class HttpSecurity extends AbstractConfiguredSecurityBuilder<DefaultSecurityFilterChain, HttpSecurity>
		implements SecurityBuilder<DefaultSecurityFilterChain>, HttpSecurityBuilder<HttpSecurity> {

	private final RequestMatcherConfigurer requestMatcherConfigurer;

	private List<OrderedFilter> filters = new ArrayList<>();
    
    
    
	private HttpSecurity addFilterAtOffsetOf(Filter filter, int offset, Class<? extends Filter> registeredFilter) {
		int order = this.filterOrders.getOrder(registeredFilter) + offset;
		this.filters.add(new OrderedFilter(filter, order));
		return this;
	}  
    
  //应该是这里的filter添加  id 98
    
~~~







# 访问时

### org.apache.catalina.core.StandardWrapperValve

```java
//servlet范畴
org.apache.catalina.core.StandardWrapperValve
//根据规则筛选filter 生成 filterchain  
ApplicationFilterChain filterChain =
             ApplicationFilterFactory.createFilterChain(request, wrapper, servlet);

//... 一些判断

//开始过滤
filterChain.doFilter
    (request.getRequest(), response.getResponse());


0:ApplicationFilterConfig@841 "ApplicationFilterConfig[name=characterEncodingFilter, filterClass=org.springframework.boot.web.servlet.filter.OrderedCharacterEncodingFilter]"
1:ApplicationFilterConfig@842 "ApplicationFilterConfig[name=formContentFilter, filterClass=org.springframework.boot.web.servlet.filter.OrderedFormContentFilter]"
2:ApplicationFilterConfig@843 "ApplicationFilterConfig[name=requestContextFilter, filterClass=org.springframework.boot.web.servlet.filter.OrderedRequestContextFilter]"
  
//...  spring Security 插入的过滤链
3:ApplicationFilterConfig@844 "ApplicationFilterConfig[name=springSecurityFilterChain, filterClass=org.springframework.boot.web.servlet.DelegatingFilterProxyRegistrationBean$1]"
//
4:ApplicationFilterConfig@845 "ApplicationFilterConfig[name=jwtAuthenticationTokenFilter, filterClass=com.iyunware.framework.security.filter.JwtAuthenticationTokenFilter]"
//...

5:ApplicationFilterConfig@846 "ApplicationFilterConfig[name=Tomcat WebSocket (JSR356) Filter, filterClass=org.apache.tomcat.websocket.server.WsFilter]"
    
    
    
 //security范畴   
过滤器3  springSecurityFilterChain 被 org.springframework.web.filter.DelegatingFilterProxy 代理委派
    
 DelegatingFilterProxy 内部持有的  org.springframework.security.web.FilterChainProxy


 FilterChainProxy的方法doFilterInternal  

 //doFilterInternal
 //处理请求
FirewalledRequest firewallRequest = this.firewall.getFirewalledRequest((HttpServletRequest) request);
//处理响应
HttpServletResponse firewallResponse = this.firewall.getFirewalledResponse((HttpServletResponse) response);

//筛选filter 根据configure过滤  
List<Filter> filters = getFilters(firewallRequest);

  /**
   * 过滤
   */
  @Override
  public void configure(WebSecurity web) throws Exception {
    // 放行swagger拦截
    web.ignoring().antMatchers("/swagger/**").antMatchers("/swagger-ui.html").antMatchers("/webjars/**")
        .antMatchers("/v2/**").antMatchers("/v2/api-docs-ext/**").antMatchers("/swagger-resources/**")
        .antMatchers("/doc.html").antMatchers("/appendix/**").antMatchers("/test/**").antMatchers("/testAspectLog/**");
  }


	//getFilters方法内部
	private List<Filter> getFilters(HttpServletRequest request) {
		int count = 0;
		for (SecurityFilterChain chain : this.filterChains) {
			if (logger.isTraceEnabled()) {
				logger.trace(LogMessage.format("Trying to match request against %s (%d/%d)", chain, ++count,
						this.filterChains.size()));
			}
			if (chain.matches(request)) {
                //符合过滤条件则返回空的 list
				return chain.getFilters();
			}
		}
		return null;
	}


//getFilters方法内部    
 ...一系列判断
 //生成security的 filterchain
 VirtualFilterChain virtualFilterChain = new VirtualFilterChain(firewallRequest, chain, filters);
 //doFilter
每次调用 VirtualFilterChain实例的doFilter
通过以下代码获取当前的 this.additionalFilters中持有的filter的list
`this.currentPosition++;
Filter nextFilter = this.additionalFilters.get(this.currentPosition - 1);`
调用获取到的filter的doFilter方法时，通过requiresAuthentication的方法 判断是否是符合要求的filter   
if (!requiresAuthentication(request, response)) {
     chain.doFilter(request, response);
     return;
}

//调用该filter内部持有的 requiresAuthenticationRequestMatcher.matches 方法来判断该filter是否符合要求
protected boolean requiresAuthentication(HttpServletRequest request, HttpServletResponse response) {
 if (this.requiresAuthenticationRequestMatcher.matches(request)) {
  return true;
 }
 if (this.logger.isTraceEnabled()) {
  this.logger
  .trace(LogMessage.format("Did not match request to %s", 					this.requiresAuthenticationRequestMatcher));
    }
    return false;
}



//负责处理后面的鉴权异常 比如token验证
ExceptionTranslationFilter

//FilterSecurityInterceptor 中
security的最后一个filter  FilterSecurityInterceptor 会决定此次访问是否合格  鉴权方面
    


	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		invoke(new FilterInvocation(request, response, chain));
	}



	//invoke函数中
	public void invoke(FilterInvocation filterInvocation) throws IOException, ServletException {
		if (isApplied(filterInvocation) && this.observeOncePerRequest) {
			// filter already applied to this request and user wants us to observe
			// once-per-request handling, so don't re-do security checking
			filterInvocation.getChain().doFilter(filterInvocation.getRequest(), filterInvocation.getResponse());
			return;
		}
		// first time this request being called, so perform security checking
		if (filterInvocation.getRequest() != null && this.observeOncePerRequest) {
			filterInvocation.getRequest().setAttribute(FILTER_APPLIED, Boolean.TRUE);
		}
        //调用 beforeInvocation
		InterceptorStatusToken token = super.beforeInvocation(filterInvocation);
	//invoke函数中
        
    //beforeInvocation函数中
     //获取 Authentication
   		 Authentication authenticated = authenticateIfRequired();   
        
        //authenticateIfRequired函数中 会从SecurityContextHolder 获取认证的 authentication 
         Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        //authenticateIfRequired函数中
        ...
     //尝试认证   
        //该方法没捕获到异常即鉴权通过
   		attemptAuthorization(object, attributes, authenticated); 
        
        调用链
            this.accessDecisionManager.decide(authenticated, object, attributes);
        	
        	//不过此类下会抛出异常被上面的attemptAuthorization 捕获到
        	int result = voter.vote(authentication, object, configAttributes);
        
        最终在这里决定是否认证
        （
            		EvaluationContext ctx = webExpressionConfigAttribute.postProcess(
				this.expressionHandler.createEvaluationContext(authentication, filterInvocation), filterInvocation);
		boolean granted = ExpressionUtils.evaluateAsBoolean(webExpressionConfigAttribute.getAuthorizeExpression(), ctx);
            ）
      //beforeInvocation函数中

//FilterSecurityInterceptor 中
        
        
        
  
    
    
    
//security范畴   
                
	private void doFilter(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws IOException, ServletException {
		if (!requiresAuthentication(request, response)) {
			chain.doFilter(request, response);
			return;
		}
		try {
		//跳进具体的filter	Authentication authenticationResult = attemptAuthentication(request, response);
			if (authenticationResult == null) {
				// return immediately as subclass has indicated that it hasn't completed
				return;
			}
			this.sessionStrategy.onAuthentication(authenticationResult, request, response);
			// Authentication success
			if (this.continueChainBeforeSuccessfulAuthentication) {
				chain.doFilter(request, response);
			}
			successfulAuthentication(request, response, chain, authenticationResult);
		}
		catch (InternalAuthenticationServiceException failed) {
			this.logger.error("An internal error occurred while trying to authenticate the user.", failed);
			unsuccessfulAuthentication(request, response, failed);
		}
		catch (AuthenticationException ex) {
			// Authentication failed
			unsuccessfulAuthentication(request, response, ex);
		}
	}                
          
        
        filter中   this.getAuthenticationManager().authenticate(authRequest)   根据具体的authRequest 的class来取对应的provider
                
                
                
                
                
  对于provider来讲 	认证失败抛异常
     
                try {
                    result = provider.authenticate(authentication);
                    if (result != null) {
                        copyDetails(authentication, result);
                        break;
                    }
                }
        catch (AccountStatusException | InternalAuthenticationServiceException ex) {
            prepareException(ex, authentication);
            // SEC-546: Avoid polling additional providers if auth failure is due to
            // invalid account status
            throw ex;
        }
        
        //认证成功
        
        		if (result != null) {
			if (this.eraseCredentialsAfterAuthentication && (result instanceof CredentialsContainer)) {
				// Authentication is complete. Remove credentials and other secret data
				// from authentication
				((CredentialsContainer) result).eraseCredentials();
			}
			// If the parent AuthenticationManager was attempted and successful then it
			// will publish an AuthenticationSuccessEvent
			// This check prevents a duplicate AuthenticationSuccessEvent if the parent
			// AuthenticationManager already published it
			if (parentResult == null) {
				this.eventPublisher.publishAuthenticationSuccess(result);
			}

			return result;
		}


   
        
 //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
        org.apache.catalina.core.StandardHostValve { 
            //请求处理入口
              context.getPipeline().getFirst().invoke(request, response);
            //被响应会在内部处理掉
            
            
            //fliterChain 处理后 如果请求没有被响应 则走下来
		    // Look for (and render if found) an application level error page（处理异常）
            if (response.isErrorReportRequired()) {
                // If an error has occurred that prevents further I/O, don't waste time
                // producing an error report that will never be read
                AtomicBoolean result = new AtomicBoolean(false);
                response.getCoyoteResponse().action(ActionCode.IS_IO_ALLOWED, result);
                if (result.get()) {
                    if (t != null) {
                        throwable(request, response, t);
                    } else {
                        status(request, response);
                    }
                }
            }
           
        }
        
        
     //status 方法内部
          private void status(Request request, Response response) {

        int statusCode = response.getStatus();

        // Handle a custom error page for this status code
        Context context = request.getContext();
        if (context == null) {
            return;
        }

        /* Only look for error pages when isError() is set.
         * isError() is set when response.sendError() is invoked. This
         * allows custom error pages without relying on default from
         * web.xml.
         */
        if (!response.isError()) {
            return;
        }
              
		//寻找设置的statusCode对应页面路径
        ErrorPage errorPage = context.findErrorPage(statusCode);
        if (errorPage == null) {
            // Look for a default error page  （没找到 找默认的）
            errorPage = context.findErrorPage(0);
        }
        if (errorPage != null && response.isErrorReportRequired()) {
            response.setAppCommitted(false);
            request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE,
                              Integer.valueOf(statusCode));

            String message = response.getMessage();
            if (message == null) {
                message = "";
            }
            request.setAttribute(RequestDispatcher.ERROR_MESSAGE, message);
            request.setAttribute(Globals.DISPATCHER_REQUEST_PATH_ATTR,
                    errorPage.getLocation());
            request.setAttribute(Globals.DISPATCHER_TYPE_ATTR,
                    DispatcherType.ERROR);


            Wrapper wrapper = request.getWrapper();
            if (wrapper != null) {
                request.setAttribute(RequestDispatcher.ERROR_SERVLET_NAME,
                                  wrapper.getName());
            }
            request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI,
                                 request.getRequestURI());
            if (custom(request, response, errorPage)) {
                response.setErrorReported();
                try {
                    response.finishResponse();
                } catch (ClientAbortException e) {
                    // Ignore
                } catch (IOException e) {
                    container.getLogger().warn("Exception Processing " + errorPage, e);
                }
            }
        }
    }
     //status 方法内部
        

        
        
       //问题！！！！！ 
        
       //前提假设请求在filterChain中没有被响应   
        
        
        //org.springframework.security.web.access.intercept.FilterSecurityInterceptor 中代码
         if (isApplied(filterInvocation) && this.observeOncePerRequest) {
			// filter already applied to this request and user wants us to observe
			// once-per-request handling, so don't re-do security checking
			filterInvocation.getChain().doFilter(filterInvocation.getRequest(), filterInvocation.getResponse());
			return;
		}  
            //org.springframework.security.web.access.intercept.FilterSecurityInterceptor 中代码
  
        
     //sercurity 配置    
        
        
        
        
        
     //1.  http.csrf().disable() 没有设置 根据结构图可知  没生成anonymous 就抛出异常 故没有经过   org.springframework.security.web.access.intercept.FilterSecurityInterceptor 此过滤器认证成功， 由以上代码可知  /error 的请求需要再次验证但 /error 不在anonymous的访问权限中 故403  
     http.authorizeRequests().antMatchers(HttpMethod.POST, "/login").anonymous();   
        
     //2.1  http.csrf().disable() 设置 根据结构图可知  可生成anonymousanonymous用户  
     //且经过 org.springframework.security.web.access.intercept.FilterSecurityInterceptor 此过滤器认证成功//故sercurity认证成功 
    // error 的请求需要再次验证但 虽然/error 不在anonymous的访问权限中 但此前已经验证过，故验证通过
        
            
     //2.2但如果 post方法不提供requestBody且 不传
     http.authorizeRequests().antMatchers(HttpMethod.POST, "/login").anonymous();  
           
     //会抛出异常  前端最终收到的是400 Bad request   日志打印具体原因 //因为以下代码读取body失败且body必传 故抛出异常
        
        //转发 /error 的时候 不改变请求方式 被内部 org.springframework.boot.autoconfigure.web.servlet.error.BasicErrorController 处理返回400 bad Request
     org.springframework.web.servlet.mvc.method.annotation.RequestResponseBodyMethodProcessor 的
         
     @Override 
	protected <T> Object readWithMessageConverters(NativeWebRequest webRequest, MethodParameter parameter,
			Type paramType) throws IOException, HttpMediaTypeNotSupportedException, HttpMessageNotReadableException {

		HttpServletRequest servletRequest = webRequest.getNativeRequest(HttpServletRequest.class);
		Assert.state(servletRequest != null, "No HttpServletRequest");
		ServletServerHttpRequest inputMessage = new ServletServerHttpRequest(servletRequest);

		Object arg = readWithMessageConverters(inputMessage, parameter, paramType);
		if (arg == null && checkRequired(parameter)) {
			throw new HttpMessageNotReadableException("Required request body is missing: " +
					parameter.getExecutable().toGenericString(), inputMessage);
		}
		return arg;
	}    
        
```



