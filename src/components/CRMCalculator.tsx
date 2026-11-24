import { useMemo, useState } from 'react'
import { Calculator, AlertTriangle } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  calculateCRM,
  crmFrequencyCurve,
  type CRMInput,
  type CRMOutput,
} from '../lib/pfcCalc'

/**
 * CRM 变频计算器。由「设计」页的 CCM / CRM 模式切换挂载。
 *
 * 与 CCM 定频计算器互不复用公式：CRM 以电感为输入、频率为输出，
 * 核心式为 f(θ) = N·Vac²·(Vo − √2·Vac·sinθ)/(2·L·Pin·Vo)。
 * 默认规格即 Mathcad 工程案例（120–277VAC / 430V / 1000W / 2 相 / 130µH）。
 */

type Mode = 'byL' | 'byFreq'

interface FormState {
  vinMin: number
  vinMax: number
  vout: number
  pout: number
  efficiencyPct: number
  phases: number
  luH: number
  fTargetKHz: number
  lineFreq: number
  ripplePct: number
  mode: Mode
}

const DEFAULT_FORM: FormState = {
  vinMin: 120,
  vinMax: 277,
  vout: 430,
  pout: 1000,
  efficiencyPct: 95,
  phases: 2,
  luH: 130,
  fTargetKHz: 50,
  lineFreq: 60,
  ripplePct: 5,
  mode: 'byL',
}

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-muted-foreground">
        {label} <span className="text-xs">({unit})</span>
      </span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input-field w-full"
      />
    </label>
  )
}

function ResultItem({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string
  value: string
  unit: string
  accent?: boolean
}) {
  return (
    <div className="rounded-lg bg-surface-elevated p-3">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className={`font-mono text-lg font-semibold ${accent ? 'text-primary-light' : 'text-foreground'}`}>
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
    </div>
  )
}

export default function CRMCalculator() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const errors = useMemo(() => {
    const e: string[] = []
    if (form.vinMin <= 0 || form.vinMax <= form.vinMin) e.push('输入电压范围无效（需 0 < Vin_min < Vin_max）')
    if (form.vout <= Math.SQRT2 * form.vinMax) e.push('输出电压必须高于最高输入电压峰值，否则无法升压')
    if (form.pout <= 0) e.push('输出功率必须大于 0')
    if (form.efficiencyPct <= 0 || form.efficiencyPct > 100) e.push('效率应在 0~100% 之间')
    if (form.phases < 1 || form.phases > 8) e.push('相数应在 1~8 之间')
    if (form.mode === 'byL' && form.luH <= 0) e.push('电感量必须大于 0')
    if (form.mode === 'byFreq' && form.fTargetKHz <= 0) e.push('目标频率必须大于 0')
    if (form.ripplePct <= 0 || form.lineFreq <= 0) e.push('纹波目标与工频必须大于 0')
    return e
  }, [form])

  const input: CRMInput = useMemo(
    () => ({
      vinMin: form.vinMin,
      vinMax: form.vinMax,
      vout: form.vout,
      pout: form.pout,
      efficiency: form.efficiencyPct / 100,
      phases: form.phases,
      inductance: form.mode === 'byL' ? form.luH * 1e-6 : undefined,
      targetFreq: form.fTargetKHz * 1000,
      lineFreq: form.lineFreq,
      ripplePercent: form.ripplePct,
    }),
    [form],
  )

  const result: CRMOutput | null = useMemo(() => {
    if (errors.length > 0) return null
    const r = calculateCRM(input)
    return Number.isFinite(r.pin) && Number.isFinite(r.fMin) ? r : null
  }, [input, errors])

  const curve = useMemo(() => {
    if (!result) return []
    const low = crmFrequencyCurve(input, form.vinMin, result.inductance)
    const high = crmFrequencyCurve(input, form.vinMax, result.inductance)
    // 先按原始索引对齐两条曲线，再过滤 θ < 5° 的奇点区。
    return low
      .map((p, i) => ({
        thetaDeg: Number(p.thetaDeg.toFixed(1)),
        low: Number((p.freqHz / 1000).toFixed(2)),
        high: Number((high[i].freqHz / 1000).toFixed(2)),
      }))
      .filter((p) => p.thetaDeg >= 5)
  }, [input, result, form.vinMin, form.vinMax])

  return (
    <div className="rounded-xl border border-border bg-card p-6 md:p-8">
      <div className="mb-5 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">CRM 参数计算</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="最低输入电压" unit="VAC" value={form.vinMin} onChange={(v) => set('vinMin', v)} />
            <NumberField label="最高输入电压" unit="VAC" value={form.vinMax} onChange={(v) => set('vinMax', v)} />
            <NumberField label="输出电压" unit="VDC" value={form.vout} onChange={(v) => set('vout', v)} />
            <NumberField label="输出功率" unit="W" value={form.pout} onChange={(v) => set('pout', v)} />
            <NumberField label="效率" unit="%" value={form.efficiencyPct} onChange={(v) => set('efficiencyPct', v)} />
            <NumberField label="交错相数" unit="1~8" value={form.phases} onChange={(v) => set('phases', v)} />
            <NumberField label="工频" unit="Hz" value={form.lineFreq} onChange={(v) => set('lineFreq', v)} />
            <NumberField label="输出纹波目标" unit="% 峰峰" value={form.ripplePct} onChange={(v) => set('ripplePct', v)} />
          </div>

          <div>
            <p className="mb-2 text-sm text-muted-foreground">设计方式</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => set('mode', 'byL')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  form.mode === 'byL' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                给定电感 → 复核频率
              </button>
              <button
                onClick={() => set('mode', 'byFreq')}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  form.mode === 'byFreq' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                给定最低频率 → 反解电感
              </button>
            </div>
          </div>

          {form.mode === 'byL' ? (
            <NumberField label="每相 Boost 电感" unit="µH" value={form.luH} onChange={(v) => set('luH', v)} />
          ) : (
            <NumberField label="目标最低开关频率" unit="kHz" value={form.fTargetKHz} onChange={(v) => set('fTargetKHz', v)} />
          )}

          <button
            onClick={() => setForm({ ...DEFAULT_FORM })}
            className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            恢复案例规格
          </button>

          {errors.length > 0 && (
            <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
              <div className="mb-1 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" /> 输入不合法
              </div>
              <ul className="list-disc space-y-0.5 pl-5 text-xs">
                {errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!result ? (
            <div className="flex h-full min-h-48 items-center justify-center rounded-lg bg-surface-elevated text-sm text-muted-foreground">
              修正输入后显示计算结果
            </div>
          ) : (
            <>
              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">功率与电流（理想 PF=1）</h3>
                <div className="grid grid-cols-2 gap-3">
                  <ResultItem label="输入功率 Pin" value={result.pin.toFixed(1)} unit="W" />
                  <ResultItem label="输出电流 Io" value={result.iout.toFixed(3)} unit="A" />
                  <ResultItem label="输入电流 RMS (Vin_min)" value={result.iinRms.toFixed(3)} unit="A" />
                  <ResultItem label="输入电流峰值" value={result.iinPeak.toFixed(3)} unit="A" />
                  <ResultItem label="每相电感峰值 ILpk" value={result.iLPeak.toFixed(3)} unit="A" accent />
                  <ResultItem label="每相电感 RMS" value={result.iLRms.toFixed(3)} unit="A" />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">电感与频率</h3>
                <div className="grid grid-cols-2 gap-3">
                  <ResultItem label={form.mode === 'byL' ? '采用电感 L' : '反解电感 L'} value={(result.inductance * 1e6).toFixed(2)} unit="µH" accent />
                  <ResultItem label="恒定导通时间 Ton" value={(result.ton * 1e6).toFixed(3)} unit="µs" />
                  <ResultItem label="低压波峰占空比" value={result.dutyPeakLow.toFixed(4)} unit="" />
                  <ResultItem label="高压波峰占空比" value={result.dutyPeakHigh.toFixed(4)} unit="" />
                  <ResultItem label="低压波峰频率" value={(result.fPeakLow / 1000).toFixed(2)} unit="kHz" />
                  <ResultItem label="高压波峰频率" value={(result.fPeakHigh / 1000).toFixed(2)} unit="kHz" />
                  <ResultItem label="全范围最低频率" value={(result.fMin / 1000).toFixed(2)} unit="kHz" accent />
                  <ResultItem label="最低频率出现位置" value={`${result.fMinAtVin.toFixed(0)}V / ${((result.fMinAtTheta * 180) / Math.PI).toFixed(0)}°`} unit="" />
                  <ResultItem label="按目标频率反解 L（低压端）" value={(result.inductanceFromLow * 1e6).toFixed(2)} unit="µH" />
                  <ResultItem label="按目标频率反解 L（高压端）" value={(result.inductanceFromHigh * 1e6).toFixed(2)} unit="µH" />
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">器件应力与纹波</h3>
                <div className="grid grid-cols-2 gap-3">
                  <ResultItem label="MOS 电流 RMS" value={result.iMosRms.toFixed(3)} unit="A" />
                  <ResultItem label="二极管电流 RMS" value={result.iDiodeRms.toFixed(3)} unit="A" />
                  <ResultItem label="二极管平均电流（每相）" value={result.iDiodeAvg.toFixed(3)} unit="A" />
                  <ResultItem label="输出电容下限" value={(result.coutMin * 1e6).toFixed(1)} unit="µF" />
                  <ResultItem label="波峰总输入纹波峰峰值" value={result.ripplePp.toFixed(3)} unit="A" />
                  <ResultItem label="相对纹波率 Υ" value={result.rippleRatio.toFixed(4)} unit="" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {result && curve.length > 0 && (
        <div className="mt-6 rounded-lg border border-border bg-background p-4">
          <h3 className="mb-1 text-sm font-semibold">开关频率沿工频半周期的变化</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            纵轴 kHz，横轴为整流电压相位 θ（从 5° 起画，避开过零奇点）。波峰处频率最低。
            高压端过零附近频率极高会撑大线性纵轴，低压端曲线因此显得平坦；下方给出端点值。
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={curve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.35} />
                <XAxis
                  dataKey="thetaDeg"
                  type="number"
                  domain={[5, 90]}
                  stroke="#94a3b8"
                  tick={{ fill: '#94a3b8', fontSize: 12 }}
                  label={{ value: 'θ (°)', position: 'insideBottomRight', fill: '#94a3b8', fontSize: 12 }}
                />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                  formatter={(v: number) => [`${v} kHz`, '']}
                  labelFormatter={(l) => `θ = ${l}°`}
                />
                <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                <Line type="monotone" dataKey="low" name={`${form.vinMin}V`} stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="high" name={`${form.vinMax}V`} stroke="#f59e0b" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            端点（θ = {curve[0].thetaDeg}° → {curve[curve.length - 1].thetaDeg}°）：
            {form.vinMin}V 由 <span className="font-mono text-foreground">{curve[0].low} kHz</span> 降至{' '}
            <span className="font-mono text-foreground">{curve[curve.length - 1].low} kHz</span>；
            {form.vinMax}V 由 <span className="font-mono text-foreground">{curve[0].high} kHz</span> 降至{' '}
            <span className="font-mono text-foreground">{curve[curve.length - 1].high} kHz</span>。
            θ→0 的高频是理想模型奇点，实际由控制器最高频率钳位。
          </p>
        </div>
      )}
    </div>
  )
}
