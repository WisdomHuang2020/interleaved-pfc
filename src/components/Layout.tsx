import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap, BookOpen, Activity, PenTool, TrendingUp, Calculator, FileText, Menu, X } from 'lucide-react'
import BrandMark from './BrandMark'

const navItems = [
  { path: '/', label: '首页', icon: Zap },
  { path: '/fundamentals', label: '基础', icon: BookOpen },
  { path: '/operation', label: '原理', icon: Activity },
  { path: '/derivations', label: '推导', icon: PenTool },
  { path: '/curves', label: '曲线', icon: TrendingUp },
  { path: '/designer', label: '设计', icon: Calculator },
  { path: '/report', label: '报告', icon: FileText },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <BrandMark className="h-6 w-6" />
            <span>交错并联PFC</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>交错并联PFC设计工具 v{__APP_VERSION__}</p>
        <p className="mt-1">基于 React + Vite + Tailwind CSS</p>
        {/* 备案信息：工信部（ICP 备案）与公安部（公安联网备案）均要求网站底部公开展示。
            ICP 在前、公安图标居中、公安备案号在后，同一行排列（页脚整体居中）。
            图标路径用相对 './'：同一份 dist 要同时服务自有域名根路径与 GitHub Pages
            子路径，写成绝对 '/beian.png' 会在 Pages 子路径下 404。 */}
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            苏ICP备2026073104号-1
          </a>
          <a
            href="https://beian.mps.gov.cn/#/query/webSearch?code=32021402005238"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <img src="./beian.png" alt="" className="h-4 w-auto" />
            苏公网安备32021402005238号
          </a>
        </p>
        {/* 免责声明：分「工程决策」与「知识产权」两段，与站群其余站点保持同一文本。
            页脚整体居中，长段落改左对齐并限宽，否则每行只有几个字、难以阅读。 */}
        <div className="mx-auto mt-4 max-w-3xl space-y-2 text-left text-xs leading-relaxed">
          <p>
            <span className="font-medium text-muted-foreground/90">免责声明：</span>
            本站为个人非商业性技术分享。全部计算结果基于公开理论模型与解析/半解析近似，
            仅供工程估算与学习研究参考，不构成设计保证，亦不替代器件数据手册、实测波形、
            仿真与第三方专业复核。任何主体引用本站内容或据此作出的工程决策，风险与责任
            由该主体自行承担；因使用本站内容所产生的间接损失，本站不予承担。
          </p>
          <p>
            站内图表、公式推导与文字内容为作者原创或基于公开资料整理，著作权归作者所有；
            文中提及的软件、标准、商标与厂商名称，权利均归各自权利人所有，仅作技术说明引用，
            不代表任何隶属、赞助或背书关系。
          </p>
        </div>
      </footer>
    </div>
  )
}
