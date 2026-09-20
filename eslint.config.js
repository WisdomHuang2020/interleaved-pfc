import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginReactRefresh from "eslint-plugin-react-refresh";

/** @type {import('eslint').Linter.Config[]} */
export default [
  // 全局忽略：构建产物与编辑器配置不在源码管辖范围内。
  // eslint 9 的 flat config 默认只忽略 node_modules，dist/ 必须显式忽略，
  // 否则会把压缩后的 bundle 当源码逐行报错（历史上单次报出 2539 条）。
  { ignores: ["dist/**", ".vscode/**"] },
  {files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"]},
  {languageOptions: { globals: globals.browser }},
  {settings: { react: { version: "detect" } }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  pluginReact.configs.flat["jsx-runtime"],
  // Hooks 与 Fast Refresh 规则此前只装了插件、没接进配置，等于从未生效。
  // 两个官方 config 自带 plugins 字段，这里只补 files 限定作用范围。
  // 注意 exhaustive-deps 是 warn 级：warn 不影响 eslint 退出码，而 CI 门禁只看退出码，
  // 所以必须在 package.json 的 lint 脚本上加 --max-warnings=0 才真正有拦截力。
  { ...pluginReactHooks.configs["recommended-latest"], files: ["**/*.{ts,tsx}"] },
  { ...pluginReactRefresh.configs.vite, files: ["**/*.{ts,tsx}"] },
];
