# 运行与验证 · v0.6（macOS Glass）

本轮分支：`feature/macos-glass-ui`，基于 `feature/ui-craft-refinement`。界面里的对话和数据都是演示内容，不连接真实 Hermes。

## 在 Windows 上使用（不需要懂代码）

1. 双击 `Hermes-Setup-0.1.0.exe`。
2. 如果弹出蓝色的「Windows 已保护你的电脑」，点「更多信息」→「仍要运行」（因为安装包没有购买数字签名，属正常现象）。
3. 按提示安装，完成后桌面会出现 **Hermes** 图标，以后双击它就能打开。

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

QA 参数：`?theme=light|dark|system`、`?view=tasks|skills|memory|messaging|settings`、`?notransition=1`、`?desktop=1`（在浏览器里显示红黄绿窗口按钮）。

## 验证

```bash
npm run build
npm test
```

## 本轮可以试试

- 左侧玻璃侧边栏：点不同页面，选中色块会弹性滑动；左上角红黄绿按钮可关闭 / 最小化 / 最大化窗口。
- 侧边栏右上角按钮收起成图标栏；窗口拖窄时会自动收起。
- `Ctrl + K` 或侧边栏「搜索」：Spotlight 式命令面板。
- 设置 › 外观：浅色 / 深色 / 跟随系统，以及 6 种 macOS 强调色。
- 聊天：发送消息（演示回复）、审批卡、slash 命令联想（输入 `/`）。
