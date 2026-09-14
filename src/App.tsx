import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import { DesignProvider } from './lib/DesignContext'

// 首页保持静态导入：它是落地页、也是绝大多数访问的入口路径，
// 对它做懒加载只会多一次请求瀑布与 Suspense 闪烁，收益为负。
import Home from './pages/Home'

// 其余 6 个页面按路由懒加载（React.lazy 要求目标模块有 default export，已核实全部满足）。
// 目的：把首屏用不到的重库移出入口 chunk——
//   recharts 仅 Curves 使用；katex（经 InlineMath / MathBlock）仅 Fundamentals / Operation / Derivations 使用。
const Fundamentals = lazy(() => import('./pages/Fundamentals'))
const Operation = lazy(() => import('./pages/Operation'))
const Derivations = lazy(() => import('./pages/Derivations'))
const Curves = lazy(() => import('./pages/Curves'))
const Designer = lazy(() => import('./pages/Designer'))
const Report = lazy(() => import('./pages/Report'))

// 兜底 UI 放在 Layout 内部，切换路由时导航壳保持可见，不会整页白屏。
function RouteFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50vh] items-center justify-center text-muted-foreground"
    >
      页面加载中…
    </div>
  )
}

function App() {
  return (
    <DesignProvider>
      <HashRouter>
        <Layout>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/fundamentals" element={<Fundamentals />} />
              <Route path="/operation" element={<Operation />} />
              <Route path="/derivations" element={<Derivations />} />
              <Route path="/curves" element={<Curves />} />
              <Route path="/designer" element={<Designer />} />
              <Route path="/report" element={<Report />} />
            </Routes>
          </Suspense>
        </Layout>
      </HashRouter>
    </DesignProvider>
  )
}

export default App
