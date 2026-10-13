/**
 * 上游合约只读引用 —— 方法名与形状逐字照抄官方 OpenRPC 合约，
 * 不得自行编造。真实集成时以 `scripts/gen_gateway_contracts.py`
 * 重新生成为准。
 *
 * 来源：NousResearch/hermes-agent
 *   `apps/shared/src/gateway-contract.generated.ts`
 *   （2026-10-12 克隆；由 `tui_gateway/contracts` Python 单源生成）
 *
 * 本文件仅收录第一条验证路径（Step 3：真实会话列表）所需的形状；
 * 后续方法按需逐个追加，每次追加都必须能在合约中找到原文。
 */

/** `methods_session._session_row_summary` */
export interface SessionListRow {
  id: string
  resolved_id?: string | null
  title?: string
  preview?: string
  started_at?: number
  message_count?: number
  live_message_count?: number | null
  source?: string
  _lineage_root_id?: string | null
}

export interface SessionListParams {
  profile?: string | null
  title?: string | null
  limit?: number | null
  include_hidden?: boolean
}

export interface SessionListResult {
  sessions: SessionListRow[]
}

/** 合约方法表（节选）：client→server */
export interface RpcMethods {
  /** Human-facing stored sessions, most recent first. */
  'session.list': { params: SessionListParams; result: SessionListResult }
}
