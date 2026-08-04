import type { MapStyle, MindNode } from '../types/domain'
import { nodeDepth } from './depth'
import { getChildren, getRootNode } from './tree'

export type StyleMetrics = {
  /** Horizontal gap between parent right edge and child left edge */
  hGap: number
  /** Vertical gap between adjacent sibling subtrees */
  vGap: number
  /** Fallback estimated node width (tests / legacy) */
  nodeWidth: number
  /** Fallback estimated node height (tests / legacy) */
  nodeHeight: number
}

export function styleMetrics(style: MapStyle): StyleMetrics {
  switch (style) {
    case 'compact':
      return { hGap: 40, vGap: 14, nodeWidth: 112, nodeHeight: 32 }
    case 'card':
      return { hGap: 64, vGap: 22, nodeWidth: 168, nodeHeight: 44 }
    case 'classic':
    default:
      // Wider hGap leaves room for XMind-like rounded branch elbows.
      return { hGap: 64, vGap: 16, nodeWidth: 152, nodeHeight: 40 }
  }
}

export type NodeSize = { w: number; h: number }
export type NodeSizeMap = ReadonlyMap<string, NodeSize>

/** Matches `.mind-node { --mind-node-max-w }` — text wraps beyond this. */
export const NODE_MAX_WIDTH = 260

/** Approximate rendered label size from CSS tokens (padding + type). */
export function estimateNodeSize(
  node: MindNode,
  depth: number,
  style: MapStyle
): NodeSize {
  const isRoot = depth === 0
  const deep = depth >= 2

  let fontSize: number
  let padX: number
  let padY: number
  let lineHeight: number
  let borderY: number

  if (style === 'compact') {
    fontSize = isRoot ? 14 : deep ? 11 : 12
    padX = isRoot ? 36 : deep ? 18 : 20
    padY = isRoot ? 18 : deep ? 10 : 10
    lineHeight = 1.3
    borderY = isRoot ? 0 : 2
  } else if (style === 'card') {
    fontSize = isRoot ? 15 : deep ? 12 : 13
    padX = isRoot ? 44 : deep ? 28 : 32
    padY = isRoot ? 28 : deep ? 16 : 20
    lineHeight = 1.35
    borderY = isRoot ? 0 : 3
  } else {
    // classic — matches .mind-node__label / .is-root rules
    fontSize = isRoot ? 15 : deep ? 12 : 13
    padX = isRoot ? 44 : deep ? 24 : 28
    padY = isRoot ? 24 : deep ? 12 : 16
    lineHeight = 1.35
    borderY = isRoot ? 0 : 3
  }

  const innerMax = Math.max(1, NODE_MAX_WIDTH - padX)
  const segments = (node.text || ' ').split(/\n/)
  let lines = 0
  let widest = 0
  for (const seg of segments) {
    const segW = measureTextWidth(seg || ' ', fontSize)
    widest = Math.max(widest, Math.min(segW, innerMax))
    lines += Math.max(1, Math.ceil(segW / innerMax))
  }

  const w = Math.min(NODE_MAX_WIDTH, Math.max(isRoot ? 72 : 48, Math.ceil(widest + padX)))
  const h = Math.ceil(fontSize * lineHeight * lines + padY + borderY)
  return { w, h }
}

function measureTextWidth(text: string, fontSize: number): number {
  let w = 0
  for (const ch of text) {
    const code = ch.codePointAt(0) ?? 0
    // CJK / fullwidth ≈ 1em; Latin / digits ≈ 0.58em
    if (
      code > 0x2e80 ||
      (code >= 0xff00 && code <= 0xffef) ||
      (code >= 0x3000 && code <= 0x303f)
    ) {
      w += fontSize
    } else {
      w += fontSize * 0.58
    }
  }
  return w
}

/**
 * Right-oriented tree layout from root.
 * Positions are top-left corners (React Flow convention).
 * Each node is vertically centered within its subtree span so a parent
 * aligns to the midpoint of its children (flat line for one child;
 * balanced between first/last for many).
 *
 * Pass `measured` (from React Flow node.measured) for pixel-accurate placement.
 */
export function layoutMindMap(
  nodes: MindNode[],
  style: MapStyle,
  measured?: NodeSizeMap
): MindNode[] {
  const root = getRootNode(nodes)
  if (!root) return nodes

  const { hGap, vGap } = styleMetrics(style)
  const byId = new Map(nodes.map((n) => [n.id, { ...n }]))
  const sizeCache = new Map<string, NodeSize>()
  const spanCache = new Map<string, number>()

  const sizeOf = (id: string): NodeSize => {
    const cached = sizeCache.get(id)
    if (cached) return cached
    const measuredSize = measured?.get(id)
    if (measuredSize && measuredSize.w > 0 && measuredSize.h > 0) {
      const size = { w: measuredSize.w, h: measuredSize.h }
      sizeCache.set(id, size)
      return size
    }
    const node = byId.get(id)
    if (!node) return { w: 48, h: 36 }
    const size = estimateNodeSize(node, nodeDepth(nodes, id), style)
    sizeCache.set(id, size)
    return size
  }

  const subtreeSpan = (id: string): number => {
    const cached = spanCache.get(id)
    if (cached !== undefined) return cached

    const node = byId.get(id)
    const selfH = sizeOf(id).h
    if (!node || node.collapsed) {
      spanCache.set(id, selfH)
      return selfH
    }

    const children = getChildren(nodes, id)
    if (children.length === 0) {
      spanCache.set(id, selfH)
      return selfH
    }

    const childrenSpan =
      children.reduce((sum, c) => sum + subtreeSpan(c.id), 0) + (children.length - 1) * vGap
    const span = Math.max(selfH, childrenSpan)
    spanCache.set(id, span)
    return span
  }

  const place = (id: string, x: number, yTop: number) => {
    const node = byId.get(id)
    if (!node) return

    const { w, h } = sizeOf(id)
    const span = subtreeSpan(id)
    // Center this node in its reserved vertical band
    node.x = x
    node.y = yTop + (span - h) / 2

    if (node.collapsed) return
    const children = getChildren(nodes, id)
    if (children.length === 0) return

    const childrenTotal =
      children.reduce((sum, c) => sum + subtreeSpan(c.id), 0) + (children.length - 1) * vGap
    // Center the child block against the parent band so single-child lines stay flat
    let cursor = yTop + Math.max(0, (span - childrenTotal) / 2)

    for (const child of children) {
      const childSpan = subtreeSpan(child.id)
      place(child.id, x + w + hGap, cursor)
      cursor += childSpan + vGap
    }
  }

  place(root.id, 0, 0)
  return Array.from(byId.values())
}

/**
 * Translate a freshly laid-out tree so `anchorId` keeps its previous
 * world position — viewport stays put on collapse / expand.
 */
export function anchorLayout(
  next: MindNode[],
  prev: MindNode[],
  anchorId?: string | null
): MindNode[] {
  const id = anchorId ?? getRootNode(next)?.id
  if (!id) return next
  const after = next.find((n) => n.id === id)
  const before = prev.find((n) => n.id === id)
  if (!after || !before) return next
  const dx = before.x - after.x
  const dy = before.y - after.y
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return next
  return next.map((n) => ({ ...n, x: n.x + dx, y: n.y + dy }))
}
