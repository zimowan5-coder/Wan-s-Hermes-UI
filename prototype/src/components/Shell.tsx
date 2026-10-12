import {
  Bell, Brain, CheckCircle2, MessageSquare, Plug2, Settings as SettingsIcon, SquareKanban
} from 'lucide-react'
import type { ReactNode } from 'react'
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

export function Shell({
  view, setView, children
}: {
  view: ViewId
  setView: (v: ViewId) => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col h-full">
      {/* 顶栏 */}
      <header className="hairline-b flex items-center gap-3 px-4 h-13 shrink-0" style={{ height: 52 }}>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{ background: 'var(--ui-accent-dim)', color: 'var(--ui-accent)', border: '1px solid rgba(122,162,247,0.3)' }}
          >
            H
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-[13px]">Hermes <span style={{ color: 'var(--ui-fg-faint)' }}>· 新版工作台</span></div>
          </div>
        </div>
        <MockBadge />
        <div className="flex-1" />
        <span className="chip"><span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--ui-ok)' }} />后端未连接 · 纯原型</span>
        <span className="chip">Profile：默认</span>
        <button className="btn" style={{ padding: '5px 10px' }}><CheckCircle2 size={14} />2 待审批</button>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* 左导航 rail */}
        <nav className="hairline-b flex flex-col gap-1 p-3 shrink-0" style={{ width: 208, borderRight: '1px solid var(--ui-stroke)' }}>
          {NAV.map(item => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button key={item.id} className={`nav-item ${active ? 'active' : ''}`} onClick={() => setView(item.id)} title={item.hint}>
                <Icon size={17} strokeWidth={2.2} />
                <span>{item.label}</span>
              </button>
            )
          })}
          <div className="flex-1" />
          <div className="rounded-lg p-3 text-[11px] leading-relaxed" style={{ background: 'rgba(187,154,247,0.07)', border: '1px dashed var(--ui-mock)', color: 'var(--ui-fg-muted)' }}>
            本原型所有数据均为模拟，不代表真实 Hermes 能力。集成点见 DESIGN.md。
          </div>
        </nav>

        {/* 主视图 */}
        <main className="flex-1 min-w-0 flex flex-col">{children}</main>
      </div>

      {/* 状态栏 */}
      <footer className="hairline-t flex items-center gap-4 px-4 text-[11px] shrink-0" style={{ height: 30, color: 'var(--ui-fg-faint)' }}>
        <span>hermes-ui-prototype v0.1.0</span>
        <span>网关：未连接（MOCK）</span>
        <span className="flex-1" />
        <span>北京时间 18:20 · CST</span>
      </footer>
    </div>
  )
}
