import type { AiTreeDraft, AiTreeNode, MindMap, MindNode } from '../types/domain'
import { createEmptyMap } from './tree'
import { layoutMindMap } from './layout'
import { v4 as uuid } from 'uuid'

function walk(
  draft: AiTreeNode,
  parentId: string,
  order: number,
  acc: MindNode[]
): void {
  const id = draft.id || uuid()
  acc.push({
    id,
    parentId,
    text: draft.text || '节点',
    x: 0,
    y: 0,
    color: null,
    collapsed: false,
    order
  })
  ;(draft.children ?? []).forEach((c, i) => walk(c, id, i, acc))
}

export function draftToMindMap(draft: AiTreeDraft, folderId: string | null = null): MindMap {
  const title = draft.title || draft.rootText || '未命名思维导图'
  const rootId = uuid()
  const nodes: MindNode[] = [
    {
      id: rootId,
      parentId: null,
      text: draft.rootText || title,
      x: 0,
      y: 0,
      color: null,
      collapsed: false,
      order: 0
    }
  ]
  ;(draft.children ?? []).forEach((c, i) => walk(c, rootId, i, nodes))
  const map: MindMap = {
    id: uuid(),
    title,
    mapStyle: 'classic',
    folderId,
    nodes
  }
  return { ...map, nodes: layoutMindMap(nodes, 'classic') }
}

export function appendChildrenFromDraft(
  map: MindMap,
  parentId: string,
  children: AiTreeNode[]
): MindMap {
  const nodes = map.nodes.map((n) => ({ ...n }))
  const existing = nodes.filter((n) => n.parentId === parentId)
  let order = existing.length
  for (const c of children) {
    walk(c, parentId, order++, nodes)
  }
  return {
    ...map,
    nodes: layoutMindMap(nodes, map.mapStyle)
  }
}

export function mapToMarkdown(map: MindMap): string {
  const lines: string[] = [`# ${map.title}`, '']
  const root = map.nodes.find((n) => n.parentId === null)
  if (!root) return lines.join('\n')

  const render = (id: string, depth: number) => {
    const node = map.nodes.find((n) => n.id === id)
    if (!node) return
    if (depth === 0) {
      lines.push(`## ${node.text}`)
    } else {
      lines.push(`${'  '.repeat(depth - 1)}- ${node.text}`)
    }
    map.nodes
      .filter((n) => n.parentId === id)
      .sort((a, b) => a.order - b.order)
      .forEach((c) => render(c.id, depth + 1))
  }
  render(root.id, 0)
  return lines.join('\n') + '\n'
}

export function markdownToDraft(markdown: string): AiTreeDraft {
  const lines = markdown.split(/\r?\n/).map((l) => l.trimEnd())
  let title = '导入的思维导图'
  const rootText = '中心主题'
  const children: AiTreeNode[] = []
  const stack: { depth: number; node: AiTreeNode }[] = []

  for (const line of lines) {
    const h = /^(#+)\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const text = h[2].trim()
      if (level === 1) {
        title = text
        continue
      }
      if (level === 2) {
        // treat as root text override via title/root
        continue
      }
    }
    const m = /^(\s*)[-*]\s+(.*)$/.exec(line)
    if (!m) continue
    const depth = Math.floor((m[1].replace(/\t/g, '  ').length) / 2)
    const node: AiTreeNode = { text: m[2].trim(), children: [] }
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop()
    if (stack.length === 0) {
      children.push(node)
      stack.push({ depth, node })
    } else {
      const parent = stack[stack.length - 1].node
      parent.children = parent.children ?? []
      parent.children.push(node)
      stack.push({ depth, node })
    }
  }

  const h2 = lines.find((l) => /^##\s+/.test(l))
  const rt = h2 ? h2.replace(/^##\s+/, '').trim() : title

  return { title, rootText: rt || rootText, children }
}

export { createEmptyMap }
