# UI / UX 精修 · v0.5

日期：2026-10-13。独立分支：`feature/ui-craft-refinement`，基于 `feature/ui-prototype@cce1f06`。保留六工作台、React/Vite/TypeScript、聊天 hooks → DataSource → Mock/Live 适配边界。本轮没有修改 Hermes 核心后端或建立本地连接。

## 审查结果

实际运行原型后发现：390px 窗口被撑到 717px，固定导航和会话栏占据整个视口；审批卡的重阴影盖过消息；会话切换丢草稿；后台发送可能把消息更新到已切换的会话；命令面板缺少可靠的焦点边界和返回；看板控件依赖鼠标 hover，编辑随 tab 切换重置。设计文档已有双主题和去卡片化方向，问题在于落实程度与边缘状态，而不是架构本身。

## 设计依据与转译

- [Apple HIG · Layout](https://developer.apple.com/design/human-interface-guidelines/layout)：内容和导航的层级、适配不同窗口。这里转译为安静侧栏、统一工作区、窄屏抽屉。
- [Apple HIG · Materials](https://developer.apple.com/design/human-interface-guidelines/materials)：材料帮助区分控制层与内容层。这里以实色承载阅读，用玻璃光感突出命令面板和导航浮层，保留不支持 blur / 减少透明度 / 增强对比度的回退。
- [Apple HIG · Typography](https://developer.apple.com/design/human-interface-guidelines/typography)：通过字重、尺寸和留白表达优先级。这里采用系统字体、固定阅读宽度及三层文本颜色。
- [Apple HIG · Motion](https://developer.apple.com/design/human-interface-guidelines/motion)：短过渡表达状态关系；遵循减少动态偏好。装饰只使用静态环境光、原创 Hermes 标记和空会话轨道线。
- [Radix Primitives · Dialog 实现](https://github.com/radix-ui/primitives/blob/main/packages/react/dialog/src/dialog.tsx) 与 [设计原则](https://github.com/radix-ui/primitives/blob/main/philosophy.md)：参考焦点、键盘、背景隔离的行为边界。本轮使用浏览器原生 dialog 与少量本地逻辑，未引入生产 UI 框架或复制源码。

这是面向 Web/Windows 工作台的原创转译，不是 Apple 原生 Liquid Glass 渲染器，也不复制 macOS 窗口控件。

## 已实现

| 层面 | 变化 |
|---|---|
| 工作台外壳 | 导航、品牌、工作区、工具栏分工；主页级 MOCK 标签和明确演示模式；移除不准确的“北京时间”时钟 |
| 视觉系统 | 温和纸面浅色、蓝灰深色；统一圆角、弱分隔、平面审批卡；玻璃与阴影用于浮层，主要内容安静可读 |
| 聊天 | 会话搜索、无匹配反馈、按会话保留草稿、导航回来继续编辑；中文 IME Enter 不误发送；多行输入高度随内容调整 |
| 会话状态 | 异步更新按来源会话存储，后台完成不污染当前会话；发送失败明确反馈并恢复草稿；工具运行状态轮询到结束 |
| 审批与工具 | 危险操作明确二次确认且焦点默认取消；提交中禁用重复操作；审批跳转；失败工具可重试且有可见完成反馈 |
| 消息反馈 | 用户消息低饱和底色；助手内容用排版表达；复制失败不再虚报成功；阅读旧消息时不强拉滚动 |
| 任务 | 搜索、新建/运行反馈、保留 tab 里的编辑；看板详情、状态选择、删除撤销；触摸/键盘也能发现行动入口 |
| 其他页面 | 技能、记忆、消息与设置统一阅读留白；记忆 tabs 保留编辑；模拟二维码使用一致 modal；不提示用户输入真实 Token |
| 外观 | 首屏绘制前应用主题、实时跟随系统；localStorage 写失败时多实例仍保持一致；工具栏快速浅深切换；缩放同时作用于文字与控件 |
| 响应式 | 大窗口双侧栏、紧凑窗口图标导航与会话抽屉、小屏单内容区；看板纵向分组；宽表格局部滚动 |
| 键盘 | 原生 dialog 背景 inert + Tab 首尾保护 + Esc + 返回触发器；分段 tabs/radio 支持方向键/Home/End；跳过导航入口 |

## 材料与 tokens

当前 tokens 以 `prototype/src/index.css` v0.5 部分为准；旧 `--ui-*` 别名保留，避免重写现有五视图。

| 语义 | 浅色 | 深色 |
|---|---|---|
| 页面环境 | `#f0f1f5` | `#13151b` |
| 阅读面 | `#fdfdfe` | `#1b1e26` |
| 主要表面 | `#ffffff` | `#242730` |
| 正文 | `#242631` | `#edf0f7` |
| 次要文字 | `#626571` | `#b3b8c7` |
| 辅助文字 | `#626570` | `#a8b0c0` |
| 强调 | `#4167ce` | `#9eb8ff` |

颜色检查针对实际合成后的背景，不沿用旧文档在不同底色上的比值。UI 浏览器检查记录在 `UI-QA-RESULTS.json`。

## 状态与集成边界

- 导航、会话草稿、折叠、主题、搜索是渲染器状态。主题/折叠保存在本地；草稿只保留在本次页面内，刷新清空。
- 现有 MockDataSource 继续负责模拟消息/审批/工具；发送中只有 mock 路径运行模拟 `agent.plan`，不把模拟工具注入 live 路径。
- 其他五工作台沿用已有本地模拟状态。页面间切换隐藏面板，保留本次编辑；切换 tab 不再重建任务与记忆编辑面板。
- 新会话按钮/命令打开已有空白演示会话，不伪造创建后端会话的能力。Profile 选择明确标为本页模拟，不宣称全局真实切换。
- LiveDataSource 的现有限制保持不变。没有新增 RPC、真实模型调用、连接器认证或任务执行。

## 验证与局限

本轮完成：22 项单元测试、36 组主页面/主题/尺寸、24 个二级页面/浮层状态、17 项关键交互通过。自动检查未检测到横向页面溢出或 axe 规则问题，浏览器 JS 错误与外部网络请求为零。完整数值以 `UI-QA-RESULTS.json` 为准。`npm run build`、`npm test` 与 `npm run test:ui` 分别验证类型/生产构建、原有领域测试、真实 Chromium 页面与交互。

自动检查覆盖主页面、二级页面、浮层、多个尺寸、主题、焦点、草稿、会话隔离、审批和任务操作；自动无障碍规则通过不等于完整 WCAG 认证。Windows 原生窗口、真实后端、屏幕阅读器、其他浏览器和长时间大数据压力仍需后续验证。截图来自生产构建真实渲染，非设计概念图。
