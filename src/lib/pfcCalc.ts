/**
 * PFC 设计计算库 —— 全站唯一真源
 *
 * 历史与现状（2026-09-14 合并）：
 * - `calculateDesign` 原为 `src/pages/Designer.tsx` 内的私有函数，是**线上真实运行的那一份**。
 * - 本文件此前另存一套同名但数值分歧的实现（`calculatePFC` 等 6 个导出：THD 恒 7.5%、
 *   输出电容用 `pout/vout` 而 Designer 用 `pin/vout`），**全仓库零调用点、不进 bundle**，
 *   属"第二套实现"陷阱，已随本次合并删除。破坏性删除已由"改动前后逐字段数值比对"证明零影响。
 * - `src/pages/Curves.tsx` 仍自带一套独立模型（硬编码 390V / 200µH / 65kHz / 3kW / η0.96，
 *   不读 DesignContext），本次未动，作为已知债务记录在项目记忆中。
 *
 * 硬编码假设（改算法时须一并复核，勿当常数忽略）：
 * - 开关管导通电阻 Rds(on) = 50 mΩ
 * - 开关时间 t_sw = 50 ns
 * - 二极管正向压降 Vf = 1.5 V（SiC）
 * - 电感直流电阻 (铜损) = 0.02 Ω
 * - 输出电压纹波目标 2%
 * - 工频按 50 Hz 计算（输出电容按 2 倍工频纹波）
 *
 * 改动纪律：改本文件前先跑 `npm test`；算法改动必须附"改前改后逐字段数值比对"作为等价性证据。
 */

export interface DesignInput {
  vinMin: number
  vinMax: number
  vout: number
  pout: number
  fsw: number
  phases: number
  efficiency: number
  rippleTarget: number
}

export interface DesignOutput {
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
  diodeLoss: number
  inductorLoss: number
  totalLoss: number
  estimatedEfficiency: number
}

export function calculateDesign(input: DesignInput): DesignOutput {
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

  // Loss estimation (per phase, worst case at low line peak)
  // 总损耗 = N × (开关管导通损耗 + 开关损耗 + 二极管导通损耗 + 电感铜损)
  const rdsOn = 0.05 // Assume 50mOhm MOSFET
  const tSw = 50e-9 // 50ns switching time
  const vfDiode = 1.5 // SiC diode forward voltage (V)
  const rInd = 0.02 // Inductor winding resistance (Ohm)
  const conductionLoss = phases * iLrms * iLrms * rdsOn * dutyMax
  const switchingLoss = phases * 0.5 * vout * iLpeak * tSw * fsw
  const diodeLoss = phases * vfDiode * iLpeak * (1 - dutyMax)
  const inductorLoss = phases * iLrms * iLrms * rInd
  const totalLoss = conductionLoss + switchingLoss + diodeLoss + inductorLoss
  // 由器件损耗反推实际效率
  const estimatedEfficiency = pout / (pout + totalLoss)

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
    diodeLoss,
    inductorLoss,
    totalLoss,
    estimatedEfficiency,
  }
}
