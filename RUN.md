# 运行与验证 · v0.8（功能入口对齐官方）

本轮分支：`feature/macos-glass-ui`，基于 `feature/ui-craft-refinement`。界面里的对话和数据都是演示内容，不连接真实 Hermes。

## 在 Windows 上使用（不需要懂代码）

1. 双击 `Hermes-UI-Setup-0.3.2.exe`。
2. 如果弹出蓝色的「Windows 已保护你的电脑」，点「更多信息」→「仍要运行」（因为安装包没有购买数字签名，属正常现象）。
3. 按提示安装，完成后桌面会出现 **Hermes UI** 图标（独立安装，不会覆盖官方 Hermes 桌面版），以后双击它就能打开。

## 自己打包安装包（开发者）

Node.js 22+：

```bash
cd prototype
npm ci
npm run app        # 在本机以桌面窗口打开（Windows / macOS / Linux 均可）
npm run dist:win   # 生成 release/Hermes-Setup-<版本>.exe
```

在 Windows 上直接运行 `npm run dist:win` 即可；在 Linux 上打 Windows 包需要安装 wine（含 32 位支持）。

## 浏览器里预览（开发用）

```bash
cd prototype
npm run dev   # http://127.0.0.1:5174
```

QA 参数：`?theme=light|dark|system`、`?view=tasks|skills|memory|messaging|artifacts|settings`、`?notransition=1`、`?desktop=1`（在浏览器里显示红黄绿窗口按钮）。

## 验证

```bash
npm run build
npm test
```

## 本轮可以试试

完整的「官方入口 → 新位置」对照见 `docs/FEATURE-MAP.md`。

- **侧边栏**：新建会话、任务、技能、记忆、消息、产物；下面直接是会话列表（置顶 / 最近 / 搜索）。会话右侧「⋯」：置顶、重命名、标记未读、分支、导出、复制 ID、归档、删除。
- **左下角头像**：切换配置档案、命令中心、导入会话、键盘快捷键、简洁 / 高级模式、设置。
- **输入框**：「+」添加文件 / 图片 / 网址 / 提示词片段；模型按钮选模型、推理强度、快速模式；麦克风听写；右侧语音对话；运行中可停止（Esc），继续输入会排队；`/` 命令（官方完整列表）、`@` 引用。
- **输入框上方**：任务进度、子代理（点开可引导或停止）。
- **命令中心**（Ctrl + .）：会话、系统与日志、用量、维护。
- **高级模式**：顶栏右侧面板按钮（Ctrl + J），文件 / 终端 / 审查 / 浏览器 / 日志。
- **设置**（Ctrl + ,）：常规、模型、对话、外观（含 HUD、宠物、布局）、工作区、安全与审批、记忆与上下文、语音、高级、提供方与密钥、网关、MCP、插件、通知、密码与登录、配置档案、已归档对话、快捷键、关于。
- 快捷键与官方一致：Ctrl+K 命令面板、Ctrl+N 新建会话、Ctrl+/ 快捷键列表、Shift+X 切换深浅色、Ctrl+Tab 切换会话。
