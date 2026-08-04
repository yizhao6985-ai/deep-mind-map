# UI 对照审计 — design-system v0.6

对照 [design-system.md](./design-system.md) 与 `src/styles/tokens.css` / 组件实现。审计日期：2026-08-04。

## 已修复

| 问题 | 处理 |
|------|------|
| 文档色板与 Soft Graphite token 不一致 | 文档改为以 `tokens.css` 为准 |
| 文档仍写「8px 关节圆点」，实现已是不可见锚点 | 文档 §5.6 改为不可见 handle |
| 分支色硬编码且浅/深/TS 三处不一致 | 新增 `--branch` / `--branch-hot`，TS 与 CSS 统一走变量 |
| 半拍间距：菜单偏移 6、ctx padding 3、步骤 gap 6、meta gap 6、quote 10、附件 14 | 改为 `--s*` token |
| `font-size: 11.5px` | 改为 11（Micro） |
| 深层节点 padding `6px 12px` | 改为 `8px 12px`（`--s2` / `--s3`） |
| 未使用的 `settings-shell` / `56px` 顶栏 / `settings-group` / `settings-panel__*` / `.chrome-b` 类 | 删除死 CSS |
| 未挂载的 `map-style-compact` / `map-style-card` | 删除死 CSS |

## 仍可接受 / 暂不改

| 项 | 原因 |
|----|------|
| 根节点圆角 14、一级 padding 8×14 | 节点规格特例，已写入文档 |
| 节点 chrome 18px 圆钮 `999px` | 等宽等高例外，已写入原则 |
| AI / 折叠 Nano 字号 9–10 | 仅徽标与折叠计数，已写入字体表 |
| Ask/Agent 分段高 22 | 底边墨条微控件，非壳层控件高度 |
| 墨条选中上下缩 6px | 视觉裁剪，非布局间距 |
| `mapStyle` 文件字段仍存在 | 布局算法用；无 UI 切换，符合 PRD |

## 建议后续（未动手）

1. **兼容别名** `--color-amber-*` → ink：保留无害，但新代码勿再引用 amber 语义名。

## 本轮追加（已修）

| 问题 | 处理 |
|------|------|
| 侧栏树选中 `--surface`、设置导航选中 `--hover` | 统一为 `--hover` + 左侧墨条 |
| 一级节点描边 `#bdbdbd` / 深色 `#575757` 硬编码 | 升为 `--line-node` |
