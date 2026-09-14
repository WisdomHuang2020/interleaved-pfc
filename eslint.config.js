import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

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
];
