# Deep Mind Map — 视觉设计规范

| 字段 | 内容 |
|------|------|
| 产品名 | Deep Mind Map |
| 版本 | MVP 0.1 |
| 关联文档 | [产品需求文档（PRD）](./PRD.md) |
| 适用 | 本地 Electron 桌面端（开源项目） |
| 状态 | Draft |

本文档服务个人学习场景下的桌面学习画布：本地生产力工具气质、自配 AI、单人编辑、三套 MapStyle、导出/导入、可选 GitHub 同步到用户自有仓库。产品范围与术语以 [PRD](./PRD.md) 为准。

---

## 1. 设计原则

1. **专注**：画布是主角；壳层控件克制，避免仪表盘感。
2. **本地工具感**：明亮、清晰、可预期；像专业桌面软件，而非营销站套壳。
3. **品牌可识别**：空状态与图库首页品牌名足够醒目；画布中心主题节点为视觉锚点。
4. **结构优先于装饰**：节点层级靠字号、描边、色阶表达，不靠炫光与多重阴影。
5. **一种作业一处入口**：AI、外观、导出、GitHub 分区明确，不堆叠浮动贴纸。

### 1.1 明确避免

- 紫/靛蓝渐变作为品牌主色
- 暖奶油底 + 陶土强调的「AI 默认审美」
- 报纸风细线多栏排版
- 默认 Inter / Roboto / Arial / 系统字体栈作为品牌展示字体
- 暗黑模式作为 MVP 默认（可后续加，非默认）

---

## 2. 品牌与气质

| 维度 | 定义 |
|------|------|
| 气质 | 安静求知 × 本地生产力 |
| 默认主题 | 明亮（Light） |
| 品牌名 | Deep Mind Map |
| 品牌信号 | 启动空状态、图库首页标题区使用展示字体大号品牌名；勿把品牌缩成仅顶栏小字 |

窗口：尊重系统标题栏 / macOS 交通灯；自定义标题栏时预留安全点击区，不与窗口控件重叠。

---

## 3. 设计 Token

实现时映射为 CSS 变量（下列命名为规范名）。

### 3.1 色彩 — 应用壳（App Shell）

| Token | 值 | 用途 |
|-------|-----|------|
| `--color-forest-900` | `#0F2E1F` | 主文字、关键图标 |
| `--color-forest-700` | `#1B4D36` | 主色、顶栏强调 |
| `--color-forest-500` | `#2F6B4F` | 主按钮、选中导航 |
| `--color-forest-100` | `#E4F0EA` | 轻量底、Hover 浅底 |
| `--color-amber-600` | `#C47A12` | AI / 焦点强调 |
| `--color-amber-400` | `#E8A23A` | AI 进行中高亮、焦点环 |
| `--color-amber-100` | `#FBF0DE` | AI 面板浅底 |
| `--color-ink-900` | `#1A1C1B` | 正文 |
| `--color-ink-600` | `#5C635F` | 次要文字 |
| `--color-ink-400` | `#8B928E` | 占位、禁用 |
| `--color-paper-50` | `#F4F6F5` | 窗口/侧栏底 |
| `--color-paper-0` | `#FFFFFF` | 面板、输入底 |
| `--color-canvas` | `#EBEEEC` | 画布纸面（冷灰） |
| `--color-danger-600` | `#B42318` | 破坏性操作 |
| `--color-success-600` | `#1B7A45` | 成功 / 连接测试通过 |
| `--color-border` | `#D5DBD7` | 默认边框 |
| `--color-border-strong` | `#A8B1AB` | 强调边框 |

对比度：正文与底 ≥ 4.5:1；主按钮文字在 Forest 上使用白 `#FFFFFF`。

### 3.2 色彩 — 语义

| 语义 | Token |
|------|-------|
| Primary | `--color-forest-500` |
| Accent / AI | `--color-amber-600` |
| Surface | `--color-paper-0` / `--color-paper-50` |
| Canvas | `--color-canvas` |
| Danger | `--color-danger-600` |

### 3.3 字体

| Token | 建议字体 | 用途 |
|-------|----------|------|
| `--font-display` | Satoshi 或 Instrument Sans | 品牌名、空状态大标题、图库页标题 |
| `--font-body` | IBM Plex Sans 或 Geist | 界面正文、节点默认文案 |
| `--font-mono` | IBM Plex Mono / Geist Mono | Base URL、JSON、错误码、`owner/repo`、路径前缀 |

回退：`display` → `"Satoshi", "Instrument Sans", "Segoe UI", sans-serif`；禁止把 Inter/Roboto 写进品牌栈首位。

| 层级 | 大小 / 行高 / 字重 |
|------|-------------------|
| Display | 32–40 / 1.2 / 600 |
| Title | 20–24 / 1.3 / 600 |
| Body | 14 / 1.5 / 400 |
| Body Strong | 14 / 1.5 / 600 |
| Caption | 12 / 1.4 / 400 |
| Node L0（中心） | 16–18 / 1.3 / 600 |
| Node L1 | 14 / 1.3 / 500 |
| Node L2+ | 13 / 1.3 / 400 |

### 3.4 间距、圆角、阴影

| Token | 值 |
|-------|-----|
| `--space-1` … `--space-8` | 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px |
| `--radius-sm` | 6px |
| `--radius-md` | 10px |
| `--radius-lg` | 14px |
| `--shadow-sm` | `0 1px 2px rgba(15,46,31,0.06)` |
| `--shadow-md` | `0 4px 12px rgba(15,46,31,0.08)` |
| `--shadow-card` | `0 2px 8px rgba(15,46,31,0.10)`（Card Style 节点） |

应用壳避免多层大阴影；画布节点阴影仅 Card 预设使用 `--shadow-card`。

### 3.5 动效（有意的 3 种）

| 名称 | 用途 | 规格 |
|------|------|------|
| `ai-pulse` | AI 生成中节点 / 面板 | 透明度 0.55↔1，1.2s ease-in-out 循环；或骨架闪光 |
| `style-crossfade` | MapStyle 切换 | 节点外形与色 180–220ms ease-out；布局位移同时长 |
| `toast-in` | 导出/导入完成、连接成功、GitHub 推送/拉取完成 | 自顶栏下方 12px 滑入 + fade，180ms |

同步进行中使用按钮 loading / 进度条文案即可，**不新增**第四种装饰性动效。

禁用无意义的无限 parallax、整页光斑漂移。

---

## 4. 布局结构

### 4.1 最小窗口

- 最小宽度：1080px  
- 最小高度：680px  
- 高 DPI：图标与节点边框使用 1×/2× 资源或矢量  

### 4.2 编辑态骨架

```
┌─────────────────────────────────────────────┐
│ TitleBar / App Menu                         │
├──────────┬──────────────────────────────────┤
│ Library  │  Toolbar (AI / 外观 / 导出…)      │
│ Sidebar  ├──────────────────────────────────┤
│ ~240px   │                                  │
│          │           Canvas                 │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

- 侧栏：图库树 + 新建；可折叠；可放「推送到 GitHub / 从 GitHub 拉取」次要入口  
- 顶栏工具：文件操作、AI、外观（MapStyle）、导出/导入、GitHub  
- 右侧可选 AI 面板（打开时约 320px），不盖住中心主题节点关键操作区  

卡片仅用于：图库列表项、设置分组、对话框。画布本身与英雄区不用卡片墙。

### 4.3 图库首页 / 空状态

- 大号品牌名（Display）  
- 一句短说明（如「用你自己的 AI，在本地生成思维导图」）  
- 主 CTA：新建脑图；次 CTA：导入 `.dmm.json` / 配置 AI / 配置 GitHub 同步  
- 背景：`--color-paper-50` 上轻微冷灰网格或纸感纹理即可，勿用紫渐变  

### 4.4 应用设置页分组

设置页纵向分组，视觉权重一致：

1. 图库与存储路径  
2. AI 配置（见 §6.6）  
3. **GitHub 同步**（见 §6.10）  
4. 外观（应用壳） / 关于  

每组：Title + Caption 说明 + 表单；组间 `--space-6` 分隔，可选细分割线。

---

## 5. MapStyle 视觉规格

三套预设共享应用壳 Token，但节点 / 连线 / 间距不同。`mapStyle` 字段见 [PRD](./PRD.md)。

### 5.1 Classic（经典）— 默认

| 项 | 规格 |
|----|------|
| 布局倾向 | 中心主题，左右（或右向）分支 |
| 中心节点 | 填充 `--color-forest-700`，文字白，圆角胶囊 `--radius-lg`，内边距 12×16 |
| L1 节点 | 填充 `--color-paper-0`，描边 `--color-forest-500`，文字 `--color-ink-900`，胶囊 |
| L2+ | 浅底 `--color-forest-100` 或白底细描边，字号 Caption/Body 偏小 |
| 连线 | 平滑曲线，色按分支取 Forest 色阶，线宽 1.5–2px |
| 间距 | 水平 64–80px，垂直 28–36px |
| 阴影 | 无或极弱 |

### 5.2 Compact（紧凑）

| 项 | 规格 |
|----|------|
| 目标 | 大图总览，同屏更多节点 |
| 节点 | 更小内边距（6×10），圆角 `--radius-sm`，字号整体 -1 |
| 中心 | Forest-700，仍可识别但体量小于 Classic |
| 连线 | 折线或短曲线，线宽 1px，`--color-ink-400` |
| 间距 | 水平 40–52px，垂直 16–22px |
| 色阶 | 层级主要靠字重与描边深浅，少用大色块 |

### 5.3 Card（卡片）

| 项 | 规格 |
|----|------|
| 节点外形 | 圆角矩形 `--radius-md`，白底，`--shadow-card` |
| 中心 | 较大卡片，顶条或左边条使用 `--color-forest-500` |
| L1 | 左边条 Amber 或 Forest-100 区分分支 |
| 连线 | 直角/折线，浅灰 `--color-border-strong`，线宽 1.5px |
| 间距 | 水平 72–96px，垂直 32–40px |
| 注意 | 阴影仅一层；禁止玻璃拟态叠层 |

### 5.4 Style 切换控件

- 形式：分段控件（Segmented control）三档，标签「经典 / 紧凑 / 卡片」  
- 位置：画布工具条「外观」区  
- 选中态：Forest 填充 + 白字；未选：浅底  
- 切换时播放 `style-crossfade`；若触发布局重算，整段可撤销（PRD S-03）  

---

## 6. 组件规范

### 6.1 按钮

| 变体 | 样式 |
|------|------|
| Primary | 底 `--color-forest-500`，字白，圆角 `--radius-md`，高 36px |
| Secondary | 白底 + `--color-border`，字 Forest-700 |
| Ghost | 透明底，Hover `--color-forest-100` |
| Danger | 底透明字 Danger，确认对话框主按钮可用实心 Danger |
| AI | 底 `--color-amber-100`，字 `--color-amber-600`，或描边 Amber |

状态：Hover 略加深；Disabled 透明度 0.4；Focus 可见环 `0 0 0 2px amber-400`。

### 6.2 输入

- 高 36px，圆角 `--radius-sm`，边框 `--color-border`  
- Focus：边框 Forest-500 + Amber focus ring  
- 错误：边框 Danger + 下方 Caption 错误文案  
- AI 设置中的 Key、GitHub PAT 输入：默认可掩码，提供显示切换  

### 6.3 对话框 / Toast

- 对话框：白底、`--shadow-md`、最大宽 480px；标题 Title，操作右对齐  
- Toast：顶栏下居中或右上；成功用 Success 左边条；错误用 Danger；时长 3–4s  

### 6.4 工具条

- 高 44–48px，底 `--color-paper-0`，底部分割线 `--color-border`  
- 图标 + 短标签；溢出收入「更多」  
- 分组：文件 | 编辑 | AI | 外观 | 导出 | GitHub 

### 6.5 AI 面板

- 浅底 `--color-amber-100` 顶区标识「AI」  
- 操作列表：生成整图、粘贴转图、展开、解释、简化  
- 生成中：`ai-pulse` + 取消按钮  
- 未配置 Provider：空状态引导「去配置 AI」  

### 6.6 AI 配置表单

- 字段：Provider 类型、Base URL、API Key、模型、温度、测试连接  
- 「测试连接」成功 → Toast + 字段旁 Success 勾  
- 失败 → 内联错误（勿仅 console）  

### 6.7 导出 / 导入面板

- 列出格式：`.dmm.json`（无损）、PNG、SVG、Markdown、PDF  
- `.dmm.json` 旁标注「推荐 · 可完整还原」  
- Markdown 导入旁标注「尽力而为 · 可能丢失布局与外观」  
- 主按钮清晰区分「导出」与「导入」  

### 6.8 图库列表项

- 可视为轻量交互卡片：左图标、标题、更新时间；Hover 浅底；选中 Forest-100  
- 勿用厚阴影卡片网格堆砌  

### 6.9 节点交互态（所有 Style 共用）

| 状态 | 表现 |
|------|------|
| Default | 见各 MapStyle |
| Hover | 描边略加深或亮度 +4% |
| Selected | Amber focus ring 2px；可显示拖拽柄 |
| Editing | 内联编辑框，边框 Forest |
| AI pending | `ai-pulse` |
| Collapsed | 角标或圆点提示隐藏子树数量 |

### 6.10 GitHub 同步设置与操作

与 AI 配置表单同级，使用同一套输入 / 按钮规范。

**设置表单字段**

| 字段 | 控件 |
|------|------|
| PAT | 掩码输入 + 显示切换；Caption：「仅存本机，不会写入脑图文件」 |
| owner/repo | 单行 mono 输入，占位 `username/repo` |
| 分支 | 单行，默认已填 `main` |
| 路径前缀 | 单行 mono，默认 `mindmaps/` |
| 显示名 | 可选 |
| 测试连接 | Secondary 按钮；成功 Toast + Success 勾；失败内联错误 |

**操作入口**

- 顶栏 / 图库：「推送到 GitHub」「从 GitHub 拉取」（Secondary；未配置时 Disabled 或点击引导设置）  
- 进行中：按钮 loading + Caption「正在同步 3/12…」  
- 完成：`toast-in` 成功或失败摘要  

**冲突对话框**（见 PRD GH-09）

- 标题：「同步冲突」  
- 正文：文件相对路径 + 本地 / 远端更新时间摘要  
- 操作（右对齐）：「跳过」（Ghost）、「使用远端」（Secondary）、「保留本地」（Primary）  
- 多文件冲突时可「全部应用此选择」复选（可选，文案放 Caption）  
- 最大宽 480px，遵循 §6.3  

**安全展示**

- PAT 永不出现在画布、导出预览、同步进度详情的明文中  
- 错误文案可提示「Token / 权限」，勿回显完整 Token  

---

## 7. 画布规则

1. 画布背景固定 `--color-canvas`，可加极淡点阵（对比度极低）辅助对齐，可开关。  
2. 中心主题节点始终是层级视觉最强元素。  
3. 多选、框选：半透明 Forest-100 矩形。  
4. 小地图（可选 MVP+）：右下角，不挡操作。  
5. 滚动/缩放：触控板双指；按钮「适应画布」「100%」。  
6. 导出位图时使用画布内容边界 + 边距 24–32px，不含应用壳。  

---

## 8. 无障碍与桌面适配

- 可点击目标 ≥ 24×24px（工具条图标建议 32）  
- 焦点顺序：侧栏 → 工具条 → 画布 → 面板  
- 快捷键与鼠标可达同一操作（见 PRD E-07）  
- 色盲：层级不仅靠色，也靠字重与描边；Selected 使用环而非仅变色  
- 不强制移动端布局；窗口缩到最小宽度时侧栏可自动折叠  

---

## 9. Do / Don’t

### Do

- 用 Forest / Amber / 冷灰纸面建立识别  
- 空状态突出品牌名 + 一个主行动  
- Style 切换只改外观，保留内容结构  
- 导出面板写清无损 vs 尽力而为  
- GitHub 设置写清「同步到你自己的仓库」与公开仓库风险提示  

### Don’t

- 紫渐变英雄背景、玻璃光晕堆叠  
- 在画布上贴浮层营销徽章  
- 三套 Style 做成完全无关的另一套品牌色（须服从壳 Token）  
- 把 API Key 或 GitHub PAT 展示在画布、导出预览或 commit 预览明文中  
- 把 GitHub 做成必须登录才能用的产品方云账号墙  

---

## 10. 交付对照

| 产品能力（PRD） | 视觉落点 |
|-----------------|----------|
| Library / Map / Node | 侧栏列表、画布节点 |
| MapStyle | §5 + 分段控件 |
| Provider / AI | AI 按钮、AI 面板、配置表单、`ai-pulse` |
| ExportDocument | 导出/导入面板文案与格式标注 |
| GitHub Sync / PAT / SyncRun | §4.4 设置分组、§6.10 表单与冲突对话框、顶栏推送/拉取、`toast-in` |
| 单人编辑 | 无协作头像条、无他人光标 |

实现新界面时：先查本 Token 与组件表，再查 [PRD](./PRD.md) 验收项（含 GH-01…GH-10）。
