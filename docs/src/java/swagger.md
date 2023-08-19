##### 自定义扩展swagger 

为什么要自定义扩展，主要是懒得写各种值, 例如  0-是 1-否 这种并且如果发生变化则还需同步修改就挺烦的

初步设想是通过自定义swagger的注解，提供一个枚举类来维护这个，这样只需要维护枚举类即可

实现的时候坑挺多的，但此时笔者已经离职近半年，太细节的记不住了，就只贴一些关键代码了。



最关键的核心点就是提供一个处理自己自定义的注解插件

自定义注解时需要注意尽量做加法，即增加属性。



~~~java
/**
 * Swagger builder插件
 *
 * @author TL
 * @date 2022/09/08
 */
@Component
public class SwaggerEnumBuilderPlugin implements ModelPropertyBuilderPlugin, ParameterBuilderPlugin, OperationBuilderPlugin, ExpandedParameterBuilderPlugin {
    private final DescriptionResolver descriptions;

    @Autowired
    public SwaggerEnumBuilderPlugin(DescriptionResolver descriptions) {
        this.descriptions = descriptions;
    }


    /**
     * Model中field字段描述的自定义处理策略
     *
     * @param modelPropertyContext 模型属性上下文
     */
    @Override
    public void apply(ModelPropertyContext modelPropertyContext) {
        if (!modelPropertyContext.getBeanPropertyDefinition().isPresent()) {
            return;
        }
        BeanPropertyDefinition beanPropertyDefinition = modelPropertyContext.getBeanPropertyDefinition().get();
        //只对该注解做处理
        ApiPropertyEnumReference annotation = findAnnotation(beanPropertyDefinition);
        if (annotation == null) return;
        // 生成需要拼接的取值含义描述内容
        SwaggerDisplayEnumInfoParser swaggerDisplayEnumInfo = swaggerDisplayEnumInfoParser(annotation.referenceClazz());

        String allowableValueStr = annotation.allowableValues().equals("") ? swaggerDisplayEnumInfo.allowableValueStr() : annotation.allowableValues();
        AllowableValues allowableValues = allowableValueFromString(allowableValueStr);
        String valueDesc = swaggerDisplayEnumInfo.resolveDescription(annotation.value(), annotation.value());
        maybeSetParameterName(modelPropertyContext, annotation.name())
                .description(valueDesc)
                .required(annotation.required())
                .allowableValues(allowableValues)
                .type(modelPropertyContext.getResolver()
                        .resolve(beanPropertyDefinition.getField().getRawType()))
                .build();
    }

    /**
     * get入参的自定义处理策略
     *
     * @param parameterContext 参数上下文
     */
    @Override
    public void apply(ParameterContext parameterContext) {
        ApiPropertyEnumReference reference =
                parameterContext.getOperationContext().findAnnotation(ApiPropertyEnumReference.class).orNull();
        //只针对该注解做处理
        if (reference == null) return;
        // 生成需要拼接的取值含义描述内容
        SwaggerDisplayEnumInfoParser swaggerDisplayEnumInfo = swaggerDisplayEnumInfoParser(reference.referenceClazz());
        String desc = swaggerDisplayEnumInfo.resolveDescription(reference.value(), reference.value());
        if (StringUtils.isNotEmpty(reference.name())) {
            parameterContext.parameterBuilder().name(reference.name());
        }
        parameterContext.parameterBuilder().description(desc);
        AllowableValues allowableListValues = allowableValueFromString(swaggerDisplayEnumInfo.allowableValueStr());
        parameterContext.parameterBuilder().allowableValues(allowableListValues).build();
    }


    /**
     * 处理显式注解
     *
     * @param context 上下文
     */
    @Override
    public void apply(OperationContext context) {
        context.operationBuilder().parameters(readParameters(context));
    }


    /**
     * 需要展开的post入参
     *
     * @param context 上下文
     */
    @Override
    public void apply(ParameterExpansionContext context) {
        Optional<ApiPropertyEnumReference> apiModelPropertyOptional = context.findAnnotation(ApiPropertyEnumReference.class);
        if (apiModelPropertyOptional.isPresent()) {
            ApiPropertyEnumReference annotation = apiModelPropertyOptional.get();

            // 生成需要拼接的取值含义描述内容
            SwaggerDisplayEnumInfoParser swaggerDisplayEnumInfo = swaggerDisplayEnumInfoParser(annotation.referenceClazz());
            String valueDesc = swaggerDisplayEnumInfo.resolveDescription(annotation.value(), annotation.value());

            maybeSetParameterName(context, annotation.name())
                    .description(valueDesc)
                    .required(annotation.required())
                    //.allowableValues(allowable)
                    //.parameterAccess(apiModelProperty.access())
                    //.hidden(apiModelProperty.hidden())
                    //.scalarExample(apiModelProperty.example())
                    .order(SWAGGER_PLUGIN_ORDER)
                    .build();
        }
    }

    static SwaggerDisplayEnumInfoParser swaggerDisplayEnumInfoParser(Class<? extends Enum> aClass) {
        SwaggerDisplayEnumInfoParser swaggerDisplayEnumInfo = new SwaggerDisplayEnumInfoParser(aClass);
        swaggerDisplayEnumInfo.parse();
        return swaggerDisplayEnumInfo;
    }

    private ParameterBuilder maybeSetParameterName(ParameterExpansionContext context, String parameterName) {
        if (!Strings.isNullOrEmpty(parameterName)) {
            context.getParameterBuilder().name(parameterName);
        }
        return context.getParameterBuilder();
    }

    private ModelPropertyBuilder maybeSetParameterName(ModelPropertyContext context, String parameterName) {
        if (!Strings.isNullOrEmpty(parameterName)) {
            context.getBuilder().name(parameterName);
        }
        return context.getBuilder();
    }

    ApiPropertyEnumReference findAnnotation(BeanPropertyDefinition propertyDefinition) {
        AnnotationMap allAnnotations = propertyDefinition.getField().getAllAnnotations();
        for (Annotation annotation : allAnnotations.annotations()) {
            if (annotation instanceof ApiPropertyEnumReference) {
                ApiPropertyEnumReference apiPropertyEnumReference = (ApiPropertyEnumReference) annotation;
                return apiPropertyEnumReference;
            }
        }
        return null;
    }


    @Override
    public boolean supports(DocumentationType delimiter) {
        return true;
    }

    private List<Parameter> readParameters(OperationContext context) {
        Optional<ApiImplicitEnumParams> annotations = context.findAnnotation(ApiImplicitEnumParams.class);
        List<Parameter> parameters = Lists.newArrayList();
        //兼容默认的注解
        if (annotations.isPresent()) {
            for (ApiImplicitParam param : annotations.get().value()) {
                parameters.add(implicitParameter(descriptions, param));
            }
        }
        if (annotations.isPresent()) {
            for (ApiImplicitEnumParam param : annotations.get().enumsValue()) {
                parameters.add(implicitParameter(descriptions, param));
            }
        }
        return parameters;
    }

    static Parameter implicitParameter(DescriptionResolver descriptions, ApiImplicitEnumParam param) {
        SwaggerDisplayEnumInfoParser parsed = new SwaggerDisplayEnumInfoParser(param.allowableValue()).parse();
        boolean failed = parsed.isFailed();
        String description = null;
        ModelRef modelRef = null;
        if (!failed) {
            description = parsed.resolveDescription(param.value());
            modelRef = maybeGetModelRef(param, parsed);
        } else {
            //使用默认实现
            description = descriptions.resolve(param.value());
            modelRef = maybeGetModelRef(param, null);
        }
        return new ParameterBuilder()
                .name(param.name())
                .description(description)
                .defaultValue(param.defaultValue())
                .required(param.required())
                .allowMultiple(param.allowMultiple())
                .modelRef(modelRef)
                .allowableValues(allowableValueFromString(parsed.allowableValueStr()))
                .parameterType(emptyToNull(param.paramType()))
                .parameterAccess(param.access())
                .order(SWAGGER_PLUGIN_ORDER)
                .scalarExample(param.example())
                .complexExamples(examples(param.examples()))
                .build();
    }

    private static ModelRef maybeGetModelRef(ApiImplicitEnumParam param, SwaggerDisplayEnumInfoParser swaggerDisplayEnumInfoParser) {
        //默认实现
        if (swaggerDisplayEnumInfoParser == null) {
            String dataType = MoreObjects.firstNonNull(emptyToNull(param.dataType()), "string");
            AllowableValues allowableValues = null;
            if (isBaseType(dataType)) {
                allowableValues = allowableValueFromString(param.allowableValues());
            }
            if (param.allowMultiple()) {
                return new ModelRef("", new ModelRef(dataType, allowableValues));
            }
            return new ModelRef(dataType, allowableValues);
        }

        String dataType = MoreObjects.firstNonNull(emptyToNull(swaggerDisplayEnumInfoParser.getValueType().getSimpleName()), "string");
        AllowableValues allowableValues = allowableValueFromString(swaggerDisplayEnumInfoParser.allowableValueStr());
        if (param.allowMultiple()) {
            return new ModelRef("", new ModelRef(dataType, allowableValues));
        }
        return new ModelRef(dataType, allowableValues);
    }

    //默认实现
    static Parameter implicitParameter(DescriptionResolver descriptions, ApiImplicitParam param) {
        ModelRef modelRef = maybeGetModelRef(param);
        return new ParameterBuilder()
                .name(param.name())
                .description(descriptions.resolve(param.value()))
                .defaultValue(param.defaultValue())
                .required(param.required())
                .allowMultiple(param.allowMultiple())
                .modelRef(modelRef)
                .allowableValues(allowableValueFromString(param.allowableValues()))
                .parameterType(emptyToNull(param.paramType()))
                .parameterAccess(param.access())
                .order(SWAGGER_PLUGIN_ORDER)
                .scalarExample(param.example())
                .complexExamples(examples(param.examples()))
                .build();
    }

    //默认实现
    private static ModelRef maybeGetModelRef(ApiImplicitParam param) {
        String dataType = MoreObjects.firstNonNull(emptyToNull(param.dataType()), "string");
        AllowableValues allowableValues = null;
        if (isBaseType(dataType)) {
            allowableValues = allowableValueFromString(param.allowableValues());
        }
        if (param.allowMultiple()) {
            return new ModelRef("", new ModelRef(dataType, allowableValues));
        }
        return new ModelRef(dataType, allowableValues);
    }

}
~~~

从上述代码可以看出我实现了四个接口
ModelPropertyBuilderPlugin,
ParameterBuilderPlugin, 
OperationBuilderPlugin, 
ExpandedParameterBuilderPlugin 

如何找到这四个接口，看文档太慢 ，直接debug源码找到的

###### ModelPropertyBuilderPlugin  

该接口是处理 bean的情况  如 requesbody 或者responsebody

这里处理的自定义注解是ApiPropertyEnumReference

~~~java
/**
 * 自定义解析枚举的swagger注解
 * <p>
 * 此注解用在Model和 入参
 *
 * @author TL
 * @date 2022/09/07
 */
@Target({ElementType.FIELD, ElementType.METHOD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface ApiPropertyEnumReference {
    // 接口文档上的显示的字段名称，不设置则使用field本来名称
    String name() default "";

    // 字段简要描述，可选
    String value() default "";

    String allowableValues() default "";

    // 标识字段是否必填
    boolean required() default false;

    // 指定取值对应的枚举类
    Class<? extends Enum> referenceClazz();
}
~~~

###### ParameterBuilderPlugin 

该接口是处理参数再方法入参上的注解 对应的注解也是ApiPropertyEnumReference

###### OperationBuilderPlugin 

该接口处理的是 方法的显示注解    自定义的注解为ApiImplicitEnumParams 和  ApiImplicitEnumParam

此处我对原来的注解ApiImplicitParam 做了兼容

因为做的是加法这里具体注解代码太长就不展示了  

###### ParameterExpansionContext（不常用）

该接口是处理哪些将入参bean的属性平铺展开的情况  处理的注解为ApiPropertyEnumReference

上述四个几口糅合到了一个插件里，扩展这个小小的功能增加的文件数已经很多了，故而写在一起，也可以根据喜好分开实现。

###### 题外话

当时在做这个项目的时候，时间比较充足，就想着既然需要传什么值在swagger通过配置枚举类已经定好了，何不顺便将校验一起做了。 因为虽然前端现在知道需要传什么值了，但如果传错了也没有什么提示信息，故而有了该想法，就顺便深度自定义了spring的验证框架validation， 并使其可以通过swagger注解指定的枚举类，判断前端传值是否合法。

实现过程中寻找扩展点的时候踩了不少坑, 不过这是另一个话题了，随后有机会再聊。

---

###### swaggeer扩展过程中的一些源码调试

  ~~~java
...springfox.documentation.spring.web.plugins.DocumentationPluginsBootstrapper...
public void start() {
    if (initialized.compareAndSet(false, true)) {
      log.info("Context refreshed");
      List<DocumentationPlugin> plugins = pluginOrdering()
          .sortedCopy(documentationPluginsManager.documentationPlugins());
      log.info("Found {} custom documentation plugin(s)", plugins.size());
      for (DocumentationPlugin each : plugins) {
        DocumentationType documentationType = each.getDocumentationType();
        if (each.isEnabled()) {
          //
          scanDocumentation(buildContext(each));
        } else {
          log.info("Skipping initializing disabled plugin bean {} v{}",
              documentationType.getName(), documentationType.getVersion());
        }
      }
    }
  }

  private DocumentationContext buildContext(DocumentationPlugin each) {
    return each.configure(defaultContextBuilder(each));
  }

 
private DocumentationContextBuilder defaultContextBuilder(DocumentationPlugin plugin) {
    DocumentationType documentationType = plugin.getDocumentationType();
    //获取所有的Mapping
    List<RequestHandler> requestHandlers = from(handlerProviders)
        .transformAndConcat(handlers())
        .toList();
    List<AlternateTypeRule> rules = from(nullToEmptyList(typeConventions))
        .transformAndConcat(toRules())
        .toList();
    return documentationPluginsManager
        .createContextBuilder(documentationType, defaultConfiguration)
        .rules(rules)
        .requestHandlers(combiner().combine(requestHandlers));
}
  ~~~

~~~java
...springfox.documentation.spring.web.plugins.DocumentationPluginsBootstrapper...
private void scanDocumentation(DocumentationContext context) {
    try {
        //
        scanned.addDocumentation(resourceListing.scan(context));
    } catch (Exception e) {
        log.error(String.format("Unable to scan documentation context %s", context.getGroupName()), e);
    }
}
~~~

~~~java
...springfox.documentation.spring.web.scanners.ApiDocumentationScanner...  
public Documentation scan(DocumentationContext context) {
    //这里扫描有注解的接口
    ApiListingReferenceScanResult result = apiListingReferenceScanner.scan(context);
    ApiListingScanningContext listingContext = new ApiListingScanningContext(context,
        result.getResourceGroupRequestMappings());
	//生成细则
    Multimap<String, ApiListing> apiListings = apiListingScanner.scan(listingContext);
    Set<Tag> tags = toTags(apiListings);
    tags.addAll(context.getTags());
    DocumentationBuilder group = new DocumentationBuilder()
        .name(context.getGroupName())
        .apiListingsByResourceGroupName(apiListings)
        .produces(context.getProduces())
        .consumes(context.getConsumes())
        .host(context.getHost())
        .schemes(context.getProtocols())
        .basePath(context.getPathProvider().getApplicationBasePath())
        .extensions(context.getVendorExtentions())
        .tags(tags);

    Set<ApiListingReference> apiReferenceSet = newTreeSet(listingReferencePathComparator());
    apiReferenceSet.addAll(apiListingReferences(apiListings, context));

    ResourceListing resourceListing = new ResourceListingBuilder()
        .apiVersion(context.getApiInfo().getVersion())
        .apis(from(apiReferenceSet).toSortedList(context.getListingReferenceOrdering()))
        .securitySchemes(context.getSecuritySchemes())
        .info(context.getApiInfo())
        .build();
    group.resourceListing(resourceListing);
    return group.build();
  }
~~~

