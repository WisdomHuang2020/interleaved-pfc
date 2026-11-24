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
 *
 * 本文件含**两套互不复用的物理模型**：
 * - `calculateDesign` = CCM 定频（fsw 是输入，L 由纹波目标反解）——站点原有模型。
 * - `calculateCRM`    = CRM/BCM 临界导通变频（L 是输入或由目标最低频率反解，fsw 是输出）。
 *   两者公式不能互相套用：CCM 的 ΔIL = Vin·D/(L·f) 在 CRM 下不成立。
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

// ---------------------------------------------------------------------------
// CRM / BCM 临界导通模式（恒导通时间、变频）—— 与上方 CCM 定频模型互不复用公式
//
// 资料依据（D:\02-Study\...\INTERLEAVED PFC\论文的markdown版本\，均为 OCR 全文）：
// - 任玉伟《交错并联 BCM Boost PFC 变换器的研究》2.2 / 3.3：恒导通时间、开关频率随
//   输入电压与负载变化；开环主从、PLL 闭环、新型交错三种同步方案。
// - 王颖《单相 CRM 交错并联高功率因数整流器研究》3.2：Ton = 4·L·Pin' / Vin²（Vin 为峰值）。
// - 王艳硕《交错并联 Boost PFC 技术的研究》2.2：CRM 稳态开关特性与频率表达式。
// - 方孝杰《基于交错并联控制的 Boost PFC 的研究》2/3：180° 移相及变频下的延时难点。
// - 姚国斌《基于交错并联拓扑的 DCM Boost PFC 技术研究》2.2：CRM 边界，ΔiL = IL,avg。
// 工程校验：两相CRM交错UCC28063-1000W.mcdx（worksheet.xml + result.xml 共 116 个求值），
// 19 项关键量逐项对齐，最大相对偏差 0%。见 src/lib/pfcCalc.test.ts 的 CRM 金样。
//
// 模型假设（页面同步标注，勿当精确器件仿真）：
// 1) 理想单位功率因数：输入电流与整流电压同相正弦。PF 折算只影响器件电流应力，
//    不进入频率式——与 Mathcad 案例的处理一致。
// 2) N 相等分瞬时功率，每相独立 CRM，相位依次错开 360°/N。
// 3) 忽略 ZCD 延时、死区/谐振、控制器最小导通时间与最高频率钳位。
// 4) θ→0 时 f→∞ 是模型奇点，不是实际工作点；实际由控制器限频决定。
// ---------------------------------------------------------------------------

export interface CRMInput {
  /** 最低/最高输入电压有效值 (VAC) */
  vinMin: number
  vinMax: number
  /** 输出直流电压 (V) */
  vout: number
  /** 输出功率 (W) */
  pout: number
  /** 效率 0~1 */
  efficiency: number
  /** 交错相数 N */
  phases: number
  /** 每相 Boost 电感 (H)。给定则复核频率；不给则由 targetFreq 反解 */
  inductance?: number
  /** 目标最低开关频率 (Hz)。inductance 未给时使用 */
  targetFreq?: number
  /** 工频 (Hz)，用于输出电容估算 */
  lineFreq: number
  /** 允许输出电压纹波（峰峰值，百分数） */
  ripplePercent: number
}

export interface CRMOutput {
  /** 输入有功功率 (W) */
  pin: number
  /** 输出电流 (A) */
  iout: number
  /** 最低输入电压下的输入电流 RMS / 峰值 (A) */
  iinRms: number
  iinPeak: number
  /** 每相 CRM 电感电流峰值 (A)：2·Iin,pk/N */
  iLPeak: number
  /** 最低/最高输入电压波峰处占空比 */
  dutyPeakLow: number
  dutyPeakHigh: number
  /** 实际采用的每相电感 (H) */
  inductance: number
  /** 按目标频率在低压端 / 高压端分别反解的电感 (H) */
  inductanceFromLow: number
  inductanceFromHigh: number
  /** 恒定导通时间 (s)，与工频相位无关 */
  ton: number
  /** 低压端 / 高压端波峰处频率 (Hz) */
  fPeakLow: number
  fPeakHigh: number
  /** 全输入范围 × 半个工频周期内的最低频率及出现位置 */
  fMin: number
  fMinAtVin: number
  fMinAtTheta: number
  /** 每相电感电流 RMS (A) */
  iLRms: number
  /** MOSFET / 续流二极管电流 RMS (A) */
  iMosRms: number
  iDiodeRms: number
  /** 每相续流二极管平均电流 (A) */
  iDiodeAvg: number
  /** 输出电容下限 (F)，能量法 */
  coutMin: number
  /** 波峰处另一相电流 / 总输入纹波峰峰值 / 相对纹波率 */
  rippleCurrentB: number
  ripplePp: number
  rippleRatio: number
}

const SQRT2 = Math.SQRT2

/** 波峰处占空比 D = 1 − √2·Vac/Vout */
export function crmDuty(vac: number, vout: number): number {
  return 1 - (SQRT2 * vac) / vout
}

/**
 * CRM 变频核心式：
 *   f(θ) = N·Vac²·(Vout − √2·Vac·sinθ) / (2·L·Pin·Vout)
 * 由 Ton = 2·L·Pin/(N·Vac²) 与 Toff = Ton·v/(Vout−v) 相加后取倒数推出。
 */
export function crmFrequency(
  vac: number,
  vout: number,
  pin: number,
  phases: number,
  inductance: number,
  theta: number,
): number {
  const vInst = SQRT2 * vac * Math.sin(theta)
  return (phases * vac * vac * (vout - vInst)) / (2 * inductance * pin * vout)
}

/** 由目标频率反解电感：L = N·Vac²·(Vout − √2·Vac) / (2·f·Pin·Vout) */
export function crmInductanceForFreq(
  vac: number,
  vout: number,
  pin: number,
  phases: number,
  freq: number,
): number {
  return (phases * vac * vac * (vout - SQRT2 * vac)) / (2 * freq * pin * vout)
}

/** 生成频率-工频相位曲线（避开 θ=0 奇点）。 */
export function crmFrequencyCurve(
  input: CRMInput,
  vac: number,
  inductance: number,
  points = 60,
): Array<{ thetaDeg: number; freqHz: number }> {
  const pin = input.pout / input.efficiency
  const out: Array<{ thetaDeg: number; freqHz: number }> = []
  for (let i = 1; i <= points; i++) {
    const theta = (Math.PI / 2) * (i / points)
    out.push({
      thetaDeg: (theta * 180) / Math.PI,
      freqHz: crmFrequency(vac, input.vout, pin, input.phases, inductance, theta),
    })
  }
  return out
}

export function calculateCRM(input: CRMInput): CRMOutput {
  const { vinMin, vinMax, vout, pout, efficiency, phases, lineFreq, ripplePercent } = input
  const pin = pout / efficiency
  const iout = pout / vout

  // 低压端电流应力最大
  const iinRms = pin / vinMin
  const iinPeak = SQRT2 * iinRms
  const iLPeak = (2 * iinPeak) / phases

  const dutyPeakLow = crmDuty(vinMin, vout)
  const dutyPeakHigh = crmDuty(vinMax, vout)

  const inductanceFromLow = crmInductanceForFreq(vinMin, vout, pin, phases, input.targetFreq ?? 50_000)
  const inductanceFromHigh = crmInductanceForFreq(vinMax, vout, pin, phases, input.targetFreq ?? 50_000)

  // 反解 L 时须对整个输入范围扫最小值：g(v)=v²(Vout−√2v) 在区间内先增后减，
  // 只取两端点不足以覆盖所有规格。取 min 才能保证全范围 f ≥ f_target。
  let inductance: number
  if (input.inductance !== undefined) {
    inductance = input.inductance
  } else {
    let smallest = Infinity
    for (let i = 0; i <= 200; i++) {
      const v = vinMin + ((vinMax - vinMin) * i) / 200
      const l = crmInductanceForFreq(v, vout, pin, phases, input.targetFreq ?? 50_000)
      if (l < smallest) smallest = l
    }
    inductance = smallest
  }

  const ton = (2 * inductance * pin) / (phases * vinMin * vinMin)
  const fPeakLow = crmFrequency(vinMin, vout, pin, phases, inductance, Math.PI / 2)
  const fPeakHigh = crmFrequency(vinMax, vout, pin, phases, inductance, Math.PI / 2)

  // 全范围扫描最低频率（θ 从 5° 到 90°；5° 以下为模型奇点区）
  let fMin = Infinity
  let fMinAtVin = vinMin
  let fMinAtTheta = Math.PI / 2
  for (let i = 0; i <= 100; i++) {
    const v = vinMin + ((vinMax - vinMin) * i) / 100
    for (let j = 1; j <= 90; j++) {
      const theta = (Math.PI / 2) * (j / 90)
      const f = crmFrequency(v, vout, pin, phases, inductance, theta)
      if (f < fMin) {
        fMin = f
        fMinAtVin = v
        fMinAtTheta = theta
      }
    }
  }

  // CRM 三角波：开关周期 RMS = Ipk/√3，叠加正弦包络再 /√2 → Ipk/√6
  const iLRms = iLPeak / Math.sqrt(6)
  const coef = ((4 * SQRT2) / (9 * Math.PI)) * (vinMin / vout)
  const iMosRms = iLPeak * Math.sqrt(1 / 6 - coef)
  const iDiodeRms = iLPeak * Math.sqrt(coef)
  const iDiodeAvg = iout / phases

  const deltaV = vout * (ripplePercent / 100)
  const coutMin = pin / (2 * Math.PI * lineFreq * vout * deltaV)

  // 波峰处两相交错纹波（沿用案例计算书的解析式）
  const rippleCurrentB =
    (iLPeak * Math.abs(dutyPeakLow - 0.5)) / Math.max(dutyPeakLow, 1 - dutyPeakLow)
  const ripplePp = 2 * rippleCurrentB
  const rippleRatio = ripplePp / iLPeak

  return {
    pin,
    iout,
    iinRms,
    iinPeak,
    iLPeak,
    dutyPeakLow,
    dutyPeakHigh,
    inductance,
    inductanceFromLow,
    inductanceFromHigh,
    ton,
    fPeakLow,
    fPeakHigh,
    fMin,
    fMinAtVin,
    fMinAtTheta,
    iLRms,
    iMosRms,
    iDiodeRms,
    iDiodeAvg,
    coutMin,
    rippleCurrentB,
    ripplePp,
    rippleRatio,
  }
}
