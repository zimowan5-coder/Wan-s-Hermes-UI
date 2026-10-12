# 截图说明

> 真实运行截图，非概念图。捕获方法见下。

## 本轮截图（第四阶段，数据层重构后）

| 文件 | 主题 | 提交 | 窗口尺寸 | 捕获方式 | 日期 |
|---|---|---|---|---|---|
| `chat-light-small.jpg` | 浅色 | `de39b77`（`feature/ui-prototype`，目标 B 重构后） | 960×600（原图 1600×1000） | 本机 headless Chromium 渲染 `vite preview` 生产构建 | 2026-10-12 |
| `chat-dark-small.jpg` | 深色 | `de4bed8`（同上） | 960×600（原图 1600×1000） | 同上（`--force-dark-mode`） | 2026-10-12 |

- 页面 JS 零错误（捕获时监听 `pageerror`）。
- 原图 PNG（`chat-light.png` / `chat-dark.png`）保留在本地工作区；因 MCP 单次参数长度限制，
  远端仅入库 960×600 压缩预览版，原图可按需补传。
- 上一轮（第三阶段）截图：`chat-light.png` / `chat-dark.png`（本地，提交 `49f333a` 时捕获）。
