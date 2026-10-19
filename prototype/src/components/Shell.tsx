import {
  Bell, Brain, MessageSquare, Moon, PanelLeft, Plug2, Search,
  Settings as SettingsIcon, SquareKanban, Sun, X
} from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTheme } from '../theme/theme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { Modal } from './Modal'

export type ViewId = 'chat' | 'tasks' | 'skills' | 'memory' | 'messaging' | 'settings'
const NAV: { id: ViewId; label: string; icon: typeof MessageSquare; hint: string }[] = [
  { id: 'chat', label: '聊天', icon: MessageSquare, hint: '与 Hermes 一起，把想法变成进展' },
  { id: 'tasks', label: '任务', icon: SquareKanban, hint: '让每件事，都有自己的节奏' },
  { id: 'skills', label: '技能', icon: Plug2, hint: '按需开启你的 Agent 能力' },
  { id: 'memory', label: '记忆', icon: Brain, hint: '留下值得记住的事' },
  { id: 'messaging', label: '消息', icon: Bell, hint: '把工作连接到你的日常' },
  { id: 'settings', label: '设置', icon: SettingsIcon, hint: '一个适合你的工作台' }
]

/** 桌面版（Electron）由 preload 注入的窗口控制；浏览器里不存在。 */
type DesktopBridge = { minimize: () => void; toggleMaximize: () => void; close: () => void }
const desktop = (window as unknown as { hermesWindow?: DesktopBridge }).hermesWindow
const showWindowControls = !!desktop || new URLSearchParams(window.location.search).get('desktop') === '1'

export function HermesMark({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return <span className={`hermes-mark ${className}`} aria-hidden><svg viewBox="0 0 24 24" fill="none">
    <defs><linearGradient id={`hm-${id}`} x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#4f8ef7"/><stop offset=".55" stopColor="#9b72cb"/><stop offset="1" stopColor="#d96570"/></linearGradient></defs>
    <g stroke={`url(#hm-${id})`} strokeLinecap="round" strokeLinejoin="round"><path d="M6 5v14M18 5v14M6 12h12" strokeWidth="2.6"/><path d="m3 7 3-2 3 2m6 10 3 2 3-2" strokeWidth="1.5"/></g>
  </svg></span>
}

/** macOS 式红黄绿窗口按钮：悬停整组时显示符号。 */
function TrafficLights() {
  if (!showWindowControls) return null
  return <div className="traffic-lights" role="group" aria-label="窗口控制">
    <button className="tl tl-close" aria-label="关闭窗口" onClick={() => desktop?.close()}><svg viewBox="0 0 10 10"><path d="M3 3l4 4M7 3l-4 4"/></svg></button>
    <button className="tl tl-min" aria-label="最小化窗口" onClick={() => desktop?.minimize()}><svg viewBox="0 0 10 10"><path d="M2.5 5h5"/></svg></button>
    <button className="tl tl-max" aria-label="最大化窗口" onClick={() => desktop?.toggleMaximize()}><svg viewBox="0 0 10 10"><path d="M3 3.2h3.8v3.8M7 6.8H3.2V3"/></svg></button>
  </div>
}

export function Shell({ view, setView, children, pendingApprovals, connectionOk, onToggleConnection, onOpenPalette }: {
  view: ViewId; setView: (v: ViewId) => void; children: ReactNode;
  pendingApprovals: number; connectionOk: boolean; onToggleConnection: () => void; onOpenPalette: () => void;
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('hermes-ui-nav-collapsed') === '1' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const { resolved, setMode } = useTheme()
  const narrow = useMediaQuery('(max-width: 700px)')
  const compact = useMediaQuery('(max-width: 1100px)') // 中等宽度：侧边栏自动收成图标栏
  useEffect(() => { if (!compact) setMobileOpen(false) }, [compact])
  const selected = NAV.find(n => n.id === view)!
  const navigate = (id: ViewId) => { setView(id); setMobileOpen(false) }
  const toggleNav = () => {
    if (compact) { setMobileOpen(true); return }
    setCollapsed(c => {
      try { localStorage.setItem('hermes-ui-nav-collapsed', c ? '0' : '1') } catch { /* Session-only preference. */ }
      return !c
    })
  }

  // 选中指示条：在导航项之间平滑滑动，而不是瞬间跳变
  const linksRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<{ y: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = linksRef.current?.querySelector<HTMLElement>('.nav-item.active')
      if (el) setIndicator({ y: el.offsetTop, h: el.offsetHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [view, collapsed])

  const navigation = (mobile = false) => <>
    <div className="sidebar-top">
      <TrafficLights />
      {mobile
        ? <button className="icon-btn ml-auto" aria-label="关闭导航" onClick={() => setMobileOpen(false)}><X size={17}/></button>
        : <button className="icon-btn sidebar-toggle" onClick={toggleNav} aria-expanded={compact ? mobileOpen : !collapsed} aria-label={compact ? '打开完整导航' : collapsed ? '展开侧边栏' : '收起侧边栏'} title={compact ? '打开完整导航' : collapsed ? '展开侧边栏' : '收起侧边栏'}><PanelLeft size={16} strokeWidth={1.7}/></button>}
    </div>
    <div className="sidebar-brand"><HermesMark /><div className="nav-copy"><strong>Hermes</strong><span>你的 Agent 工作台</span></div></div>
    <button className="sidebar-search" onClick={() => { setMobileOpen(false); onOpenPalette() }} aria-label="搜索与命令" title="搜索与命令 · Ctrl+K">
      <Search size={14} strokeWidth={2}/><span className="nav-copy">搜索</span><kbd className="nav-copy">Ctrl K</kbd>
    </button>
    <nav aria-label={mobile ? '移动主导航' : '主导航'} className="sidebar-links" ref={mobile ? undefined : linksRef}>
      {!mobile && indicator && <span className="nav-indicator" aria-hidden style={{ transform: `translateY(${indicator.y}px)`, height: indicator.h }}/>}
      {NAV.map((item, i) => {
        const Icon = item.icon
        return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''} ${i === 5 ? 'nav-settings' : ''}`} onClick={() => navigate(item.id)} aria-label={item.label} aria-current={view === item.id ? 'page' : undefined} title={item.label}>
          <Icon size={17} strokeWidth={1.75} aria-hidden/><span className="nav-copy">{item.label}</span>
          {item.id === 'chat' && pendingApprovals > 0 && <span className="nav-count">{pendingApprovals}</span>}
        </button>
      })}
    </nav>
    <div className="sidebar-bottom">
      <button className="workspace-profile" onClick={() => navigate('settings')} title="Profile 与设置">
        <span className="profile-avatar">W</span>
        <span className="nav-copy"><strong>Wan 的工作空间</strong><span>默认 Profile · 演示数据</span></span>
      </button>
    </div>
  </>

  return <div className={`app-shell ${collapsed ? 'nav-is-collapsed' : ''}`}>
    <div className="wallpaper" aria-hidden><i/><i/><i/></div>
    <a className="skip-link" href="#main-view">跳至工作区</a>
    <aside className="app-sidebar glass-material">{navigation()}</aside>
    <div className="workspace">
      <header className="workspace-toolbar">
        {narrow && <button className="icon-btn" aria-label="打开导航" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><PanelLeft size={17}/></button>}
        <div className="toolbar-title">
          <strong>{selected.label}</strong>
          <span>{selected.hint}</span>
        </div>
        <div className="toolbar-actions">
          <div className="glass-capsule-group">
            <button className="capsule-btn" aria-label="打开命令面板" onClick={onOpenPalette} title="搜索与命令 · Ctrl+K"><Search size={15}/></button>
            <button className="capsule-btn" aria-label={resolved === 'dark' ? '切换浅色主题' : '切换深色主题'} onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')} title="切换外观">{resolved === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}</button>
          </div>
          <button className={`connection-control ${connectionOk ? '' : 'is-disconnected'}`} onClick={onToggleConnection} aria-label={connectionOk ? '模拟断开连接' : '模拟恢复连接'} title="仅切换演示连接状态，未连接真实 Hermes"><span aria-hidden/>{connectionOk ? '演示模式' : '模拟断连'}</button>
        </div>
      </header>
      <main className="workspace-content" id="main-view" tabIndex={-1}>{children}</main>
    </div>
    <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} label="工作空间导航" className="navigation-sheet glass-material">{navigation(true)}</Modal>
  </div>
}
