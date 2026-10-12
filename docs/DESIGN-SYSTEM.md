# Hermes UI 设计系统（v0.2）

> 目标：Apple 级交互品质的 Windows AI 桌面工作台设计语言。
> 学习 Apple 的设计原则（克制、一致、动效服务于理解），**不复制** macOS 外观、商标与窗口控件。

## 1. 设计原则

1. **语义先于装饰**：颜色只表达含义（背景/前景/强调/状态），不做装饰性渐变与大面积高饱和色块。
2. **克制的层次**：信息分组用 4px 刻度的间距 + 一根细分割线；阴影只出现在浮层（`--shadow-lg`），页面内不做"卡片套卡片"。
3. **动效服务于理解**：120–240ms、ease-out；只用于状态变化与过渡，不做循环装饰动画；完整支持 `prefers-reduced-motion`。
4. **键盘优先可达**：所有交互都可键盘操作；全局可见焦点环（WCAG 2.4.7）；不劫持焦点、不抢焦点。
5. **诚实的状态**：每个异步状态（思考中/执行中/待审批/完成/失败/断连）都有明确视觉表达，不用"假成功"掩盖。

## 2. 主题

三种模式：`light` / `dark` / `system`（默认跟随 Windows 系统主题）。

- 运行时切换：顶栏三段式切换器；`system` 模式监听 `prefers-color-scheme` 实时跟随。
- 持久化：`localStorage['hermes-ui-theme']`；写入失败（隐私模式）时仅本次生效。
- 实现：`src/theme/theme.tsx` 的 `useTheme()` 解析后写入 `<html data-theme>`；CSS 只定义 `:root`（浅）与 `:root[data-theme="dark"]`（深）两套 tokens。
- 调试钩子：URL 参数 `?theme=light|dark|system` 覆盖本次主题（仅用于 QA/截图，无后端）。

浅色避免纯白刺眼（基底 `#f6f7f9`），深色避免纯黑压抑（基底 `#16181d`）。两套主题信息架构与组件行为完全一致。

## 3. Tokens（`prototype/src/index.css`）

### 3.1 语义色板

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--bg-base` | `#f6f7f9` | `#16181d` | 页面基底 |
| `--bg-raised` | `#ffffff` | `#1e2129` | 卡片/面板 |
| `--bg-overlay` | `#ffffff` | `#242832` | 浮层/弹窗 |
| `--bg-sunken` | `#eceef2` | `#101218` | 输入框/凹陷区 |
| `--fg-primary` | `#1c1f26` | `#e9ebf1` | 正文 |
| `--fg-secondary` | `#5b616e` | `#a6adbb` | 次要文本 |
| `--fg-tertiary` | `#6b7280` | `#7c8494` | 辅助文本（时间戳等） |
| `--border-subtle` | `rgba(28,31,38,.09)` | `rgba(255,255,255,.09)` | 细分割线 |
| `--border-strong` | `rgba(28,31,38,.18)` | `rgba(255,255,255,.17)` | 控件边框 |
| `--accent` | `#2f5fd0` | `#93aef7` | 强调（主按钮/链接/选中） |
| `--accent-fg` | `#ffffff` | `#0c0e13` | 强调色上的文字 |
| `--accent-soft` | `rgba(47,95,208,.1)` | `rgba(147,174,247,.13)` | 强调淡底 |
| `--success` / `--warning` / `--danger` | `#2e7d43` / `#a86a12` / `#c0354b` | `#8fd6a4` / `#e8b96e` / `#f08ba0` | 状态色 |
| `--mock` | `#7c3aed` | `#b79cff` | Mock 标记（原型专用） |

旧 `--ui-*` tokens 保留为别名映射到新 tokens（第一阶段视图兼容）。

### 3.2 对比度（WCAG 2.2 AA，4.5:1 正文 / 3:1 大文本）

实测（脚本：`python3` 相对亮度公式）：

| 组合 | 比值 | 结论 |
|---|---|---|
| 浅色正文 `#1c1f26` / 基底 | 15.39 | ✅ AA |
| 浅色次要 `#5b616e` / 基底 | 5.80 | ✅ AA |
| 浅色辅助 `#6b7280` / 基底 | 4.51 | ✅ AA |
| 浅色强调 `#2f5fd0` / 基底 | 5.34 | ✅ AA |
| 白字 / 浅色强调底 | 5.72 | ✅ AA |
| 深色正文 `#e9ebf1` / 基底 | 14.90 | ✅ AA |
| 深色次要 `#a6adbb` / 基底 | 7.88 | ✅ AA |
| 深色辅助 `#7c8494` / 基底 | 4.72 | ✅ AA |
| 深色强调 `#93aef7` / 基底 | 8.15 | ✅ AA |
| 深字 / 深色强调底 | 8.86 | ✅ AA |

状态色（success/warning/danger）在两套主题下正文使用均 ≥ 4.5（浅色 warning `#a86a12` 用于文字；大色块只用 `*-soft` 淡底）。

### 3.3 间距 / 圆角 / 动效 / 阴影

- 间距：4px 基础刻度（4/8/12/16/20/24…），组件内边距优先 8/12/16。
- 圆角：`--radius-sm 8` / `--radius-md 12` / `--radius-lg 16` / `--radius-xl 20`。
- 动效：`--motion-fast 120ms`（hover/色值）、`--motion-normal 200ms`（显隐/位移）、`--motion-slow 240ms`（卡片入场）；`--ease-out: cubic-bezier(0.2,0.7,0.3,1)`。
- 阴影：`--shadow-sm/md` 用于控件与小浮层；`--shadow-lg` 仅用于 Dialog/审批卡等需要"浮起"的元素。
- 字体：`system-ui, "Segoe UI", "Microsoft YaHei", "PingFang SC"` —— Windows 优先，中文排版行高 1.6。

## 4. 组件约定

- **一个组件类只用 tokens**：禁止在组件内写裸色值；需要新语义先加 token。
- **焦点**：`:focus-visible` 全局 2px accent 焦点环；`--motion` 全部走变量。
- **Mock 标记**：原型中一切模拟数据用 `.mock-badge`（虚线描边 + MOCK 字样），不得移除。
- **状态表达**：`chip` 承载状态文本；颜色只做辅助，文字永远在场（色盲友好）。

## 5. 可访问性基线（WCAG 2.2 AA）

- 对比度见 §3.2；新增颜色组合必须先计算。
- 键盘：Tab 顺序符合视觉顺序；Enter/Space 激活；Esc 关闭浮层/取消编辑；审批等关键操作可达且可撤销。
- 焦点不被抢占：异步更新（消息流、工具结果）不移动焦点；`aria-live="polite"` 播报状态变化。
- `prefers-reduced-motion` 下禁用非必要的动画与过渡。
- 触控目标 ≥ 24×24px（导航项/按钮满足）。

## 6. 兼容与迁移

- 第一阶段的 6 个视图通过 `--ui-*` 别名自动获得双主题，无需改代码。
- 新代码一律使用语义 tokens；别名视为 deprecated，第二阶段后逐步迁移。
