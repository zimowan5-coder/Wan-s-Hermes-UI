# 运行指南 · Hermes UI 原型

> 分支：`feature/ui-prototype`
> 全部为模拟数据，不连接真实 Hermes 后端。详见 `DESIGN.md`。

## 环境要求

- Node.js ≥ 20（上游桌面要求 Node 22+；本原型仅需 20+）
- npm ≥ 10

## 启动

```bash
cd prototype
npm install
npm run dev
```

浏览器打开终端输出的地址（默认 `http://127.0.0.1:5174`）。

## 可点的交互

| 位置 | 操作 | 说明 |
|---|---|---|
| 左导航 | 切换 6 个工作台 | 聊天 / 任务 / 技能 / 记忆 / 消息 / 设置 |
| 聊天 → 会话列表 | 切换会话 | 每个会话有独立模拟消息 |
| 聊天 → 审批卡 | 批准 / 拒绝 | 本地状态机，卡片变为"已批准/已拒绝" |
| 聊天 → 输入框 | 发送消息 | 900ms 后返回模拟回执（标注"模拟回复"） |
| 任务 → 定时任务 | 开关 toggle | 本地状态 |
| 任务 → 看板 | 浏览三列 | 静态模拟 |
| 技能 → 卡片开关 | 启用/禁用 | 本地状态 |
| 记忆 | 条目 / 图谱 tab | 图谱为静态 SVG 示意 |
| 消息 → 微信 | 扫码连接按钮 | 仅示意，无真实动作 |
| 设置 | Profile / 模型 / 连接 tab | 模型下拉、推理强度滑杆均为本地状态 |

## 构建验证

```bash
cd prototype
npm run build   # tsc 类型检查 + vite 构建
```

## 目录结构

```
Wan-s-Hermes-UI/
├── README.md            # 项目总览
├── DESIGN.md            # 研究结论、IA 设计、集成点、未确认清单
├── RUN.md               # 本文件
└── prototype/           # 可运行原型（Vite + React + TS + Tailwind）
    ├── src/mock/data.ts # 唯一数据源（MOCK=true，全部模拟）
    ├── src/components/  # Shell、MockBadge
    ├── src/views/       # 6 个工作台视图
    └── src/index.css    # 设计 tokens（--ui-*）
```

## 限制

- 不连接后端：所有"发送/开关/审批"只改本地状态，刷新即重置
- 未覆盖：Artifacts 预览、Terminal、命令面板（见 DESIGN.md §5）
- 样式为深色单主题；浅色主题与响应式未做
