/**
 * 站点部署前缀解析。
 *
 * 同一份 dist 要同时服务两个部署目标：
 * - 正式站：域名根路径（https://www.interleavedpfc.power-knowledge.tech/）
 * - GitHub Pages：仓库子路径（https://<user>.github.io/interleaved-pfc/）
 *
 * vite 的 base 用的是 `'./'`（相对路径）以兼容两处，但 BrowserRouter 需要**绝对** basename：
 * 子路径下访问 /interleaved-pfc/designer 时，路由表里的 '/designer' 匹配不上，
 * React 只会渲染首页。2026-11-24 实测确认过：Pages 站的深链接与根路径 DOM 逐字节相同。
 *
 * 这里按运行时 pathname 判定，而不是构建期常量，
 * 这样「双部署共用一份 dist」的前提仍然成立。
 */

/** GitHub Pages 部署时的仓库子路径前缀（对应 GitHub 仓库名 interleaved-pfc） */
export const SITE_SUBPATH = '/interleaved-pfc'

/**
 * 依据当前路径判定 Router basename：
 * - 命中子路径（Pages）→ 返回子路径前缀
 * - 正式站根路径 → 返回空串
 */
export function resolveBasename(pathname: string): string {
  if (pathname === SITE_SUBPATH || pathname.startsWith(`${SITE_SUBPATH}/`)) {
    return SITE_SUBPATH
  }
  return ''
}
