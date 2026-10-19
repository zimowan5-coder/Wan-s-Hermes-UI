import type { SessionSummary } from '../data/types'

/**
 * 会话的本地界面状态（置顶、改名、归档、未读、删除）。
 * 演示版只保存在本次页面；真实集成时这些操作会写回 Hermes 后端。
 */
export interface SessionMeta {
  pinned?: boolean
  title?: string
  archived?: boolean
  unread?: boolean
  deleted?: boolean
}

export type SessionAction =
  | 'pin' | 'rename' | 'toggle-unread' | 'branch' | 'export' | 'copy-id' | 'archive' | 'unarchive' | 'delete'

export interface MergedSession extends SessionSummary {
  pinned: boolean
  archived: boolean
  unreadCount: number
}

export function mergeSessions(list: SessionSummary[], meta: Record<string, SessionMeta>): MergedSession[] {
  return list
    .filter(s => !meta[s.id]?.deleted)
    .map(s => {
      const m = meta[s.id] ?? {}
      const unreadCount = m.unread === undefined ? (s.unread ?? 0) : m.unread ? Math.max(1, s.unread ?? 1) : 0
      return { ...s, title: m.title || s.title, pinned: m.pinned ?? !!s.pinned, archived: !!m.archived, unreadCount }
    })
}
