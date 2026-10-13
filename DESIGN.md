# Hermes Desktop 新版工作台 · 设计说明

> 第一阶段：研究与 UI 原型。分支 `feature/ui-prototype`。
> 研究基线：`NousResearch/hermes-agent`（2026-10-12 克隆，`apps/desktop`）。
> **本原型不连接任何真实后端，所有数据均为 `prototype/src/mock/` 中的模拟数据。**

## 1. 官方源码研究结论

### 1.1 技术架构（保留）

| 层 | 技术 | 说明 |
|---|---|---|
| 主进程 | Electron | 进程生命周期、原生文件系统/git/窗口、安装更新；经类型化能力桥暴露给渲染器 |
| 渲染器 | React 19 + nanostores + react-router + Tailwind v4 | 只拥有"本窗口的呈现"，不直连 Node/Electron |
| 后端 | `hermes serve`（tui_gateway） | 会话、工具、模型调用；经 JSON-RPC/WebSocket（`requestGateway`）通信 |
| 传输 | `apps/shared`（`@hermes/shared`） | `JsonRpcGatewayClient`，桌面与网页仪表盘共用 |

关键架构不变量（来自 `apps/desktop/AGENTS.md`，新版 UI 必须遵守）：
- renderer 绝不直接 require Node/Electron；原生能力走 deliberate capability
- 后端是唯一真源，renderer 的拷贝只是缓存；乐观更新、失败可见回滚
- 状态按"谁有权正确"归属：后端 / Electron / renderer 各管各的
- 访客内容（artifact iframe、preview webview）永不自行打开外部链接（GHSA-9f4c-93c8-jc8g）

### 1.2 原生功能清单（含源码依据）

| # | 功能 | 原生位置 | 源码依据 |
|---|---|---|---|
| 1 | 聊天（composer、transcript、slash） | Chat | `src/app/chat/`（composer/、hooks/use-slash-completions.ts） |
| 2 | 会话管理（列表、置顶、导入） | Chat 侧栏 / Command Center / Session Import | `src/app/chat/sidebar/`、`src/app/command-center/`（sessions）、`src/app/session-import` |
| 3 | 工具执行（tool rows、terminal） | Transcript 内 / 右栏 Terminal | `src/components/assistant-ui/`、`src/app/right-sidebar/terminal/` |
| 4 | 审批（内联审批卡） | Transcript 内联 | `src/components/ui/card-stack.tsx` + `DESIGN.md` "Queued cards" |
| 5 | 定时任务 | Cron 页 | `src/app/cron` |
| 6 | 任务看板 | kanban 插件 | `src/plugins/kanban/` |
| 7 | Skills | Capabilities → Skills tab | `src/app/capabilities/skills/skills-tab.tsx`；slash 命令来自后端 `commands.catalog` |
| 8 | 连接器/工具集/插件 | Capabilities | `src/app/capabilities/connectors/`、`toolsets/`、`plugins/` |
| 9 | 记忆图谱 | Starmap 页 | `src/app/starmap/`（d3-force）；记忆本体在后端 `hermes_state_*.py` |
| 10 | 消息网关 | Messaging 页 | `src/app/messaging/`（Telegram/微信） |
| 11 | Webhooks | Webhooks 页 | `src/app/webhooks` |
| 12 | Artifacts | Artifacts 页 | `src/app/artifacts/` |
| 13 | Agents（含 Bot Mode） | Agents 页 | `src/app/agents/`、`src/plugins/hermes-bots/` |
| 14 | Profiles（多身份/多连接） | Profiles 页 | `src/app/profiles/` |
| 15 | 设置 | Settings | `src/app/settings/` |
| 16 | 用量/系统/维护 | Command Center | `src/app/command-center/`（usage/system/maintenance） |
| 17 | 命令面板/快捷入口 | 全局 | `src/app/command-palette/`、`src/app/quick-entry/` |

> 注：原生桌面**没有独立的"记忆条目"页面**；记忆 CRUD 散落在后端。Starmap 只是图谱可视化。

### 1.3 设计语言（沿用上游 DESIGN.md）

- **Flat, not boxed**：空白 + 一根 hairline 分组，不做卡片套卡片
- **Tokens over literals**：颜色/阴影/圆角全部走 CSS 变量（本原型在 `src/index.css` 定义 `--ui-*`）
- **Intent before automation**：不因工具产出而自动开面板、抢焦点
- **Immediate feedback**：直接操作先更新视图，持久化随后对账
- 审批交互沿用 CardStack 语义：**手势/快捷键永不直接批准**，必须明确点击；离场卡片立即失活

## 2. 信息架构改造：13 页 → 6 工作台

原生一级页面太多太散。新版收敛为 6 个工作台（左导航 rail 常驻）：

| 新版工作台 | 收拢的原生页面 | 说明 |
|---|---|---|
| 聊天 | Chat、Session Import、Command Center(sessions)、Artifacts（收为右栏 pane） | 会话是 home surface；审批卡内联；工具执行时间线常驻输入区上方 |
| 任务 | Cron、kanban 插件、Command Center(maintenance) | 定时任务 + 看板同屏，"时间驱动"与"状态驱动"统一 |
| 技能 | Capabilities（skills/connectors/toolsets/plugins） | 一个页面管完能力供给；Bot Mode 的 Agents 页内容并入此处二级 tab（待定） |
| 记忆 | Starmap、（新增）记忆条目 | 原生缺失的条目管理补上；图谱保留 d3-force 方案 |
| 消息 | Messaging、Webhooks | 通道状态 + 事件推送规则同屏 |
| 设置 | Settings、Profiles、Command Center(system/usage) | Profile/模型/连接/用量收拢；密钥走系统钥匙串，UI 只读掩码 |

## 3. 原型实现说明

- 技术栈：Vite + React 19 + TypeScript + Tailwind v4（与上游渲染器同代，便于日后整体迁移进 Electron）
- 数据层：`src/mock/data.ts` 是**唯一**数据源；`MOCK=true`；全站 `MockBadge` 徽标 + 顶栏"后端未连接 · 纯原型"状态
- 交互（均为本地 mock 状态机）：切换工作台/会话、发送消息（模拟回执）、审批通过/拒绝、定时任务开关、技能开关、记忆 tab 切换、Profile 切换
- 设计 tokens：`src/index.css`（`--ui-*`、`--shadow-nous`），组件只用 token

## 4. 真实集成点（第二阶段工作）

| 原型部位 | 真实数据源 | 备注 |
|---|---|---|
| 会话列表/消息流 | `requestGateway("session.list")` / `prompt.submit`（WS 流式） | 见 `src/api/sessions.ts` |
| 审批卡 | 后端 approval 事件 → CardStack 语义 | 交互已按上游规范实现 |
| 工具时间线 | transcript tool rows + terminal pane 数据 | `src/api/` 各模块 |
| 定时任务 | cron RPC（`src/api/cron.ts`） | - |
| Skills 开关/命令 | `commands.catalog` + skill 启用接口 | 启用接口待验证 |
| 记忆条目/图谱 | `hermes_state_*` 对应 RPC | 方法名待验证 |
| 通道状态 | messaging gateway 状态 | `src/api/messaging.ts` |
| Profile/模型/用量 | `config.get`、models、usage RPC | `src/api/models.ts` 等 |

## 5. 未确认清单（禁止凭空假设）

1. Starmap 图数据的具体 RPC 方法名与分页策略 —— 只看到 `$starmapGraph` store，未深挖 provider
2. 记忆条目 CRUD 对应的方法名与权限模型
3. Skill 启用/禁用的后端接口是否存在（`commands.catalog` 只读已确认）
4. Webhooks 规则的完整字段与校验规则
5. `session.import` 的文件格式支持范围
6. 原型尚未覆盖：Artifacts 预览 pane、Terminal pane、Command Palette、Quick Entry —— 第二阶段补

## 6. 工程约束遵守情况

- ✅ 未修改 `butler` 仓库（仅只读参考其 README/目录结构）
- ✅ 未修改 Hermes 核心后端（研究用的是本地只读克隆）
- ✅ 未接触任何 API Key/Token/私人数据
- ✅ 未向 main 提交（main 至今不存在；root commit 直接落在 `feature/ui-prototype`）
- ✅ 不合并 PR（只建 Draft PR，待人工审查）
- ✅ 模拟功能全部明确标注，未冒充真实能力
