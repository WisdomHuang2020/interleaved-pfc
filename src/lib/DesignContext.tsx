import { ReactNode, createContext, useContext, useState } from 'react'
import type { DesignOutput } from './pfcCalc'

export interface PFCDesignSpec {
  vinMin: number
  vinMax: number
  vout: number
  pout: number
  fsw: number
  phases: number
  efficiency: number
}

// 结果形状的唯一来源是计算库，这里只做别名，避免两处独立声明再次漂移。
export type PFCDesignResults = DesignOutput

interface DesignContextType {
  spec: PFCDesignSpec
  setSpec: (spec: PFCDesignSpec) => void
  results: PFCDesignResults | null
  setResults: (results: PFCDesignResults | null) => void
}

const defaultSpec: PFCDesignSpec = {
  vinMin: 85,
  vinMax: 265,
  vout: 400,
  pout: 3000,
  fsw: 100000,
  phases: 2,
  efficiency: 0.95,
}

const DesignContext = createContext<DesignContextType>({
  spec: defaultSpec,
  setSpec: () => {},
  results: null,
  setResults: () => {},
})

export function DesignProvider({ children }: { children: ReactNode }) {
  const [spec, setSpec] = useState<PFCDesignSpec>(defaultSpec)
  const [results, setResults] = useState<PFCDesignResults | null>(null)

  return (
    <DesignContext.Provider value={{ spec, setSpec, results, setResults }}>
      {children}
    </DesignContext.Provider>
  )
}

export function useDesign() {
  return useContext(DesignContext)
}
