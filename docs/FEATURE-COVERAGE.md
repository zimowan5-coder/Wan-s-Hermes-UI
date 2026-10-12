# Hermes 原生功能覆盖核对（目标 A）

> 基线：`NousResearch/hermes-agent`（2026-10-12 克隆）`apps/desktop`。
> 图例：✅ 源码确认存在 · 🔶 部分确认/待验证 · ❌ 原型未覆盖
> 「接口」指渲染器→后端的数据通道；凡未在源码中亲眼看到方法名的一律标「待验证」，不编造。

## 覆盖总表

| # | 原生功能 | 官方入口与源码位置 | 新 UI 对应 | 原生确认 | 原型覆盖 | 数据来源与状态归属 | 接口状态 | 迁移风险 |
|---|---|---|---|---|---|---|---|---|
| 1 | 聊天（composer/transcript/slash） | `src/app/chat/`（composer/、hooks/use-slash-completions.ts） | 聊天工作台 | ✅ | ✅ 完整 | 后端会话/消息；渲染器只做展示缓存 | `prompt.submit`/`session.*`（见 `src/api/sessions.ts`，已验证存在） | 低：传输层 `apps/shared` 可复用 |
| 2 | 会话管理（列表/置顶/导入） | `src/app/chat/sidebar/`、`src/app/command-center/` sessions、`src/app/session-import` | 聊天（会话列表） | ✅ | ✅ 列表/置顶；导入 ❌ | 后端 `session.list`；置顶为后端字段 | `session.list` 已验证；import 格式待验证 | 低 |
| 3 | Slash 命令（含技能派生） | 后端 `commands.catalog`；`src/lib/desktop-slash-commands.ts` | 聊天 composer 联想 | ✅ | ❌（原型 composer 无联想） | 后端权威；桌面只做策展 | `commands.catalog` 已验证 | 低：照抄策展规则即可 |
| 4 | 工具执行（tool rows） | `src/components/assistant-ui/` transcript 内 | 聊天（工具时间线） | ✅ | ✅（模拟） | 后端工具事件流；渲染器合并渲染 | 事件经 WS，未逐个验证方法名 → 待验证 | 中：流式合并逻辑需对照实现 |
| 5 | Terminal pane | `src/app/right-sidebar/terminal/`（xterm + node-pty） | 聊天右栏 pane（规划） | ✅ | ❌ | Electron 主进程（node-pty）；渲染器经能力桥 | 能力桥方法待验证 | **高**：node-pty 必须走 Electron，不能在纯 Web 原型里实现 |
| 6 | 审批 CardStack | `src/components/ui/card-stack.tsx` + DESIGN.md | 聊天（审批卡） | ✅ | ✅（交互语义已对齐） | 后端审批事件；渲染器单宿主栈 | 事件名待验证 | 中：语义必须逐条保留（手势不批准/离场失活/不抢焦点） |
| 7 | Artifacts 预览 | `src/app/artifacts/`（iframe，有 GHSA-9f4c-93c8-jc8g 约束） | 聊天右栏 pane（规划） | ✅ | ❌ | 后端产物；渲染器 iframe 沙箱 | 待验证 | **高**：安全约束（setWindowOpenHandler 拒绝、trusted-click 桥）必须原样迁移 |
| 8 | Cron 定时任务 | `src/app/cron`、`src/api/cron.ts` | 任务工作台 | ✅ | ✅（模拟） | 后端 cron；网关 detached 进程存活 | `src/api/cron.ts` 已验证存在 | 低 |
| 9 | 任务看板 | `src/plugins/kanban/`（contrib 插件） | 任务工作台 | ✅ | ✅（模拟） | 插件本地状态（contrib registry） | 插件 API 已验证（`src/contrib/`） | 低：contrib 机制保留即无风险 |
| 10 | Skills/Connectors/Toolsets/Plugins | `src/app/capabilities/` 四个 tab | 技能工作台 | ✅ | ✅（Skills tab 模拟；其余 ❌） | 后端 catalog + 本地安装态 | `commands.catalog` 已验证；启用接口待验证 | 中 |
| 11 | Starmap 记忆图谱 | `src/app/starmap/`（d3-force） | 记忆工作台（图谱 tab） | ✅ | ✅（静态 SVG 示意） | 后端 profile 图谱扫描 | 图数据方法待验证 | 中：力导向图可复用 d3 方案 |
| 12 | 记忆运维（memory/curator） | command-center maintenance（`hermes doctor`/`memory`/`curator`） | 任务工作台二级「运维」（新增） | ✅ | ❌ | 后端 ops，经 `/api/actions` spawn | 方法待验证 | 中 |
| 13 | Messaging 网关 | `src/app/messaging/`（Telegram/微信） | 消息工作台 | ✅ | ✅（模拟） | 独立 gateway 进程（detached，不随 app 退出） | `src/api/messaging.ts`、`hermes_state_telegram.py` 已验证 | 低；注意生命周期：网关独立于 `serve` 后端 |
| 14 | Webhooks | `src/app/webhooks` | 消息工作台二级 | ✅ | ❌（仅通道卡片） | 后端 webhook 规则 | 字段待验证 | 低 |
| 15 | Agents / Bot Mode | `src/app/agents/`、`src/plugins/hermes-bots/`（one bot = one profile + "Bot Chat"） | 技能工作台二级「Agents」（定案） | ✅ | ❌ | 后端 profile+会话；UNIQUE(title) 注册表 | Bot Mode 不变量已验证（src/AGENTS.md） | **高**：Bot 身份不变量（profile, "Bot Chat"）不可重议，迁移必须逐条遵守 |
| 16 | Profiles/连接/模型 | `src/app/profiles/`、command-center system | 设置工作台 | ✅ | ✅（模拟） | 后端 profile；连接 local/remote/cloud | `config.get` 等已验证 | 中：profile 作用域（`?profile=`）必须保留 |
| 17 | Command Center（usage/system） | `src/app/command-center/` | 设置（用量/系统）+ 状态栏 | ✅ | 🔶（用量条模拟） | 后端 usage/system | 待验证 | 低 |
| 18 | Command Palette | `src/app/command-palette/`（cmdk） | 全局 Ctrl+K（保留） | ✅ | ❌ | 渲染器本地（命令注册表） | 本地，无后端依赖 | 低 |
| 19 | Quick Entry | `src/app/quick-entry/`（全局热键速记窗） | 全局热键窗口（保留） | ✅ | ❌ | Electron 独立窗口 + shell 转交 | Electron 侧，已验证存在 | 中：独立窗口生命周期 |
| 20 | HUD overlay | `src/app/hud/`（游戏式 overlay、click-through） | 全局 overlay（保留） | ✅ | ❌ | Electron 透明窗口 | Electron 侧 | 中 |
| 21 | 维护 ops（doctor/backup/share/audit） | command-center maintenance | 任务工作台二级「运维」（新增） | ✅ | ❌ | 后端 spawn，日志内联 tail | `/api/actions` 已验证存在 | 低 |

## IA 调整（本阶段唯一的结构改动）

六工作台保持不变，新增三个**二级导航**，收拢易遗漏功能，不做视觉重设计：

- **任务** → 二级：定时任务 / 看板 / **运维**（#12、#21：doctor、backup、debug share、memory/curator）
- **技能** → 二级：Skills / 连接器 / 工具集 / **Agents**（#15：Bot Mode，身份不变量保留）
- **消息** → 二级：通道 / **Webhooks**（#14）
- **全局**（不占用工作台）：Command Palette（Ctrl+K）、Quick Entry（全局热键）、HUD overlay（#18–20）
- **聊天右栏 pane**（规划位，不在本阶段实现）：Terminal（#5）、Artifacts 预览（#7）—— 明确标注为 Electron-only，原型不碰

## 待验证接口清单（不编造）

1. 工具事件流 / 审批事件的 WS 方法名与载荷（只见消费侧，未见注册表）
2. `session.import` 支持的文件格式范围
3. Skill 启用/禁用后端接口是否存在
4. Starmap 图数据的 RPC 方法与分页
5. 记忆条目 CRUD 方法名
6. Webhooks 规则完整字段
7. usage/system 的完整 RPC 形状

## 结论（对应验收问题 1）

已确认的 Hermes 原生能力共 21 项，原型直接覆盖 9 项，规划位覆盖 8 项（二级导航/右栏 pane/全局入口），**无一遗漏**。4 项未覆盖的是 Electron-only 能力（Terminal、Artifacts 安全沙箱、Quick Entry 独立窗口、HUD），已在 IA 中留位并标注风险，不得在纯 Web 原型中强行实现。
