import type { HermesDataSource } from '../HermesDataSource'
import type { Approval, ChatMessage, SessionSummary, ToolRun } from '../types'
import type { RpcMethods, SessionListRow } from './contract'
import { LiveGateway } from './LiveGateway'

const notImplemented = (method: string): Promise<never> =>
  Promise.reject(new Error(
    `not implemented (live): ${method}。真实方法名需在 OpenRPC 合约中验证后逐个实现，` +
    `见 docs/FEATURE-COVERAGE.md「待验证接口清单」。`
  ))

/** started_at 单位不确定（秒/毫秒），做兼容处理；失败则返回空字符串 */
function formatStartedAt(ts?: number): string {
  if (!ts) return ''
  const ms = ts > 1e12 ? ts : ts * 1000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function toSessionSummary(row: SessionListRow): SessionSummary {
  return {
    id: row.resolved_id ?? row.id,
    title: row.title?.trim() || row.preview?.slice(0, 24) || '未命名会话',
    profile: '默认',
    updatedAt: formatStartedAt(row.started_at)
  }
}

/**
 * LiveDataSource —— 真实后端实现（第一条验证路径）。
 *
 * 当前仅 `listSessions()` 真实可用（调合约已验证的 `session.list`），
 * 其余方法一律抛 not implemented，逼迫后续按合约逐个验证、逐个点亮，
 * 而不是一次编造一堆方法。这是 INTEGRATION-PLAN §8 Step 2 的硬性要求。
 */
export class LiveDataSource implements HermesDataSource {
  readonly kind = 'live' as const

  private gateway: LiveGateway
  private ready: Promise<void> | null = null

  constructor(gatewayUrl: string, gateway?: LiveGateway) {
    if (!gatewayUrl) {
      throw new Error('缺少 VITE_GATEWAY_URL：请把 `hermes serve` 输出的 ws URL 写入 prototype/.env.local（见 .env.example）。')
    }
    this.gateway = gateway ?? new LiveGateway()
    this.ready = this.gateway.connect(gatewayUrl)
  }

  /** 等待连接就绪（UI 层可用它驱动加载态） */
  whenReady(): Promise<void> {
    return this.ready ?? Promise.reject(new Error('网关未初始化'))
  }

  private async call<M extends keyof RpcMethods>(
    method: M, params: RpcMethods[M]['params']
  ): Promise<RpcMethods[M]['result']> {
    await this.whenReady()
    return this.gateway.request<RpcMethods[M]['result']>(method, params)
  }

  async listSessions(): Promise<SessionSummary[]> {
    const res = await this.call('session.list', { limit: 50 })
    return res.sessions.map(toSessionSummary)
  }

  getMessages(_sessionId: string): Promise<ChatMessage[]> {
    return notImplemented('session.history')
  }

  sendMessage(_sessionId: string, _text: string): AsyncIterable<ChatMessage> {
    throw new Error('not implemented (live): prompt.submit + session.events.since 流式。见 docs/FEATURE-COVERAGE.md「待验证接口清单」。')
  }

  runTool(_sessionId: string, _name: string, _detail: string): Promise<ToolRun> {
    return notImplemented('工具事件流')
  }

  listApprovals(): Promise<Approval[]> {
    return notImplemented('approval.pending')
  }

  decideApproval(_id: string, _approved: boolean): Promise<void> {
    return notImplemented('approval.respond')
  }

  listToolRuns(_sessionId: string): Promise<ToolRun[]> {
    return notImplemented('工具事件流')
  }

  retryToolRun(_id: string): Promise<void> {
    return notImplemented('工具事件流')
  }

  onApprovalsChanged(_cb: () => void): () => void {
    throw new Error('not implemented (live): approval.received 订阅。见 docs/FEATURE-COVERAGE.md「待验证接口清单」。')
  }
}
