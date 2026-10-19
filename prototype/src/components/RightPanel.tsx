import { ChevronRight, FileCode2, FileText, Folder, Globe, ScrollText, SquareTerminal, GitCompareArrows, X } from 'lucide-react'
import { useState } from 'react'

/**
 * 高级模式的右侧面板：文件 / 终端 / 审查 / 浏览器 / 日志（对应官方 right-sidebar）。
 * 全部为演示内容，不读取真实文件、不执行命令。
 */
const TABS = [
  { id: 'files', label: '文件', icon: Folder },
  { id: 'terminal', label: '终端', icon: SquareTerminal },
  { id: 'review', label: '审查', icon: GitCompareArrows },
  { id: 'browser', label: '浏览器', icon: Globe },
  { id: 'logs', label: '日志', icon: ScrollText }
] as const
type TabId = typeof TABS[number]['id']

const TREE = [
  { name: 'docs', dir: true, depth: 0 }, { name: '审计报告-阶段1.md', depth: 1 }, { name: '检查清单.md', depth: 1 },
  { name: 'butler', dir: true, depth: 0 }, { name: 'config.yaml', depth: 1 }, { name: 'README.md', depth: 0 }
]
const DIFF = [
  { t: 'ctx', s: '## 修复建议' },
  { t: 'del', s: '- 暂无' },
  { t: 'add', s: '+ 1. 在 ZeroOmega 中补充 ::/0 规则' },
  { t: 'add', s: '+ 2. 复测 ipv6-test.com' },
  { t: 'ctx', s: '' }
]
const LOGS = [
  '18:02:11 INFO  gateway  会话 s1 收到新消息',
  '18:02:12 INFO  tools    network.probe 开始（12 个探测点）',
  '18:02:19 WARN  tools    ipv6-test.com 超时',
  '18:02:20 INFO  approval 新的审批请求：写入文件'
]

export function RightPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<TabId>('files')
  return <aside className="right-panel view-enter" aria-label="右侧面板">
    <div className="right-panel-tabs" role="tablist" aria-label="右侧面板">
      {TABS.map(t => { const Icon = t.icon; return <button key={t.id} role="tab" aria-selected={tab === t.id} className={`rp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} title={t.label}><Icon size={14} aria-hidden/>{t.label}</button> })}
      <button className="icon-btn ml-auto" aria-label="关闭右侧面板" onClick={onClose}><X size={15}/></button>
    </div>
    <div className="right-panel-body" role="tabpanel">
      {tab === 'files' && <>
        <p className="rp-caption">~/hermes-workspace（演示）</p>
        {TREE.map(f => <div key={f.name} className="rp-file" style={{ paddingLeft: 10 + f.depth * 16 }}>
          {f.dir ? <><ChevronRight size={12} aria-hidden/><Folder size={14} aria-hidden/></> : f.name.endsWith('.md') ? <FileText size={14} aria-hidden/> : <FileCode2 size={14} aria-hidden/>}
          <span>{f.name}</span>
        </div>)}
      </>}
      {tab === 'terminal' && <pre className="rp-terminal">{'$ hermes status\nHermes Agent（演示） · 网关运行中\n活跃会话 3 · 后台任务 1\n$ █'}</pre>}
      {tab === 'review' && <>
        <p className="rp-caption">docs/检查清单.md · +2 −1</p>
        <pre className="rp-diff">{DIFF.map((l, i) => <span key={i} className={`diff-${l.t}`}>{l.s || ' '}{'\n'}</span>)}</pre>
      </>}
      {tab === 'browser' && <div className="rp-browser">
        <div className="rp-url">https://ipv6-test.com</div>
        <div className="rp-page"><Globe size={28} aria-hidden/><p>智能体浏览器（演示）</p><p className="t-micro">真实集成后，这里显示 Hermes 正在浏览的网页。</p></div>
      </div>}
      {tab === 'logs' && <pre className="rp-terminal">{LOGS.join('\n')}</pre>}
    </div>
  </aside>
}
