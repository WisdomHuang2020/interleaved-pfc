import { describe, expect, it } from 'vitest'
import {
  calculateCRM,
  crmDuty,
  crmFrequency,
  crmFrequencyCurve,
  crmInductanceForFreq,
  type CRMInput,
} from './pfcCalc'

/**
 * CRM 金样来源（不是手算）：
 *  - 独立参考实现 C:\Users\xuexi\.workbuddy\tmp\crm_reference.py（Python，另一套实现）
 *  - 工程案例 两相CRM交错UCC28063-1000W.mcdx 的 result.xml（116 个求值）
 *  两者在 19 项关键量上最大相对偏差 0%，详见 crm_vs_mathcad.txt。
 */
/** 高精度十进制用字符串转 Number，规避 ESLint no-loss-of-precision（数值本身不变） */
const n = (s: string): number => Number(s)

const CASE: CRMInput = {
  vinMin: 120,
  vinMax: 277,
  vout: 430,
  pout: 1000,
  efficiency: 0.95,
  phases: 2,
  inductance: 130e-6,
  targetFreq: 50_000,
  lineFreq: 60,
  ripplePercent: 5,
}

/** Mathcad 计算书里 PF=0.99 的电流应力折算系数 */
const PF_STRESS = 0.99

describe('calculateCRM - 与 Mathcad 工程案例逐项对齐', () => {
  const out = calculateCRM(CASE)

  it('功率与输出电流', () => {
    expect(out.pin).toBeCloseTo(1052.6315789473686, 8)
    expect(out.iout).toBeCloseTo(2.3255813953488373, 8)
  })

  it('低压波峰处占空比 Dmax = 0.60533575', () => {
    expect(out.dutyPeakLow).toBeCloseTo(0.60533575003541529, 10)
    expect(crmDuty(120, 430)).toBeCloseTo(0.60533575003541529, 10)
  })

  it('输入电流（PF 折算后与计算书一致）', () => {
    expect(out.iinRms / PF_STRESS).toBeCloseTo(8.8605351763246514, 8)
    expect(out.iinPeak / PF_STRESS).toBeCloseTo(12.530689016242206, 8)
    expect(out.iLPeak / PF_STRESS).toBeCloseTo(12.530689016242206, 8)
  })

  it('按 50kHz 反解电感：低压 165.62µH / 高压 129.72µH', () => {
    expect(out.inductanceFromLow * 1e6).toBeCloseTo(165.61986120968962, 8)
    expect(out.inductanceFromHigh * 1e6).toBeCloseTo(129.72447501159851, 8)
  })

  it('实选 130µH 后的波峰频率：63.70kHz / 49.89kHz', () => {
    expect(out.fPeakLow / 1000).toBeCloseTo(n('63.699946619111397'), 8)
    expect(out.fPeakHigh / 1000).toBeCloseTo(n('49.894028850614814'), 8)
  })

  it('恒定导通时间 Tonmax = 9.5029µs', () => {
    expect(out.ton * 1e6).toBeCloseTo(n('9.5029239766081881'), 10)
  })

  it('器件电流（PF 折算后与计算书一致）', () => {
    expect((out.iLPeak / PF_STRESS) / Math.sqrt(6)).toBeCloseTo(5.1156323692151862, 8)
    expect(out.iMosRms / PF_STRESS).toBeCloseTo(4.1716674971788157, 8)
    expect(out.iDiodeRms / PF_STRESS).toBeCloseTo(2.9608925731853244, 8)
    expect(out.iDiodeAvg).toBeCloseTo(1.1627906976744187, 8)
  })

  it('波峰处交错纹波（PF 折算后与计算书一致）', () => {
    expect(out.rippleCurrentB / PF_STRESS).toBeCloseTo(2.1804916129754277, 8)
    expect(out.ripplePp / PF_STRESS).toBeCloseTo(4.3609832259508554, 8)
    expect(out.rippleRatio).toBeCloseTo(0.34802421640966225, 10)
  })

  it('输出电容（能量法，60Hz / 5% 纹波）= 302.02µF', () => {
    expect(out.coutMin * 1e6).toBeCloseTo(302.02184792518551, 8)
  })

  it('全范围最低频率出现在高压波峰 49.894kHz', () => {
    expect(out.fMin / 1000).toBeCloseTo(n('49.894028850614814'), 6)
    expect(out.fMinAtVin).toBeCloseTo(277, 6)
    expect(out.fMinAtTheta).toBeCloseTo(Math.PI / 2, 6)
  })
})

describe('calculateCRM - 不变量', () => {
  it('CRM 每相峰值 = 2·Iin,pk/N；N=2 时等于总线峰值', () => {
    for (const phases of [1, 2, 3, 4]) {
      const out = calculateCRM({ ...CASE, phases })
      expect(out.iLPeak).toBeCloseTo((2 * out.iinPeak) / phases, 10)
    }
    expect(calculateCRM({ ...CASE, phases: 2 }).iLPeak).toBeCloseTo(
      calculateCRM({ ...CASE, phases: 2 }).iinPeak,
      10,
    )
  })

  it('导通时间与工频相位无关（恒导通时间）', () => {
    const pin = CASE.pout / CASE.efficiency
    const ton = (2 * CASE.inductance! * pin) / (CASE.phases * CASE.vinMin ** 2)
    expect(calculateCRM(CASE).ton).toBeCloseTo(ton, 12)
    // 频率却随相位变化
    expect(crmFrequency(120, 430, pin, 2, 130e-6, 0.2)).toBeGreaterThan(
      crmFrequency(120, 430, pin, 2, 130e-6, Math.PI / 2),
    )
  })

  it('频率曲线在半个工频周期内单调下降', () => {
    const curve = crmFrequencyCurve(CASE, 120, 130e-6)
    for (let i = 1; i < curve.length; i++) {
      expect(curve[i].freqHz).toBeLessThan(curve[i - 1].freqHz)
    }
    expect(curve[0].thetaDeg).toBeCloseTo(1.5, 6)
    expect(curve[curve.length - 1].thetaDeg).toBeCloseTo(90, 6)
  })

  it('频率与电感成反比、与相数成正比', () => {
    const pin = CASE.pout / CASE.efficiency
    const f = (L: number, N: number) => crmFrequency(120, 430, pin, N, L, Math.PI / 2)
    expect(f(65e-6, 2) / f(130e-6, 2)).toBeCloseTo(2, 10)
    expect(f(130e-6, 4) / f(130e-6, 2)).toBeCloseTo(2, 10)
  })

  it('反解出的电感能回弹到目标频率', () => {
    const pin = CASE.pout / CASE.efficiency
    const L = crmInductanceForFreq(120, 430, pin, 2, 50_000)
    expect(crmFrequency(120, 430, pin, 2, L, Math.PI / 2)).toBeCloseTo(50_000, 8)
  })

  it('不给 inductance 时按 targetFreq 反解，并保证全范围 f >= f_target', () => {
    const out = calculateCRM({ ...CASE, inductance: undefined })
    expect(out.inductance).toBeLessThan(out.inductanceFromLow)
    expect(out.fMin).toBeGreaterThanOrEqual(50_000 - 1e-6)
  })

  it('纹波比与 PF 折算无关（分子分母同比例）', () => {
    const a = calculateCRM(CASE)
    const b = calculateCRM({ ...CASE, pout: 2000 })
    expect(b.rippleRatio).toBeCloseTo(a.rippleRatio, 10)
  })

  it('输出电容与工频成反比、与纹波目标成反比', () => {
    const a = calculateCRM(CASE)
    const b = calculateCRM({ ...CASE, lineFreq: 50 })
    const c = calculateCRM({ ...CASE, ripplePercent: 10 })
    expect(b.coutMin / a.coutMin).toBeCloseTo(60 / 50, 10)
    expect(c.coutMin / a.coutMin).toBeCloseTo(0.5, 10)
  })
})

describe('calculateCRM - 金样快照（Python 独立实现产出，防止无意改动）', () => {
  const out = calculateCRM(CASE)
  const GOLDEN: Record<string, number> = {
    pin: 1052.6315789473686,
    iout: 2.3255813953488373,
    iinRms: 8.7719298245614041,
    iinPeak: 12.405382126079783,
    iLPeak: 12.405382126079783,
    dutyPeakLow: 0.60533575003541529,
    dutyPeakHigh: 0.08898335633175036,
    inductance: 130e-6,
    inductanceFromLow: 165.61986120968962e-6,
    inductanceFromHigh: n('129.72447501159851e-6'),
    ton: 9.5029239766081881e-6,
    fPeakLow: 63699.946619111397,
    fPeakHigh: 49894.028850614814,
    fMin: 49894.028850614814,
    fMinAtVin: 277,
    fMinAtTheta: 1.5707963267948966,
    iLRms: 5.0644760455230342,
    iMosRms: 4.1299508222070269,
    iDiodeRms: 2.9312836474534709,
    iDiodeAvg: 1.1627906976744187,
    coutMin: n('302.02184792518551e-6'),
    rippleCurrentB: 2.158686696845673,
    ripplePp: 4.3173733936913461,
    rippleRatio: 0.34802421640966225,
  }

  it('输出字段与金样字段完全一致', () => {
    expect(Object.keys(out).sort()).toEqual(Object.keys(GOLDEN).sort())
  })

  it.each(Object.entries(GOLDEN))('%s', (key, value) => {
    expect(out[key as keyof typeof out]).toBeCloseTo(value, 8)
  })
})
