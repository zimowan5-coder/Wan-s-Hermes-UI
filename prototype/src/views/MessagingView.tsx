/**
 * 消息工作台 —— MOCK 原型。
 * 本文件所有交互均为模拟，不代表真实 Hermes 后端能力。
 * 对应原生：Messaging 网关（独立 detached 进程）与 Webhooks 事件推送规则。
 */
import {
  BellOff, Bot, Check, Copy, FlaskConical, Info, Loader2,
  MessageCircle, Plus, QrCode, Send, Trash2, Webhook, X
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { MockBadge } from '../components/MockBadge'

/* ---------------- 局部 MOCK 数据（不碰 mock/data.ts） ---------------- */

type ChStatus = 'connected' | 'connecting' | 'disconnected'

interface Channel {
  id: 'telegram' | 'wechat' | 'discord' | 'webhook-in'
  name: string
  kind: string
  status: ChStatus
  detail: string
  offlineHint: string
}

const INITIAL_CHANNELS: Channel[] = [
  {
    id: 'telegram', name: 'Telegram', kind: '个人网关', status: 'connected',
    detail: '已连接 · @wans_hermes_bot · 3 个会话在线',
    offlineHint: '通过 Bot 验证码两步接入'
  },
  {
    id: 'wechat', name: '微信', kind: '个人网关', status: 'disconnected',
    detail: '', offlineHint: '扫码登录后启用，网关进程保持在线'
  },
  {
    id: 'discord', name: 'Discord', kind: '个人网关', status: 'disconnected',
    detail: '', offlineHint: '填入 Bot Token 后启用'
  },
  {
    id: 'webhook-in', name: 'Webhook 入站', kind: '事件推送', status: 'connected',
    detail: '入站地址已生成 · 2 条规则生效中',
    offlineHint: '生成入站地址，接收外部事件'
  }
]

const INBOUND_URL = 'https://gateway.local:8443/hook/inbound/9f2k-7qd1（模拟）'

interface WebhookRule {
  id: string
  name: string
  event: string
  url: string
  enabled: boolean
  lastFired: string
}

const EVENT_OPTIONS = [
  { id: 'approval.received', label: '审批到达' },
  { id: 'session.created', label: '会话创建' },
  { id: 'tool.failed', label: '工具执行失败' },
  { id: 'cron.fired', label: '定时任务触发' },
  { id: 'message.inbound', label: '消息入站' }
]

const INITIAL_RULES: WebhookRule[] = [
  { id: 'w1', name: '审批提醒 → 手机推送', event: 'approval.received', url: 'https://push.example.com/hermes/approval', enabled: true, lastFired: '18:42' },
  { id: 'w2', name: '失败告警 → 日志服务', event: 'tool.failed', url: 'https://logs.example.com/ingest', enabled: false, lastFired: '从未触发' }
]

const eventLabel = (id: string) => EVENT_OPTIONS.find(e => e.id === id)?.label ?? id

/* ---------------- 小组件 ---------------- */

function StatusChip({ status }: { status: ChStatus }) {
  const map = {
    connected: { text: '已连接', color: 'var(--success)', border: 'var(--success)', dot: true },
    connecting: { text: '连接中…', color: 'var(--warning)', border: 'var(--warning)', dot: true },
    disconnected: { text: '未连接', color: 'var(--fg-tertiary)', border: 'var(--border-strong)', dot: false }
  } as const
  const m = map[status]
  return (
    <span className="chip" style={{ color: m.color, borderColor: m.border }} role="status">
      {m.dot && <span className="inline-block w-1.5 h-1.5 rounded-full bg-current pulse-dot" aria-hidden />}
      {m.text}
    </span>
  )
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button" role="switch" aria-checked={checked} aria-label={label}
      onClick={() => onChange(!checked)}
      className="shrink-0 rounded-full transition-colors"
      style={{
        width: 38, height: 22, padding: 3,
        background: checked ? 'var(--success)' : 'var(--bg-sunken)',
        border: `1px solid ${checked ? 'var(--success)' : 'var(--border-strong)'}`,
        transitionDuration: '180ms'
      }}
    >
      <span
        className="block rounded-full"
        style={{
          width: 14, height: 14, background: '#fff',
          boxShadow: 'var(--shadow-sm)',
          transform: checked ? 'translateX(16px)' : 'translateX(0)',
          transition: 'transform 180ms var(--ease-out)'
        }}
      />
    </button>
  )
}

/** 确定性伪二维码（示意占位，非真实登录码） */
function FakeQr({ seed = 42 }: { seed?: number }) {
  const cells = useMemo(() => {
    const size = 25
    let s = seed
    const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
    const m: boolean[][] = Array.from({ length: size }, () => Array<boolean>(size).fill(false))
    const finder = (x0: number, y0: number) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        m[y0 + y][x0 + x] = x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)
      }
    }
    finder(0, 0); finder(size - 7, 0); finder(0, size - 7)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const inF = (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8)
      if (!inF) m[y][x] = rand() > 0.52
    }
    return m.flatMap((row, y) => row.map((v, x) => (v ? `${x}-${y}` : null)).filter(Boolean) as string[])
  }, [seed])
  return (
    <svg viewBox="-2 -2 29 29" className="w-44 h-44" role="img" aria-label="模拟二维码占位图" style={{ color: 'var(--fg-primary)' }}>
      <rect x="-2" y="-2" width="29" height="29" fill="var(--bg-raised)" rx="2" />
      {cells.map(k => {
        const [x, y] = k.split('-').map(Number)
        return <rect key={k} x={x} y={y} width="1" height="1" fill="currentColor" />
      })}
    </svg>
  )
}

/* ---------------- 主视图 ---------------- */

export function MessagingView() {
  const [tab, setTab] = useState<'channels' | 'webhooks'>('channels')

  /* 通道状态 */
  const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS)
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)) }, [])
  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => { timers.current = timers.current.filter(t => t !== id); fn() }, ms)
    timers.current.push(id)
  }
  const setStatus = (id: Channel['id'], status: ChStatus, detail?: string) =>
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, status, detail: detail ?? c.detail } : c)))

  const connectChannel = (id: Channel['id'], detail: string) => {
    setStatus(id, 'connecting')
    later(1200, () => setStatus(id, 'connected', detail))
  }
  const disconnectChannel = (id: Channel['id']) => {
    setChannels(prev => prev.map(c => (c.id === id ? { ...c, status: 'disconnected', detail: '' } : c)))
    // 重置各接入流程，下次连接从头开始
    if (id === 'telegram') { setTgStep(0); setTgCode(''); setTgError('') }
    if (id === 'discord') { setDcToken(''); setDcError('') }
  }

  /* 微信扫码 modal */
  const [qrOpen, setQrOpen] = useState(false)
  const [qrCount, setQrCount] = useState(3)
  const cancelRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!qrOpen) return
    setQrCount(3)
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setQrOpen(false) }
    window.addEventListener('keydown', onKey)
    const iv = window.setInterval(() => {
      setQrCount(c => {
        if (c <= 1) {
          window.clearInterval(iv)
          setQrOpen(false)
          connectChannel('wechat', '已连接 · 微信扫码登录 · 网关进程在线（模拟）')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => { window.removeEventListener('keydown', onKey); window.clearInterval(iv) }
  }, [qrOpen])

  /* Telegram 验证码两步 */
  const [tgStep, setTgStep] = useState<0 | 1 | 2>(0) // 0 未开始 / 1 发送中 / 2 待输入
  const [tgCode, setTgCode] = useState('')
  const [tgError, setTgError] = useState('')
  const [tgBusy, setTgBusy] = useState(false)
  const tgSend = () => {
    if (tgStep === 1) return
    setTgStep(1); setTgError('')
    later(900, () => setTgStep(2))
  }
  const tgVerify = () => {
    if (!/^\d{6}$/.test(tgCode.trim())) { setTgError('请输入 6 位数字验证码（模拟任意 6 位均可）'); return }
    setTgError(''); setTgBusy(true)
    later(900, () => {
      setTgBusy(false)
      connectChannel('telegram', '已连接 · @wans_hermes_bot · 3 个会话在线（模拟）')
      setTgStep(0); setTgCode('')
    })
  }

  /* Discord Token */
  const [dcToken, setDcToken] = useState('')
  const [dcError, setDcError] = useState('')
  const [dcBusy, setDcBusy] = useState(false)
  const dcConnect = () => {
    if (dcToken.trim().length < 8) { setDcError('请输入有效的 Bot Token（模拟：任意 8 位以上字符）'); return }
    setDcError(''); setDcBusy(true)
    later(1200, () => {
      setDcBusy(false); setDcToken('')
      connectChannel('discord', '已连接 · Bot 已加入 2 个服务器（模拟）')
    })
  }

  /* Webhook 入站复制 */
  const [copied, setCopied] = useState(false)
  const copyInbound = async () => {
    try { await navigator.clipboard.writeText(INBOUND_URL.replace('（模拟）', '')) } catch { /* 剪贴板不可用也给反馈 */ }
    setCopied(true)
    later(2000, () => setCopied(false))
  }

  /* Webhooks 规则 */
  const [rules, setRules] = useState<WebhookRule[]>(INITIAL_RULES)
  const [formOpen, setFormOpen] = useState(false)
  const [fName, setFName] = useState('')
  const [fEvent, setFEvent] = useState(EVENT_OPTIONS[0].id)
  const [fUrl, setFUrl] = useState('')
  const [fUrlError, setFUrlError] = useState('')
  const [testedId, setTestedId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const validUrl = (u: string) => {
    try { const p = new URL(u.trim()); return p.protocol === 'http:' || p.protocol === 'https:' } catch { return false }
  }
  const addRule = () => {
    if (!fName.trim()) { setFUrlError(''); (document.getElementById('wh-name') as HTMLInputElement)?.focus(); return }
    if (!validUrl(fUrl)) { setFUrlError('URL 格式不正确，需以 http:// 或 https:// 开头'); return }
    setFUrlError('')
    setRules(prev => [...prev, {
      id: `w${Date.now()}`, name: fName.trim(), event: fEvent,
      url: fUrl.trim(), enabled: true, lastFired: '从未触发'
    }])
    setFName(''); setFUrl(''); setFEvent(EVENT_OPTIONS[0].id); setFormOpen(false)
  }
  const testRule = (id: string) => {
    setTestedId(id)
    later(2500, () => setTestedId(cur => (cur === id ? null : cur)))
  }

  const channelIcon = (id: Channel['id']) =>
    id === 'telegram' ? <Send size={16} aria-hidden /> :
    id === 'wechat' ? <MessageCircle size={16} aria-hidden /> :
    id === 'discord' ? <Bot size={16} aria-hidden /> :
    <Webhook size={16} aria-hidden />

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="page-head">
        <div className="flex items-center gap-2">
          <h2 className="t-title">消息</h2>
          <MockBadge />
        </div>
        <p className="t-sub page-desc">网关通道状态 · 事件推送规则</p>
      </div>

      {/* 二级 tab */}
      <div role="tablist" aria-label="消息设置" className="seg mb-4">
        {(['channels', 'webhooks'] as const).map(t => (
          <button
            key={t} role="tab" aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="seg-btn"
          >
            {t === 'channels' ? '通道' : 'Webhooks'}
          </button>
        ))}
      </div>

      {tab === 'channels' && (
        <div className="view-enter max-w-[760px]">
          <div className="flex items-start gap-2 px-4 py-3 mb-3 text-[12.5px]"
            style={{ background: 'var(--accent-soft)', borderRadius: 12, color: 'var(--fg-secondary)' }}>
            <Info size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} aria-hidden />
            <span>消息网关为<strong style={{ color: 'var(--fg-primary)' }}>独立 detached 进程</strong>，不随应用退出而停止 —— 呼应原生设计：通道断开仅解绑本机，网关本身继续运行。</span>
          </div>

          <div className="grouped view-enter" aria-live="polite">
            {channels.map(c => (
              <div key={c.id}>
                <div className="grouped-row" style={{ alignItems: 'flex-start' }}>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: c.status === 'connected' ? 'var(--success-soft)' : 'var(--bg-sunken)',
                      color: c.status === 'connected' ? 'var(--success)' : 'var(--fg-tertiary)'
                    }}>
                    {channelIcon(c.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-semibold">{c.name}</span>
                      <span className="chip">{c.kind}</span>
                    </div>
                    <div className="text-[11.5px] mt-0.5 truncate" style={{ color: 'var(--fg-tertiary)' }}>
                      {c.status === 'connected' ? c.detail : c.offlineHint}
                    </div>
                  </div>
                  <StatusChip status={c.status} />
                  {c.status === 'connected' ? (
                    <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => disconnectChannel(c.id)}>
                      断开
                    </button>
                  ) : c.status === 'disconnected' && (
                    <>
                      {c.id === 'wechat' && (
                        <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setQrOpen(true)}>
                          <QrCode size={13} aria-hidden />扫码连接
                        </button>
                      )}
                      {c.id === 'webhook-in' && (
                        <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => connectChannel('webhook-in', '入站地址已生成 · 0 条规则生效中（模拟）')}>
                          生成地址（模拟）
                        </button>
                      )}
                    </>
                  )}
                </div>
                </div>

                <div className="px-4 pb-4">
                {/* Telegram 两步验证（卡片内展开） */}
                {c.id === 'telegram' && c.status === 'disconnected' && (
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    {tgStep === 0 && (
                      <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={tgSend}>
                        <Send size={13} aria-hidden />发送验证码（模拟）
                      </button>
                    )}
                    {tgStep === 1 && (
                      <span className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: 'var(--fg-secondary)' }} role="status">
                        <Loader2 size={14} className="animate-spin" aria-hidden />正在发送验证码（模拟）…
                      </span>
                    )}
                    {tgStep === 2 && (
                      <div className="flex flex-col gap-2">
                        <span className="text-[12.5px]" style={{ color: 'var(--fg-secondary)' }}>
                          验证码已发送至 +86 138****0000（模拟，任意 6 位数字均可通过）
                        </span>
                        <div className="flex items-center gap-2">
                          <label htmlFor="tg-code" className="sr-only">6 位验证码</label>
                          <input
                            id="tg-code" className="input" style={{ width: 140 }} placeholder="6 位验证码"
                            value={tgCode} onChange={e => setTgCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            onKeyDown={e => { if (e.key === 'Enter') tgVerify() }}
                            inputMode="numeric" autoComplete="one-time-code"
                          />
                          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={tgVerify} disabled={tgBusy}>
                            {tgBusy ? <><Loader2 size={13} className="animate-spin" aria-hidden />验证中…</> : '验证并连接（模拟）'}
                          </button>
                          <button className="btn" style={{ padding: '6px 12px', fontSize: 12 }} onClick={tgSend} disabled={tgBusy}>
                            重新发送
                          </button>
                        </div>
                        {tgError && <span className="text-[12px]" style={{ color: 'var(--danger)' }} role="alert">{tgError}</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Discord Token（卡片内展开） */}
                {c.id === 'discord' && c.status === 'disconnected' && (
                  <div className="mt-3 pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2">
                      <label htmlFor="dc-token" className="sr-only">Discord Bot Token</label>
                      <input
                        id="dc-token" type="password" className="input flex-1" placeholder="粘贴 Discord Bot Token（模拟）"
                        value={dcToken} onChange={e => { setDcToken(e.target.value); setDcError('') }}
                        onKeyDown={e => { if (e.key === 'Enter') dcConnect() }}
                      />
                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12 }} onClick={dcConnect} disabled={dcBusy}>
                        {dcBusy ? <><Loader2 size={13} className="animate-spin" aria-hidden />连接中…</> : '连接（模拟）'}
                      </button>
                    </div>
                    {dcError && <span className="text-[12px]" style={{ color: 'var(--danger)' }} role="alert">{dcError}</span>}
                  </div>
                )}

                {/* Webhook 入站地址（卡片内展开） */}
                {c.id === 'webhook-in' && c.status === 'connected' && (
                  <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <code className="flex-1 min-w-0 text-[12px] px-3 py-2 rounded-md truncate"
                      style={{ background: 'var(--bg-sunken)', color: 'var(--fg-secondary)' }}>
                      {INBOUND_URL}
                    </code>
                    <button className="btn shrink-0" style={{ padding: '6px 12px', fontSize: 12 }} onClick={copyInbound} aria-live="polite">
                      {copied ? <><Check size={13} aria-hidden style={{ color: 'var(--success)' }} />已复制</> : <><Copy size={13} aria-hidden />复制 URL（模拟）</>}
                    </button>
                  </div>
                )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'webhooks' && (
        <div className="view-enter max-w-[860px]">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[12.5px]" style={{ color: 'var(--fg-secondary)' }}>
              事件发生时向目标 URL 推送 JSON（模拟）。规则存储于网关进程。
            </p>
            <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: 12.5 }} onClick={() => setFormOpen(v => !v)} aria-expanded={formOpen}>
              <Plus size={14} aria-hidden />新增规则（模拟）
            </button>
          </div>

          {formOpen && (
            <div className="surface-overlay p-4 mb-3 view-enter" role="form" aria-label="新增 Webhook 规则">
              <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label htmlFor="wh-name" className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--fg-secondary)' }}>规则名称</label>
                  <input id="wh-name" className="input w-full" placeholder="例如：审批提醒 → 手机推送"
                    value={fName} onChange={e => setFName(e.target.value)} />
                </div>
                <div>
                  <label htmlFor="wh-event" className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--fg-secondary)' }}>触发事件</label>
                  <select id="wh-event" className="input w-full" value={fEvent} onChange={e => setFEvent(e.target.value)}>
                    {EVENT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.id}（{o.label}）</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <label htmlFor="wh-url" className="block text-[12px] font-semibold mb-1" style={{ color: 'var(--fg-secondary)' }}>目标 URL</label>
                <input id="wh-url" className="input w-full" placeholder="https://example.com/hook"
                  value={fUrl} onChange={e => { setFUrl(e.target.value); setFUrlError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') addRule() }} inputMode="url" />
                {fUrlError && <p className="text-[12px] mt-1" style={{ color: 'var(--danger)' }} role="alert">{fUrlError}</p>}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button className="btn" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={() => { setFormOpen(false); setFUrlError('') }}>
                  取消
                </button>
                <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 12.5 }} onClick={addRule}>
                  保存规则（模拟）
                </button>
              </div>
            </div>
          )}

          {rules.length === 0 ? (
            <div className="flat-panel py-14 px-6 flex flex-col items-center text-center gap-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-1"
                style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-subtle)', color: 'var(--fg-tertiary)' }}>
                <BellOff size={18} aria-hidden />
              </div>
              <p className="text-[13.5px] font-semibold" style={{ color: 'var(--fg-primary)' }}>还没有 Webhook 规则</p>
              <p className="text-[12.5px]" style={{ color: 'var(--fg-secondary)' }}>第一条规则 30 秒就能跑起来（模拟）。</p>
              <button className="btn btn-primary mt-2" style={{ padding: '7px 14px', fontSize: 12.5 }} onClick={() => setFormOpen(true)}>
                <Plus size={14} aria-hidden />新增规则（模拟）
              </button>
            </div>
          ) : (
            <div className="flat-panel overflow-hidden" role="region" aria-label="Webhook 规则列表">
              <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="text-[11.5px] uppercase" style={{ color: 'var(--fg-tertiary)', borderBottom: '1px solid var(--border-subtle)', letterSpacing: '0.04em' }}>
                    <th className="px-4 py-2.5 font-semibold">规则名称</th>
                    <th className="px-4 py-2.5 font-semibold">触发事件</th>
                    <th className="px-4 py-2.5 font-semibold">目标 URL</th>
                    <th className="px-4 py-2.5 font-semibold">启用</th>
                    <th className="px-4 py-2.5 font-semibold">上次触发</th>
                    <th className="px-4 py-2.5 font-semibold text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r.id} className="text-[12.5px]" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--fg-primary)' }}>{r.name}</td>
                      <td className="px-4 py-3"><span className="chip">{eventLabel(r.event)}</span></td>
                      <td className="px-4 py-3 max-w-[220px] truncate" style={{ color: 'var(--fg-secondary)' }} title={r.url}>{r.url}</td>
                      <td className="px-4 py-3">
                        <Switch checked={r.enabled} label={`${r.name}启用开关`}
                          onChange={v => setRules(prev => prev.map(x => (x.id === r.id ? { ...x, enabled: v } : x)))} />
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--fg-tertiary)' }}>{r.lastFired}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {testedId === r.id ? (
                            <span className="inline-flex items-center gap-1 text-[12px] font-medium" style={{ color: 'var(--success)' }} role="status">
                              <Check size={13} aria-hidden />已发送测试（模拟）
                            </span>
                          ) : (
                            <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => testRule(r.id)} title="发送一条测试推送（模拟）">
                              <FlaskConical size={13} aria-hidden />测试（模拟）
                            </button>
                          )}
                          {deleteId === r.id ? (
                            <span className="inline-flex items-center gap-1.5" role="alertdialog" aria-label={`确认删除规则 ${r.name}`}>
                              <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => { setRules(prev => prev.filter(x => x.id !== r.id)); setDeleteId(null) }}>
                                确认删除
                              </button>
                              <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => setDeleteId(null)}>
                                取消
                              </button>
                            </span>
                          ) : (
                            <button className="btn" style={{ padding: '5px 10px', fontSize: 12, color: 'var(--fg-tertiary)' }} onClick={() => setDeleteId(r.id)} aria-label={`删除规则 ${r.name}`}>
                              <Trash2 size={13} aria-hidden />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 微信扫码 modal */}
      {qrOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setQrOpen(false)}
          role="presentation"
        >
          <div
            className="surface-overlay p-6 flex flex-col items-center gap-3 view-enter"
            role="dialog" aria-modal="true" aria-labelledby="qr-title"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 340 }}
          >
            <h3 id="qr-title" className="text-[15px] font-bold" style={{ color: 'var(--fg-primary)' }}>微信扫码登录</h3>
            <FakeQr seed={20261012} />
            <p className="text-[12.5px] text-center" style={{ color: 'var(--fg-secondary)' }}>
              请使用微信扫码（模拟占位图）<br />
              <span style={{ color: 'var(--fg-tertiary)' }}>扫码后 <strong style={{ color: 'var(--warning)' }}>{qrCount}</strong> 秒自动连接并关闭</span>
            </p>
            <div className="w-full rounded-full" style={{ height: 4, background: 'var(--bg-sunken)' }} aria-hidden>
              <div className="rounded-full" style={{
                height: '100%', background: 'var(--success)',
                width: `${(qrCount / 3) * 100}%`,
                transition: 'width 1s linear'
              }} />
            </div>
            <button ref={cancelRef} className="btn w-full" style={{ padding: '8px', fontSize: 13 }} onClick={() => setQrOpen(false)}>
              <X size={14} aria-hidden />取消（Esc）
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
