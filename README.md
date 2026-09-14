# Interleaved PFC Design Tool

交错并联 Boost PFC 变换器设计工具 — 基于 React 19 + Vite 6 + Tailwind CSS v4 + TypeScript。

在线访问：https://wisdomhuang2020.github.io/interleaved-pfc/

## 技术栈

- **前端**: React 19 + Vite 6 + Tailwind CSS v4 + TypeScript
- **路由**: react-router-dom (HashRouter)
- **图表**: recharts
- **公式渲染**: KaTeX
- **动画**: framer-motion
- **图标**: lucide-react

## 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 项目概述、交错导通实时演示与关键设计参数一览 |
| PFC 基础 | `/fundamentals` | 交错并联 PFC 基本概念与器件作用 |
| 工作原理 | `/operation` | 工作阶段划分，各阶段各器件的电流电压 |
| 公式推导 | `/derivations` | 从伏秒平衡出发，推导电感、电容、纹波抵消与损耗设计式 |
| 特性曲线 | `/curves` | 占空比、电流纹波、交错波形、效率等曲线可视化 |
| 参数设计 | `/designer` | 输入规格后计算电感、电容、输入电流、纹波等 |
| 报告输出 | `/report` | 汇总设计规格与计算结果；**需先在参数设计页完成计算** |

## 开发

```bash
npm install
npm run dev      # 启动开发服务器
npm run lint     # ESLint 静态检查
npm run build    # 类型检查 + 生产构建
npm run preview  # 本地预览构建产物
```

## 构建与部署

```bash
npm run build
```

构建输出目录为 `dist/`，使用 `./` 作为 base 路径，适配 GitHub Pages 的子路径部署。

推送到 `main` 分支会触发 `.github/workflows/deploy.yml`，由 GitHub Actions 执行
`npm ci && npm run build` 并发布到 GitHub Pages。

### 前端分包

首页 `/` 为静态导入（落地页，懒加载只会增加一次请求瀑布），其余 6 个路由通过
`React.lazy` + `Suspense` 按需加载。这样 `recharts`（仅特性曲线页使用）与 `KaTeX`
（仅公式相关页面使用）不再进入首屏 chunk。

## 项目结构

```
interleaved-pfc/
├── index.html              # 入口 HTML
├── package.json            # 依赖与脚本
├── vite.config.ts          # Vite 配置 (base: './')
├── eslint.config.js        # ESLint 配置
├── tsconfig.app.json       # TypeScript 配置
├── scripts/commit.sh       # 提交辅助脚本
├── .github/workflows/      # GitHub Pages 部署工作流
├── src/
│   ├── main.tsx            # 应用入口
│   ├── App.tsx             # 路由配置与各页面的懒加载声明
│   ├── index.css           # 全局样式 (Tailwind v4)
│   ├── vite-env.d.ts       # Vite 类型声明
│   ├── components/
│   │   ├── Layout.tsx            # 页面布局（顶部导航 + 页脚）
│   │   ├── CollapsibleSection.tsx # 可折叠章节
│   │   ├── TopologyDiagram.tsx    # 拓扑示意图
│   │   ├── InterleaveAnimation.tsx # 交错导通波形演示
│   │   ├── MathBlock.tsx          # KaTeX 行间公式
│   │   └── InlineMath.tsx         # KaTeX 行内公式
│   ├── pages/              # 7 个页面，见上表
│   └── lib/
│       ├── DesignContext.tsx  # 设计参数全局状态
│       └── pfcCalc.ts         # PFC 核心计算库
└── public/                 # 静态资源（图片、favicon）
```

## PFC关键参数

- **输入电压范围**: Vin_min ~ Vin_max (V)
- **输出电压**: Vout (V)
- **输出功率**: Pout (W)
- **开关频率**: fsw (Hz)
- **交错相数**: N
- **Boost电感**: L (H)
- **电感电流纹波**: ΔIL (A)
- **输入电流THD**: THD (%)
- **效率**: η

## 许可证

仅供学习与研究使用。
