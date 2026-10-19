import { onGroupKeyDown } from '../lib/keyboard'
import {
  CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, CircleDashed,
  Database, FileDown, HeartPulse, Play, Plus, ScanSearch, Share2, Sparkles,
  Trash2, Wrench, X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { MockBadge } from '../components/MockBadge'
import { Modal } from '../components/Modal'
import { mockCronJobs, mockTasks, type CronJob, type TaskItem } from '../mock/data'

/* ---------------- 定时任务 ---------------- */

const SCHEDULES = ['每天 09:45', '每天 21:45', '每小时', '每周一 09:00', '手动触发']

function CronTab({ query }: { query: string }) {
  const [jobs, setJobs] = useState<CronJob[]>(mockCronJobs)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [schedule, setSchedule] = useState(SCHEDULES[0])
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const toggle = (id: string) =>
    setJobs(prev => prev.map(j => (j.id === id ? { ...j, enabled: !j.enabled } : j)))

  const runNow = (id: string) => {
    if (runningId) return
    setRunningId(id)
    timers.current.push(window.setTimeout(() => {
      setJobs(prev => prev.map(j => (j.id === id ? { ...j, lastStatus: 'ok' as const } : j)))
      setRunningId(null)
    }, 1400))
  }

  const add = () => {
    const n = name.trim()
    if (!n) return
    setJobs(prev => [...prev, {
      id: `mock-${Date.now()}`, name: n + '（模拟）',
      schedule, nextRun: schedule === '手动触发' ? '—' : '待定', enabled: true, lastStatus: 'never'
    }])
    setName(''); setAdding(false)
  }

  const del = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id))
    setConfirmDel(null)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CalendarClock size={15} style={{ color: 'var(--accent)' }} aria-hidden />
        <h3 className="text-[13.5px] font-semibold">定时任务</h3>
        <span className="text-[11.5px]" style={{ color: 'var(--fg-tertiary)' }}>{jobs.filter(j => j.enabled).length} 启用 / {jobs.length} 共计</span>
        <button className="btn btn-primary ml-auto" style={{ padding: '5px 12px', fontSize: 12 }} onClick={() => setAdding(v => !v)}>
          <Plus size={13} aria-hidden />新建
        </button>
      </div>

      {adding && (
        <div className="surface-overlay p-3.5 mb-3 view-enter" role="form" aria-label="新建定时任务">
          <div className="flex flex-col gap-2.5">
            <label className="text-[12px] font-medium" style={{ color: 'var(--fg-secondary)' }}>
              任务名称
              <input className="input mt-1" value={name} onChange={e => setName(e.target.value)}
                placeholder="例如：每周网络巡检（模拟）" maxLength={40} autoFocus />
            </label>
            <label className="text-[12px] font-medium" style={{ color: 'var(--fg-secondary)' }}>
              执行计划
              <select className="input mt-1" value={schedule} onChange={e => setSchedule(e.target.value)}>
                {SCHEDULES.map(s => <option key={s}>{s}</option>)}
              </select>
            </label>
            <div className="flex gap-2 justify-end">
              <button className="btn" style={{ fontSize: 12 }} onClick={() => { setAdding(false); setName('') }}>取消</button>
              <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={add} disabled={!name.trim()}>创建（模拟）</button>
            </div>
          </div>
        </div>
      )}

      <div className="grouped view-enter" role="list" aria-label="定时任务列表">
        {jobs.filter(j => j.name.toLowerCase().includes(query.toLowerCase())).map(j => (
          <div key={j.id} className="grouped-row cron-row" role="listitem">
            <button
              onClick={() => toggle(j.id)}
              className="w-9 h-5 rounded-full relative transition-colors shrink-0"
              style={{ background: j.enabled ? 'var(--accent)' : 'var(--switch-off)' }}
              role="switch" aria-checked={j.enabled} aria-label={`${j.name} ${j.enabled ? '启用中' : '已暂停'}`}
              title={j.enabled ? '暂停' : '启用'}
            >
              <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                style={{ left: j.enabled ? 18 : 2, background: 'var(--switch-thumb)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium truncate">{j.name}</div>
              <div className="text-[11.5px]" style={{ color: 'var(--fg-tertiary)' }}>{j.schedule} · 下次 {j.nextRun}</div>
            </div>
            {runningId === j.id ? (
              <span className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent)' }} role="status">运行中（模拟）…</span>
            ) : (
              <span className="chip" style={j.lastStatus === 'ok' ? { color: 'var(--success)' } : j.lastStatus === 'error' ? { color: 'var(--danger)' } : {}}>
                {j.lastStatus === 'ok' ? '上次成功' : j.lastStatus === 'error' ? '上次失败' : '尚未运行'}
              </span>
            )}
            <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => runNow(j.id)}
              disabled={runningId !== null} title="立即运行（模拟）">
              <Play size={12} aria-hidden />运行
            </button>
            {confirmDel === j.id ? (
              <span className="flex items-center gap-1.5 text-[12px]" role="alertdialog" aria-label="确认删除">
                <span style={{ color: 'var(--danger)' }}>删除？</span>
                <button className="btn" style={{ padding: '3px 8px', fontSize: 11, color: 'var(--danger)' }} onClick={() => del(j.id)}>确认</button>
                <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setConfirmDel(null)}>取消</button>
              </span>
            ) : (
              <button className="btn" style={{ padding: 5 }} onClick={() => setConfirmDel(j.id)} aria-label={`删除 ${j.name}`} title="删除">
                <Trash2 size={13} aria-hidden />
              </button>
            )}
          </div>
        ))}
        {jobs.length > 0 && !jobs.some(j => j.name.toLowerCase().includes(query.toLowerCase())) && <p className="p-6 t-sub text-center">没有匹配的任务，请试试其他关键词。</p>}
        {jobs.length === 0 && (
          <div className="surface-overlay p-8 text-center view-enter">
            <CalendarClock size={22} style={{ color: 'var(--fg-tertiary)' }} className="mx-auto mb-2" aria-hidden />
            <p className="text-[13px]" style={{ color: 'var(--fg-secondary)' }}>暂无定时任务</p>
            <button className="btn btn-primary mt-3" style={{ fontSize: 12 }} onClick={() => setAdding(true)}><Plus size={13} aria-hidden />新建任务（模拟）</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------- 看板 ---------------- */

const COLS: { id: TaskItem['column']; label: string }[] = [
  { id: 'todo', label: '待办' },
  { id: 'doing', label: '进行中' },
  { id: 'done', label: '已完成' }
]

function KanbanTab({ query }: { query: string }) {
  const [tasks, setTasks] = useState<TaskItem[]>(mockTasks)
  const [addingCol, setAddingCol] = useState<TaskItem['column'] | null>(null)
  const [draft, setDraft] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [removed, setRemoved] = useState<TaskItem | null>(null)
  const selected = tasks.find(t => t.id === selectedId)

  const move = (id: string, dir: -1 | 1) =>
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const i = COLS.findIndex(c => c.id === t.column)
      const ni = Math.min(2, Math.max(0, i + dir))
      return { ...t, column: COLS[ni].id }
    }))

  const add = (col: TaskItem['column']) => {
    const t = draft.trim()
    if (!t) return
    setTasks(prev => [...prev, { id: `t-${Date.now()}`, title: t + '（模拟）', column: col, tag: '新建' }])
    setDraft(''); setAddingCol(null)
  }

  const del = (id: string) => { setRemoved(tasks.find(t => t.id === id) ?? null); setTasks(prev => prev.filter(t => t.id !== id)); setSelectedId(null) }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-[13.5px] font-semibold">任务看板</h3>
        <span className="text-[11.5px]" style={{ color: 'var(--fg-tertiary)' }}>打开卡片查看详情，或用箭头调整进度（模拟）</span>
      </div>
      <div className="task-board">
        {COLS.map(c => {
          const items = tasks.filter(t => t.column === c.id && t.title.toLowerCase().includes(query.toLowerCase()))
          return (
            <div key={c.id} className="board-column rounded-xl p-2.5" style={{ background: 'var(--bg-sunken)' }}>
              <div className="flex items-center gap-1.5 px-1.5 pb-2 text-[12px] font-semibold" style={{ color: 'var(--fg-secondary)' }}>
                {c.id === 'done' ? <CheckCircle2 size={13} style={{ color: 'var(--success)' }} aria-hidden /> : <CircleDashed size={13} aria-hidden />}
                {c.label}
                <span className="ml-auto chip">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2" role="group" aria-label={`${c.label}列`}>
                {items.length === 0 && <p className="t-caption py-3 px-1">{query ? '没有匹配的任务' : '留一点空间，给下一步。'}</p>}
                {items.map(t => (
                  <div key={t.id} className="board-card p-3 group view-enter" role="article">
                    <button className="text-[13px] font-medium leading-relaxed text-left w-full" onClick={() => setSelectedId(t.id)}>{t.title}</button>
                    <div className="flex items-center gap-1 mt-2">
                      {t.tag && <span className="chip">{t.tag}</span>}
                      <span className="board-actions ml-auto flex items-center gap-0.5 transition-opacity">
                        <button className="icon-btn task-action" style={{ padding: 3 }} disabled={c.id === 'todo'} onClick={() => move(t.id, -1)} aria-label={`将 ${t.title} 移到上一列`} title="移到上一列"><ChevronLeft size={13} aria-hidden /></button>
                        <button className="icon-btn task-action" style={{ padding: 3 }} disabled={c.id === 'done'} onClick={() => move(t.id, 1)} aria-label={`将 ${t.title} 移到下一列`} title="移到下一列"><ChevronRight size={13} aria-hidden /></button>
                        <button className="icon-btn task-action" style={{ padding: 3 }} onClick={() => del(t.id)} aria-label={`删除卡片 ${t.title}`} title="删除"><X size={13} aria-hidden /></button>
                      </span>
                    </div>
                  </div>
                ))}
                {addingCol === c.id ? (
                  <div className="surface-overlay p-2.5 view-enter">
                    <input className="input" style={{ fontSize: 12 }} value={draft}
                      onChange={e => setDraft(e.target.value)} placeholder="卡片标题…"
                      autoFocus maxLength={60}
                      onKeyDown={e => { if (e.key === 'Enter') add(c.id); if (e.key === 'Escape') setAddingCol(null) }} />
                    <div className="flex gap-1.5 mt-2 justify-end">
                      <button className="btn" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => setAddingCol(null)}>取消</button>
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: '3px 8px' }} onClick={() => add(c.id)} disabled={!draft.trim()}>添加</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn w-full" style={{ fontSize: 12, padding: '6px' }} onClick={() => { setAddingCol(c.id); setDraft('') }}>
                    <Plus size={13} aria-hidden />添加卡片
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {removed && <div className="task-toast" role="status">已删除「{removed.title}」（模拟）<button className="btn btn-plain" onClick={() => { setTasks(p => [...p, removed]); setRemoved(null) }}>撤销</button></div>}
      <Modal open={!!selected} onClose={() => setSelectedId(null)} label="任务详情" className="task-detail">
        {selected && <><div className="flex items-center justify-between"><span className="eyebrow">TASK DETAILS · MOCK</span><button className="icon-btn" aria-label="关闭任务详情" onClick={() => setSelectedId(null)}><X size={17}/></button></div>
        <h3>{selected.title}</h3><label className="t-caption">进度<select className="input mt-2 mb-4" value={selected.column} onChange={e => setTasks(p => p.map(t => t.id === selected.id ? { ...t, column: e.target.value as TaskItem['column'] } : t))}>{COLS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <p>当前仅调整本地看板进度。不会启动 Agent，也不会执行真实任务。</p><div className="flex items-center justify-end mt-6"><button className="btn btn-primary" onClick={() => setSelectedId(null)}>完成</button></div></>}
      </Modal>
    </div>
  )
}

/* ---------------- 运维 ---------------- */

interface OpDef { id: string; icon: typeof Wrench; name: string; desc: string; lines: string[] }

const OPS: OpDef[] = [
  { id: 'doctor', icon: HeartPulse, name: 'hermes doctor', desc: '环境自检：依赖、权限、网络连通性', lines: ['✓ node 22.14.0', '✓ electron 38', '✓ 后端连接正常（模拟）', '✓ 磁盘空间充足', '自检通过（模拟）'] },
  { id: 'audit', icon: ScanSearch, name: 'security audit', desc: '安全审计：密钥、权限面、审批记录', lines: ['扫描 24 项…（模拟）', '✓ 无明文密钥', '✓ 审批日志完整', '审计通过（模拟）'] },
  { id: 'backup', icon: Database, name: 'backup', desc: '备份 profiles、记忆与配置快照', lines: ['打包 profiles…（模拟）', '打包 memory…（模拟）', '✓ 快照已保存（模拟）'] },
  { id: 'share', icon: Share2, name: 'debug share', desc: '生成脱敏诊断包用于求助', lines: ['收集日志…（模拟）', '脱敏处理…（模拟）', '✓ 诊断包就绪（模拟）'] },
  { id: 'curator', icon: Sparkles, name: 'curator', desc: '记忆策展：合并重复、归档过期', lines: ['扫描 132 条记忆…（模拟）', '合并 3 条重复（模拟）', '✓ 策展完成（模拟）'] },
  { id: 'export', icon: FileDown, name: 'memory export', desc: '导出记忆为 Markdown 归档', lines: ['渲染 Markdown…（模拟）', '✓ 已导出（模拟）'] }
]

/** 维护面板：在命令中心 › 维护中使用（对应官方 command-center maintenance） */
export function MaintenancePanel() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [lastId, setLastId] = useState<string | null>(null)
  const [lines, setLines] = useState<string[]>([])
  const timers = useRef<number[]>([])
  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  const run = (op: OpDef) => {
    if (activeId) return
    setActiveId(op.id)
    setLastId(op.id)
    setLines([])
    op.lines.forEach((ln, i) => {
      timers.current.push(window.setTimeout(() => {
        setLines(prev => [...prev, ln])
        if (i === op.lines.length - 1) {
          timers.current.push(window.setTimeout(() => setActiveId(null), 1200))
        }
      }, 500 * (i + 1)))
    })
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Wrench size={15} style={{ color: 'var(--accent)' }} aria-hidden />
        <h3 className="text-[13.5px] font-semibold">维护</h3>
        <span className="text-[11.5px]" style={{ color: 'var(--fg-tertiary)' }}>诊断与清理（演示）</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {OPS.map(op => {
          const Icon = op.icon
          const running = activeId === op.id
          return (
            <div key={op.id} className="surface-overlay p-4">
              <div className="flex items-center gap-2">
                <Icon size={15} style={{ color: 'var(--accent)' }} aria-hidden />
                <span className="text-[13px] font-semibold font-mono">{op.name}</span>
                <button className="btn btn-primary ml-auto" style={{ fontSize: 12, padding: '4px 12px' }}
                  onClick={() => run(op)} disabled={activeId !== null}>
                  <Play size={12} aria-hidden />{running ? '运行中…' : '运行'}
                </button>
              </div>
              <p className="text-[12px] mt-1" style={{ color: 'var(--fg-tertiary)' }}>{op.desc}</p>
              {lastId === op.id && (
                <div className="mt-2.5 rounded-lg p-2.5 font-mono text-[11.5px] leading-relaxed view-enter"
                  style={{ background: 'var(--bg-sunken)', color: 'var(--fg-secondary)' }} role="log" aria-label={`${op.name} 运行日志`}>
                  {lines.map((ln, i) => <div key={i}>{ln}</div>)}
                  {running && lines.length < op.lines.length && <span className="animate-pulse">▊</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- 主视图 ---------------- */

const TABS = [
  { id: 'cron', label: '定时任务' },
  { id: 'kanban', label: '看板' }
] as const

export function TasksView() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('cron')
  const [query, setQuery] = useState('')

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="content-page">
        <div className="page-head"><span className="eyebrow mb-3">YOUR WORK, IN A GOOD RHYTHM</span>
          <div className="flex items-center gap-2">
            <h2 className="t-title">任务</h2>
            <MockBadge />
          </div>
          <p className="t-sub page-desc">定时执行的任务，和一步一步推进的看板。</p>
        </div>
        <div className="seg mb-5" role="tablist" onKeyDown={onGroupKeyDown} aria-label="任务二级导航">
          {TABS.map(t => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1}
              className="seg-btn"
              onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        {<label className="task-search mb-6"><ScanSearch size={15}/><input aria-label="搜索任务" placeholder="搜索任务…" value={query} onChange={e => setQuery(e.target.value)}/></label>}
        <div className="view-enter" hidden={tab !== 'cron'}><CronTab query={query}/></div>
        <div className="view-enter" hidden={tab !== 'kanban'}><KanbanTab query={query}/></div>
      </div>
    </div>
  )
}
