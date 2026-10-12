import { Pin, SendHorizonal, ShieldAlert, ShieldCheck, TerminalSquare, Wrench } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import {
  mockApprovals, mockMessages, mockSessions,
  type Approval, type ChatMessage
} from '../mock/data'
import { MockBadge } from '../components/MockBadge'

const riskColor = { low: 'var(--ui-ok)', medium: 'var(--ui-warn)', high: 'var(--ui-danger)' } as const
const riskLabel = { low: '低风险', medium: '中风险', high: '高风险' } as const

function ApprovalCard({ a, onDecide }: { a: Approval; onDecide: (id: string, ok: boolean) => void }) {
  if (a.status !== 'pending') {
    return (
      <div className="flat-panel p-3 text-[12px] msg-stream" style={{ borderColor: 'var(--ui-stroke)' }}>
        <span style={{ color: a.status === 'approved' ? 'var(--ui-ok)' : 'var(--ui-danger)' }}>
          {a.status === 'approved' ? '✓ 已批准' : '✕ 已拒绝'}
        </span>
        <span style={{ color: 'var(--ui-fg-faint)' }} className="ml-2">{a.title}</span>
      </div>
    )
  }
  return (
    <div className="flat-panel p-4 approval-card" style={{ boxShadow: 'var(--shadow-nous)', borderColor: 'var(--ui-stroke-strong)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        {a.risk === 'high' ? <ShieldAlert size={15} style={{ color: riskColor[a.risk] }} /> : <ShieldCheck size={15} style={{ color: riskColor[a.risk] }} />}
        <span className="font-semibold text-[13px]">需要你的审批</span>
        <span className="chip" style={{ color: riskColor[a.risk], borderColor: riskColor[a.risk] }}>{riskLabel[a.risk]}</span>
        <MockBadge />
      </div>
      <div className="font-medium text-[13px] mb-1">{a.title}</div>
      <div className="text-[12px] mb-3" style={{ color: 'var(--ui-fg-muted)' }}>{a.detail}</div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={() => onDecide(a.id, true)}>批准</button>
        <button className="btn btn-danger" onClick={() => onDecide(a.id, false)}>拒绝</button>
        <span className="text-[11px] self-center" style={{ color: 'var(--ui-fg-faint)' }}>手势/快捷键不直接批准，需明确点击</span>
      </div>
    </div>
  )
}

function MessageRow({ m }: { m: ChatMessage }) {
  if (m.role === 'tool') {
    return (
      <div className="msg-stream flex items-start gap-2.5 py-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'rgba(122,162,247,0.12)', border: '1px solid var(--ui-stroke)' }}>
          <Wrench size={14} style={{ color: 'var(--ui-accent)' }} />
        </div>
        <div className="flat-panel px-3 py-2 text-[12.5px] flex-1" style={{ background: 'rgba(122,162,247,0.05)' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <code className="text-[11.5px]" style={{ color: 'var(--ui-accent)' }}>{m.toolName}</code>
            <span className="chip" style={{ color: m.toolStatus === 'ok' ? 'var(--ui-ok)' : 'var(--ui-warn)' }}>
              {m.toolStatus === 'ok' ? '执行成功' : m.toolStatus === 'running' ? '执行中…' : '失败'}
            </span>
          </div>
          <div style={{ color: 'var(--ui-fg-muted)' }}>{m.text}</div>
        </div>
      </div>
    )
  }
  const mine = m.role === 'user'
  return (
    <div className={`msg-stream flex ${mine ? 'justify-end' : 'justify-start'} py-1.5`}>
      <div
        className="max-w-[78%] px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap"
        style={mine
          ? { background: 'var(--ui-accent)', color: '#0b0d12', borderRadius: '14px 14px 4px 14px' }
          : { background: 'var(--ui-bg-raised)', border: '1px solid var(--ui-stroke)', borderRadius: '14px 14px 14px 4px' }}
      >
        {m.text}
        <div className="text-[10px] mt-1 opacity-60">{m.time}</div>
      </div>
    </div>
  )
}

export function ChatView() {
  const [activeId, setActiveId] = useState('s1')
  const [input, setInput] = useState('')
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals)
  const [extra, setExtra] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const messages = useMemo(
    () => [...(mockMessages[activeId] ?? []), ...extra.filter(e => e.id.startsWith(activeId))],
    [activeId, extra]
  )
  const pendingCount = approvals.filter(a => a.status === 'pending').length

  const send = () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    const stamp = new Date().toTimeString().slice(0, 5)
    const u: ChatMessage = { id: `${activeId}-u${Date.now()}`, role: 'user', text, time: stamp }
    setExtra(prev => [...prev, u])
    setInput('')
    setTimeout(() => {
      const r: ChatMessage = {
        id: `${activeId}-a${Date.now()}`, role: 'assistant',
        text: '（模拟回复）收到：「' + text.slice(0, 24) + (text.length > 24 ? '…' : '') + '」。真实集成后这里会走 requestGateway("prompt.submit") 流式返回。',
        time: new Date().toTimeString().slice(0, 5)
      }
      setExtra(prev => [...prev, r])
      setSending(false)
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 900)
  }

  const decide = (id: string, ok: boolean) =>
    setApprovals(prev => prev.map(a => (a.id === id ? { ...a, status: ok ? 'approved' : 'denied' } : a)))

  return (
    <div className="flex flex-1 min-h-0">
      {/* 会话列表 */}
      <aside className="shrink-0 flex flex-col" style={{ width: 248, borderRight: '1px solid var(--ui-stroke)' }}>
        <div className="px-3 pt-3 pb-2 flex items-center justify-between">
          <span className="text-[12px] font-semibold" style={{ color: 'var(--ui-fg-muted)' }}>会话</span>
          <MockBadge label="MOCK" />
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5">
          {mockSessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveId(s.id)}
              className="text-left px-3 py-2.5 rounded-lg transition-colors"
              style={activeId === s.id
                ? { background: 'var(--ui-accent-dim)', border: '1px solid rgba(122,162,247,0.25)' }
                : { border: '1px solid transparent' }}
            >
              <div className="flex items-center gap-1.5">
                {s.pinned && <Pin size={11} style={{ color: 'var(--ui-accent)' }} />}
                <span className="text-[13px] font-medium truncate flex-1">{s.title}</span>
                {s.unread ? (
                  <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: 'var(--ui-accent)', color: '#0b0d12' }}>{s.unread}</span>
                ) : null}
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--ui-fg-faint)' }}>{s.profile} · {s.updatedAt}</div>
            </button>
          ))}
        </div>
      </aside>

      {/* 对话区 */}
      <section className="flex-1 flex flex-col min-w-0">
        <div className="hairline-b px-5 py-2.5 flex items-center gap-2">
          <span className="font-semibold text-[14px]">{mockSessions.find(s => s.id === activeId)?.title}</span>
          {pendingCount > 0 && <span className="chip" style={{ color: 'var(--ui-warn)', borderColor: 'var(--ui-warn)' }}>{pendingCount} 待审批</span>}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          {approvals.some(a => a.status === 'pending') && activeId === 's1' && (
            <div className="flex flex-col gap-2 mb-3 max-w-[560px]">
              {approvals.map(a => <ApprovalCard key={a.id} a={a} onDecide={decide} />)}
            </div>
          )}
          {messages.map(m => <MessageRow key={m.id} m={m} />)}
          {sending && (
            <div className="flex items-center gap-2 text-[12px] py-2" style={{ color: 'var(--ui-fg-faint)' }}>
              <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: 'var(--ui-accent)' }} />
              Hermes 正在输入（模拟）…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 工具执行条（模拟） */}
        <div className="hairline-t px-5 py-1.5 flex items-center gap-2 text-[11.5px]" style={{ color: 'var(--ui-fg-faint)' }}>
          <TerminalSquare size={13} />
          <span>工具时间线（MOCK）：network.probe ✓ · file.write ⏳ 待审批 · 2 个历史执行</span>
        </div>

        {/* 输入框 */}
        <div className="p-4">
          <div className="flat-panel p-2 flex items-end gap-2" style={{ boxShadow: 'var(--shadow-nous)' }}>
            <textarea
              className="input flex-1"
              style={{ border: 'none', background: 'transparent', resize: 'none', boxShadow: 'none' }}
              rows={2}
              placeholder="输入消息…（原型：发送后返回模拟回复）"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            />
            <button className="btn btn-primary" onClick={send} disabled={!input.trim() || sending}>
              <SendHorizonal size={14} />发送
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
