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
  { id: 's1', title: '宿舍网络审计跟进', profile: '默认', updatedAt: '18:02', pinned: true, unread: 2 },
  { id: 's2', title: '每日 AI 早报素材整理', profile: '默认', updatedAt: '09:45' },
  { id: 's3', title: '点子挖掘 · 第 12 期', profile: 'Codex 协作', updatedAt: '昨天' },
  { id: 's4', title: 'Butler 人格调优', profile: '小管', updatedAt: '昨天' },
  { id: 's5', title: 'Owala 杯子比价', profile: '默认', updatedAt: '10-10' }
]

export const mockMessages: Record<string, ChatMessage[]> = {
  s1: [
    { id: 'm1', role: 'user', text: '审计报告第一阶段跑完了，帮我看看有没有问题', time: '17:58' },
    {
      id: 'm2', role: 'assistant',
      text: '看了一遍，三个发现值得注意：\n\n1. 出口 IP 归属地与代理配置一致（Costa Mesa, CA），无 DNS 泄漏\n2. 有 2 条 IPv6 直连绕过了代理，建议在 ZeroOmega 里补一条 ::/0 规则\n3. 延迟抖动偏大（±180ms），可能是代理节点负载问题\n\n要我把第 2 条的修复步骤整理成检查清单吗？',
      time: '17:59'
    },
    {
      id: 'm3', role: 'tool', toolName: 'network.probe', toolStatus: 'ok',
      text: '已执行 12 个探测点，11 成功 / 1 超时（超时点：ipv6-test.com）', time: '17:59'
    },
    { id: 'm4', role: 'user', text: '好，整理一下，顺便把报告存档', time: '18:02' }
  ],
  s2: [
    { id: 'm1', role: 'user', text: '今天早报的 GitHub 项目部分再补两个', time: '09:40' },
    { id: 'm2', role: 'assistant', text: '收到，正在从 trending 拉取 AI 方向的新仓库……', time: '09:40' }
  ],
  s3: [
    { id: 'm1', role: 'assistant', text: '第 12 期点子挖掘完成，共 4 个候选，已去重。需要现在投递吗？', time: '昨天' }
  ],
  s4: [
    { id: 'm1', role: 'user', text: '小管的人格里加一条：提醒事项按北京时间说', time: '昨天' }
  ],
  s5: [
    { id: 'm1', role: 'assistant', text: 'Owala FreeSip 24oz：Target $29.99，亚马逊第三方 $34.95。等你有美国收货渠道再下手。', time: '10-10' }
  ]
}

export const mockApprovals: Approval[] = [
  {
    id: 'a1',
    title: '写入文件：docs/审计报告-阶段1.md',
    detail: 'agent 请求将第一阶段审计报告写入 butler/docs/，约 4 KB 纯文本，无敏感信息。',
    risk: 'low',
    status: 'pending'
  },
  {
    id: 'a2',
    title: '执行：ZeroOmega 代理规则热更新',
    detail: 'agent 请求修改本地代理客户端规则（新增 ::/0 走代理）。影响本机网络出口，请确认。',
    risk: 'high',
    status: 'pending'
  }
]

export const mockCronJobs: CronJob[] = [
  { id: 'c1', name: '每日 AI 早报', schedule: '每天 09:45', nextRun: '明天 09:45', enabled: true, lastStatus: 'ok' },
  { id: 'c2', name: '点子挖掘投递', schedule: '每天 21:45', nextRun: '今天 21:45', enabled: true, lastStatus: 'ok' },
  { id: 'c3', name: 'Claude 用量重置提醒', schedule: '2026-10-21 09:45', nextRun: '10-21 09:45', enabled: true, lastStatus: 'never' },
  { id: 'c4', name: 'IPRoyal 到期提醒', schedule: '2026-11-04 09:00', nextRun: '11-04 09:00', enabled: false, lastStatus: 'never' }
]

export const mockTasks: TaskItem[] = [
  { id: 't1', title: 'Hermes UI 原型 · 聊天工作台', column: 'doing', tag: 'Wan-s-Hermes-UI' },
  { id: 't2', title: '跑完 Claude Code 网络审计阶段 2', column: 'todo', tag: '网络' },
  { id: 't3', title: 'AI 早报第 5 期投递', column: 'done', tag: '日报' },
  { id: 't4', title: '点子挖掘去重清单同步', column: 'todo', tag: '点子' },
  { id: 't5', title: 'Butler apply.ps1 回归体检', column: 'todo', tag: 'butler' }
]

export const mockSkills: Skill[] = [
  { id: 'k1', name: 'butler-commission', desc: '派活验收：把任务书派给 Codex/Claude Code，结果写进台账', enabled: true, scope: '小管', commands: ['/派活', '/验收'] },
  { id: 'k2', name: 'butler-schoolwork', desc: '老师布置的任务：解析作业要求、拆解步骤', enabled: true, scope: '小管', commands: ['/作业'] },
  { id: 'k3', name: 'butler-shopping', desc: '购物比价：按美国居民口径给价格与购买渠道', enabled: false, scope: '小管', commands: ['/比价'] },
  { id: 'k4', name: 'github-dev', desc: '仓库读写助手：读代码、开 PR（写操作需确认）', enabled: true, scope: '默认', commands: ['/repo'] }
]

export const mockMemory: MemoryEntry[] = [
  { id: 'e1', kind: 'preference', text: '交流用中文；推荐按美国居民口径（USD、美国电商）；提醒按北京时间', updatedAt: '10-11' },
  { id: 'e2', kind: 'fact', text: '宿舍舍友抽烟，已决定用桌面空气净化器解决，不伤和气', updatedAt: '10-09' },
  { id: 'e3', kind: 'project', text: 'Wan-s-Hermes-UI：为 Hermes Desktop 做新交互，原型阶段用模拟数据', updatedAt: '今天' },
  { id: 'e4', kind: 'fact', text: 'IPRoyal 美国 ISP 代理 $5.40/月，2026-11-07 到期，自动续费已关', updatedAt: '10-08' }
]

export const mockMemoryNodes: MemoryNode[] = [
  { id: 'n1', label: '我', x: 300, y: 200, size: 26 },
  { id: 'n2', label: 'Hermes UI', x: 150, y: 110, size: 16 },
  { id: 'n3', label: '网络审计', x: 450, y: 110, size: 16 },
  { id: 'n4', label: 'AI 早报', x: 120, y: 300, size: 14 },
  { id: 'n5', label: '点子挖掘', x: 300, y: 330, size: 14 },
  { id: 'n6', label: 'Butler 小管', x: 480, y: 300, size: 14 },
  { id: 'n7', label: 'Codex', x: 220, y: 200, size: 10 },
  { id: 'n8', label: '宿舍', x: 390, y: 230, size: 10 }
]

export const mockMemoryEdges: [string, string][] = [
  ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n4'], ['n1', 'n5'], ['n1', 'n6'],
  ['n2', 'n7'], ['n3', 'n7'], ['n5', 'n7'], ['n1', 'n8']
]

export const mockChannels: Channel[] = [
  { id: 'ch1', name: 'Telegram', kind: '个人网关', status: 'connected', detail: '@bot 已连接 · 3 个会话' },
  { id: 'ch2', name: '微信', kind: '个人网关', status: 'disconnected', detail: '扫码登录后启用（scripts/weixin-login.ps1）' },
  { id: 'ch3', name: 'Webhooks', kind: '事件推送', status: 'connected', detail: '2 条规则生效中' }
]

export const mockProfiles = [
  { id: 'p1', name: '默认', desc: '日常主力 profile', active: true },
  { id: 'p2', name: '小管', desc: '私人智能管家（butler 定制层）', active: false },
  { id: 'p3', name: 'Codex 协作', desc: '点子构建专用', active: false }
]
