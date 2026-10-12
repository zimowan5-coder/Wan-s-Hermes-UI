import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HermesDataSource } from '../data/HermesDataSource'
import { getDataSource } from '../data/registry'
import type { AgentState, Approval, ChatMessage, SessionSummary, ToolRun } from '../data/types'
import {
  decidedApprovalsForSession, pendingApprovalCount, pendingApprovalsForSession
} from '../lib/session-state'

/** 顶栏用：全局审批列表 + 决定操作 */
export function useGlobalApprovals(ds: HermesDataSource = getDataSource()) {
  const [approvals, setApprovals] = useState<Approval[]>([])

  useEffect(() => {
    let cancelled = false
    ds.listApprovals().then(a => { if (!cancelled) setApprovals(a) })
    const off = ds.onApprovalsChanged(() => {
      ds.listApprovals().then(a => { if (!cancelled) setApprovals(a) })
    })
    return () => { cancelled = true; off() }
  }, [ds])

  const decide = useCallback(async (id: string, ok: boolean) => {
    await ds.decideApproval(id, ok)
    setApprovals(await ds.listApprovals())
  }, [ds])

  return { approvals, decide, pendingCount: pendingApprovalCount(approvals) }
}

/** 会话列表（Chat 工作台侧栏用） */
export function useSessionList(ds: HermesDataSource = getDataSource()) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  useEffect(() => {
    let cancelled = false
    ds.listSessions().then(s => { if (!cancelled) setSessions(s) })
    return () => { cancelled = true }
  }, [ds])
  return sessions
}

/**
 * useChatSession —— Chat 工作台的状态与交互层。
 * UI 组件只消费这里返回的状态与回调，不直接碰 DataSource、不直接碰 mock 数据。
 */
export function useChatSession(sessionId: string, ds: HermesDataSource = getDataSource()) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [runs, setRuns] = useState<ToolRun[]>([])
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const timers = useRef<number[]>([])

  useEffect(() => () => { timers.current.forEach(clearTimeout) }, [])

  // 会话切换：重新加载该会话的三类状态；订阅审批变更
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSending(false)
    Promise.all([ds.getMessages(sessionId), ds.listApprovals(), ds.listToolRuns(sessionId)]).then(
      ([m, a, r]) => {
        if (!cancelled) {
          setMessages(m)
          setApprovals(a)
          setRuns(r)
          setLoading(false)
        }
      }
    )
    const off = ds.onApprovalsChanged(() => {
      ds.listApprovals().then(a => { if (!cancelled) setApprovals(a) })
    })
    return () => { cancelled = true; off() }
  }, [ds, sessionId])

  const refreshRuns = useCallback(async () => {
    setRuns(await ds.listToolRuns(sessionId))
  }, [ds, sessionId])

  const send = useCallback(async (text: string) => {
    const t = text.trim()
    if (!t || !sessionId) return
    setSending(true)
    // 工具生命周期：running →（mock 700ms 后）ok
    await ds.runTool(sessionId, 'agent.plan', '规划回复中（模拟）')
    await refreshRuns()
    for await (const msg of ds.sendMessage(sessionId, t)) {
      setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
    }
    await refreshRuns()
    setSending(false)
  }, [ds, sessionId, refreshRuns])

  const decide = useCallback(async (id: string, ok: boolean) => {
    await ds.decideApproval(id, ok)
    setApprovals(await ds.listApprovals())
  }, [ds])

  const retry = useCallback(async (runId: string) => {
    await ds.retryToolRun(runId)
    await refreshRuns()
    // mock 1200ms 后转为 ok，届时再刷新一次
    const timer = window.setTimeout(() => {
      ds.listToolRuns(sessionId).then(setRuns)
    }, 1500)
    timers.current.push(timer)
  }, [ds, sessionId, refreshRuns])

  const sessionPending = useMemo(() => pendingApprovalsForSession(approvals, sessionId), [approvals, sessionId])
  const sessionDecided = useMemo(() => decidedApprovalsForSession(approvals, sessionId), [approvals, sessionId])

  const agentState: AgentState =
    sending ? 'thinking'
    : runs.some(r => r.status === 'running') ? 'tool-running'
    : runs.some(r => r.status === 'error') ? 'error'
    : sessionPending.length > 0 ? 'awaiting-approval'
    : 'idle'

  return {
    messages, runs, sending, loading,
    approvals, // 全部审批（用于会话列表徽标等全局派生）
    sessionPending, sessionDecided,
    agentState, send, decide, retry
  }
}
