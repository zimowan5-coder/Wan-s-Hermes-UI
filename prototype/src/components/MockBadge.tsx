export function MockBadge({ label = 'MOCK 数据' }: { label?: string }) {
  return (
    <span className="mock-badge" title="原型演示用模拟数据，非真实 Hermes 后端能力">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}
