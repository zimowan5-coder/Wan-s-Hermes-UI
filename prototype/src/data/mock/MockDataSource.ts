import {
  decideApprovals, setToolRunStatus, toolRunsForSession
} from '../../lib/session-state'
import {
  mockApprovals, mockMessages, mockSessions, mockToolRuns
} from '../../mock/data'
import type { HermesDataSource } from '../HermesDataSource'
import type { Approval, ChatMessage, SessionSummary, ToolRun } from '../types'

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const stamp = () => new Date().toTimeString().slice(0, 5)

/**
 * MockDataSource —— Mock 实现层。
 * 唯一允许接触 `mock/data.ts` 原始数据的地方；UI 层不得直接 import mock 数据。
 * 所有延迟/生命周期均为模拟，方法行为与 HermesDataSource 契约一致。
 */
export class MockDataSource implements HermesDataSource {
  readonly kind = 'mock' as const

  private sessions: SessionSummary[] = structuredClone(mockSessions)
  private messages: Record<string, ChatMessage[]> = structuredClone(mockMessages)
  private approvals: Approval[] = structuredClone(mockApprovals)
  private runs: ToolRun[] = structuredClone(mockToolRuns)
  private listeners = new Set<() => void>()
  private timers: ReturnType<typeof setTimeout>[] = []

  /** 测试/卸载时清理全部计时器 */
  dispose() {
    this.timers.forEach(clearTimeout)
    this.timers = []
    this.listeners.clear()
  }

  private later(ms: number, fn: () => void) {
    const t = setTimeout(() => {
      this.timers = this.timers.filter(x => x !== t)
      fn()
    }, ms)
    this.timers.push(t)
  }

  private emit() {
    this.listeners.forEach(cb => cb())
  }

  async listSessions(): Promise<SessionSummary[]> {
    await delay(60)
    return structuredClone(this.sessions)
  }

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    await delay(80)
    return structuredClone(this.messages[sessionId] ?? [])
  }

  async *sendMessage(sessionId: string, text: string): AsyncIterable<ChatMessage> {
    const key = `${sessionId}-${Date.now()}`
    const user: ChatMessage = { id: `${key}-u`, role: 'user', text, time: stamp() }
    this.messages[sessionId] = [...(this.messages[sessionId] ?? []), user]
    yield structuredClone(user) // 先回显用户消息
    // 模拟流式：延迟后产出完整回复（真实实现此处逐 chunk yield）
    await delay(600)
    const reply: ChatMessage = {
      id: `${key}-a`,
      role: 'assistant',
      text: '（模拟回复）收到：「' + text.slice(0, 24) + (text.length > 24 ? '…' : '') + '」。真实集成后这里走 requestGateway("prompt.submit") 流式返回。',
      time: stamp()
    }
    this.messages[sessionId] = [...this.messages[sessionId], reply]
    yield structuredClone(reply)
  }

  async runTool(sessionId: string, name: string, detail: string): Promise<ToolRun> {
    const run: ToolRun = { id: `${sessionId}-run-${Date.now()}`, sessionId, name, status: 'running', duration: '', detail }
    this.runs = [...this.runs, run]
    this.later(700, () => {
      this.runs = setToolRunStatus(this.runs, run.id, 'ok', detail + '（模拟完成）').map(r =>
        r.id === run.id ? { ...r, duration: '0.7s' } : r)
    })
    return structuredClone(run)
  }

  async listApprovals(): Promise<Approval[]> {
    await delay(40)
    return structuredClone(this.approvals)
  }

  async decideApproval(id: string, approved: boolean): Promise<void> {
    await delay(120)
    this.approvals = decideApprovals(this.approvals, id, approved)
    this.emit()
  }

  async listToolRuns(sessionId: string): Promise<ToolRun[]> {
    await delay(40)
    return structuredClone(toolRunsForSession(this.runs, sessionId))
  }

  async retryToolRun(id: string): Promise<void> {
    this.runs = setToolRunStatus(this.runs, id, 'running', '重试中（模拟）…')
    this.later(1200, () => {
      this.runs = setToolRunStatus(this.runs, id, 'ok', '重试成功（模拟）').map(r =>
        r.id === id ? { ...r, duration: '1.2s' } : r)
    })
  }

  onApprovalsChanged(cb: () => void): () => void {
    this.listeners.add(cb)
    return () => { this.listeners.delete(cb) }
  }
}
