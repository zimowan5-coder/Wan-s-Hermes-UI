import { Copy, ExternalLink, FileText, Image as ImageIcon, Link2, Search } from 'lucide-react'
import { useState } from 'react'
import { onGroupKeyDown } from '../lib/keyboard'

/**
 * 产物：对话中生成的图片、文件与链接（对应官方 Artifacts 页：全部 / 图片 / 文件 / 链接）。
 * 演示数据，点击「回到对话」会打开产物所在的会话。
 */
type Kind = 'image' | 'file' | 'link'
const ITEMS: { id: string; kind: Kind; title: string; location: string; session: string; sessionId: string; time: string }[] = [
  { id: 'a1', kind: 'file', title: '审计报告-阶段1.md', location: 'butler/docs/审计报告-阶段1.md', session: '宿舍网络审计跟进', sessionId: 's1', time: '18:02' },
  { id: 'a2', kind: 'image', title: '延迟抖动曲线.png', location: 'outputs/latency.png', session: '宿舍网络审计跟进', sessionId: 's1', time: '17:59' },
  { id: 'a3', kind: 'link', title: 'ZeroOmega 规则文档', location: 'https://github.com/zero-peak/ZeroOmega', session: '宿舍网络审计跟进', sessionId: 's1', time: '17:58' },
  { id: 'a4', kind: 'file', title: '早报-10-19.md', location: 'daily-brief/2026-10-19.md', session: '每日 AI 早报素材整理', sessionId: 's2', time: '09:45' },
  { id: 'a5', kind: 'link', title: 'hermes-agent 仓库', location: 'https://github.com/NousResearch/hermes-agent', session: '每日 AI 早报素材整理', sessionId: 's2', time: '09:41' },
  { id: 'a6', kind: 'image', title: '点子地图-12.png', location: 'outputs/ideas-12.png', session: '点子挖掘 · 第 12 期', sessionId: 's3', time: '昨天' }
]
const TABS: { id: 'all' | Kind; label: string }[] = [{ id: 'all', label: '全部' }, { id: 'image', label: '图片' }, { id: 'file', label: '文件' }, { id: 'link', label: '链接' }]
const ICON = { image: ImageIcon, file: FileText, link: Link2 }

export function ArtifactsView({ onOpenSession }: { onOpenSession: (id: string) => void }) {
  const [tab, setTab] = useState<'all' | Kind>('all')
  const [q, setQ] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const list = ITEMS.filter(i => (tab === 'all' || i.kind === tab) && (i.title + i.location + i.session).toLowerCase().includes(q.trim().toLowerCase()))
  const copy = async (i: typeof ITEMS[number]) => {
    try { await navigator.clipboard.writeText(i.location); setCopied(i.id) } catch { setCopied(null) }
    window.setTimeout(() => setCopied(c => c === i.id ? null : c), 1500)
  }
  return <div className="flex-1 overflow-y-auto">
    <div className="content-page">
      <div className="page-head">
        <h2 className="t-title">产物</h2>
        <p className="t-sub page-desc">对话里生成的图片、文件与链接，都集中在这里。</p>
      </div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="seg" role="tablist" aria-label="产物类型" onKeyDown={onGroupKeyDown}>
          {TABS.map(t => <button key={t.id} role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} className="seg-btn" onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
        <label className="task-search flex-1"><Search size={14} aria-hidden/><input aria-label="搜索产物" placeholder="搜索产物…" value={q} onChange={e => setQ(e.target.value)}/></label>
      </div>
      {list.length === 0 ? <div className="surface p-10 text-center t-sub">没有找到产物。当对话生成图片和文件时，会显示在这里。</div> :
        <div className="grouped" role="list">
          {list.map(i => { const Icon = ICON[i.kind]; return <div key={i.id} role="listitem" className="grouped-row">
            <span className={`artifact-thumb kind-${i.kind}`} aria-hidden><Icon size={16}/></span>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium truncate">{i.title}</div>
              <div className="t-caption truncate">{i.location}</div>
            </div>
            <button className="btn btn-plain hidden-narrow" onClick={() => onOpenSession(i.sessionId)} title="打开产物所在的会话">{i.session}</button>
            <span className="t-caption w-12 text-right">{i.time}</span>
            <button className="icon-btn" aria-label={copied === i.id ? '已复制' : `复制${i.kind === 'link' ? '链接' : '路径'}：${i.title}`} title={i.kind === 'link' ? '复制链接' : '复制路径'} onClick={() => void copy(i)}>{copied === i.id ? '✓' : <Copy size={14}/>}</button>
            {i.kind === 'link' && <a className="icon-btn" href={i.location} target="_blank" rel="noreferrer" aria-label={`在浏览器中打开：${i.title}`}><ExternalLink size={14}/></a>}
          </div> })}
        </div>}
      <p className="t-caption mt-4">演示数据。</p>
    </div>
  </div>
}
