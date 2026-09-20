import { useState } from 'react'
import type { ReactNode } from 'react'
import { DesignContext, defaultSpec } from './useDesign'
import type { PFCDesignResults, PFCDesignSpec } from './useDesign'

// 本文件只导出组件（Provider），非组件的 context/hook 放在 useDesign.ts。
// 这样 React Fast Refresh 才能只替换本模块而不丢状态：
// 同一文件同时导出组件与普通函数会触发 react-refresh/only-export-components。
export function DesignProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<PFCDesignSpec>(defaultSpec)
  const [results, setResults] = useState<PFCDesignResults | null>(null)

  return (
    <DesignContext.Provider value={{ spec, setSpec, results, setResults }}>
      {children}
    </DesignContext.Provider>
  )
}
