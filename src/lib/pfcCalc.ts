/**
 * PFC Core Calculation Library
 * 交错并联Boost PFC变换器核心计算公式
 */

export interface PFCCalcInput {
  vin_min: number      // V
  vin_max: number      // V
  vin_nom: number      // V
  vout: number         // V
  pout: number         // W
  fline: number        // Hz
  fsw: number          // Hz
  n_phases: number     // 相数
  efficiency: number   // 0~1
}

export interface PFCCalcResult {
  // 电流计算
  iin_peak_max: number     // 最大输入峰值电流 (A)
  iin_peak_nom: number      // 额定输入峰值电流 (A)
  iin_rms_max: number       // 最大输入RMS电流 (A)
  iin_rms_nom: number       // 额定输入RMS电流 (A)
  // 每相电感计算
  lin: number               // 每相Boost电感 (H)
  il_ripple_max: number     // 最大电感电流纹波 (A)
  il_ripple_ratio: number   // 纹波率 (0~1)
  il_peak: number           // 电感峰值电流 (A)
  il_rms: number            // 电感RMS电流 (A)
  // 输出电容
  cout: number              // 输出电容 (F)
  vout_ripple: number       // 输出电压纹波 (V)
  vout_ripple_ratio: number // 输出纹波率
  // THD估算
  thd_estimate: number      // THD估算值 (%)
  // 占空比
  d_min: number             // 最小占空比
  d_max: number             // 最大占空比
  // 功率
  pin: number               // 输入功率 (W)
  // 频率比
  fsw_fline_ratio: number   // 开关频率/线频率
}

/**
 * 计算交错并联PFC关键参数
 */
export function calculatePFC(params: PFCCalcInput): PFCCalcResult {
  const { vin_min, vin_max, vin_nom, vout, pout, fline, fsw, n_phases, efficiency } = params

  // 输入功率
  const pin = pout / efficiency

  // 输入峰值电流 (正弦波)
  const iin_peak_max = (Math.sqrt(2) * pin) / vin_min
  const iin_peak_nom = (Math.sqrt(2) * pin) / vin_nom

  // 输入RMS电流
  const iin_rms_max = pin / vin_min
  const iin_rms_nom = pin / vin_nom

  // 每相电流
  const i_phase_peak_max = iin_peak_max / n_phases
  const i_phase_rms = iin_rms_max / n_phases

  // 占空比 (CCM模式)
  const d_min = 1 - vin_max / vout
  const d_max = 1 - vin_min / vout

  // 电感计算: 纹波电流为峰值电流的20%~40%, 取30%
  const ripple_ratio = 0.30
  const il_ripple_max = i_phase_peak_max * ripple_ratio

  // L = V * D / (fsw * ΔIL)
  // 在最小输入电压时纹波最大
  const lin = (vin_min * d_max) / (fsw * il_ripple_max)

  // 电感峰值电流
  const il_peak = i_phase_peak_max + il_ripple_max / 2

  // 电感RMS电流 (近似)
  const il_rms = Math.sqrt(i_phase_rms ** 2 + (il_ripple_max / Math.sqrt(12)) ** 2)

  // 输出电容: 按2倍工频纹波计算
  // C = Iout / (2 * π * fline * Vripple)
  const iout = pout / vout
  const vout_ripple_ratio = 0.02  // 2%输出纹波
  const vout_ripple = vout * vout_ripple_ratio
  const cout = iout / (2 * Math.PI * fline * vout_ripple)

  // THD估算 (简化模型)
  // 交错并联PFC的THD通常比单相低, 与纹波率相关
  const thd_estimate = 3 + ripple_ratio * 15  // 简化估算

  // 频率比
  const fsw_fline_ratio = fsw / fline

  return {
    iin_peak_max,
    iin_peak_nom,
    iin_rms_max,
    iin_rms_nom,
    lin,
    il_ripple_max,
    il_ripple_ratio: ripple_ratio,
    il_peak,
    il_rms,
    cout,
    vout_ripple,
    vout_ripple_ratio,
    thd_estimate,
    d_min,
    d_max,
    pin,
    fsw_fline_ratio,
  }
}

/**
 * 计算瞬时占空比 (用于特性曲线)
 * @param theta 相位角 (0 ~ π)
 * @param vin_peak 输入峰值电压
 * @param vout 输出电压
 */
export function dutyCycle(theta: number, vin_peak: number, vout: number): number {
  const vin_inst = vin_peak * Math.sin(theta)
  if (vin_inst >= vout) return 0
  return 1 - vin_inst / vout
}

/**
 * 计算瞬时电感电流纹波
 * @param theta 相位角
 * @param vin_peak 输入峰值电压
 * @param vout 输出电压
 * @param lin 电感值
 * @param fsw 开关频率
 */
export function inductorCurrentRipple(
  theta: number,
  vin_peak: number,
  vout: number,
  lin: number,
  fsw: number
): number {
  const vin_inst = vin_peak * Math.sin(theta)
  const d = 1 - vin_inst / vout
  return (vin_inst * d) / (lin * fsw)
}

/**
 * 计算交错并联后的等效开关频率
 */
export function effectiveSwitchingFrequency(fsw: number, n_phases: number): number {
  return fsw * n_phases
}

/**
 * 计算交错相移角度 (度)
 */
export function phaseShiftDegrees(n_phases: number): number {
  return 360 / n_phases
}

/**
 * 计算输入电流THD的理论下限 (理想情况)
 */
export function theoreticalTHD(n_phases: number, ripple_ratio: number): number {
  // 交错并联可显著降低THD
  const interleaving_factor = 1 / Math.sqrt(n_phases)
  return (2 + ripple_ratio * 10) * interleaving_factor
}
