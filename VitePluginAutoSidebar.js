export default function VitePluginAutoSidebar(options) {
  return {
    name: 'VitePluginAutoSidebar',
    configureServer: ({ watcher, restart }) => {
      const fsWatcher = watcher.add('*.md');
      fsWatcher.on('all', (event, filePath) => {
        if (event === 'addDir') return;
        if (event === 'unlinkDir') return;
        if (event == 'add') return;
        if (event === 'unlink') {
          restart();
          return;
        }
        if (event === 'change') {
          restart();
          return;
        }
      });
    },
    config(config) {
      config.vitepress.site.themeConfig.sidebar = generateSidebarConfig(
        options.root
      );
      return config;
    },
  };
}

import fs from 'fs';
import path from 'path';

function generateSidebarConfig(docsPath, link = '', index = 0) {
  let C = [];

  const files = fs.readdirSync(docsPath);

  files.forEach((filename) => {
    if (filename.startsWith('.')) return;
    const filepath = path.join(docsPath, filename);
    const stat = fs.statSync(filepath);
    // 如果是文件夹，则递归生成子级 sidebar 配置
    if (stat.isDirectory()) {
      let sidebarConfig = {};
      sidebarConfig.text = filename;
      if (filename === 'src') {
        sidebarConfig.text = 'index';
        sidebarConfig.link = '/src/';
      }

      C.push(sidebarConfig);

      if (!sidebarConfig.items) {
        sidebarConfig.items = [];
      }

      sidebarConfig.items = generateSidebarConfig(
        filepath,
        `${link}${filename}/`,
        index + 1
      );
    } else {
      const extname = path.extname(filepath);
      const basename = path.basename(filepath, extname);
      if (filename === 'index.md' && index > 1) {
        C.push({
          text: basename,
          link: `/${link}${basename}`,
        });
      }
      if (extname === '.md' && filename !== 'index.md') {
        C.push({
          text: basename,
          link: `/${link}${basename}`,
        });
      }
    }
  });
  return C;
}
