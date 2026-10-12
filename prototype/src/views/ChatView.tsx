import {
  CheckCircle2, ChevronDown, ChevronRight, History, Loader2,
  MessageSquarePlus, PanelLeftClose, PanelLeftOpen, RotateCcw,
  SendHorizonal, ShieldAlert, ShieldCheck, TerminalSquare, WifiOff, Wrench, XCircle
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MockBadge } from '../components/MockBadge'
import {
  mockMessages, mockSessions, mockToolRuns,
  type Approval, type ChatMessage, type ToolRun
} from '../mock/data'

/* ---------- Agent 状态机 ---------- */
type AgentState = 'idle' | 'thinking' | 'tool-running' | 'awaiting-approval' | 'error'

const STATE_META: Record<AgentState, { label: string; color: string; spin?: boolean }> = {
  idle: { label: '就绪', color: 'var(--success)' },
  thinking: { label: 'Hermes 思考中…', color: 'var(--accent)', spin: true },
  'tool-running': { label: '工具执行中…', color: 'var(--accent)', spin: true },
  'awaiting-approval': { label: '等待你的审批', color: 'var(--warning)' },
  error: { label: '上次工具执行失败', color: 'var(--danger)' }
}

const riskColor = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)' } as const
const riskLabel = { low: '低风险', medium: '中风险', high: '高风险' } as const

/* ---------- 审批卡：高风险两步确认，不可误触 ---------- */
function ApprovalCard({ a, onDecide }: { a: Approval; onDecide: (id: string, ok: boolean) => void }) {
  const [confirming, setConfirming] = useState<'approve' | 'deny' | null>(null)

  useEffect(() => { setConfirming(null) }, [a.status])

  if (a.status !== 'pending') {
    return (
      <div className="surface p-3 text-[12px] msg-stream" role="status">
        {a.status === 'approved'
          ? <span style={{ color: 'var(--success)' }}><CheckCircle2 size={13} className="inline mr-1" />已批准</span>
          : <span style={{ color: 'var(--danger)' }}><XCircle size={13} className="inline mr-1" />已拒绝</span>}
        <span style={{ color: 'var(--fg-tertiary)' }} className="ml-2">{a.title}</span>
      </div>
    )
  }

  const approve = () => {
    if (a.risk === 'high' && confirming !== 'approve') { setConfirming('approve'); return }
    onDecide(a.id, true)
  }
  const deny = () => {
    if (a.risk === 'high' && confirming !== 'deny') { setConfirming('deny'); return }
    onDecide(a.id, false)
  }

  return (
    <section aria-label={`待审批：${a.title}`} className="surface-overlay p-4 approval-card">
      <div className="flex items-center gap-2 mb-1.5">
        {a.risk === 'high'
          ? <ShieldAlert size={15} style={{ color: riskColor[a.risk] }} aria-hidden />
          : <ShieldCheck size={15} style={{ color: riskColor[a.risk] }} aria-hidden />}
        <span className="font-semibold text-[13px]">需要你的审批</span>
        <span className="chip" style={{ color: riskColor[a.risk], borderColor: riskColor[a.risk] }}>{riskLabel[a.risk]}</span>
        <MockBadge />
      </div>
      <div className="font-medium text-[13px] mb-1">{a.title}</div>
      <p className="text-[12px] mb-3" style={{ color: 'var(--fg-secondary)' }}>{a.detail}</p>
      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-[12px] font-medium" style={{ color: 'var(--danger)' }}>
            {confirming === 'approve' ? '再次确认批准？此操作影响本机网络。' : '再次确认拒绝？'}
          </span>
          <button className={`btn ${confirming === 'approve' ? 'btn-primary' : 'btn-danger'}`} onClick={() => onDecide(a.id, confirming === 'approve')} autoFocus>
            确认{confirming === 'approve' ? '批准' : '拒绝'}
          </button>
          <button className="btn" onClick={() => setConfirming(null)}>取消</button>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <button className="btn btn-primary" onClick={approve}>批准</button>
          <button className="btn btn-danger" onClick={deny}>拒绝</button>
          <span className="text-[11px]" style={{ color: 'var(--fg-tertiary)' }}>
            {a.risk === 'high' ? '高风险操作需要两步确认' : '点击即生效，可在下方看到结果'}
          </span>
        </div>
      )}
    </section>
  )
}

/* ---------- 消息行 ---------- */
function MessageRow({ m }: { m: ChatMessage }) {
  if (m.role === 'tool') {
    const ok = m.toolStatus === 'ok'
    return (
      <div className="msg-stream flex items-start gap-2.5 py-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-subtle)' }}>
          <Wrench size={14} style={{ color: ok ? 'var(--accent)' : 'var(--danger)' }} aria-hidden />
        </div>
        <div className="surface px-3 py-2 text-[12.5px] flex-1" style={ok ? undefined : { borderColor: 'var(--danger)' }}>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <code className="text-[11.5px]" style={{ color: ok ? 'var(--accent)' : 'var(--danger)' }}>{m.toolName}</code>
            <span className="chip" style={{ color: ok ? 'var(--success)' : 'var(--danger)', borderColor: ok ? 'var(--success)' : 'var(--danger)' }}>
              {ok ? '执行成功' : m.toolStatus === 'running' ? '执行中…' : '失败'}
            </span>
          </div>
          <div style={{ color: 'var(--fg-secondary)' }}>{m.text}</div>
          {!ok && <button className="btn mt-2" style={{ padding: '3px 9px', fontSize: 11 }}><RotateCcw size={11} />重试（模拟）</button>}
        </div>
      </div>
    )
  }
  const mine = m.role === 'user'
  return (
    <div className={`msg-stream flex ${mine ? 'justify-end' : 'justify-start'} py-1.5`}>
      <div
        className="max-w-[85%] px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap"
        style={mine
          ? { background: 'var(--accent)', color: 'var(--accent-fg)', borderRadius: 'var(--radius-lg) var(--radius-lg) 4px var(--radius-lg)' }
          : { background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) 4px' }}
      >
        {m.text}
        <div className="text-[10px] mt-1 opacity-60">{m.time}</div>
      </div>
    </div>
  )
}

/* ---------- 可折叠工具时间线 ---------- */
function ToolTimeline({ runs }: { runs: ToolRun[] }) {
  const [open, setOpen] = useState(false)
  const failed = runs.filter(r => r.status === 'error').length
  return (
    <div className="hairline-t">
      <button
        className="w-full flex items-center gap-2 px-5 py-2 text-[12px]"
        style={{ color: 'var(--fg-secondary)' }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        <TerminalSquare size={13} aria-hidden />
        <span>工具执行时间线（MOCK）· {runs.length} 次{failed > 0 && <span style={{ color: 'var(--danger)' }}> · {failed} 失败</span>}</span>
      </button>
      {open && (
        <div className="px-5 pb-3 flex flex-col gap-1.5 view-enter">
          {runs.map(r => (
            <div key={r.id} className="flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-lg" style={{ background: 'var(--bg-sunken)', borderRadius: 'var(--radius-sm)' }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{
                background: r.status === 'ok' ? 'var(--success)' : r.status === 'running' ? 'var(--accent)' : 'var(--danger)'
              }} aria-hidden />
              <code className="font-medium">{r.name}</code>
              <span style={{ color: 'var(--fg-tertiary)' }} className="truncate flex-1">{r.detail}</span>
              <span style={{ color: 'var(--fg-tertiary)' }}>{r.duration}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------- 空状态 ---------- */
function EmptyState({ onSuggest }: { onSuggest: (t: string) => void }) {
  const suggestions = ['总结今天的审计进展', '帮我规划明天的 AI 早报', '看看有哪些技能可用']
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 py-16 view-enter">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-lg)' }}>
        <MessageSquarePlus size={24} style={{ color: 'var(--accent)' }} aria-hidden />
      </div>
      <h3 className="text-[15px] font-semibold mb-1">开始新的对话</h3>
      <p className="text-[12.5px] mb-5 max-w-[380px]" style={{ color: 'var(--fg-secondary)' }}>
        这是一个空会话（模拟）。在下方输入你的问题，或试试这些：
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map(s => (
          <button key={s} className="btn" onClick={() => onSuggest(s)}>{s}</button>
        ))}
      </div>
    </div>
  )
}

/* ---------- 主视图 ---------- */
export function ChatView({
  approvals, onDecideApproval, connectionOk
}: {
  approvals: Approval[]
  onDecideApproval: (id: string, ok: boolean) => void
  connectionOk: boolean
}) {
  const [activeId, setActiveId] = useState('s1')
  const [input, setInput] = useState('')
  const [extra, setExtra] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [listOpen, setListOpen] = useState(true)
  const timerRef = useRef<number | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // 计时器清理：卸载 / 切换会话时清除未完成的模拟回执
  useEffect(() => () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
  }, [])
  useEffect(() => {
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null }
    setSending(false)
  }, [activeId])

  const messages = useMemo(
    () => [...(mockMessages[activeId] ?? []), ...extra.filter(e => e.id.startsWith(activeId + '-'))],
    [activeId, extra]
  )
  const pending = approvals.filter(a => a.status === 'pending')
  const hasError = messages.some(m => m.role === 'tool' && m.toolStatus === 'error')

  const agentState: AgentState =
    !connectionOk ? 'idle'
    : sending ? 'thinking'
    : hasError ? 'error'
    : pending.length > 0 ? 'awaiting-approval'
    : 'idle'
  const meta = STATE_META[agentState]

  const send = (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || sending || !connectionOk) return
    setSending(true)
    const stamp = new Date().toTimeString().slice(0, 5)
    const key = `${activeId}-${Date.now()}`
    setExtra(prev => [...prev, { id: `${key}-u`, role: 'user', text: t, time: stamp }])
    setInput('')
    timerRef.current = window.setTimeout(() => {
      setExtra(prev => [...prev, {
        id: `${key}-a`, role: 'assistant',
        text: '（模拟回复）收到：「' + t.slice(0, 24) + (t.length > 24 ? '…' : '') + '」。真实集成后这里走 requestGateway("prompt.submit") 流式返回。',
        time: new Date().toTimeString().slice(0, 5)
      }])
      setSending(false)
      timerRef.current = null
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 900)
  }

  const switchSession = (id: string) => {
    if (id === activeId) return
    setActiveId(id)
    setInput('')
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* 会话列表（可折叠） */}
      {listOpen ? (
        <aside aria-label="会话列表" className="shrink-0 flex flex-col transition-all" style={{ width: 248, borderRight: '1px solid var(--border-subtle)', transitionDuration: 'var(--motion-normal)' }}>
          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--fg-secondary)' }}>会话</span>
            <div className="flex items-center gap-1">
              <MockBadge label="MOCK" />
              <button className="btn" style={{ padding: 4 }} onClick={() => setListOpen(false)} aria-label="折叠会话列表" title="折叠会话列表">
                <PanelLeftClose size={14} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5" role="listbox" aria-label="选择会话">
            {mockSessions.map(s => {
              const active = activeId === s.id
              return (
                <button
                  key={s.id}
                  role="option"
                  aria-selected={active}
                  onClick={() => switchSession(s.id)}
                  className="text-left px-3 py-2.5 rounded-lg transition-colors"
                  style={active
                    ? { background: 'var(--accent-soft)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-sm)' }
                    : { border: '1px solid transparent', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium truncate flex-1">{s.title}</span>
                    {s.unread ? (
                      <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>{s.unread}</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>{s.profile} · {s.updatedAt}</div>
                </button>
              )
            })}
          </div>
        </aside>
      ) : (
        <div className="shrink-0 flex flex-col items-center pt-3 gap-2" style={{ width: 48, borderRight: '1px solid var(--border-subtle)' }}>
          <button className="btn" style={{ padding: 6 }} onClick={() => setListOpen(true)} aria-label="展开会话列表" title="展开会话列表">
            <PanelLeftOpen size={15} />
          </button>
          <button className="btn" style={{ padding: 6 }} onClick={() => switchSession('s6')} aria-label="新会话" title="新会话">
            <MessageSquarePlus size={15} />
          </button>
        </div>
      )}

      {/* 对话区 */}
      <section aria-label="对话" className="flex-1 flex flex-col min-w-0">
        <div className="hairline-b px-5 py-2.5 flex items-center gap-2">
          <span className="font-semibold text-[14px]">{mockSessions.find(s => s.id === activeId)?.title}</span>
          {pending.length > 0 && (
            <span className="chip" style={{ color: 'var(--warning)', borderColor: 'var(--warning)' }}>
              <History size={11} aria-hidden />{pending.length} 待审批
            </span>
          )}
          {/* Agent 状态（aria-live 播报） */}
          <span className="chip ml-auto" role="status" aria-live="polite" style={{ color: meta.color, borderColor: meta.color }}>
            {meta.spin && <Loader2 size={11} className="animate-spin" aria-hidden />}
            {meta.label}
          </span>
        </div>

        {/* 断连横幅 */}
        {!connectionOk && (
          <div className="px-5 py-2.5 flex items-center gap-2 text-[12.5px] view-enter" role="alert"
            style={{ background: 'var(--danger-soft)', borderBottom: '1px solid var(--danger)', color: 'var(--danger)' }}>
            <WifiOff size={14} aria-hidden />
            <span className="font-medium">连接已断开（模拟）</span>
            <span style={{ color: 'var(--fg-secondary)' }}>— 消息发送已禁用，点击顶栏连接状态可恢复</span>
          </div>
        )}

        {/* 消息流（阅读宽度 + 会话切换过渡） */}
        <div className="flex-1 overflow-y-auto px-5 py-4" key={activeId}>
          <div className="reading-col view-enter">
            {messages.length === 0 && !sending ? (
              <EmptyState onSuggest={t => { setInput(t); inputRef.current?.focus() }} />
            ) : (
              <>
                {pending.length > 0 && activeId === 's1' && (
                  <div className="flex flex-col gap-2.5 mb-4" aria-label="待审批事项">
                    {pending.map(a => <ApprovalCard key={a.id} a={a} onDecide={onDecideApproval} />)}
                    {approvals.some(a => a.status !== 'pending') && (
                      <div className="flex flex-col gap-2">
                        {approvals.filter(a => a.status !== 'pending').map(a => <ApprovalCard key={a.id} a={a} onDecide={onDecideApproval} />)}
                      </div>
                    )}
                  </div>
                )}
                {messages.map(m => <MessageRow key={m.id} m={m} />)}
                {sending && (
                  <div className="flex items-center gap-2 text-[12px] py-2" style={{ color: 'var(--fg-tertiary)' }} role="status">
                    <Loader2 size={13} className="animate-spin" aria-hidden />
                    Hermes 正在输入（模拟）…
                  </div>
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>
        </div>

        {/* 工具时间线（可折叠） */}
        <ToolTimeline runs={mockToolRuns} />

        {/* 输入区 */}
        <div className="p-4">
          <div className="reading-col">
            <div className="surface-overlay p-2 flex items-end gap-2">
              <label htmlFor="composer" className="sr-only">输入消息，Enter 发送，Shift+Enter 换行</label>
              <textarea
                id="composer"
                ref={inputRef}
                className="input flex-1"
                style={{ border: 'none', background: 'transparent', resize: 'none', boxShadow: 'none' }}
                rows={2}
                placeholder={connectionOk ? '输入消息… Enter 发送，Shift+Enter 换行（原型：返回模拟回复）' : '已断连（模拟），无法发送'}
                value={input}
                disabled={!connectionOk}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
                  if (e.key === 'Escape') { inputRef.current?.blur() }
                }}
              />
              <button className="btn btn-primary" onClick={() => send()} disabled={!input.trim() || sending || !connectionOk} aria-label="发送消息">
                <SendHorizonal size={14} aria-hidden />发送
              </button>
            </div>
            <p className="text-[11px] mt-1.5 text-center" style={{ color: 'var(--fg-tertiary)' }}>
              Enter 发送 · Shift+Enter 换行 · Esc 取消聚焦
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
