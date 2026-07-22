import { useEffect, useRef } from 'react'
import katex from 'katex'

interface InlineMathProps {
  latex: string
  className?: string
}

/** 内联 KaTeX 公式渲染器：用于段落、表格、列表中的小公式 */
export default function InlineMath({ latex, className = '' }: InlineMathProps) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, {
          throwOnError: false,
          displayMode: false,
        })
      } catch {
        ref.current.textContent = latex
      }
    }
  }, [latex])

  return <span ref={ref} className={className} />
}
