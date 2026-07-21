import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

/**
 * 交错并联 PFC 实时波形动画
 * Canvas 示波器：PWM 驱动信号 + 各相电感电流 + 总输入电流（纹波抵消）
 */

const PHASE_COLORS = ['#60a5fa', '#4ade80', '#facc15'] // blue / green / yellow
const TOTAL_COLOR = '#22d3ee' // cyan
const GRID_COLOR = '#262626'
const TEXT_COLOR = '#a3a3a3'

const SAMPLES = 512 // 每周期采样点数
const PERIODS = 2 // 显示窗口覆盖的开关周期数

interface WaveData {
  /** phases[k][i] — 第 k 相在第 i 个采样点的电流（标幺值） */
  phases: number[][]
  /** total[i] — 总输入电流 */
  total: number[]
  maxPhase: number
  maxTotal: number
  ppPhase: number
  ppTotal: number
}

const fract = (x: number) => x - Math.floor(x)

/** 生成一个周期的标幺化波形（含相位偏移 offset，用于滚动扫描） */
function sampleWaves(duty: number, nPhases: number, offset: number): WaveData {
  const n = SAMPLES
  const phases: number[][] = Array.from({ length: nPhases }, () => new Array<number>(n).fill(0))
  const total = new Array<number>(n).fill(0)

  for (let i = 0; i < n; i++) {
    const t = i / n // 0..1 一个开关周期
    for (let k = 0; k < nPhases; k++) {
      const u = fract(t + offset - k / nPhases)
      // CCM Boost 分段线性纹波：上升斜率 (1-D)，下降斜率 -D，峰峰值 ∝ D(1-D)
      const ripple = u < duty ? u * (1 - duty) : duty * (1 - duty) - (u - duty) * duty
      const iL = 1 / nPhases + ripple
      phases[k][i] = iL
      total[i] += iL
    }
  }

  const ppOf = (arr: number[]) => Math.max(...arr) - Math.min(...arr)
  return {
    phases,
    total,
    maxPhase: Math.max(...phases.flat()),
    maxTotal: Math.max(...total),
    ppPhase: ppOf(phases[0]),
    ppTotal: ppOf(total),
  }
}

export default function InterleaveAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const visibleRef = useRef(true)

  const prefersReduced = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  )
  const [playing, setPlaying] = useState(!prefersReduced)
  const [duty, setDuty] = useState(0.5)
  const [nPhases, setNPhases] = useState(2)

  // 静态测量（不随扫描偏移变化）—— 纹波数值与刻度
  const staticData = useMemo(() => sampleWaves(duty, nPhases, 0), [duty, nPhases])
  const cancelRatio = staticData.ppPhase > 1e-9 ? 1 - staticData.ppTotal / staticData.ppPhase : 0
  const isSweetSpot = nPhases === 2 && Math.abs(duty - 0.5) < 0.02

  // 仅进入视口时才运行动画
  useEffect(() => {
    const el = wrapRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const obs = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? true
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = 920
    const H = 470
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr

    // 布局：三条通道
    const gateLane = { y: 30, h: 26, gap: 10 } // PWM 通道（每相一行）
    const phaseLane = { y: gateLane.y + nPhases * (gateLane.h + gateLane.gap) + 30, h: 150 }
    const totalLane = { y: phaseLane.y + phaseLane.h + 46, h: 110 }
    const padL = 56
    const padR = 16
    const plotW = W - padL - padR

    let rafId = 0
    let sweep = 0
    let last = performance.now()

    const drawGrid = (lane: { y: number; h: number }, rows: number) => {
      ctx.strokeStyle = GRID_COLOR
      ctx.lineWidth = 1
      for (let r = 0; r <= rows; r++) {
        const y = lane.y + (lane.h * r) / rows
        ctx.beginPath()
        ctx.moveTo(padL, y)
        ctx.lineTo(padL + plotW, y)
        ctx.stroke()
      }
      for (let c = 0; c <= PERIODS * 8; c++) {
        const x = padL + (plotW * c) / (PERIODS * 8)
        ctx.beginPath()
        ctx.moveTo(x, lane.y)
        ctx.lineTo(x, lane.y + lane.h)
        ctx.stroke()
      }
    }

    const drawLabel = (text: string, x: number, y: number, color = TEXT_COLOR) => {
      ctx.fillStyle = color
      ctx.font = '12px "JetBrains Mono", monospace'
      ctx.fillText(text, x, y)
    }

    const frame = (now: number) => {
      rafId = requestAnimationFrame(frame)
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      if (!visibleRef.current) return

      // 扫描速度：约 4 秒滚过一个开关周期
      sweep = fract(sweep + dt / 4)
      const data = sampleWaves(duty, nPhases, sweep)

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      // ---------- 通道 1：PWM 驱动信号 ----------
      drawLabel('PWM', 8, gateLane.y - 10)
      for (let k = 0; k < nPhases; k++) {
        const rowY = gateLane.y + k * (gateLane.h + gateLane.gap)
        const color = PHASE_COLORS[k % PHASE_COLORS.length]
        drawLabel(`G${k + 1}`, 30, rowY + gateLane.h - 8, color)
        ctx.strokeStyle = color
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let i = 0; i <= plotW; i += 2) {
          const t = (i / plotW) * PERIODS
          const u = fract(t + sweep - k / nPhases)
          const y = u < duty ? rowY : rowY + gateLane.h - 4
          if (i === 0) ctx.moveTo(padL + i, y)
          else ctx.lineTo(padL + i, y)
        }
        ctx.stroke()
      }

      // ---------- 通道 2：各相电感电流 ----------
      drawGrid(phaseLane, 4)
      drawLabel('IL (每相)', 8, phaseLane.y + 12)
      const yPhase = (v: number) =>
        phaseLane.y + phaseLane.h - (v / (staticData.maxPhase * 1.15)) * phaseLane.h
      for (let k = 0; k < nPhases; k++) {
        const color = PHASE_COLORS[k % PHASE_COLORS.length]
        drawLabel(`IL${k + 1}`, 30, phaseLane.y + 26 + k * 14, color)
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i < SAMPLES; i++) {
          const x = padL + (i / (SAMPLES - 1)) * plotW
          const y = yPhase(data.phases[k][i])
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.stroke()
      }

      // ---------- 通道 3：总输入电流 ----------
      drawGrid(totalLane, 3)
      drawLabel('Iin 总', 8, totalLane.y + 12)
      const yTotal = (v: number) =>
        totalLane.y + totalLane.h - (v / (staticData.maxTotal * 1.15)) * totalLane.h
      // 平均值参考线
      ctx.strokeStyle = GRID_COLOR
      ctx.setLineDash([6, 4])
      ctx.beginPath()
      ctx.moveTo(padL, yTotal(1))
      ctx.lineTo(padL + plotW, yTotal(1))
      ctx.stroke()
      ctx.setLineDash([])
      ctx.strokeStyle = TOTAL_COLOR
      ctx.lineWidth = 2.5
      ctx.beginPath()
      for (let i = 0; i < SAMPLES; i++) {
        const x = padL + (i / (SAMPLES - 1)) * plotW
        const y = yTotal(data.total[i])
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // 周期刻度
      drawLabel('0', padL - 4, H - 8)
      drawLabel('Ts', padL + plotW / 2 - 8, H - 8)
      drawLabel('2Ts', padL + plotW - 20, H - 8)
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [duty, nPhases, staticData])

  return (
    <div ref={wrapRef} className="space-y-4">
      <div className="rounded-lg bg-background border border-border overflow-hidden">
        <canvas ref={canvasRef} className="w-full block" style={{ aspectRatio: '920 / 470' }} />
      </div>

      {/* 控制区 */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label={playing ? '暂停动画' : '播放动画'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          {playing ? '暂停' : '播放'}
        </button>

        <label className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="whitespace-nowrap">
            占空比 D = <span className="text-foreground font-mono">{duty.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.05}
            max={0.95}
            step={0.01}
            value={duty}
            onChange={(e) => setDuty(Number(e.target.value))}
            className="w-40 accent-primary"
            aria-label="占空比"
          />
        </label>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">相数 N</span>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setNPhases(n)}
              className={`rounded-md px-3 py-1 font-mono transition-colors ${
                nPhases === n
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* 读数区 */}
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-muted-foreground">每相纹波 ΔIL(pp)</div>
          <div className="mt-1 font-mono text-lg text-blue-400">
            {(staticData.ppPhase * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-muted-foreground">总输入纹波 ΔIin(pp)</div>
          <div className="mt-1 font-mono text-lg text-cyan-400">
            {(staticData.ppTotal * 100).toFixed(1)}%
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-muted-foreground">纹波抵消率</div>
          <div className="mt-1 font-mono text-lg text-emerald-400">
            {(cancelRatio * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {isSweetSpot && (
        <p className="text-sm text-emerald-400">
          ✓ D = 0.5、N = 2：完美抵消点 —— 两相纹波相位相反，总输入电流纹波趋近于零。
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        标幺化 CCM 波形：每相平均电流取 1/N，纹波峰峰值 ∝ D(1−D)。拖动占空比可观察抵消点（D =
        1/2、1/3…）附近总纹波急剧减小的现象。
      </p>
    </div>
  )
}
