import { PenTool } from 'lucide-react'
import CollapsibleSection from '../components/CollapsibleSection'
import MathBlock from '../components/MathBlock'
import InlineMath from '../components/InlineMath'

export default function Derivations() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PenTool className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">公式推导</h1>
      </div>

      <p className="text-muted-foreground leading-relaxed">
        本页给出交错并联 Boost PFC 关键设计公式的完整推导过程，
        从伏秒平衡出发，逐步得到电感、电容、纹波抵消系数与损耗估算的设计式。
      </p>

      {/* 1. Boost 基本关系 */}
      <CollapsibleSection title="1. Boost 基本关系与占空比" defaultOpen={true}>
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>稳态下电感在一个开关周期内伏秒平衡（平均电压为零）：</p>
          <MathBlock stepNumber={1} label="伏秒平衡" latex="v_{in} \cdot D T_s + (v_{in} - V_{out})(1-D) T_s = 0" />
          <p>消去 Ts 并整理：</p>
          <MathBlock stepNumber={2} label="Boost 增益" latex="V_{out} = \frac{v_{in}}{1-D} \quad\Longrightarrow\quad D = 1 - \frac{v_{in}}{V_{out}}" />
          <p>
            PFC 中 <InlineMath latex="v_{in}(t) = V_m |\sin\omega t|" /> 为整流后的正弦全波，因此占空比随工频相位实时变化：
          </p>
          <MathBlock stepNumber={3} label="时变占空比" latex="D(\theta) = 1 - \frac{V_m |\sin\theta|}{V_{out}}, \qquad \theta = \omega t" />
          <p className="text-sm">
          过零点 <InlineMath latex="D \to 1" />，电压峰值处 D 最小。220Vac/400V 时峰值占空比约 0.22。
          </p>
        </div>
      </CollapsibleSection>

      {/* 2. 电感电流纹波 */}
      <CollapsibleSection title="2. 电感电流纹波推导" defaultOpen={true}>
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>开关导通期间（DTs），电感电压为 vin，电流线性上升，峰峰纹波：</p>
          <MathBlock stepNumber={1} label="纹波定义" latex="\Delta I_L = \frac{v_{in} \cdot D T_s}{L} = \frac{v_{in} \cdot D}{L \cdot f_{sw}}" />
          <p>
            代入 <InlineMath latex="v_{in} = V_{out}(1-D)" /> 消去 vin：
          </p>
          <MathBlock stepNumber={2} label="纹波-占空比关系" latex="\Delta I_L(D) = \frac{V_{out}}{L \cdot f_{sw}} \cdot D(1-D)" />
          <p>
            对 D 求导：<InlineMath latex="\dfrac{d\Delta I_L}{dD} = \dfrac{V_{out}}{L f_{sw}}(1-2D) = 0" />，
            得极值点 D = 0.5：
          </p>
          <MathBlock stepNumber={3} label="最大纹波点" latex="\Delta I_{L,max} = \frac{V_{out}}{4 L f_{sw}} \quad (D = 0.5)" />
          <p className="text-sm">
            单相 PFC 的电感设计通常按最恶劣工况（最低输入电压、满载）限制纹波率 20%~40%。
          </p>
        </div>
      </CollapsibleSection>

      {/* 3. 纹波抵消系数 */}
      <CollapsibleSection title="3. N 相纹波抵消系数 R(D, N)" defaultOpen={true}>
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>
            以 N = 2 为例。两相电流纹波幅值相同、相位错开 Ts/2。
            考察总电流 <InlineMath latex="i_{in} = i_{L1} + i_{L2}" /> 的斜率：
          </p>
          <MathBlock stepNumber={1} label="D < 0.5" latex="\text{模态序列 } A \to D \to B \to D:\quad \frac{di_{in}}{dt} = \pm\frac{V_{out}}{L}(1-2D)" />
          <MathBlock stepNumber={2} label="D > 0.5" latex="\text{模态序列 } A \to C \to B \to C:\quad \frac{di_{in}}{dt} = \pm\frac{V_{out}}{L}(2D-1)" />
          <p>两种情形下总纹波峰峰值均可写为：</p>
          <MathBlock stepNumber={3} label="2相抵消系数" latex="\Delta I_{in} = \Delta I_L \cdot |2D - 1| \quad\Longrightarrow\quad R(D, 2) = |2D-1|" />
          <p>
            D = 0.5 时 R = 0，纹波完全抵消；D → 0 或 1 时 R → 1，退化为单相纹波。
            推广到 N 相：
          </p>
          <MathBlock stepNumber={4} label="N相推广" latex="R(D, N) = \left| N D - k \right|, \quad \frac{k-1}{N} \le D \le \frac{k}{N}, \quad k = 1, 2, \dots, N" />
          <p>
            抵消零点出现在 <InlineMath latex="D = k/N" />。例如 3 相在 D = 1/3、2/3 处纹波为零，
            这也是宽输入范围 PFC 选用 3 相的动机之一 —— 更多抵消点覆盖更广的占空比区间。
          </p>
          <figure className="rounded-lg bg-background border border-border p-4 mt-2">
            <img
              src="./assets/images/pfc_ripple_vs_duty.png"
              alt="总输入电流纹波随占空比变化曲线"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              不同相数下总输入电流纹波随占空比的变化：抵消点处纹波为零
            </figcaption>
          </figure>
        </div>
      </CollapsibleSection>

      {/* 4. 电感设计 */}
      <CollapsibleSection title="4. Boost 电感设计">
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>
            给定每相允许纹波率 <InlineMath latex="r = \Delta I_L / I_{L,pk}" />（常取 0.2~0.4）：
          </p>
          <MathBlock stepNumber={1} label="每相峰值电流" latex="I_{L,pk} = \frac{\sqrt{2}\, P_{out}}{N \cdot \eta \cdot V_{in,min}}" />
          <MathBlock stepNumber={2} label="允许纹波" latex="\Delta I_L = r \cdot I_{L,pk}" />
          <p>
            最低输入电压峰值处 <InlineMath latex="D = 1 - \sqrt{2}V_{in,min}/V_{out}" />，
            由纹波定义式反解电感：
          </p>
          <MathBlock stepNumber={3} label="电感设计式" latex="L \ge \frac{\sqrt{2}\, V_{in,min} \cdot D}{f_{sw} \cdot \Delta I_L} = \frac{\sqrt{2}\, V_{in,min} \left(1 - \dfrac{\sqrt{2} V_{in,min}}{V_{out}}\right)}{f_{sw} \cdot r \cdot I_{L,pk}}" />
          <p className="text-sm">
            工程上还需校验磁芯饱和：峰值电流 <InlineMath latex="I_{L,pk} + \Delta I_L/2" /> 应低于磁芯饱和电流并留 20% 裕量。
          </p>
        </div>
      </CollapsibleSection>

      {/* 5. 输出电容 */}
      <CollapsibleSection title="5. 输出电容设计（能量法）">
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>PFC 输入瞬时功率以 2 倍工频脉动：</p>
          <MathBlock stepNumber={1} label="脉动功率" latex="p_{in}(t) = V_m I_m \sin^2\omega t = P_{in}\left(1 - \cos 2\omega t\right)" />
          <p>输出功率近似恒定，功率差由输出电容吸收。电容储能变化量（峰峰）：</p>
          <MathBlock stepNumber={2} label="储能脉动" latex="\Delta E_C = \int_0^{T_{line}/2} P_{out} \cos 2\omega t \, dt = \frac{P_{out}}{\omega} = \frac{P_{out}}{2\pi f_{line}}" />
          <p>
            由 <InlineMath latex="\Delta E_C \approx C_{out} V_{out} \Delta V_{out}" /> 解得：
          </p>
          <MathBlock stepNumber={3} label="电容设计式" latex="C_{out} \ge \frac{P_{out}}{2\pi f_{line} \cdot V_{out} \cdot \Delta V_{out}}" />
          <p className="text-sm">
            若还有保持时间（hold-up time）要求，则按{' '}
            <InlineMath latex="C_{out} \ge \dfrac{2 P_{out} t_{hold}}{V_{out}^2 - V_{min}^2}" />{' '}
            重新核算并取两者较大值。
          </p>
          <figure className="rounded-lg bg-background border border-border p-4 mt-2">
            <img
              src="./assets/images/pfc_output_ripple.png"
              alt="输出电压纹波波形"
              className="mx-auto rounded img-invert-dark"
              loading="lazy"
            />
            <figcaption className="mt-2 text-center text-xs">
              输出电压纹波对比（400V 输出示例）：单相 vs 交错并联（N=4），2 倍工频脉动由输出电容吸收
            </figcaption>
          </figure>
        </div>
      </CollapsibleSection>

      {/* 6. THD */}
      <CollapsibleSection title="6. 输入电流 THD 估算">
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>电流控制理想时，输入电流畸变主要来自开关频率纹波。三角纹波电流有效值：</p>
          <MathBlock stepNumber={1} label="纹波有效值" latex="\Delta I_{L,rms} = \frac{\Delta I_L}{2\sqrt{3}}" />
          <p>以基波电流有效值为基准估算 THD：</p>
          <MathBlock stepNumber={2} label="THD 估算" latex="THD \approx \frac{\Delta I_{in,rms}}{I_{in,rms}} = \frac{R(D,N) \cdot \Delta I_L}{2\sqrt{3} \cdot I_{in,rms}} \times 100\%" />
          <p className="text-sm">
            交错并联通过 R(D, N) 直接降低 THD：2 相在 D = 0.5 附近 THD 改善显著。
            实际 THD 还受过零点畸变、电流环带宽、采样噪声影响，工程上以实测为准。
          </p>
        </div>
      </CollapsibleSection>

      {/* 7. 损耗与效率 */}
      <CollapsibleSection title="7. 损耗分解与效率估算">
        <div className="space-y-2 text-muted-foreground leading-relaxed">
          <p>每相 MOSFET 导通损耗（RDS(on) 随温度升高，按 100°C 估算）：</p>
          <MathBlock stepNumber={1} label="开关导通损耗" latex="P_{cond,S} = I_{S,rms}^2 \cdot R_{ds(on)}, \qquad I_{S,rms} \approx I_{L,avg}\sqrt{D}" />
          <MathBlock stepNumber={2} label="开关损耗" latex="P_{sw} = \frac{1}{2} V_{out} I_{L} (t_r + t_f) f_{sw} + E_{oss} f_{sw}" />
          <MathBlock stepNumber={3} label="二极管损耗" latex="P_{cond,D} = I_{D,avg} \cdot V_F, \qquad I_{D,avg} \approx I_{L,avg}(1-D)" />
          <MathBlock stepNumber={4} label="电感损耗" latex="P_L = P_{cu} + P_{core} = I_{L,rms}^2 R_{dc} + k \cdot f_{sw}^{\alpha} \cdot \Delta B^{\beta} \cdot V_e" />
          <p>总效率：</p>
          <MathBlock stepNumber={5} label="效率" latex="\eta = \frac{P_{out}}{P_{out} + N\left(P_{cond,S} + P_{sw} + P_{cond,D} + P_L\right)} \times 100\%" />
          <p className="text-sm">
            交错并联虽然器件数量加倍，但每相电流减半，导通损耗按{' '}
            <InlineMath latex="I^2 R" /> 降至约 1/2N 总和，且热分布均匀，
            大功率下效率与散热均优于单相方案。
          </p>
        </div>
      </CollapsibleSection>
    </div>
  )
}
