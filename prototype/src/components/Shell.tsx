import {
  Bell, Brain, CheckCircle2, ChevronLeft, ChevronRight, MessageSquare,
  Plug2, Search, Settings as SettingsIcon, SquareKanban, Wifi, WifiOff
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { MockBadge } from './MockBadge'

export type ViewId = 'chat' | 'tasks' | 'skills' | 'memory' | 'messaging' | 'settings'

const NAV: { id: ViewId; label: string; icon: typeof MessageSquare; hint: string }[] = [
  { id: 'chat', label: '聊天', icon: MessageSquare, hint: '会话 · 审批 · 工具执行' },
  { id: 'tasks', label: '任务', icon: SquareKanban, hint: '定时任务 · 看板' },
  { id: 'skills', label: '技能', icon: Plug2, hint: 'Skills · 工具集' },
  { id: 'memory', label: '记忆', icon: Brain, hint: '记忆条目 · 知识图谱' },
  { id: 'messaging', label: '消息', icon: Bell, hint: '网关通道 · 推送' },
  { id: 'settings', label: '设置', icon: SettingsIcon, hint: 'Profile · 模型 · 连接' }
]

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

/**
 * v0.4 应用外壳：slim 工具栏 + 安静侧边栏。
 * 工具栏只保留高频控件（命令 / 连接 / 审批），主题切换收进设置。
 */
export function Shell({
  view, setView, children,
  pendingApprovals, connectionOk, onToggleConnection,
  onOpenPalette
}: {
  view: ViewId
  setView: (v: ViewId) => void
  children: ReactNode
  pendingApprovals: number
  connectionOk: boolean
  onToggleConnection: () => void
  onOpenPalette: () => void
}) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return window.localStorage.getItem('hermes-ui-nav-collapsed') === '1' } catch { return false }
  })
  const now = useNow()

  const toggleNav = () => {
    setCollapsed(c => {
      try { window.localStorage.setItem('hermes-ui-nav-collapsed', c ? '0' : '1') } catch { /* ignore */ }
      return !c
    })
  }

  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏：52px，底部 hairline，轻微材质 */}
      <header
        className="hairline-b flex items-center gap-2 px-4 shrink-0"
        style={{
          height: 52,
          background: 'color-mix(in srgb, var(--bg-base) 82%, transparent)',
          WebkitBackdropFilter: 'blur(20px) saturate(170%)',
          backdropFilter: 'blur(20px) saturate(170%)',
          zIndex: 20
        }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 flex items-center justify-center font-bold text-[13px]"
            style={{ background: 'var(--accent)', color: '#fff', borderRadius: 8 }}
            aria-hidden
          >H</div>
          <span className="font-semibold text-[13.5px]" style={{ letterSpacing: '-0.005em' }}>Hermes</span>
          <MockBadge />
        </div>

        <div className="flex-1" />

        <button className="btn" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={onOpenPalette} title="命令面板（Ctrl/⌘+K）" aria-label="打开命令面板">
          <Search size={13} aria-hidden />
          <span className="hidden md:inline" style={{ color: 'var(--fg-secondary)' }}>命令</span>
          <kbd className="chip font-mono" style={{ fontSize: 10 }}>⌘K</kbd>
        </button>

        <button
          className="chip"
          onClick={onToggleConnection}
          title="模拟：点击切换连接/断连状态"
          style={connectionOk
            ? { color: 'var(--success)', background: 'var(--success-soft)' }
            : { color: 'var(--danger)', background: 'var(--danger-soft)' }}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${connectionOk ? '' : 'pulse-dot'}`} style={{ background: 'currentColor' }} aria-hidden />
          {connectionOk ? '未连接 · 原型' : '已断连（模拟）'}
          {connectionOk ? <Wifi size={11} aria-hidden /> : <WifiOff size={11} aria-hidden />}
        </button>

        <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={() => setView('chat')} title="前往聊天查看待审批">
          <CheckCircle2 size={13} aria-hidden />
          {pendingApprovals > 0 ? `${pendingApprovals} 待审批` : '审批'}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 侧边栏：实色安静导航 */}
        <nav
          aria-label="主导航"
          className="flex flex-col gap-0.5 px-3 py-3 shrink-0"
          style={{ width: collapsed ? 60 : 216, transition: `width var(--motion-normal) var(--ease-out)` }}
        >
          {NAV.map(item => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                className={`nav-item ${active ? 'active' : ''}`}
                onClick={() => setView(item.id)}
                title={collapsed ? `${item.label} · ${item.hint}` : item.hint}
                aria-current={active ? 'page' : undefined}
                style={collapsed ? { justifyContent: 'center', padding: '8px' } : undefined}
              >
                <Icon size={16} strokeWidth={2} aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
          <div className="flex-1" />
          {!collapsed && (
            <p className="t-micro px-3 py-2" style={{ lineHeight: 1.6 }}>
              原型数据均为模拟，集成点见 DESIGN.md。
            </p>
          )}
          <button
            className="nav-item"
            onClick={toggleNav}
            aria-expanded={!collapsed}
            aria-label={collapsed ? '展开导航栏' : '折叠导航栏'}
            title={collapsed ? '展开导航栏' : '折叠导航栏'}
            style={collapsed ? { justifyContent: 'center', padding: '8px' } : undefined}
          >
            {collapsed ? <ChevronRight size={16} aria-hidden /> : <><ChevronLeft size={16} aria-hidden /><span>收起</span></>}
          </button>
        </nav>

        {/* 主视图 */}
        <main className="flex-1 min-w-0 flex flex-col" id="main-view">{children}</main>
      </div>

      {/* 状态栏：极简 */}
      <footer className="flex items-center gap-4 px-5 text-[11px] shrink-0" style={{ height: 28, color: 'var(--fg-tertiary)' }}>
        <span>hermes-ui-prototype v0.4.0</span>
        <span className="flex-1" />
        <span>北京时间 {timeStr}</span>
      </footer>
    </div>
  )
}
