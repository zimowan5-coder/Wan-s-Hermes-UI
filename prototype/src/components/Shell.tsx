import {
  Bell, Brain, CheckCircle2, ChevronLeft, ChevronRight, MessageSquare,
  Monitor, Moon, Plug2, Settings as SettingsIcon, SquareKanban, Sun, Wifi, WifiOff
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { ThemeMode } from '../theme/theme'
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

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: '浅色', icon: Sun },
  { id: 'dark', label: '深色', icon: Moon },
  { id: 'system', label: '跟随系统', icon: Monitor }
]

function useNow() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(t)
  }, [])
  return now
}

export function Shell({
  view, setView, children,
  themeMode, onThemeChange,
  pendingApprovals, connectionOk, onToggleConnection
}: {
  view: ViewId
  setView: (v: ViewId) => void
  children: ReactNode
  themeMode: ThemeMode
  onThemeChange: (m: ThemeMode) => void
  pendingApprovals: number
  connectionOk: boolean
  onToggleConnection: () => void
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
      {/* 顶栏 */}
      <header className="hairline-b flex items-center gap-3 px-4 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)' }}
            aria-hidden
          >H</div>
          {!collapsed && (
            <div className="leading-tight">
              <div className="font-semibold text-[13px]">Hermes <span style={{ color: 'var(--fg-tertiary)' }}>· 新版工作台</span></div>
            </div>
          )}
        </div>
        <MockBadge />

        {/* 主题切换器 */}
        <div role="group" aria-label="主题模式" className="flex items-center rounded-lg p-0.5" style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)' }}>
          {THEMES.map(t => {
            const Icon = t.icon
            const active = themeMode === t.id
            return (
              <button
                key={t.id}
                onClick={() => onThemeChange(t.id)}
                aria-pressed={active}
                title={t.label}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px]"
                style={active
                  ? { background: 'var(--bg-raised)', color: 'var(--fg-primary)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-subtle)' }
                  : { color: 'var(--fg-tertiary)', border: '1px solid transparent' }}
              >
                <Icon size={13} />
                {!collapsed && t.id !== 'system' && <span>{t.label}</span>}
                {!collapsed && t.id === 'system' && <span>系统</span>}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* 连接状态（MOCK 可切换，用于演示断连态） */}
        <button
          className="chip"
          onClick={onToggleConnection}
          title="模拟：点击切换连接/断连状态"
          style={connectionOk ? { color: 'var(--success)', borderColor: 'var(--success)' } : { color: 'var(--danger)', borderColor: 'var(--danger)' }}
        >
          {connectionOk ? <Wifi size={12} /> : <WifiOff size={12} />}
          {connectionOk ? '后端未连接 · 纯原型' : '已断连（模拟）'}
        </button>
        <span className="chip">Profile：默认</span>
        <button className="btn" style={{ padding: '5px 10px' }} onClick={() => setView('chat')} title="前往聊天查看待审批">
          <CheckCircle2 size={14} />
          {pendingApprovals > 0 ? `${pendingApprovals} 待审批` : '审批'}
        </button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 左导航 rail（可折叠） */}
        <nav
          aria-label="主导航"
          className="flex flex-col gap-1 p-3 shrink-0 transition-all"
          style={{
            width: collapsed ? 64 : 208,
            borderRight: '1px solid var(--border-subtle)',
            transitionDuration: 'var(--motion-normal)'
          }}
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
                <Icon size={17} strokeWidth={2.2} aria-hidden />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
          <div className="flex-1" />
          {!collapsed && (
            <div className="rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: 'var(--mock-soft)', border: '1px dashed var(--mock)', color: 'var(--fg-secondary)', borderRadius: 'var(--radius-sm)' }}>
              本原型所有数据均为模拟，不代表真实 Hermes 能力。集成点见 DESIGN.md。
            </div>
          )}
          <button
            className="nav-item"
            onClick={toggleNav}
            aria-expanded={!collapsed}
            aria-label={collapsed ? '展开导航栏' : '折叠导航栏'}
            title={collapsed ? '展开导航栏' : '折叠导航栏'}
            style={collapsed ? { justifyContent: 'center', padding: '8px' } : undefined}
          >
            {collapsed ? <ChevronRight size={17} aria-hidden /> : <><ChevronLeft size={17} aria-hidden /><span>收起</span></>}
          </button>
        </nav>

        {/* 主视图 */}
        <main className="flex-1 min-w-0 flex flex-col" id="main-view">{children}</main>
      </div>

      {/* 状态栏（实时时钟） */}
      <footer className="hairline-t flex items-center gap-4 px-4 text-[11px] shrink-0" style={{ height: 30, color: 'var(--fg-tertiary)' }}>
        <span>hermes-ui-prototype v0.2.0</span>
        <span>网关：未连接（MOCK）</span>
        <span className="flex-1" />
        <span>北京时间 {timeStr}</span>
      </footer>
    </div>
  )
}
