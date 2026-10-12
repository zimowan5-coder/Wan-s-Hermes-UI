import type { Approval, ChatMessage, SessionSummary, ToolRun } from './types'

/**
 * HermesDataSource —— 数据访问/适配层契约。
 *
 * UI 组件只依赖这个接口，不依赖 Mock 数据、不依赖 RPC 细节。
 * 真实集成时新增 LiveDataSource 实现本接口（经 requestGateway / Electron 能力桥），
 * UI 层零改动。凡官方方法名尚未在源码中验证的，实现时以 FEATURE-COVERAGE.md
 * 「待验证接口清单」为准，不得编造。
 */
export interface HermesDataSource {
  /** 实现种类：'mock' 原型演示 / 'live' 真实后端 */
  readonly kind: 'mock' | 'live'

  /** 会话列表 */
  listSessions(): Promise<SessionSummary[]>

  /** 某会话的消息流（历史） */
  getMessages(sessionId: string): Promise<ChatMessage[]>

  /**
   * 发送消息，返回异步迭代器以支持流式增量。
   * Mock 实现：延迟后产出固定回复；Live 实现：经 prompt.submit WS 流式。
   */
  sendMessage(sessionId: string, text: string): AsyncIterable<ChatMessage>

  /** 模拟一次工具执行（running → ok），返回 ToolRun 记录 */
  runTool(sessionId: string, name: string, detail: string): Promise<ToolRun>

  /** 全部审批（顶栏徽标用全局计数，聊天内按 sessionId 过滤） */
  listApprovals(): Promise<Approval[]>

  /** 审批决定 */
  decideApproval(id: string, approved: boolean): Promise<void>

  /** 某会话的工具执行记录 */
  listToolRuns(sessionId: string): Promise<ToolRun[]>

  /** 重试失败的工具执行 */
  retryToolRun(id: string): Promise<void>

  /** 订阅审批变化（新审批到达/状态变更），返回取消函数 */
  onApprovalsChanged(cb: () => void): () => void
}
