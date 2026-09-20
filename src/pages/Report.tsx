import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Download, Copy, Printer, Check, AlertTriangle } from 'lucide-react'
import { useDesign } from '../lib/useDesign'

export default function Report() {
  const { spec, results } = useDesign()
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const dateStr = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const hasData = results !== null

  const fmt = (v: number, digits = 2) => v.toFixed(digits)

  const generateMarkdown = (): string => {
    if (!results) return ''
    return `# 交错并联 Boost PFC 设计报告

**生成日期**：${dateStr}

## 1. 设计规格

| 参数 | 数值 |
|---|---|
| 输入电压范围 | ${spec.vinMin} ~ ${spec.vinMax} Vac |
| 输出电压 | ${spec.vout} Vdc |
| 输出功率 | ${spec.pout} W |
| 开关频率 | ${fmt(spec.fsw / 1000, 0)} kHz |
| 交错相数 | ${spec.phases} 相 |
| 目标效率 | ${fmt(spec.efficiency * 100, 1)}% |

## 2. 计算结果

### 2.1 电流应力

| 参数 | 数值 |
|---|---|
| 最大输入 RMS 电流 | ${fmt(results.iinRms)} A |
| 最大输入峰值电流 | ${fmt(results.iinPeak)} A |
| 每相 RMS 电流 | ${fmt(results.iLrms)} A |
| 每相峰值电流 | ${fmt(results.iLpeak)} A |

### 2.2 磁性元件

| 参数 | 数值 |
|---|---|
| 每相 Boost 电感 | ${fmt(results.lBoost * 1e6, 1)} μH |
| 电感电流纹波（峰峰） | ${fmt(results.lRipple)} A |
| 纹波率 | ${fmt(results.lRipplePercent, 1)}% |

### 2.3 占空比范围

| 参数 | 数值 |
|---|---|
| 最小占空比（高压输入） | ${fmt(results.dutyMin * 100, 1)}% |
| 最大占空比（低压输入） | ${fmt(results.dutyMax * 100, 1)}% |

### 2.4 输出电容与 THD

| 参数 | 数值 |
|---|---|
| 最小输出电容（2% 纹波） | ${fmt(results.coutMin * 1e6, 0)} μF |
| THD 估算 | ${fmt(results.thdEstimate, 1)}% |

### 2.5 损耗估算

| 参数 | 数值 |
|---|---|
| 导通损耗 | ${fmt(results.conductionLoss, 1)} W |
| 开关损耗 | ${fmt(results.switchingLoss, 1)} W |
| 二极管损耗 | ${fmt(results.diodeLoss, 1)} W |
| 电感铜损 | ${fmt(results.inductorLoss, 1)} W |
| 总损耗 | ${fmt(results.totalLoss, 1)} W |
| 估算效率 | ${fmt(results.estimatedEfficiency * 100, 1)}% |

## 3. 备注

${notes || '（无）'}

---
*由交错并联 PFC 设计工具生成 — https://wisdomhuang2020.github.io/interleaved-pfc/*
`
  }

  const downloadMarkdown = () => {
    const md = generateMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `PFC设计报告_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copyToClipboard = async () => {
    const md = generateMarkdown()
    try {
      await navigator.clipboard.writeText(md)
    } catch {
      const textarea = document.createElement('textarea')
      textarea.value = md
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const printReport = () => window.print()

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">报告输出</h1>
        </div>
        <div className="rounded-xl border border-border bg-card p-12 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
          <p className="text-muted-foreground">还没有设计数据。请先在设计工具中完成参数计算。</p>
          <Link
            to="/designer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            前往设计工具
          </Link>
        </div>
      </div>
    )
  }

  const r = results

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">报告输出</h1>
      </div>

      {/* 操作栏（打印时隐藏） */}
      <div className="no-print flex flex-wrap gap-3">
        <button
          onClick={downloadMarkdown}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" /> 下载 Markdown
        </button>
        <button
          onClick={copyToClipboard}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          {copied ? '已复制' : '复制 Markdown'}
        </button>
        <button
          onClick={printReport}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <Printer className="h-4 w-4" /> 打印 / 导出 PDF
        </button>
      </div>

      {/* 报告正文 */}
      <div ref={reportRef} className="card-surface p-6 md:p-10 space-y-8">
        <header className="border-b border-border pb-6">
          <h2 className="text-2xl font-bold text-text-primary">交错并联 Boost PFC 设计报告</h2>
          <p className="mt-2 text-sm text-text-secondary">生成日期：{dateStr}</p>
        </header>

        <section>
          <h3 className="text-lg font-semibold text-text-primary mb-3">1. 设计规格</h3>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ['输入电压范围', `${spec.vinMin} ~ ${spec.vinMax} Vac`],
                ['输出电压', `${spec.vout} Vdc`],
                ['输出功率', `${spec.pout} W`],
                ['开关频率', `${fmt(spec.fsw / 1000, 0)} kHz`],
                ['交错相数', `${spec.phases} 相`],
                ['目标效率', `${fmt(spec.efficiency * 100, 1)}%`],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-border">
                  <td className="py-2 text-text-secondary w-48">{k}</td>
                  <td className="py-2 font-mono text-text-primary">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-text-primary mb-3">2. 计算结果</h3>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 text-text-secondary font-medium">分组</th>
                <th className="py-2 text-text-secondary font-medium">参数</th>
                <th className="py-2 text-text-secondary font-medium">数值</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['电流应力', '最大输入 RMS 电流', `${fmt(r.iinRms)} A`],
                ['电流应力', '最大输入峰值电流', `${fmt(r.iinPeak)} A`],
                ['电流应力', '每相 RMS 电流', `${fmt(r.iLrms)} A`],
                ['电流应力', '每相峰值电流', `${fmt(r.iLpeak)} A`],
                ['磁性元件', '每相 Boost 电感', `${fmt(r.lBoost * 1e6, 1)} μH`],
                ['磁性元件', '电感电流纹波（峰峰）', `${fmt(r.lRipple)} A`],
                ['磁性元件', '纹波率', `${fmt(r.lRipplePercent, 1)}%`],
                ['占空比', '最小占空比（高压输入）', `${fmt(r.dutyMin * 100, 1)}%`],
                ['占空比', '最大占空比（低压输入）', `${fmt(r.dutyMax * 100, 1)}%`],
                ['输出', '最小输出电容（2% 纹波）', `${fmt(r.coutMin * 1e6, 0)} μF`],
                ['输出', 'THD 估算', `${fmt(r.thdEstimate, 1)}%`],
                ['损耗', '导通损耗', `${fmt(r.conductionLoss, 1)} W`],
                ['损耗', '开关损耗', `${fmt(r.switchingLoss, 1)} W`],
                ['损耗', '二极管损耗', `${fmt(r.diodeLoss, 1)} W`],
                ['损耗', '电感铜损', `${fmt(r.inductorLoss, 1)} W`],
                ['损耗', '总损耗', `${fmt(r.totalLoss, 1)} W`],
                ['损耗', '估算效率', `${fmt(r.estimatedEfficiency * 100, 1)}%`],
              ].map(([g, k, v], i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-2 text-text-secondary">{g}</td>
                  <td className="py-2 text-text-secondary">{k}</td>
                  <td className="py-2 font-mono text-text-primary">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h3 className="text-lg font-semibold text-text-primary mb-3">3. 设计校验要点</h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>• 电感磁芯饱和电流应大于 {(r.iLpeak + r.lRipple / 2).toFixed(2)} A（每相峰值 + 半纹波），建议留 20% 裕量</li>
            <li>• MOSFET 电压应力 {spec.vout} V，建议选 650V 器件；电流应力按每相 {fmt(r.iLrms)} A RMS 选型</li>
            <li>• 输出电容除容值外需校验纹波电流耐受与 ESR，建议多只并联</li>
            <li>• THD 估算值 {fmt(r.thdEstimate, 1)}%（目标 &lt; 5%），实际以样机实测为准</li>
          </ul>
        </section>

        <section className="no-print">
          <h3 className="text-lg font-semibold text-text-primary mb-3">4. 备注</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="可在此添加设计备注（将包含在 Markdown 导出中）..."
            className="input-field w-full min-h-24 resize-y"
          />
        </section>
      </div>
    </div>
  )
}
