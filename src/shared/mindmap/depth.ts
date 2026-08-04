import type { MindNode } from '../types/domain'

/** Depth from root (0). Missing parents collapse to 0. */
export function nodeDepth(nodes: MindNode[], id: string): number {
  const byId = new Map(nodes.map((n) => [n.id, n]))
  let depth = 0
  let cur = byId.get(id)
  const seen = new Set<string>()
  while (cur?.parentId) {
    if (seen.has(cur.id)) break
    seen.add(cur.id)
    depth += 1
    cur = byId.get(cur.parentId)
  }
  return depth
}
