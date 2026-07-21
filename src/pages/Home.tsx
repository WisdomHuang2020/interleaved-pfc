import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Zap, BookOpen, SlidersHorizontal, TrendingUp, ArrowRight } from 'lucide-react'
import InterleaveAnimation from '../components/InterleaveAnimation'

const features = [
  {
    icon: BookOpen,
    title: 'PFC 原理',
    description: '深入了解交错并联Boost PFC的工作原理、电流纹波抵消机制与THD分析。',
    path: '/theory',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
  },
  {
    icon: SlidersHorizontal,
    title: '参数设计',
    description: '输入电压、输出功率、开关频率等参数，自动计算电感、电容与纹波。',
    path: '/designer',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    icon: TrendingUp,
    title: '特性曲线',
    description: '可视化电感电流纹波、THD、效率等关键指标随工况变化的特性曲线。',
    path: '/curves',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
  },
]

export default function Home() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <motion.section
        className="text-center space-y-6 py-12"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <span>电力电子设计工具</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          交错并联
          <span className="text-primary"> PFC</span>
          <br />
          设计工具
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          基于 React + Vite 的交互式交错并联Boost PFC变换器设计与分析平台。
          支持参数设计、特性曲线绘制与效率分析。
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/designer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            开始设计
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/theory"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
          >
            查看原理
          </Link>
        </div>
      </motion.section>

      {/* Features Grid */}
      <motion.section
        className="grid gap-6 md:grid-cols-3"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
        variants={{ visible: { transition: { staggerChildren: 0.12 } } }}
      >
        {features.map((feature) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.path}
              variants={{
                hidden: { opacity: 0, y: 24 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
              }}
            >
            <Link
              to={feature.path}
              className="group block h-full rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className={`mb-4 inline-flex rounded-lg ${feature.bg} p-3`}>
                <Icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="mb-2 text-xl font-semibold group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                进入页面 <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
            </motion.div>
          )
        })}
      </motion.section>

      {/* 实时波形演示 */}
      <motion.section
        className="rounded-xl border border-border bg-card p-6 md:p-8"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h2 className="text-2xl font-bold mb-2">交错导通实时演示</h2>
        <p className="text-muted-foreground text-sm mb-6">
          各相开关信号错相 360°/N 运行，电感电流纹波相互抵消 —— 拖动占空比或切换相数，实时观察总输入电流纹波的变化。
        </p>
        <InterleaveAnimation />
      </motion.section>

      {/* PFC Overview */}
      <section className="rounded-xl border border-border bg-card p-8">
        <h2 className="text-2xl font-bold mb-6">交错并联Boost PFC 概述</h2>
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p>
              交错并联Boost PFC（Interleaved Boost PFC）通过将多相Boost变换器并联运行，
              各相开关信号之间保持固定的相位差（通常为 360°/N），实现输入电流纹波的有效抵消。
            </p>
            <p>
              相比单相PFC，交错并联技术可显著降低输入电流纹波、减小EMI滤波器体积、
              提高功率等级，同时保持各相器件的电流应力在合理范围内。
            </p>
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">关键优势</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                输入电流纹波显著降低（理论上可抵消至单相的 1/N）
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                开关频率等效提升，减小磁性元件体积
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                热分布均匀，改善散热设计
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                功率等级扩展性强，适合高功率应用
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Key Parameters */}
      <section>
        <h2 className="text-2xl font-bold mb-6">关键设计参数</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: '输入电压 Vin', value: '85~265 Vac', desc: '通用输入范围' },
            { label: '输出电压 Vout', value: '380~400 Vdc', desc: '典型Boost输出' },
            { label: '输出功率 Pout', value: '1~10 kW', desc: '中高功率等级' },
            { label: '开关频率 fsw', value: '50~100 kHz', desc: '常用开关频率' },
            { label: '交错相数 N', value: '2~4 相', desc: '常见2相或3相' },
            { label: 'Boost电感 L', value: '100~500 μH', desc: '每相电感量' },
            { label: '电流纹波 ΔIL', value: '< 20%', desc: '占电感电流峰值' },
            { label: '输入THD', value: '< 5%', desc: 'IEC 61000-3-2 要求' },
          ].map((param) => (
            <div
              key={param.label}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="text-sm text-muted-foreground">{param.label}</div>
              <div className="mt-1 text-lg font-semibold">{param.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{param.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
