import {
  Archive, ArchiveRestore, BadgeCheck, Bell, Bot, Brain, Cpu, Download, FolderOpen, Gauge, Info, Keyboard, KeyRound,
  Layers, MessageSquare, Mic, Monitor, Moon, Palette, Plug2, Plus, Puzzle, Server, Shield, SlidersHorizontal, Sun, Upload, User, Wrench
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { CommandCenterTab } from '../components/Overlays'
import { onGroupKeyDown } from '../lib/keyboard'
import type { InterfaceMode } from '../lib/prefs'
import type { MergedSession } from '../lib/sessions'
import { ACCENTS, useAccent, useTheme, type ThemeMode } from '../theme/theme'

/**
 * 设置：分组与官方 Hermes Desktop 一致（模型 / 对话 / 外观 / 工作区 / 安全 / 记忆与上下文 / 语音 / 高级，
 * 以及提供方、网关、MCP、插件、通知、密码与登录、配置档案、已归档对话、键盘快捷键、关于）。
 * 除外观与界面模式会真实生效外，其余选项均为演示，改动只保存在本次页面。
 */
export type SettingsSection =
  | 'general' | 'model' | 'chat' | 'appearance' | 'workspace' | 'safety' | 'memory' | 'voice' | 'advanced'
  | 'providers' | 'gateway' | 'mcp' | 'plugins' | 'notifications' | 'vault'
  | 'profiles' | 'archived' | 'shortcuts' | 'about'

const GROUPS: { title: string; items: { id: SettingsSection; label: string; icon: typeof User }[] }[] = [
  { title: '偏好', items: [
    { id: 'general', label: '常规', icon: SlidersHorizontal }, { id: 'model', label: '模型', icon: Cpu }, { id: 'chat', label: '对话', icon: MessageSquare },
    { id: 'appearance', label: '外观', icon: Palette }, { id: 'workspace', label: '工作区', icon: FolderOpen }, { id: 'safety', label: '安全与审批', icon: Shield },
    { id: 'memory', label: '记忆与上下文', icon: Brain }, { id: 'voice', label: '语音', icon: Mic }, { id: 'advanced', label: '高级', icon: Wrench }
  ] },
  { title: '连接', items: [
    { id: 'providers', label: '提供方与密钥', icon: KeyRound }, { id: 'gateway', label: '网关', icon: Server }, { id: 'mcp', label: 'MCP', icon: Plug2 },
    { id: 'plugins', label: '插件', icon: Puzzle }, { id: 'notifications', label: '通知', icon: Bell }, { id: 'vault', label: '密码与登录', icon: Shield }
  ] },
  { title: '账户', items: [
    { id: 'profiles', label: '配置档案', icon: User }, { id: 'archived', label: '已归档对话', icon: Archive },
    { id: 'shortcuts', label: '键盘快捷键', icon: Keyboard }, { id: 'about', label: '关于', icon: Info }
  ] }
]
const ALL = GROUPS.flatMap(g => g.items)

/* ---------- 通用行：开关 / 下拉 / 文本值 / 按钮 ---------- */
type Control =
  | { type: 'toggle'; value: boolean }
  | { type: 'select'; options: string[]; value: string }
  | { type: 'value'; text: string }
  | { type: 'button'; label: string }
type RowDef = { label: string; desc?: string; control: Control }
type Block = { title: string; rows: RowDef[] }
const t = (value: boolean): Control => ({ type: 'toggle', value })
const sel = (options: string[], value = options[0]): Control => ({ type: 'select', options, value })
const val = (text: string): Control => ({ type: 'value', text })
const btn = (label: string): Control => ({ type: 'button', label })

const SCHEMA: Partial<Record<SettingsSection, Block[]>> = {
  model: [
    { title: '主模型', rows: [
      { label: '默认模型', desc: '新会话使用的模型，可在输入框随时切换', control: sel(['Hermes 4 70B', 'Hermes 4 405B', 'Hermes 3 8B · 本地']) },
      { label: '默认推理强度', control: sel(['中', '低', '高']) },
      { label: '快速模式', desc: '优先速度，适合简单任务', control: t(false) }
    ] },
    { title: '辅助与备用', rows: [
      { label: '辅助模型', desc: '用于看图、摘要、压缩等辅助任务', control: sel(['Hermes 4 70B', 'Hermes 3 8B · 本地']) },
      { label: '备用模型', desc: '主模型不可用时自动切换', control: sel(['Hermes 3 8B · 本地', '不使用']) },
      { label: '多智能体协作（MoA）', desc: '/moa 命令使用的模型组合', control: btn('编辑组合') }
    ] }
  ],
  chat: [
    { title: '行为', rows: [
      { label: '发送消息', control: sel(['Enter 发送，Shift+Enter 换行', 'Ctrl+Enter 发送']) },
      { label: '运行中继续输入时', control: sel(['排队，等当前回合结束', '引导当前回合']) },
      { label: '专注视图', desc: '只显示你的提示词与最终回复', control: t(false) },
      { label: '显示消息时间', control: t(true) }
    ] },
    { title: '附件', rows: [
      { label: '粘贴图片时自动压缩', control: t(true) },
      { label: '附加网址时抓取页面内容', control: t(true) }
    ] }
  ],
  workspace: [
    { title: '项目', rows: [
      { label: '默认项目文件夹', control: val('~/hermes-workspace') },
      { label: '按项目给会话分组', control: t(false) }
    ] },
    { title: '执行', rows: [
      { label: 'Shell 环境', control: sel(['PowerShell', 'Git Bash', 'WSL']) },
      { label: '允许读写的范围', control: sel(['仅项目文件夹', '整个用户目录']) }
    ] }
  ],
  safety: [
    { title: '审批', rows: [
      { label: '危险操作审批', desc: '执行命令、写文件、联网前是否先问你', control: sel(['每次询问', '仅高风险操作询问', '全部自动批准（YOLO）']) },
      { label: '记住本会话的批准', control: t(true) }
    ] },
    { title: '隐私与检查点', rows: [
      { label: '允许访问本地与私有网址', control: t(false) },
      { label: '修改文件前自动建立检查点', desc: '可用 /rollback 还原', control: t(true) }
    ] }
  ],
  memory: [
    { title: '持久记忆', rows: [
      { label: '启用长期记忆', control: t(true) },
      { label: '写入记忆前先让我确认', control: t(false) },
      { label: '记忆条目与知识图谱', desc: '在侧边栏「记忆」中查看和编辑', control: val('前往 记忆') }
    ] },
    { title: '上下文与压缩', rows: [
      { label: '上下文快满时自动压缩', control: t(true) },
      { label: '压缩触发点', control: sel(['80%', '70%', '90%']) }
    ] }
  ],
  voice: [
    { title: '语音对话', rows: [
      { label: '语音对话引擎', control: sel(['语音转文字 + Hermes 语音', 'GPT-Live（全双工，需要 OpenAI 密钥）']) },
      { label: '朗读回复', control: t(false) },
      { label: '唤醒词', desc: '说出唤醒词即可开始对话', control: t(false) }
    ] },
    { title: '听写', rows: [{ label: '听写语言', control: sel(['自动识别', '中文', 'English']) }] }
  ],
  advanced: [
    { title: '智能体', rows: [
      { label: '单回合最多工具调用', control: sel(['50', '20', '100']) },
      { label: '允许派出子代理', control: t(true) }
    ] },
    { title: '终端与输出', rows: [
      { label: '终端后端', control: sel(['本地', 'Docker', 'SSH']) },
      { label: '工具输出长度上限', control: sel(['16 KB', '64 KB']) }
    ] },
    { title: '桌面', rows: [
      { label: '开机自动启动', control: t(false) },
      { label: '快速输入窗口', desc: '在任何地方唤出一个小输入框', control: t(false) },
      { label: '屏幕捕获', desc: '允许 Hermes 截取屏幕作为上下文', control: t(false) }
    ] }
  ],
  providers: [
    { title: '账号', rows: [{ label: 'Nous Portal', control: val('已登录（演示）') }] },
    { title: 'API 密钥', rows: [
      { label: 'OpenRouter', control: val('sk-or-••••••••3f2a') },
      { label: 'OpenAI', control: btn('添加密钥') },
      { label: 'Anthropic', control: btn('添加密钥') }
    ] },
    { title: '其他', rows: [
      { label: '自定义端点', desc: '兼容 OpenAI 接口的服务', control: btn('添加端点') },
      { label: '本地模型', desc: 'Ollama、LM Studio 等', control: val('Hermes 3 8B · 运行中') }
    ] }
  ],
  gateway: [
    { title: '当前窗口', rows: [
      { label: '连接', control: val('本地后端 · 已连接（演示）') },
      { label: '启动时自动运行消息网关', control: t(true) }
    ] },
    { title: '已保存的连接', rows: [
      { label: '家里的 Mac mini（SSH）', control: btn('切换') },
      { label: '添加连接', control: btn('添加') }
    ] }
  ],
  mcp: [
    { title: 'MCP 服务器', rows: [
      { label: 'filesystem', desc: '读写本地文件', control: t(true) },
      { label: 'github', desc: '仓库、Issue、PR', control: t(true) },
      { label: 'browser', desc: '智能体浏览器', control: t(false) },
      { label: '添加服务器', control: btn('添加') }
    ] }
  ],
  plugins: [
    { title: '已安装插件', rows: [
      { label: '看板（kanban）', desc: '任务 › 看板', control: t(true) },
      { label: '机器人（hermes-bots）', desc: '把 Hermes 变成消息平台上的机器人', control: t(true) },
      { label: '电台（radio）', control: t(false) }
    ] }
  ],
  notifications: [
    { title: '桌面通知', rows: [
      { label: '回合完成时通知', control: t(true) },
      { label: '需要审批时通知', control: t(true) },
      { label: '定时任务出错时通知', control: t(true) }
    ] },
    { title: '声音', rows: [{ label: '提示音', control: t(false) }] }
  ],
  vault: [
    { title: '已保存的凭据', rows: [
      { label: 'Telegram Bot Token', control: val('••••••••（系统钥匙串）') },
      { label: '密码管理器', desc: '1Password、Bitwarden', control: btn('连接') }
    ] }
  ]
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} className="switch" onClick={onChange}><span/></button>
}
function GroupTitle({ children }: { children: ReactNode }) {
  return <h3 className="settings-group-title text-[12px] font-semibold mb-2 mt-6" style={{ color: 'var(--fg-tertiary)' }}>{children}</h3>
}

const ZOOM_KEY = 'hermes-ui-zoom'
const APP_VERSION = '0.8.0-prototype'
const PROFILE_INFO: Record<string, { desc: string; model: string }> = {
  p1: { desc: '日常主力', model: 'Hermes 4 70B' },
  p2: { desc: '点子构建专用', model: 'Hermes 4 405B' },
  p3: { desc: '私人智能管家（butler 定制层）', model: 'Hermes 4 70B · 管家指令集' }
}

export function SettingsView({ request, profiles, activeProfile, onSwitchProfile, mode, setMode, archived, onUnarchive, onOpenShortcuts, onOpenCommandCenter, notify }: {
  request: { id?: SettingsSection; n: number }
  profiles: { id: string; name: string }[]
  activeProfile: string
  onSwitchProfile: (id: string) => void
  mode: InterfaceMode
  setMode: (m: InterfaceMode) => void
  archived: MergedSession[]
  onUnarchive: (id: string) => void
  onOpenShortcuts: () => void
  onOpenCommandCenter: (tab: CommandCenterTab) => void
  notify: (text: string) => void
}) {
  const [section, setSection] = useState<SettingsSection>('general')
  const [values, setValues] = useState<Record<string, boolean | string>>({})
  const { mode: theme, setMode: setTheme } = useTheme()
  const { accent, setAccent } = useAccent()
  const [zoom, setZoom] = useState(() => {
    try { const v = Number(window.localStorage.getItem(ZOOM_KEY)); return v >= 80 && v <= 120 ? v : 100 } catch { return 100 }
  })
  const [hud, setHud] = useState(false)
  const [pet, setPet] = useState('不显示')
  const [density, setDensity] = useState('舒适')

  useEffect(() => { if (request.n) setSection(request.id ?? 'general') }, [request])
  // 界面缩放：使用 CSS zoom 缩放全部控件与文本，并补偿视口高度
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(zoom / 100))
    try { window.localStorage.setItem(ZOOM_KEY, String(zoom)) } catch { /* ignore */ }
  }, [zoom])

  const key = (label: string) => `${section}.${label}`
  const renderBlocks = (blocks: Block[]) => blocks.map(b => <div key={b.title}>
    <GroupTitle>{b.title}</GroupTitle>
    <div className="grouped">
      {b.rows.map(r => {
        const c = r.control, k = key(r.label), cur = values[k]
        return <div key={r.label} className="grouped-row">
          <div className="flex-1 min-w-0"><div className="text-[13.5px]">{r.label}</div>{r.desc && <div className="t-caption">{r.desc}</div>}</div>
          {c.type === 'toggle' && <Switch label={r.label} checked={(cur as boolean | undefined) ?? c.value} onChange={() => setValues(v => ({ ...v, [k]: !((cur as boolean | undefined) ?? c.value) }))} />}
          {c.type === 'select' && <select className="select" aria-label={r.label} value={(cur as string | undefined) ?? c.value} onChange={e => setValues(v => ({ ...v, [k]: e.target.value }))}>{c.options.map(o => <option key={o}>{o}</option>)}</select>}
          {c.type === 'value' && <span className="t-sub">{c.text}</span>}
          {c.type === 'button' && <button className="btn" onClick={() => notify(`「${r.label}」：演示版暂未开放`)}>{c.label}</button>}
        </div>
      })}
    </div>
  </div>)

  const THEME_OPTIONS: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: '浅色', icon: Sun }, { id: 'dark', label: '深色', icon: Moon }, { id: 'system', label: '跟随系统', icon: Monitor }
  ]
  const current = ALL.find(s => s.id === section)!

  return (
    <div className="flex flex-1 min-h-0">
      <aside aria-label="设置分组" className="settings-nav hidden md:flex">
        <h2 className="t-title px-3 pb-2">设置</h2>
        {GROUPS.map(g => <div key={g.title} className="mb-2">
          <div className="settings-nav-group">{g.title}</div>
          {g.items.map(s => { const Icon = s.icon; const active = section === s.id; return (
            <button key={s.id} onClick={() => setSection(s.id)} aria-current={active ? 'page' : undefined} className={`settings-nav-item ${active ? 'active' : ''}`}>
              <Icon size={15} aria-hidden /><span>{s.label}</span>
            </button>) })}
        </div>)}
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto">
        <div className="settings-content max-w-[720px] mx-auto">
          <div className="md:hidden mb-4">
            <h2 className="t-title mb-3">设置</h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" onKeyDown={onGroupKeyDown} aria-label="设置分组">
              {ALL.map(s => { const active = section === s.id; return (
                <button key={s.id} role="tab" aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => setSection(s.id)} className={`btn shrink-0 ${active ? 'btn-primary' : ''}`}>{s.label}</button>) })}
            </div>
          </div>
          <h3 className="t-headline mb-4 hidden md:block">{current.label}</h3>

          <div key={section} className="view-enter">
            {section === 'general' && <section aria-label="常规">
              <GroupTitle>界面模式</GroupTitle>
              <div role="radiogroup" aria-label="界面模式" onKeyDown={onGroupKeyDown} className="mode-cards">
                {([['simple', '简洁', '只有侧边栏和对话，适合日常和 Hermes 聊天。'], ['advanced', '高级', '面向开发者：对话旁可打开文件、终端、改动审查、浏览器和日志面板。']] as const).map(([id, label, desc]) =>
                  <button key={id} role="radio" aria-checked={mode === id} tabIndex={mode === id ? 0 : -1} className={`mode-card ${mode === id ? 'active' : ''}`} onClick={() => setMode(id)}>
                    <strong>{label}</strong><span>{desc}</span>
                  </button>)}
              </div>
              <p className="t-caption mt-2">只改变显示的内容，不改变 Hermes 的能力。</p>
              {renderBlocks([{ title: '启动与语言', rows: [
                { label: '语言', control: sel(['简体中文', 'English', '繁體中文']) },
                { label: '启动时打开', control: sel(['上次的会话', '新会话']) }
              ] }])}
            </section>}

            {section === 'appearance' && <section aria-label="外观">
              <GroupTitle>主题</GroupTitle>
              <div role="radiogroup" onKeyDown={onGroupKeyDown} aria-label="主题模式" className="seg w-full">
                {THEME_OPTIONS.map(o => { const Icon = o.icon; return (
                  <button key={o.id} role="radio" aria-checked={theme === o.id} tabIndex={theme === o.id ? 0 : -1} onClick={() => setTheme(o.id)} className={`seg-btn flex-1 flex items-center justify-center gap-1.5 ${theme === o.id ? 'active' : ''}`}>
                    <Icon size={14} aria-hidden />{o.label}
                  </button>) })}
              </div>
              <p className="t-caption mt-2">「跟随系统」会实时响应 Windows 的深浅色设置；快捷键 Shift+X 可快速切换。</p>

              <GroupTitle>强调色</GroupTitle>
              <div className="grouped"><div className="grouped-row">
                <div role="radiogroup" aria-label="强调色" onKeyDown={onGroupKeyDown} className="accent-picker">
                  {ACCENTS.map(a => <button key={a.id} role="radio" aria-checked={accent === a.id} tabIndex={accent === a.id ? 0 : -1} aria-label={a.label} title={a.label} data-swatch={a.id} className="accent-swatch" onClick={() => setAccent(a.id)} />)}
                </div>
                <span className="t-sub ml-auto">{ACCENTS.find(a => a.id === accent)?.label}</span>
              </div></div>

              <GroupTitle>字体与缩放</GroupTitle>
              <div className="grouped">
                <div className="grouped-row zoom-row">
                  <div className="flex items-center justify-between"><label htmlFor="zoom" className="text-[13.5px]">界面缩放</label><span className="t-sub">{zoom}%</span></div>
                  <input id="zoom" type="range" min={80} max={120} step={5} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full accent-[var(--accent)]" aria-valuetext={`${zoom}%`} />
                </div>
                <div className="grouped-row"><span className="flex-1 text-[13.5px]">聊天显示密度</span>
                  <select className="select" aria-label="聊天显示密度" value={density} onChange={e => setDensity(e.target.value)}><option>舒适</option><option>紧凑</option></select></div>
              </div>

              <GroupTitle>窗口与趣味</GroupTitle>
              <div className="grouped">
                <div className="grouped-row"><div className="flex-1"><div className="text-[13.5px]">HUD 悬浮模式</div><div className="t-caption">把对话缩成一个悬浮在桌面上的小窗 · Ctrl+Shift+H</div></div>
                  <Switch label="HUD 悬浮模式" checked={hud} onChange={() => { setHud(h => !h); notify(hud ? '已退出 HUD 模式（模拟）' : '已进入 HUD 模式（模拟，桌面版中窗口会缩成悬浮小窗）') }} /></div>
                <div className="grouped-row"><div className="flex-1"><div className="text-[13.5px]">桌面宠物</div><div className="t-caption">一个陪你工作的小吉祥物（petdex）</div></div>
                  <select className="select" aria-label="桌面宠物" value={pet} onChange={e => { setPet(e.target.value); notify(`桌面宠物：${e.target.value}（模拟）`) }}><option>不显示</option><option>Boba</option><option>Pixel</option><option>生成一只新的…</option></select></div>
                <div className="grouped-row"><div className="flex-1"><div className="text-[13.5px]">布局编辑器</div><div className="t-caption">高级模式下自定义面板的位置与分区</div></div>
                  <button className="btn" onClick={() => notify('布局编辑器：演示版暂未开放')}>打开</button></div>
              </div>
            </section>}

            {section === 'profiles' && <section aria-label="配置档案">
              <div className="flex items-center gap-2 mb-3">
                <p className="t-sub flex-1">每个配置档案有自己的模型、技能、记忆和人格。</p>
                <button className="btn" onClick={() => notify('导入配置档案：演示版暂未开放')}><Upload size={13} aria-hidden/>导入</button>
                <button className="btn btn-primary" onClick={() => notify('新建配置档案：演示版暂未开放')}><Plus size={13} aria-hidden/>新建</button>
              </div>
              <div role="radiogroup" onKeyDown={onGroupKeyDown} aria-label="选择配置档案" className="grouped">
                {profiles.map(p => { const active = p.id === activeProfile; const info = PROFILE_INFO[p.id]; return (
                  <button key={p.id} role="radio" aria-checked={active} tabIndex={active ? 0 : -1} onClick={() => { if (!active) onSwitchProfile(p.id) }} className="grouped-row">
                    <span className="profile-dot" style={{ background: active ? 'var(--accent)' : 'var(--border-strong)' }} aria-hidden />
                    <span className="flex-1 min-w-0"><span className="block text-[13.5px] font-semibold">{p.name}</span><span className="t-caption">{info?.desc} · {info?.model}</span></span>
                    {active ? <span className="chip"><BadgeCheck size={11} aria-hidden />当前</span> : <span className="t-caption">切换</span>}
                  </button>) })}
              </div>
              <button className="btn btn-plain mt-3" onClick={() => notify('导出配置档案：演示版暂未开放')}><Download size={13} aria-hidden/>导出当前配置档案</button>
            </section>}

            {section === 'archived' && <section aria-label="已归档对话">
              {archived.length === 0 ? <div className="surface p-8 text-center t-sub"><Archive size={20} className="mx-auto mb-2" aria-hidden/>还没有归档的对话。在会话的「⋯」菜单里选择「归档」，它就会出现在这里。</div> :
                <div className="grouped">{archived.map(s => <div key={s.id} className="grouped-row">
                  <div className="flex-1 min-w-0"><div className="text-[13.5px] truncate">{s.title}</div><div className="t-caption">{s.profile} · {s.updatedAt}</div></div>
                  <button className="btn" onClick={() => { onUnarchive(s.id); notify(`已取消归档「${s.title}」`) }}><ArchiveRestore size={13} aria-hidden/>取消归档</button>
                </div>)}</div>}
            </section>}

            {section === 'shortcuts' && <section aria-label="键盘快捷键">
              <div className="grouped">
                {[['打开命令面板', 'Ctrl K'], ['新建会话', 'Ctrl N'], ['打开设置', 'Ctrl ,'], ['打开命令中心', 'Ctrl .'], ['切换浅色 / 深色', 'Shift X']].map(([l, k]) =>
                  <div key={l} className="grouped-row"><span className="flex-1 text-[13.5px]">{l}</span><span className="kbd-group">{k.split(' ').map((x, i) => <kbd key={i}>{x}</kbd>)}</span></div>)}
              </div>
              <button className="btn btn-primary mt-4" onClick={onOpenShortcuts}><Keyboard size={13} aria-hidden/>查看全部快捷键</button>
            </section>}

            {section === 'about' && <section aria-label="关于">
              <div className="grouped">
                <div className="grouped-row"><Info size={16} aria-hidden style={{ color: 'var(--fg-tertiary)' }}/><span className="flex-1 text-[13.5px]">Hermes 新界面（原型）</span><span className="chip">v{APP_VERSION}</span></div>
                <div className="grouped-row"><Bot size={16} aria-hidden style={{ color: 'var(--fg-tertiary)' }}/><span className="flex-1 text-[13.5px]">上游</span><span className="t-sub">Hermes Agent by NousResearch</span></div>
                <div className="grouped-row"><span className="flex-1 text-[13.5px]">更新通道</span><select className="select" aria-label="更新通道"><option>稳定版</option><option>测试版</option></select></div>
              </div>
              <GroupTitle>系统与用量</GroupTitle>
              <div className="grouped">
                <button className="grouped-row" onClick={() => onOpenCommandCenter('system')}><Server size={16} aria-hidden/><span className="flex-1 text-[13.5px]">系统状态、日志与更新</span><span className="t-caption">命令中心 ›</span></button>
                <button className="grouped-row" onClick={() => onOpenCommandCenter('usage')}><Gauge size={16} aria-hidden/><span className="flex-1 text-[13.5px]">用量与成本</span><span className="t-caption">命令中心 ›</span></button>
                <button className="grouped-row" onClick={() => onOpenCommandCenter('maintenance')}><Layers size={16} aria-hidden/><span className="flex-1 text-[13.5px]">诊断与维护</span><span className="t-caption">命令中心 ›</span></button>
              </div>
              <GroupTitle>配置</GroupTitle>
              <div className="flex gap-2 flex-wrap">
                <button className="btn" onClick={() => notify('配置已导出（模拟）')}><Download size={13} aria-hidden/>导出配置</button>
                <button className="btn" onClick={() => notify('导入配置：演示版暂未开放')}><Upload size={13} aria-hidden/>导入配置</button>
                <button className="btn btn-danger" onClick={() => notify('已恢复默认设置（模拟）')}>恢复默认</button>
              </div>
            </section>}

            {SCHEMA[section] && <section aria-label={current.label}>{renderBlocks(SCHEMA[section]!)}<p className="t-caption mt-4">演示选项，改动只在本次页面生效。</p></section>}
          </div>
        </div>
      </div>
    </div>
  )
}
