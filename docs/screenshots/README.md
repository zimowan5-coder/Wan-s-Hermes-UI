# v0.5 实际运行截图

日期：2026-10-13 UTC。分支：`feature/ui-craft-refinement`。真实 Chromium 154.0.8037.57，`npm run build` 后的 `vite preview` 生产构建。全部模拟数据，不是概念图。

桌面截图 1440×900；移动截图 390×844；deviceScaleFactor=1。截图采用 `prefers-reduced-motion: reduce` 与 `?notransition=1` 捕获稳定帧，交互仍由真实浏览器执行。生产文件指纹见 [验证报告](../UI-QA-RESULTS.json)。

| 页面 | 浅色 | 深色 |
|---|---|---|
| 聊天与审批 | [chat-light.png](v05/chat-light.png) | [chat-dark.png](v05/chat-dark.png) |
| 空会话 | [empty-light.png](v05/empty-light.png) | [empty-dark.png](v05/empty-dark.png) |
| 定时任务 | [tasks-light.png](v05/tasks-light.png) | [tasks-dark.png](v05/tasks-dark.png) |
| 任务看板 | [board-light.png](v05/board-light.png) | [board-dark.png](v05/board-dark.png) |

补充：[390px 聊天](v05/chat-mobile.png) · [深色命令面板](v05/command-dark.png)。全部 10 张完整 PNG 已入库。

可复现命令见 [RUN.md](../../RUN.md)。验证：36 个主页面/主题/尺寸组合、24 个二级页面/浮层状态、17 项关键交互；无页面横向溢出、无被检测的 axe 规则问题、无浏览器 JS 错误。自动检查范围不等于完整 WCAG 认证。

---

以下为历史截图记录，保留以便比较。

# 截图说明

> 真实运行截图，非概念图。捕获方法见下。

## 本轮截图（第九阶段，v0.3 Liquid Glass 视觉升级）

| 文件 | 主题 | 窗口尺寸 | 捕获方式 | 日期 |
|---|---|---|---|---|
| `glass-light-small.jpg` | 浅色 | 960×600（原图 1440×900） | 本机 headless Chromium 渲染 `vite preview` 生产构建（`?theme=light`） | 2026-10-13 |
| `glass-dark-small.jpg` | 深色 | 960×600（原图 1440×900） | 同上（`?theme=dark`；注意：无头截图会抓到 body 200ms 主题过渡的起始帧，正式捕获前需禁用过渡或等待完成，见 AGENTS.md） | 2026-10-13 |

- 原图 PNG 保留在本地工作区；远端仅入库 960×600 压缩预览版（MCP 单次参数长度限制）。

## 上一轮截图（第四阶段，数据层重构后）

| 文件 | 主题 | 提交 | 窗口尺寸 | 捕获方式 | 日期 |
|---|---|---|---|---|---|
| `chat-light-small.jpg` | 浅色 | `de39b77`（`feature/ui-prototype`，目标 B 重构后） | 960×600（原图 1600×1000） | 本机 headless Chromium 渲染 `vite preview` 生产构建 | 2026-10-12 |
| `chat-dark-small.jpg` | 深色 | `de4bed8`（同上） | 960×600（原图 1600×1000） | 同上（`--force-dark-mode`） | 2026-10-12 |

- 页面 JS 零错误（捕获时监听 `pageerror`）。
- 原图 PNG（`chat-light.png` / `chat-dark.png`）保留在本地工作区；因 MCP 单次参数长度限制，
  远端仅入库 960×600 压缩预览版，原图可按需补传。
- 上一轮（第三阶段）截图：`chat-light.png` / `chat-dark.png`（本地，提交 `49f333a` 时捕获）。

## v0.4 重设计（2026-10-13）
- `v04-chat-light-small.jpg` / `v04-chat-dark-small.jpg`：v0.4 全面重设计后的聊天视图（浅色/深色）。
- 方向：Apple HIG 三原则（Clarity/Deference/Depth）；收敛 v0.3 的过度玻璃与密集边框。
- 关键变化：slim 工具栏 + 安静侧边栏、助手消息纯文本排版、分组列表取代卡片行、
  填充式按钮/输入框、iOS 式分段控件、精心设计的深色主题（非反转）。
- 原图：/tmp/v04-final-light.png、/tmp/v04-final-dark.png（1440×900 真实构建渲染）。
