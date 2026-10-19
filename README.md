# Wan-s-Hermes-UI

给 Hermes 穿新衣 —— 为 [NousResearch Hermes Agent](https://github.com/NousResearch/hermes-agent)
桌面端设计并实现一套全新的交互体验。

## 当前阶段

**v0.5 UI / UX 精修**：独立分支 `feature/ui-craft-refinement`，基于已有 `feature/ui-prototype`，保留六工作台和数据适配层。

- [精修说明](docs/UI-REFINEMENT.md) · [变更记录](CHANGELOG.md) · [运行指南](RUN.md)
- [浏览器验证报告](docs/UI-QA-RESULTS.json) · [真实运行截图](docs/screenshots/README.md)
- 重点：安静的视觉层级、双主题、响应式抽屉、聊天连续性、任务详情与可撤销操作。
- 所有 Agent 操作仍为模拟；不连接本地 Hermes，不扩展核心后端。

### 实际界面

| 浅色 | 深色 |
|---|---|
| ![浅色空会话](docs/screenshots/v05/empty-light.png) | ![深色空会话](docs/screenshots/v05/empty-dark.png) |
| ![浅色任务看板](docs/screenshots/v05/board-light.png) | ![深色任务看板](docs/screenshots/v05/board-dark.png) |

## 最新进展 · v0.7 Calm（分支 `feature/macos-glass-ui`）

- 配色改为参考 Gemini 的安静风格：白底 + 浅灰，大面积留白；彩色只留给渐变标志和输入框下方的淡光
- 审批卡、状态标签改为素色，风险用小圆点表示；用户消息改为浅灰气泡
- 保留 v0.6 的 macOS 窗口按钮、动效、Ctrl+K 命令面板、强调色设置

![v0.7 聊天](docs/screenshots/v07/chat-light.png)

## v0.6 macOS Glass

- 整体视觉改为 macOS 风格：浮动玻璃侧边栏、柔和壁纸透色、高光描边、弹性动效、红黄绿窗口按钮
- 新增 6 种强调色（设置 › 外观），Spotlight 式命令面板
- 打包为 Windows 桌面软件（Electron），双击安装包即可安装，见 `RUN.md`

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
