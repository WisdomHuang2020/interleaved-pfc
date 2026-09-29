/**
 * 交错并联 PFC 品牌标记 —— 与本站 public/favicon.svg 完全同源。
 *
 * 造型：两条相位错开的电感电流波（本站首页主图标 Waves 的加粗版）。
 * 语义：interleaved —— 两路电流纹波相互抵消，与主入口站 sites.json 的 icon=waves 一致。
 *
 * ⚠️ 与 public/favicon.svg 使用同一套 path 数据：改一处必须同步另一处。
 * 主形用站群统一 teal #14b8a6；amber 点落在两波之间的过零处，为站群固定标记。
 */
export default function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#0a0a0a" />
      <path
        d="M4 12.5 C 6 10, 8 10, 10 12.5 S 14 15, 16 12.5 S 20 10, 22 12.5 S 26 15, 28 12.5"
        fill="none"
        stroke="#14b8a6"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <path
        d="M4 20.5 C 6 18, 8 18, 10 20.5 S 14 23, 16 20.5 S 20 18, 22 20.5 S 26 23, 28 20.5"
        fill="none"
        stroke="#14b8a6"
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <circle cx="16" cy="16.5" r="1.7" fill="#f59e0b" />
    </svg>
  )
}
