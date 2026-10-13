import {
  Bot, ChevronDown, Link2, Link2Off, Loader2, PlugZap, Plus,
  Puzzle, Search, SearchX, Terminal, Wrench, X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MockBadge } from '../components/MockBadge'
import { mockSkills, type Skill } from '../mock/data'

/* ---------- 局部 mock 数据（不碰 mock/data.ts） ---------- */

interface Connector {
  id: string
  name: string
  desc: string
  status: 'connected' | 'disconnected' | 'connecting'
}

interface Toolset {
  id: string
  name: string
  desc: string
  scope: string
  enabled: boolean
}

interface AgentBot {
  id: string
  name: string
  profile: string
  desc: string
}

const CONNECTOR_SEED: Connector[] = [
  { id: 'c1', name: 'GitHub', desc: '读写仓库、开 PR（写操作需确认）', status: 'connected' },
  { id: 'c2', name: '日历', desc: '读取日程，在聊天里直接问"今天有什么会"', status: 'disconnected' },
  { id: 'c3', name: '本地文件', desc: '经审批读写指定目录，默认只读', status: 'connected' },
  { id: 'c4', name: '网页抓取', desc: '抓取公开页面正文，用于调研与比价', status: 'disconnected' }
]

const TOOLSET_SEED: Toolset[] = [
  { id: 't1', name: 'shell 工具集', desc: '执行命令、读写文件（高风险操作走审批）', scope: '小管', enabled: true },
  { id: 't2', name: '网络工具集', desc: 'HTTP 请求、DNS 与连通性探测', scope: '默认', enabled: true },
  { id: 't3', name: '浏览器工具集', desc: '页面抓取、截图（当前为模拟实现）', scope: '默认', enabled: false },
  { id: 't4', name: '媒体工具集', desc: '图片生成与编辑', scope: 'Codex 协作', enabled: false }
]

const BOT_SEED: AgentBot[] = [
  { id: 'b1', name: '早报 bot', profile: '默认', desc: '每天 09:45 整理 AI 早报素材' },
  { id: 'b2', name: '点子挖掘 bot', profile: 'Codex 协作', desc: '定期产出可动手做的项目点子' }
]

const PROFILES = ['默认', '小管', 'Codex 协作']

type TabId = 'skills' | 'connectors' | 'toolsets' | 'agents'

const TABS: { id: TabId; label: string }[] = [
  { id: 'skills', label: 'Skills' },
  { id: 'connectors', label: '连接器' },
  { id: 'toolsets', label: '工具集' },
  { id: 'agents', label: 'Agents' }
]

const TAB_INTRO: Record<TabId, string> = {
  skills: '管理 Agent 的技能：开关控制是否可用，展开查看派生的 slash 命令。',
  connectors: '连接器为 Agent 带来外部能力；断开后相关工具立即不可用（模拟）。',
  toolsets: '工具集按作用域划分能力边界；关闭后该集合的工具不再被调用（模拟）。',
  agents: ''
}

/* ---------- 小组件 ---------- */

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="shrink-0 rounded-full relative"
      style={{
        width: 40, height: 23,
        background: checked ? 'var(--accent)' : 'var(--switch-off)',
        transition: 'background-color var(--motion-normal) var(--ease-out)'
      }}
    >
      <span
        aria-hidden
        className="absolute top-1/2 rounded-full"
        style={{
          width: 17, height: 17,
          background: 'var(--switch-thumb)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          transform: 'translateY(-50%)',
          left: checked ? 20 : 3,
          transition: 'left var(--motion-normal) var(--ease-out), background-color var(--motion-normal)'
        }}
      />
    </button>
  )
}

function EmptyState({ icon, text, actionLabel, onAction }: {
  icon: React.ReactNode; text: string; actionLabel?: string; onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center view-enter">
      <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3"
        style={{ background: 'var(--bg-sunken)', color: 'var(--fg-tertiary)' }}>
        {icon}
      </div>
      <p className="text-[13px] mb-3" style={{ color: 'var(--fg-secondary)' }}>{text}</p>
      {actionLabel && onAction && (
        <button type="button" className="btn" onClick={onAction}>{actionLabel}</button>
      )}
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="grouped-row" style={{ display: 'block', padding: '14px 16px' }}>
      {children}
    </div>
  )
}

/* ---------- 主视图 ---------- */

export function SkillsView() {
  const [tab, setTab] = useState<TabId>('skills')

  // Skills tab
  const [skills, setSkills] = useState<Skill[]>(mockSkills)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // 连接器 tab
  const [connectors, setConnectors] = useState<Connector[]>(CONNECTOR_SEED)
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  // 工具集 tab
  const [toolsets, setToolsets] = useState<Toolset[]>(TOOLSET_SEED)

  // Agents tab
  const [bots, setBots] = useState<AgentBot[]>(BOT_SEED)
  const [formOpen, setFormOpen] = useState(false)
  const [botName, setBotName] = useState('')
  const [botProfile, setBotProfile] = useState(PROFILES[0])
  const [botDesc, setBotDesc] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (formOpen) {
      nameRef.current?.focus()
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFormOpen(false) }
      window.addEventListener('keydown', onKey)
      return () => window.removeEventListener('keydown', onKey)
    }
  }, [formOpen])

  const toggleSkill = (id: string) =>
    setSkills(prev => prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)))

  const toggleToolset = (id: string) =>
    setToolsets(prev => prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)))

  const toggleConnector = (id: string) => {
    setConnectors(prev => prev.map(c => {
      if (c.id !== id) return c
      if (c.status === 'connected') return { ...c, status: 'disconnected' }
      return { ...c, status: 'connecting' }
    }))
    const target = connectors.find(c => c.id === id)
    if (target && target.status === 'disconnected') {
      const t = window.setTimeout(() => {
        setConnectors(prev => prev.map(c => (c.id === id ? { ...c, status: 'connected' } : c)))
      }, 900)
      timers.current.push(t)
    }
  }

  const createBot = () => {
    const name = botName.trim()
    if (!name) return
    setBots(prev => [...prev, {
      id: `b${Date.now()}`, name, profile: botProfile,
      desc: botDesc.trim() || '暂无描述（模拟）'
    }])
    setBotName(''); setBotDesc(''); setBotProfile(PROFILES[0]); setFormOpen(false)
  }

  const filteredSkills = skills.filter(s =>
    s.name.toLowerCase().includes(query.trim().toLowerCase()) ||
    s.desc.includes(query.trim()) ||
    s.commands.some(c => c.includes(query.trim()))
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="reading-col px-5 pt-5 pb-8">
        {/* 标题区 */}
        <div className="page-head">
          <div className="flex items-center gap-2">
            <h2 className="t-title" style={{ color: 'var(--fg-primary)' }}>技能</h2>
            <MockBadge />
          </div>
          {tab !== 'agents' && (
            <p className="t-sub page-desc">
              {TAB_INTRO[tab]}
            </p>
          )}
        </div>

        {/* 二级 tab */}
        <div role="tablist" aria-label="技能工作台二级导航" className="seg mb-5">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className="seg-btn"
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ---- Skills ---- */}
        {tab === 'skills' && (
          <div className="view-enter" key="skills">
            <div className="relative mb-3">
              <Search size={15} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--fg-tertiary)' }} />
              <input
                type="search"
                aria-label="搜索技能"
                className="input w-full"
                style={{ paddingLeft: 34 }}
                placeholder="搜索技能名称、描述或命令…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            {filteredSkills.length === 0 ? (
              <EmptyState
                icon={<SearchX size={20} aria-hidden />}
                text={query.trim() ? `没有找到与「${query.trim()}」相关的技能` : '暂无技能'}
                actionLabel={query.trim() ? '清空搜索' : undefined}
                onAction={query.trim() ? () => setQuery('') : undefined}
              />
            ) : (
              <div className="grouped view-enter">
                {filteredSkills.map(s => {
                  const open = expanded === s.id
                  return (
                    <Row key={s.id}>
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                          <Puzzle size={17} aria-hidden />
                        </div>
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          aria-expanded={open}
                          onClick={() => setExpanded(open ? null : s.id)}
                        >
                          <div className="flex items-center gap-2">
                            <code className="text-[13px] font-semibold" style={{ color: 'var(--fg-primary)' }}>{s.name}</code>
                            <span className="chip">{s.scope}</span>
                            <ChevronDown size={14} aria-hidden
                              style={{
                                color: 'var(--fg-tertiary)',
                                transform: open ? 'rotate(180deg)' : 'none',
                                transition: 'transform var(--motion-normal) var(--ease-out)'
                              }} />
                          </div>
                          <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{s.desc}</p>
                        </button>
                        <Toggle checked={s.enabled} onChange={() => toggleSkill(s.id)} label={`${s.enabled ? '禁用' : '启用'}技能 ${s.name}`} />
                      </div>
                      {open && (
                        <div className="mt-2.5 ml-12 flex items-center gap-1.5 flex-wrap view-enter">
                          <Terminal size={12} aria-hidden style={{ color: 'var(--fg-tertiary)' }} />
                          <span className="text-[11.5px]" style={{ color: 'var(--fg-tertiary)' }}>派生命令：</span>
                          {s.commands.map(c => (
                            <code key={c} className="text-[11.5px] px-1.5 py-0.5 rounded-md"
                              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>{c}</code>
                          ))}
                        </div>
                      )}
                    </Row>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- 连接器 ---- */}
        {tab === 'connectors' && (
          <div className="view-enter" key="connectors">
            {connectors.length === 0 ? (
              <EmptyState icon={<PlugZap size={20} aria-hidden />} text="暂无连接器" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {connectors.map(c => {
                  const connected = c.status === 'connected'
                  const busy = c.status === 'connecting'
                  return (
                    <div key={c.id} className="rounded-2xl p-4"
                      style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <PlugZap size={15} aria-hidden style={{ color: connected ? 'var(--success)' : 'var(--fg-tertiary)' }} />
                        <span className="text-[13.5px] font-semibold" style={{ color: 'var(--fg-primary)' }}>{c.name}</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px]"
                          style={{ color: connected ? 'var(--success)' : busy ? 'var(--warning)' : 'var(--fg-tertiary)' }}>
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" aria-hidden />
                          {connected ? '已连接' : busy ? '连接中…' : '未连接'}
                        </span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: 'var(--fg-secondary)' }}>{c.desc}</p>
                      <button
                        type="button"
                        className="btn w-full justify-center"
                        disabled={busy}
                        onClick={() => toggleConnector(c.id)}
                        aria-label={connected ? `断开${c.name}（模拟）` : `连接${c.name}（模拟）`}
                      >
                        {busy ? (
                          <><Loader2 size={13} aria-hidden className="animate-spin" />连接中…</>
                        ) : connected ? (
                          <><Link2Off size={13} aria-hidden />断开（模拟）</>
                        ) : (
                          <><Link2 size={13} aria-hidden />连接（模拟）</>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ---- 工具集 ---- */}
        {tab === 'toolsets' && (
          <div className="view-enter" key="toolsets">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
              {toolsets.map(t => (
                <Row key={t.id}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: 'var(--bg-sunken)', color: 'var(--fg-secondary)' }}>
                      <Wrench size={16} aria-hidden />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-semibold" style={{ color: 'var(--fg-primary)' }}>{t.name}</span>
                        <span className="chip">{t.scope}</span>
                      </div>
                      <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>{t.desc}</p>
                    </div>
                    <Toggle checked={t.enabled} onChange={() => toggleToolset(t.id)} label={`${t.enabled ? '禁用' : '启用'}工具集 ${t.name}`} />
                  </div>
                </Row>
              ))}
            </div>
          </div>
        )}

        {/* ---- Agents ---- */}
        {tab === 'agents' && (
          <div className="view-enter" key="agents">
            <div className="rounded-2xl p-4 mb-4"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-border)' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <Bot size={15} aria-hidden style={{ color: 'var(--accent)' }} />
                <span className="text-[13px] font-semibold" style={{ color: 'var(--fg-primary)' }}>什么是 Bot Mode？</span>
                <MockBadge />
              </div>
              <p className="text-[12.5px] leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                一个 bot = 一个 profile + 一个专属会话（"Bot Chat"）。每个 bot 绑定唯一 profile，
                拥有独立的记忆与会话上下文，互不串扰 —— 这是原生 Bot Mode 的不变量，迁移时不可更改。
              </p>
            </div>

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[13px] font-semibold" style={{ color: 'var(--fg-primary)' }}>
                我的 Bots（{bots.length}）
              </h3>
              <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
                <Plus size={14} aria-hidden />新建 Bot（模拟）
              </button>
            </div>

            {bots.length === 0 ? (
              <EmptyState
                icon={<Bot size={20} aria-hidden />}
                text="还没有 Bot，创建一个开始吧"
                actionLabel="新建 Bot（模拟）"
                onAction={() => setFormOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {bots.map(b => (
                  <div key={b.id} className="rounded-2xl p-4 view-enter"
                    style={{ background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                        <Bot size={15} aria-hidden />
                      </div>
                      <span className="text-[13.5px] font-semibold truncate" style={{ color: 'var(--fg-primary)' }}>{b.name}</span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed mb-2.5" style={{ color: 'var(--fg-secondary)' }}>{b.desc}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="chip">profile：{b.profile}</span>
                      <span className="chip">"Bot Chat"</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 新建 Bot 弹窗 */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.32)' }}
          onClick={() => setFormOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="新建 Bot（模拟）"
            className="surface-overlay w-full view-enter"
            style={{ maxWidth: 400, padding: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[15px] font-bold" style={{ color: 'var(--fg-primary)' }}>新建 Bot（模拟）</h3>
              <button type="button" className="btn" style={{ padding: 6 }} onClick={() => setFormOpen(false)} aria-label="关闭">
                <X size={15} aria-hidden />
              </button>
            </div>
            <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--fg-secondary)' }} htmlFor="bot-name">
              Bot 名称
            </label>
            <input
              id="bot-name"
              ref={nameRef}
              className="input w-full mb-3"
              placeholder="例如：购物比价 bot"
              value={botName}
              onChange={e => setBotName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBot() }}
            />
            <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--fg-secondary)' }} htmlFor="bot-profile">
              绑定 profile（一个 bot = 一个 profile，不可更改）
            </label>
            <select
              id="bot-profile"
              className="input w-full mb-3"
              value={botProfile}
              onChange={e => setBotProfile(e.target.value)}
            >
              {PROFILES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <label className="block text-[12.5px] font-medium mb-1.5" style={{ color: 'var(--fg-secondary)' }} htmlFor="bot-desc">
              描述（可选）
            </label>
            <input
              id="bot-desc"
              className="input w-full mb-4"
              placeholder="这个 bot 负责做什么…"
              value={botDesc}
              onChange={e => setBotDesc(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createBot() }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>取消</button>
              <button type="button" className="btn btn-primary" onClick={createBot} disabled={!botName.trim()}>
                创建（模拟）
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
