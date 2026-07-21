import { motion, useReducedMotion } from 'framer-motion'

/**
 * 2相交错并联 Boost PFC 拓扑动画图
 * - 线路渐次绘制（pathLength）
 * - 电流路径虚线流动（CSS 动画，见 index.css .flow-line）
 * - S1 / S2 交替导通高亮（180° 相位差）
 */

const WIRE = '#64748b'
const LABEL = '#a3a3a3'
const FLOW1 = '#60a5fa'
const FLOW2 = '#4ade80'
const ON = '#166534'
const OFF = '#334155'

/** 电感符号：4 个半圆串联 */
function inductorPath(x: number, y: number, r = 9) {
  let d = `M ${x} ${y}`
  for (let i = 0; i < 4; i++) {
    d += ` a ${r} ${r} 0 0 1 ${r * 2} 0`
  }
  return d
}

interface WireProps {
  d: string
  delay: number
  color?: string
  width?: number
}

function Wire({ d, delay, color = WIRE, width = 2 }: WireProps) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.8, delay, ease: 'easeInOut' }}
    />
  )
}

function Flow({ d, color, delay }: { d: string; color: string; delay: number }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeDasharray="8 6"
      strokeLinecap="round"
      className="flow-line"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.9 }}
      transition={{ duration: 0.4, delay }}
    />
  )
}

function Label({ x, y, text, color = LABEL }: { x: number; y: number; text: string; color?: string }) {
  return (
    <text x={x} y={y} fill={color} fontSize="13" fontFamily="'JetBrains Mono', monospace">
      {text}
    </text>
  )
}

export default function TopologyDiagram() {
  const reduceMotion = useReducedMotion()

  // 布局常量
  const y1 = 90 // 第1相支路高度
  const y2 = 200 // 第2相支路高度
  const yBot = 290 // 底部公共回线
  const xIn = 70 // 输入竖直母线
  const xL = 120 // 电感起点
  const xNode = 270 // 第1相开关节点（电感/开关/二极管交汇）
  const xNode2 = 225 // 第2相开关节点（与S1错开，避免S1回线穿过S2）
  const xDiode = 300 // 二极管起点
  const xOutJoin = 640 // 输出汇合竖线
  const xCap = 700 // 输出电容
  const xLoad = 780 // 负载

  return (
    <svg viewBox="0 0 860 330" className="w-full" role="img" aria-label="2相交错并联Boost PFC拓扑图">
      {/* ---------- 输入源 ---------- */}
      <motion.circle
        cx={xIn}
        cy={255}
        r={26}
        fill="none"
        stroke={WIRE}
        strokeWidth={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
          transition={{ delay: 0 }}
      />
      <Label x={xIn - 14} y={260} text="~" />
      <Label x={xIn - 30} y={315} text="Vac" />
      <Label x={14} y={330} text="(整流后)" />

      {/* ---------- 主干线路 ---------- */}
      {/* 输入源到顶部分岔 */}
      <Wire d={`M ${xIn} 229 L ${xIn} ${y1}`} delay={0.1} />
      <Wire d={`M ${xIn} ${y2} L ${xIn} 281`} delay={0.1} />
      {/* 底部公共回线 */}
      <Wire d={`M ${xIn} 281 L ${xIn} ${yBot} L ${xLoad} ${yBot}`} delay={0.2} />

      {/* ---------- 第 1 相 ---------- */}
      <Wire d={`M ${xIn} ${y1} L ${xL} ${y1}`} delay={0.25} />
      <Wire d={inductorPath(xL, y1)} delay={0.35} />
      <Wire d={`M ${xL + 72} ${y1} L ${xDiode} ${y1}`} delay={0.45} />
      {/* 二极管 D1 */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
      >
        <path d={`M ${xDiode} ${y1 - 10} L ${xDiode} ${y1 + 10} L ${xDiode + 20} ${y1} Z`} fill="none" stroke={WIRE} strokeWidth={2} />
        <line x1={xDiode + 20} y1={y1 - 10} x2={xDiode + 20} y2={y1 + 10} stroke={WIRE} strokeWidth={2} />
      </motion.g>
      <Wire d={`M ${xDiode + 20} ${y1} L ${xOutJoin} ${y1}`} delay={0.6} />
      {/* 开关 S1：开关节点到底部回线 */}
      <Wire d={`M ${xNode} ${y1} L ${xNode} 145`} delay={0.5} />
      <motion.rect
        x={xNode - 18}
        y={145}
        width={36}
        height={24}
        rx={3}
        stroke={WIRE}
        strokeWidth={2}
        initial={{ fill: OFF }}
        animate={reduceMotion ? { fill: ON } : { fill: [ON, OFF] }}
        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
      <Wire d={`M ${xNode} 169 L ${xNode} ${yBot}`} delay={0.5} />

      {/* ---------- 第 2 相 ---------- */}
      <Wire d={`M ${xIn} ${y2} L ${xL} ${y2}`} delay={0.7} />
      <Wire d={inductorPath(xL, y2)} delay={0.8} />
      <Wire d={`M ${xL + 72} ${y2} L ${xDiode} ${y2}`} delay={0.9} />
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
          transition={{ delay: 1.0 }}
      >
        <path d={`M ${xDiode} ${y2 - 10} L ${xDiode} ${y2 + 10} L ${xDiode + 20} ${y2} Z`} fill="none" stroke={WIRE} strokeWidth={2} />
        <line x1={xDiode + 20} y1={y2 - 10} x2={xDiode + 20} y2={y2 + 10} stroke={WIRE} strokeWidth={2} />
      </motion.g>
      <Wire d={`M ${xDiode + 20} ${y2} L ${xOutJoin} ${y2}`} delay={1.05} />
      {/* 开关 S2 */}
      <Wire d={`M ${xNode2} ${y2} L ${xNode2} 240`} delay={0.95} />
      <motion.rect
        x={xNode2 - 18}
        y={240}
        width={36}
        height={24}
        rx={3}
        stroke={WIRE}
        strokeWidth={2}
        initial={{ fill: OFF }}
        animate={reduceMotion ? { fill: OFF } : { fill: [OFF, ON] }}
        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut', delay: 0.5 }}
      />
      <Wire d={`M ${xNode2} 264 L ${xNode2} ${yBot}`} delay={0.95} />

      {/* ---------- 输出汇合 ---------- */}
      <Wire d={`M ${xOutJoin} ${y1} L ${xOutJoin} ${y2}`} delay={1.1} />
      <Wire d={`M ${xOutJoin} ${y1} L ${xLoad + 30} ${y1}`} delay={1.15} />
      {/* 输出电容 Cout */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
          transition={{ delay: 1.25 }}
      >
        <line x1={xCap - 14} y1={170} x2={xCap + 14} y2={170} stroke={WIRE} strokeWidth={3} />
        <line x1={xCap - 14} y1={182} x2={xCap + 14} y2={182} stroke={WIRE} strokeWidth={3} />
      </motion.g>
      <Wire d={`M ${xCap} ${y1} L ${xCap} 170`} delay={1.2} />
      <Wire d={`M ${xCap} 182 L ${xCap} ${yBot}`} delay={1.2} />
      {/* 负载 R */}
      <motion.rect
        x={xLoad}
        y={150}
        width={30}
        height={60}
        rx={4}
        fill="none"
        stroke={WIRE}
        strokeWidth={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
          transition={{ delay: 1.3 }}
      />
      <Wire d={`M ${xLoad + 15} ${y1} L ${xLoad + 15} 150`} delay={1.25} />
      <Wire d={`M ${xLoad + 15} 210 L ${xLoad + 15} ${yBot}`} delay={1.25} />

      {/* ---------- 电流流动虚线 ---------- */}
      <Flow d={`M ${xIn} ${y1} L ${xDiode + 20} ${y1} L ${xOutJoin} ${y1}`} color={FLOW1} delay={1.5} />
      <Flow d={`M ${xIn} ${y2} L ${xDiode + 20} ${y2} L ${xOutJoin} ${y2}`} color={FLOW2} delay={1.7} />

      {/* ---------- 元件标注 ---------- */}
      <Label x={xL + 18} y={y1 - 16} text="L1" />
      <Label x={xL + 18} y={y2 - 16} text="L2" />
      <Label x={xDiode - 4} y={y1 - 16} text="D1" />
      <Label x={xDiode - 4} y={y2 - 16} text="D2" />
      <Label x={xNode + 26} y={160} text="S1" />
      <Label x={xNode2 + 26} y={255} text="S2" />
      <Label x={xCap - 24} y={155} text="Cout" />
      <Label x={xLoad + 36} y={185} text="R" />
      <Label x={xLoad - 30} y={y1 - 14} text="Vout(+)" color="#f5f5f5" />
      <Label x={xLoad - 30} y={yBot + 20} text="Vout(-)" color="#f5f5f5" />

      {/* ---------- 相位差标注 ---------- */}
      <motion.g
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.5 }}
      >
        <path d={`M 330 150 L 330 250`} stroke="#facc15" strokeWidth={1.5} strokeDasharray="4 3" />
        <path d={`M 326 156 L 330 150 L 334 156`} stroke="#facc15" strokeWidth={1.5} fill="none" />
        <path d={`M 326 244 L 330 250 L 334 244`} stroke="#facc15" strokeWidth={1.5} fill="none" />
        <text x={342} y={228} fill="#facc15" fontSize="13" fontFamily="'JetBrains Mono', monospace">
          S1/S2 相位差 180°
        </text>
      </motion.g>
    </svg>
  )
}
