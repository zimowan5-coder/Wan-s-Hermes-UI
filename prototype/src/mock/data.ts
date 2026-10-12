/**
 * MOCK 数据层 —— 本文件所有内容均为原型演示用的假数据，
 * 不代表任何真实 Hermes 后端能力。真实集成时整个目录应被
 * `requestGateway(...)` JSON-RPC 客户端替换。
 */

export const MOCK = true

export interface ChatSession {
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
  toolStatus?: 'running' | 'ok' | 'error'
}

export interface Approval {
  id: string
  sessionId: string // 审批归属会话，避免全局状态污染其他会话
  title: string
  detail: string
  risk: 'low' | 'medium' | 'high'
  status: 'pending' | 'approved' | 'denied'
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

export const mockSessions: ChatSession[] = [
  { id: 's1', title: '产品体验审查', profile: '默认', updatedAt: '18:02', pinned: true, unread: 2 },
  { id: 's2', title: '每周产品简报', profile: '默认', updatedAt: '09:45' },
  { id: 's3', title: '设计灵感收集', profile: '团队协作', updatedAt: '昨天' },
  { id: 's4', title: '助手回复风格调整', profile: '演示助手', updatedAt: '昨天' },
  { id: 's5', title: '办公设备选型', profile: '默认', updatedAt: '10-10' },
  { id: 's6', title: '新会话', profile: '默认', updatedAt: '刚刚' }
]

export const mockMessages: Record<string, ChatMessage[]> = {
  s1: [
    { id: 'm1', role: 'user', text: '新版应用的可用性检查做完了，帮我总结结果', time: '17:58' },
    {
      id: 'm2', role: 'assistant',
      text: '整理了三个体验观察：\n\n1. 导航层级清晰，核心功能易于发现\n2. 有 2 个交互缺少加载状态\n3. 窄屏下侧栏仍可继续优化\n\n要我把第 2 条整理成改进清单吗？',
      time: '17:59'
    },
    {
      id: 'm3', role: 'tool', toolName: 'ui.audit', toolStatus: 'ok',
      text: '已检查 12 个界面状态，11 个正常 / 1 个待优化', time: '17:59'
    },
    { id: 'm4', role: 'user', text: '好，整理一下，顺便保存测试报告', time: '18:02' }
  ],
  s2: [
    { id: 'm1', role: 'user', text: '给本周的产品简报再补两个设计案例', time: '09:40' },
    { id: 'm2', role: 'assistant', text: '收到，正在整理公开的 UI 模式与参考资料……', time: '09:40' }
  ],
  s3: [
    { id: 'm1', role: 'assistant', text: '设计灵感已整理，共 4 个方向。要生成评审清单吗？', time: '昨天' }
  ],
  s4: [
    { id: 'm1', role: 'user', text: '演示助手的人格里加一条：提醒事项按北京时间说', time: '昨天' }
  ],
  s5: [
    { id: 'm1', role: 'assistant', text: '演示显示器 A 和 B 的尺寸与价格已录入比较表。', time: '10-10' }
  ]
}

export const mockApprovals: Approval[] = [
  {
    id: 'a1',
    sessionId: 's1',
    title: '写入文件：docs/demo-usability-report.md',
    detail: '演示任务请求将可用性报告写入 docs/，约 4 KB 纯文本。',
    risk: 'low',
    status: 'pending'
  },
  {
    id: 'a2',
    sessionId: 's1',
    title: '执行：演示环境设置修改',
    detail: '演示任务请求修改应用环境设置。模拟高风险操作，请明确确认。',
    risk: 'high',
    status: 'pending'
  }
]

export const mockCronJobs: CronJob[] = [
  { id: 'c1', name: '每周产品简报', schedule: '每天 09:45', nextRun: '明天 09:45', enabled: true, lastStatus: 'ok' },
  { id: 'c2', name: '设计灵感汇总', schedule: '每天 21:45', nextRun: '今天 21:45', enabled: true, lastStatus: 'ok' },
  { id: 'c3', name: '设计评审提醒', schedule: '2026-10-21 09:45', nextRun: '10-21 09:45', enabled: true, lastStatus: 'never' },
  { id: 'c4', name: '演示订阅到期提醒', schedule: '2026-11-04 09:00', nextRun: '11-04 09:00', enabled: false, lastStatus: 'never' }
]

export const mockTasks: TaskItem[] = [
  { id: 't1', title: 'Hermes UI 原型 · 聊天工作台', column: 'doing', tag: 'Wan-s-Hermes-UI' },
  { id: 't2', title: '完善设计系统对比度检查', column: 'todo', tag: '网络' },
  { id: 't3', title: '产品简报第 5 期归档', column: 'done', tag: '日报' },
  { id: 't4', title: '设计参考资料整理', column: 'todo', tag: '点子' },
  { id: 't5', title: 'Demo Assistant apply.ps1 回归体检', column: 'todo', tag: 'butler' }
]

export const mockSkills: Skill[] = [
  { id: 'k1', name: 'demo-workflow', desc: '模拟任务委派与验收的演示技能', enabled: true, scope: '演示助手', commands: ['/派活', '/验收'] },
  { id: 'k2', name: 'demo-planner', desc: '模拟规划任务：解析需求并拆分步骤', enabled: true, scope: '演示助手', commands: ['/作业'] },
  { id: 'k3', name: 'demo-research', desc: '模拟研究任务：比较公开资料与方案', enabled: false, scope: '演示助手', commands: ['/比价'] },
  { id: 'k4', name: 'demo-repository', desc: '模拟仓库助手：仅展示操作流程', enabled: true, scope: '默认', commands: ['/repo'] }
]

export const mockMemory: MemoryEntry[] = [
  { id: 'e1', kind: 'preference', text: '演示偏好：简洁回复；使用系统主题；日期按本地格式显示', updatedAt: '10-11' },
  { id: 'e2', kind: 'fact', text: '演示备注：用户偏好紧凑的会话侧栏', updatedAt: '10-09' },
  { id: 'e3', kind: 'project', text: 'Wan-s-Hermes-UI：为 Hermes Desktop 做新交互，原型阶段用模拟数据', updatedAt: '今天' },
  { id: 'e4', kind: 'fact', text: '演示订阅：样例服务将于下月到期', updatedAt: '10-08' }
]

export const mockMemoryNodes: MemoryNode[] = [
  { id: 'n1', label: '我', x: 300, y: 200, size: 26 },
  { id: 'n2', label: 'Hermes UI', x: 150, y: 110, size: 16 },
  { id: 'n3', label: '可用性审查', x: 450, y: 110, size: 16 },
  { id: 'n4', label: '产品简报', x: 120, y: 300, size: 14 },
  { id: 'n5', label: '设计灵感', x: 300, y: 330, size: 14 },
  { id: 'n6', label: 'Demo Assistant 演示助手', x: 480, y: 300, size: 14 },
  { id: 'n7', label: 'Codex', x: 220, y: 200, size: 10 },
  { id: 'n8', label: '演示项目', x: 390, y: 230, size: 10 }
]

export const mockMemoryEdges: [string, string][] = [
  ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n4'], ['n1', 'n5'], ['n1', 'n6'],
  ['n2', 'n7'], ['n3', 'n7'], ['n5', 'n7'], ['n1', 'n8']
]

export interface ToolRun {
  id: string
  sessionId: string // 工具执行归属会话
  name: string
  status: 'ok' | 'running' | 'error'
  duration: string
  detail: string
}

export const mockToolRuns: ToolRun[] = [
  { id: 'r1', sessionId: 's1', name: 'ui.audit', status: 'ok', duration: '1.2s', detail: '12 个界面状态，11 个完成 / 1 个待优化' },
  { id: 'r2', sessionId: 's1', name: 'file.write docs/demo-usability-report.md', status: 'ok', duration: '0.3s', detail: '4 KB，审批事件仅供演示' },
  { id: 'r3', sessionId: 's1', name: 'browser.fetch example.org', status: 'error', duration: '8.0s', detail: '连接超时（模拟的失败样例，可重试）' }
]

export const mockChannels: Channel[] = [
  { id: 'ch1', name: '示例聊天通道', kind: '个人网关', status: 'connected', detail: '演示连接 · 3 个会话' },
  { id: 'ch2', name: '示例消息通道', kind: '个人网关', status: 'disconnected', detail: '模拟扫码连接后启用' },
  { id: 'ch3', name: 'Webhooks', kind: '事件推送', status: 'connected', detail: '2 条模拟规则' }
]

export const mockProfiles = [
  { id: 'p1', name: '默认', desc: '日常主力 profile', active: true },
  { id: 'p2', name: '演示助手', desc: '演示用独立助手配置', active: false },
  { id: 'p3', name: '团队协作', desc: '示例协作配置', active: false }
]
