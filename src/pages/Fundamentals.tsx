import { BookOpen } from 'lucide-react'
import CollapsibleSection from '../components/CollapsibleSection'
import TopologyDiagram from '../components/TopologyDiagram'
import InterleaveAnimation from '../components/InterleaveAnimation'
import InlineMath from '../components/InlineMath'

export default function Fundamentals() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">PFC 基础</h1>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        交错并联 Boost PFC（Interleaved Boost Power Factor Correction）是中大功率 AC-DC
        电源的前级功率因数校正电路。本页介绍为什么需要 PFC、交错并联拓扑结构、
        以及它最核心的优势 —— 电流纹波抵消。
      </p>

      {/* 为什么需要 PFC */}
      <CollapsibleSection title="1. 为什么需要功率因数校正" defaultOpen={true}>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            传统二极管整流 + 大电容滤波电路只在输入电压峰值附近从电网吸取电流，
            电流呈窄脉冲状，谐波含量高、功率因数低（通常仅 0.5~0.7），
            无法满足 IEC 61000-3-2 等谐波电流标准对 75W 以上设备的要求。
          </p>
          <p>
            有源 PFC 通过 Boost 变换器强制输入电流跟随输入电压波形，使功率因数接近 1
            （<InlineMath latex="PF \geq 0.99" />），并将母线电压提升到稳定的
            380~400V，为后级 DC-DC 提供良好工作条件。
          </p>
          <div className="rounded-lg bg-background border border-border p-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="font-semibold text-foreground">功率因数定义</p>
              <p className="mt-1">
                <InlineMath latex="PF = \dfrac{P_{avg}}{V_{rms} \cdot I_{rms}} = \cos\varphi \cdot \dfrac{1}{\sqrt{1+THD^2}}" />
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">典型指标</p>
              <p className="mt-1">PF ≥ 0.99，THD &lt; 5%（满载、额定电压）</p>
            </div>
          </div>
          <figure className="rounded-lg bg-background border border-border p-4">
            <img
              src="./assets/images/pfc_pf_comparison.png"
              alt="有PFC与无PFC的输入电流波形对比"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              无 PFC（脉冲电流）与有 PFC（正弦跟随）的输入电流对比
            </figcaption>
          </figure>
        </div>
      </CollapsibleSection>

      {/* 拓扑结构 */}
      <CollapsibleSection title="2. 交错并联拓扑结构" defaultOpen={true}>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            交错并联 Boost PFC 由 N 个相同的 Boost 变换器并联组成，各相的开关管驱动信号
            之间保持 <InlineMath latex="360°/N" /> 的相位差。输入端共用整流桥输出，输出端共用输出电容。
          </p>
          <div className="rounded-lg bg-background border border-border p-4">
            <h4 className="font-semibold text-foreground mb-2">典型 2 相交错并联 Boost PFC</h4>
            <TopologyDiagram />
            <p className="mt-3 text-xs">S1 与 S2 的驱动信号相位差为 180°（2相），绿色高亮表示开关管导通</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-foreground mb-1">相比单相 PFC</p>
              <p>
                每相只承担 1/N 功率，器件电流应力降低；输入纹波相互抵消，
                EMI 滤波器体积显著减小。
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="font-semibold text-foreground mb-1">相比多相独立 PFC</p>
              <p>
                共用整流桥与输出电容，控制上只需错相驱动，
                均流可通过峰值/平均电流模式自动实现。
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* 纹波抵消 */}
      <CollapsibleSection title="3. 电流纹波抵消原理" defaultOpen={true}>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            交错并联的核心优势在于输入电流纹波的抵消。各相电感电流纹波幅值相同、
            相位错开 <InlineMath latex="360°/N" />，叠加后大部分纹波相互抵消，
            总输入电流纹波远小于每相纹波。
          </p>
          <div className="rounded-lg bg-background border border-border p-4 space-y-2">
            <p className="font-semibold text-foreground">纹波抵消条件</p>
            <p>当占空比 D = 0.5 时，2 相交错并联的总输入电流纹波理论上可降至零。</p>
            <p>
              对于 N 相交错并联，纹波抵消点出现在{' '}
              <InlineMath latex="D = k/N \ (k = 1, 2, \dots, N-1)" />。
            </p>
          </div>
          <div>
            <p className="font-semibold text-foreground mb-3">实时演示：拖动占空比观察纹波抵消</p>
            <InterleaveAnimation />
          </div>
          <figure className="rounded-lg bg-background border border-border p-4">
            <img
              src="./assets/images/pfc_ripple_comparison.png"
              alt="单相与交错并联输入电流纹波对比"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              单相与交错并联（图示 N=4）的电感电流纹波对比：总输入纹波 = R(D,N)·ΔIL，在抵消占空比 D=k/N 处趋于零
            </figcaption>
          </figure>
        </div>
      </CollapsibleSection>

      {/* 应用场景 */}
      <CollapsibleSection title="4. 典型应用场景">
        <div className="grid gap-3 sm:grid-cols-2 text-sm text-muted-foreground leading-relaxed">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold text-foreground mb-1">服务器 / 通信电源</p>
            <p>1~3 kW  CRPS 电源、48V 通信电源前级，2 相交错是主流方案。</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold text-foreground mb-1">充电桩 / OBC</p>
            <p>3.3~11 kW 车载充电机与直流充电模块，常用 2~3 相交错降低纹波。</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold text-foreground mb-1">光伏 / 储能</p>
            <p>组串式逆变器前级 Boost、储能变流器 DC 侧的 MPPT 升压环节。</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-semibold text-foreground mb-1">大功率工业电源</p>
            <p>&gt; 5 kW 场合采用 3~4 相交错，分散热应力、减小磁性元件。</p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
