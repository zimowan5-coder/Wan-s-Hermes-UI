# Wan-s-Hermes-UI

给 Hermes 穿新衣 —— 为 [NousResearch Hermes Agent](https://github.com/NousResearch/hermes-agent)
桌面端设计并实现一套全新的交互体验。

## 当前阶段

**第一阶段：研究与 UI 原型**（分支 `feature/ui-prototype`，Draft PR 待审查）

- `DESIGN.md` — 官方源码研究结论、原生功能清单（含源码依据）、13→6 信息架构改造、真实集成点、未确认清单
- `RUN.md` — 原型运行指南与可交互清单
- `prototype/` — 可交互 UI 原型（Vite + React 19 + TS + Tailwind v4），**全部为模拟数据**

## 原型速览

6 个工作台：**聊天**（会话/审批卡/工具时间线）· **任务**（定时任务+看板）· **技能** ·
**记忆**（条目+知识图谱）· **消息**（网关通道）· **设置**（Profile/模型/连接）

```bash
cd prototype && npm install && npm run dev
# 打开 http://127.0.0.1:5174
```

## 工程约束

- 不修改 `butler` 仓库（只读参考）与 Hermes 核心后端
- 不接触任何 API Key / Token / 私人数据
- 不直接向 main 提交、不合并 PR（Draft PR 待人工审查）
- 模拟功能全部明确标注，不冒充真实 Hermes 能力
