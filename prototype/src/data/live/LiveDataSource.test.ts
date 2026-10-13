import { describe, expect, it } from 'vitest'
import { resolveDataSourceKind } from '../registry'
import { LiveDataSource } from './LiveDataSource'
import type { LiveGateway } from './LiveGateway'

function stubGateway(result: unknown): LiveGateway {
  return {
    connected: true,
    connect: async () => {},
    request: async (method: string) => {
      if (method === 'session.list') return result
      throw new Error('unexpected method ' + method)
    },
    close: () => {}
  } as unknown as LiveGateway
}

describe('resolveDataSourceKind', () => {
  it('默认 mock', () => {
    expect(resolveDataSourceKind({})).toBe('mock')
    expect(resolveDataSourceKind({ VITE_DATA: 'mock' })).toBe('mock')
  })
  it('VITE_DATA=live 切 live', () => {
    expect(resolveDataSourceKind({ VITE_DATA: 'live' })).toBe('live')
  })
})

describe('LiveDataSource（第一条验证路径）', () => {
  it('无 URL 时构造即抛错（指引配 .env.local）', () => {
    expect(() => new LiveDataSource('')).toThrow('VITE_GATEWAY_URL')
  })

  it('listSessions 调 session.list 并映射字段', async () => {
    const ds = new LiveDataSource(
      'ws://127.0.0.1:1/',
      stubGateway({ sessions: [{ id: 'abc', title: '真实会话', started_at: 1729000000 }] })
    )
    const sessions = await ds.listSessions()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].id).toBe('abc')
    expect(sessions[0].title).toBe('真实会话')
    expect(sessions[0].updatedAt).not.toBe('')
  })

  it('无标题时用 preview/未命名会话兜底', async () => {
    const ds = new LiveDataSource(
      'ws://127.0.0.1:1/',
      stubGateway({ sessions: [{ id: 'x1' }, { id: 'x2', preview: 'hello world' }] })
    )
    const sessions = await ds.listSessions()
    expect(sessions[0].title).toBe('未命名会话')
    expect(sessions[1].title).toBe('hello world')
  })

  it('未实现的方法一律抛 not implemented（不编造）', async () => {
    const ds = new LiveDataSource('ws://127.0.0.1:1/', stubGateway({ sessions: [] }))
    await expect(ds.getMessages('s1')).rejects.toThrow('not implemented')
    await expect(ds.listApprovals()).rejects.toThrow('not implemented')
    await expect(ds.decideApproval('a1', true)).rejects.toThrow('not implemented')
    await expect(ds.listToolRuns('s1')).rejects.toThrow('not implemented')
    await expect(ds.retryToolRun('r1')).rejects.toThrow('not implemented')
    await expect(ds.runTool('s1', 'x', 'y')).rejects.toThrow('not implemented')
    expect(() => ds.sendMessage('s1', 'hi')).toThrow('not implemented')
    expect(() => ds.onApprovalsChanged(() => {})).toThrow('not implemented')
  })
})
