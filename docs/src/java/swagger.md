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

