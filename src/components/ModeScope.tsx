import { Link } from 'react-router-dom'
import { Info } from 'lucide-react'

/**
 * 公式适用范围标注。
 *
 * 站内「原理」「推导」「曲线」三页基于 **CCM 定频**模型（开关频率是输入，电感量由
 * 纹波目标反解）；「模式」页是 **CRM / BCM 临界导通变频**模型（电感量是输入，
 * 开关频率随工频相位变频）。两套公式不可互套，因此把适用边界直接标在公式旁边，
 * 而不是指望读者自己回忆。
 *
 * 注意：本组件刻意不引入 InlineMath —— Curves 页原本不依赖 katex，
 * 在这里引入会把 262KB 的 KaTeX chunk 拖进 Curves 的懒加载包。
 */

export function ScopeBadge({ scope }: { scope: 'ccm' | 'general' }) {
  return scope === 'ccm' ? (
    <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded bg-amber-400/15 px-1.5 py-0.5 align-middle text-[11px] font-medium text-amber-400">
      仅 CCM 定频
    </span>
  ) : (
    <span className="ml-2 inline-flex translate-y-[-1px] items-center rounded bg-emerald-400/15 px-1.5 py-0.5 align-middle text-[11px] font-medium text-emerald-400">
      各模式通用
    </span>
  )
}

/** 首屏模式声明块：三页顶部共用，指向「模式」页。 */
export function CCMModeNotice({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-4 text-sm leading-relaxed text-muted-foreground">
      <p className="mb-2 flex items-center gap-2 font-medium text-foreground">
        <Info className="h-4 w-4 text-amber-400" />
        本页公式的适用范围
      </p>
      <p>
        本页{what}建立在 <strong className="text-foreground">CCM 定频</strong> 模型上：
        开关频率是输入，电感量由电流纹波目标反解。临界导通{' '}
        <strong className="text-foreground">CRM / BCM</strong> 是另一套模型——
        导通时间恒定、开关频率随工频相位变频，两套公式不可互套。
      </p>
      <p className="mt-2">
        <Link to="/crm" className="text-primary-light underline underline-offset-4 hover:text-primary">
          → 查看 CRM / BCM 临界导通模式的原理与计算
        </Link>
      </p>
    </div>
  )
}
