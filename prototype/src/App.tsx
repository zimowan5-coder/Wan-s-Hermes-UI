import { useState } from 'react'
import { Shell, type ViewId } from './components/Shell'
import { useGlobalApprovals } from './hooks/useChatSession'
import { useTheme } from './theme/theme'
import { ChatView } from './views/ChatView'
import { MemoryView } from './views/MemoryView'
import { MessagingView } from './views/MessagingView'
import { SettingsView } from './views/SettingsView'
import { SkillsView } from './views/SkillsView'
import { TasksView } from './views/TasksView'

export default function App() {
  const { mode, setMode } = useTheme()
  const [view, setView] = useState<ViewId>('chat')
  const { pendingCount } = useGlobalApprovals()
  const [connectionOk, setConnectionOk] = useState(true) // MOCK：模拟连接状态

  return (
    <Shell
      view={view}
      setView={setView}
      themeMode={mode}
      onThemeChange={setMode}
      pendingApprovals={pendingCount}
      connectionOk={connectionOk}
      onToggleConnection={() => setConnectionOk(v => !v)}
    >
      {view === 'chat' && <ChatView connectionOk={connectionOk} />}
      {view === 'tasks' && <TasksView />}
      {view === 'skills' && <SkillsView />}
      {view === 'memory' && <MemoryView />}
      {view === 'messaging' && <MessagingView />}
      {view === 'settings' && <SettingsView />}
    </Shell>
  )
}
