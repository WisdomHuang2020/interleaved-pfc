import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts'

type CurveType = 'ripple' | 'thd' | 'efficiency' | 'inductor'

interface CurveConfig {
  key: CurveType
  label: string
  xLabel: string
  yLabel: string
  color: string
}

const curveConfigs: CurveConfig[] = [
  { key: 'ripple', label: '电感电流纹波 vs 占空比', xLabel: '占空比 D', yLabel: '纹波电流 ΔIL (A)', color: '#3b82f6' },
  { key: 'thd', label: 'THD vs 输入电压', xLabel: '输入电压 Vin (Vac)', yLabel: 'THD (%)', color: '#ef4444' },
  { key: 'efficiency', label: '效率 vs 负载', xLabel: '负载率 (%)', yLabel: '效率 η (%)', color: '#10b981' },
  { key: 'inductor', label: '电感量 vs 开关频率', xLabel: '开关频率 fsw (kHz)', yLabel: '电感量 L (μH)', color: '#f59e0b' },
]

function generateRippleData(nPhases: number): { x: number; y: number; label: string }[] {
  const data: { x: number; y: number; label: string }[] = []
  const vin = 85
  const l = 200e-6
  const fsw = 65000
  const vin_dc = vin * Math.sqrt(2)

  for (let d = 0.05; d <= 0.95; d += 0.01) {
    const delta_il = (vin_dc * d) / (l * fsw)
    let rippleFactor = 1
    if (nPhases === 2) {
      rippleFactor = d <= 0.5 ? Math.abs(2 * d - 1) : Math.abs(2 * (1 - d) - 1)
    } else if (nPhases === 3) {
      if (d <= 1 / 3) rippleFactor = Math.abs(3 * d - 1)
      else if (d <= 2 / 3) rippleFactor = Math.abs(3 * d - 2)
      else rippleFactor = Math.abs(3 * d - 3)
    } else if (nPhases === 4) {
      if (d <= 0.25) rippleFactor = Math.abs(4 * d - 1)
      else if (d <= 0.5) rippleFactor = Math.abs(4 * d - 2)
      else if (d <= 0.75) rippleFactor = Math.abs(4 * d - 3)
      else rippleFactor = Math.abs(4 * d - 4)
    }
    data.push({ x: parseFloat(d.toFixed(2)), y: parseFloat((delta_il * rippleFactor).toFixed(3)), label: `${nPhases}相` })
  }
  return data
}

function generateThdData(): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = []
  const vout = 390
  const l = 200e-6
  const fsw = 65000
  const pout = 3000
  const eta = 0.96

  for (let vin = 85; vin <= 265; vin += 5) {
    const vin_dc = vin * Math.sqrt(2)
    const d = 1 - vin_dc / vout
    const iin_avg = pout / (eta * vin_dc)
    const delta_il = (vin_dc * d) / (l * fsw)
    const thd = (delta_il / (2 * Math.sqrt(3))) / (iin_avg / Math.sqrt(2)) * 100
    data.push({ x: vin, y: parseFloat(Math.min(thd, 20).toFixed(2)) })
  }
  return data
}

function generateEfficiencyData(): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = []
  for (let load = 10; load <= 100; load += 5) {
    const loadRatio = load / 100
    const eff = 0.92 + 0.05 * Math.sin(Math.PI * loadRatio) - 0.01 * Math.pow(1 - loadRatio, 2)
    data.push({ x: load, y: parseFloat((eff * 100).toFixed(1)) })
  }
  return data
}

function generateInductorData(): { x: number; y: number }[] {
  const data: { x: number; y: number }[] = []
  const vin = 85
  const vout = 390
  const rippleRatio = 0.25
  const pout = 3000
  const eta = 0.96
  const n = 2

  const vin_dc = vin * Math.sqrt(2)
  const d = 1 - vin_dc / vout
  const iin_avg = pout / (eta * vin_dc)
  const il_peak = iin_avg * Math.sqrt(2)

  for (let fsw = 30000; fsw <= 200000; fsw += 5000) {
    const l = (vin_dc * d) / (rippleRatio * (il_peak / n) * fsw)
    data.push({ x: fsw / 1000, y: parseFloat((l * 1e6).toFixed(1)) })
  }
  return data
}

export default function Curves() {
  const [activeCurve, setActiveCurve] = useState<CurveType>('ripple')
  const [nPhases, setNPhases] = useState(2)

  const chartData = useMemo(() => {
    switch (activeCurve) {
      case 'ripple':
        return generateRippleData(nPhases)
      case 'thd':
        return generateThdData()
      case 'efficiency':
        return generateEfficiencyData()
      case 'inductor':
        return generateInductorData()
      default:
        return []
    }
  }, [activeCurve, nPhases])

  const config = curveConfigs.find((c) => c.key === activeCurve)!

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">特性曲线</h1>
      </div>

      <div className="flex flex-wrap gap-2">
        {curveConfigs.map((c) => (
          <button
            key={c.key}
            onClick={() => setActiveCurve(c.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeCurve === c.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {activeCurve === 'ripple' && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">交错相数:</span>
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => setNPhases(n)}
              className={`rounded-md px-3 py-1 text-sm transition-colors ${
                nPhases === n
                  ? 'bg-primary/20 text-primary font-medium'
                  : 'border border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              {n} 相
            </button>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">{config.label}</h2>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {activeCurve === 'ripple' ? (
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="x"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: config.xLabel, position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: config.yLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111118',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke={config.color}
                  fill={config.color}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="x"
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: config.xLabel, position: 'insideBottom', offset: -5, fill: '#94a3b8' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: config.yLabel, angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111118',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    color: '#e2e8f0',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={config.color}
                  strokeWidth={2}
                  dot={{ fill: config.color, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-3">曲线说明</h2>
        {activeCurve === 'ripple' && (
          <p className="text-muted-foreground leading-relaxed">
            电感电流纹波随占空比变化曲线。交错并联技术可在特定占空比点实现纹波抵消。
            对于 {nPhases} 相系统，纹波抵消点出现在 D = {Array.from({ length: nPhases - 1 }, (_, i) => ((i + 1) / nPhases).toFixed(2)).join(', ')} 处。
            在这些点，总输入电流纹波理论上可降至零。
          </p>
        )}
        {activeCurve === 'thd' && (
          <p className="text-muted-foreground leading-relaxed">
            输入电流THD随输入电压变化曲线。THD主要由电感电流纹波引起，
            低输入电压时纹波电流相对较大，THD较高。设计时应确保全电压范围内THD满足IEC 61000-3-2要求（&lt;5%）。
          </p>
        )}
        {activeCurve === 'efficiency' && (
          <p className="text-muted-foreground leading-relaxed">
            效率随负载变化曲线。交错并联PFC在中等负载（50%~75%）时效率最高，
            轻载时可切换为单相运行以降低开关损耗，重载时多相并联分担电流应力。
          </p>
        )}
        {activeCurve === 'inductor' && (
          <p className="text-muted-foreground leading-relaxed">
            电感量与开关频率的关系。开关频率越高，所需电感量越小，有利于减小磁性元件体积。
            但需权衡开关损耗与磁芯损耗的增加。图中基于85Vac输入、390Vdc输出、3kW功率、25%纹波比计算。
          </p>
        )}
      </div>
    </div>
  )
}
