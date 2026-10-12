import { describe, expect, it } from 'vitest'
import {
  decideApprovals, decidedApprovalsForSession, pendingApprovalCount,
  pendingApprovalsForSession, setToolRunStatus, toolRunsForSession
} from './session-state'
import type { Approval, ToolRun } from '../mock/data'

const approvals: Approval[] = [
  { id: 'a1', sessionId: 's1', title: 't1', detail: 'd1', risk: 'low', status: 'pending' },
  { id: 'a2', sessionId: 's1', title: 't2', detail: 'd2', risk: 'high', status: 'pending' },
  { id: 'a3', sessionId: 's2', title: 't3', detail: 'd3', risk: 'medium', status: 'pending' }
]

const runs: ToolRun[] = [
  { id: 'r1', sessionId: 's1', name: 'n1', status: 'ok', duration: '1s', detail: 'd' },
  { id: 'r2', sessionId: 's1', name: 'n2', status: 'error', duration: '2s', detail: 'd' },
  { id: 'r3', sessionId: 's2', name: 'n3', status: 'ok', duration: '1s', detail: 'd' }
]

describe('decideApprovals', () => {
  it('只改变目标审批，不污染其他条目与原数组', () => {
    const next = decideApprovals(approvals, 'a1', true)
    expect(next.find(a => a.id === 'a1')!.status).toBe('approved')
    expect(next.find(a => a.id === 'a2')!.status).toBe('pending')
    expect(approvals.find(a => a.id === 'a1')!.status).toBe('pending') // 原数组不变
  })

  it('拒绝路径', () => {
    const next = decideApprovals(approvals, 'a2', false)
    expect(next.find(a => a.id === 'a2')!.status).toBe('denied')
  })
})

describe('会话隔离', () => {
  it('pendingApprovalsForSession 只返回本会话待审批', () => {
    expect(pendingApprovalsForSession(approvals, 's1').map(a => a.id)).toEqual(['a1', 'a2'])
    expect(pendingApprovalsForSession(approvals, 's2').map(a => a.id)).toEqual(['a3'])
    expect(pendingApprovalsForSession(approvals, 's9')).toEqual([])
  })

  it('decidedApprovalsForSession 只返回本会话已处理', () => {
    const next = decideApprovals(approvals, 'a1', true)
    expect(decidedApprovalsForSession(next, 's1').map(a => a.id)).toEqual(['a1'])
    expect(decidedApprovalsForSession(next, 's2')).toEqual([])
  })

  it('pendingApprovalCount 统计全局（顶栏用）', () => {
    expect(pendingApprovalCount(approvals)).toBe(3)
    expect(pendingApprovalCount(decideApprovals(approvals, 'a1', true))).toBe(2)
  })

  it('toolRunsForSession 按会话过滤', () => {
    expect(toolRunsForSession(runs, 's1').map(r => r.id)).toEqual(['r1', 'r2'])
    expect(toolRunsForSession(runs, 's2').map(r => r.id)).toEqual(['r3'])
  })

  it('setToolRunStatus 只改目标记录', () => {
    const next = setToolRunStatus(runs, 'r2', 'ok', '重试成功（模拟）')
    const r2 = next.find(r => r.id === 'r2')!
    expect(r2.status).toBe('ok')
    expect(r2.detail).toBe('重试成功（模拟）')
    expect(next.find(r => r.id === 'r1')!.status).toBe('ok')
    expect(runs.find(r => r.id === 'r2')!.status).toBe('error') // 原数组不变
  })
})
