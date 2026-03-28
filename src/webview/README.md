webview是一个vite子项目

## 格式化

- prettier格式化仅针对此子项目下的html字符串代码
- 在vanilla js下实现类react模式

## lit-html
- 使用标志`html`标识html字符串，依赖vscode插件`lit=html`
- 为了使html字符串格式化正常应避免深层嵌套js逻辑

## Vite

- 使用vite标准构建模式，定义根目录为dist，参考vite.config.ts
- 依赖extension注入base标签实现允许uri访问dist相对路径

## Monaco

- 缩略图仅使用monaco的colorize，使用按需导入以优化性能。
- 同时为了防止异步动态导入monaco语言包导致的布局闪烁，按需导入相关操作被提前到lit的render之前，以确保 `editor.colorize` 执行前语言包准备就绪