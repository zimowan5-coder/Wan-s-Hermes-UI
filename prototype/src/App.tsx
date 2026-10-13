import { useEffect, useMemo, useState } from 'react'
import { buildCommands, CommandPalette } from './components/CommandPalette'
import { Shell, type ViewId } from './components/Shell'
import { useGlobalApprovals } from './hooks/useChatSession'
import { useTheme } from './theme/theme'
import { ChatView } from './views/ChatView'
import { MemoryView } from './views/MemoryView'
import { MessagingView } from './views/MessagingView'
import { SettingsView } from './views/SettingsView'
import { SkillsView } from './views/SkillsView'
import { TasksView } from './views/TasksView'

const THEME_CYCLE = ['light', 'dark', 'system'] as const

export default function App() {
  const { mode, setMode } = useTheme()
  // QA 钩子：?view=tasks|skills|memory|messaging|settings 直达某视图（截图/走查用，见 DESIGN-SYSTEM.md）
  const [view, setView] = useState<ViewId>(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('view')
      return v === 'tasks' || v === 'skills' || v === 'memory' || v === 'messaging' || v === 'settings' ? v : 'chat'
    } catch { return 'chat' }
  })
  const [newChatRequest, setNewChatRequest] = useState(0)
  const { pendingCount } = useGlobalApprovals()
  const [connectionOk, setConnectionOk] = useState(true) // MOCK：模拟连接状态
  const [paletteOpen, setPaletteOpen] = useState(false)

  // 全局 Ctrl/⌘+K 打开命令面板
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const commands = useMemo(() => buildCommands({
    go: setView,
    cycleTheme: () => {
      const i = THEME_CYCLE.indexOf(mode)
      setMode(THEME_CYCLE[(i + 1) % THEME_CYCLE.length])
    },
    toggleConnection: () => setConnectionOk(v => !v),
    newChat: () => { setView('chat'); setNewChatRequest(n => n + 1) }, // Select the existing empty mock session, not a fabricated backend session.
    connectionOk
  }), [mode, connectionOk, setMode])

  return (
    <>
      <Shell
        view={view}
        setView={setView}
        pendingApprovals={pendingCount}
        connectionOk={connectionOk}
        onToggleConnection={() => setConnectionOk(v => !v)}
        onOpenPalette={() => setPaletteOpen(true)}
      >
        <div className="view-pane" hidden={view !== 'chat'}><ChatView connectionOk={connectionOk} newChatRequest={newChatRequest} /></div>
        <div className="view-pane" hidden={view !== 'tasks'}><TasksView /></div>
        <div className="view-pane" hidden={view !== 'skills'}><SkillsView /></div>
        <div className="view-pane" hidden={view !== 'memory'}><MemoryView /></div>
        <div className="view-pane" hidden={view !== 'messaging'}><MessagingView /></div>
        <div className="view-pane" hidden={view !== 'settings'}><SettingsView /></div>
      </Shell>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </>
  )
}
