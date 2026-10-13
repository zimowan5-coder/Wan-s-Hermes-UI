# UI 架构：四层边界（目标 B）

> 原则：UI 组件永远不直接读 mock 数据、不直接调 RPC。
> 替换数据来源 = 新增一个实现 `HermesDataSource` 的类，UI 零改动。

## 四层

```
┌─ ① UI 组件层 ──────────────────────────────┐
│ views/ChatView.tsx（布局+展示）              │  只收 props / 调 hook 回调
│ components/*（按钮/卡片/时间线，纯展示）      │
├─ ② 状态与交互层 ───────────────────────────┤
│ hooks/useChatSession.ts                      │  会话级状态机、派生状态、
│ hooks/useGlobalApprovals / useSessionList    │  乐观更新、订阅
├─ ③ 数据访问/适配层 ────────────────────────┤
│ data/HermesDataSource.ts（接口契约）          │  领域类型见 data/types.ts
│ data/registry.ts（getDataSource 单例）       │  真实集成时切换实现
├─ ④ Mock 实现层 ────────────────────────────┤
│ data/mock/MockDataSource.ts                  │  唯一合法接触 mock/data.ts
│ mock/data.ts（假数据本体，UI 禁止直引）      │
└────────────────────────────────────────────┘
```

## 契约（`HermesDataSource`）

| 方法 | 说明 | 真实实现映射（待验证） |
|---|---|---|
| `listSessions()` | 会话列表 | `session.list`（已验证存在） |
| `getMessages(sessionId)` | 历史消息 | 会话消息查询（待验证） |
| `sendMessage(sessionId, text)` | AsyncIterable 流式 | `prompt.submit`（已验证存在，流式载荷待验证） |
| `runTool(...)` / `listToolRuns` / `retryToolRun` | 工具生命周期 | 工具事件流（待验证） |
| `listApprovals` / `decideApproval` / `onApprovalsChanged` | 审批 | 审批事件（待验证） |

**禁令**：不得在代码中编造 RPC 方法名。所有「待验证」项以 `docs/FEATURE-COVERAGE.md` 清单为准，
LiveDataSource 实现前必须先在官方源码中确认方法名与载荷。

## Chat 改造样本

- 改造前：`ChatView` 直接 `import { mockSessions… }`，状态散落在组件内（`extra`、`runs`、`sendingFor`…）。
- 改造后：`ChatView` 只消费 `useChatSession(activeId)` 返回的 `{ messages, runs, agentState, send, decide, retry … }`；
  会话切换、审批过滤、工具生命周期全部下沉到数据层；`App` 顶栏计数经 `useGlobalApprovals`。
- 会话隔离：审批/工具/错误继续按 `sessionId` 过滤（`lib/session-state.ts` 纯函数，供数据层与组件共用）。
- 其他 5 个工作台暂不迁移（本阶段只做 Chat 样本），其类型已收敛到 `data/types.ts`，mock 直引路径保留兼容 re-export。

## 状态归属规则

- 后端权威：会话、消息、审批状态、工具执行结果 → 渲染器只做展示缓存，**不做本地权威写**。
- 渲染器本地：composer 草稿、折叠/展开、主题、导航 → 可本地状态。
- 乐观更新仅允许：用户消息回显（sendMessage 首个 yield 即用户消息）。

## 测试

- `src/data/mock/MockDataSource.test.ts`（6 用例）：单例、会话列表、消息流式回显、
  runTool 生命周期、retryToolRun 三段、审批决定+订阅。
- `src/lib/session-state.test.ts`（7 用例）、`src/theme/theme.test.ts`（3 用例）保持通过。
- 本地：16/16 通过（2026-10-12）。CI：沿用现有 workflow（权限恢复后）。

## 遗留风险

1. `LiveDataSource` 尚未实现 —— 真实方法名需逐个验证后才能写。
2. 流式消息的增量合并策略（chunks → Message）需对照上游 `assistant-ui` 实现。
3. 审批事件的推送通道（WS topic 名）待验证，目前只验证了消费侧语义。
