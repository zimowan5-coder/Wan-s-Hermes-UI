import { useState } from 'react'
import { mockProfiles } from '../mock/data'
import { MockBadge } from '../components/MockBadge'

export function SettingsView() {
  const [tab, setTab] = useState<'profiles' | 'models' | 'connection'>('profiles')
  const [activeProfile, setActiveProfile] = useState('p1')

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[16px] font-bold">设置</h2>
        <MockBadge />
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--ui-fg-muted)' }}>
        收拢原生 Settings / Profiles / Command Center（system·usage）页。密钥类配置在真实集成中走系统钥匙串，原型不触碰。
      </p>
      <div className="flex gap-1.5 mb-4">
        {([['profiles', 'Profile'], ['models', '模型'], ['connection', '连接与用量']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className="btn" style={tab === t ? { background: 'var(--ui-accent-dim)', borderColor: 'rgba(122,162,247,0.4)', color: 'var(--ui-accent)' } : {}}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'profiles' && (
        <div className="flex flex-col gap-2 max-w-[640px]">
          {mockProfiles.map(p => (
            <button key={p.id} onClick={() => setActiveProfile(p.id)} className="flat-panel px-4 py-3 flex items-center gap-3 text-left">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: activeProfile === p.id ? 'var(--ui-accent)' : 'rgba(255,255,255,0.15)' }} />
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">{p.name}</div>
                <div className="text-[11.5px]" style={{ color: 'var(--ui-fg-faint)' }}>{p.desc}</div>
              </div>
              {activeProfile === p.id && <span className="chip" style={{ color: 'var(--ui-accent)', borderColor: 'var(--ui-accent)' }}>当前</span>}
            </button>
          ))}
        </div>
      )}

      {tab === 'models' && (
        <div className="flat-panel p-4 max-w-[640px] flex flex-col gap-3">
          <label className="text-[12px] font-semibold" style={{ color: 'var(--ui-fg-muted)' }}>默认模型（MOCK）</label>
          <select className="input" defaultValue="hermes-2">
            <option value="hermes-2">Nous Hermes 2（模拟）</option>
            <option value="other">第三方模型（模拟）</option>
          </select>
          <label className="text-[12px] font-semibold" style={{ color: 'var(--ui-fg-muted)' }}>推理强度</label>
          <input type="range" min={1} max={5} defaultValue={3} className="w-full" />
          <p className="text-[11.5px]" style={{ color: 'var(--ui-fg-faint)' }}>真实值来自后端 models RPC；API Key 永不进原型。</p>
        </div>
      )}

      {tab === 'connection' && (
        <div className="flat-panel p-4 max-w-[640px] flex flex-col gap-2 text-[13px]">
          <div className="flex justify-between"><span style={{ color: 'var(--ui-fg-muted)' }}>连接方式</span><span>本地 gateway（模拟）</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--ui-fg-muted)' }}>后端</span><span>hermes serve · 未连接</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--ui-fg-muted)' }}>本月用量（模拟）</span><span>$4.20 / $20</span></div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="h-full rounded-full" style={{ width: '21%', background: 'var(--ui-accent)' }} />
          </div>
        </div>
      )}
    </div>
  )
}
