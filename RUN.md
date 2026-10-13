# 运行与验证 · v0.5

本轮：`feature/ui-craft-refinement`，基于 `feature/ui-prototype`。默认演示数据，不连接真实 Hermes。

## 启动

Node.js 22+，npm 10+：

```bash
cd prototype
npm ci
npm run dev
# http://127.0.0.1:5174
```

## 验证

```bash
npm run build
npm test
npm run preview
# 保持生产预览运行，另开终端：
npx playwright install chromium
npm run test:ui
```

已有系统 Chromium 时可指定路径：

```bash
UI_CHROMIUM_PATH=/usr/bin/chromium npm run test:ui
```

`UI_BASE_URL` 可覆盖预览地址（默认 `http://127.0.0.1:4174`）。浏览器脚本会重写 `docs/UI-QA-RESULTS.json` 和 `docs/screenshots/v05/`，仅使用模拟内容。它检测外部网络请求，不会主动连接后端。`UI_CHROMIUM_PATH` 使用 `--no-sandbox` 仅适用于隔离 CI/容器，普通环境可使用 Playwright 安装的浏览器。

## 可以实际尝试

- 六工作台与浅/深/系统主题，工具栏日月按钮快速切换；Ctrl/⌘ K 搜索命令。
- 会话搜索、会话草稿、Shift+Enter 多行、slash 联想、消息复制反馈。
- 待审批跳转、危险审批二次确认、工具执行记录与失败重试。
- 顶栏演示连接状态：断连后禁用发送，恢复保留草稿。
- 定时任务：搜索、新建、暂停、模拟运行；看板：详情、进度、移动、删除撤销。
- 紧凑窗口会话抽屉，小屏导航抽屉、纵向看板。
- Tab/Shift+Tab、Esc、方向键、Home/End；系统减少动态偏好。

## 数据边界

刷新重置模拟业务状态与草稿；主题与导航偏好本地持久化。新会话操作打开已有空白演示会话；Profile 仅本页模拟选择。二维码、Token、任务和诊断均为模拟，请勿输入真实凭据。

现有 `VITE_DATA=live` 适配器只具备原文档列出的有限能力，见 `docs/INTEGRATION-PLAN.md`。本轮没有配置或验证真实 Gateway。无障碍自动检查不代替真机/屏幕阅读器验证。

QA 参数：`?theme=light|dark|system`、`?view=tasks|skills|memory|messaging|settings`、`?notransition=1`。
