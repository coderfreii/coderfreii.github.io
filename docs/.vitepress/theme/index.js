import DefaultTheme from 'vitepress/theme'; //viteperss的主题

// import MyLayout from "../../../src/client/theme-default/Layout.vue"
export default {
  ...DefaultTheme,
    
  enhanceApp({ app, router, siteData }) {
    // app is the Vue 3 app instance from `createApp()`.
    // router is VitePress' custom router. `siteData` is
    // a `ref` of current site-level metadata.
  },

  setup() {
    // this function will be executed inside VitePressApp's
    // setup hook. all composition APIs are available here.
  }
}
