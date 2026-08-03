# Deep Mind Map

本地优先的开源 AI 思维导图桌面应用（Electron）。用你自己的 AI（API Key / Ollama 等）生成与编辑脑图，支持外观切换、导出导入，以及手动同步到你自己的 GitHub 仓库。

## 现状

当前仓库以**产品与设计文档**为先行交付；应用代码将按文档里程碑逐步实现。

| 文档 | 说明 |
|------|------|
| [docs/PRD.md](docs/PRD.md) | 产品需求（含自配 AI、MapStyle、导出导入、GitHub 脑图同步） |
| [docs/design-system.md](docs/design-system.md) | 视觉设计规范 |

## 产品要点

- **本地 Electron**：数据落盘本机，无产品方云账号墙
- **自配 AI**：OpenAI 兼容接口或本地模型端点
- **单人编辑**：不做实时共同编辑
- **MapStyle**：经典 / 紧凑 / 卡片 三套预设
- **导出 / 导入**：`.dmm.json` 无损往返；另支持 PNG / SVG / Markdown / PDF
- **GitHub 脑图同步**（可选）：用你的 PAT 手动推送 / 拉取 `.dmm.json` 到自有仓库（与本开源仓库无关）

## 开源

- License：[MIT](LICENSE)
- 欢迎 Issue / PR；实现前请先阅读 PRD 与设计规范中的术语与验收项

## 开发计划（摘要）

见 [docs/PRD.md](docs/PRD.md) 里程碑 M1–M5：图库与画布 → AI → MapStyle → 导入导出 → GitHub 同步。
