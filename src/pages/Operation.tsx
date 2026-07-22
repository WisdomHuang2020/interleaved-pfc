import { useState } from 'react'
import { Activity } from 'lucide-react'
import CollapsibleSection from '../components/CollapsibleSection'
import InlineMath from '../components/InlineMath'

/** 四种开关模态 */
const modes = [
  {
    key: 'A',
    s1: true,
    s2: false,
    name: '模态 A：S1 导通 / S2 关断',
    desc: 'L1 储能，iL1 线性上升；L2 经 D2 向输出释放能量，iL2 线性下降。输入电流 = iL1 + iL2。',
    condition: '任意占空比下均会出现',
  },
  {
    key: 'B',
    s1: false,
    s2: true,
    name: '模态 B：S1 关断 / S2 导通',
    desc: 'L1 经 D1 向输出释放能量，iL1 线性下降；L2 储能，iL2 线性上升。与模态 A 相隔半个开关周期交错出现。',
    condition: '任意占空比下均会出现',
  },
  {
    key: 'C',
    s1: true,
    s2: true,
    name: '模态 C：S1、S2 同时导通',
    desc: '两相电感同时储能，iL1、iL2 同时上升，输出电容单独向负载供电。此模态期间输入电流上升最快。',
    condition: '仅当 D > 0.5 时出现（两相导通区间重叠）',
  },
  {
    key: 'D',
    s1: false,
    s2: false,
    name: '模态 D：S1、S2 同时关断',
    desc: '两相电感同时经 D1、D2 向输出释放能量，iL1、iL2 同时下降。此模态期间输入电流下降最快。',
    condition: '仅当 D < 0.5 时出现（两相关断区间重叠）',
  },
]

function SwitchBadge({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-mono transition-colors ${
        on ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'bg-emerald-400' : 'bg-muted-foreground/40'}`} />
      {label} {on ? '导通' : '关断'}
    </span>
  )
}

export default function Operation() {
  const [mode, setMode] = useState(0)
  const m = modes[mode]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">工作原理</h1>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        交错并联 PFC 的每个开关周期内，两相开关管按固定相位差交替动作，
        形成四种工作模态的组合。理解各模态的电流路径是分析纹波、损耗与控制的基础。
      </p>

      {/* 单相 Boost 基础 */}
      <CollapsibleSection title="1. 单相 Boost 的两个开关阶段" defaultOpen={true}>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-emerald-400 mb-2">阶段 ①：开关导通（DTs）</p>
              <p>
                整流后电压 <InlineMath latex="v_{in}(t)" /> 全部加在电感上，电感储能，
                电流以斜率 <InlineMath latex="v_{in}/L" /> 线性上升；
                输出电容单独向负载供电。
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-blue-400 mb-2">阶段 ②：开关关断（(1−D)Ts）</p>
              <p>
                电感经二极管向输出放能，电感电压为{' '}
                <InlineMath latex="v_{in} - V_{out} < 0" />，电流以斜率{' '}
                <InlineMath latex="(v_{in}-V_{out})/L" /> 线性下降。
              </p>
            </div>
          </div>
          <p>
            稳态下一个开关周期内电感伏秒平衡：
            <InlineMath latex="v_{in} \cdot D = (V_{out} - v_{in})(1-D)" />，整理得 Boost
            基本关系 <InlineMath latex="V_{out} = v_{in}/(1-D)" />。
          </p>
          <figure className="rounded-lg bg-background border border-border p-4">
            <img
              src="./assets/images/pfc_single_phase_timing.png"
              alt="单相Boost PFC开关时序波形"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              单相 Boost PFC 开关时序：驱动信号、电感电流与输入电压的关系
            </figcaption>
          </figure>
        </div>
      </CollapsibleSection>

      {/* 交错时序 */}
      <CollapsibleSection title="2. 两相交错的驱动时序" defaultOpen={true}>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            两相驱动信号 G1、G2 频率相同、相位差 180°。占空比不同，一个周期内的模态序列也不同：
          </p>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-foreground mb-2">D &lt; 0.5（输入电压较高时）</p>
              <p>模态序列：A → D → B → D，存在两相同时关断的模态 D。</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-foreground mb-2">D &gt; 0.5（输入电压较低时）</p>
              <p>模态序列：A → C → B → C，存在两相同时导通的模态 C。</p>
            </div>
          </div>
          <figure className="rounded-lg bg-background border border-border p-4">
            <img
              src="./assets/images/pfc_pwm_signals.png"
              alt="交错并联PWM驱动信号"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              交错并联 PWM 驱动信号（图示 N=4，相位差 90°）：N 相时各相依次错开 360°/N，2 相时相位差为 180°
            </figcaption>
          </figure>
          <figure className="rounded-lg bg-background border border-border p-4">
            <img
              src="./assets/images/pfc_phase_currents.png"
              alt="各相电感电流与总输入电流波形"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              各相电感电流（图示 N=4）：幅值相同、相位依次错开 360°/N，叠加后总输入电流纹波大幅减小
            </figcaption>
          </figure>
        </div>
      </CollapsibleSection>

      {/* 四种模态交互 */}
      <CollapsibleSection title="3. 四种工作模态（点击切换）" defaultOpen={true}>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {modes.map((mm, i) => (
              <button
                key={mm.key}
                onClick={() => setMode(i)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === i
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                模态 {mm.key}
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-border bg-background p-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <SwitchBadge on={m.s1} label="S1" />
              <SwitchBadge on={m.s2} label="S2" />
              <span className="text-sm text-muted-foreground">D1/D2 与关断相二极管互补导通</span>
            </div>
            <p className="font-semibold text-foreground">{m.name}</p>
            <p className="text-muted-foreground leading-relaxed">{m.desc}</p>
            <p className="text-sm">
              <span className="text-muted-foreground">出现条件：</span>
              <span className="text-amber-400">{m.condition}</span>
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">模态与纹波抵消的联系</p>
            <p>
              D = 0.5 时模态 A、B 严格交替且持续时间为 Ts/2，两相电流斜率时刻相反，
              纹波完全抵消 —— 这正是 2 相交错在 D=0.5 处纹波为零的几何解释。
              偏离该点后模态 C 或 D 出现，抵消效果减弱。
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* 工频周期 */}
      <CollapsibleSection title="4. 工频周期内的占空比变化">
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            PFC 与固定占空比 DC-DC 的本质区别：占空比随整流后的正弦电压实时变化
            <InlineMath latex="D(\theta) = 1 - \dfrac{V_m |\sin\theta|}{V_{out}}" />。
            过零点附近 D → 1，电压峰值处 D 最小。
          </p>
          <p>
            以 220Vac 输入、400V 输出为例：峰值处{' '}
            <InlineMath latex="D = 1 - 220\sqrt{2}/400 \approx 0.22" />。
            因此工频半个周期内 D 会两次扫过纹波抵消点（D = 0.5），
            该瞬时输入纹波最小；过零点附近 D 接近 1，纹波最大，这也是 PFC
            输入电流在过零附近畸变最明显的原因之一。
          </p>
          <figure className="rounded-lg bg-background border border-border p-4">
            <img
              src="./assets/images/pfc_input_waveforms.png"
              alt="PFC输入电压电流波形"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              工频周期内的输入电压与电流：电流正弦跟随电压，实现单位功率因数
            </figcaption>
          </figure>
        </div>
      </CollapsibleSection>
    </div>
  )
}
