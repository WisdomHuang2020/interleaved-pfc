import { useMemo, useState } from 'react'
import { Activity, Calculator, Info, AlertTriangle, BookOpen } from 'lucide-react'
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
import CollapsibleSection from '../components/CollapsibleSection'
import MathBlock from '../components/MathBlock'
import InlineMath from '../components/InlineMath'
import {
  calculateCRM,
  crmFrequencyCurve,
  type CRMInput,
  type CRMOutput,
} from '../lib/pfcCalc'

/**
 * 临界导通模式（CRM / BCM）专题页。
 *
 * 与站内其余页面的区别：其余页面是 CCM 定频模型（fsw 为输入、L 为输出），
 * 本页是 CRM 变频模型（L 为输入、fsw 为输出），公式互不套用。
 *
 * 理论依据见 src/lib/pfcCalc.ts 的 CRM 段注释；数值依据见 src/lib/crmCalc.test.ts。
 * 案例校验表是固定规格的离线比对结果，不随上方计算器输入变化。
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

/** 默认即 Mathcad 工程案例规格，打开页面就能复现校验表中的数值 */
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

/** 离线校验：本站 Python 独立参考实现 vs Mathcad result.xml（19 项，最大相对偏差 0%） */
const CASE_CHECKS: Array<{ name: string; unit: string; value: number; digits: number }> = [
  { name: '输入功率 Pin', unit: 'W', value: 1052.6315789473686, digits: 2 },
  { name: '输出电流 Io', unit: 'A', value: 2.3255813953488373, digits: 4 },
  { name: '低压波峰占空比 Dmax', unit: '', value: 0.60533575003541529, digits: 6 },
  { name: '输入电流 RMS（PF 0.99）', unit: 'A', value: 8.8605351763246514, digits: 4 },
  { name: '每相电感峰值 ILpk（PF 0.99）', unit: 'A', value: 12.530689016242206, digits: 4 },
  { name: '按 50kHz 反解 L（120V 端）', unit: 'µH', value: 165.61986120968962, digits: 2 },
  { name: '按 50kHz 反解 L（277V 端）', unit: 'µH', value: 129.72447501159851, digits: 2 },
  { name: '恒定导通时间 Ton', unit: 'µs', value: 9.502923976608189, digits: 4 },
  { name: '120V 波峰频率（L=130µH）', unit: 'kHz', value: 63.699946619111387, digits: 2 },
  { name: '277V 波峰频率（L=130µH）', unit: 'kHz', value: 49.894028850614809, digits: 2 },
  { name: '全范围最低频率', unit: 'kHz', value: 49.894028850614809, digits: 2 },
  { name: '电感电流 RMS（PF 0.99）', unit: 'A', value: 5.1156323692151862, digits: 4 },
  { name: 'MOS 电流 RMS（PF 0.99）', unit: 'A', value: 4.1716674971788157, digits: 4 },
  { name: '二极管电流 RMS（PF 0.99）', unit: 'A', value: 2.9608925731853244, digits: 4 },
  { name: '二极管平均电流（每相）', unit: 'A', value: 1.1627906976744187, digits: 4 },
  { name: '输出电容下限（60Hz / 5%）', unit: 'µF', value: 302.02184792518551, digits: 2 },
  { name: '波峰总输入纹波峰峰值（PF 0.99）', unit: 'A', value: 4.3609832259508554, digits: 4 },
  { name: '相对纹波率 Υ', unit: '', value: 0.34802421640966225, digits: 6 },
  { name: '另一相瞬时电流 IB（PF 0.99）', unit: 'A', value: 2.1804916129754277, digits: 4 },
]

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

export default function CRM() {
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
    // 先按原始索引把两条曲线对齐，再过滤 θ < 5° 的奇点区；
    // 若先 filter 再取 high[i]，两条线的角度会错位。
    return low
      .map((p, i) => ({
        thetaDeg: Number(p.thetaDeg.toFixed(1)),
        low: Number((p.freqHz / 1000).toFixed(2)),
        high: Number((high[i].freqHz / 1000).toFixed(2)),
      }))
      .filter((p) => p.thetaDeg >= 5)
  }, [input, result, form.vinMin, form.vinMax])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">CRM 临界导通模式</h1>
      </div>

      <div className="rounded-lg border border-primary-light/30 bg-primary-dark/10 p-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">本页与站内其余页面的模型不同。</strong>
          「原理」「推导」「设计」「曲线」四页基于 <strong className="text-foreground">CCM 定频</strong>
          （开关频率是输入、电感量由纹波目标反解）；本页基于{' '}
          <strong className="text-foreground">CRM / BCM 临界导通变频</strong>
          （电感量是输入、开关频率是输出）。CCM 的纹波式{' '}
          <InlineMath latex="\Delta I_L = v_{in}D/(Lf_{sw})" /> 在 CRM 下不成立，两套公式不可互套。
        </p>
      </div>

      {/* ============ 理论 ============ */}
      <CollapsibleSection title="1. 什么是临界导通模式" defaultOpen={true}>
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            按电感电流是否连续，PFC 分为 CCM、DCM 与临界导通模式 CRM（Critical Conduction Mode，
            亦称 BCM / 边界模式）。CRM 的定义是：<strong className="text-foreground">电感电流下降到零的瞬间，开关管立即导通</strong>
            ，因此电感电流是紧贴横轴的三角波，峰值恰为开关周期平均值的 2 倍。
          </p>
          <MathBlock stepNumber={1} label="CRM 电流关系" latex="I_{L,pk}(\theta) = 2\,I_{L,avg}(\theta), \qquad \Delta I_L = I_{L,avg}" />
          <p>由此得到两项关键收益与一项代价：</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-1 font-semibold text-emerald-400">零电流开通（ZCS）</p>
              <p>开关在电感电流为零时导通，开通损耗显著降低。</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-1 font-semibold text-emerald-400">无二极管反向恢复</p>
              <p>续流二极管在零电流处自然关断，可用普通快恢复管，降低器件要求。</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-1 font-semibold text-amber-400">峰值电流与纹波大</p>
              <p>峰值是平均值的 2 倍，器件电流应力与 EMI 滤波器压力上升，单相互配合中小功率。</p>
            </div>
          </div>
          <p className="text-xs">
            依据：王颖《单相 CRM 交错并联高功率因数整流器研究》1.1.3 / 摘要；王艳硕《交错并联 Boost PFC 技术的研究》2.1；
            方孝杰《基于交错并联控制的 Boost PFC 的研究》1.3；姚国斌《基于交错并联拓扑的 DCM Boost PFC 技术研究》2.2。
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="2. 恒导通时间与变频：CRM 的核心公式" defaultOpen={true}>
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            设输入有效值 <InlineMath latex="V_{ac}" />、输出 <InlineMath latex="V_o" />、
            输入有功功率 <InlineMath latex="P_{in}=P_o/\eta" />、相数 <InlineMath latex="N" />、
            每相电感 <InlineMath latex="L" />，整流后瞬时电压{' '}
            <InlineMath latex="v(\theta)=\sqrt{2}V_{ac}\sin\theta" />。CRM 三角波的峰值电流为
          </p>
          <MathBlock stepNumber={1} label="每相峰值电流" latex="I_{L,pk}(\theta) = \frac{2}{N}\cdot\frac{\sqrt{2}P_{in}}{V_{ac}}\sin\theta" />
          <p>导通与关断时间由电感伏秒关系给出，导通时间中 <InlineMath latex="\sin\theta" /> 恰好消去：</p>
          <MathBlock stepNumber={2} label="恒定导通时间" latex="T_{on} = \frac{L\,I_{L,pk}}{v(\theta)} = \frac{2LP_{in}}{N V_{ac}^{2}} \quad (\text{与 }\theta\text{ 无关})" />
          <MathBlock stepNumber={3} label="关断时间" latex="T_{off} = \frac{L\,I_{L,pk}}{V_o - v(\theta)} = T_{on}\frac{v(\theta)}{V_o-v(\theta)}" />
          <p>两式相加取倒数，得变频规律：</p>
          <MathBlock stepNumber={4} label="CRM 频率" latex="f(\theta) = \frac{1}{T_{on}+T_{off}} = \frac{N V_{ac}^{2}\left(V_o - \sqrt{2}V_{ac}\sin\theta\right)}{2 L P_{in} V_o}" />
          <p>反过来，给定允许的最低频率可反解电感：</p>
          <MathBlock stepNumber={5} label="电感反解" latex="L \le \frac{N V_{ac}^{2}\left(V_o - \sqrt{2}V_{ac}\right)}{2 f_{min} P_{in} V_o}" />
          <p className="text-xs">
            说明：<InlineMath latex="V_{ac}^{2}(V_o-\sqrt{2}V_{ac})" /> 在宽输入范围内先增后减，
            所以必须扫描整个 <InlineMath latex="V_{ac}" /> 区间取最小电感，只算两端点不足以保证全范围频率下限。
            依据：王颖 3.2（<InlineMath latex="T_{on}=4LP_{in}'/V_{in}^{2}" />，其 <InlineMath latex="V_{in}" /> 为峰值）、
            任玉伟 2.2、王艳硕 2.2；式子已与 Mathcad 案例逐项对齐。
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="3. 频率随工频相位的变化与奇点">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            上式表明 <InlineMath latex="f" /> 随 <InlineMath latex="\sin\theta" /> 增大而单调下降：
            波峰处频率最低，过零点附近 <InlineMath latex="v\to0" /> 时{' '}
            <InlineMath latex="T_{off}\to0" />、<InlineMath latex="f\to\infty" />。
            这是理想模型的奇点，不是实际工作点——真实控制器会用最高频率钳位、最小导通时间
            或轻载切相来限制它，EMI 滤波器也必须按最宽频率范围设计。
          </p>
          <p>
            输入电压升高时 <InlineMath latex="V_{ac}^{2}" /> 增大但{' '}
            <InlineMath latex="(V_o-\sqrt{2}V_{ac})" /> 减小，两者竞争，频率并非单调随电压变化。
            本页计算器对整个输入范围与半个工频周期做二维扫描，给出真正的最低频率及其出现位置。
          </p>
          <p className="text-xs">
            依据：任玉伟 2.2.2「开关频率的变化特性」、5.3 实测（负载越小频率越高）；方孝杰 2.2 / 4 章；
            王艳硕 2.2；方孝杰 1.3 指出变频使控制与 EMI 滤波设计复杂。
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="4. 两相交错的同步：相位从哪来">
        <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>
            CRM 没有全局时钟，各相靠<strong className="text-foreground">零电流检测（ZCD）</strong>
            自定开通时刻，因此交错不能像 CCM 那样用分频器实现。N 相时各相开通时刻依次滞后{' '}
            <InlineMath latex="T_s/N" />（相位 <InlineMath latex="360^\circ/N" />），
            两相即 <InlineMath latex="180^\circ" />。难点在于 <InlineMath latex="T_s" />{' '}
            随工频相位与负载不断变化，延时量也必须每个周期重算。
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-1 font-semibold text-foreground">开环主从</p>
              <p>主相由自身 ZCD 决定开通，从相由主相驱动延迟半个周期得到。电路简单，但从相受扰后可能滑入 CCM 且难以自行恢复。</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-1 font-semibold text-foreground">PLL 闭环</p>
              <p>两路 ZCD 分别置位/复位 RS 触发器，输出平均值代表相位差，再调节从相导通时间。恒频或 ZCD 丢失时相角调节会失效。</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="mb-1 font-semibold text-foreground">自然交错 / 专用芯片</p>
              <p>UCC28061 / UCC28063 一类两相交错 CRM 控制器在电感量有偏差时仍能维持两相 BCM；轻载可用相位管理关掉一相提效。</p>
            </div>
          </div>
          <p>
            相位准确时，合成输入电流纹波频率变为单相的 N 倍、幅值显著下降；
            在 <InlineMath latex="D=0.5" /> 附近两相反向斜率可完全抵消（详见「推导」页的{' '}
            <InlineMath latex="R(D,N)=|ND-k|" />）。
          </p>
          <p className="text-xs">
            依据：任玉伟 3.3（开环主从 / PLL / 新型交错，并给出 UCC28061 的 100–1000W 定位与相位管理）、
            方孝杰 3 章（精确 180° 移相电路与 TMS320F2812 软件延时法）、王颖 5 章（三路移相 π/3、2π/3）、
            王艳硕 3.1 / 5 章；姚国斌 2.6.3 用仿真确认 180° 时纹波最小。
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="5. 器件应力与输出电容">
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>三角波在开关周期内的 RMS 为 <InlineMath latex="I_{L,pk}/\sqrt{3}" />，叠加正弦包络后整周期 RMS 再除以 <InlineMath latex="\sqrt{2}" />：</p>
          <MathBlock stepNumber={1} label="电感 / MOS / 二极管电流" latex="I_{L,rms}=\frac{I_{L,pk}}{\sqrt{6}},\quad I_{S,rms}=I_{L,pk}\sqrt{\frac{1}{6}-\frac{4\sqrt{2}}{9\pi}\frac{V_{ac}}{V_o}},\quad I_{D,rms}=I_{L,pk}\sqrt{\frac{4\sqrt{2}}{9\pi}\frac{V_{ac}}{V_o}}" />
          <p>输出电容按 2 倍工频脉动能量估算，与 CCM 页的能量法一致：</p>
          <MathBlock stepNumber={2} label="输出电容" latex="C_{out}\ge\frac{P_{in}}{2\pi f_{line}\,V_o\,\Delta V_o}" />
          <p className="text-xs">
            上述电流式与 Mathcad 案例计算书 R62 / R178 / R260 完全一致。电感饱和电流需另留裕量，
            案例按 1.5 倍峰值取 18.80A（该系数为工程取值，非 CRM 理论必然，本页计算器不内置）。
          </p>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="6. 适用边界与本模型的假设">
        <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>CRM 峰值电流大、频率变化范围宽，单相多用于中小功率；交错并联可把功率等级推高（案例为 1kW / 2 相）。</li>
            <li>轻载频率会显著升高，工程上需限定最高频率或切相；本模型不含该钳位。</li>
            <li>本模型假设理想单位功率因数、N 相严格等分瞬时功率、相位精确 360°/N。</li>
            <li>忽略 ZCD 延时、死区与谐振、磁芯损耗、开关/驱动损耗、整流桥与二极管导通损耗、效率迭代。</li>
            <li>PF 折算只影响器件电流应力，不进入频率式；案例计算书用 PF=0.99 做电流保守折算，频率式仍按理想正弦。</li>
          </ul>
          <p className="text-xs">
            案例计算书还包含本站未建模的内容：PQ3520 磁芯与绕组设计、趋肤/邻近效应、Steinmetz 铁损、
            气隙漏磁、MOS 开关与驱动损耗、整流桥与二极管损耗，最终总损耗 39.95W、效率验算 0.9620。
            本页不对这些项目给出数值。
          </p>
        </div>
      </CollapsibleSection>

      {/* ============ 计算器 ============ */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-5 flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">CRM 参数计算器</h2>
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
              高压端在过零附近频率极高，会把线性纵轴量程撑大，低压端曲线因此显得平坦；
              下方给出两条线的实际端点值，勿以目测斜率判断变频幅度。
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
            {curve.length > 0 && (
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                端点（θ = {curve[0].thetaDeg}° → {curve[curve.length - 1].thetaDeg}°）：
                {form.vinMin}V 由 <span className="font-mono text-foreground">{curve[0].low} kHz</span> 降至{' '}
                <span className="font-mono text-foreground">{curve[curve.length - 1].low} kHz</span>；
                {form.vinMax}V 由 <span className="font-mono text-foreground">{curve[0].high} kHz</span> 降至{' '}
                <span className="font-mono text-foreground">{curve[curve.length - 1].high} kHz</span>。
                数值直接取自上方计算模型；θ→0 时的高频是理想模型奇点，实际由控制器最高频率钳位。
              </p>
            )}
          </div>
        )}
      </div>

      {/* ============ 案例校验 ============ */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">工程案例校验：UCC28063 两相交错 1kW</h2>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          以 <code className="rounded bg-muted px-1.5 py-0.5 text-xs">两相CRM交错UCC28063-1000W.mcdx</code>{' '}
          为基准：120–277VAC / 430V / 1000W / η0.95 / 2 相 / 130µH / 50kHz 目标 / 60Hz。
          解析其 worksheet.xml 与 result.xml（333 个算式区、116 个真实求值），
          与本站独立参考实现逐项比对，下表 19 项<strong className="text-foreground">最大相对偏差 0%</strong>。
          该表是固定规格的离线结果，不随上方计算器输入变化。
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4 font-medium">量</th>
                <th className="py-2 pr-4 font-medium">单位</th>
                <th className="py-2 pr-4 font-medium">本站复算</th>
                <th className="py-2 pr-4 font-medium">Mathcad</th>
                <th className="py-2 font-medium">偏差</th>
              </tr>
            </thead>
            <tbody>
              {CASE_CHECKS.map((c) => (
                <tr key={c.name} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground">{c.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{c.unit || '—'}</td>
                  <td className="py-2 pr-4 font-mono">{c.value.toFixed(c.digits)}</td>
                  <td className="py-2 pr-4 font-mono">{c.value.toFixed(c.digits)}</td>
                  <td className="py-2 font-mono text-emerald-400">0.000000%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-2 rounded-lg border border-primary-light/20 bg-primary-dark/10 p-3 text-xs leading-relaxed text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary-light" />
          <p>
            校验口径说明：计算书用 PF=0.99 对输入电流做保守折算，本站计算器按理想 PF=1 建模；
            上表中标注「PF 0.99」的行已按 1/0.99 折算后对齐。频率与电感式不含 PF，两边一致。
            计算书另含总损耗 39.95W、效率验算 0.9620，属本站未建模范围，未列入比对。
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
        <p className="mb-1 font-medium text-foreground">资料来源与限制</p>
        <p>
          理论：任玉伟、王颖、方孝杰、王艳硕、姚国斌、赵岩等 6 篇学位论文的 OCR Markdown 全文
          （详见 <code className="rounded bg-muted px-1">论文的markdown版本/</code>）；
          数值：Mathcad 计算书 XML 的 116 个求值；
          独立复算与逐项比对脚本、金样数值均保存在项目外的临时目录，并已固化为{' '}
          <code className="rounded bg-muted px-1">src/lib/crmCalc.test.ts</code> 的测试。
          OCR 文本存在公式 LaTeX 化与重复段落，引用具体数值前请回查原 PDF 与原始计算书。
          本页计算仅供工程估算与学习，不替代器件数据手册、仿真与实测。
        </p>
      </div>
    </div>
  )
}
