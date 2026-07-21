import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function CollapsibleSection({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>
      {open && <div className="px-6 pb-6 border-t border-border">{children}</div>}
    </div>
  )
}

export default function Theory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">PFC 工作原理</h1>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        交错并联Boost PFC变换器通过多相并联运行，利用相位差实现电流纹波抵消。
        以下介绍其拓扑结构、工作模态与关键公式推导。
      </p>

      {/* Topology */}
      <CollapsibleSection title="1. 拓扑结构" defaultOpen={true}>
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            交错并联Boost PFC由 N 个相同的Boost变换器并联组成，各相的开关管驱动信号
            之间保持 360°/N 的相位差。输入端共用整流桥输出，输出端共用输出电容。
          </p>
          <div className="rounded-lg bg-background border border-border p-4">
            <h4 className="font-semibold text-foreground mb-2">典型2相交错并联Boost PFC</h4>
            <div className="font-mono text-sm space-y-1">
              <div>Vin(+) ──┬── L1 ──┬── D1 ──┬── Vout(+)</div>
              <div>         │        │        │</div>
              <div>         │       S1       Cout</div>
              <div>         │        │        │</div>
              <div>Vin(-) ──┼── L2 ──┼── D2 ──┴── Vout(-)</div>
              <div>         │        │</div>
              <div>         │       S2</div>
              <div>         │        │</div>
              <div>         └────────┘</div>
            </div>
            <p className="mt-3 text-xs">S1 与 S2 的驱动信号相位差为 180°（2相）</p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Operating Modes */}
      <CollapsibleSection title="2. 工作模态">
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>以2相交错并联为例，一个开关周期内存在以下工作模态：</p>
          <ul className="space-y-2 ml-4">
            <li><strong className="text-foreground">模态1</strong>：S1导通，S2关断 — L1储能，L2通过D2向输出释放能量</li>
            <li><strong className="text-foreground">模态2</strong>：S1关断，S2导通 — L1通过D1向输出释放能量，L2储能</li>
            <li><strong className="text-foreground">模态3</strong>：S1、S2同时导通 — L1、L2同时储能</li>
            <li><strong className="text-foreground">模态4</strong>：S1、S2同时关断 — L1、L2同时通过D1、D2向输出释放能量</li>
          </ul>
        </div>
      </CollapsibleSection>

      {/* Ripple Cancellation */}
      <CollapsibleSection title="3. 电流纹波抵消原理">
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>
            交错并联的核心优势在于输入电流纹波的抵消。当各相电感电流纹波相位差为 180°（2相）时，
            总输入电流纹波为各相纹波的矢量和。
          </p>
          <div className="rounded-lg bg-background border border-border p-4 space-y-2">
            <p className="font-semibold text-foreground">纹波抵消条件</p>
            <p>当占空比 D = 0.5 时，2相交错并联的总输入电流纹波理论上可降至零。</p>
            <p>对于 N 相交错并联，纹波抵消点出现在 D = k/N（k = 1, 2, ..., N-1）。</p>
          </div>
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="font-semibold text-foreground mb-2">总输入电流纹波公式</p>
            <p className="font-mono text-sm">
              ΔI<sub>in,total</sub> = ΔI<sub>L</sub> · R(D, N)
            </p>
            <p className="mt-2 text-sm">
              其中 R(D, N) 为纹波抵消系数，与占空比 D 和相数 N 相关。
              对于2相：R(D, 2) = |2D - 1|（当 D ≤ 0.5）或 |2(1-D) - 1|（当 D &gt; 0.5）
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Key Formulas */}
      <CollapsibleSection title="4. 关键公式">
        <div className="space-y-4">
          <div className="rounded-lg bg-background border border-border p-4 space-y-3">
            <div>
              <p className="font-semibold text-foreground">Boost电感计算</p>
              <p className="font-mono text-sm mt-1">
                L = (Vin · D) / (ΔI<sub>L</sub> · f<sub>sw</sub>)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                其中 D = 1 - Vin/Vout 为占空比，ΔIL 为电感电流纹波峰峰值
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">电感电流纹波</p>
              <p className="font-mono text-sm mt-1">
                ΔI<sub>L</sub> = (Vin · D) / (L · f<sub>sw</sub>) = (Vout · D · (1-D)) / (L · f<sub>sw</sub>)
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">每相电感电流峰值</p>
              <p className="font-mono text-sm mt-1">
                I<sub>L,peak</sub> = I<sub>in,avg</sub>/N + ΔI<sub>L</sub>/2
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                I<sub>in,avg</sub> = Pout / (η · Vin) 为输入平均电流
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">输出电容</p>
              <p className="font-mono text-sm mt-1">
                C<sub>out</sub> = I<sub>out</sub> / (2π · f<sub>line</sub> · ΔV<sub>out</sub>)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                f<sub>line</sub> 为电网频率（50/60Hz），ΔVout 为允许的输出电压纹波
              </p>
            </div>
            <div>
              <p className="font-semibold text-foreground">输入电流THD估算</p>
              <p className="font-mono text-sm mt-1">
                THD ≈ ΔI<sub>L,rms</sub> / I<sub>in,rms</sub> × 100%
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                电感纹波电流有效值与输入电流有效值之比
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Efficiency */}
      <CollapsibleSection title="5. 效率分析">
        <div className="space-y-4 text-muted-foreground leading-relaxed">
          <p>交错并联PFC的效率主要受以下损耗影响：</p>
          <ul className="space-y-2 ml-4">
            <li><strong className="text-foreground">导通损耗</strong>：P<sub>cond</sub> = I<sub>rms</sub>² · R<sub>ds(on)</sub> · D（MOSFET）或 I<sub>avg</sub> · V<sub>F</sub>（二极管）</li>
            <li><strong className="text-foreground">开关损耗</strong>：P<sub>sw</sub> = 0.5 · Vin · I<sub>L</sub> · (t<sub>r</sub> + t<sub>f</sub>) · f<sub>sw</sub></li>
            <li><strong className="text-foreground">电感损耗</strong>：铜损 + 铁损（磁芯损耗按Steinmetz方程估算）</li>
            <li><strong className="text-foreground">电容损耗</strong>：ESR 引起的纹波电流损耗</li>
          </ul>
          <div className="rounded-lg bg-background border border-border p-4">
            <p className="font-semibold text-foreground">总效率</p>
            <p className="font-mono text-sm mt-1">
              η = P<sub>out</sub> / (P<sub>out</sub> + P<sub>loss,total</sub>) × 100%
            </p>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}
