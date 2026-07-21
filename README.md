# Interleaved PFC Design Tool

交错并联Boost PFC变换器设计工具 — 基于 React 19 + Vite 6 + Tailwind CSS v4 + TypeScript。

## 技术栈

- **前端**: React 19 + Vite 6 + Tailwind CSS v4 + TypeScript
- **路由**: react-router-dom (HashRouter)
- **图表**: recharts
- **公式渲染**: KaTeX
- **动画**: framer-motion
- **图标**: lucide-react
- **UI组件**: Radix UI primitives

## 页面结构

| 页面 | 路径 | 说明 |
|------|------|------|
| 首页 | `/` | 项目介绍与功能导航 |
| PFC原理 | `/theory` | 交错并联PFC工作原理、公式推导 |
| 参数设计 | `/designer` | 输入设计参数，自动计算电感、电容、THD等 |
| 特性曲线 | `/curves` | 占空比、电流纹波、交错波形、效率曲线可视化 |

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建输出目录为 `dist/`，使用 `./` 作为 base 路径，适配 GitHub Pages 部署。

## 项目结构

```
interleaved-pfc/
├── index.html              # 入口HTML
├── package.json            # 依赖配置
├── vite.config.ts          # Vite配置 (base: './')
├── tsconfig.app.json       # TypeScript配置
├── src/
│   ├── main.tsx            # 应用入口
│   ├── App.tsx             # 路由配置
│   ├── index.css           # 全局样式 (Tailwind v4)
│   ├── vite-env.d.ts       # Vite类型声明
│   ├── components/
│   │   ├── Layout.tsx      # 页面布局
│   │   ├── Header.tsx      # 导航头部
│   │   ├── Footer.tsx      # 页脚
│   │   └── MathBlock.tsx   # KaTeX公式组件
│   ├── pages/
│   │   ├── Home.tsx        # 首页
│   │   ├── Theory.tsx      # PFC原理
│   │   ├── Designer.tsx    # 参数设计
│   │   └── Curves.tsx      # 特性曲线
│   ├── lib/
│   │   ├── DesignContext.tsx  # 设计参数全局状态
│   │   └── pfcCalc.ts         # PFC核心计算库
│   └── hooks/              # 自定义Hooks
└── public/                 # 静态资源
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
