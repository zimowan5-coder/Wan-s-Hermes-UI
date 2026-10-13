# 真实 Hermes Desktop 集成路线（目标 C）

> 面向：在 Windows 上用 Claude Code 执行迁移的人。
> 基线：`NousResearch/hermes-agent`（2026-10-12 克隆）。**不改上游、不改 butler、不碰密钥。**

## 1. 上游工程组织速览

```
apps/desktop/
  electron/            # 主进程：backend-child（拉起 hermes serve）、
                       # capability bridge（preload 白名单）、窗口管理
                       # （quick-entry 独立窗、HUD、托盘、自动更新）
  src/
    app/chat/          # 聊天 UI
    app/gateway/hooks/ # useGatewayRequest —— 渲染器唯一后端入口
    store/             # nanostores（$gatewayState、$gateway …）
    components/assistant-ui/  # transcript/tool rows
    components/ui/card-stack.tsx  # 审批栈（语义严格）
apps/shared/src/
  json-rpc-gateway.ts  # HermesGateway：WS JSON-RPC 客户端
  gateway-contract.openrpc.json   # ← 官方 OpenRPC 合约（方法名有据可查）
  gateway-contract.generated.ts   # ← 合约生成的 TS 客户端
  gateway-events.ts / json-rpc-channel.ts / websocket-url.ts
```

**铁律（上游已定，不可绕过）：**
1. 渲染器 → 后端：只经 `window.hermesDesktop.getConnection()` → `HermesGateway` → WS → `hermes serve`。
2. 渲染器 → Electron 能力：只经 `preload.ts` 的 `contextBridge` 白名单（`hermes:connection` 等）。
3. 审批语义：`card-stack.tsx` + DESIGN.md/AGENTS.md 的不变量（手势不批准、离场失活、不抢焦点）。

## 2. 可直接复用的

| 模块 | 位置 | 说明 |
|---|---|---|
| OpenRPC 合约 + 生成客户端 | `apps/shared/src/gateway-contract.*` | 方法名/载荷不再靠猜；`LiveDataSource` 直接引用 |
| WS 传输层 | `json-rpc-gateway.ts`、`json-rpc-channel.ts`、`websocket-url.ts` | 复制即用 |
| `useGatewayRequest` | `src/app/gateway/hooks/` | 连接管理、断线重连、鉴权 |
| nanostores store | `src/store/` | 网关状态、会话状态 |
| 审批语义 | `card-stack.tsx` + `approval.pending/received/respond` | 交互规则照搬，不可重议 |
| slash 策展规则 | `src/lib/desktop-slash-commands.ts` | 哪些命令进联想是上游定的 |
| contrib 插件机制 | `src/contrib/`、`src/plugins/` | 看板/Agents 等插件保留加载方式 |

已在合约中**验证存在**的方法（可直接用，不算编造）：
`session.list`、`session.history`、`session.events.since`、`session.create`、
`prompt.submit`、`approval.pending`、`approval.received`、`approval.respond`、
`commands.catalog`、`cron.manage`

## 3. 必须适配或重写的

| 项 | 原因 |
|---|---|
| 原型的 `MockDataSource` | 替换为 `LiveDataSource implements HermesDataSource`，经 `HermesGateway` 调用上表方法 |
| `useChatSession` 的流式部分 | `sendMessage` 改为订阅 `session.events.since` 增量合并（对照 `assistant-ui` 的合并逻辑） |
| 主题系统 | 上游已有主题变量体系；新 design tokens 需映射而非另起炉灶（避免两套变量打架） |
| 六工作台 IA | 保留为"皮肤层"，底层路由/窗口仍走上游（quick-entry 独立窗、HUD overlay 不能并入主窗口 DOM） |
| Terminal / Artifacts | 必须跑在 Electron 内（node-pty / iframe 沙箱+GHSA 约束），原型里永远不实现 |

## 4. 原型 vs 上游关键差异

1. **原型是纯 Web，上游是 Electron**：凡 `electron/` 能力（托盘、全局热键、独立窗、node-pty）原型一律留空位。
2. **状态管理**：原型用 React useState；上游用 nanostores。`LiveDataSource` 应读写上游 store，而非自建平行状态。
3. **审批**：原型是每会话卡片；上游是**全局单栈**（CardStack）+ 严格语义。集成时必须把新 UI 的审批卡行为对齐到 CardStack 语义。
4. **i18n**：上游有 `i18n.catalog` 全量翻译；新 UI 文案最终要进上游词条，原型中文硬编码只是占位。

## 5. 如何连接真实会话与消息数据

```
LiveDataSource（新增，src/data/live/）
  ├─ listSessions()      → gateway.request('session.list')
  ├─ getMessages(sid)    → gateway.request('session.history', {session_id})
  ├─ sendMessage(sid, t) → gateway.request('prompt.submit', …) + 订阅 session.events.since 做流式
  ├─ listApprovals()     → gateway.request('approval.pending')
  ├─ decideApproval(id, ok) → gateway.request('approval.respond', {approved: ok})
  └─ onApprovalsChanged  → 订阅网关 approval 事件（approval.received）
```

切换点只有一处：`data/registry.ts` 的 `getDataSource()` 按环境变量/配置返回 `LiveDataSource`。
UI 层（views/hooks/components）**零改动**——这是目标 B 已验证的边界。

## 6. 审批、工具执行、系统能力的处理

- **审批**：只调 `approval.respond`；UI 侧复刻 CardStack 五条语义（原型已实现 4 条，缺"手势不批准"因无触屏——桌面端保留注释）。
- **工具执行**：读 `session.events.since` 的工具事件，状态机 `running→ok/error` 照 `assistant-ui` 实现。
- **系统能力**（doctor/backup/share）：走上游 `/api/actions` spawn 通道，不在新 UI 里另起执行路径。
- **Messaging 网关**：独立 detached 进程，生命周期与 `hermes serve` 解耦 —— 新 UI 只做状态展示，不管理进程启停。

## 7. 更新兼容性（不破坏上游更新）

1. 新 UI 以**独立目录/分支**存在，不直接改 `apps/desktop/src/app/*` 原文件；通过上游的插件/路由扩展点挂载。
2. 所有后端调用只用 OpenRPC 合约内的方法；合约升级时重新生成客户端，对照 diff。
3. 主题 tokens 以"映射层"接入上游变量，不 fork 上游样式文件。
4. 定期（上游发版时）重跑 `docs/FEATURE-COVERAGE.md` 的 21 项核对。

## 8. 第一条真实集成验证路径（Claude Code 在 Windows 上可执行）

> 每步都可验证；任何一步失败就停，记录证据，不强行继续。

- [ ] **Step 0**：`git clone` 上游，`hermes serve` 在本机跑起来，官方 Desktop 能连上（基线可用）。
- [ ] **Step 1**：把 `apps/shared/src/gateway-contract.generated.ts` + `json-rpc-gateway.ts` 复制到新 UI 仓库 `prototype/src/data/live/`（只读引用，注明来源与版本）。
- [ ] **Step 2**：实现 `LiveDataSource`，只实现 `listSessions()`（调 `session.list`），其余方法抛 `not implemented`。
- [ ] **Step 3**：`registry.ts` 加环境开关（`VITE_DATA=live`），`useSessionList` 在 live 模式下展示**真实会话列表** —— 这是第一条验证路径的终点：新 UI 里出现你真实的会话标题。
- [ ] **Step 4**（后续）：按 `getMessages` → `sendMessage` → `approval.*` 顺序逐个点亮，每点亮一个就跑一遍 `ACCEPTANCE.md` 相关项。
- [ ] **Step 5**：Electron 壳集成 —— 把新 UI 构建产物挂到上游 `apps/desktop` 的渲染管线，验证 preload 白名单无新增需求（新增则走上游评审）。

## 9. 风险清单（对应验收问题 4）

| 风险 | 等级 | 说明 |
|---|---|---|
| 流式事件合并逻辑 | 中 | `session.events.since` 的增量语义需对照 `assistant-ui` 源码逐条实现，猜错会丢消息 |
| 审批推送通道 | 中 | `approval.received` 的订阅方式已见方法名，未见桌面端订阅代码位置 |
| 上游主题变量冲突 | 低 | 需做一次 token 映射表 |
| 合约版本漂移 | 低 | 上游发版后重生成客户端即可 |
| Electron-only 能力 | 高 | Terminal/Artifacts/QuickEntry/HUD 只能在 Electron 壳里验证，纯 Web 环境永远无法闭环 |
