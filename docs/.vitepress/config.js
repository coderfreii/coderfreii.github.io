import AutoSidebar from '../../VitePluginAutoSidebar';
import { defineConfig } from 'vitepress';

import path from 'path';


const docsPath = path.dirname(__dirname); // docs 目录路径

export default defineConfig({
  vite: {
    plugins: [
      AutoSidebar({
        root: `${docsPath}`,
      }),
    ],
  },

  base: '/',
  themeConfig: {
    lastUpdated: 'Last Updated',
    nav: [{ text: 'Github', link: 'https://github.com/coderfreii' }],
    outline: 'deep',
  },

  markdown: {
    lineNumbers: true,
  },
});
