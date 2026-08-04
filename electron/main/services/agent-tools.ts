import { tool } from 'ai'
import { z } from 'zod'
import { v4 as uuid } from 'uuid'
import type { AiAgentOp, AiTreeDraft, AiTreeNode } from '@shared/types/domain'

export type MapNodeSnap = {
  id: string
  parentId: string | null
  text: string
  order: number
}

const treeNodeSchema: z.ZodType<AiTreeNode> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    text: z.string(),
    children: z.array(treeNodeSchema).optional()
  })
)

const treeDraftSchema = z.object({
  title: z.string().optional(),
  rootText: z.string(),
  children: z.array(treeNodeSchema).optional().default([])
})

function getChildren(nodes: MapNodeSnap[], parentId: string): MapNodeSnap[] {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.order - b.order)
}

function buildOutline(nodes: MapNodeSnap[]): string {
  const root = nodes.find((n) => n.parentId === null)
  if (!root) return '（空图）'
  const lines: string[] = []
  const walk = (node: MapNodeSnap, depth: number) => {
    lines.push(`${'  '.repeat(depth)}- [${node.id}] ${node.text}`)
    for (const child of getChildren(nodes, node.id)) walk(child, depth + 1)
  }
  walk(root, 0)
  return lines.join('\n')
}

function findNodes(nodes: MapNodeSnap[], query: string, limit = 12): MapNodeSnap[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored = nodes
    .map((n) => {
      const t = n.text.toLowerCase()
      let score = 0
      if (t === q) score = 100
      else if (t.includes(q)) score = 80
      else if (q.includes(t) && t.length >= 2) score = 60
      else {
        const parts = q.split(/\s+/).filter(Boolean)
        if (parts.every((p) => t.includes(p))) score = 50
      }
      return { n, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.n)
}

function pathOf(nodes: MapNodeSnap[], nodeId: string): string {
  const parts: string[] = []
  let cur = nodes.find((n) => n.id === nodeId)
  while (cur) {
    parts.unshift(cur.text)
    cur = cur.parentId ? nodes.find((n) => n.id === cur!.parentId) : undefined
  }
  return parts.join(' › ')
}

function assignIds(nodes: AiTreeNode[]): AiTreeNode[] {
  return nodes.map((n) => ({
    id: n.id || uuid(),
    text: n.text,
    children: n.children ? assignIds(n.children) : undefined
  }))
}

function draftToSnaps(draft: AiTreeDraft): MapNodeSnap[] {
  const rootId = uuid()
  const snaps: MapNodeSnap[] = [
    { id: rootId, parentId: null, text: draft.rootText || draft.title || '中心主题', order: 0 }
  ]
  const walk = (list: AiTreeNode[], parentId: string) => {
    list.forEach((c, i) => {
      const id = c.id || uuid()
      snaps.push({ id, parentId, text: c.text || '节点', order: i })
      if (c.children?.length) walk(c.children, id)
    })
  }
  walk(draft.children ?? [], rootId)
  return snaps
}

function appendDraftChildren(
  nodes: MapNodeSnap[],
  parentId: string,
  children: AiTreeNode[]
): { nodes: MapNodeSnap[]; children: AiTreeNode[] } {
  const withIds = assignIds(children)
  const next = [...nodes]

  const append = (list: AiTreeNode[], pid: string) => {
    let order = getChildren(next, pid).length
    for (const c of list) {
      const id = c.id!
      next.push({ id, parentId: pid, text: c.text || '节点', order: order++ })
      if (c.children?.length) append(c.children, id)
    }
  }
  append(withIds, parentId)
  return { nodes: next, children: withIds }
}

export function createMindMapAgentTools(
  initial: MapNodeSnap[],
  mapTitle: string,
  options?: { readOnly?: boolean }
) {
  let nodes = initial.map((n) => ({ ...n }))
  const operations: AiAgentOp[] = []
  const maxOps = 5
  const readOnly = options?.readOnly === true

  const pushOp = (op: AiAgentOp) => {
    if (operations.length >= maxOps) {
      return { ok: false as const, error: `本轮最多 ${maxOps} 个改图操作` }
    }
    operations.push(op)
    return { ok: true as const }
  }

  const allTools = {
    getMapOutline: tool({
      description: '获取当前思维导图完整大纲（含节点 id）。需要了解结构时先调用。',
      inputSchema: z.object({}),
      execute: async () => ({
        title: mapTitle,
        outline: buildOutline(nodes),
        nodeCount: nodes.length
      })
    }),

    findNodes: tool({
      description: '按关键词在思维导图中查找节点，返回匹配的 id、文案与路径。用户提到某个概念时用此工具定位，不要要求用户选中节点。',
      inputSchema: z.object({
        query: z.string().describe('要查找的关键词或短语'),
        limit: z.number().int().min(1).max(20).optional()
      }),
      execute: async ({ query, limit }) => {
        const hits = findNodes(nodes, query, limit ?? 12)
        return {
          query,
          matches: hits.map((n) => ({
            id: n.id,
            text: n.text,
            parentId: n.parentId,
            path: pathOf(nodes, n.id),
            childCount: getChildren(nodes, n.id).length
          }))
        }
      }
    }),

    getNode: tool({
      description: '查看某个节点的详情及其直接子节点。',
      inputSchema: z.object({
        nodeId: z.string().describe('节点 id')
      }),
      execute: async ({ nodeId }) => {
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) return { ok: false as const, error: '节点不存在' }
        const children = getChildren(nodes, nodeId)
        return {
          ok: true as const,
          id: node.id,
          text: node.text,
          parentId: node.parentId,
          path: pathOf(nodes, node.id),
          children: children.map((c) => ({
            id: c.id,
            text: c.text,
            childCount: getChildren(nodes, c.id).length
          }))
        }
      }
    }),

    replaceMap: tool({
      description: '用新的树结构整图替换（生成/重做整图、把讨论沉淀成新结构时使用）。',
      inputSchema: z.object({ draft: treeDraftSchema }),
      execute: async ({ draft }) => {
        const children = assignIds(draft.children ?? [])
        const full: AiTreeDraft = {
          title: draft.title,
          rootText: draft.rootText,
          children
        }
        const queued = pushOp({ type: 'replaceMap', draft: full })
        if (!queued.ok) return queued
        nodes = draftToSnaps(full)
        return { ok: true as const, message: '已排队整图替换', outline: buildOutline(nodes) }
      }
    }),

    expandNode: tool({
      description: '在已有节点下追加一组子节点。必须使用 findNodes/getMapOutline 得到的真实 nodeId。',
      inputSchema: z.object({
        nodeId: z.string(),
        children: z.array(treeNodeSchema).min(1)
      }),
      execute: async ({ nodeId, children }) => {
        if (!nodes.some((n) => n.id === nodeId)) {
          return { ok: false as const, error: 'nodeId 不存在，请先 findNodes / getMapOutline' }
        }
        const { nodes: next, children: withIds } = appendDraftChildren(nodes, nodeId, children)
        const queued = pushOp({ type: 'expandNode', nodeId, children: withIds })
        if (!queued.ok) return queued
        nodes = next
        return {
          ok: true as const,
          message: `已在节点下追加 ${withIds.length} 个子节点`,
          children: withIds.map((c) => ({ id: c.id, text: c.text }))
        }
      }
    }),

    updateNodeText: tool({
      description: '改写某个已有节点的文案。',
      inputSchema: z.object({
        nodeId: z.string(),
        text: z.string().min(1)
      }),
      execute: async ({ nodeId, text }) => {
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) return { ok: false as const, error: 'nodeId 不存在' }
        const queued = pushOp({ type: 'updateNodeText', nodeId, text })
        if (!queued.ok) return queued
        node.text = text
        return { ok: true as const, id: nodeId, text }
      }
    }),

    addChild: tool({
      description: '在已有父节点下新增一个子节点。',
      inputSchema: z.object({
        parentId: z.string(),
        text: z.string().min(1)
      }),
      execute: async ({ parentId, text }) => {
        if (!nodes.some((n) => n.id === parentId)) {
          return { ok: false as const, error: 'parentId 不存在' }
        }
        const nodeId = uuid()
        const queued = pushOp({ type: 'addChild', parentId, text, nodeId })
        if (!queued.ok) return queued
        const order = getChildren(nodes, parentId).length
        nodes.push({ id: nodeId, parentId, text, order })
        return { ok: true as const, id: nodeId, parentId, text }
      }
    }),

    deleteNode: tool({
      description: '删除某个非根节点（及其子树会在客户端一并删除）。',
      inputSchema: z.object({
        nodeId: z.string()
      }),
      execute: async ({ nodeId }) => {
        const node = nodes.find((n) => n.id === nodeId)
        if (!node) return { ok: false as const, error: 'nodeId 不存在' }
        if (node.parentId === null) return { ok: false as const, error: '不能删除根节点' }
        const queued = pushOp({ type: 'deleteNode', nodeId })
        if (!queued.ok) return queued
        const drop = new Set<string>()
        const collect = (id: string) => {
          drop.add(id)
          for (const c of getChildren(nodes, id)) collect(c.id)
        }
        collect(nodeId)
        nodes = nodes.filter((n) => !drop.has(n.id))
        return { ok: true as const, deleted: [...drop] }
      }
    })
  }

  const tools = readOnly
    ? {
        getMapOutline: allTools.getMapOutline,
        findNodes: allTools.findNodes,
        getNode: allTools.getNode
      }
    : allTools

  return {
    tools,
    getOperations: () => (readOnly ? [] : operations.filter((op) => op.type !== 'none'))
  }
}
