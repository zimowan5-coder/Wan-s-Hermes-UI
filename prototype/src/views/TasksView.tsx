import { CalendarClock, CheckCircle2, CircleDashed, Pause, Play, Plus } from 'lucide-react'
import { useState } from 'react'
import { mockCronJobs, mockTasks, type CronJob, type TaskItem } from '../mock/data'
import { MockBadge } from '../components/MockBadge'

const COLS: { id: TaskItem['column']; label: string }[] = [
  { id: 'todo', label: '待办' },
  { id: 'doing', label: '进行中' },
  { id: 'done', label: '已完成' }
]

export function TasksView() {
  const [jobs, setJobs] = useState<CronJob[]>(mockCronJobs)
  const [tasks] = useState<TaskItem[]>(mockTasks)

  const toggle = (id: string) => setJobs(prev => prev.map(j => (j.id === id ? { ...j, enabled: !j.enabled } : j)))

  // 新建：明确的模拟反馈 —— 追加一条 MOCK 任务，而非无响应
  const addMockJob = () => {
    const n = jobs.filter(j => j.id.startsWith('mock-')).length + 1
    setJobs(prev => [...prev, {
      id: `mock-${Date.now()}`, name: `新建任务 ${n}（模拟）`,
      schedule: '手动触发', nextRun: '—', enabled: false, lastStatus: 'never'
    }])
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[16px] font-bold">任务</h2>
        <MockBadge />
        <span className="text-[12px]" style={{ color: 'var(--ui-fg-faint)' }}>定时任务 + 看板（合并原生 cron 页与 kanban 插件）</span>
      </div>

      {/* 定时任务 */}
      <div className="flex items-center gap-2 mb-2">
        <CalendarClock size={15} style={{ color: 'var(--ui-accent)' }} />
        <h3 className="text-[13.5px] font-semibold">定时任务</h3>
        <button className="btn ml-auto" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addMockJob}><Plus size={13} aria-hidden />新建</button>
      </div>
      <div className="flex flex-col gap-2 mb-7">
        {jobs.map(j => (
          <div key={j.id} className="flat-panel px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => toggle(j.id)}
              className="w-9 h-5 rounded-full relative transition-colors shrink-0"
              style={{ background: j.enabled ? 'var(--ui-accent)' : 'rgba(255,255,255,0.14)' }}
              title={j.enabled ? '暂停' : '启用'}
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: j.enabled ? 18 : 2 }}
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-medium">{j.name}</div>
              <div className="text-[11.5px]" style={{ color: 'var(--ui-fg-faint)' }}>{j.schedule} · 下次 {j.nextRun}</div>
            </div>
            <span className="chip" style={{ color: j.lastStatus === 'ok' ? 'var(--ui-ok)' : 'var(--ui-fg-faint)' }}>
              {j.lastStatus === 'ok' ? '上次成功' : '尚未运行'}
            </span>
            {j.enabled ? <Play size={13} style={{ color: 'var(--ui-ok)' }} /> : <Pause size={13} style={{ color: 'var(--ui-fg-faint)' }} />}
          </div>
        ))}
      </div>

      {/* 看板 */}
      <h3 className="text-[13.5px] font-semibold mb-2">任务看板</h3>
      <div className="grid grid-cols-3 gap-3">
        {COLS.map(c => (
          <div key={c.id} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--ui-stroke)' }}>
            <div className="flex items-center gap-1.5 px-1.5 pb-2 text-[12px] font-semibold" style={{ color: 'var(--ui-fg-muted)' }}>
              {c.id === 'done' ? <CheckCircle2 size={13} style={{ color: 'var(--ui-ok)' }} /> : <CircleDashed size={13} />}
              {c.label}
              <span className="ml-auto chip">{tasks.filter(t => t.column === c.id).length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {tasks.filter(t => t.column === c.id).map(t => (
                <div key={t.id} className="flat-panel p-3">
                  <div className="text-[12.5px] font-medium leading-snug">{t.title}</div>
                  {t.tag && <span className="chip mt-1.5">{t.tag}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
