import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Brain, Check, Clock, Link2, Plus, RotateCcw,
  Search, SearchX, Share2, Tag, Trash2, X
} from 'lucide-react'
import { MockBadge } from '../components/MockBadge'
import {
  mockMemory, mockMemoryEdges, mockMemoryNodes,
  type MemoryEntry, type MemoryNode
} from '../mock/data'

type Kind = MemoryEntry['kind']

const kindLabel: Record<Kind, string> = { fact: '事实', preference: '偏好', project: '项目' }
const kindColor: Record<Kind, string> = {
  fact: 'var(--ui-accent)',
  preference: 'var(--ui-ok)',
  project: 'var(--ui-warn)'
}

/* 图谱节点的本地补充信息（MOCK）。mock/data.ts 不动，元数据只活在这个视图里。 */
const NODE_META: Record<string, { desc: string; tag: string }> = {
  n1: { desc: '记忆图谱的中心：所有条目都挂在这下面', tag: '核心' },
  n2: { desc: '为 Hermes Desktop 做新交互：原型、设计系统、架构衔接', tag: '项目' },
  n3: { desc: 'Claude Code 审计宿舍网络：分阶段跑报告，我当监工', tag: '项目' },
  n4: { desc: '每天 09:45 的 AI 早报，素材整理后投递', tag: '项目' },
  n5: { desc: '每天 21:45 左右：3–5 个可动手做的点子，去重后投递', tag: '项目' },
  n6: { desc: '私人智能管家定制层：只读，不直接改', tag: '项目' },
  n7: { desc: '写代码的执行者：几次 session 出一个 MVP', tag: '工具' },
  n8: { desc: '舍友抽烟：桌面空气净化器方案，不伤和气', tag: '场景' }
}

/* ---------------- 条目 Tab ---------------- */

function EntryRow({
  entry, onDelete
}: {
  entry: MemoryEntry
  onDelete: (id: string) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="flat-panel px-4 py-3 flex items-start gap-3 view-enter">
      <span
        className="chip shrink-0 mt-0.5"
        style={{ color: kindColor[entry.kind], borderColor: kindColor[entry.kind] }}
      >
        {kindLabel[entry.kind]}
      </span>
      <div className="flex-1 text-[13px] leading-relaxed min-w-0">{entry.text}</div>
      <span
        className="text-[11px] shrink-0 flex items-center gap-1"
        style={{ color: 'var(--ui-fg-faint)' }}
        title="更新时间"
      >
        <Clock size={11} aria-hidden />{entry.updatedAt}
      </span>
      {confirming ? (
        <div className="shrink-0 flex items-center gap-1.5" role="alertdialog" aria-label="确认删除记忆条目">
          <span className="text-[11.5px]" style={{ color: 'var(--ui-danger)' }}>确认删除？</span>
          <button
            className="btn"
            style={{ padding: '3px 10px', borderColor: 'var(--ui-danger)', color: 'var(--ui-danger)' }}
            onClick={() => { setConfirming(false); onDelete(entry.id) }}
          >
            删除
          </button>
          <button
            ref={cancelRef}
            className="btn"
            style={{ padding: '3px 10px' }}
            onClick={() => setConfirming(false)}
            onKeyDown={e => { if (e.key === 'Escape') setConfirming(false) }}
          >
            取消
          </button>
        </div>
      ) : (
        <button
          className="btn shrink-0"
          style={{ padding: 5 }}
          onClick={() => { setConfirming(true); requestAnimationFrame(() => cancelRef.current?.focus()) }}
          aria-label={`删除记忆：${entry.text.slice(0, 20)}`}
          title="删除这条记忆"
        >
          <Trash2 size={13} aria-hidden />
        </button>
      )}
    </div>
  )
}

function EntriesTab() {
  const [entries, setEntries] = useState<MemoryEntry[]>(() => [...mockMemory])
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [draftKind, setDraftKind] = useState<Kind>('fact')
  const [flash, setFlash] = useState<string | null>(null)
  const flashTimer = useRef<number | null>(null)

  const showFlash = (msg: string) => {
    setFlash(msg)
    if (flashTimer.current) window.clearTimeout(flashTimer.current)
    flashTimer.current = window.setTimeout(() => setFlash(null), 2600)
  }

  const counts = useMemo(() => {
    const c: Record<Kind | 'all', number> = { all: entries.length, fact: 0, preference: 0, project: 0 }
    entries.forEach(e => { c[e.kind] += 1 })
    return c
  }, [entries])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter(e =>
      (kind === 'all' || e.kind === kind) &&
      (!q || e.text.toLowerCase().includes(q))
    )
  }, [entries, query, kind])

  const addEntry = () => {
    const text = draft.trim()
    if (!text) return
    setEntries(prev => [
      { id: `e-${Date.now()}`, kind: draftKind, text, updatedAt: '刚刚' },
      ...prev
    ])
    setDraft('')
    setAdding(false)
    showFlash('已保存（模拟）')
  }

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    showFlash('已删除（模拟）')
  }

  return (
    <div className="max-w-[760px]">
      {/* 搜索 + 筛选 */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search
            size={14}
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--ui-fg-faint)' }}
          />
          <label htmlFor="memory-search" className="sr-only">搜索记忆条目</label>
          <input
            id="memory-search"
            className="input w-full"
            style={{ paddingLeft: 32 }}
            placeholder="搜索记忆内容…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}
          />
          {query && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 btn"
              style={{ padding: 3, border: 'none' }}
              onClick={() => setQuery('')}
              aria-label="清除搜索"
            >
              <X size={13} aria-hidden />
            </button>
          )}
        </div>
        <button className="btn btn-primary shrink-0" onClick={() => setAdding(v => !v)} aria-expanded={adding}>
          <Plus size={14} aria-hidden />{adding ? '收起' : '新增记忆'}
        </button>
      </div>

      <div className="flex items-center gap-1.5 mb-3 flex-wrap" role="group" aria-label="按类型筛选">
        {(['all', 'fact', 'preference', 'project'] as const).map(k => {
          const active = kind === k
          return (
            <button
              key={k}
              className="chip"
              style={active
                ? { background: 'var(--ui-accent-dim)', borderColor: 'var(--ui-accent)', color: 'var(--ui-accent)', fontWeight: 600 }
                : { cursor: 'pointer' }}
              onClick={() => setKind(k)}
              aria-pressed={active}
            >
              {k === 'all' ? '全部' : kindLabel[k]}
              <span className="ml-1 opacity-70">{counts[k]}</span>
            </button>
          )
        })}
        <span className="ml-auto"><MockBadge label="MOCK" /></span>
      </div>

      {/* 新增表单 */}
      {adding && (
        <div className="flat-panel p-4 mb-3 view-enter" role="form" aria-label="新增记忆条目">
          <label htmlFor="memory-draft" className="text-[12.5px] font-semibold block mb-1.5">记忆内容</label>
          <textarea
            id="memory-draft"
            className="input w-full"
            rows={3}
            placeholder="例如：每周三下午没课，可以安排长任务…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addEntry()
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span className="text-[12px]" style={{ color: 'var(--ui-fg-muted)' }}>类型</span>
            <div className="flex gap-1.5" role="radiogroup" aria-label="记忆类型">
              {(['fact', 'preference', 'project'] as const).map(k => (
                <button
                  key={k}
                  role="radio"
                  aria-checked={draftKind === k}
                  className="chip"
                  style={draftKind === k
                    ? { background: 'var(--ui-accent-dim)', borderColor: kindColor[k], color: kindColor[k], fontWeight: 600, cursor: 'pointer' }
                    : { cursor: 'pointer' }}
                  onClick={() => setDraftKind(k)}
                >
                  {kindLabel[k]}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-1.5">
              <button className="btn" onClick={() => setAdding(false)}>取消</button>
              <button className="btn btn-primary" onClick={addEntry} disabled={!draft.trim()}>
                <Check size={14} aria-hidden />保存（模拟）
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作反馈 */}
      <div aria-live="polite" className="h-6 mb-1">
        {flash && (
          <span className="text-[12px] flex items-center gap-1.5" style={{ color: 'var(--ui-ok)' }}>
            <Check size={13} aria-hidden />{flash}
          </span>
        )}
      </div>

      {/* 列表 / 空状态 */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-2" role="list" aria-label="记忆条目">
          {filtered.map(e => (
            <div key={e.id} role="listitem"><EntryRow entry={e} onDelete={deleteEntry} /></div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flat-panel py-12 px-6 flex flex-col items-center text-center gap-2">
          <Brain size={28} aria-hidden style={{ color: 'var(--ui-fg-faint)' }} />
          <p className="text-[13.5px] font-medium">记忆是空的</p>
          <p className="text-[12px] mb-2" style={{ color: 'var(--ui-fg-muted)' }}>
            加一条偏好或事实，Hermes 会在以后的对话里记住它（原型为模拟）。
          </p>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden />新增第一条记忆
          </button>
        </div>
      ) : (
        <div className="flat-panel py-12 px-6 flex flex-col items-center text-center gap-2">
          <SearchX size={28} aria-hidden style={{ color: 'var(--ui-fg-faint)' }} />
          <p className="text-[13.5px] font-medium">没有找到匹配的记忆</p>
          <p className="text-[12px] mb-2" style={{ color: 'var(--ui-fg-muted)' }}>
            换个关键词，或者放宽类型筛选试试。
          </p>
          <button className="btn" onClick={() => { setQuery(''); setKind('all') }}>
            <RotateCcw size={13} aria-hidden />清除搜索与筛选
          </button>
        </div>
      )}
    </div>
  )
}

/* ---------------- 图谱 Tab ---------------- */

function GraphTab() {
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const nodeById = useMemo(
    () => Object.fromEntries(mockMemoryNodes.map(n => [n.id, n])) as Record<string, MemoryNode>,
    []
  )
  const neighbors = useMemo(() => {
    const m = new Map<string, Set<string>>()
    mockMemoryNodes.forEach(n => m.set(n.id, new Set()))
    mockMemoryEdges.forEach(([a, b]) => { m.get(a)?.add(b); m.get(b)?.add(a) })
    return m
  }, [])

  const focusId = selected ?? hovered
  const highlight = useMemo(() => {
    if (!focusId) return null
    return new Set([focusId, ...(neighbors.get(focusId) ?? [])])
  }, [focusId, neighbors])

  // Esc 清除选中
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selNode = selected ? nodeById[selected] : null
  const selNeighbors = selected ? [...(neighbors.get(selected) ?? [])] : []

  return (
    <div className="flex flex-col xl:flex-row gap-3 items-start">
      <div className="flex-1 w-full min-w-0">
        <div className="relative">
          <svg
            viewBox="0 0 600 420"
            className="w-full rounded-xl"
            style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-stroke)' }}
            role="group"
            aria-label="记忆知识图谱：点击节点查看关联"
          >
            {mockMemoryEdges.map(([a, b], i) => {
              const p = nodeById[a], q = nodeById[b]
              const inSet = !highlight || (highlight.has(a) && highlight.has(b))
              return (
                <line
                  key={i}
                  x1={p.x} y1={p.y} x2={q.x} y2={q.y}
                  stroke={inSet ? 'var(--ui-accent)' : 'var(--ui-fg-faint)'}
                  strokeWidth={inSet && selected ? 2 : 1.2}
                  opacity={inSet ? 0.55 : 0.14}
                  style={{ transition: 'opacity 180ms ease, stroke-width 180ms ease' }}
                />
              )
            })}
            {mockMemoryNodes.map(n => {
              const dim = highlight && !highlight.has(n.id)
              const isSel = selected === n.id
              return (
                <g
                  key={n.id}
                  tabIndex={0}
                  role="button"
                  aria-label={`节点 ${n.label}，${neighbors.get(n.id)?.size ?? 0} 个关联。回车查看详情。`}
                  aria-pressed={isSel}
                  onClick={() => setSelected(isSel ? null : n.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(isSel ? null : n.id) }
                  }}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(n.id)}
                  onBlur={() => setHovered(null)}
                  style={{ cursor: 'pointer', opacity: dim ? 0.28 : 1, transition: 'opacity 180ms ease', outline: 'none' }}
                >
                  <circle
                    cx={n.x} cy={n.y}
                    r={isSel ? n.size + 4 : n.size}
                    fill={isSel ? 'var(--ui-accent-dim)' : 'rgba(122,162,247,0.16)'}
                    stroke="var(--ui-accent)"
                    strokeWidth={isSel ? 2.5 : 1.5}
                    style={{ transition: 'r 180ms ease, stroke-width 180ms ease' }}
                  />
                  <text
                    x={n.x} y={n.y + n.size + 15}
                    textAnchor="middle"
                    fill={isSel ? 'var(--ui-fg)' : 'var(--ui-fg-muted)'}
                    fontSize={11.5}
                    fontWeight={isSel ? 600 : 400}
                  >
                    {n.label}
                  </text>
                </g>
              )
            })}
          </svg>
          {/* hover tooltip */}
          {hovered && !selected && (
            <div
              className="absolute pointer-events-none px-2.5 py-1.5 rounded-lg text-[11.5px] whitespace-nowrap"
              style={{
                left: `${(nodeById[hovered].x / 600) * 100}%`,
                top: `${(nodeById[hovered].y / 420) * 100}%`,
                transform: 'translate(-50%, calc(-100% - 14px))',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--ui-stroke)',
                boxShadow: 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.12))',
                color: 'var(--ui-fg)'
              }}
              role="tooltip"
            >
              <span className="font-semibold">{nodeById[hovered].label}</span>
              <span style={{ color: 'var(--ui-fg-faint)' }}> · {neighbors.get(hovered)?.size ?? 0} 个关联</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <p className="text-[11.5px]" style={{ color: 'var(--ui-fg-faint)' }}>
            示意（MOCK）：节点大小表示权重，点击节点查看关联。真实集成后替换为 d3-force，数据源为 Starmap 的 profile 图谱。
          </p>
          {selected && (
            <button className="btn ml-auto" style={{ padding: '4px 10px' }} onClick={() => setSelected(null)}>
              <RotateCcw size={12} aria-hidden />重置视图
            </button>
          )}
        </div>
      </div>

      {/* 详情面板 */}
      <aside
        className="surface-overlay rounded-xl p-4 w-full xl:w-[280px] shrink-0 view-enter"
        aria-label="节点详情"
        aria-live="polite"
      >
        {selNode ? (
          <div key={selNode.id}>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-[14px] font-bold">{selNode.label}</h3>
              <button
                className="btn"
                style={{ padding: 4, border: 'none' }}
                onClick={() => setSelected(null)}
                aria-label="关闭节点详情"
              >
                <X size={13} aria-hidden />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
              <span className="chip" style={{ color: 'var(--ui-accent)', borderColor: 'var(--ui-accent)' }}>
                <Tag size={10} aria-hidden />{NODE_META[selNode.id]?.tag ?? '节点'}
              </span>
              <span className="chip">
                <Link2 size={10} aria-hidden />{selNeighbors.length} 个关联
              </span>
            </div>
            <p className="text-[12.5px] leading-relaxed mb-3" style={{ color: 'var(--ui-fg-muted)' }}>
              {NODE_META[selNode.id]?.desc}
            </p>
            <p className="text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--ui-fg-faint)' }}>关联节点</p>
            <div className="flex flex-col gap-1">
              {selNeighbors.map(id => (
                <button
                  key={id}
                  className="btn text-left"
                  style={{ justifyContent: 'flex-start', padding: '6px 10px' }}
                  onClick={() => setSelected(id)}
                >
                  <Share2 size={12} aria-hidden style={{ color: 'var(--ui-accent)' }} />
                  {nodeById[id].label}
                </button>
              ))}
            </div>
            <p className="text-[11px] mt-3" style={{ color: 'var(--ui-fg-faint)' }}>
              节点权重 {selNode.size}（由关联强度决定，模拟值）
            </p>
          </div>
        ) : (
          <div className="py-8 flex flex-col items-center text-center gap-2">
            <Share2 size={24} aria-hidden style={{ color: 'var(--ui-fg-faint)' }} />
            <p className="text-[13px] font-medium">点击任意节点</p>
            <p className="text-[12px]" style={{ color: 'var(--ui-fg-muted)' }}>
              查看它的说明与关联节点，再次点击可取消选中。
            </p>
          </div>
        )}
      </aside>
    </div>
  )
}

/* ---------------- 主视图 ---------------- */

export function MemoryView() {
  const [tab, setTab] = useState<'entries' | 'graph'>('entries')
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[16px] font-bold">记忆</h2>
        <MockBadge />
      </div>
      <p className="text-[12.5px] mb-4 max-w-[760px]" style={{ color: 'var(--ui-fg-muted)' }}>
        原生桌面没有独立记忆页（记忆在后端 hermes_state_*，图谱在 Starmap 页）。这里把两者收拢为一个工作台。
        图谱数据与条目 CRUD 的 RPC 方法待验证（见 DESIGN.md）。
      </p>
      <div className="flex gap-1.5 mb-4" role="tablist" aria-label="记忆视图切换">
        {(['entries', 'graph'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="btn"
            style={tab === t
              ? { background: 'var(--ui-accent-dim)', borderColor: 'var(--ui-accent)', color: 'var(--ui-accent)', fontWeight: 600 }
              : {}}
          >
            {t === 'entries' ? '记忆条目' : '知识图谱'}
          </button>
        ))}
      </div>
      <div className="view-enter" key={tab} role="tabpanel">
        {tab === 'entries' ? <EntriesTab /> : <GraphTab />}
      </div>
    </div>
  )
}
