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
  const [view, setView] = useState<ViewId>('chat')
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
    newChat: () => setView('chat'), // MOCK：原型中新会话即回到聊天
    connectionOk
  }), [mode, connectionOk, setMode])

  return (
    <>
      <Shell
        view={view}
        setView={setView}
        themeMode={mode}
        onThemeChange={setMode}
        pendingApprovals={pendingCount}
        connectionOk={connectionOk}
        onToggleConnection={() => setConnectionOk(v => !v)}
        onOpenPalette={() => setPaletteOpen(true)}
      >
        {view === 'chat' && <ChatView connectionOk={connectionOk} />}
        {view === 'tasks' && <TasksView />}
        {view === 'skills' && <SkillsView />}
        {view === 'memory' && <MemoryView />}
        {view === 'messaging' && <MessagingView />}
        {view === 'settings' && <SettingsView />}
      </Shell>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={commands} />
    </>
  )
}
