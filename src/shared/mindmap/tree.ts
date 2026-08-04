import type { MindMap, MindNode } from '../types/domain'
import { v4 as uuid } from 'uuid'

export function createEmptyMap(title = '未命名思维导图', folderId: string | null = null): MindMap {
  const rootId = uuid()
  return {
    id: uuid(),
    title,
    mapStyle: 'classic',
    folderId,
    nodes: [
      {
        id: rootId,
        parentId: null,
        text: title || '中心主题',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      }
    ]
  }
}

export function getRootNode(nodes: MindNode[]): MindNode | undefined {
  return nodes.find((n) => n.parentId === null)
}

export function getChildren(nodes: MindNode[], parentId: string): MindNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.order - b.order)
}

export function collectSubtreeIds(nodes: MindNode[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId])
  const walk = (pid: string) => {
    for (const c of getChildren(nodes, pid)) {
      ids.add(c.id)
      walk(c.id)
    }
  }
  walk(rootId)
  return ids
}
