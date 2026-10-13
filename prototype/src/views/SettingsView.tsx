import { onGroupKeyDown } from '../lib/keyboard'
import { useEffect, useRef, useState } from 'react'
import {
  BadgeCheck, Cpu, Download, Gauge, HardDrive, Info,
  Loader2, Monitor, Moon, Palette, Plug2, RefreshCw, RotateCcw,
  Server, Sun, User, Wifi
} from 'lucide-react'
import { MockBadge } from '../components/MockBadge'
import { useTheme, type ThemeMode } from '../theme/theme'

/* ============ 局部 MOCK 常量（本文件自包含，不碰 mock/data.ts） ============ */

interface Profile {
  id: string
  name: string
  desc: string
  model: string
  connection: string
}

const PROFILES: Profile[] = [
  { id: 'p1', name: '默认', desc: '日常主力', model: 'Nous Hermes 2（模拟）', connection: '本地 gateway（模拟）' },
  { id: 'p2', name: 'Codex 协作', desc: '点子构建专用', model: 'Nous Hermes 2 · 推理增强（模拟）', connection: '本地 gateway（模拟）' },
  { id: 'p3', name: '小管', desc: '私人智能管家（butler 定制层）', model: 'Nous Hermes 2 · 管家指令集（模拟）', connection: '本地 gateway（模拟）' }
]

const USAGE_TOTAL = 4.2
const USAGE_QUOTA = 20
const USAGE_BY_PROFILE = [
  { name: '默认', amount: 2.6 },
  { name: 'Codex 协作', amount: 1.1 },
  { name: '小管', amount: 0.5 }
]

const STORAGE_USED_GB = 2.4
const STORAGE_TOTAL_GB = 10

const ZOOM_KEY = 'hermes-ui-zoom'
const APP_VERSION = '0.5.0-prototype'

/* ============ 小组件 ============ */

type SectionId = 'profile' | 'appearance' | 'usage' | 'system' | 'about'

const SECTIONS: { id: SectionId; label: string; icon: typeof User }[] = [
  { id: 'profile', label: '个人资料', icon: User },
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'usage', label: '用量', icon: Gauge },
  { id: 'system', label: '系统', icon: Server },
  { id: 'about', label: '关于', icon: Info }
]

function GroupTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[12px] font-semibold tracking-wide mb-2" style={{ color: 'var(--fg-tertiary)' }}>
      {children}
    </h3>
  )
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl ${className}`}
      style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
      }}
    >
      {children}
    </div>
  )
}

function Row({ icon: Icon, label, children }: { icon: typeof Wifi; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon size={16} style={{ color: 'var(--fg-tertiary)' }} aria-hidden className="shrink-0" />
      <span className="text-[13px] flex-1" style={{ color: 'var(--fg-secondary)' }}>{label}</span>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border-subtle)', marginLeft: 52 }} />
}

function UsageBar({ pct, color = 'var(--accent)' }: { pct: number; color?: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-sunken)' }} role="progressbar"
      aria-label="用量比例" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full transition-all duration-200" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
    </div>
  )
}

/* ============ 主视图 ============ */

export function SettingsView() {
  const [section, setSection] = useState<SectionId>('profile')
  const { mode, setMode } = useTheme()

  const [activeProfile, setActiveProfile] = useState('p1')
  const [zoom, setZoom] = useState(() => {
    try {
      const v = Number(window.localStorage.getItem(ZOOM_KEY))
      return v >= 80 && v <= 120 ? v : 100
    } catch { return 100 }
  })
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [checking, setChecking] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const timers = useRef<number[]>([])
  const toastTimer = useRef<number | null>(null)

  useEffect(() => () => { timers.current.forEach(clearTimeout); if (toastTimer.current) clearTimeout(toastTimer.current) }, [])

  // 界面缩放：使用 CSS zoom 缩放全部控件与文本，并补偿视口高度
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(zoom / 100))
    try { window.localStorage.setItem(ZOOM_KEY, String(zoom)) } catch { /* ignore */ }
  }, [zoom])

  const notify = (text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const switchProfile = (p: Profile) => {
    if (p.id === activeProfile) return
    setActiveProfile(p.id)
    notify(`已切换到「${p.name}」（模拟）`)
  }

  const checkUpdate = () => {
    if (checking) return
    setChecking(true)
    timers.current.push(window.setTimeout(() => {
      setChecking(false)
      notify('已是最新版本（模拟）')
    }, 1400))
  }

  const refreshUsage = () => {
    if (refreshing) return
    setRefreshing(true)
    timers.current.push(window.setTimeout(() => {
      setRefreshing(false)
      notify('用量已更新（模拟）')
    }, 900))
  }

  const restartBackend = () => {
    notify('重启指令已发送（模拟）')
  }

  const exportDiagnostics = () => {
    const text = [
      'Hermes UI 诊断信息（模拟数据，非真实后端）',
      `生成时间：${new Date().toLocaleString('zh-CN')}`,
      `应用版本：${APP_VERSION}`,
      `主题模式：${mode}`,
      `界面缩放：${zoom}%`,
      `当前 Profile：${PROFILES.find(p => p.id === activeProfile)?.name ?? activeProfile}`,
      '后端状态：运行中（模拟）· hermes serve v0.9.1-mock',
      '网关状态：已连接（模拟）· 本地 gateway',
      `本月用量：$${USAGE_TOTAL.toFixed(2)} / $${USAGE_QUOTA.toFixed(2)}（模拟）`,
      `存储占用：${STORAGE_USED_GB} GB / ${STORAGE_TOTAL_GB} GB（模拟）`,
      '审批语义：CardStack 五条不变量保留（模拟校验通过）'
    ].join('\n')
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'hermes-ui-diagnostics.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify('诊断信息已导出（模拟）')
  }

  const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: '浅色', icon: Sun },
    { id: 'dark', label: '深色', icon: Moon },
    { id: 'system', label: '跟随系统', icon: Monitor }
  ]

  const usagePct = (USAGE_TOTAL / USAGE_QUOTA) * 100
  const storagePct = (STORAGE_USED_GB / STORAGE_TOTAL_GB) * 100

  const navBtn = (s: (typeof SECTIONS)[number]) => {
    const active = section === s.id
    const Icon = s.icon
    return (
      <button
        key={s.id}
        onClick={() => setSection(s.id)}
        aria-current={active ? 'page' : undefined}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors duration-150 w-full"
        style={active
          ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 }
          : { color: 'var(--fg-secondary)' }}
      >
        <Icon size={15} aria-hidden />
        <span className="text-[13px]">{s.label}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* 左侧分组导航（桌面） */}
      <aside aria-label="设置分组" className="hidden md:flex flex-col w-56 shrink-0 p-4 gap-0.5"
        style={{ borderRight: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2 px-3 pb-3">
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--fg-primary)' }}>设置</h2>
          <MockBadge label="MOCK" />
        </div>
        {SECTIONS.map(navBtn)}
        <p className="text-[11px] px-3 mt-auto pt-4 leading-relaxed" style={{ color: 'var(--fg-tertiary)' }}>
          密钥类配置在真实集成中走系统钥匙串，原型不触碰。
        </p>
      </aside>

      {/* 右侧内容 */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="settings-content max-w-[720px] mx-auto px-5 py-5">
          {/* 小屏顶部 tabs */}
          <div className="md:hidden mb-4">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-[15px] font-bold" style={{ color: 'var(--fg-primary)' }}>设置</h2>
              <MockBadge label="MOCK" />
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" onKeyDown={onGroupKeyDown} aria-label="设置分组">
              {SECTIONS.map(s => {
                const active = section === s.id
                const Icon = s.icon
                return (
                  <button key={s.id} role="tab" aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => setSection(s.id)}
                    className="btn shrink-0" style={active ? { background: 'var(--accent-soft)', borderColor: 'var(--accent-border)', color: 'var(--accent)' } : {}}>
                    <Icon size={13} aria-hidden />{s.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div key={section} className="view-enter">
            {section === 'profile' && (
              <section aria-label="个人资料">
                <GroupTitle>PROFILE · 本页模拟选择</GroupTitle>
                <div role="radiogroup" onKeyDown={onGroupKeyDown} aria-label="选择 Profile" className="flex flex-col gap-2">
                  {PROFILES.map(p => {
                    const active = p.id === activeProfile
                    return (
                      <button key={p.id} role="radio" aria-checked={active} tabIndex={active ? 0 : -1} onClick={() => switchProfile(p)}
                        className="text-left rounded-xl px-4 py-3.5 transition-all duration-150"
                        style={active
                          ? { background: 'var(--bg-raised)', border: '1px solid var(--accent-border)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
                          : { background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-150"
                            style={{ background: active ? 'var(--accent)' : 'var(--border-strong)' }} aria-hidden />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13.5px] font-semibold" style={{ color: 'var(--fg-primary)' }}>{p.name}</div>
                            <div className="text-[11.5px]" style={{ color: 'var(--fg-tertiary)' }}>{p.desc}</div>
                          </div>
                          {active && (
                            <span className="chip shrink-0" style={{ color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>
                              <BadgeCheck size={11} aria-hidden />当前
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2.5 ml-5">
                          <span className="chip"><Cpu size={11} aria-hidden />{p.model}</span>
                          <span className="chip"><Plug2 size={11} aria-hidden />{p.connection}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>
            )}

            {section === 'appearance' && (
              <section aria-label="外观">
                <GroupTitle>主题</GroupTitle>
                <Card className="p-4">
                  <div role="radiogroup" onKeyDown={onGroupKeyDown} aria-label="主题模式" className="grid grid-cols-3 gap-1 p-1 rounded-xl"
                    style={{ background: 'var(--bg-sunken)' }}>
                    {THEME_OPTIONS.map(o => {
                      const active = mode === o.id
                      const Icon = o.icon
                      return (
                        <button key={o.id} role="radio" aria-checked={active} tabIndex={active ? 0 : -1} onClick={() => setMode(o.id)}
                          className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12.5px] transition-all duration-150"
                          style={active
                            ? { background: 'var(--bg-raised)', color: 'var(--fg-primary)', fontWeight: 600, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                            : { color: 'var(--fg-secondary)' }}>
                          <Icon size={14} aria-hidden />{o.label}
                        </button>
                      )
                    })}
                  </div>
                  <p className="text-[11.5px] mt-2.5" style={{ color: 'var(--fg-tertiary)' }}>
                    「跟随系统」实时响应 Windows 主题变化；也可用命令面板快速切换。
                  </p>
                </Card>

                <div className="mt-5"><GroupTitle>界面缩放</GroupTitle></div>
                <Card className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="zoom" className="text-[13px] font-medium" style={{ color: 'var(--fg-primary)' }}>缩放比例</label>
                    <span className="chip" style={{ color: 'var(--accent)', borderColor: 'var(--accent-border)' }}>{zoom}%</span>
                  </div>
                  <input id="zoom" type="range" min={80} max={120} step={5} value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                    className="w-full accent-[var(--accent)]" aria-valuetext={`${zoom}%`} />
                  <div className="flex justify-between text-[11px] mt-1" style={{ color: 'var(--fg-tertiary)' }}>
                    <span>80%</span><span>100%</span><span>120%</span>
                  </div>
                  <p className="text-[11.5px] mt-2.5" style={{ color: 'var(--fg-tertiary)' }}>
                    实时生效，偏好保存在本地（localStorage）。
                  </p>
                </Card>
              </section>
            )}

            {section === 'usage' && (
              <section aria-label="用量">
                <div className="flex items-center gap-2 mb-2">
                  <GroupTitle>本月用量</GroupTitle>
                  <span className="mb-2"><MockBadge label="MOCK" /></span>
                  <button className="btn mb-2 ml-auto" style={{ padding: '4px 10px', fontSize: 12 }}
                    onClick={refreshUsage} disabled={refreshing}>
                    <RefreshCw size={12} aria-hidden className={refreshing ? 'animate-spin' : ''} />
                    {refreshing ? '刷新中…' : '刷新（模拟）'}
                  </button>
                </div>
                <Card className="p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[22px] font-bold" style={{ color: 'var(--fg-primary)' }}>
                      ${USAGE_TOTAL.toFixed(2)}
                      <span className="text-[13px] font-normal" style={{ color: 'var(--fg-tertiary)' }}> / ${USAGE_QUOTA.toFixed(2)}</span>
                    </span>
                    <span className="text-[12.5px] font-semibold" style={{ color: usagePct > 80 ? 'var(--warning)' : 'var(--success)' }}>
                      {usagePct.toFixed(0)}%
                    </span>
                  </div>
                  <UsageBar pct={usagePct} color={usagePct > 80 ? 'var(--warning)' : 'var(--accent)'} />
                  <p className="text-[11.5px] mt-2.5" style={{ color: 'var(--fg-tertiary)' }}>
                    计费周期：每月 1 日重置（模拟）。真实值来自后端 usage RPC。
                  </p>
                </Card>

                <div className="mt-5"><GroupTitle>按 PROFILE 分组</GroupTitle></div>
                <Card>
                  {USAGE_BY_PROFILE.map((u, i) => (
                    <div key={u.name}>
                      {i > 0 && <div style={{ borderTop: '1px solid var(--border-subtle)' }} />}
                      <div className="px-4 py-3">
                        <div className="flex justify-between text-[12.5px] mb-1.5">
                          <span style={{ color: 'var(--fg-secondary)' }}>{u.name}</span>
                          <span className="font-medium" style={{ color: 'var(--fg-primary)' }}>${u.amount.toFixed(2)}</span>
                        </div>
                        <UsageBar pct={(u.amount / USAGE_TOTAL) * 100} />
                      </div>
                    </div>
                  ))}
                </Card>
              </section>
            )}

            {section === 'system' && (
              <section aria-label="系统">
                <div className="flex items-center gap-2 mb-2">
                  <GroupTitle>运行状态</GroupTitle>
                  <span className="mb-2"><MockBadge label="MOCK" /></span>
                </div>
                <Card>
                  <Row icon={Server} label="后端">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: 'var(--success)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} aria-hidden />
                      运行中（模拟）
                    </span>
                  </Row>
                  <Divider />
                  <Row icon={Cpu} label="后端版本">
                    <span className="text-[12.5px]" style={{ color: 'var(--fg-primary)' }}>hermes serve v0.9.1-mock</span>
                  </Row>
                  <Divider />
                  <Row icon={Wifi} label="网关">
                    <span className="flex items-center gap-1.5 text-[12.5px] font-medium" style={{ color: 'var(--success)' }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} aria-hidden />
                      已连接（模拟）
                    </span>
                  </Row>
                  <Divider />
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-3 mb-2">
                      <HardDrive size={16} style={{ color: 'var(--fg-tertiary)' }} aria-hidden className="shrink-0" />
                      <span className="text-[13px] flex-1" style={{ color: 'var(--fg-secondary)' }}>存储占用</span>
                      <span className="text-[12.5px]" style={{ color: 'var(--fg-primary)' }}>{STORAGE_USED_GB} / {STORAGE_TOTAL_GB} GB</span>
                    </div>
                    <div className="ml-[52px]"><UsageBar pct={storagePct} /></div>
                  </div>
                </Card>

                <div className="mt-5"><GroupTitle>维护</GroupTitle></div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn" onClick={checkUpdate} disabled={checking}>
                    {checking ? <Loader2 size={13} aria-hidden className="animate-spin" /> : <Download size={13} aria-hidden />}
                    {checking ? '检查中…' : '检查更新（模拟）'}
                  </button>
                  <button className="btn" onClick={restartBackend}>
                    <RotateCcw size={13} aria-hidden />重启后端（模拟）
                  </button>
                </div>
              </section>
            )}

            {section === 'about' && (
              <section aria-label="关于">
                <GroupTitle>版本</GroupTitle>
                <Card>
                  <Row icon={Info} label="Hermes UI 原型">
                    <span className="chip">v{APP_VERSION}</span>
                  </Row>
                  <Divider />
                  <Row icon={BadgeCheck} label="上游">
                    <span className="text-[12.5px]" style={{ color: 'var(--fg-secondary)' }}>
                      Hermes Agent by NousResearch（开源，Apache-2.0）
                    </span>
                  </Row>
                </Card>

                <div className="mt-5"><GroupTitle>诊断</GroupTitle></div>
                <Card className="p-4">
                  <p className="text-[12.5px] mb-3 leading-relaxed" style={{ color: 'var(--fg-secondary)' }}>
                    导出当前配置与运行状态的文本摘要（全部为模拟数据），方便粘贴给开发者排查问题。
                  </p>
                  <button className="btn btn-primary" onClick={exportDiagnostics}>
                    <Download size={13} aria-hidden />导出诊断信息（模拟）
                  </button>
                </Card>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* 反馈 toast */}
      <div aria-live="polite" className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        {toast && (
          <div key={toast.id}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-medium view-enter"
            style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-strong)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', color: 'var(--fg-primary)' }}>
            <BadgeCheck size={15} style={{ color: 'var(--success)' }} aria-hidden />
            {toast.text}
          </div>
        )}
      </div>
    </div>
  )
}
