const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

async function api<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error: ${res.status}`)
  }
  return res.json()
}

export interface PFCDesignRecord {
  id: number
  name: string
  vin_min: number
  vin_max: number
  vout: number
  pout: number
  fsw: number
  n_phases: number
  ripple_ratio: number
  efficiency: number
  vout_ripple: number
  l_per_phase?: number
  delta_il?: number
  il_peak_phase?: number
  cout?: number
  thd_estimate?: number
  created_at: string
}

export interface PFCCalcInput {
  vin_min: number
  vout: number
  pout: number
  fsw: number
  n_phases: number
  ripple_ratio: number
  efficiency: number
}

export interface PFCCalcResult {
  duty_max: number
  iin_avg_max: number
  il_peak_total: number
  l_per_phase: number
  delta_il: number
  il_peak_phase: number
  il_rms_phase: number
  cout: number
  thd_estimate: number
}

export const pfcApi = {
  health: () => api<{ status: string }>('/health'),
  list: () => api<{ success: boolean; data: PFCDesignRecord[] }>('/designs'),
  get: (id: number) => api<{ success: boolean; data: PFCDesignRecord }>(`/designs/${id}`),
  create: (data: Omit<PFCDesignRecord, 'id' | 'created_at'>) =>
    api<{ success: boolean; id: number }>('/designs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<PFCDesignRecord>) =>
    api<{ success: boolean }>(`/designs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => api<{ success: boolean }>(`/designs/${id}`, { method: 'DELETE' }),
  calculate: (params: PFCCalcInput) =>
    api<{ success: boolean; data: PFCCalcResult }>('/calculate', { method: 'POST', body: JSON.stringify(params) }),
}
