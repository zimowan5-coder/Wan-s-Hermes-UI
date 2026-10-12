import { useState } from 'react'
import { Shell, type ViewId } from './components/Shell'
import { ChatView } from './views/ChatView'
import { MemoryView } from './views/MemoryView'
import { MessagingView } from './views/MessagingView'
import { SettingsView } from './views/SettingsView'
import { SkillsView } from './views/SkillsView'
import { TasksView } from './views/TasksView'

export default function App() {
  const [view, setView] = useState<ViewId>('chat')

  return (
    <Shell view={view} setView={setView}>
      {view === 'chat' && <ChatView />}
      {view === 'tasks' && <TasksView />}
      {view === 'skills' && <SkillsView />}
      {view === 'memory' && <MemoryView />}
      {view === 'messaging' && <MessagingView />}
      {view === 'settings' && <SettingsView />}
    </Shell>
  )
}
