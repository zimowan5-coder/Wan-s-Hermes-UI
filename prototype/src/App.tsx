import { useMemo, useState } from 'react'
import { Shell, type ViewId } from './components/Shell'
import { mockApprovals, type Approval } from './mock/data'
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
  const [approvals, setApprovals] = useState<Approval[]>(mockApprovals)
  const [connectionOk, setConnectionOk] = useState(true) // MOCK：模拟连接状态

  const pendingCount = useMemo(() => approvals.filter(a => a.status === 'pending').length, [approvals])

  const decideApproval = (id: string, ok: boolean) =>
    setApprovals(prev => prev.map(a => (a.id === id ? { ...a, status: ok ? 'approved' : 'denied' } : a)))

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
      {view === 'chat' && (
        <ChatView approvals={approvals} onDecideApproval={decideApproval} connectionOk={connectionOk} />
      )}
      {view === 'tasks' && <TasksView />}
      {view === 'skills' && <SkillsView />}
      {view === 'memory' && <MemoryView />}
      {view === 'messaging' && <MessagingView />}
      {view === 'settings' && <SettingsView />}
    </Shell>
  )
}
