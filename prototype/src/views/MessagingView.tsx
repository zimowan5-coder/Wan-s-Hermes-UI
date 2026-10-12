import { Loader2, QrCode, Radio } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { mockChannels } from '../mock/data'
import { MockBadge } from '../components/MockBadge'

export function MessagingView() {
  const [scanning, setScanning] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  // 扫码连接：明确的模拟反馈 —— 2.5s 后恢复，而不是无响应
  const mockScan = () => {
    if (scanning) return
    setScanning(true)
    timer.current = window.setTimeout(() => setScanning(false), 2500)
  }

  return (
    <div className="flex-1 overflow-y-auto p-5">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-[16px] font-bold">消息</h2>
        <MockBadge />
      </div>
      <p className="text-[12.5px] mb-4" style={{ color: 'var(--fg-secondary)' }}>
        对应原生 Messaging / Webhooks 页：个人网关通道状态与事件推送规则。
      </p>
      <div className="flex flex-col gap-2 max-w-[720px]">
        {mockChannels.map(c => (
          <div key={c.id} className="flat-panel px-4 py-3.5 flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: c.status === 'connected' ? 'var(--success-soft)' : 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)' }}
            >
              <Radio size={16} style={{ color: c.status === 'connected' ? 'var(--success)' : 'var(--fg-tertiary)' }} aria-hidden />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[13.5px] font-semibold">{c.name}</span>
                <span className="chip">{c.kind}</span>
              </div>
              <div className="text-[11.5px] mt-0.5" style={{ color: 'var(--fg-tertiary)' }}>{c.detail}</div>
            </div>
            <span className="chip" style={c.status === 'connected' ? { color: 'var(--success)', borderColor: 'var(--success)' } : {}}>
              {c.status === 'connected' ? '已连接' : '未连接'}
            </span>
            {c.status === 'disconnected' && (
              <button className="btn" style={{ padding: '5px 10px', fontSize: 12 }} onClick={mockScan} disabled={scanning} aria-live="polite">
                {scanning ? <><Loader2 size={13} className="animate-spin" aria-hidden />等待扫码…（模拟）</> : <><QrCode size={13} aria-hidden />扫码连接</>}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
