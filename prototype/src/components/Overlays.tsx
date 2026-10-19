import { Bot, CheckCircle2, FolderInput, Gauge, Keyboard, Loader2, MoreHorizontal, Pin, RefreshCw, Search, Square, Users, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { onGroupKeyDown } from '../lib/keyboard'
import type { MergedSession } from '../lib/sessions'
import { MaintenancePanel } from '../views/TasksView'
import { Menu, type MenuEntry } from './Menu'
import { Modal } from './Modal'

/** 全屏浮层卡片的公共外框：标题 + 关闭按钮 + 可选的分段标签 */
function Sheet({ title, subtitle, icon, onClose, children, tabs, tab, setTab }: {
  title: string; subtitle?: string; icon: ReactNode; onClose: () => void; children: ReactNode
  tabs?: { id: string; label: string }[]; tab?: string; setTab?: (id: string) => void
}) {
  return <div className="sheet">
    <header className="sheet-head">
      <span className="sheet-icon" aria-hidden>{icon}</span>
      <div className="min-w-0"><h2 className="t-headline">{title}</h2>{subtitle && <p className="t-caption">{subtitle}</p>}</div>
      {tabs && setTab && <div className="seg ml-auto" role="tablist" aria-label={`${title}分组`} onKeyDown={onGroupKeyDown}>
        {tabs.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} className="seg-btn" onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>}
      <button className={`icon-btn ${tabs ? '' : 'ml-auto'}`} aria-label={`关闭${title}`} onClick={onClose}><X size={17}/></button>
    </header>
    <div className="sheet-body">{children}</div>
  </div>
}

/* ======================= 命令中心：会话 / 系统 / 用量 / 维护 ======================= */
export type CommandCenterTab = 'sessions' | 'system' | 'usage' | 'maintenance'
const CC_TABS = [{ id: 'sessions', label: '会话' }, { id: 'system', label: '系统' }, { id: 'usage', label: '用量' }, { id: 'maintenance', label: '维护' }]
const LOG_LINES = [
  { level: 'INFO', text: '18:02:11 gateway  会话 s1 收到新消息' },
  { level: 'INFO', text: '18:02:12 tools    network.probe 开始（12 个探测点）' },
  { level: 'WARN', text: '18:02:19 tools    ipv6-test.com 超时' },
  { level: 'INFO', text: '18:02:20 approval 新的审批请求：写入文件' },
  { level: 'ERROR', text: '17:40:03 cron     IPRoyal 到期提醒：投递到 Telegram 失败（已重试）' }
]
const DAILY = [['周一', 182], ['周二', 240], ['周三', 96], ['周四', 310], ['周五', 205], ['周六', 64], ['周日', 128]] as const

export function CommandCenter({ open, onClose, initialTab = 'sessions', sessions, sessionMenu, onOpenSession }: {
  open: boolean; onClose: () => void; initialTab?: CommandCenterTab
  sessions: MergedSession[]; sessionMenu: (s: MergedSession) => MenuEntry[]; onOpenSession: (id: string) => void
}) {
  const [tab, setTab] = useState<string>(initialTab)
  const [query, setQuery] = useState('')
  const [actions, setActions] = useState<Record<string, 'running' | 'done'>>({})
  const [logLevel, setLogLevel] = useState('ALL')
  const [period, setPeriod] = useState<'7' | '30'>('7')
  const timers = useRef<number[]>([])
  useEffect(() => { if (open) setTab(initialTab) }, [open, initialTab])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])
  const run = (id: string, ms = 1500) => {
    setActions(a => ({ ...a, [id]: 'running' }))
    timers.current.push(window.setTimeout(() => setActions(a => ({ ...a, [id]: 'done' })), ms))
  }
  const actionLabel = (id: string, label: string) => actions[id] === 'running' ? `${label} · 进行中…` : actions[id] === 'done' ? `${label} · 完成` : label
  const list = sessions.filter(s => s.title.toLowerCase().includes(query.trim().toLowerCase()))
  const max = Math.max(...DAILY.map(d => d[1]))
  const k = period === '7' ? 1 : 4.1

  return <Modal open={open} onClose={onClose} label="命令中心" className="sheet-modal">
    <Sheet title="命令中心" subtitle="会话、系统状态、用量与维护" icon={<Gauge size={18}/>} onClose={onClose} tabs={CC_TABS} tab={tab} setTab={setTab}>
      {tab === 'sessions' && <>
        <label className="task-search mb-4"><Search size={14} aria-hidden/><input aria-label="搜索全部会话" placeholder="搜索会话（含已归档）…" value={query} onChange={e => setQuery(e.target.value)}/></label>
        <div className="grouped">
          {list.map(s => <div key={s.id} className="grouped-row">
            <button className="flex-1 min-w-0 text-left" onClick={() => { onOpenSession(s.id); onClose() }}>
              <div className="flex items-center gap-1.5 text-[13.5px] font-medium">{s.pinned && <Pin size={12} aria-label="已置顶"/>}<span className="truncate">{s.title}</span>{s.archived && <span className="chip">已归档</span>}</div>
              <div className="t-caption">{s.profile} · {s.updatedAt}</div>
            </button>
            <Menu label={`${s.title} 的会话操作`} align="end" items={sessionMenu(s)} trigger={t => <button {...t} className="icon-btn" aria-label={`会话操作：${s.title}`}><MoreHorizontal size={16}/></button>} />
          </div>)}
          {list.length === 0 && <div className="grouped-row t-sub">没有匹配的会话。</div>}
        </div>
      </>}

      {tab === 'system' && <>
        <div className="grouped mb-5">
          <div className="grouped-row"><span className="status-dot" style={{ background: 'var(--success)' }} aria-hidden/><div className="flex-1"><div className="text-[13.5px] font-medium">消息网关运行中</div><div className="t-caption">Hermes（演示） · 活跃会话 3 · 本地后端</div></div></div>
          <div className="grouped-row flex-wrap">
            <button className="btn" aria-label="重启网关（模拟）" onClick={() => run('restart')} disabled={actions.restart === 'running'}><RefreshCw size={13} aria-hidden/>{actionLabel('restart', '重启网关（模拟）')}</button>
            <button className="btn" aria-label="检查更新（模拟）" onClick={() => run('update', 2200)} disabled={actions.update === 'running'}>{actionLabel('update', '检查更新（模拟）')}</button>
            <button className="btn" aria-label="重新载入窗口（模拟）" onClick={() => run('reload', 800)}>{actionLabel('reload', '重新载入窗口（模拟）')}</button>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-2"><h3 className="text-[13px] font-semibold flex-1">最近日志</h3>
          <div className="seg" role="radiogroup" aria-label="日志级别">{['ALL', 'WARN', 'ERROR'].map(l => <button key={l} role="radio" aria-checked={logLevel === l} className={`seg-btn ${logLevel === l ? 'active' : ''}`} onClick={() => setLogLevel(l)}>{l === 'ALL' ? '全部' : l}</button>)}</div>
        </div>
        <pre className="rp-terminal" role="log" aria-label="最近日志">{LOG_LINES.filter(l => logLevel === 'ALL' || l.level === logLevel || (logLevel === 'WARN' && l.level === 'ERROR')).map(l => `${l.level.padEnd(5)} ${l.text}`).join('\n')}</pre>
      </>}

      {tab === 'usage' && <>
        <div className="seg mb-4" role="radiogroup" aria-label="统计周期">{(['7', '30'] as const).map(d => <button key={d} role="radio" aria-checked={period === d} className={`seg-btn ${period === d ? 'active' : ''}`} onClick={() => setPeriod(d)}>最近 {d} 天</button>)}</div>
        <div className="stat-grid mb-5">
          {[['会话', Math.round(23 * k)], ['API 调用', Math.round(412 * k)], ['输入 / 输出词元', `${Math.round(1.2 * k * 10) / 10}M / ${Math.round(0.3 * k * 10) / 10}M`], ['预估成本', `$${(4.2 * k).toFixed(2)}`]].map(([l, v]) =>
            <div key={l} className="stat-tile"><span className="t-caption">{l}</span><strong>{v}</strong></div>)}
        </div>
        <h3 className="text-[13px] font-semibold mb-2">每日词元（千）</h3>
        <div className="bar-list mb-5">{DAILY.map(([d, v]) => <div key={d} className="bar-row"><span>{d}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${(v / max) * 100}%` }}/></div><span className="tabular-nums">{Math.round(v * k)}</span></div>)}</div>
        <div className="grid grid-cols-2 gap-4">
          <div><h3 className="text-[13px] font-semibold mb-2">常用模型</h3><div className="grouped">{[['Hermes 4 70B', '68%'], ['Hermes 4 405B', '24%'], ['Hermes 3 8B · 本地', '8%']].map(([m, v]) => <div key={m} className="grouped-row"><span className="flex-1 text-[13px]">{m}</span><span className="t-caption">{v}</span></div>)}</div></div>
          <div><h3 className="text-[13px] font-semibold mb-2">常用技能</h3><div className="grouped">{[['butler-commission', 41], ['github-dev', 18], ['butler-schoolwork', 9]].map(([m, v]) => <div key={m} className="grouped-row"><span className="flex-1 text-[13px] font-mono">{m}</span><span className="t-caption">{v} 次</span></div>)}</div></div>
        </div>
        <p className="t-caption mt-4">数据为演示内容。</p>
      </>}

      {tab === 'maintenance' && <MaintenancePanel />}
    </Sheet>
  </Modal>
}

/* ======================= 智能体 · 派生树（子代理实时活动） ======================= */
export function AgentsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [agents, setAgents] = useState([
    { id: 'a1', name: '审查子代理', task: '整理 IPv6 修复清单', state: 'running' as 'running' | 'done' | 'stopped', tools: 4, files: 2, age: '12 秒前', note: '' },
    { id: 'a2', name: '检索子代理', task: '核对 ZeroOmega 规则语法', state: 'done' as 'running' | 'done' | 'stopped', tools: 2, files: 0, age: '1 分钟前', note: '' }
  ])
  const [steerId, setSteerId] = useState<string | null>(null)
  const [steerText, setSteerText] = useState('')
  const update = (id: string, patch: Partial<typeof agents[number]>) => setAgents(list => list.map(a => a.id === id ? { ...a, ...patch } : a))
  return <Modal open={open} onClose={onClose} label="子代理" className="sheet-modal sheet-narrow">
    <Sheet title="子代理" subtitle="当前回合派出的子代理实时进度（演示）" icon={<Users size={18}/>} onClose={onClose}>
      <div className="flex flex-col gap-3">
        {agents.map(a => <div key={a.id} className="surface p-4">
          <div className="flex items-center gap-2">
            {a.state === 'running' ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--accent)' }} aria-hidden/> : a.state === 'done' ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} aria-hidden/> : <Square size={12} aria-hidden/>}
            <span className="text-[13.5px] font-semibold">{a.name}</span>
            <span className="t-caption">{a.state === 'running' ? '运行中' : a.state === 'done' ? '完成' : '已请求停止'} · 更新于 {a.age}</span>
          </div>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--fg-secondary)' }}>{a.task}</p>
          <p className="t-caption mt-1">{a.tools} 个工具 · {a.files} 个文件{a.note && ` · 已排队指令：${a.note}`}</p>
          {a.state === 'running' && (steerId === a.id ? <form className="flex gap-2 mt-3" onSubmit={e => { e.preventDefault(); if (steerText.trim()) { update(a.id, { note: steerText.trim() }); setSteerText(''); setSteerId(null) } }}>
            <input className="input" autoFocus aria-label={`给${a.name}的指令`} placeholder="此子代理的指令" value={steerText} onChange={e => setSteerText(e.target.value)}/>
            <button className="btn btn-primary" type="submit">发送</button><button className="btn" type="button" onClick={() => setSteerId(null)}>取消</button>
          </form> : <div className="flex gap-2 mt-3">
            <button className="btn" onClick={() => setSteerId(a.id)}>引导</button>
            <button className="btn btn-danger" onClick={() => update(a.id, { state: 'stopped' })}>停止</button>
          </div>)}
        </div>)}
      </div>
    </Sheet>
  </Modal>
}

/* ======================= 键盘快捷键（默认值取自官方 lib/keybinds/actions.ts，Windows 下 mod = Ctrl） ======================= */
const SHORTCUTS: { group: string; items: [string, string][] }[] = [
  { group: '导航', items: [['打开命令面板', 'Ctrl K'], ['打开命令中心', 'Ctrl .'], ['打开设置', 'Ctrl ,'], ['打开键盘快捷键', 'Ctrl /']] },
  { group: '会话', items: [['新建会话', 'Ctrl N'], ['下一个会话', 'Ctrl Tab'], ['上一个会话', 'Ctrl Shift Tab'], ['搜索会话', 'Ctrl Shift F'], ['向上 / 向下翻页', 'PgUp / PgDn']] },
  { group: '输入框', items: [['聚焦输入框', '/'], ['发送消息', 'Enter'], ['插入换行', 'Shift Enter'], ['消息排队', 'Ctrl Enter'], ['打开模型选择器', 'Ctrl Shift M'], ['开始 / 停止语音对话', 'Ctrl Alt V'], ['斜杠命令', '/'], ['引用文件、文件夹、网址', '@'], ['关闭弹窗 · 停止运行', 'Esc']] },
  { group: '视图', items: [['切换侧边栏', 'Ctrl B'], ['切换右侧面板（高级模式）', 'Ctrl J'], ['切换审查面板', 'Ctrl G'], ['显示终端', 'Ctrl `'], ['页面内查找', 'Ctrl F'], ['切换浅色 / 深色', 'Shift X'], ['HUD 模式', 'Ctrl Shift H']] },
  { group: '配置档案', items: [['切换到默认配置', 'Ctrl D'], ['下一个配置', 'Ctrl Shift ]'], ['上一个配置', 'Ctrl Shift [']] }
]
export function ShortcutsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  return <Modal open={open} onClose={onClose} label="键盘快捷键" className="sheet-modal sheet-narrow">
    <Sheet title="键盘快捷键" subtitle="与官方 Hermes Desktop 默认值一致 · 演示版暂不支持改键" icon={<Keyboard size={18}/>} onClose={onClose}>
      <label className="task-search mb-4"><Search size={14} aria-hidden/><input aria-label="搜索快捷键" placeholder="搜索快捷键…" value={q} onChange={e => setQ(e.target.value)}/></label>
      {SHORTCUTS.map(g => { const items = g.items.filter(([l]) => l.includes(q.trim())); return items.length > 0 && <section key={g.group} className="mb-4">
        <h3 className="text-[12px] font-semibold mb-1.5" style={{ color: 'var(--fg-tertiary)' }}>{g.group}</h3>
        <div className="grouped">{items.map(([l, k]) => <div key={l} className="grouped-row"><span className="flex-1 text-[13px]">{l}</span><span className="kbd-group">{k.split(' ').map((x, i) => <kbd key={i}>{x}</kbd>)}</span></div>)}</div>
      </section> })}
    </Sheet>
  </Modal>
}

/* ======================= 会话导入：从 Claude Code / Codex 继续 ======================= */
const IMPORTS = [
  { id: 'i1', source: 'Claude Code', title: '重构 butler 的提醒模块', folder: '~/code/butler', messages: 42 },
  { id: 'i2', source: 'Codex', title: '给早报脚本加 GitHub trending', folder: '~/code/daily-brief', messages: 18 },
  { id: 'i3', source: 'Claude Code', title: '排查代理 IPv6 泄漏', folder: '~/code/net-audit', messages: 27 }
]
export function SessionImport({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [source, setSource] = useState('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [state, setState] = useState<'idle' | 'importing' | 'done'>('idle')
  useEffect(() => { if (open) { setSelected(null); setState('idle') } }, [open])
  const pick = IMPORTS.find(i => i.id === selected)
  const list = IMPORTS.filter(i => source === 'all' || i.source === source)
  return <Modal open={open} onClose={onClose} label="导入会话" className="sheet-modal sheet-narrow">
    <Sheet title="从其他应用继续" subtitle="把 Claude Code、Codex 里的对话导入 Hermes，接着上次的进度继续" icon={<FolderInput size={18}/>} onClose={onClose}>
      <div className="seg mb-4" role="radiogroup" aria-label="来源">{[['all', '全部'], ['Claude Code', 'Claude Code'], ['Codex', 'Codex']].map(([id, l]) => <button key={id} role="radio" aria-checked={source === id} className={`seg-btn ${source === id ? 'active' : ''}`} onClick={() => setSource(id)}>{l}</button>)}</div>
      {!pick ? <div className="grouped">{list.map(i => <button key={i.id} className="grouped-row" onClick={() => setSelected(i.id)}>
        <Bot size={16} aria-hidden style={{ color: 'var(--fg-tertiary)' }}/>
        <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-medium truncate">{i.title}</span><span className="t-caption">{i.source} · {i.folder} · {i.messages} 条消息</span></span>
      </button>)}</div> : <div className="surface p-4">
        <p className="text-[13.5px] font-semibold">{pick.title}</p>
        <p className="t-caption mb-3">{pick.source} · {pick.folder}</p>
        <div className="import-preview"><p><b>你：</b>{pick.title}，先看看现在的结构。</p><p><b>{pick.source}：</b>我先读一下目录，然后给出修改计划……</p></div>
        <p className="t-caption mt-3">只复制对话文字，不会改动原文件；不包含工具输出和推理内容。</p>
        <div className="flex gap-2 mt-4">
          <button className="btn" onClick={() => setSelected(null)}>返回</button>
          <button className="btn btn-primary" disabled={state !== 'idle'} onClick={() => { setState('importing'); window.setTimeout(() => setState('done'), 900) }}>
            {state === 'idle' ? '在 Hermes 中继续' : state === 'importing' ? '正在导入…' : '已导入（模拟）'}
          </button>
        </div>
      </div>}
    </Sheet>
  </Modal>
}

