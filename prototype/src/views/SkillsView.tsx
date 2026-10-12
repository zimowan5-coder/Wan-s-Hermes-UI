import { Puzzle, Terminal } from 'lucide-react'
import { useState } from 'react'
import { mockSkills, type Skill } from '../mock/data'
import { MockBadge } from '../components/MockBadge'

export function SkillsView() {
  const [skills, setSkills] = useState<Skill[]>(mockSkills)
  const toggle = (id: string) => setSkills(prev => prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)))

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[16px] font-bold">技能</h2>
        <MockBadge />
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--ui-fg-muted)' }}>
        对应原生 Capabilities → Skills 页。真实集成时经 <code>commands.catalog</code> 读取技能派生的 slash 命令，
        开关经后端 skill 启用接口（待验证，见 DESIGN.md 未确认清单）。
      </p>
      <div className="grid grid-cols-2 gap-3">
        {skills.map(s => (
          <div key={s.id} className="flat-panel p-4">
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'var(--ui-accent-dim)', border: '1px solid rgba(122,162,247,0.25)' }}>
                <Puzzle size={17} style={{ color: 'var(--ui-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-[13px] font-semibold">{s.name}</code>
                  <span className="chip">{s.scope}</span>
                </div>
                <p className="text-[12px] mt-1 leading-relaxed" style={{ color: 'var(--ui-fg-muted)' }}>{s.desc}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Terminal size={12} style={{ color: 'var(--ui-fg-faint)' }} />
                  {s.commands.map(c => (
                    <code key={c} className="text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--ui-accent)' }}>{c}</code>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toggle(s.id)}
                className="w-9 h-5 rounded-full relative transition-colors shrink-0 mt-1"
                style={{ background: s.enabled ? 'var(--ui-accent)' : 'rgba(255,255,255,0.14)' }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all" style={{ left: s.enabled ? 18 : 2 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
