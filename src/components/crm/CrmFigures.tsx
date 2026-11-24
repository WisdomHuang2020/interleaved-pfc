import type { ReactNode } from 'react'
import { calculateCRM, crmFrequency, type CRMInput } from '../../lib/pfcCalc'

/**
 * 临界导通（CRM / BCM）专题页的波形示意图。
 *
 * 全部用手写 SVG，不用位图：站点是纯深色主题，位图在高分屏发虚、改一个标注就要重画，
 * 且论文插图有版权不能直接引用。
 *
 * 数值纪律：图里出现的一切数字（频率、Ton/Toff、电流）都由 `pfcCalc` 现算现显示，
 * 不写死常量，避免与计算真源漂移。案例规格与页面校验表、crmCalc.test.ts 保持一致。
 *
 * 绘图纪律：同一张图内的纵轴比例必须统一——两个子图若各用各的刻度，会让「合成电流纹波
 * 更小」这种结论在视觉上失真（图 6 第一版踩过这个坑）。
 */

const CASE_SPEC: CRMInput = {
  vinMin: 120,
  vinMax: 277,
  vout: 430,
  pout: 1000,
  efficiency: 0.95,
  phases: 2,
  inductance: 130e-6,
  targetFreq: 50000,
  lineFreq: 60,
  ripplePercent: 5,
}

/* 配色取自 src/index.css 的 @theme，与页面其余部分一致 */
const C_A = '#14b8a6' // primary-light：主相 / 主要曲线
const C_B = '#f59e0b' // accent：从相 / 对照曲线
const C_SUM = '#38bdf8' // 合成量
const AXIS = '#525252'
const GRID = '#3a3a3a'
const TXT = '#a3a3a3'
const TXT_DIM = '#737373'
const BOX_FILL = '#262626'

/** 三角波瞬时值：周期 period，导通 ton，峰值 amp。CRM 的 i_L 就是这种形状。 */
function tri(t: number, ton: number, period: number, amp: number): number {
  const tt = ((t % period) + period) % period
  return tt <= ton ? (amp * tt) / ton : (amp * (period - tt)) / (period - ton)
}

/** 箭头标记：每张图各自定义一份，避免同页 6 张 SVG 的 id 冲突。 */
function ArrowDef({ id, color = AXIS }: { id: string; color?: string }) {
  return (
    <defs>
      <marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
      </marker>
    </defs>
  )
}

function FigureFrame({
  title,
  caption,
  children,
}: {
  title: string
  caption: ReactNode
  children: ReactNode
}) {
  return (
    <figure className="rounded-lg border border-border bg-card p-4">
      <figcaption className="mb-2 text-xs font-semibold text-foreground">{title}</figcaption>
      <div className="overflow-x-auto">
        {/* 限宽到接近 viewBox 原始尺寸，避免 1440 宽屏下波形被放到过大、抢掉正文版面 */}
        <div className="mx-auto w-full max-w-[840px]">{children}</div>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{caption}</p>
    </figure>
  )
}

/* ============================================================
   图 1：三种导通模式的电感电流对比（什么是「临界」）
   ============================================================ */
export function ConductionModeCompare() {
  const y0 = 185
  const yTop = 62
  const yAvg = 128
  const panels = [
    {
      x: 40,
      name: 'CCM 连续',
      note: '电流始终大于零',
      color: C_A,
      path: 'M 40 155 L 87 100 L 135 155 L 182 100 L 230 155',
    },
    {
      x: 265,
      name: 'CRM / BCM 临界',
      note: '恰好触零即刻开通',
      color: C_B,
      path: 'M 265 185 L 312 70 L 360 185 L 407 70 L 455 185',
    },
    {
      x: 490,
      name: 'DCM 断续',
      note: '触零后停一段时间再开通',
      color: TXT,
      path: 'M 490 185 L 520 70 L 550 185 L 585 185 L 615 70 L 645 185 L 680 185',
    },
  ]

  return (
    <FigureFrame
      title="图 1　三种电感电流导通状态：CCM / CRM（BCM）/ DCM"
      caption={
        <>
          三条波形共用同一纵向标尺（虚线为该周期平均值）。<strong className="text-foreground">CCM</strong> 的电流在开关周期内
          始终不为零；<strong className="text-foreground">CRM / BCM</strong> 的谷点恰好落在零线上，到零的那一瞬立刻开通下一周期；
          <strong className="text-foreground">DCM</strong> 到零后还要空等一段时间。CRM 因此没有固定周期——周期由
          &ldquo;电感充放电到零点&rdquo;这件事本身决定，这正是它必须变频的原因。
        </>
      }
    >
      <svg viewBox="0 0 720 250" className="h-auto w-full" role="img" aria-label="CCM、CRM、DCM 三种电感电流波形对比">
        <ArrowDef id="m1" />
        {panels.map((p) => (
          <g key={p.name}>
            <line x1={p.x} y1={y0} x2={p.x + 190} y2={y0} stroke={AXIS} strokeWidth="1" />
            <line x1={p.x} y1={y0} x2={p.x} y2={yTop} stroke={AXIS} strokeWidth="1" markerEnd="url(#m1)" />
            <text x={p.x - 6} y={y0 + 3} textAnchor="end" fontSize="10" fill={TXT_DIM}>
              0
            </text>
            <line
              x1={p.x}
              y1={yAvg}
              x2={p.x + 190}
              y2={yAvg}
              stroke={GRID}
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <path d={p.path} fill="none" stroke={p.color} strokeWidth="2" strokeLinejoin="round" />
            <text x={p.x + 95} y={205} textAnchor="middle" fontSize="12" fill={TXT}>
              {p.name}
            </text>
            <text x={p.x + 95} y={224} textAnchor="middle" fontSize="10" fill={TXT_DIM}>
              {p.note}
            </text>
          </g>
        ))}
        <text x="40" y="52" fontSize="10" fill={TXT_DIM}>
          i_L
        </text>
        {/* 平均值标注放在第一格左上，避开波形 */}
        <text x="46" y={yAvg - 9} fontSize="9" fill={TXT_DIM}>
          I_avg
        </text>
      </svg>
    </FigureFrame>
  )
}

/* ============================================================
   图 2：单相 CRM 一个周期的细节（ZCD 触发、Ton/Toff、峰值=2×平均）
   ============================================================ */
export function CrmSinglePhaseWaveform() {
  const num = (v: number, d = 2) => v.toFixed(d)
  const r = calculateCRM(CASE_SPEC)
  const toffPeak = 1 / r.fPeakLow - r.ton

  const y0 = 230
  const yPk = 72
  const amp = y0 - yPk
  const x0 = 90
  const ton = 170
  const toff = 290
  const x1 = x0 + ton
  const x2 = x1 + toff
  const xEnd = 700
  const tail = ((y0 - yPk) * (xEnd - x2)) / ton
  const yTail = y0 - tail

  return (
    <FigureFrame
      title="图 2　单相 CRM 的一个开关周期：恒定的 T_on 与由 ZCD 决定的 T_off"
      caption={
        <>
          电流从零沿固定斜率上升 <strong className="text-foreground">T_on</strong> 到达峰值，再沿较缓斜率下降到零，
          到零的瞬间被零电流检测（ZCD）捕获并立即开通——所以波形是紧贴横轴的三角波，
          峰值恒为该周期平均值的 2 倍。案例（120 V 输入、130 µH）：
          T_on = {num(r.ton * 1e6, 4)} µs、峰值处 T_off = {num(toffPeak * 1e6, 4)} µs。
          <strong className="text-foreground">T_on 在整条工频周期内不变，变的是 T_off</strong>——这是下一张图的主题。
        </>
      }
    >
      <svg viewBox="0 0 720 330" className="h-auto w-full" role="img" aria-label="单相 CRM 电感电流与驱动波形">
        <ArrowDef id="m2a" />
        <ArrowDef id="m2b" color={C_A} />
        {/* 坐标 */}
        <line x1="64" y1={y0} x2="706" y2={y0} stroke={AXIS} strokeWidth="1" />
        <line x1="64" y1={y0} x2="64" y2="56" stroke={AXIS} strokeWidth="1" markerEnd="url(#m2a)" />
        <text x="58" y={y0 + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          0
        </text>
        <text x="58" y={yPk + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          I_pk
        </text>
        <text x="58" y={y0 - amp / 2 + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          I_avg
        </text>
        <line x1="64" y1={y0 - amp / 2} x2="706" y2={y0 - amp / 2} stroke={GRID} strokeWidth="1" strokeDasharray="4 4" />
        <line x1="64" y1={y0 - amp} x2="706" y2={y0 - amp} stroke={GRID} strokeWidth="1" strokeDasharray="4 4" />
        {/* 电流波形：一个完整周期 + 下一周期的上升段 */}
        <path
          d={`M ${x0} ${y0} L ${x1} ${yPk} L ${x2} ${y0} L ${xEnd} ${yTail}`}
          fill="none"
          stroke={C_A}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        {/* ZCD 触发线 */}
        <line x1={x2} y1="62" x2={x2} y2="312" stroke={C_B} strokeWidth="1" strokeDasharray="5 4" />
        <circle cx={x2} cy={y0} r="3.5" fill={C_B} />
        <text x={x2 + 6} y="308" fontSize="10" fill={C_B}>
          ZCD：i_L 归零 → 立即开通
        </text>
        {/* Ton / Toff 区间标注 */}
        <line x1={x0} y1="48" x2={x1} y2="48" stroke={C_A} strokeWidth="1" markerEnd="url(#m2b)" markerStart="url(#m2b)" />
        <line x1={x1} y1="48" x2={x2} y2="48" stroke={TXT} strokeWidth="1" markerEnd="url(#m2a)" markerStart="url(#m2a)" />
        <text x={(x0 + x1) / 2} y="40" textAnchor="middle" fontSize="11" fill={C_A}>
          T_on（恒定）
        </text>
        <text x={(x1 + x2) / 2} y="40" textAnchor="middle" fontSize="11" fill={TXT}>
          T_off（随工频相位变）
        </text>
        <text x={x1 + 6} y={yPk - 10} fontSize="10" fill={TXT}>
          I_L,pk = 2·I_L,avg
        </text>
        {/* 驱动脉冲 */}
        <line x1="64" y1="282" x2="706" y2="282" stroke={AXIS} strokeWidth="1" />
        <rect x={x0} y="262" width={ton} height="20" fill={C_A} fillOpacity="0.25" stroke={C_A} strokeWidth="1" />
        <rect x={x2} y="262" width={xEnd - x2} height="20" fill={C_A} fillOpacity="0.25" stroke={C_A} strokeWidth="1" />
        <text x="58" y="277" textAnchor="end" fontSize="10" fill={TXT_DIM}>
          G
        </text>
      </svg>
    </FigureFrame>
  )
}

/* ============================================================
   图 3：同一输入电压下的一个周期 —— Ton 相同、Toff 差近 9 倍
   （只画各一个周期：两串周期波形叠在一起会变成锯齿乱麻，读不出「上升沿重合」）
   ============================================================ */
export function ConstantOnTimeWaveform() {
  const num = (v: number, d = 2) => v.toFixed(d)
  const r = calculateCRM(CASE_SPEC)
  const pin = CASE_SPEC.pout / CASE_SPEC.efficiency
  const vac = CASE_SPEC.vinMin
  const l = r.inductance

  const fPeak = r.fPeakLow // θ = 90°
  const fNear = crmFrequency(vac, CASE_SPEC.vout, pin, CASE_SPEC.phases, l, (10 * Math.PI) / 180)
  const tPeak = 1 / fPeak
  const tNear = 1 / fNear
  const toffPeak = tPeak - r.ton
  const toffNear = tNear - r.ton

  const x0 = 100
  const y0 = 250
  const amp = 168
  const pxPerSec = 560 / (2 * tPeak)
  const tonPx = r.ton * pxPerSec
  const toffPeakPx = toffPeak * pxPerSec
  const toffNearPx = toffNear * pxPerSec
  const xPeak = x0 + tonPx
  const xZeroPeak = xPeak + toffPeakPx
  const xZeroNear = xPeak + toffNearPx

  return (
    <FigureFrame
      title="图 3　同一输入电压下的一个周期：T_on 相同，T_off 差近 9 倍"
      caption={
        <>
          两条曲线的<strong className="text-foreground">上升沿完全重合</strong>——斜率相同就是 T_on 相同，这是 CRM
          「恒导通时间」最直接的样子；差别全在下降沿：波峰处瞬时电压高，电感放电慢，
          T_off = {num(toffPeak * 1e6, 3)} µs；接近过零处瞬时电压低，放电极快，T_off 只剩{' '}
          {num(toffNear * 1e6, 3)} µs。于是同样的 T_on，周期从 {num(tPeak * 1e6, 2)} µs（
          {num(fPeak / 1000)} kHz）压到 {num(tNear * 1e6, 2)} µs（{num(fNear / 1000)} kHz）。
          <strong className="text-foreground">变频不是控制器主动调的，是电感伏秒关系算出来的结果。</strong>
        </>
      }
    >
      <svg viewBox="0 0 720 380" className="h-auto w-full" role="img" aria-label="恒定导通时间下两种相位的单周期波形对比">
        <ArrowDef id="m3" />
        <ArrowDef id="m3b" color={C_B} />
        {/* 坐标 */}
        <line x1="80" y1={y0} x2="706" y2={y0} stroke={AXIS} strokeWidth="1" />
        <line x1="80" y1={y0} x2="80" y2="74" stroke={AXIS} strokeWidth="1" markerEnd="url(#m3)" />
        <text x="74" y={y0 + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          0
        </text>
        <text x="74" y={y0 - amp + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          I_pk
        </text>
        <text x="84" y="70" fontSize="10" fill={TXT_DIM}>
          i_L
        </text>
        {/* T_on 标注 */}
        <line x1={x0} y1="52" x2={xPeak} y2="52" stroke={TXT} strokeWidth="1" markerEnd="url(#m3)" markerStart="url(#m3)" />
        <text x={(x0 + xPeak) / 2} y="44" textAnchor="middle" fontSize="11" fill={TXT}>
          T_on = {num(r.ton * 1e6, 3)} µs（两条曲线完全相同）
        </text>
        {/* 两条曲线：各画一个周期 */}
        <path
          d={`M ${x0} ${y0} L ${xPeak} ${y0 - amp} L ${xZeroPeak} ${y0}`}
          fill="none"
          stroke={C_A}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <path
          d={`M ${x0} ${y0} L ${xPeak} ${y0 - amp} L ${xZeroNear} ${y0}`}
          fill="none"
          stroke={C_B}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
        <circle cx={xZeroPeak} cy={y0} r="3.5" fill={C_A} />
        <circle cx={xZeroNear} cy={y0} r="3.5" fill={C_B} />
        {/* 图例与说明 */}
        <line x1="430" y1="104" x2="458" y2="104" stroke={C_A} strokeWidth="2.4" />
        <text x="464" y="108" fontSize="10" fill={TXT}>
          θ = 90°（波峰）
        </text>
        <line x1="430" y1="126" x2="458" y2="126" stroke={C_B} strokeWidth="2.4" />
        <text x="464" y="130" fontSize="10" fill={TXT}>
          θ = 10°（近过零）
        </text>
        <text x="430" y="162" fontSize="10" fill={TXT}>
          下降沿斜率 = (v_in − V_o)/L
        </text>
        <text x="430" y="178" fontSize="10" fill={TXT_DIM}>
          波峰处 v_in 高 → 放电慢
        </text>
        <text x="430" y="194" fontSize="10" fill={TXT_DIM}>
          过零处 v_in 低 → 放电快
        </text>
        {/* 周期长度对比（同一原点起算，直接比长短） */}
        <line x1={x0} y1="292" x2={xZeroNear} y2="292" stroke={C_B} strokeWidth="1" markerEnd="url(#m3b)" markerStart="url(#m3b)" />
        <text x={x0 + (xZeroNear - x0) / 2} y="284" textAnchor="middle" fontSize="10" fill={C_B}>
          T = {num(tNear * 1e6, 2)} µs，f = {num(fNear / 1000)} kHz
        </text>
        <line x1={x0} y1="332" x2={xZeroPeak} y2="332" stroke={C_A} strokeWidth="1" markerEnd="url(#m3)" markerStart="url(#m3)" />
        <text x={x0 + (xZeroPeak - x0) / 2} y="324" textAnchor="middle" fontSize="10" fill={C_A}>
          T = {num(tPeak * 1e6, 2)} µs，f = {num(fPeak / 1000)} kHz
        </text>
        <line x1={xZeroNear} y1={y0} x2={xZeroNear} y2="296" stroke={C_B} strokeWidth="1" strokeDasharray="3 3" />
        <line x1={xZeroPeak} y1={y0} x2={xZeroPeak} y2="336" stroke={C_A} strokeWidth="1" strokeDasharray="3 3" />
      </svg>
    </FigureFrame>
  )
}

/* ============================================================
   图 4：频率随工频相位变化（对数纵轴），两条输入电压曲线
   ============================================================ */
export function FrequencyVsTheta() {
  const num = (v: number, d = 2) => v.toFixed(d)
  const r = calculateCRM(CASE_SPEC)
  const pin = CASE_SPEC.pout / CASE_SPEC.efficiency
  const l = r.inductance

  const x0 = 90
  const x1 = 690
  const yTop = 60
  const yBot = 280
  const fMin = 40000
  const fMax = 700000
  const lx = (f: number) => Math.log10(f)
  const yOf = (f: number) => yBot - ((lx(f) - lx(fMin)) / (lx(fMax) - lx(fMin))) * (yBot - yTop)
  const xOf = (deg: number) => x0 + ((deg - 3) / 177) * (x1 - x0)

  const curve = (vac: number) => {
    const pts: string[] = []
    for (let d = 3; d <= 177; d += 1.5) {
      const f = crmFrequency(vac, CASE_SPEC.vout, pin, CASE_SPEC.phases, l, (d * Math.PI) / 180)
      pts.push(`${xOf(d).toFixed(1)},${yOf(f).toFixed(1)}`)
    }
    return pts.join(' ')
  }

  const yTicks = [50000, 100000, 200000, 400000]
  const fAtZeroHigh = crmFrequency(CASE_SPEC.vinMax, CASE_SPEC.vout, pin, CASE_SPEC.phases, l, 1e-6)
  const tonHigh = (2 * l * pin) / (CASE_SPEC.phases * CASE_SPEC.vinMax ** 2)

  return (
    <FigureFrame
      title="图 4　开关频率随工频相位的变化（案例：130 µH，120 V 与 277 V）"
      caption={
        <>
          纵轴为<strong className="text-foreground">对数刻度</strong>（线性刻度下高压曲线会把低压曲线压扁）。
          两条曲线都在 θ = 90° 触底：120 V 为 {num(r.fPeakLow / 1000)} kHz、277 V 为{' '}
          {num(r.fPeakHigh / 1000)} kHz，这就是反解电感时用的最低频率。向两侧靠近过零处频率迅速抬升——
          因为 T_off 趋于零而 T_on 不变，频率上限就是 1/T_on（277 V 下约{' '}
          {num(fAtZeroHigh / 1000, 0)} kHz，是波峰频率的 {num(fAtZeroHigh / r.fPeakHigh, 1)} 倍）。
          注意 120 V 与 277 V 的 T_on 并不相同（{num(r.ton * 1e6, 3)} µs 与 {num(tonHigh * 1e6, 3)} µs），
          所以两条曲线在过零处的抬升幅度差别很大。
        </>
      }
    >
      <svg viewBox="0 0 720 360" className="h-auto w-full" role="img" aria-label="CRM 开关频率随工频相位变化的曲线">
        <ArrowDef id="m4" />
        {/* 过零奇点区提示 */}
        <rect x={x0} y={yTop} width={xOf(10) - x0} height={yBot - yTop} fill={C_B} fillOpacity="0.04" />
        <rect x={xOf(170)} y={yTop} width={x1 - xOf(170)} height={yBot - yTop} fill={C_B} fillOpacity="0.04" />
        {/* 网格与刻度 */}
        {yTicks.map((f) => (
          <g key={f}>
            <line x1={x0} y1={yOf(f)} x2={x1} y2={yOf(f)} stroke={GRID} strokeWidth="1" strokeDasharray="3 5" />
            <text x={x0 - 8} y={yOf(f) + 3.5} textAnchor="end" fontSize="10" fill={TXT_DIM}>
              {f / 1000}
            </text>
          </g>
        ))}
        <text x={x0 - 8} y={yTop - 12} textAnchor="end" fontSize="9" fill={TXT_DIM}>
          kHz（对数）
        </text>
        {/* 坐标轴 */}
        <line x1={x0} y1={yBot} x2={x1 + 6} y2={yBot} stroke={AXIS} strokeWidth="1" markerEnd="url(#m4)" />
        <line x1={x0} y1={yBot} x2={x0} y2={yTop - 6} stroke={AXIS} strokeWidth="1" markerEnd="url(#m4)" />
        {[0, 45, 90, 135, 180].map((d) => (
          <g key={d}>
            <line x1={xOf(Math.max(d, 3))} y1={yBot} x2={xOf(Math.max(d, 3))} y2={yBot + 4} stroke={AXIS} strokeWidth="1" />
            <text x={xOf(Math.max(d, 3))} y={yBot + 17} textAnchor="middle" fontSize="10" fill={TXT_DIM}>
              {d}°
            </text>
          </g>
        ))}
        <text x={x1} y={yBot + 32} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          工频相位 θ
        </text>
        {/* 曲线 */}
        <polyline points={curve(CASE_SPEC.vinMin)} fill="none" stroke={C_A} strokeWidth="2.2" />
        <polyline points={curve(CASE_SPEC.vinMax)} fill="none" stroke={C_B} strokeWidth="2.2" />
        {/* 最低频率点 */}
        <circle cx={xOf(90)} cy={yOf(r.fPeakLow)} r="4" fill={C_A} />
        <circle cx={xOf(90)} cy={yOf(r.fPeakHigh)} r="4" fill={C_B} />
        <text x={xOf(90) - 10} y={yOf(r.fPeakLow) - 12} textAnchor="end" fontSize="10" fill={C_A}>
          120 V：{num(r.fPeakLow / 1000)} kHz
        </text>
        <text x={xOf(90) + 10} y={yOf(r.fPeakHigh) + 18} fontSize="10" fill={C_B}>
          277 V：{num(r.fPeakHigh / 1000)} kHz
        </text>
        <text x={xOf(14)} y={yTop + 14} fontSize="9" fill={TXT_DIM}>
          过零区：T_off→0
        </text>
        <text x={xOf(176)} y={yTop + 14} textAnchor="end" fontSize="9" fill={TXT_DIM}>
          过零区：T_off→0
        </text>
      </svg>
    </FigureFrame>
  )
}

/* ============================================================
   图 5：ZCD + 恒定 Ton 的控制框图
   ============================================================ */
function Block({ x, y, w, label, sub }: { x: number; y: number; w: number; label: string; sub?: string }) {
  const h = 42
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="6" fill={BOX_FILL} stroke={AXIS} strokeWidth="1" />
      <text x={x + w / 2} y={sub ? y + 18 : y + 26} textAnchor="middle" fontSize="11" fill="#e5e5e5">
        {label}
      </text>
      {sub ? (
        <text x={x + w / 2} y={y + 32} textAnchor="middle" fontSize="9" fill={TXT_DIM}>
          {sub}
        </text>
      ) : null}
    </g>
  )
}

export function ZcdControlBlock() {
  const num = (v: number, d = 3) => v.toFixed(d)
  const r = calculateCRM(CASE_SPEC)
  const tonHigh = (2 * r.inductance * (CASE_SPEC.pout / CASE_SPEC.efficiency)) / (CASE_SPEC.phases * CASE_SPEC.vinMax ** 2)

  return (
    <FigureFrame
      title="图 5　CRM 的控制回路：ZCD 置位、定时器复位，没有全局时钟"
      caption={
        <>
          与 CCM 的「一个时钟驱动两路分频」不同，CRM 的每个开关周期都是{' '}
          <strong className="text-foreground">由电感电流过零这件事重新发起</strong>：ZCD 比较器置位 RS 触发器 → 驱动开通 →
          定时器走完 T_on 后复位 → 关断 → 电感放电到零 → 再次置位。T_on 的大小由输出电压误差放大器的 V_comp 决定，
          在一个工频周期内基本不变：同一套参数在 120 V 下 T_on ≈ {num(r.ton * 1e6)} µs，在 277 V 下只有 ≈{' '}
          {num(tonHigh * 1e6)} µs。两相交错就在这个框架里，靠相位管理把从相的开通时刻压到主相之后半个实测周期。
        </>
      }
    >
      <svg viewBox="0 0 720 340" className="h-auto w-full" role="img" aria-label="CRM 零电流检测与恒定导通时间控制框图">
        <ArrowDef id="m6" />
        <ArrowDef id="m6b" color={C_B} />
        {/* 第一行：输出电压环 */}
        <Block x={40} y={55} w={130} label="V_o 采样" sub="分压 + 基准" />
        <Block x={200} y={55} w={140} label="误差放大器" sub="输出 V_comp" />
        <Block x={370} y={55} w={160} label="T_on 定时器" sub="恒导通时间" />
        <line x1="170" y1="76" x2="196" y2="76" stroke={AXIS} strokeWidth="1" markerEnd="url(#m6)" />
        <line x1="340" y1="76" x2="366" y2="76" stroke={AXIS} strokeWidth="1" markerEnd="url(#m6)" />
        {/* 第二行：开关动作 */}
        <Block x={200} y={150} w={140} label="SR 触发器" sub="置位 = 开通" />
        <Block x={370} y={150} w={160} label="驱动 + 主开关 Q" sub="MOSFET" />
        <Block x={560} y={150} w={140} label="功率级" sub="L / D / C_o" />
        <line x1="340" y1="171" x2="366" y2="171" stroke={AXIS} strokeWidth="1" markerEnd="url(#m6)" />
        <line x1="530" y1="171" x2="556" y2="171" stroke={AXIS} strokeWidth="1" markerEnd="url(#m6)" />
        {/* 定时器 → 复位：折线从右侧下行，标注放折线左侧，避免压线 */}
        <path d="M 450 97 L 450 128 L 300 128 L 300 146" fill="none" stroke={AXIS} strokeWidth="1" markerEnd="url(#m6)" />
        <text x="352" y="122" textAnchor="middle" fontSize="9" fill={TXT_DIM}>
          T_on 到期 → 复位
        </text>
        {/* ZCD → 置位 */}
        <Block x={40} y={240} w={230} label="ZCD 比较器" sub="辅助绕组检测 i_L 过零" />
        <path d="M 155 240 L 155 214 L 270 214 L 270 196" fill="none" stroke={AXIS} strokeWidth="1" markerEnd="url(#m6)" />
        <text x="166" y="206" fontSize="9" fill={TXT_DIM}>
          过零 → 置位
        </text>
        {/* 电流反馈回 ZCD */}
        <path d="M 630 192 L 630 308 L 200 308 L 200 286" fill="none" stroke={C_B} strokeWidth="1" strokeDasharray="5 4" markerEnd="url(#m6b)" />
        <text x="430" y="298" textAnchor="middle" fontSize="9" fill={C_B}>
          电感电流 i_L 降到零
        </text>
      </svg>
    </FigureFrame>
  )
}

/* ============================================================
   图 6：两相交错 180°，合成输入电流纹波
   （两个子图共用同一纵轴比例，否则「合成纹波更小」在视觉上会失真）
   ============================================================ */
export function TwoPhaseInterleave() {
  const num = (v: number, d = 2) => v.toFixed(d)
  const r = calculateCRM(CASE_SPEC)
  const pin = CASE_SPEC.pout / CASE_SPEC.efficiency
  const vac = CASE_SPEC.vinMin

  // 波峰处的每相峰值电流：I_pk = (2/N)·(√2·Pin/Vac)·sinθ，θ=90°
  const iPeak = ((2 / CASE_SPEC.phases) * (Math.SQRT2 * pin)) / vac
  const period = 1 / r.fPeakLow

  const x0 = 90
  const x1 = 690
  const spanSec = 2 * period
  const pxPerAmp = 120 / iPeak // 全图统一比例：120 px 对应一个 I_pk
  const yTop0 = 210 // 上图零线
  const ySum0 = 440 // 下图零线

  const iA = (t: number) => tri(t, r.ton, period, iPeak)
  const iB = (t: number) => tri(t - period / 2, r.ton, period, iPeak)
  const iSum = (t: number) => iA(t) + iB(t)

  // 采样实测合成波形最大/最小值，不靠解析式
  let sumMax = 0
  let sumMin = Infinity
  for (let i = 0; i <= 600; i++) {
    const v = iSum((i / 600) * spanSec)
    if (v > sumMax) sumMax = v
    if (v < sumMin) sumMin = v
  }
  const ripplePp = sumMax - sumMin

  const poly = (fn: (t: number) => number, yBase: number) => {
    const pts: string[] = []
    const steps = 240
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * spanSec
      pts.push(`${(x0 + (t / spanSec) * (x1 - x0)).toFixed(1)},${(yBase - fn(t) * pxPerAmp).toFixed(1)}`)
    }
    return pts.join(' ')
  }

  const yMean = ySum0 - ((sumMin + sumMax) / 2) * pxPerAmp
  const shiftX = x0 + (period / 2 / spanSec) * (x1 - x0)

  return (
    <FigureFrame
      title="图 6　两相各滞后半个周期：合成输入电流的纹波频率加倍、幅值下降"
      caption={
        <>
          上半图是两相各自的电感电流（<span style={{ color: C_A }}>青：i_L1</span>、
          <span style={{ color: C_B }}>橙：i_L2，滞后 T_s/2</span>），下半图是两者之和即变换器的输入电流。
          <strong className="text-foreground">两个子图纵轴比例相同</strong>：单相峰峰值 {num(iPeak)} A，合成后只有{' '}
          {num(ripplePp)} A，相对不交错时的 {num(2 * iPeak)} A 下降 {num((1 - ripplePp / (2 * iPeak)) * 100, 1)}%，
          纹波频率也从单相的一次变成两次。关键在于
          <strong className="text-foreground">两相的开通时刻各自独立由 ZCD 决定</strong>，180° 不是时钟分出来的，
          而是靠相位管理自然稳住的（相位从哪来，见上一张控制框图）。
        </>
      }
    >
      <svg viewBox="0 0 720 490" className="h-auto w-full" role="img" aria-label="两相交错电感电流与合成输入电流波形">
        <ArrowDef id="m5" />
        {/* 上半图：两相电流 */}
        <line x1="74" y1={yTop0} x2="706" y2={yTop0} stroke={AXIS} strokeWidth="1" />
        <line x1="74" y1={yTop0} x2="74" y2="62" stroke={AXIS} strokeWidth="1" markerEnd="url(#m5)" />
        <text x="68" y={yTop0 + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          0
        </text>
        <text x="68" y={yTop0 - iPeak * pxPerAmp + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          I_pk
        </text>
        <text x="80" y="58" fontSize="10" fill={TXT_DIM}>
          i_L1 , i_L2
        </text>
        <polyline points={poly(iA, yTop0)} fill="none" stroke={C_A} strokeWidth="2" />
        <polyline points={poly(iB, yTop0)} fill="none" stroke={C_B} strokeWidth="2" strokeDasharray="6 3" />
        {/* 单相纹波标尺 */}
        <line
          x1="664"
          y1={yTop0}
          x2="664"
          y2={yTop0 - iPeak * pxPerAmp}
          stroke={C_A}
          strokeWidth="1"
          markerEnd="url(#m5)"
          markerStart="url(#m5)"
        />
        <text x="664" y={yTop0 - iPeak * pxPerAmp - 8} textAnchor="middle" fontSize="9" fill={C_A}>
          {num(iPeak)} A
        </text>
        {/* 半周期偏移标注 */}
        <line x1={shiftX} y1="62" x2={shiftX} y2={yTop0} stroke={GRID} strokeWidth="1" strokeDasharray="4 4" />
        <text x={shiftX + 6} y="74" fontSize="9" fill={TXT_DIM}>
          T_s / 2 = {num((period / 2) * 1e6)} µs
        </text>
        {/* 下半图：合成电流（与上图同比例） */}
        <line x1="74" y1={ySum0} x2="706" y2={ySum0} stroke={AXIS} strokeWidth="1" />
        <line x1="74" y1={ySum0} x2="74" y2="286" stroke={AXIS} strokeWidth="1" markerEnd="url(#m5)" />
        <text x="68" y={ySum0 + 4} textAnchor="end" fontSize="10" fill={TXT_DIM}>
          0
        </text>
        <text x="80" y="282" fontSize="10" fill={TXT_DIM}>
          i_in = i_L1 + i_L2
        </text>
        <line x1="74" y1={yMean} x2="706" y2={yMean} stroke={GRID} strokeWidth="1" strokeDasharray="4 4" />
        <polyline points={poly(iSum, ySum0)} fill="none" stroke={C_SUM} strokeWidth="2.2" />
        <text x="96" y={yMean - 6} fontSize="9" fill={TXT_DIM}>
          平均值
        </text>
        {/* 合成纹波标尺（同一比例，长度差即纹波差） */}
        <line
          x1="664"
          y1={ySum0 - sumMax * pxPerAmp}
          x2="664"
          y2={ySum0 - sumMin * pxPerAmp}
          stroke={C_SUM}
          strokeWidth="1"
          markerEnd="url(#m5)"
          markerStart="url(#m5)"
        />
        <text x="664" y={ySum0 - sumMax * pxPerAmp - 8} textAnchor="middle" fontSize="9" fill={C_SUM}>
          {num(ripplePp)} A
        </text>
      </svg>
    </FigureFrame>
  )
}
