import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HermesDataSource } from '../data/HermesDataSource'
import { getDataSource } from '../data/registry'
import type { AgentState, Approval, ChatMessage, SessionSummary, ToolRun } from '../data/types'
import { decidedApprovalsForSession, pendingApprovalCount, pendingApprovalsForSession } from '../lib/session-state'

const errorText = (e: unknown) => e instanceof Error ? e.message : String(e)
export function useGlobalApprovals(ds: HermesDataSource = getDataSource()) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  useEffect(() => {
    let cancelled = false
    const refresh = () => { void ds.listApprovals().then(a => { if (!cancelled) setApprovals(a) }).catch(() => {}) }
    refresh()
    let off: (() => void) | undefined
    try { off = ds.onApprovalsChanged(refresh) } catch { /* Live adapter may not support this yet. */ }
    return () => { cancelled = true; off?.() }
  }, [ds])
  return { approvals, pendingCount: pendingApprovalCount(approvals) }
}
export function useSessionList(ds: HermesDataSource = getDataSource()) {
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  useEffect(() => {
    let cancelled = false
    ds.listSessions().then(s => { if (!cancelled) setSessions(s) }).catch(() => { if (!cancelled) setSessions([]) })
    return () => { cancelled = true }
  }, [ds])
  return sessions
}
interface SessionState {
  messages: ChatMessage[]; runs: ToolRun[]; sending: boolean; loading: boolean;
  error: string | null; actionError: string | null;
}
const emptyState = (): SessionState => ({ messages: [], runs: [], sending: false, loading: true, error: null, actionError: null })

/** All asynchronous updates retain their originating session key, including hidden sessions. */
export function useChatSession(sessionId: string, ds: HermesDataSource = getDataSource()) {
  const [cache, setCache] = useState<Record<string, SessionState>>({})
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loadVersion, setLoadVersion] = useState(0)
  const mounted = useRef(true)
  const inflight = useRef(new Set<string>())
  const generation = useRef<Record<string, number>>({}) // 每次发送一个令牌；停止后旧回合的流式内容被丢弃
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const patch = useCallback((id: string, update: (prev: SessionState) => SessionState) => {
    if (mounted.current) setCache(prev => ({ ...prev, [id]: update(prev[id] ?? emptyState()) }))
  }, [])
  const state = cache[sessionId] ?? emptyState()

  useEffect(() => {
    let cancelled = false
    patch(sessionId, p => ({ ...p, loading: true, error: null }))
    Promise.allSettled([ds.getMessages(sessionId), ds.listApprovals(), ds.listToolRuns(sessionId)]).then(([m, a, r]) => {
      if (cancelled) return
      if (a.status === 'fulfilled') setApprovals(a.value)
      const rejected = [m, a, r].find(x => x.status === 'rejected') as PromiseRejectedResult | undefined
      patch(sessionId, p => ({ ...p,
        // Existing streaming updates win over an older load snapshot.
        messages: m.status === 'fulfilled' ? (inflight.current.has(sessionId) ? [...new Map([...m.value, ...p.messages].map(msg => [msg.id, msg])).values()] : m.value) : p.messages,
        runs: r.status === 'fulfilled' ? r.value : p.runs,
        loading: false, error: rejected ? errorText(rejected.reason) : null
      }))
    })
    let off: (() => void) | undefined
    try { off = ds.onApprovalsChanged(() => { ds.listApprovals().then(a => { if (!cancelled) setApprovals(a) }).catch(() => {}) }) }
    catch (e) { patch(sessionId, p => ({ ...p, error: errorText(e) })) }
    return () => { cancelled = true; off?.() }
  }, [ds, sessionId, loadVersion, patch])

  const refreshRuns = useCallback(async (id: string) => {
    const runs = await ds.listToolRuns(id)
    patch(id, p => ({ ...p, runs }))
  }, [ds, patch])
  // Observe current-session tool lifecycle until settled; cancel polling on session switch.
  const hasRunning = state.runs.some(r => r.status === 'running')
  useEffect(() => {
    if (!hasRunning) return
    let cancelled = false
    const timer = window.setInterval(() => {
      ds.listToolRuns(sessionId).then(runs => { if (!cancelled) patch(sessionId, p => ({ ...p, runs })) }).catch(() => {})
    }, 400)
    return () => { cancelled = true; clearInterval(timer) }
  }, [hasRunning, ds, sessionId, patch])

  const send = useCallback(async (text: string): Promise<boolean> => {
    const id = sessionId, t = text.trim()
    if (!t || !id || inflight.current.has(id)) return false
    inflight.current.add(id)
    const token = (generation.current[id] = (generation.current[id] ?? 0) + 1)
    const current = () => generation.current[id] === token
    patch(id, p => ({ ...p, sending: true, actionError: null }))
    try {
      // Demo tool simulation never leaks into the future live integration path.
      if (ds.kind === 'mock') { await ds.runTool(id, 'agent.plan', '规划回复中（模拟）'); await refreshRuns(id) }
      for await (const msg of ds.sendMessage(id, t)) {
        if (!current()) break
        patch(id, p => ({ ...p, messages: p.messages.some(m => m.id === msg.id) ? p.messages.map(m => m.id === msg.id ? msg : m) : [...p.messages, msg] }))
      }
      await refreshRuns(id)
      return true
    } catch (e) {
      patch(id, p => ({ ...p, actionError: errorText(e) }))
      return false
    } finally {
      if (current()) {
        inflight.current.delete(id)
        patch(id, p => ({ ...p, sending: false }))
      }
    }
  }, [ds, sessionId, patch, refreshRuns])
  /** 停止当前回合：丢弃之后到达的流式内容（真实集成时对应后端 stop） */
  const stop = useCallback(() => {
    if (!inflight.current.has(sessionId)) return
    generation.current[sessionId] = (generation.current[sessionId] ?? 0) + 1
    inflight.current.delete(sessionId)
    patch(sessionId, p => ({ ...p, sending: false }))
  }, [sessionId, patch])
  const decide = useCallback(async (id: string, ok: boolean) => {
    try { await ds.decideApproval(id, ok); const next = await ds.listApprovals(); if (mounted.current) setApprovals(next); return true }
    catch (e) { patch(sessionId, p => ({ ...p, actionError: errorText(e) })); return false }
  }, [ds, sessionId, patch])
  const retry = useCallback(async (id: string) => {
    try { await ds.retryToolRun(id); await refreshRuns(sessionId) }
    catch (e) { patch(sessionId, p => ({ ...p, actionError: errorText(e) })) }
  }, [ds, sessionId, patch, refreshRuns])
  const sessionPending = useMemo(() => pendingApprovalsForSession(approvals, sessionId), [approvals, sessionId])
  const sessionDecided = useMemo(() => decidedApprovalsForSession(approvals, sessionId), [approvals, sessionId])
  const agentState: AgentState = state.sending ? 'thinking' : hasRunning ? 'tool-running' : state.runs.some(r => r.status === 'error') ? 'error' : sessionPending.length ? 'awaiting-approval' : 'idle'
  return { ...state, approvals, sessionPending, sessionDecided, agentState, send, stop, decide, retry, reload: () => setLoadVersion(n => n + 1) }
}
