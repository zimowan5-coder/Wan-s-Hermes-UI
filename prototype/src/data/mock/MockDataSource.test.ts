import { describe, expect, it } from 'vitest'
import { getDataSource, resetDataSource } from '../registry'
import { MockDataSource } from './MockDataSource'

describe('MockDataSource（数据适配层 Mock 实现）', () => {
  it('registry 返回 Mock 单例', () => {
    const ds = getDataSource()
    expect(ds).toBeInstanceOf(MockDataSource)
    expect(ds.kind).toBe('mock')
    expect(getDataSource()).toBe(ds)
    resetDataSource()
  })

  it('listSessions 返回 6 个会话（含 s1 置顶未读 2）', async () => {
    const ds = new MockDataSource()
    const sessions = await ds.listSessions()
    expect(sessions).toHaveLength(6)
    expect(sessions[0]).toMatchObject({ id: 's1', pinned: true, unread: 2 })
    ds.dispose()
  })

  it('sendMessage 先回显用户消息再返回模拟回复', async () => {
    const ds = new MockDataSource()
    const seen: string[] = []
    for await (const m of ds.sendMessage('s1', 'hello')) seen.push(`${m.role}:${m.text.slice(0, 2)}`)
    expect(seen[0].startsWith('user:')).toBe(true)
    expect(seen[1].startsWith('assistant:')).toBe(true)
    // 数据已落盘：getMessages 能取回
    const history = await ds.getMessages('s1')
    expect(history.at(-1)?.role).toBe('assistant')
    ds.dispose()
  })

  it('runTool → running，约 700ms 后转为 ok（会话隔离）', async () => {
    const ds = new MockDataSource()
    const run = await ds.runTool('s2', 'demo.tool', '测试')
    expect(run.status).toBe('running')
    expect(run.sessionId).toBe('s2')
    await new Promise(r => setTimeout(r, 900))
    const runs = await ds.listToolRuns('s2')
    expect(runs.find(x => x.id === run.id)?.status).toBe('ok')
    // s1 不受影响
    const s1 = await ds.listToolRuns('s1')
    expect(s1.every(x => x.sessionId === 's1')).toBe(true)
    ds.dispose()
  })

  it('retryToolRun：error → running → ok', async () => {
    const ds = new MockDataSource()
    const before = await ds.listToolRuns('s1')
    const failed = before.find(r => r.status === 'error')
    expect(failed).toBeTruthy()
    await ds.retryToolRun(failed!.id)
    const mid = await ds.listToolRuns('s1')
    expect(mid.find(r => r.id === failed!.id)?.status).toBe('running')
    await new Promise(r => setTimeout(r, 1400))
    const after = await ds.listToolRuns('s1')
    expect(after.find(r => r.id === failed!.id)?.status).toBe('ok')
    ds.dispose()
  })

  it('decideApproval 翻转状态并触发订阅回调', async () => {
    const ds = new MockDataSource()
    let fired = 0
    const off = ds.onApprovalsChanged(() => { fired++ })
    const before = await ds.listApprovals()
    const pending = before.find(a => a.status === 'pending')
    expect(pending).toBeTruthy()
    await ds.decideApproval(pending!.id, true)
    expect(fired).toBe(1)
    const after = await ds.listApprovals()
    expect(after.find(a => a.id === pending!.id)?.status).toBe('approved')
    off()
    ds.dispose()
  })
})
