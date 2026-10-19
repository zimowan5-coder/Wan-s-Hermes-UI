import {
  Bell, Brain, Command, MessageSquare, FolderInput, Gauge, Image as ImageIcon, Keyboard, Layers, MoreHorizontal, Moon, PanelLeft, PanelRight,
  Pin, Plug2, Search, Settings as SettingsIcon, SquareKanban, SquarePen, Sun, User, X
} from 'lucide-react'
import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../theme/theme'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { InterfaceMode } from '../lib/prefs'
import type { MergedSession } from '../lib/sessions'
import { Menu, type MenuEntry } from './Menu'
import { Modal } from './Modal'

export type ViewId = 'chat' | 'tasks' | 'skills' | 'memory' | 'messaging' | 'artifacts' | 'settings'
export type OverlayId = 'command-center' | 'shortcuts' | 'import' | 'agents'
export const VIEW_IDS: ViewId[] = ['chat', 'tasks', 'skills', 'memory', 'messaging', 'artifacts', 'settings']

/** 侧边栏顶部入口：与官方 sidebar.nav 对应（新建会话单独做成按钮） */
const NAV: { id: ViewId; label: string; icon: typeof Bell; hint: string }[] = [
  { id: 'tasks', label: '任务', icon: SquareKanban, hint: '定时任务与看板' },
  { id: 'skills', label: '技能', icon: Plug2, hint: '技能、工具集、连接器与插件' },
  { id: 'memory', label: '记忆', icon: Brain, hint: '记忆条目与知识图谱' },
  { id: 'messaging', label: '消息', icon: Bell, hint: 'Telegram、微信等平台与 Webhooks' },
  { id: 'artifacts', label: '产物', icon: ImageIcon, hint: '对话中生成的图片、文件与链接' }
]
export const VIEW_TITLES: Record<ViewId, { label: string; hint: string }> = {
  chat: { label: '聊天', hint: '' },
  ...Object.fromEntries(NAV.map(n => [n.id, { label: n.label, hint: n.hint }])) as Record<Exclude<ViewId, 'chat' | 'settings'>, { label: string; hint: string }>,
  settings: { label: '设置', hint: '模型、外观、连接与快捷键' }
}

/** 桌面版（Electron）由 preload 注入的窗口控制；浏览器里不存在。 */
type DesktopBridge = { minimize: () => void; toggleMaximize: () => void; close: () => void }
const desktop = (window as unknown as { hermesWindow?: DesktopBridge }).hermesWindow
const showWindowControls = !!desktop || new URLSearchParams(window.location.search).get('desktop') === '1'

/** 视图可以把自己的标题区「放进」顶栏（例如聊天页的会话标题与状态），避免叠两层标题栏。 */
const ToolbarSlot = createContext<HTMLElement | null>(null)
export function ToolbarPortal({ children }: { children: ReactNode }) {
  const el = useContext(ToolbarSlot)
  return el ? createPortal(children, el) : null
}

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

export interface ShellProps {
  view: ViewId
  setView: (v: ViewId) => void
  children: ReactNode
  sessions: MergedSession[]
  activeSessionId: string
  pendingBySession: Record<string, number>
  onOpenSession: (id: string) => void
  onNewChat: () => void
  sessionMenu: (s: MergedSession) => MenuEntry[]
  profiles: { id: string; name: string }[]
  activeProfile: string
  onSwitchProfile: (id: string) => void
  onOverlay: (id: OverlayId) => void
  onOpenSettings: (section?: string) => void
  mode: InterfaceMode
  setMode: (m: InterfaceMode) => void
  connectionOk: boolean
  onToggleConnection: () => void
  onOpenPalette: () => void
  rightPanelOpen: boolean
  onToggleRightPanel: () => void
}

export function Shell(p: ShellProps) {
  const { view, setView, children, sessions, activeSessionId, pendingBySession, connectionOk } = p
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('hermes-ui-nav-collapsed') === '1' } catch { return false }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null)
  const { resolved, setMode: setTheme } = useTheme()
  const narrow = useMediaQuery('(max-width: 700px)')
  const compact = useMediaQuery('(max-width: 1100px)') // 中等宽度：侧边栏自动收成图标栏
  useEffect(() => { if (!compact) setMobileOpen(false) }, [compact])
  const railOnly = collapsed || compact
  const navigate = (id: ViewId) => { setView(id); setMobileOpen(false) }
  const toggleNav = () => {
    if (compact) { setMobileOpen(true); return }
    setCollapsed(c => {
      try { localStorage.setItem('hermes-ui-nav-collapsed', c ? '0' : '1') } catch { /* Session-only preference. */ }
      return !c
    })
  }

  // 选中指示条：在入口之间平滑滑动，而不是瞬间跳变
  const linksRef = useRef<HTMLElement>(null)
  const [indicator, setIndicator] = useState<{ y: number; h: number } | null>(null)
  useLayoutEffect(() => {
    const measure = () => {
      const el = linksRef.current?.querySelector<HTMLElement>('.nav-item.active:not(.sr-only-nav)')
      setIndicator(el ? { y: el.offsetTop, h: el.offsetHeight } : null)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [view, collapsed, compact])

  const visible = sessions.filter(s => !s.archived && s.title.toLowerCase().includes(query.trim().toLowerCase()))
  const pinned = visible.filter(s => s.pinned)
  const recent = visible.filter(s => !s.pinned)

  const sessionRow = (s: MergedSession, mobile: boolean) => {
    const active = view === 'chat' && activeSessionId === s.id
    const pending = pendingBySession[s.id] ?? 0
    return <div key={s.id} className={`session-item ${active ? 'is-active' : ''}`}>
      <button className="session-row" aria-pressed={active} onClick={() => { p.onOpenSession(s.id); if (mobile) setMobileOpen(false) }}>
        <span className="session-title">{s.title}</span>
        <span className="session-sub">{s.profile} · {s.updatedAt}</span>
        {(pending > 0 || s.unreadCount > 0) && <span className="session-badges">
          {pending > 0 && <span className="badge-pending" title={`${pending} 待审批`}>{pending}</span>}
          {s.unreadCount > 0 && <span className="badge-unread" title={`${s.unreadCount} 条未读`}>{s.unreadCount}</span>}
        </span>}
      </button>
      <Menu label={`${s.title} 的会话操作`} align="end" items={p.sessionMenu(s)} trigger={t =>
        <button {...t} className="session-more" aria-label={`会话操作：${s.title}`} title="会话操作"><MoreHorizontal size={15}/></button>} />
    </div>
  }

  const profileMenu: MenuEntry[] = [
    { heading: '配置档案', id: 'h-profiles' },
    ...p.profiles.map(pr => ({ id: `profile-${pr.id}`, label: pr.name, icon: <User size={14}/>, checked: pr.id === p.activeProfile, onSelect: () => p.onSwitchProfile(pr.id) })),
    { id: 'manage-profiles', label: '管理配置档案…', icon: <Layers size={14}/>, onSelect: () => p.onOpenSettings('profiles') },
    { separator: true, id: 's1' },
    { id: 'command-center', label: '命令中心', icon: <Gauge size={14}/>, hint: 'Ctrl .', onSelect: () => p.onOverlay('command-center') },
    { id: 'import', label: '从其他应用导入会话', icon: <FolderInput size={14}/>, onSelect: () => p.onOverlay('import') },
    { id: 'shortcuts', label: '键盘快捷键', icon: <Keyboard size={14}/>, hint: 'Ctrl /', onSelect: () => p.onOverlay('shortcuts') },
    { separator: true, id: 's2' },
    { id: 'mode', label: p.mode === 'simple' ? '切换到高级模式' : '切换到简洁模式', icon: <Command size={14}/>, onSelect: () => p.setMode(p.mode === 'simple' ? 'advanced' : 'simple') },
    { id: 'settings', label: '设置', icon: <SettingsIcon size={14}/>, hint: 'Ctrl ,', onSelect: () => p.onOpenSettings() }
  ]
  const profileName = p.profiles.find(pr => pr.id === p.activeProfile)?.name ?? '默认'

  const navigation = (mobile = false) => {
    const showSessions = mobile || !railOnly
    return <>
      <div className="sidebar-top">
        <TrafficLights />
        {mobile
          ? <button className="icon-btn ml-auto" aria-label="关闭导航" onClick={() => setMobileOpen(false)}><X size={17}/></button>
          : <button className="icon-btn sidebar-toggle" onClick={toggleNav} aria-expanded={compact ? mobileOpen : !collapsed} aria-label={compact ? '打开完整导航' : collapsed ? '展开侧边栏' : '收起侧边栏'} title={compact ? '打开完整导航' : collapsed ? '展开侧边栏 · Ctrl+B' : '收起侧边栏 · Ctrl+B'}><PanelLeft size={16} strokeWidth={1.7}/></button>}
      </div>
      <div className="sidebar-brand"><HermesMark /><div className="nav-copy"><strong>Hermes</strong></div></div>
      <button className="new-chat-btn" onClick={() => { p.onNewChat(); setMobileOpen(false) }} aria-label="新建会话" title="新建会话 · Ctrl+N">
        <SquarePen size={16} strokeWidth={1.8}/><span className="nav-copy">新建会话</span>
      </button>
      <nav aria-label={mobile ? '移动主导航' : '主导航'} className="sidebar-links" ref={mobile ? undefined : linksRef}>
        {!mobile && indicator && <span className="nav-indicator" aria-hidden style={{ transform: `translateY(${indicator.y}px)`, height: indicator.h }}/>}
        {NAV.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={`nav-item ${view === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)} aria-label={item.label} aria-current={view === item.id ? 'page' : undefined} title={item.label}>
            <Icon size={17} strokeWidth={1.75} aria-hidden/><span className="nav-copy">{item.label}</span>
          </button>
        })}
        {/* 聊天没有单独入口（会话列表即聊天），但保留一个隐藏按钮，供键盘与读屏用户回到当前会话 */}
        <button className={`nav-item nav-chat ${view === 'chat' ? 'active' : ''} ${showSessions ? 'sr-only-nav' : ''}`} onClick={() => navigate('chat')} aria-label="聊天" aria-current={view === 'chat' ? 'page' : undefined} title="回到当前会话">
          <MessageSquare size={17} strokeWidth={1.75} aria-hidden/><span className="nav-copy">聊天</span>
        </button>
      </nav>
      {showSessions && <div className="sidebar-sessions">
        <label className="session-search"><Search size={14} aria-hidden/><input aria-label="搜索会话" placeholder="搜索会话" value={query} onChange={e => setQuery(e.target.value)}/>
          {query && <button className="icon-btn" style={{ width: 22, height: 22 }} aria-label="清除搜索" onClick={() => setQuery('')}><X size={13}/></button>}</label>
        <div className="session-scroll" role="group" aria-label="选择会话">
          {pinned.length > 0 && <><div className="sidebar-section"><Pin size={11} aria-hidden/> 已置顶</div>{pinned.map(s => sessionRow(s, mobile))}</>}
          {recent.length > 0 && <><div className="sidebar-section">最近</div>{recent.map(s => sessionRow(s, mobile))}</>}
          {query && visible.length === 0 && <div className="session-empty-search"><Search size={18}/><p>没有找到会话</p><button className="btn btn-plain" onClick={() => setQuery('')}>清除搜索</button></div>}
        </div>
      </div>}
      <div className="sidebar-bottom">
        <Menu label="账户与设置" placement="top" width={240} items={profileMenu} trigger={t =>
          <button {...t} className="workspace-profile" aria-label="账户、配置档案与设置" title="配置档案、命令中心与设置">
            <span className="profile-avatar">W</span>
            <span className="nav-copy"><strong>Wan</strong><span>{profileName} · {p.mode === 'simple' ? '简洁模式' : '高级模式'}</span></span>
            <SettingsIcon size={15} className="nav-copy profile-gear" aria-hidden/>
          </button>} />
      </div>
    </>
  }

  return <div className={`app-shell ${collapsed ? 'nav-is-collapsed' : ''}`}>
    <div className="wallpaper" aria-hidden><i/><i/><i/></div>
    <a className="skip-link" href="#main-view">跳至工作区</a>
    <aside className="app-sidebar glass-material">{navigation()}</aside>
    <div className="workspace">
      <header className="workspace-toolbar">
        {narrow && <button className="icon-btn" aria-label="打开导航" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><PanelLeft size={17}/></button>}
        <div className="toolbar-slot" ref={setSlotEl}>
        </div>
        <div className="toolbar-actions">
          <div className="glass-capsule-group">
            <button className="capsule-btn" aria-label="打开命令面板" onClick={p.onOpenPalette} title="搜索与命令 · Ctrl+K"><Search size={15}/></button>
            <button className="capsule-btn" aria-label={resolved === 'dark' ? '切换浅色主题' : '切换深色主题'} onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')} title="切换外观 · Shift+X">{resolved === 'dark' ? <Sun size={15}/> : <Moon size={15}/>}</button>
            {p.mode === 'advanced' && view === 'chat' && <button className={`capsule-btn ${p.rightPanelOpen ? 'is-on' : ''}`} aria-label={p.rightPanelOpen ? '隐藏右侧面板' : '显示右侧面板'} aria-pressed={p.rightPanelOpen} onClick={p.onToggleRightPanel} title="文件、终端、审查 · Ctrl+J"><PanelRight size={15}/></button>}
          </div>
          <button className={`connection-control ${connectionOk ? '' : 'is-disconnected'}`} onClick={p.onToggleConnection} aria-label={connectionOk ? '模拟断开连接' : '模拟恢复连接'} title="仅切换演示连接状态，未连接真实 Hermes"><span aria-hidden/>{connectionOk ? '演示模式' : '模拟断连'}</button>
        </div>
      </header>
      <ToolbarSlot.Provider value={slotEl}>
        <main className="workspace-content" id="main-view" tabIndex={-1}>{children}</main>
      </ToolbarSlot.Provider>
    </div>
    <Modal open={mobileOpen} onClose={() => setMobileOpen(false)} label="工作空间导航" className="navigation-sheet glass-material">{navigation(true)}</Modal>
  </div>
}
