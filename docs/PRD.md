# Deep Mind Map — 产品需求文档（PRD）

| 字段 | 内容 |
|------|------|
| 产品名 | Deep Mind Map |
| 版本 | MVP 0.1 |
| 形态 | 本地 Electron 桌面应用 |
| 定位 | 个人学习向 AI 思维导图工具 |
| 开源 | 是（本仓库公开维护，默认 MIT License） |
| 关联文档 | [视觉设计规范](./design-system.md) · [开发设计文档](./tech-design.md) |
| 状态 | Active（与当前实现对齐） |

---

## 1. 产品概述

### 1.1 愿景

在本地用用户自己的 AI，把主题或笔记快速变成可编辑、可备份的思维导图；通过 Agent 对话改图，可选同步到自有 GitHub 仓库。

### 1.2 产品原则

1. **本地优先**：思维导图与配置落盘本机，不依赖产品方云端；可选同步到用户**自有** GitHub 仓库作备份。
2. **AI 自配**：模型与密钥由用户自行配置，成本与隐私可控。
3. **结构可往返**：权威 `.dmm.json` 可导出后再导入还原（导入入口为后续交付；格式已定型）。
4. **单人深度编辑**：聚焦个人学习整理，不做共同编辑。
5. **开源可审计**：应用与文档在公开 GitHub 仓库维护。注意区分两层 GitHub 用途——**本开源仓库** vs 应用内「同步思维导图到用户自己的仓库」（§3.8）。

### 1.3 目标用户

| 角色 | 诉求 |
|------|------|
| 大学生 / 考研党 | 把一门课、一本教材快速结构化，备份与打印复习 |
| 职场自学者 | 用自己的 API / 本地模型整理知识，控制费用 |
| 知识整理型学习者 | 用 Agent 对话生成与精修思维导图，再同步到自有仓库 |

### 1.4 核心场景

配置 AI → 工作区新建思维导图 → 在 AI 浮岛用 Agent 生成 / 改图 → 手动精修节点 →（可选）设置中推送到 GitHub；换机时拉取或导入 `.dmm.json`。

### 1.5 非目标（当前明确不做）

- 共同编辑 / 实时协作 / 局域网房间
- 产品方托管云账号、产品方云同步、订阅计费（**允许**用户自有 GitHub 仓库手动同步）
- 掌握度标记、复习 / 闪卡模式
- 企业 Workspace、白板便签
- **MapStyle 切换 UI**、自定义主题编辑器、社区主题市场、逐节点皮肤包（文件字段可存 `mapStyle`，默认 `classic`）
- 节点自由拖放改坐标 / 拖放改父子（布局由算法计算）
- Git LFS、多人协作 PR 流程、同步 PNG/PDF、产品方代管仓库
- 移动端原生应用
- 后台静默自动同步（仅手动推送 / 拉取）

---

## 2. 信息架构与界面

与 [design-system.md](./design-system.md) 一致：**单一工作区壳**，图库与编辑合并；同步仅在设置。

```
首次引导 (Onboarding)
    → 工作区 (Workspace)
         ├─ 侧栏：图库树（新建 / 打开 / 重命名 / 删除）
         ├─ 主区：Tab + 画布（或空状态）
         ├─ 浮层：AI 浮岛（Ask / Agent）
         └─ 设置面板（替换主区）：外观 / AI / GitHub 同步
```

### 2.1 界面清单

| 界面 | 职责 | 实现状态 |
|------|------|----------|
| 首次引导 | 欢迎、配置 AI、连接测试；可跳过 | 已交付 |
| 工作区 | 侧栏图库 + Tab 多开 + 画布编辑 | 已交付 |
| AI 浮岛 | Ask / Agent 对话、附件、多对话、改图工具 | 已交付 |
| 设置 | 主题、AI Provider、GitHub 同步（授权 / 仓库 / 推送 / 拉取） | 已交付 |
| 导出 / 导入 | 格式选择、路径选择 | **后端就绪，无 UI 入口** |

无产品方云登录墙。GitHub 通过 **OAuth Device Flow** 授权访问用户自有仓库。

### 2.2 桌面布局（工作区）

侧栏（220px，图库）+ 轨 A（Tab / 状态）+ 全幅画布；浮岛：左上撤销/重做、左下缩放、右下 AI。视觉细则见 [design-system.md](./design-system.md)。

---

## 3. MVP 功能需求

### 3.1 应用壳与本地存储

| ID | 需求 | 验收 | 状态 |
|----|------|------|------|
| A-01 | Electron 桌面应用，支持 macOS / Windows（Linux 可选） | 可安装或开发模式启动 | 已交付 |
| A-02 | 图库与思维导图本地持久化；默认目录明确 | 重启后图库与思维导图可恢复 | 已交付 |
| A-03 | 无网可用：打开、编辑、保存不依赖网络 | 断网冒烟通过 | 已交付 |
| A-04 | 中文优先 UI | 主流程文案为简体中文 | 已交付 |
| A-05 | 应用外观：跟随系统 / 浅色 / 深色 | 设置可切换且即时生效 | 已交付 |

**默认存储**：`~/Documents/DeepMindMap/`（`app.getPath('documents')`），内含 `library/`、`settings.json`、`secrets.bin`。

### 3.2 图库与思维导图 CRUD

| ID | 需求 | 验收 | 状态 |
|----|------|------|------|
| L-01 | 文件夹整理思维导图（创建 / 重命名 / 删除） | 图库树正确反映结构 | 已交付 |
| L-02 | 思维导图新建、打开、重命名、删除 | 列表与磁盘文件一致 | 已交付 |
| L-03 | 多 Tab 打开思维导图；切换前 flush 保存 | Tab 与脏状态一致 | 已交付 |
| L-04 | 最近打开列表 | 最近 N 条可一键打开 | 数据已记；侧栏 UI 未单独暴露 |
| L-05 | 思维导图 / 文件夹拖拽移动 | 树结构与磁盘路径一致 | IPC 就绪，UI 未做 |

术语：

- **Library**：个人图库，本地思维导图集合
- **Map / MindMap**：单份思维导图
- **Node**：节点（树由 `parentId` + `order` 表示；无独立 Edge 表）

### 3.3 画布编辑（单人）

| ID | 需求 | 验收 | 状态 |
|----|------|------|------|
| E-01 | 节点增删改、双击或 F2 编辑文案 | 内容即时反映在画布 | 已交付 |
| E-02 | 结构变更后自动右向布局（经典 XMind 式肘线） | 结构与显示一致 | 已交付 |
| E-03 | 折叠 / 展开子树 | 折叠后子树隐藏，再次展开恢复 | 已交付 |
| E-04 | 单节点颜色等基础样式 | 颜色写入节点并随 JSON 导出 | 字段存在，UI 未用 |
| E-05 | 撤销 / 重做 | 覆盖结构类操作 | 已交付（约 50 步） |
| E-06 | 画布缩放、平移、适应画布 | 浮岛控件可用 | 已交付 |
| E-07 | 快捷键：Tab 子节点、Enter 兄弟、Delete 删除、⌘Z / ⌘⇧Z、F2 | 与画布一致 | 已交付 |

**不做（当前）**：拖拽节点改坐标、拖放改父子挂接。

自动保存：脏标记后约 700ms debounce 写盘；切 Tab / 退出前 flush。

### 3.4 自配 AI（Provider）与 Agent

用户自行配置 AI，请求发往用户指定端点，产品不代理、不计费。

**技术约定**：主进程通过 **Vercel AI SDK**（`ai` + `@ai-sdk/*`）调用模型。

| ID | 需求 | 验收 | 状态 |
|----|------|------|------|
| AI-01 | 支持 **OpenAI 兼容**：Base URL + API Key + 模型名 | 配置可保存并用于对话 | 已交付 |
| AI-02 | 支持 **Anthropic 兼容**：API Key + 模型名；Base URL 可改 | Claude 类可连通 | 已交付 |
| AI-03 | 支持 **本地 Ollama**：Host + 模型名；Key 可选 | 无云 Key 时可本地对话 | 已交付 |
| AI-04 | 基础参数：温度等 | 写入配置并参与请求 | 已交付 |
| AI-05 | 连接测试 | 成功 / 失败有可读中文提示 | 已交付 |
| AI-06 | API Key 仅存本机安全存储 | Key 不进思维导图 JSON | 已交付 |
| AI-07 | 未配置时 AI 入口有引导；编辑仍可用 | 无崩溃 | 已交付 |
| AI-08 | Provider 切换后走对应适配 | 同一套 Agent 能力 | 已交付 |

#### AI 主路径：画布 Agent（Ask / Agent）

| ID | 能力 | 说明 | 状态 |
|----|------|------|------|
| AI-20 | **Ask 模式** | 只读问答；可读大纲 / 查找节点，不改图 | 已交付 |
| AI-21 | **Agent 模式** | 可调用写工具改图：重建整图、展开、改文案、加子节点、删节点等 | 已交付 |
| AI-22 | 流式进度 | 思考 / 工具步骤 / 文本增量可见；可中止 | 已交付 |
| AI-23 | 附件 | 按模型能力附文本 / 图片；超限有提示 | 已交付 |
| AI-24 | 多对话 | 按思维导图持久化对话列表；可新建 / 切换 / 删除 | 已交付 |
| AI-25 | 操作落图 | Agent 返回的 ops 应用到编辑器并进入撤销栈 | 已交付 |

旧式离散动作（`generateFromTopic` / `expandNode` / `explainNode` / `simplifyNode`）仍保留在 IPC，**产品面以 Agent 为主**，无独立「展开 / 解释 / 简化」按钮。

### 3.5 思维导图 Style（MapStyle）

整图级外观预设字段：`classic` / `compact` / `card`。布局 metrics 与 CSS 类已实现。

| ID | 需求 | 状态 |
|----|------|------|
| S-01 | 文件与领域模型含 `mapStyle`；新建默认 `classic` | 已交付 |
| S-02 | 三套布局间距与节点外形 CSS | 已交付 |
| S-03 | 画布工具条切换入口 + 整次可撤销 | **未交付**（与 design-system「无 MapStyle 切换」一致，列入后续） |

### 3.6 导出 / 导入

#### 权威交换格式

扩展名：`.dmm.json`。同版本往返须无损还原节点树、布局坐标、`mapStyle`、标题与元数据。

| ID | 需求 | 状态 |
|----|------|------|
| X-01 | 磁盘思维导图即为 `MindMapFile`（含 `schemaVersion`） | 已交付 |
| X-02 | 导出写文件 / 导入读文件 IPC | 部分就绪 |
| X-03 | schema 不兼容时阻断并提示 | 校验已有 |
| X-04 | PNG / SVG / Markdown / PDF | Markdown 转换有；栅格化与 UI **未交付** |
| X-05 | Markdown 尽力而为导入 | 转换有；UI **未交付** |
| X-06 | 系统对话框 / 拖入导入 | 对话框 IPC 有；产品入口 **未交付** |

### 3.7 导出文档 Schema（文档级）

权威表示：**`parentId` + `order` 树**（无独立 `edges` 数组）。

```json
{
  "schemaVersion": 1,
  "app": "deep-mind-map",
  "updatedAt": "ISO-8601",
  "exportedAt": "ISO-8601",
  "map": {
    "id": "uuid",
    "title": "string",
    "mapStyle": "classic | compact | card",
    "folderId": "uuid | null",
    "nodes": [
      {
        "id": "uuid",
        "parentId": "uuid | null",
        "text": "string",
        "x": 0,
        "y": 0,
        "color": "token-or-hex | null",
        "collapsed": false,
        "order": 0
      }
    ]
  }
}
```

`schemaVersion` 递增时须提供迁移或明确不兼容提示。当前仅 v1。

### 3.8 GitHub 同步（用户自有仓库）

将本地 Library 中的思维导图以 `.dmm.json` 同步到用户**自己的** GitHub 仓库。本地仍为权威工作副本；不同步 AI Key / Provider 配置。

#### 配置

| 配置项 | 默认 / 说明 |
|--------|-------------|
| GitHub 授权 | **OAuth Device Flow**；Token 本机 `safeStorage` 加密保存 |
| 同步仓库 | 连接后自动查找或创建私有仓 `deep-mind-map`，导图同步到仓库根目录 |
| 分支 | 默认仓库的 `default_branch` |
| 显示用 GitHub 用户名 | 授权成功后自动回填 |

**不支持**手动粘贴 PAT。

#### 需求与验收

| ID | 需求 | 状态 |
|----|------|------|
| GH-01 | 设置页 Device Flow 连接；Token 不回传渲染进程明文 | 已交付 |
| GH-02 | 连接后自动绑定 / 创建 `deep-mind-map` 并写入设置 | 已交付 |
| GH-03 | 测试连接 | 已交付 |
| GH-04 | 手动推送 `.dmm.json` | 已交付 |
| GH-05 | 手动拉取写入本地图库 | 已交付 |
| GH-06 | 目录镜像本地文件夹结构 | 已交付 |
| GH-07 | 未授权时引导至设置 | 已交付 |
| GH-08 | 仅手动触发 | 已交付 |
| GH-09 | 不同步 AI 配置与 Token | 已交付 |
| GH-10 | 冲突：保留本地 / 使用远端 / 跳过 | 已交付 |
| GH-11 | 同步进度文案 | 已交付 |
| GH-12 | 断开并清除 Token | 已交付 |

#### 错误映射（中文提示）

| 情况 | 用户可见说明 |
|------|----------------|
| 401 | 授权无效或已过期，请重新连接 GitHub |
| 403 | 无权限写入该仓库，请检查授权范围与仓库访问 |
| 404 | 仓库或路径不存在，请检查仓库与分支 |
| 网络失败 / 超时 | 网络不可用，请稍后重试 |
| 授权超时 / 拒绝 | 授权超时或已取消，请重新连接 |
| 分支保护等拒绝推送 | 无法推送到该分支，请更换分支或调整仓库设置 |

#### 同步内容边界

- **同步**：`.dmm.json`（与本地权威格式一致）
- **不同步**：PNG / SVG / Markdown / PDF、AI 配置、OAuth Token、Agent 对话文件、应用外观偏好

---

## 4. 核心用户旅程

### 旅程 A：首次生成（Agent）

1. 安装并打开应用  
2. 首次引导配置 Provider / Key / 模型，「测试连接」成功（或跳过）  
3. 侧栏「新建思维导图」，打开画布  
4. 打开右下 AI 浮岛，Agent 模式输入主题或粘贴笔记，确认工具改图  
5. 手动用 Tab / Enter / 删除精修；⌘Z 撤销  

### 旅程 B：无 AI 纯编辑

1. 跳过 AI 配置  
2. 手动从中心主题搭建思维导图  
3. 稍后在设置中配置 AI 再使用 Agent  

### 旅程 C：GitHub 同步备份与换机

1. 设置中「连接 GitHub」，授权后选择（或新建）仓库，测试连接  
2. 「推送到 GitHub」，等待完成 Toast  
3. 机器 B 同样连接并选择同一仓库，拉取  
4. 若冲突，选择保留本地 / 使用远端 / 跳过  

### 旅程 D：本地文件往返（后续）

导出 / 导入 UI 交付后：机器 A 导出 `.dmm.json` → 机器 B 导入 → 结构与布局一致。

---

## 5. 领域模型

| 实体 | 说明 | 关键字段 |
|------|------|----------|
| `MindMap` | 一份思维导图 | `id`, `title`, `mapStyle`, `folderId`, `nodes` |
| `MindNode` | 节点 | `id`, `parentId`, `text`, `x`, `y`, `color`, `collapsed`, `order` |
| `MindMapFile` | 磁盘 / 交换文档 | `schemaVersion`, `app`, `updatedAt`, `map` |
| `LibraryFolder` | 图库文件夹 | `id`, `name`, `parentId` |
| `AIProviderConfig` / `AiSettings` | AI 配置 | `providerType`, `baseUrl`, `model`, `temperature`（Key 在 secrets） |
| `AiConversation` | 某思维导图下的 Agent 对话 | `id`, `mapId`, `title`, `messages` |
| `MapStylePreset` | 外观预设 ID | `classic` \| `compact` \| `card`（UI 切换后续） |
| `GitHubSyncConfig` | GitHub 同步 | `owner`, `repo`, `branch`, `pathPrefix`, `displayName`（Token 在 secrets） |
| `SyncRunResult` | 一次推送或拉取结果 | `direction`, `written`, `skipped`, `conflicts` |
| `ThemeMode` | 应用壳主题 | `system` \| `light` \| `dark` |

不含：产品方云用户、订阅、协作会话、Presence、独立 Edge 实体。

---

## 6. 成功指标与约束

### 6.1 指标（质性验收）

| 指标 | 目标 |
|------|------|
| 激活 | 首次启动完成 AI 配置（或跳过）并成功保存 ≥1 张思维导图 |
| Agent | 配置正确时主题生成 / 改图可完成；失败有可读原因与中止 |
| 往返 | 同版本 `.dmm.json` 结构与布局可还原（待导入导出 UI） |
| GitHub | 推送后拉取结构一致；冲突可选手动解决 |

### 6.2 约束

- UI 简体中文优先  
- API Key 与 GitHub Token 不进思维导图文件、不进日志明文  
- 无网：编辑可用；AI、GitHub 离线时禁用并提示  
- AI / GitHub 错误映射为中文说明  

### 6.3 隐私

- 默认所有思维导图仅存本机  
- AI 请求内容发送至用户配置的第三方 / 本地端点；设置页需简短披露  
- GitHub 同步将思维导图写入用户指定仓库；公开仓库勿放敏感内容  
- Agent 对话存于本机 `library/agent-chats/`，**不同步**到 GitHub  

---

## 7. 里程碑

| 阶段 | 交付 | 状态 |
|------|------|------|
| M1 | 图库 + 画布 CRUD + 本地保存 + 工作区壳 | 已完成 |
| M2 | 自配 AI + Agent（Ask/Agent）+ 对话持久化 | 已完成 |
| M3 | MapStyle 切换 UI（若产品重新启用） | 未做 |
| M4 | 导入导出产品入口 + 分享格式 | 未做 |
| M5 | GitHub Device Flow + 推送 / 拉取 + 冲突 | 已完成 |

---

## 8. 术语表

| 术语 | 含义 |
|------|------|
| Library | 个人图库 |
| Map / MindMap | 思维导图文档 |
| Node | 节点（`parentId` 树） |
| MapStyle | 整图外观预设字段；当前无切换 UI |
| Provider | 用户配置的 AI 服务（`openai-compatible` / `anthropic` / `ollama`） |
| Agent | 画布 AI 浮岛主路径；Ask 只读、Agent 可写工具改图 |
| Ask | 只回答、不改图的对话模式 |
| ExportDocument / MindMapFile | 可持久化与交换的 `.dmm.json` |
| Device Flow | GitHub OAuth 设备码授权 |
| GitHub Sync | 手动推送 / 拉取到用户自有仓库 `deep-mind-map` 根目录 |
| ThemeMode | 应用壳浅色 / 深色 / 跟随系统 |
| 开源仓库 | 本产品的公开代码仓库（通常 ≠ 同步目标仓） |

视觉规格 → [design-system.md](./design-system.md)。  
技术架构 → [tech-design.md](./tech-design.md)。
