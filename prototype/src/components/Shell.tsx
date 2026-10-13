import {
  Bell, Brain, ChevronLeft, ChevronRight, Command, MessageSquare,
  Moon, PanelLeft, Plug2, Search, Settings as SettingsIcon, SquareKanban, Sun, X
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTheme } from '../theme/theme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { MockBadge } from './MockBadge'
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

export function HermesMark({ className = '' }: { className?: string }) {
  return <span className={`hermes-mark ${className}`} aria-hidden><svg viewBox="0 0 24 24" fill="none"><path d="M6 5v14M18 5v14M6 12h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/><path d="m3 7 3-2 3 2m6 10 3 2 3-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>
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
  const compact = useMediaQuery('(max-width: 1180px)')
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1181px)')
    const close = () => { if (mq.matches) setMobileOpen(false) }
    mq.addEventListener('change', close)
    return () => mq.removeEventListener('change', close)
  }, [])
  const selected = NAV.find(n => n.id === view)!
  const navigate = (id: ViewId) => { setView(id); setMobileOpen(false) }
  const toggleNav = () => setCollapsed(c => {
    try { localStorage.setItem('hermes-ui-nav-collapsed', c ? '0' : '1') } catch { /* Session-only preference. */ }
    return !c
  })
  const navigation = (mobile = false) => <>
    <div className="sidebar-brand"><HermesMark /><div className="nav-copy"><strong>Hermes</strong><span>你的 Agent 工作台</span></div>{mobile && <button className="icon-btn ml-auto" aria-label="关闭导航" onClick={() => setMobileOpen(false)}><X size={18}/></button>}</div>
    <div className="sidebar-section nav-copy">工作空间</div>
    <nav aria-label={mobile ? '移动主导航' : '主导航'} className="sidebar-links">
      {NAV.map((item, i) => {
        const Icon = item.icon
        return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''} ${i === 5 ? 'nav-settings' : ''}`} onClick={() => navigate(item.id)} aria-label={item.label} aria-current={view === item.id ? 'page' : undefined} title={item.label}>
          <Icon size={18} strokeWidth={1.65} aria-hidden/><span className="nav-copy">{item.label}</span>
          {item.id === 'chat' && pendingApprovals > 0 && <span className="nav-count nav-copy">{pendingApprovals}</span>}
        </button>
      })}
    </nav>
    <div className="sidebar-bottom">
      <div className="workspace-profile nav-copy"><span className="profile-avatar">W</span><div><strong>Wan 的工作空间</strong><span>本地演示 · 默认 Profile</span></div></div>
      <div className="sidebar-meta"><MockBadge label="MOCK"/><span className="nav-copy">未连接真实后端</span>{!mobile && <button className="icon-btn nav-collapse" onClick={compact ? () => setMobileOpen(true) : toggleNav} aria-expanded={!collapsed && !compact} aria-label={compact ? '打开完整导航' : collapsed ? '展开导航栏' : '折叠导航栏'}>{collapsed || compact ? <ChevronRight size={15}/> : <ChevronLeft size={15}/>}</button>}</div>
    </div>
  </>
  return <div className={`app-shell ${collapsed ? 'nav-is-collapsed' : ''}`}>
    <a className="skip-link" href="#main-view">跳至工作区</a>
    <aside className="app-sidebar">{navigation()}</aside>
    <div className="workspace">
      <header className="workspace-toolbar">
        <button className="icon-btn mobile-nav-trigger" aria-label="打开导航" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><PanelLeft size={18}/></button>
        <div className="toolbar-location"><span>工作台</span><ChevronRight size={12} aria-hidden/><strong>{selected.label}</strong></div>
        <div className="toolbar-actions">
          <button className="toolbar-search" onClick={onOpenPalette} aria-label="打开命令面板" title="搜索命令 · Ctrl/⌘+K"><Search size={15}/><span>搜索与命令</span><kbd><Command size={10}/>K</kbd></button>
          <button className="icon-btn" aria-label={resolved === 'dark' ? '切换浅色主题' : '切换深色主题'} onClick={() => setMode(resolved === 'dark' ? 'light' : 'dark')} title="切换主题">{resolved === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}</button>
          <button className={`connection-control ${connectionOk ? '' : 'is-disconnected'}`} onClick={onToggleConnection} aria-label={connectionOk ? '模拟断开连接' : '模拟恢复连接'} title="仅切换演示连接状态，未连接真实后端"><span aria-hidden/>{connectionOk ? '演示模式' : '模拟断连'}</button>
        </div>
      </header>
      <main className="workspace-content" id="main-view" tabIndex={-1}>{children}</main>
      <footer className="workspace-footer"><span>HERMES WORKSPACE</span><span>本地原型 · 所有 Agent 操作均为模拟</span><kbd>Ctrl / ⌘ K</kbd></footer>
    </div>
    <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} label="工作空间导航" className="navigation-sheet">{navigation(true)}</Modal>
  </div>
}
