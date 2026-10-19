import {
  ArrowUp, AudioLines, CheckCircle2, Check, ChevronDown, ChevronRight, Copy, File, FileText, Folder, History, Image as ImageIcon,
  Link2, ListChecks, Loader2, Mic, MoreHorizontal, Paperclip, Plus, RotateCcw, ShieldAlert, ShieldCheck,
  Square, TerminalSquare, Users, WifiOff, Wrench, X, XCircle, Zap
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MockBadge } from '../components/MockBadge'
import { HermesMark, ToolbarPortal } from '../components/Shell'
import { Menu, type MenuEntry } from '../components/Menu'
import { Modal } from '../components/Modal'
import { RightPanel } from '../components/RightPanel'
import { useMediaQuery } from '../hooks/useMediaQuery'
import type { AgentState } from '../data/types'
import { useChatSession } from '../hooks/useChatSession'
import type { MergedSession } from '../lib/sessions'
import type { InterfaceMode } from '../lib/prefs'
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
          ? <ShieldAlert size={15} style={{ color: 'var(--fg-secondary)' }} aria-hidden />
          : <ShieldCheck size={15} style={{ color: 'var(--fg-secondary)' }} aria-hidden />}
        <span className="font-semibold text-[13px]">需要你的审批</span>
        <span className="risk-label"><span className="status-dot" style={{ background: riskColor[a.risk] }} aria-hidden />{riskLabel[a.risk]}</span>
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
      <HermesMark className="empty-mark" />
      <p className="empty-greeting">Wan，你好</p>
      <h3 className="empty-title">有什么想一起完成？</h3>
      <div className="flex flex-wrap gap-2 justify-center">
        {suggestions.map(s => (
          <button key={s} className="btn suggestion-chip" onClick={() => onSuggest(s)}>{s}</button>
        ))}
      </div>
    </div>
  )
}

/* ---------- 斜杠命令与 @ 引用 ----------
 * 命令名与说明取自官方 apps/desktop/src/i18n/zh.ts composer.commandDescs（真实存在，非编造）；
 * 选择后只插入文本（模拟），真实集成后由后端执行。 */
const SLASH_COMMANDS: { name: string; desc: string }[] = [
  ['new', '开始新的桌面对话'], ['help', '显示桌面端斜线命令'], ['model', '切换此会话的模型'], ['reasoning', '管理推理强度和显示方式'],
  ['profile', '切换活跃的 Hermes 配置档案'], ['personality', '设置预定义人格'], ['title', '重命名当前会话'], ['branch', '将最新消息分支到新对话'],
  ['retry', '重试最后一条消息'], ['undo', '回退 N 个用户回合并重新提示'], ['copy', '复制所选内容或最后一条助手消息'], ['stop', '停止当前回合与后台进程'],
  ['queue', '排队、查看、编辑或清空下一轮提示词'], ['steer', '在下一次工具调用后插入消息，不中断当前工作'], ['btw', '不中断当前对话，问一个旁支问题'],
  ['bg', '在独立的后台会话中运行提示词'], ['goal', '设置持续目标，跨回合工作直到完成'], ['subgoal', '为活跃目标添加额外条件'], ['plan', '写一份实施计划，不执行任何操作'],
  ['loop', '以固定间隔重新运行提示词'], ['heartbeat', '设置周期性提示词，在空闲时重新进入此会话'], ['review', '派一个子代理审查刚才的工作'],
  ['moa', '用多智能体协作组合运行提示词'], ['agents', '显示活跃代理与正在运行的任务'], ['compress', '压缩此对话的上下文'], ['context', '显示上下文窗口用量与明细'],
  ['status', '显示当前会话状态'], ['usage', '显示词元用量与速率限制'], ['memory', '查看待处理的记忆写入'], ['refine', '把这次对话的心得保存到记忆或技能'],
  ['learn', '从你描述的内容学习可复用的技能'], ['journey', '打开记忆图谱'], ['tools', '管理工具'], ['bundles', '列出技能包'],
  ['yolo', '自动批准危险命令（慎用）'], ['approvals', '显示或设置危险命令批准模式'], ['handoff', '将此会话移交到消息平台'], ['save', '将当前对话保存为 JSON'],
  ['export', '导出配置档案为可分享的归档'], ['import', '导入共享的配置档案归档'], ['rollback', '列出或还原文件系统检查点'], ['diff', '显示工作目录中的 Git 更改'],
  ['worktree', '显示、创建或清理隔离的 Git worktree'], ['init', '扫描仓库并生成 AGENTS.md'], ['browser', '管理智能体浏览器'], ['focus', '专注视图：只显示提示词与最终回复'],
  ['timestamps', '切换消息时间戳'], ['skin', '切换桌面主题'], ['wake', '控制唤醒词监听'], ['pet', '切换或领养桌面宠物'],
  ['suggestions', '查看建议的自动化项目'], ['blueprint', '用模板设置自动化'], ['pause', '暂停全局新任务（紧急停止）'], ['platform', '暂停、恢复或列出网关平台'],
  ['version', '显示 Hermes Agent 版本'], ['debug', '上传调试报告并获取链接'], ['palette', '打开命令面板']
].map(([name, desc]) => ({ name, desc }))
const MENTIONS: { name: string; desc: string }[] = [
  { name: 'docs/审计报告-阶段1.md', desc: '文件' }, { name: 'docs/', desc: '文件夹' }, { name: 'butler/config.yaml', desc: '文件' },
  { name: 'https://github.com/NousResearch/hermes-agent', desc: '网址' }, { name: 'git:main', desc: 'Git 分支' }
]

function SuggestMenu({ kind, matches, active, onSelect, onHover }: {
  kind: '/' | '@'
  matches: { name: string; desc: string }[]
  active: number
  onSelect: (i: number) => void
  onHover: (i: number) => void
}) {
  return (
    <div role="listbox" aria-label={kind === '/' ? 'slash 命令联想' : '引用联想'}
      className="surface-overlay suggest-menu absolute bottom-full mb-2 left-0 right-0 overflow-hidden view-enter">
      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
        <span className="text-[11px] font-semibold" style={{ color: 'var(--fg-tertiary)' }}>{kind === '/' ? '斜杠命令' : '引用文件、文件夹、网址'}</span>
      </div>
      <div className="max-h-[260px] overflow-y-auto p-1.5">
        {matches.map((c, i) => (
          <button key={c.name} role="option" aria-selected={i === active}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
            style={i === active ? { background: 'var(--accent-soft)' } : {}}
            onMouseEnter={() => onHover(i)}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onSelect(i)}
          >
            <code className="text-[12.5px] font-mono font-semibold shrink-0" style={{ color: 'var(--accent)' }}>{kind === '/' ? '/' : '@'}{c.name}</code>
            <span className="text-[12px] truncate" style={{ color: 'var(--fg-secondary)' }}>{c.desc}</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3 px-3.5 py-2 hairline-t text-[11px]" style={{ color: 'var(--fg-tertiary)' }}>
        <span><kbd className="chip font-mono">↑↓</kbd> 选择</span>
        <span><kbd className="chip font-mono">↵</kbd> 插入</span>
        <span><kbd className="chip font-mono">esc</kbd> 关闭</span>
      </div>
    </div>
  )
}

/* ---------- 模型选择器（模型 · 推理强度 · 快速模式，对应官方 shell.modelOptions） ---------- */
const MODELS = ['Hermes 4 405B', 'Hermes 4 70B', 'Hermes 3 8B · 本地']
const EFFORTS = [{ id: 'low', label: '低' }, { id: 'medium', label: '中' }, { id: 'high', label: '高' }] as const
type Effort = typeof EFFORTS[number]['id']

function ModelPicker({ model, setModel, effort, setEffort, fast, setFast }: {
  model: string; setModel: (m: string) => void; effort: Effort; setEffort: (e: Effort) => void; fast: boolean; setFast: (f: boolean) => void
}) {
  return <Menu label="模型与推理" placement="top" width={260} trigger={t =>
    <button {...t} className="composer-chip" aria-label={`模型：${model}，推理强度${EFFORTS.find(e => e.id === effort)!.label}`} title="切换模型 · Ctrl+Shift+M">
      {fast && <Zap size={12} aria-hidden/>}{model}<span className="composer-chip-sub">· {EFFORTS.find(e => e.id === effort)!.label}</span><ChevronDown size={12} aria-hidden/>
    </button>}>
    {close => <div className="model-picker">
      <div className="menu-heading">模型（演示）</div>
      {MODELS.map(m => <button key={m} role="menuitemradio" aria-checked={m === model} className="menu-item" onClick={() => { setModel(m); close() }}>
        <span className="flex-1">{m}</span>{m === model && <span className="menu-check">✓</span>}
      </button>)}
      <div className="menu-sep"/>
      <div className="menu-heading">推理强度</div>
      <div className="seg mx-2 mb-2" role="radiogroup" aria-label="推理强度">
        {EFFORTS.map(e => <button key={e.id} role="radio" aria-checked={effort === e.id} className={`seg-btn flex-1 ${effort === e.id ? 'active' : ''}`} onClick={() => setEffort(e.id)}>{e.label}</button>)}
      </div>
      <label className="menu-item cursor-pointer"><Zap size={14} aria-hidden/><span className="flex-1">快速模式</span>
        <input type="checkbox" checked={fast} onChange={e => setFast(e.target.checked)} className="accent-[var(--accent)]"/></label>
    </div>}
  </Menu>
}

/* ---------- 输入框上方的状态条：任务进度、子代理、排队（对应官方 statusStack） ---------- */
const MOCK_TODOS: Record<string, { text: string; done: boolean }[]> = {
  s1: [{ text: '汇总探测结果', done: true }, { text: '标出 IPv6 直连', done: true }, { text: '整理修复清单', done: false }, { text: '存档审计报告', done: false }]
}
const MOCK_SUBAGENTS: Record<string, number> = { s1: 1 }

type Attachment = { id: string; kind: 'file' | 'folder' | 'image' | 'url'; name: string }
const ATTACH_ICON = { file: File, folder: Folder, image: ImageIcon, url: Link2 }

/* ---------- 主视图 ----------
 * 数据流：useChatSession → HermesDataSource（当前为 Mock 实现）。
 * 会话列表已移到侧边栏；本组件负责对话区、输入框与状态条。 */
export function ChatView({ visible = true, connectionOk, activeId, session, sessionMenu, mode, rightPanelOpen, onCloseRightPanel, onOpenAgents, focusRequest = 0 }: {
  visible?: boolean
  connectionOk: boolean
  activeId: string
  session?: MergedSession
  sessionMenu: MenuEntry[]
  mode: InterfaceMode
  rightPanelOpen: boolean
  onCloseRightPanel: () => void
  onOpenAgents: () => void
  focusRequest?: number
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [queues, setQueues] = useState<Record<string, string[]>>({})
  const [attachmentsBySession, setAttachmentsBySession] = useState<Record<string, Attachment[]>>({})
  const [model, setModel] = useState(MODELS[1])
  const [effort, setEffort] = useState<Effort>('medium')
  const [fast, setFast] = useState(false)
  const [voice, setVoice] = useState<'off' | 'conversation' | 'dictation'>('off')
  const [urlOpen, setUrlOpen] = useState(false)
  const [urlValue, setUrlValue] = useState('')
  const [todosOpen, setTodosOpen] = useState(false)
  const input = drafts[activeId] ?? ''
  const queue = queues[activeId] ?? []
  const attachments = attachmentsBySession[activeId] ?? []
  const setAttachments = (update: (list: Attachment[]) => Attachment[]) => setAttachmentsBySession(prev => ({ ...prev, [activeId]: update(prev[activeId] ?? []) }))
  const setInput = (text: string) => setDrafts(prev => ({ ...prev, [activeId]: text }))
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [cursor, setCursor] = useState(0)
  const [suggestActive, setSuggestActive] = useState(0)
  const [suggestOff, setSuggestOff] = useState(false) // Esc 手动关闭后，本次输入不再弹出
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const followRef = useRef(false)

  const {
    messages, runs, sending, loading, error, actionError,
    sessionPending, sessionDecided,
    agentState, send, stop, decide, retry, reload
  } = useChatSession(activeId)

  const meta = STATE_META[agentState]
  const todos = MOCK_TODOS[activeId] ?? []
  const subagents = MOCK_SUBAGENTS[activeId] ?? 0

  useEffect(() => { followRef.current = false; setSuggestOff(false); setCursor(drafts[activeId]?.length ?? 0); setTodosOpen(false) }, [activeId])
  useEffect(() => { if (focusRequest > 0) inputRef.current?.focus() }, [focusRequest])
  useEffect(() => {
    if (followRef.current) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: reducedMotion ? 'instant' : 'smooth' })
  }, [messages, sending, reducedMotion])

  const canSend = connectionOk && !loading && !error
  const handleSend = (text?: string) => {
    const t = (text ?? input).trim()
    if ((!t && !attachments.length) || !canSend) return
    const body = [t, ...attachments.map(a => `[附件：${a.name}]`)].filter(Boolean).join('\n')
    if (text === undefined) { setInput(''); setAttachments(() => []) }
    // 运行中再发送：进入排队，当前回合结束后自动发出（官方 composer.queue）
    if (sending) { setQueues(prev => ({ ...prev, [activeId]: [...(prev[activeId] ?? []), body] })); return }
    const origin = activeId
    followRef.current = true
    void send(body).then(ok => { if (!ok) setDrafts(prev => prev[origin] ? prev : ({ ...prev, [origin]: body })) })
  }
  // 当前回合结束后，自动发送下一条排队消息
  useEffect(() => {
    if (sending || !queue.length || !canSend) return
    const [next, ...rest] = queue
    setQueues(prev => ({ ...prev, [activeId]: rest }))
    followRef.current = true
    void send(next)
  }, [sending, queue, canSend, activeId, send])
  const sendQueuedNow = (i: number) => {
    const item = queue[i]
    stop()
    setQueues(prev => ({ ...prev, [activeId]: [item, ...(prev[activeId] ?? []).filter((_, j) => j !== i)] }))
  }

  /* 联想：取光标前的 /xxx 或 @xxx token（行首或空白后） */
  const token = (() => {
    const before = input.slice(0, cursor)
    const m = /(^|\s)([/@])([^\s]*)$/.exec(before)
    return m ? { kind: m[2] as '/' | '@', query: m[3].toLowerCase(), start: cursor - m[3].length - 1 } : null
  })()
  const suggestions = token
    ? (token.kind === '/' ? SLASH_COMMANDS : MENTIONS).filter(c => c.name.toLowerCase().includes(token.query) || c.desc.includes(token.query)).slice(0, 12)
    : []
  const suggestOpen = token !== null && suggestions.length > 0 && connectionOk && !suggestOff

  const syncCursor = () => setCursor(inputRef.current?.selectionStart ?? input.length)
  const insertAt = (text: string, start: number, end: number) => {
    const next = input.slice(0, start) + text + input.slice(end)
    const pos = start + text.length
    setInput(next)
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.setSelectionRange(pos, pos); setCursor(pos) })
  }
  const insertSuggestion = (i: number) => {
    if (!token || !suggestions[i]) return
    insertAt(token.kind + suggestions[i].name + ' ', token.start, cursor)
    setSuggestActive(0)
  }

  const onComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    if (suggestOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSuggestActive(a => Math.min(suggestions.length - 1, a + 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSuggestActive(a => Math.max(0, a - 1)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertSuggestion(suggestActive); return }
      if (e.key === 'Escape') { e.preventDefault(); setSuggestOff(true); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { if (sending) stop(); else inputRef.current?.blur() }
  }

  const addAttachment = (kind: Attachment['kind'], name: string) => setAttachments(a => [...a, { id: `${Date.now()}-${a.length}`, kind, name }])
  const SNIPPETS = [
    { label: '代码审查', text: '请审查这部分是否存在缺陷、回归和缺失的测试。' },
    { label: '实现计划', text: '请在修改代码前制定一个简洁的实现计划。' },
    { label: '解释这段', text: '请解释这是如何工作的，并指给我关键文件。' }
  ]
  const attachMenu: MenuEntry[] = [
    { id: 'file', label: '文件…', icon: <File size={14}/>, onSelect: () => addAttachment('file', '审计报告-阶段1.md') },
    { id: 'folder', label: '文件夹…', icon: <Folder size={14}/>, onSelect: () => addAttachment('folder', 'docs/') },
    { id: 'image', label: '图片…', icon: <ImageIcon size={14}/>, onSelect: () => addAttachment('image', '截图 2026-10-19.png') },
    { id: 'paste', label: '粘贴图片', icon: <Paperclip size={14}/>, onSelect: () => addAttachment('image', '粘贴的图片.png') },
    { id: 'url', label: '网址…', icon: <Link2 size={14}/>, onSelect: () => setUrlOpen(true) },
    { separator: true, id: 'sep' },
    { heading: '提示词片段', id: 'h' },
    ...SNIPPETS.map(sn => ({ id: `snip-${sn.label}`, label: sn.label, icon: <FileText size={14}/>, onSelect: () => { setInput(sn.text); inputRef.current?.focus() } }))
  ]
  const toggleDictation = () => {
    if (voice === 'dictation') { setVoice('off'); setInput((input ? input + ' ' : '') + '帮我看看今天还有哪些待办'); inputRef.current?.focus() }
    else setVoice('dictation')
  }

  return (
    <div className="chat-layout flex flex-1 min-h-0">
      {visible && <ToolbarPortal>
        <div className="chat-heading">
          <span className="chat-title">{session?.title ?? '会话'}</span>
          <span>{session?.profile ?? '默认'} · 演示会话</span>
        </div>
        {sessionPending.length > 0 && (
          <button className="chip approval-jump" onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' })}>
            <History size={11} aria-hidden />{sessionPending.length} 待审批
          </button>
        )}
        <span className="agent-status" role="status" aria-live="polite">
          {meta.spin ? <Loader2 size={11} className="animate-spin" style={{ color: meta.color }} aria-hidden /> : <span className="status-dot" style={{ background: meta.color }} aria-hidden />}
          {meta.label}
        </span>
        <Menu label="当前会话操作" align="end" items={sessionMenu} trigger={t =>
          <button {...t} className="icon-btn" aria-label="当前会话操作" title="会话操作"><MoreHorizontal size={17}/></button>} />
      </ToolbarPortal>}

      {/* 对话区 */}
      <section aria-label="对话" className="flex-1 flex flex-col min-w-0">
        {!connectionOk && (
          <div className="px-5 py-2.5 flex items-center gap-2 text-[12.5px] view-enter" role="alert"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            <WifiOff size={14} aria-hidden />
            <span className="font-medium">连接已断开（模拟）</span>
            <span style={{ color: 'var(--fg-secondary)' }}>— 消息发送已禁用，点击右上角连接状态可恢复</span>
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
                    Hermes 正在输入（模拟）… <span className="t-micro">按 Esc 停止</span>
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

            {(todos.length > 0 || subagents > 0 || queue.length > 0) && (
              <div className="status-stack" aria-label="当前任务状态">
                {todos.length > 0 && <button className="status-pill" aria-expanded={todosOpen} onClick={() => setTodosOpen(o => !o)}>
                  <ListChecks size={13} aria-hidden/>任务 {todos.filter(t => t.done).length}/{todos.length}
                </button>}
                {subagents > 0 && <button className="status-pill" onClick={onOpenAgents}><Users size={13} aria-hidden/>{subagents} 个子代理运行中</button>}
                {queue.length > 0 && <span className="status-pill is-static">{queue.length} 条排队</span>}
              </div>
            )}
            {todosOpen && <ul className="todo-list view-enter" aria-label="任务清单">
              {todos.map(t => <li key={t.text} className={t.done ? 'is-done' : ''}><span className="todo-box" aria-hidden>{t.done && <Check size={11}/>}</span>{t.text}</li>)}
            </ul>}
            {queue.length > 0 && <div className="queue-list" aria-label="排队消息">
              {queue.map((q, i) => <div key={`${i}-${q}`} className="queue-item">
                <span className="truncate flex-1">{q}</span>
                <button className="btn btn-plain" onClick={() => sendQueuedNow(i)} title="中断当前回合，立即发送这条">立即发送</button>
                <button className="icon-btn" aria-label={`删除排队消息：${q}`} onClick={() => setQueues(prev => ({ ...prev, [activeId]: queue.filter((_, j) => j !== i) }))}><X size={14}/></button>
              </div>)}
            </div>}

            <div className={`composer relative ${sending ? 'is-sending' : ''} ${voice !== 'off' ? 'is-voice' : ''}`}>
              <label htmlFor="composer" className="sr-only">输入消息，Enter 发送，Shift+Enter 换行，/ 唤起命令，@ 引用文件</label>
              {suggestOpen && token && (
                <SuggestMenu kind={token.kind} matches={suggestions} active={suggestActive} onSelect={insertSuggestion} onHover={setSuggestActive} />
              )}
              {attachments.length > 0 && <div className="attachment-row" aria-label="附件">
                {attachments.map(a => { const Icon = ATTACH_ICON[a.kind]; return <span key={a.id} className="attachment-chip"><Icon size={13} aria-hidden/>{a.name}
                  <button aria-label={`移除附件 ${a.name}`} onClick={() => setAttachments(list => list.filter(x => x.id !== a.id))}><X size={12}/></button></span> })}
              </div>}
              {voice === 'conversation' ? (
                <div className="voice-bar" role="status">
                  <span className="voice-wave" aria-hidden><i/><i/><i/><i/><i/></span>
                  <span className="flex-1">语音对话中 · 聆听中（模拟）</span>
                  <button className="btn" onClick={() => setVoice('off')}>结束</button>
                </div>
              ) : (
                <textarea
                  id="composer"
                  ref={inputRef}
                  className="composer-input"
                  rows={1}
                  onInput={e => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${Math.min(180, el.scrollHeight)}px` }}
                  placeholder={!connectionOk ? '已断连（模拟），无法发送' : voice === 'dictation' ? '正在听写…（模拟，再点一次麦克风结束）' : sending ? '运行中，继续输入会排队发送' : messages.length ? '发送后续消息' : '给 Hermes 一个任务'}
                  value={input}
                  disabled={!canSend}
                  onChange={e => { setInput(e.target.value); setSuggestOff(false); setSuggestActive(0) }}
                  onSelect={syncCursor}
                  onKeyUp={syncCursor}
                  onClick={syncCursor}
                  onKeyDown={onComposerKeyDown}
                />
              )}
              <div className="composer-bar">
                <Menu label="添加附件" placement="top" items={attachMenu} trigger={t =>
                  <button {...t} className="icon-btn composer-icon" aria-label="添加附件或提示词片段" title="添加文件、图片、网址或提示词片段" disabled={!canSend}><Plus size={18}/></button>} />
                <ModelPicker model={model} setModel={setModel} effort={effort} setEffort={setEffort} fast={fast} setFast={setFast} />
                <div className="flex-1" />
                <button className={`icon-btn composer-icon ${voice === 'dictation' ? 'is-on' : ''}`} aria-pressed={voice === 'dictation'} aria-label={voice === 'dictation' ? '停止听写' : '语音听写'} title="语音听写（模拟）" onClick={toggleDictation} disabled={!canSend || voice === 'conversation'}><Mic size={17}/></button>
                {sending ? (
                  <button className="btn btn-primary send-btn" onClick={stop} aria-label="停止" title="停止当前回合 · Esc"><Square size={13} fill="currentColor" aria-hidden /></button>
                ) : input.trim() || attachments.length ? (
                  <button className="btn btn-primary send-btn" onClick={() => handleSend()} disabled={!canSend} aria-label="发送消息"><ArrowUp size={18} aria-hidden /></button>
                ) : (
                  <button className={`btn btn-primary send-btn is-voice-btn ${voice === 'conversation' ? 'is-on' : ''}`} onClick={() => setVoice(v => v === 'conversation' ? 'off' : 'conversation')} disabled={!canSend} aria-label={voice === 'conversation' ? '结束语音对话' : '开始语音对话'} title="语音对话（模拟） · Ctrl+Alt+V"><AudioLines size={17} aria-hidden /></button>
                )}
              </div>
            </div>
            <p className="composer-hint t-micro">
              <span><kbd>↵</kbd> 发送 <span className="composer-extra">· Shift + ↵ 换行 · / 命令 · @ 引用</span></span><span>回复与操作均为模拟</span>
            </p>
          </div>
        </div>
      </section>

      {mode === 'advanced' && rightPanelOpen && <RightPanel onClose={onCloseRightPanel} />}

      <Modal open={urlOpen} onClose={() => setUrlOpen(false)} label="附加网址" className="small-dialog">
        <form className="p-6" onSubmit={e => { e.preventDefault(); if (urlValue.trim()) { addAttachment('url', urlValue.trim()); setUrlValue(''); setUrlOpen(false) } }}>
          <h3 className="t-headline mb-1">附加网址</h3>
          <p className="t-sub mb-4">Hermes 将抓取该页面，作为这一轮对话的参考。</p>
          <input className="input" type="url" autoFocus placeholder="https://example.com/post" value={urlValue} onChange={e => setUrlValue(e.target.value)} aria-label="网址" />
          <div className="flex justify-end gap-2 mt-5">
            <button type="button" className="btn" onClick={() => setUrlOpen(false)}>取消</button>
            <button type="submit" className="btn btn-primary" disabled={!urlValue.trim()}>附加</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
