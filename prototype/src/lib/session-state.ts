import type { Approval, ToolRun } from '../mock/data'

/**
 * 会话级状态纯函数 —— 审批 / 工具执行 / 错误一律按 sessionId 隔离，
 * 避免全局状态污染其他会话。UI 组件只调用这些函数，不手写过滤逻辑。
 */

/** 对某条审批做决定，返回新列表（不改变原数组） */
export function decideApprovals(list: Approval[], id: string, ok: boolean): Approval[] {
  return list.map(a => (a.id === id ? { ...a, status: ok ? 'approved' : 'denied' } : a))
}

/** 某会话的待审批（保持原顺序） */
export function pendingApprovalsForSession(list: Approval[], sessionId: string): Approval[] {
  return list.filter(a => a.sessionId === sessionId && a.status === 'pending')
}

/** 某会话已处理的审批 */
export function decidedApprovalsForSession(list: Approval[], sessionId: string): Approval[] {
  return list.filter(a => a.sessionId === sessionId && a.status !== 'pending')
}

/** 全局待审批总数（顶栏徽标用） */
export function pendingApprovalCount(list: Approval[]): number {
  return list.filter(a => a.status === 'pending').length
}

/** 某会话的工具执行记录 */
export function toolRunsForSession(runs: ToolRun[], sessionId: string): ToolRun[] {
  return runs.filter(r => r.sessionId === sessionId)
}

/** 标记某条工具执行记录的状态，返回新列表 */
export function setToolRunStatus(runs: ToolRun[], id: string, status: ToolRun['status'], detail?: string): ToolRun[] {
  return runs.map(r => (r.id === id ? { ...r, status, detail: detail ?? r.detail } : r))
}
