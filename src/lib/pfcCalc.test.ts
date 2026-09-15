import { describe, expect, it } from 'vitest'
import { calculateDesign, type DesignInput } from './pfcCalc'

const BASE: DesignInput = {
  vinMin: 85,
  vinMax: 265,
  vout: 400,
  pout: 3000,
  fsw: 100_000,
  phases: 2,
  efficiency: 0.95,
  rippleTarget: 30,
}

const spec = (over: Partial<DesignInput> = {}): DesignInput => ({ ...BASE, ...over })

describe('calculateDesign - 不变量', () => {
  it('输入功率按效率折算：pin = pout / efficiency', () => {
    const out = calculateDesign(spec())
    // iinRms = pin / vinMin，反解回 pin 与 pout/η 相等
    expect(out.iinRms * BASE.vinMin).toBeCloseTo(BASE.pout / BASE.efficiency, 10)
  })

  it('峰值与有效值成 √2 关系', () => {
    const out = calculateDesign(spec())
    expect(out.iinPeak / out.iinRms).toBeCloseTo(Math.SQRT2, 12)
    expect(out.iLpeak / out.iLrms).toBeCloseTo(Math.SQRT2, 12)
  })

  it('每相电流是总电流除以相数', () => {
    for (const phases of [1, 2, 3, 4, 6]) {
      const out = calculateDesign(spec({ phases }))
      expect(out.iLrms * phases).toBeCloseTo(out.iinRms, 10)
      expect(out.iLpeak * phases).toBeCloseTo(out.iinPeak, 10)
    }
  })

  it('占空比约束在 (0,1)，且 dutyMin < dutyMax（低压输入占空比更大）', () => {
    const out = calculateDesign(spec())
    expect(out.dutyMax).toBeGreaterThan(out.dutyMin)
    expect(out.dutyMin).toBeGreaterThan(0)
    expect(out.dutyMax).toBeLessThan(1)
  })

  it('电感量与开关频率成反比', () => {
    const a = calculateDesign(spec({ fsw: 50_000 }))
    const b = calculateDesign(spec({ fsw: 100_000 }))
    expect(a.lBoost / b.lBoost).toBeCloseTo(2, 10)
  })

  it('纹波率回弹：算出电感后，实际纹波率等于设计目标', () => {
    for (const rippleTarget of [5, 10, 20, 30, 40, 50]) {
      const out = calculateDesign(spec({ rippleTarget }))
      expect(out.lRipplePercent).toBeCloseTo(rippleTarget, 10)
    }
  })

  it('电感电流纹波 = 峰值电流 × 纹波率', () => {
    const out = calculateDesign(spec())
    expect(out.lRipple / out.iLpeak).toBeCloseTo(BASE.rippleTarget / 100, 12)
  })

  it('四项损耗之和恒等于总损耗', () => {
    for (const pout of [300, 1500, 3000, 6000]) {
      const out = calculateDesign(spec({ pout }))
      const sum = out.conductionLoss + out.switchingLoss + out.diodeLoss + out.inductorLoss
      expect(out.totalLoss).toBeCloseTo(sum, 9)
    }
  })

  it('估算效率落在 0~1，且与损耗单调反向', () => {
    const light = calculateDesign(spec({ pout: 300 }))
    const heavy = calculateDesign(spec({ pout: 6000 }))
    expect(light.estimatedEfficiency).toBeGreaterThan(0)
    expect(light.estimatedEfficiency).toBeLessThan(1)
    expect(heavy.totalLoss).toBeGreaterThan(light.totalLoss)
    expect(heavy.estimatedEfficiency).toBeLessThan(light.estimatedEfficiency)
  })

  it('输出电容与输出功率成正比（同电压/效率下）', () => {
    const a = calculateDesign(spec({ pout: 1500 }))
    const b = calculateDesign(spec({ pout: 3000 }))
    expect(b.coutMin / a.coutMin).toBeCloseTo(2, 10)
  })

  it('THD 随纹波目标线性上升（当前模型 thd = 2 + lRipplePercent × 0.3）', () => {
    const a = calculateDesign(spec({ rippleTarget: 10 }))
    const b = calculateDesign(spec({ rippleTarget: 40 }))
    expect(a.thdEstimate).toBeCloseTo(5, 10)
    expect(b.thdEstimate).toBeCloseTo(14, 10)
  })

  it('相数增多时单相电流下降、总损耗与相数相关地变化', () => {
    const p1 = calculateDesign(spec({ phases: 1 }))
    const p4 = calculateDesign(spec({ phases: 4 }))
    expect(p4.iLpeak).toBeLessThan(p1.iLpeak)
    expect(p4.iLpeak * 4).toBeCloseTo(p1.iLpeak, 10)
  })
})

describe('calculateDesign - 退化与非法输入（记录现状，不粉饰）', () => {
  it('vinMin = 0 → 电流为 Infinity（纯函数不做入参校验，校验只存在于页面 validate()）', () => {
    const out = calculateDesign(spec({ vinMin: 0 }))
    expect(out.iinRms).toBe(Infinity)
    expect(out.iinPeak).toBe(Infinity)
    expect(Number.isNaN(out.iinRms)).toBe(false)
  })

  it('pout = 0 → 电感为 Infinity、纹波率为 NaN，效率为 NaN（0 / 0）', () => {
    const out = calculateDesign(spec({ pout: 0 }))
    expect(out.iinRms).toBe(0)
    expect(out.iLpeak).toBe(0)
    // lBoost = (VinPeak × D) / (0 × fsw) → 有限值除以 0
    expect(out.lBoost).toBe(Infinity)
    // lRipplePercent = lRipple / iLpeak = 0 / 0
    expect(Number.isNaN(out.lRipplePercent)).toBe(true)
    expect(Number.isNaN(out.estimatedEfficiency)).toBe(true)
  })

  it('fsw = 0 → 电感为 Infinity', () => {
    const out = calculateDesign(spec({ fsw: 0 }))
    expect(out.lBoost).toBe(Infinity)
  })

  it('phases = 0 → 单相电流为 Infinity', () => {
    const out = calculateDesign(spec({ phases: 0 }))
    expect(out.iLrms).toBe(Infinity)
    expect(out.iLpeak).toBe(Infinity)
  })

  it('efficiency = 0 → 输入功率为 Infinity', () => {
    const out = calculateDesign(spec({ efficiency: 0 }))
    expect(out.iinRms).toBe(Infinity)
  })

  it('vinMin 的峰值高于 vout → 占空比转负（物理上无法升压）', () => {
    const out = calculateDesign(spec({ vinMin: 500, vout: 400 }))
    expect(out.dutyMax).toBeLessThan(0)
    expect(out.lBoost).toBeLessThan(0)
  })

  it('rippleTarget = 0 → 电感为 Infinity；lRipple 因精度吸收而为 0，纹波率为 0 而非 NaN', () => {
    const out = calculateDesign(spec({ rippleTarget: 0 }))
    expect(out.lBoost).toBe(Infinity)
    // lRipple = finite / Infinity = 0（不是 NaN），故 lRipplePercent = 0 / iLpeak = 0
    expect(out.lRipple).toBe(0)
    expect(out.lRipplePercent).toBe(0)
    // THD = 2 + 0 × 0.3 = 2，即"零纹波"下仍给出 2% 的底噪估算
    expect(out.thdEstimate).toBe(2)
  })
})

describe('calculateDesign - 金样快照（防止无意改动）', () => {
  const GOLDEN: Array<[string, DesignInput, Record<string, number>]> = [
    [
      '默认规格 3kW / 85-265Vac / 400V / 100kHz / 2相 / η0.95',
      BASE,
      {
        iinRms: 37.15170278637771,
        iinPeak: 52.54044194574967,
        lBoost: 1.0669007173373563e-4,
        lRipple: 7.881066291862452,
        lRipplePercent: 30,
        dutyMin: 0.06308351492782449,
        dutyMax: 0.6994796179957172,
        iLrms: 18.575851393188856,
        iLpeak: 26.270220972874835,
        thdEstimate: 11,
        coutMin: 0.0031412159820768818,
        conductionLoss: 24.136401429943568,
        switchingLoss: 52.54044194574966,
        diodeLoss: 23.6842105263158,
        inductorLoss: 13.802490199273455,
        totalLoss: 114.16354410128248,
        estimatedEfficiency: 0.9633405431395771,
      },
    ],
    [
      '低压重载 6kW / 90Vac / 390V / 65kHz / 4相 / η0.99 / 纹波20%',
      {
        vinMin: 90,
        vinMax: 300,
        vout: 390,
        pout: 6000,
        fsw: 65_000,
        phases: 4,
        efficiency: 0.99,
        rippleTarget: 20,
      },
      {
        iinRms: 67.34006734006735,
        iinPeak: 95.23323652344077,
        lBoost: 2.770227389743213e-4,
        lRipple: 4.7616618261720385,
        lRipplePercent: 20,
        dutyMin: -0.08785658644084249,
        dutyMax: 0.6736430240677473,
        iLrms: 16.835016835016837,
        iLpeak: 23.80830913086019,
        thdEstimate: 8,
        coutMin: 0.006341718689534212,
        conductionLoss: 38.18448367330701,
        switchingLoss: 60.35406364673058,
        diodeLoss: 46.62004662004662,
        inductorLoss: 22.673423346824023,
        totalLoss: 167.83201728690824,
        estimatedEfficiency: 0.9727891393902239,
      },
    ],
    [
      '单相轻载 300W / 176Vac / 410V / 500kHz / 1相 / η0.85 / 纹波10%',
      {
        vinMin: 176,
        vinMax: 265,
        vout: 410,
        pout: 300,
        fsw: 500_000,
        phases: 1,
        efficiency: 0.85,
        rippleTarget: 10,
      },
      {
        iinRms: 2.0053475935828877,
        iinPeak: 2.8359897641171696,
        lBoost: 6.897002887012809e-4,
        lRipple: 0.283598976411717,
        lRipplePercent: 10,
        dutyMin: 0.08593513651495077,
        dutyMax: 0.39292295859106163,
        iLrms: 2.0053475935828877,
        iLpeak: 2.8359897641171696,
        thdEstimate: 5,
        coutMin: 3.3416021925022644e-4,
        conductionLoss: 0.07900539199271933,
        switchingLoss: 14.534447541100493,
        diodeLoss: 2.5824964131994266,
        inductorLoss: 0.08042837942177357,
        totalLoss: 17.276377725714415,
        estimatedEfficiency: 0.9455478600406555,
      },
    ],
  ]

  it.each(GOLDEN)('%s', (_name, input, expected) => {
    const out = calculateDesign(input)
    expect(Object.keys(out).sort()).toEqual(Object.keys(expected).sort())
    for (const [key, value] of Object.entries(expected)) {
      expect(out[key as keyof typeof out]).toBeCloseTo(value, 10)
    }
  })
})
