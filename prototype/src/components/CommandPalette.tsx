import { Command, History, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from './Modal'

export interface PaletteCommand {
  id: string
  title: string
  hint?: string
  keywords: string
  group: string
  icon: typeof Command
  run: () => void
}

/** 模糊匹配：精确 > 前缀 > 包含 > 子序列；返回分数，-1 为不匹配 */
function fuzzy(query: string, text: string): number {
  const q = query.toLowerCase().trim()
  const t = text.toLowerCase()
  if (!q) return 1
  if (t === q) return 100
  if (t.startsWith(q)) return 80
  if (t.includes(q)) return 60
  let qi = 0
  for (const ch of t) {
    if (ch === q[qi]) qi++
    if (qi === q.length) return 30
  }
  return -1
}

const RECENT_KEY = 'hermes-ui-palette-recents'

export function CommandPalette({
  open, onClose, commands
}: {
  open: boolean
  onClose: () => void
  commands: PaletteCommand[]
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [recents, setRecents] = useState<string[]>(() => {
    try { const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((id): id is string => typeof id === 'string') : [] } catch { return [] }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open ])

  const filtered = useMemo(() => {
    const scored = commands
      .map(c => ({ c, s: fuzzy(query, `${c.title} ${c.keywords} ${c.hint ?? ''}`) }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s)
    // 按 group 聚合，保持组内排序
    const groups = new Map<string, typeof scored>()
    for (const x of scored) {
      if (!groups.has(x.c.group)) groups.set(x.c.group, [])
      groups.get(x.c.group)!.push(x)
    }
    return [...groups.entries()].flatMap(([, xs]) => xs)
  }, [commands, query])

  // 最近使用（仅在空搜索时展示）
  const recentItems = useMemo(() => {
    if (query.trim()) return []
    return recents
      .map(id => commands.find(c => c.id === id))
      .filter((c): c is PaletteCommand => !!c)
      .slice(0, 4)
  }, [recents, commands, query])

  const rows = useMemo(() => {
    if (query.trim()) return filtered.map(f => f.c)
    const seen = new Set(recentItems.map(r => r.id))
    return [...recentItems, ...filtered.map(f => f.c).filter(c => !seen.has(c.id))]
  }, [query, filtered, recentItems])

  useEffect(() => { setActive(0) }, [query])
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const run = (cmd: PaletteCommand) => {
    const next = [cmd.id, ...recents.filter(id => id !== cmd.id)].slice(0, 8)
    setRecents(next)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* Keep commands usable when storage is blocked. */ }
    onClose()
    cmd.run()
  }

  return (
    <Modal open={open} onClose={onClose} label="命令面板" className="command-modal glass-strong">
        <div className="flex items-center gap-2.5 px-4 hairline-b">
          <Search size={16} style={{ color: 'var(--fg-tertiary)' }} aria-hidden />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent py-3.5 text-[14px] outline-none"
            style={{ color: 'var(--fg-primary)' }}
            placeholder="搜索会话、页面与操作…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.max(0, Math.min(rows.length - 1, a + 1))) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)) }
              if (e.key === 'Enter' && rows[active]) { e.preventDefault(); run(rows[active]) }
              if (e.key === 'Escape') { e.preventDefault(); onClose() }
            }}
            role="combobox" aria-label="搜索命令" aria-expanded aria-controls="palette-list" aria-autocomplete="list" aria-activedescendant={rows[active] ? `command-${rows[active].id}` : undefined}
          />
          {query && (
            <button className="btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={() => setQuery('')}>清除</button>
          )}
          <kbd className="chip font-mono">esc</kbd>
        </div>

        <div ref={listRef} id="palette-list" role="listbox" className="max-h-[320px] overflow-y-auto p-1.5">
          {rows.length === 0 ? (
            <div className="p-8 text-center">
              <Search size={20} style={{ color: 'var(--fg-tertiary)' }} className="mx-auto mb-2" aria-hidden />
              <p className="text-[13px]" style={{ color: 'var(--fg-secondary)' }}>没有匹配「{query}」的命令</p>
              <button className="btn mt-3" style={{ fontSize: 12 }} onClick={() => setQuery('')}>清除搜索</button>
            </div>
          ) : rows.map((cmd, i) => {
            const Icon = cmd.icon
            const inRecents = !query.trim() && i < recentItems.length
            const prevGroup = i === 0 ? '' : (!query.trim() && i - 1 < recentItems.length ? '__recent__' : rows[i - 1].group)
            const curGroup = inRecents ? '__recent__' : cmd.group
            const showHeader = curGroup !== prevGroup
            return (
              <div key={cmd.id}>
                {showHeader && (
                  <div className="px-3 pt-2.5 pb-1 text-[10.5px] font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-tertiary)' }}>
                    {inRecents
                      ? <span className="flex items-center gap-1"><History size={11} aria-hidden />最近使用</span>
                      : cmd.group}
                  </div>
                )}
                <button
                  id={`command-${cmd.id}`} tabIndex={-1} role="option" aria-selected={i === active} data-active={i === active}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                  style={i === active ? { background: 'var(--accent-soft)' } : {}}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(cmd)}
                >
                  <Icon size={15} style={{ color: i === active ? 'var(--accent)' : 'var(--fg-tertiary)' }} aria-hidden />
                  <span className="flex-1 text-[13.5px]" style={{ color: 'var(--fg-primary)' }}>{cmd.title}</span>
                  {cmd.hint && <kbd className="chip font-mono text-[10.5px]">{cmd.hint}</kbd>}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-4 px-4 py-2.5 hairline-t text-[11px]" style={{ color: 'var(--fg-tertiary)' }}>
          <span className="flex items-center gap-1"><kbd className="chip font-mono">↑↓</kbd> 选择</span>
          <span className="flex items-center gap-1"><kbd className="chip font-mono">↵</kbd> 执行</span>
          <span className="flex items-center gap-1"><kbd className="chip font-mono">esc</kbd> 关闭</span>
          <span className="ml-auto">演示版命令面板</span>
        </div>
    </Modal>
  )
}

