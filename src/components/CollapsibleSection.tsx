import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface SectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export default function CollapsibleSection({ title, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        {open ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {open && <div className="px-6 pb-6 border-t border-border">{children}</div>}
    </div>
  )
}
