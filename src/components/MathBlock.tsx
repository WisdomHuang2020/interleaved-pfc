import { useEffect, useRef } from 'react'
import katex from 'katex'

interface MathBlockProps {
  latex: string
  display?: boolean
  label?: string
  stepNumber?: number
}

/**
 * 块级 KaTeX 公式渲染器
 * 自动剥离 $$...$$、\[...\]、\(...\)、$...$ 等定界符，
 * 可直接传入从 Markdown 复制的原始字符串。
 */
function stripDelimiters(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('$$') && s.endsWith('$$')) s = s.slice(2, -2).trim()
  else if (s.startsWith('\\[') && s.endsWith('\\]')) s = s.slice(2, -2).trim()
  else if (s.startsWith('\\(') && s.endsWith('\\)')) s = s.slice(2, -2).trim()
  else if (s.startsWith('$') && s.endsWith('$') && !s.startsWith('$$')) s = s.slice(1, -1).trim()
  return s
}

export default function MathBlock({ latex, display = true, label, stepNumber }: MathBlockProps) {
  const ref = useRef<HTMLDivElement>(null)
  const cleanLatex = stripDelimiters(latex)

  useEffect(() => {
    if (ref.current) {
      katex.render(cleanLatex, ref.current, {
        throwOnError: false,
        displayMode: display,
      })
    }
  }, [cleanLatex, display])

  return (
    <div className="math-block my-4">
      {(label || stepNumber !== undefined) && (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          {stepNumber !== undefined && (
            <span className="rounded bg-primary/20 px-2 py-0.5 font-mono text-primary-light">
              Step {stepNumber}
            </span>
          )}
          {label && <span>{label}</span>}
        </div>
      )}
      <div ref={ref} />
    </div>
  )
}
