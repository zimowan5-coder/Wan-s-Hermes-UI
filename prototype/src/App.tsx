import {
  Archive, ArchiveRestore, Bell, Brain, Copy, Download, FolderInput, Gauge, GitBranch, Image as ImageIcon, Keyboard, MailOpen,
  MessageSquare, Moon, PanelRight, Pencil, Pin, PinOff, Plug2, Settings, SquareKanban, SquarePen, Trash2, User, Users, Wifi, WifiOff, Wrench
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CommandPalette, type PaletteCommand } from './components/CommandPalette'
import type { MenuEntry } from './components/Menu'
import { Modal } from './components/Modal'
import { AgentsPanel, CommandCenter, SessionImport, ShortcutsPanel, type CommandCenterTab } from './components/Overlays'
import { Shell, VIEW_IDS, type OverlayId, type ViewId } from './components/Shell'
import { useGlobalApprovals, useSessionList } from './hooks/useChatSession'
import { useInterfaceMode } from './lib/prefs'
import { mergeSessions, type MergedSession, type SessionMeta } from './lib/sessions'
import { pendingApprovalsForSession } from './lib/session-state'
import { useTheme } from './theme/theme'
import { ArtifactsView } from './views/ArtifactsView'
import { ChatView } from './views/ChatView'
import { MemoryView } from './views/MemoryView'
import { MessagingView } from './views/MessagingView'
import { SettingsView, type SettingsSection } from './views/SettingsView'
import { SkillsView } from './views/SkillsView'
import { TasksView } from './views/TasksView'

const THEME_CYCLE = ['light', 'dark', 'system'] as const
export const PROFILES = [{ id: 'p1', name: '默认' }, { id: 'p2', name: 'Codex 协作' }, { id: 'p3', name: '小管' }]
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

export default function App() {
  const { mode: themeMode, resolved, setMode: setTheme } = useTheme()
  const [mode, setMode] = useInterfaceMode()
  // QA 钩子：?view=tasks|skills|memory|messaging|artifacts|settings 直达某视图（截图/走查用）
  const [view, setView] = useState<ViewId>(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('view') as ViewId | null
      return v && VIEW_IDS.includes(v) ? v : 'chat'
    } catch { return 'chat' }
  })
  const [activeSessionId, setActiveSessionId] = useState('s1')
  const [meta, setMeta] = useState<Record<string, SessionMeta>>({})
  const [focusRequest, setFocusRequest] = useState(0)
  const [activeProfile, setActiveProfile] = useState('p1')
  const [connectionOk, setConnectionOk] = useState(true) // MOCK：模拟连接状态
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [overlay, setOverlay] = useState<OverlayId | null>(null)
  const [ccTab, setCcTab] = useState<CommandCenterTab>('sessions')
  const [settingsSection, setSettingsSection] = useState<{ id?: SettingsSection; n: number }>({ n: 0 })
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [renaming, setRenaming] = useState<MergedSession | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState<MergedSession | null>(null)
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const toastTimer = useRef<number | null>(null)

  const rawSessions = useSessionList()
  const sessions = useMemo(() => mergeSessions(rawSessions, meta), [rawSessions, meta])
  const { approvals } = useGlobalApprovals()
  const pendingBySession = useMemo(() => Object.fromEntries(sessions.map(s => [s.id, pendingApprovalsForSession(approvals, s.id).length])), [sessions, approvals])
  const activeSession = sessions.find(s => s.id === activeSessionId)

  const notify = useCallback((text: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text })
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])
  const patchMeta = (id: string, patch: SessionMeta) => setMeta(m => ({ ...m, [id]: { ...m[id], ...patch } }))

  const openSession = useCallback((id: string) => {
    setActiveSessionId(id)
    setView('chat')
    setMeta(m => m[id]?.unread ? { ...m, [id]: { ...m[id], unread: false } } : m)
  }, [])
  // 「新建会话」打开空白演示会话，而不是伪造一个后端会话
  const newChat = useCallback(() => { openSession('s6'); setFocusRequest(n => n + 1) }, [openSession])
  const openSettings = useCallback((section?: SettingsSection) => { setView('settings'); setSettingsSection(s => ({ id: section, n: s.n + 1 })) }, [])
  const openOverlay = useCallback((id: OverlayId, tab?: CommandCenterTab) => { if (tab) setCcTab(tab); else if (id === 'command-center') setCcTab('sessions'); setOverlay(id) }, [])

  // 当前会话被删除或归档后，切到下一个可见会话
  useEffect(() => {
    if (!sessions.length) return
    const cur = sessions.find(s => s.id === activeSessionId)
    if (!cur || cur.archived) setActiveSessionId((sessions.find(s => !s.archived) ?? sessions[0]).id)
  }, [sessions, activeSessionId])

  const sessionMenu = useCallback((s: MergedSession): MenuEntry[] => [
    { id: 'pin', label: s.pinned ? '取消置顶' : '置顶', icon: s.pinned ? <PinOff size={14}/> : <Pin size={14}/>, onSelect: () => patchMeta(s.id, { pinned: !s.pinned }) },
    { id: 'rename', label: '重命名…', icon: <Pencil size={14}/>, onSelect: () => { setRenaming(s); setRenameValue(s.title) } },
    { id: 'unread', label: s.unreadCount ? '标记为已读' : '标记为未读', icon: <MailOpen size={14}/>, onSelect: () => patchMeta(s.id, { unread: !s.unreadCount }) },
    { separator: true, id: 'sep1' },
    { id: 'branch', label: '从这里分支', icon: <GitBranch size={14}/>, onSelect: () => notify(`已从「${s.title}」分支出新对话（模拟）`) },
    { id: 'export', label: '导出', icon: <Download size={14}/>, onSelect: () => notify(`「${s.title}」已导出为 JSON（模拟）`) },
    { id: 'copy-id', label: '复制 ID', icon: <Copy size={14}/>, onSelect: () => { void navigator.clipboard?.writeText(s.id).catch(() => {}); notify(`已复制会话 ID：${s.id}`) } },
    { separator: true, id: 'sep2' },
    s.archived
      ? { id: 'unarchive', label: '取消归档', icon: <ArchiveRestore size={14}/>, onSelect: () => { patchMeta(s.id, { archived: false }); notify(`已取消归档「${s.title}」`) } }
      : { id: 'archive', label: '归档', icon: <Archive size={14}/>, onSelect: () => { patchMeta(s.id, { archived: true }); notify(`已归档「${s.title}」，可在 设置 › 已归档对话 中找回`) } },
    { id: 'delete', label: '删除…', icon: <Trash2 size={14}/>, danger: true, onSelect: () => setDeleting(s) }
  ], [notify])

  const cycleTheme = () => setTheme(THEME_CYCLE[(THEME_CYCLE.indexOf(themeMode) + 1) % THEME_CYCLE.length])
  const switchProfile = (id: string) => { setActiveProfile(id); notify(`已切换到配置档案「${PROFILES.find(p => p.id === id)?.name}」（模拟）`) }
  const toggleMode = () => setMode(mode === 'simple' ? 'advanced' : 'simple')

  // 全局快捷键（默认值与官方一致，Windows 下 mod = Ctrl）
  const keyActions = useRef<(e: KeyboardEvent) => void>(() => {})
  keyActions.current = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    const k = e.key.toLowerCase()
    if (mod && !e.shiftKey && (k === 'k' || k === 'p')) { e.preventDefault(); setPaletteOpen(v => !v); return }
    if (document.querySelector('dialog[open]')) return
    if (mod && !e.shiftKey && k === 'n') { e.preventDefault(); newChat() }
    else if (mod && k === '.') { e.preventDefault(); openOverlay('command-center') }
    else if (mod && k === ',') { e.preventDefault(); openSettings() }
    else if (mod && k === '/') { e.preventDefault(); setOverlay('shortcuts') }
    else if (mod && k === 'j' && mode === 'advanced') { e.preventDefault(); setView('chat'); setRightPanelOpen(v => !v) }
    else if (e.ctrlKey && k === 'tab') {
      e.preventDefault()
      const list = sessions.filter(s => !s.archived)
      const i = list.findIndex(s => s.id === activeSessionId)
      openSession(list[(i + (e.shiftKey ? -1 : 1) + list.length) % list.length].id)
    } else if (!mod && e.shiftKey && k === 'x' && !isTyping(e.target)) { setTheme(resolved === 'dark' ? 'light' : 'dark') }
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyActions.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (v: ViewId) => () => setView(v)
  const commands: PaletteCommand[] = [
    { id: 'new-chat', title: '新建会话', hint: 'Ctrl N', keywords: 'new 新会话 新建 chat', group: '操作', icon: SquarePen, run: newChat },
    { id: 'go-tasks', title: '前往任务', keywords: 'tasks cron 定时 看板 kanban', group: '页面', icon: SquareKanban, run: go('tasks') },
    { id: 'go-skills', title: '前往技能与工具', keywords: 'skills 技能 工具集 连接器 mcp 插件 capabilities', group: '页面', icon: Plug2, run: go('skills') },
    { id: 'go-memory', title: '前往记忆', keywords: 'memory 记忆 图谱 starmap journey', group: '页面', icon: Brain, run: go('memory') },
    { id: 'go-messaging', title: '前往消息平台', keywords: 'messaging 消息 telegram 微信 webhook', group: '页面', icon: Bell, run: go('messaging') },
    { id: 'go-artifacts', title: '前往产物', keywords: 'artifacts 产物 图片 文件 链接', group: '页面', icon: ImageIcon, run: go('artifacts') },
    { id: 'go-settings', title: '打开设置', hint: 'Ctrl ,', keywords: 'settings 设置 偏好', group: '页面', icon: Settings, run: () => openSettings() },
    { id: 'cc', title: '打开命令中心', hint: 'Ctrl .', keywords: 'command center 命令中心', group: '命令中心', icon: Gauge, run: () => openOverlay('command-center') },
    { id: 'cc-system', title: '系统状态与日志', keywords: 'system gateway 网关 重启 更新 日志 logs', group: '命令中心', icon: Gauge, run: () => openOverlay('command-center', 'system') },
    { id: 'cc-usage', title: '用量统计', keywords: 'usage 用量 词元 token 成本', group: '命令中心', icon: Gauge, run: () => openOverlay('command-center', 'usage') },
    { id: 'cc-maint', title: '维护与诊断', keywords: 'maintenance doctor 维护 诊断 清理', group: '命令中心', icon: Wrench, run: () => openOverlay('command-center', 'maintenance') },
    { id: 'agents', title: '查看子代理', keywords: 'agents subagents 子代理 派生树', group: '操作', icon: Users, run: () => setOverlay('agents') },
    { id: 'import', title: '从其他应用导入会话', keywords: 'import claude code codex 导入', group: '操作', icon: FolderInput, run: () => setOverlay('import') },
    { id: 'shortcuts', title: '键盘快捷键', hint: 'Ctrl /', keywords: 'keyboard shortcuts 快捷键 键位', group: '操作', icon: Keyboard, run: () => setOverlay('shortcuts') },
    { id: 'profiles', title: '管理配置档案', keywords: 'profiles 配置档案 身份', group: '设置', icon: User, run: () => openSettings('profiles') },
    ...PROFILES.map(p => ({ id: `profile-${p.id}`, title: `切换到配置档案「${p.name}」`, keywords: `profile switch 切换 ${p.name}`, group: '设置', icon: User, run: () => switchProfile(p.id) })),
    { id: 'mode', title: mode === 'simple' ? '切换到高级模式' : '切换到简洁模式', keywords: 'interface mode simple advanced 简洁 高级 开发者', group: '设置', icon: PanelRight, run: toggleMode },
    ...(mode === 'advanced' ? [{ id: 'right-panel', title: rightPanelOpen ? '隐藏右侧面板' : '显示右侧面板（文件、终端、审查）', hint: 'Ctrl J', keywords: 'files terminal review browser logs 文件 终端 审查 浏览器 日志', group: '设置', icon: PanelRight, run: () => { setView('chat'); setRightPanelOpen(v => !v) } }] : []),
    { id: 'theme', title: '切换主题', hint: '浅色 → 深色 → 跟随系统', keywords: 'theme 主题 深色 浅色 外观', group: '设置', icon: Moon, run: cycleTheme },
    { id: 'appearance', title: '外观：强调色、字体、HUD、宠物、布局', keywords: 'appearance accent hud pet layout 强调色 宠物 布局 悬浮', group: '设置', icon: Settings, run: () => openSettings('appearance') },
    { id: 'archived', title: '已归档对话', keywords: 'archived 归档', group: '设置', icon: Archive, run: () => openSettings('archived') },
    { id: 'toggle-conn', title: connectionOk ? '断开连接（模拟）' : '恢复连接（模拟）', keywords: 'connection 连接 断连', group: '设置', icon: connectionOk ? WifiOff : Wifi, run: () => setConnectionOk(v => !v) },
    ...sessions.filter(s => !s.archived).map(s => ({ id: `session-${s.id}`, title: s.title, hint: s.profile, keywords: `session 会话 ${s.profile}`, group: '会话', icon: MessageSquare, run: () => openSession(s.id) }))
  ]

  return (
    <>
      <Shell
        view={view} setView={setView}
        sessions={sessions} activeSessionId={activeSessionId} pendingBySession={pendingBySession}
        onOpenSession={openSession} onNewChat={newChat} sessionMenu={sessionMenu}
        profiles={PROFILES} activeProfile={activeProfile} onSwitchProfile={switchProfile}
        onOverlay={id => openOverlay(id)} onOpenSettings={s => openSettings(s as SettingsSection | undefined)}
        mode={mode} setMode={setMode}
        connectionOk={connectionOk} onToggleConnection={() => setConnectionOk(v => !v)}
        onOpenPalette={() => setPaletteOpen(true)}
        rightPanelOpen={rightPanelOpen} onToggleRightPanel={() => setRightPanelOpen(v => !v)}
      >
        <div className="view-pane" hidden={view !== 'chat'}>
          <ChatView visible={view === 'chat'} connectionOk={connectionOk} activeId={activeSessionId} session={activeSession}
            sessionMenu={activeSession ? sessionMenu(activeSession) : []} mode={mode}
            rightPanelOpen={rightPanelOpen} onCloseRightPanel={() => setRightPanelOpen(false)}
            onOpenAgents={() => setOverlay('agents')} focusRequest={focusRequest} />
        </div>
        <div className="view-pane" hidden={view !== 'tasks'}><TasksView /></div>
        <div className="view-pane" hidden={view !== 'skills'}><SkillsView /></div>
        <div className="view-pane" hidden={view !== 'memory'}><MemoryView /></div>
        <div className="view-pane" hidden={view !== 'messaging'}><MessagingView /></div>
        <div className="view-pane" hidden={view !== 'artifacts'}><ArtifactsView onOpenSession={openSession} /></div>
        <div className="view-pane" hidden={view !== 'settings'}>
          <SettingsView request={settingsSection} profiles={PROFILES} activeProfile={activeProfile} onSwitchProfile={switchProfile}
            mode={mode} setMode={setMode} archived={sessions.filter(s => s.archived)} onUnarchive={id => patchMeta(id, { archived: false })}
            onOpenShortcuts={() => setOverlay('shortcuts')} onOpenCommandCenter={tab => openOverlay('command-center', tab)} notify={notify} />
        </div>
      </Shell>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
      <CommandCenter open={overlay === 'command-center'} onClose={() => setOverlay(null)} initialTab={ccTab} sessions={sessions} sessionMenu={sessionMenu} onOpenSession={openSession} />
      <AgentsPanel open={overlay === 'agents'} onClose={() => setOverlay(null)} />
      <ShortcutsPanel open={overlay === 'shortcuts'} onClose={() => setOverlay(null)} />
      <SessionImport open={overlay === 'import'} onClose={() => setOverlay(null)} />

      <Modal open={!!renaming} onClose={() => setRenaming(null)} label="重命名会话" className="small-dialog">
        <form className="p-6" onSubmit={e => { e.preventDefault(); if (renaming) { patchMeta(renaming.id, { title: renameValue.trim() || undefined }); setRenaming(null) } }}>
          <h3 className="t-headline mb-1">重命名会话</h3>
          <p className="t-sub mb-4">留空则恢复原标题。</p>
          <input className="input" autoFocus aria-label="会话名称" value={renameValue} onChange={e => setRenameValue(e.target.value)} />
          <div className="flex justify-end gap-2 mt-5"><button type="button" className="btn" onClick={() => setRenaming(null)}>取消</button><button type="submit" className="btn btn-primary">保存</button></div>
        </form>
      </Modal>
      <Modal open={!!deleting} onClose={() => setDeleting(null)} label="删除会话" className="small-dialog">
        <div className="p-6">
          <h3 className="t-headline mb-1">删除会话？</h3>
          <p className="t-sub mb-5">这将删除「{deleting?.title}」（演示版只从列表中移除，刷新后恢复）。</p>
          <div className="flex justify-end gap-2"><button className="btn" autoFocus onClick={() => setDeleting(null)}>取消</button>
            <button className="btn btn-danger" onClick={() => { if (deleting) { patchMeta(deleting.id, { deleted: true }); notify(`已删除「${deleting.title}」`) } setDeleting(null) }}>删除</button></div>
        </div>
      </Modal>
      {toast && <div key={toast.id} className="app-toast" role="status">{toast.text}</div>}
    </>
  )
}
