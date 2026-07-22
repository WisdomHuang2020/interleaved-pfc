import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Zap, BookOpen, Activity, PenTool, TrendingUp, Calculator, FileText, Menu, X } from 'lucide-react'

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
            <Zap className="h-6 w-6" />
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
      </footer>
    </div>
  )
}
