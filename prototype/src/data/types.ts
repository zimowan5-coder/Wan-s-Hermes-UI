/**
 * 领域类型 —— UI 层与数据层之间的契约。
 * 真实集成时保持不变，只有 DataSource 的实现从 Mock 换成 Live。
 */

export type ApprovalStatus = 'pending' | 'approved' | 'denied'
export type ToolStatus = 'ok' | 'running' | 'error'
export type RiskLevel = 'low' | 'medium' | 'high'

export interface SessionSummary {
  id: string
  title: string
  profile: string
  updatedAt: string
  pinned?: boolean
  unread?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool' | 'system'
  text: string
  time: string
  toolName?: string
  toolStatus?: ToolStatus
}

export interface Approval {
  id: string
  sessionId: string
  title: string
  detail: string
  risk: RiskLevel
  status: ApprovalStatus
}

export interface ToolRun {
  id: string
  sessionId: string
  name: string
  status: ToolStatus
  duration: string
  detail: string
}

/** Agent 状态机（会话级，由 hook 派生，见 hooks/useChatSession） */
export type AgentState = 'idle' | 'thinking' | 'tool-running' | 'awaiting-approval' | 'error'

/** 以下类型暂只被非 Chat 工作台使用，保留在此以便后续逐页迁移到数据层 */
export interface ChatSession {
  id: string
  title: string
  profile: string
  updatedAt: string
  pinned?: boolean
  unread?: number
}

export interface CronJob {
  id: string
  name: string
  schedule: string
  nextRun: string
  enabled: boolean
  lastStatus: 'ok' | 'error' | 'never'
}

export interface TaskItem {
  id: string
  title: string
  column: 'todo' | 'doing' | 'done'
  tag?: string
}

export interface Skill {
  id: string
  name: string
  desc: string
  enabled: boolean
  scope: string
  commands: string[]
}

export interface MemoryEntry {
  id: string
  kind: 'fact' | 'preference' | 'project'
  text: string
  updatedAt: string
}

export interface MemoryNode {
  id: string
  label: string
  x: number
  y: number
  size: number
}

export interface Channel {
  id: string
  name: string
  kind: string
  status: 'connected' | 'disconnected'
  detail: string
}
