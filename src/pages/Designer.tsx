import { useState, useCallback } from 'react'
import { useDesign } from '../lib/DesignContext'
import { motion } from 'framer-motion'
import {
  Calculator,
  Zap,
  ArrowRight,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Info,
} from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' as const },
  }),
}

interface DesignInput {
  vinMin: number
  vinMax: number
  vout: number
  pout: number
  fsw: number
  phases: number
  efficiency: number
  rippleTarget: number
}

interface DesignOutput {
  iinRms: number
  iinPeak: number
  lBoost: number
  lRipple: number
  lRipplePercent: number
  dutyMin: number
  dutyMax: number
  iLrms: number
  iLpeak: number
  thdEstimate: number
  coutMin: number
  conductionLoss: number
  switchingLoss: number
  totalLoss: number
}

function calculateDesign(input: DesignInput): DesignOutput {
  const { vinMin, vinMax, vout, pout, fsw, phases, efficiency, rippleTarget } = input
  
  // Input current calculations
  const pin = pout / efficiency
  const iinRmsMax = pin / vinMin
  const iinPeakMax = iinRmsMax * Math.sqrt(2)
  
  // Per phase current
  const iLrms = iinRmsMax / phases
  const iLpeak = iinPeakMax / phases
  
  // Duty cycle at min and max input
  const vinMinPeak = vinMin * Math.sqrt(2)
  const vinMaxPeak = vinMax * Math.sqrt(2)
  const dutyMax = 1 - vinMinPeak / vout
  const dutyMin = 1 - vinMaxPeak / vout
  
  // Boost inductor calculation (at min input, max duty)
  // Delta IL = (Vin * D) / (L * fsw)
  // Target ripple as percentage of peak current
  const targetRipple = iLpeak * (rippleTarget / 100)
  const lBoost = (vinMinPeak * dutyMax) / (targetRipple * fsw)
  
  // Actual ripple with calculated inductor
  const lRipple = (vinMinPeak * dutyMax) / (lBoost * fsw)
  const lRipplePercent = (lRipple / iLpeak) * 100
  
  // THD estimation (simplified)
  // Higher ripple generally means higher THD
  const thdEstimate = 2 + lRipplePercent * 0.3
  
  // Output capacitor (for 2% ripple at 100Hz)
  const deltaVo = vout * 0.02
  const coutMin = pin / (2 * Math.PI * 50 * vout * deltaVo)
  
  // Loss estimation
  const rdsOn = 0.05 // Assume 50mOhm MOSFET
  const conductionLoss = phases * iLrms * iLrms * rdsOn * dutyMax
  const switchingLoss = phases * 0.5 * vout * iLpeak * (50e-9) * fsw // 50ns switching time
  const totalLoss = conductionLoss + switchingLoss + pin * (1 - efficiency)
  
  return {
    iinRms: iinRmsMax,
    iinPeak: iinPeakMax,
    lBoost,
    lRipple,
    lRipplePercent,
    dutyMin,
    dutyMax,
    iLrms,
    iLpeak,
    thdEstimate,
    coutMin,
    conductionLoss,
    switchingLoss,
    totalLoss,
  }
}

export default function Designer() {
  const { spec, setSpec, results, setResults } = useDesign()
  
  const [input, setInput] = useState<DesignInput>({
    vinMin: spec.vinMin,
    vinMax: spec.vinMax,
    vout: spec.vout,
    pout: spec.pout,
    fsw: spec.fsw / 1000, // kHz
    phases: spec.phases,
    efficiency: spec.efficiency * 100,
    rippleTarget: 30,
  })
  
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (input.vinMin >= input.vinMax) newErrors.vin = '最小输入电压必须小于最大输入电压'
    if (input.vout <= input.vinMax * Math.sqrt(2)) newErrors.vout = '输出电压必须大于最大输入电压峰值'
    if (input.pout <= 0) newErrors.pout = '输出功率必须大于0'
    if (input.fsw < 10 || input.fsw > 1000) newErrors.fsw = '开关频率应在10~1000kHz之间'
    if (input.phases < 1 || input.phases > 8) newErrors.phases = '相数应在1~8之间'
    if (input.efficiency < 50 || input.efficiency > 99) newErrors.efficiency = '效率应在50%~99%之间'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [input])

  const handleCalculate = useCallback(() => {
    if (!validate()) return
    
    const designInput: DesignInput = {
      ...input,
      fsw: input.fsw * 1000, // Convert to Hz
      efficiency: input.efficiency / 100,
    }
    
    const output = calculateDesign(designInput)
    setResults(output)
    setSpec({
      vinMin: input.vinMin,
      vinMax: input.vinMax,
      vout: input.vout,
      pout: input.pout,
      fsw: input.fsw * 1000,
      phases: input.phases,
      efficiency: input.efficiency / 100,
    })
  }, [input, validate, setResults, setSpec])

  const handleReset = useCallback(() => {
    setInput({
      vinMin: 85,
      vinMax: 265,
      vout: 400,
      pout: 3000,
      fsw: 100,
      phases: 2,
      efficiency: 95,
      rippleTarget: 30,
    })
    setResults(null)
    setErrors({})
  }, [setResults])

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-primary-dark/40 flex items-center justify-center">
            <Calculator className="w-5 h-5 text-primary-light" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-text-primary tracking-tight">
            参数设计
          </h1>
        </div>
        <p className="text-text-secondary max-w-2xl">
          输入电气规格，自动计算交错并联PFC的关键参数，包括Boost电感、电流纹波、THD与效率。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={1}
        >
          <div className="card-surface p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary-light" />
                输入规格
              </h2>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重置
              </button>
            </div>

            <div className="space-y-5">
              {/* Input Voltage Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    最小输入电压 <span className="text-text-muted">(VAC)</span>
                  </label>
                  <input
                    type="number"
                    value={input.vinMin}
                    onChange={(e) => setInput({ ...input, vinMin: Number(e.target.value) })}
                    className={`input-field w-full ${errors.vin ? 'border-danger' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    最大输入电压 <span className="text-text-muted">(VAC)</span>
                  </label>
                  <input
                    type="number"
                    value={input.vinMax}
                    onChange={(e) => setInput({ ...input, vinMax: Number(e.target.value) })}
                    className={`input-field w-full ${errors.vin ? 'border-danger' : ''}`}
                  />
                </div>
              </div>
              {errors.vin && (
                <p className="text-danger text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {errors.vin}
                </p>
              )}

              {/* Output Voltage */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  输出电压 <span className="text-text-muted">(VDC)</span>
                </label>
                <input
                  type="number"
                  value={input.vout}
                  onChange={(e) => setInput({ ...input, vout: Number(e.target.value) })}
                  className={`input-field w-full ${errors.vout ? 'border-danger' : ''}`}
                />
                {errors.vout && (
                  <p className="text-danger text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.vout}
                  </p>
                )}
              </div>

              {/* Output Power */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  输出功率 <span className="text-text-muted">(W)</span>
                </label>
                <input
                  type="number"
                  value={input.pout}
                  onChange={(e) => setInput({ ...input, pout: Number(e.target.value) })}
                  className={`input-field w-full ${errors.pout ? 'border-danger' : ''}`}
                />
                {errors.pout && (
                  <p className="text-danger text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.pout}
                  </p>
                )}
              </div>

              {/* Switching Frequency */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  开关频率 <span className="text-text-muted">(kHz)</span>
                </label>
                <input
                  type="number"
                  value={input.fsw}
                  onChange={(e) => setInput({ ...input, fsw: Number(e.target.value) })}
                  className={`input-field w-full ${errors.fsw ? 'border-danger' : ''}`}
                />
                {errors.fsw && (
                  <p className="text-danger text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> {errors.fsw}
                  </p>
                )}
              </div>

              {/* Number of Phases */}
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">
                  交错相数
                </label>
                <select
                  value={input.phases}
                  onChange={(e) => setInput({ ...input, phases: Number(e.target.value) })}
                  className="input-field w-full"
                >
                  <option value={1}>1相 (单相Boost)</option>
                  <option value={2}>2相交错</option>
                  <option value={3}>3相交错</option>
                  <option value={4}>4相交错</option>
                </select>
              </div>

              {/* Efficiency Target */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    目标效率 <span className="text-text-muted">(%)</span>
                  </label>
                  <input
                    type="number"
                    value={input.efficiency}
                    onChange={(e) => setInput({ ...input, efficiency: Number(e.target.value) })}
                    className={`input-field w-full ${errors.efficiency ? 'border-danger' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    纹波目标 <span className="text-text-muted">(% of Ipeak)</span>
                  </label>
                  <input
                    type="number"
                    value={input.rippleTarget}
                    onChange={(e) => setInput({ ...input, rippleTarget: Number(e.target.value) })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              {/* Calculate Button */}
              <button
                onClick={handleCalculate}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary-light transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
              >
                <Calculator className="w-4 h-4" />
                计算设计参数
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Results Panel */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
        >
          <div className="card-surface p-6 md:p-8">
            <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2 mb-6">
              <CheckCircle className="w-4 h-4 text-success" />
              设计结果
            </h2>

            {!results ? (
              <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                <Calculator className="w-12 h-12 mb-4 opacity-30" />
                <p className="text-sm">输入规格并点击计算以查看结果</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Input Current */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                    输入电流
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">输入电流(RMS)</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {results.iinRms.toFixed(2)} A
                      </div>
                    </div>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">输入电流(峰值)</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {results.iinPeak.toFixed(2)} A
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inductor */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                    Boost电感设计
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">每相电感值</div>
                      <div className="text-lg font-semibold text-primary-light font-mono">
                        {(results.lBoost * 1e6).toFixed(1)} uH
                      </div>
                    </div>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">电感电流纹波</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {results.lRipple.toFixed(2)} A
                      </div>
                      <div className="text-xs text-text-muted mt-1">
                        ({results.lRipplePercent.toFixed(1)}% of Ipeak)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Switch Parameters */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                    开关参数
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">最大占空比 (Vin_min)</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {results.dutyMax.toFixed(3)}
                      </div>
                    </div>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">最小占空比 (Vin_max)</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {results.dutyMin.toFixed(3)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per Phase Current */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                    每相电流
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">电感电流(RMS)</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {results.iLrms.toFixed(2)} A
                      </div>
                    </div>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">电感电流(峰值)</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {results.iLpeak.toFixed(2)} A
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                    性能指标
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">THD估算</div>
                      <div className={`text-lg font-semibold font-mono ${results.thdEstimate < 5 ? 'text-success' : results.thdEstimate < 10 ? 'text-accent' : 'text-danger'}`}>
                        {results.thdEstimate.toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">输出电容(最小)</div>
                      <div className="text-lg font-semibold text-text-primary font-mono">
                        {(results.coutMin * 1e6).toFixed(0)} uF
                      </div>
                    </div>
                  </div>
                </div>

                {/* Losses */}
                <div>
                  <h3 className="text-sm font-medium text-text-muted uppercase tracking-wider mb-3">
                    损耗估算
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">导通损耗</div>
                      <div className="text-base font-semibold text-text-primary font-mono">
                        {results.conductionLoss.toFixed(1)} W
                      </div>
                    </div>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">开关损耗</div>
                      <div className="text-base font-semibold text-text-primary font-mono">
                        {results.switchingLoss.toFixed(1)} W
                      </div>
                    </div>
                    <div className="p-3 bg-surface-elevated rounded-lg">
                      <div className="text-xs text-text-muted mb-1">总损耗</div>
                      <div className="text-base font-semibold text-danger font-mono">
                        {results.totalLoss.toFixed(1)} W
                      </div>
                    </div>
                  </div>
                </div>

                {/* Design Notes */}
                <div className="p-4 bg-primary-dark/20 border border-primary-light/20 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary-light mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-text-secondary">
                      <p className="font-medium text-text-primary mb-1">设计建议</p>
                      <ul className="space-y-1 text-xs">
                        <li>• 电感纹波电流建议控制在峰值电流的 20% ~ 40%</li>
                        <li>• THD &lt; 5% 可满足 IEC61000-3-2 Class D 要求</li>
                        <li>• 输出电容需考虑纹波电流额定值</li>
                        <li>• 建议预留 20% 以上的设计裕量</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
