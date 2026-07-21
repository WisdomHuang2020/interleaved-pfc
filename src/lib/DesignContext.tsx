import { ReactNode, createContext, useContext, useState } from 'react'

export interface PFCDesignSpec {
  vinMin: number
  vinMax: number
  vout: number
  pout: number
  fsw: number
  phases: number
  efficiency: number
}

export interface PFCDesignResults {
  iinRms: number
  iinPeak: number
  lBoost: number
  lRipple: number
  lRipplePercent: number
  dutyMin: number
  dutyMax: number
  iLrms: number
  iLpeak: number
  thdEstimate: number
  coutMin: number
  conductionLoss: number
  switchingLoss: number
  totalLoss: number
}

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
