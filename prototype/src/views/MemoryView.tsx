import { useState } from 'react'
import { mockMemory, mockMemoryEdges, mockMemoryNodes } from '../mock/data'
import { MockBadge } from '../components/MockBadge'

const kindLabel = { fact: '事实', preference: '偏好', project: '项目' } as const
const kindColor = { fact: 'var(--ui-accent)', preference: 'var(--ui-ok)', project: 'var(--ui-warn)' } as const

function Graph() {
  const nodeById = Object.fromEntries(mockMemoryNodes.map(n => [n.id, n]))
  return (
    <svg viewBox="0 0 600 420" className="w-full rounded-xl" style={{ background: 'var(--ui-bg)', border: '1px solid var(--ui-stroke)' }}>
      {mockMemoryEdges.map(([a, b], i) => {
        const p = nodeById[a], q = nodeById[b]
        return <line key={i} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke="rgba(122,162,247,0.28)" strokeWidth={1.2} />
      })}
      {mockMemoryNodes.map(n => (
        <g key={n.id}>
          <circle cx={n.x} cy={n.y} r={n.size} fill="rgba(122,162,247,0.16)" stroke="var(--ui-accent)" strokeWidth={1.5} />
          <text x={n.x} y={n.y + n.size + 15} textAnchor="middle" fill="var(--ui-fg-muted)" fontSize={12}>{n.label}</text>
        </g>
      ))}
    </svg>
  )
}

export function MemoryView() {
  const [tab, setTab] = useState<'list' | 'graph'>('list')
  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[16px] font-bold">记忆</h2>
        <MockBadge />
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--ui-fg-muted)' }}>
        原生桌面没有独立记忆页（记忆在后端 hermes_state_*，图谱在 Starmap 页）。这里把两者收拢为一个工作台。
        图谱数据与条目 CRUD 的 RPC 方法待验证（见 DESIGN.md）。
      </p>
      <div className="flex gap-1.5 mb-4">
        {(['list', 'graph'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className="btn" style={tab === t ? { background: 'var(--ui-accent-dim)', borderColor: 'rgba(122,162,247,0.4)', color: 'var(--ui-accent)' } : {}}>
            {t === 'list' ? '记忆条目' : '知识图谱'}
          </button>
        ))}
      </div>
      {tab === 'list' ? (
        <div className="flex flex-col gap-2 max-w-[720px]">
          {mockMemory.map(e => (
            <div key={e.id} className="flat-panel px-4 py-3 flex items-start gap-3">
              <span className="chip shrink-0 mt-0.5" style={{ color: kindColor[e.kind], borderColor: kindColor[e.kind] }}>{kindLabel[e.kind]}</span>
              <div className="flex-1 text-[13px] leading-relaxed">{e.text}</div>
              <span className="text-[11px] shrink-0" style={{ color: 'var(--ui-fg-faint)' }}>{e.updatedAt}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="max-w-[720px]">
          <Graph />
          <p className="text-[11.5px] mt-2" style={{ color: 'var(--ui-fg-faint)' }}>静态示意（MOCK）：真实集成后替换为 d3-force 力导向图，数据源为 Starmap 的 profile 图谱。</p>
        </div>
      )}
    </div>
  )
}
