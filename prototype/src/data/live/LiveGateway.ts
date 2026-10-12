/**
 * LiveGateway —— 最小 JSON-RPC over WebSocket 客户端。
 *
 * 故意保持最小（connect / request / close），只为第一条验证路径
 * （Step 3：真实会话列表）服务。断线重连、心跳、事件回放等能力
 * 在上游 `JsonRpcGatewayClient`（apps/shared/src/json-rpc-gateway.ts）
 * 中已有完整实现，Electron 壳集成阶段应直接采用上游客户端，
 * 而不是在本文件上继续生长。
 *
 * ws URL 来源：`hermes serve` 启动输出，通过 `VITE_GATEWAY_URL`
 * 注入（见 .env.example）。URL 格式由部署决定，本文件不编造。
 */

interface PendingCall {
  resolve: (v: unknown) => void
  reject: (e: Error) => void
}

export class LiveGateway {
  private ws: WebSocket | null = null
  private seq = 0
  private pending = new Map<number, PendingCall>()

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  connect(url: string, timeoutMs = 8000): Promise<void> {
    if (this.connected) return Promise.resolve()
    return new Promise((resolve, reject) => {
      let settled = false
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true
          reject(new Error(`连接网关超时（${timeoutMs}ms）：${url}。请确认 hermes serve 已启动且 URL 正确。`))
          try { ws.close() } catch { /* ignore */ }
        }
      }, timeoutMs)
      const ws = new WebSocket(url)
      ws.onopen = () => {
        if (!settled) {
          settled = true
          window.clearTimeout(timer)
          this.ws = ws
          resolve()
        }
      }
      ws.onerror = () => {
        if (!settled) {
          settled = true
          window.clearTimeout(timer)
          reject(new Error(`网关连接失败：${url}。请确认 hermes serve 已启动且 URL 正确。`))
        }
      }
      ws.onmessage = ev => this.handleMessage(ev.data)
      ws.onclose = () => {
        this.ws = null
        const err = new Error('网关连接已关闭')
        this.pending.forEach(p => p.reject(err))
        this.pending.clear()
      }
    })
  }

  private handleMessage(data: unknown) {
    let msg: { id?: number; result?: unknown; error?: { message?: string; code?: number } }
    try {
      msg = JSON.parse(String(data))
    } catch {
      return
    }
    if (typeof msg.id !== 'number') return // 通知类消息暂不处理
    const call = this.pending.get(msg.id)
    if (!call) return
    this.pending.delete(msg.id)
    if (msg.error) {
      call.reject(new Error(`RPC 错误 ${msg.error.code ?? ''}：${msg.error.message ?? '未知错误'}`.trim()))
    } else {
      call.resolve(msg.result)
    }
  }

  request<T>(method: string, params?: unknown, timeoutMs = 15000): Promise<T> {
    if (!this.connected || !this.ws) {
      return Promise.reject(new Error('网关未连接，请先 connect()'))
    }
    const id = ++this.seq
    return new Promise<T>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC 请求超时（${timeoutMs}ms）：${method}`))
      }, timeoutMs)
      this.pending.set(id, {
        resolve: v => { window.clearTimeout(timer); resolve(v as T) },
        reject: e => { window.clearTimeout(timer); reject(e) }
      })
      this.ws!.send(JSON.stringify({ jsonrpc: '2.0', id, method, params: params ?? {} }))
    })
  }

  close() {
    try { this.ws?.close() } catch { /* ignore */ }
    this.ws = null
  }
}
