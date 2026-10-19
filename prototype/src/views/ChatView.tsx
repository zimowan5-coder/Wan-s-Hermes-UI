import {
  ArrowUp, CheckCircle2, Check, ChevronDown, ChevronRight, Copy, History, Loader2,
  MessageSquarePlus, PanelLeftClose, PanelLeftOpen, RotateCcw,
  Search, Sparkles, ShieldAlert, ShieldCheck, TerminalSquare, WifiOff, Wrench, XCircle
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MockBadge } from '../components/MockBadge'
import { HermesMark } from '../components/Shell'
import { Modal } from '../components/Modal'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { AgentState } from '../data/types'
import { useChatSession, useSessionList } from '../hooks/useChatSession'
import { pendingApprovalsForSession } from '../lib/session-state'
import {
  type Approval, type ChatMessage, type ToolRun
} from '../data/types'

const STATE_META: Record<AgentState, { label: string; color: string; spin?: boolean }> = {
  idle: { label: '就绪', color: 'var(--success)' },
  thinking: { label: 'Hermes 思考中…', color: 'var(--accent)', spin: true },
  'tool-running': { label: '工具执行中…', color: 'var(--accent)', spin: true },
  'awaiting-approval': { label: '等待你的审批', color: 'var(--warning)' },
  error: { label: '本会话有工具执行失败', color: 'var(--danger)' }
}

const riskColor = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)' } as const
const riskLabel = { low: '低风险', medium: '中风险', high: '高风险' } as const

/* ---------- 审批卡 ----------
 * 焦点安全：进入二次确认时焦点落在「取消」（安全默认），绝不自动落在危险按钮上；
 * 确认危险操作必须是明确的用户行为（Tab 到确认按钮后按 Enter/Space，或点击）。
 * Esc 取消二次确认。状态变化经 aria-live 播报。 */
function ApprovalCard({ a, onDecide }: { a: Approval; onDecide: (id: string, ok: boolean) => Promise<boolean> }) {
  const [confirming, setConfirming] = useState<'approve' | 'deny' | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const [deciding, setDeciding] = useState(false)
  const [decisionFailed, setDecisionFailed] = useState(false)
  const decideOnce = async (ok: boolean) => {
    if (deciding) return
    setDeciding(true); setDecisionFailed(false)
    try { const applied = await onDecide(a.id, ok); if (!applied) setDecisionFailed(true) }
    finally { setDeciding(false) }
  }

  useEffect(() => { setConfirming(null) }, [a.status, a.id])

  // 进入二次确认时，把焦点放到安全操作（取消）上
  useEffect(() => {
    if (confirming) cancelRef.current?.focus()
  }, [confirming])

  if (a.status !== 'pending') {
    return (
      <div className="approval-receipt text-[12px] msg-stream" role="status">
        {a.status === 'approved'
          ? <span style={{ color: 'var(--success)' }}><CheckCircle2 size={13} className="inline mr-1" aria-hidden />已批准</span>
          : <span style={{ color: 'var(--danger)' }}><XCircle size={13} className="inline mr-1" aria-hidden />已拒绝</span>}
        <span style={{ color: 'var(--fg-tertiary)' }} className="ml-2">{a.title}</span>
      </div>
    )
  }

  const approve = () => {
    if (a.risk === 'high' && confirming !== 'approve') { setConfirming('approve'); return }
    void decideOnce(true)
  }
  const deny = () => {
    if (a.risk === 'high' && confirming !== 'deny') { setConfirming('deny'); return }
    void decideOnce(false)
  }
  const cancelConfirm = () => setConfirming(null)

  return (
    <section aria-label={`待审批：${a.title}`} className="approval-card p-4">
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
        <div
          className="flex items-center gap-2 flex-wrap"
          role="alertdialog"
          aria-label="二次确认"
          aria-describedby={`confirm-desc-${a.id}`}
          onKeyDown={e => { if (e.key === 'Escape') cancelConfirm() }}
        >
          <span id={`confirm-desc-${a.id}`} className="text-[12px] font-medium w-full" style={{ color: 'var(--danger)' }} role="status">
            {confirming === 'approve' ? `请再次确认批准：${a.detail}` : '请再次确认拒绝该请求。'}
          </span>
          <button ref={cancelRef} className="btn" onClick={cancelConfirm}>取消（Esc）</button>
          <button
            className={`btn ${confirming === 'approve' ? 'btn-primary' : 'btn-danger'}`}
            disabled={deciding} onClick={() => void decideOnce(confirming === 'approve')}
          >
            确认{confirming === 'approve' ? '批准' : '拒绝'}
          </button>
          <span className="text-[11px]" style={{ color: 'var(--fg-tertiary)' }}>仅影响演示数据，不会执行真实操作</span>
        </div>
      ) : (
        <div className="flex gap-2 items-center">
          <button className="btn btn-primary" disabled={deciding} onClick={approve}>批准</button>
          <button className="btn btn-danger" disabled={deciding} onClick={deny}>拒绝</button>
          <span className="text-[11px]" style={{ color: 'var(--fg-tertiary)' }}>
            {a.risk === 'high' ? '高风险操作需要两步确认' : '点击即生效，可在下方看到结果'}
          </span>
        </div>
      )}
      {deciding && <p className="t-caption mt-2" role="status">正在保存决定…</p>}
      {decisionFailed && <p className="text-[12px] mt-2" style={{ color: 'var(--danger)' }} role="alert">决定未保存，请再试一次。</p>}
    </section>
  )
}

/* ---------- 消息行 ---------- */
function MessageRow({ m }: { m: ChatMessage }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const copyTimer = useRef<number | null>(null)
  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current) }, [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.text)
    } catch {
      setCopyError(true)
      return
    }
    setCopyError(false)
    setCopied(true)
    if (copyTimer.current) window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopied(false), 1600)
  }

  if (m.role === 'tool') {
    const ok = m.toolStatus === 'ok'
    const running = m.toolStatus === 'running'
    return (
      <div className="msg-stream flex items-start gap-2.5 py-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--accent-soft)', border: '1px solid var(--border-subtle)' }}>
          {running
            ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} aria-hidden />
            : <Wrench size={14} style={{ color: ok ? 'var(--accent)' : 'var(--danger)' }} aria-hidden />}
        </div>
        <div className="surface px-3 py-2 text-[12.5px] flex-1" style={ok || running ? undefined : { borderColor: 'var(--danger)' }}>
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <code className="text-[11.5px]" style={{ color: ok ? 'var(--accent)' : running ? 'var(--accent)' : 'var(--danger)' }}>{m.toolName}</code>
            <span className="chip" role="status"
              style={{ color: ok ? 'var(--success)' : running ? 'var(--accent)' : 'var(--danger)', borderColor: ok ? 'var(--success)' : running ? 'var(--accent)' : 'var(--danger)' }}>
              {ok ? '执行成功' : running ? '执行中…（模拟）' : '失败'}
            </span>
          </div>
          <div style={{ color: 'var(--fg-secondary)' }}>{m.text}</div>
          {!ok && !running && (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--fg-tertiary)' }}>失败详情见下方工具时间线，可在那重试（模拟）。</p>
          )}
        </div>
      </div>
    )
  }
  const mine = m.role === 'user'
  if (!mine) {
    /* 助手消息：纯文本排版，无气泡（内容优先） */
    return (
      <div className="msg-stream assistant-message group">
        <div className="message-author"><HermesMark /><span>Hermes</span><span className="author-caption">与你一起思考</span></div>
        <div className="text-[14px] leading-[1.65] whitespace-pre-wrap" style={{ color: 'var(--fg-primary)' }}>
          {m.text}
        </div>
        <div className="message-meta flex items-center gap-2">
          <span style={{ color: 'var(--fg-tertiary)' }}>{m.time}</span>
          <button
            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center gap-1 rounded px-1 py-0.5"
            style={{ color: 'var(--fg-tertiary)' }}
            onClick={copy}
            aria-label={copied ? '已复制' : '复制消息'}
            title="复制消息"
          >
            {copied ? <Check size={11} aria-hidden /> : <Copy size={11} aria-hidden />}
            {copied && <span>已复制</span>}
            {copyError && <span role="alert">复制失败，请选择文本复制</span>}
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="msg-stream flex justify-end py-1.5">
      <div
        className="user-message max-w-[85%] px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap"
        style={{ background: 'var(--message-user)', color: 'var(--message-user-fg)', borderRadius: '20px 20px 6px 20px' }}
      >
        {m.text}
        <div className="text-[10px] mt-1 opacity-70">{m.time}</div>
      </div>
    </div>
  )
}

/* ---------- 可折叠工具时间线（会话级，失败行可重试） ---------- */
function ToolTimeline({ runs, onRetry }: { runs: ToolRun[]; onRetry: (runId: string) => void }) {
  const [open, setOpen] = useState(false)
  const failed = runs.filter(r => r.status === 'error').length
  const running = runs.filter(r => r.status === 'running').length
  return (
    <div className="tool-timeline">
      <button
        className="w-full flex items-center gap-2 px-5 py-2 text-[12px]"
        style={{ color: 'var(--fg-secondary)' }}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
        <TerminalSquare size={13} aria-hidden />
        <span>
          执行记录 · {runs.length} 次
          {running > 0 && <span style={{ color: 'var(--accent)' }}> · {running} 执行中</span>}
          {failed > 0 && <span style={{ color: 'var(--danger)' }}> · {failed} 失败</span>}
        </span>
      </button>
      {open && (
        <div className="timeline-runs px-5 pb-3 flex flex-col gap-1.5 view-enter">
          {runs.length === 0 && <p className="text-[12px]" style={{ color: 'var(--fg-tertiary)' }}>本会话暂无工具执行记录。</p>}
          {runs.map(r => (
            <div key={r.id} className="flex items-center gap-2.5 text-[12px] px-3 py-2 rounded-lg" style={{ background: 'var(--bg-sunken)', borderRadius: 'var(--radius-sm)' }} role="status">
              <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === 'running' ? 'pulse-dot' : ''}`} style={{
                background: r.status === 'ok' ? 'var(--success)' : r.status === 'running' ? 'var(--accent)' : 'var(--danger)'
              }} aria-hidden />
              <code className="font-medium">{r.name}</code>
              <span style={{ color: 'var(--fg-tertiary)' }} className="truncate flex-1">{r.detail}</span>
              {r.status === 'error' && (
                <button className="btn shrink-0" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => onRetry(r.id)}>
                  <RotateCcw size={11} aria-hidden />重试（模拟）
                </button>
              )}
              <span style={{ color: 'var(--fg-tertiary)' }}>{r.status === 'running' ? '…' : r.duration}</span>
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
    <div className="chat-empty flex flex-col items-center justify-center text-center px-6 py-16 view-enter">
      <div className="empty-orbit" aria-hidden><HermesMark /><span/><span/></div>
      <span className="eyebrow">A LITTLE SPACE FOR BIG IDEAS</span>
      <h3 className="empty-title">有什么想一起完成？</h3>
      <p className="text-[13px] mb-6 max-w-[380px]" style={{ color: 'var(--fg-secondary)' }}>从一个想法开始，剩下的我们一起梳理。<br/>当前为演示会话，不连接真实 Hermes。</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map(s => (
          <button key={s} className="btn" onClick={() => onSuggest(s)}>{s}</button>
        ))}
      </div>
    </div>
  )
}

/* ---------- Slash 命令联想 ----------
 * 命令名取自官方 desktop-slash-commands.ts（真实存在，非编造）；
 * 选择后仅插入文本（模拟），真实集成后走 command.dispatch。 */
const SLASH_COMMANDS: { name: string; desc: string }[] = [
  { name: 'new', desc: '开始新会话（别名 /reset /clear）' },
  { name: 'help', desc: '显示 slash 命令帮助' },
  { name: 'profile', desc: '切换 Hermes profile' },
  { name: 'model', desc: '切换本会话模型' },
  { name: 'skills', desc: '技能管理' },
  { name: 'yolo', desc: '危险命令自动批准开关' },
  { name: 'stop', desc: '停止当前任务' },
  { name: 'branch', desc: '从当前点分支会话' },
  { name: 'title', desc: '重命名当前会话' },
  { name: 'compress', desc: '压缩会话上下文' },
  { name: 'status', desc: '查看会话状态' },
  { name: 'save', desc: '保存会话' }
]

function SlashMenu({
  matches, active, onSelect, onHover
}: {
  matches: typeof SLASH_COMMANDS
  active: number
  onSelect: (i: number) => void
  onHover: (i: number) => void
}) {
  return (
    <div role="listbox" aria-label="slash 命令联想"
      className="surface-overlay absolute bottom-full mb-2 left-0 right-0 overflow-hidden view-enter">
      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-tertiary)' }}>slash 命令</span>
        <MockBadge label="MOCK" />
      </div>
      <div className="max-h-[240px] overflow-y-auto p-1.5">
        {matches.map((c, i) => (
          <button key={c.name} role="option" aria-selected={i === active}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
            style={i === active ? { background: 'var(--accent-soft)' } : {}}
            onMouseEnter={() => onHover(i)}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onSelect(i)}
          >
            <code className="text-[12.5px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>/{c.name}</code>
            <span className="text-[12px] truncate" style={{ color: 'var(--fg-secondary)' }}>{c.desc}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-3.5 py-2 hairline-t text-[10.5px]" style={{ color: 'var(--fg-tertiary)' }}>
        <span><kbd className="chip font-mono">↑↓</kbd> 选择</span>
        <span><kbd className="chip font-mono">↵</kbd> 插入</span>
        <span><kbd className="chip font-mono">esc</kbd> 关闭</span>
      </div>
    </div>
  )
}

/* ---------- 主视图 ----------
 * 数据流：useSessionList / useChatSession → HermesDataSource（当前为 Mock 实现）。
 * 本组件只负责布局与 UI 状态（输入框、折叠），不直接读写 mock 数据。 */
export function ChatView({ connectionOk, newChatRequest = 0 }: { connectionOk: boolean; newChatRequest?: number }) {
  const [activeId, setActiveId] = useState('s1')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const input = drafts[activeId] ?? ''
  const setInput = (text: string) => setDrafts(prev => ({ ...prev, [activeId]: text }))
  const narrow = useMediaQuery('(max-width: 1000px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [listOpen, setListOpen] = useState(() => !window.matchMedia('(max-width: 1000px)').matches)
  const [sessionSearch, setSessionSearch] = useState('')
  const [cursor, setCursor] = useState(0)
  const [slashActive, setSlashActive] = useState(0)
  const [slashOff, setSlashOff] = useState(false) // Esc 手动关闭后，本次输入不再弹出
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const followRef = useRef(false)
  const activeRef = useRef(activeId)
  activeRef.current = activeId

  const sessions = useSessionList()
  const {
    messages, runs, sending, loading, error, actionError, approvals,
    sessionPending, sessionDecided,
    agentState, send, decide, retry, reload
  } = useChatSession(activeId)

  const meta = STATE_META[agentState]
  const activeSession = sessions.find(s => s.id === activeId)

  useEffect(() => { setListOpen(!narrow) }, [narrow])
  useEffect(() => { if (newChatRequest > 0) { setActiveId('s6'); if (narrow) setListOpen(false); inputRef.current?.focus() } }, [newChatRequest])
  useEffect(() => {
    if (sessions.length && !sessions.some(s => s.id === activeId)) setActiveId(sessions[0].id)
  }, [sessions, activeId])
  useEffect(() => {
    if (followRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reducedMotion ? 'instant' : 'smooth' })
  }, [messages, sending, reducedMotion])

  const handleSend = (text?: string) => {
    const t = (text ?? input).trim()
    if (!t || sending || loading || error || !connectionOk) return
    const origin = activeId
    followRef.current = true
    setInput('')
    void send(t).then(ok => { if (!ok) setDrafts(prev => prev[origin] ? prev : ({ ...prev, [origin]: t })) })
  }

  const switchSession = (id: string) => {
    if (narrow) setListOpen(false)
    if (id === activeId) return
    followRef.current = false
    setActiveId(id)
    setSlashOff(false)
    setCursor(drafts[id]?.length ?? 0)
  }

  /* slash 联想：取光标前的 /xxx token（行首或空白后） */
  const slashToken = (() => {
    const before = input.slice(0, cursor)
    const m = /(^|\s)\/([a-z-]*)$/.exec(before)
    return m ? { query: m[2], start: cursor - m[2].length - 1 } : null
  })()
  const slashMatches = slashToken
    ? SLASH_COMMANDS.filter(c => c.name.includes(slashToken.query)).slice(0, 8)
    : []
  const slashOpen = slashToken !== null && slashMatches.length > 0 && connectionOk && !slashOff

  const syncCursor = () => setCursor(inputRef.current?.selectionStart ?? input.length)

  const insertSlash = (i: number) => {
    if (!slashToken || !slashMatches[i]) return
    const cmd = slashMatches[i].name
    const next = input.slice(0, slashToken.start) + '/' + cmd + ' ' + input.slice(cursor)
    const pos = slashToken.start + cmd.length + 2
    setInput(next)
    setSlashActive(0)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(pos, pos)
      setCursor(pos)
    })
  }

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (slashOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashActive(a => Math.min(slashMatches.length - 1, a + 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashActive(a => Math.max(0, a - 1)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertSlash(slashActive); return }
      if (e.key === 'Escape') { e.preventDefault(); setSlashOff(true); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { inputRef.current?.blur() }
  }

  const sessionPanel = (
    <aside aria-label="会话列表" className="session-sidebar">
          <div className="px-3 pt-3 pb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold">会话</span>
            <div className="flex items-center gap-1">
              <button className="icon-btn" aria-label="打开空白演示会话" title="空白演示会话" onClick={() => switchSession('s6')}><MessageSquarePlus size={16}/></button>
              {narrow && <button className="icon-btn" onClick={() => setListOpen(false)} aria-label="折叠会话列表" title="折叠会话列表">
                <PanelLeftClose size={16} aria-hidden />
              </button>}
            </div>
          </div>
          <label className="session-search"><Search size={14} aria-hidden/><input aria-label="搜索会话" placeholder="搜索会话" value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}/></label>
          <span className="sidebar-section">最近会话</span>
          <div className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5" role="group" aria-label="选择会话">
            {sessions.filter(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase())).map(s => {
              const active = activeId === s.id
              const pCount = pendingApprovalsForSession(approvals, s.id).length
              return (
                <button
                  key={s.id}
                  aria-pressed={active}
                  onClick={() => switchSession(s.id)}
                  className="session-row text-left w-full px-3 py-3 transition-colors"
                  style={active
                    ? { background: 'var(--session-selected)', borderRadius: 12 }
                    : { borderRadius: 10 }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-fill)' }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium truncate flex-1">{s.title}</span>
                    {pCount > 0 && (
                      <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }} title={`${pCount} 待审批`}>{pCount}</span>
                    )}
                    {s.unread ? (
                      <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>{s.unread}</span>
                    ) : null}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>{s.profile} · {s.updatedAt}</div>
                </button>
              )
            })}
            {sessionSearch && !sessions.some(s => s.title.toLowerCase().includes(sessionSearch.toLowerCase())) && <div className="session-empty-search"><Search size={20}/><p>没有找到会话</p><button className="btn btn-plain" onClick={() => setSessionSearch('')}>清除搜索</button></div>}
          </div>
          <div className="session-footnote"><Sparkles size={13}/><span>草稿按会话保留在本次页面中</span></div>
        </aside>
  )

  return (
    <div className="chat-layout flex flex-1 min-h-0">
      {/* 会话列表（可折叠，数据来自 DataSource） */}
      {listOpen && !narrow && sessionPanel}
      <Modal open={narrow && listOpen} onClose={() => setListOpen(false)} label="会话列表" className="session-sheet">{sessionPanel}</Modal>

      {/* 对话区 */}
      <section aria-label="对话" className="flex-1 flex flex-col min-w-0">
        <div className="chat-header flex items-center gap-2">
          <button className="icon-btn" aria-label={listOpen ? '折叠会话列表' : '展开会话列表'} aria-expanded={listOpen} onClick={() => setListOpen(v => !v)}>{listOpen ? <PanelLeftClose size={17}/> : <PanelLeftOpen size={17}/>}</button>
          <div className="chat-heading"><span className="font-semibold text-[14px]">{activeSession?.title ?? '会话'}</span><span>{activeSession?.profile ?? '默认'} · 演示会话</span></div>
          {sessionPending.length > 0 && (
            <button className="chip approval-jump" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })} style={{ color: 'var(--warning)', background: 'var(--warning-soft)' }}>
              <History size={11} aria-hidden />{sessionPending.length} 待审批
            </button>
          )}
          <span className="agent-status ml-auto" role="status" aria-live="polite" style={{ color: meta.color, borderColor: meta.color }}>
            {meta.spin && <Loader2 size={11} className="animate-spin" aria-hidden />}
            {meta.label}
          </span>
        </div>

        {!connectionOk && (
          <div className="px-5 py-2.5 flex items-center gap-2 text-[12.5px] view-enter" role="alert"
            style={{ background: 'var(--danger-soft)', borderBottom: '1px solid var(--danger)', color: 'var(--danger)' }}>
            <WifiOff size={14} aria-hidden />
            <span className="font-medium">连接已断开（模拟）</span>
            <span style={{ color: 'var(--fg-secondary)' }}>— 消息发送已禁用，点击顶栏连接状态可恢复</span>
          </div>
        )}

        <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto" key={activeId} onScroll={e => { const el = e.currentTarget; followRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 90 }}>
          <div className="reading-col view-enter">
            {loading ? (
              <div className="flex items-center gap-2 py-10 justify-center text-[12.5px]" style={{ color: 'var(--fg-tertiary)' }} role="status">
                <Loader2 size={15} className="animate-spin" aria-hidden />加载会话中…
              </div>
            ) : error ? (
              <div className="surface-overlay p-6 text-center view-enter" role="alert">
                <WifiOff size={20} style={{ color: 'var(--warning)' }} className="mx-auto mb-2" aria-hidden />
                <p className="text-[13px] font-medium" style={{ color: 'var(--fg-primary)' }}>数据加载失败</p>
                <p className="text-[12px] mt-1 max-w-[420px] mx-auto" style={{ color: 'var(--fg-secondary)' }}>{error}</p>
                <button className="btn mt-3" onClick={reload}>重新加载</button>
                <p className="text-[11.5px] mt-2" style={{ color: 'var(--fg-tertiary)' }}>
                  live 模式部分接口尚未实现属预期行为，见 docs/INTEGRATION-PLAN.md §8
                </p>
              </div>
            ) : messages.length === 0 && !sending ? (
              <EmptyState onSuggest={t => { setInput(t); inputRef.current?.focus() }} />
            ) : (
              <>
                {(sessionPending.length > 0 || sessionDecided.length > 0) && (
                  <div className="flex flex-col gap-2.5 mb-4" aria-label="审批事项">
                    {sessionPending.map(a => <ApprovalCard key={a.id} a={a} onDecide={decide} />)}
                    {sessionDecided.map(a => <ApprovalCard key={a.id} a={a} onDecide={decide} />)}
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

        <ToolTimeline runs={runs} onRetry={retry} />

        <div className="composer-area">
          <div className="reading-col">
            {actionError && <p className="action-error" role="alert">操作未完成：{actionError}。草稿已保留，请核对后再试。</p>}
            <div className={`composer flex items-end gap-2 relative ${sending ? 'is-sending' : ''}`}>
              <label htmlFor="composer" className="sr-only">输入消息，Enter 发送，Shift+Enter 换行，/ 唤起命令联想</label>
              {slashOpen && (
                <SlashMenu matches={slashMatches} active={slashActive} onSelect={insertSlash} onHover={setSlashActive} />
              )}
              <textarea
                id="composer"
                ref={inputRef}
                className="flex-1"
                style={{ border: 'none', background: 'transparent', resize: 'none', boxShadow: 'none', outline: 'none', fontSize: '14px', color: 'var(--fg-primary)', padding: '7px 0' }}
                rows={1}
                onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.min(160, el.scrollHeight)}px` }}
                placeholder={connectionOk ? '发消息给 Hermes…' : '已断连（模拟），无法发送'}
                value={input}
                disabled={!connectionOk || loading || !!error}
                onChange={e => { setInput(e.target.value); setSlashOff(false); setSlashActive(0) }}
                onSelect={syncCursor}
                onKeyUp={syncCursor}
                onClick={syncCursor}
                onKeyDown={onComposerKeyDown}
              />
              <button className="btn btn-primary" style={{ borderRadius: '50%', width: 34, height: 34, padding: 0 }} onClick={() => handleSend()} disabled={!input.trim() || sending || loading || !!error || !connectionOk} aria-label="发送消息">
                <ArrowUp size={18} aria-hidden />
              </button>
            </div>
            <p className="composer-hint t-micro">
              <span><kbd>↵</kbd> 发送 <span className="composer-extra">· Shift + ↵ 换行 · / 命令</span></span><span>回复与操作均为模拟</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
