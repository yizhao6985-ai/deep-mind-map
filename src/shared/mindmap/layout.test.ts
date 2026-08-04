import { describe, expect, it } from 'vitest'
import { anchorLayout, estimateNodeSize, layoutMindMap, styleMetrics } from './layout'
import { parseMindMapFile } from '../schema/mindmap'
import { createEmptyMap } from './tree'
import { draftToMindMap, mapToMarkdown, markdownToDraft } from './convert'

describe('layoutMindMap', () => {
  it('positions root and children', () => {
    const map = createEmptyMap('测试')
    const root = map.nodes[0]
    map.nodes.push({
      id: 'c1',
      parentId: root.id,
      text: '子',
      x: 0,
      y: 0,
      color: null,
      collapsed: false,
      order: 0
    })
    const laid = layoutMindMap(map.nodes, 'classic')
    const child = laid.find((n) => n.id === 'c1')!
    const r = laid.find((n) => n.id === root.id)!
    expect(child.x).toBeGreaterThan(r.x)
  })

  it('aligns vertical centers for a single child (no crooked branch)', () => {
    const map = createEmptyMap('中心主题')
    const root = map.nodes[0]
    map.nodes.push({
      id: 'c1',
      parentId: root.id,
      text: '子主题',
      x: 0,
      y: 0,
      color: null,
      collapsed: false,
      order: 0
    })

    const laid = layoutMindMap(map.nodes, 'classic')
    const r = laid.find((n) => n.id === root.id)!
    const child = laid.find((n) => n.id === 'c1')!
    const rootSize = estimateNodeSize(r, 0, 'classic')
    const childSize = estimateNodeSize(child, 1, 'classic')

    // Root is taller than child — tops must differ so centers match
    expect(rootSize.h).toBeGreaterThan(childSize.h)
    expect(r.y).not.toBe(child.y)

    const rootCenter = r.y + rootSize.h / 2
    const childCenter = child.y + childSize.h / 2
    expect(Math.abs(rootCenter - childCenter)).toBeLessThan(0.5)

    const gap = child.x - (r.x + rootSize.w)
    expect(gap).toBe(styleMetrics('classic').hGap)
  })

  it('centers parent between two children using measured sizes', () => {
    const map = createEmptyMap('中心')
    const root = map.nodes[0]
    map.nodes.push(
      {
        id: 'a',
        parentId: root.id,
        text: '上',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      },
      {
        id: 'b',
        parentId: root.id,
        text: '下边更长一点',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 1
      }
    )

    const measured = new Map([
      [root.id, { w: 120, h: 48 }],
      ['a', { w: 56, h: 34 }],
      ['b', { w: 140, h: 34 }]
    ])
    const laid = layoutMindMap(map.nodes, 'classic', measured)
    const r = laid.find((n) => n.id === root.id)!
    const a = laid.find((n) => n.id === 'a')!
    const b = laid.find((n) => n.id === 'b')!

    const rootCenter = r.y + 48 / 2
    const midChildren = (a.y + 34 / 2 + b.y + 34 / 2) / 2
    expect(Math.abs(rootCenter - midChildren)).toBeLessThan(0.5)
    expect(a.x).toBe(r.x + 120 + styleMetrics('classic').hGap)
    expect(b.x).toBe(a.x)
  })

  it('keeps the collapsed node fixed after re-layout', () => {
    const map = createEmptyMap('中心')
    const root = map.nodes[0]
    map.nodes.push(
      {
        id: 'a',
        parentId: root.id,
        text: 'A',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      },
      {
        id: 'a1',
        parentId: 'a',
        text: 'A1',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      },
      {
        id: 'a2',
        parentId: 'a',
        text: 'A2',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 1
      },
      {
        id: 'b',
        parentId: root.id,
        text: 'B',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 1
      }
    )
    const before = layoutMindMap(map.nodes, 'classic')
    const aBefore = before.find((n) => n.id === 'a')!
    const collapsed = before.map((n) =>
      n.id === 'a' ? { ...n, collapsed: true } : n
    )
    const after = anchorLayout(layoutMindMap(collapsed, 'classic'), before, 'a')
    const aAfter = after.find((n) => n.id === 'a')!
    expect(aAfter.x).toBeCloseTo(aBefore.x, 5)
    expect(aAfter.y).toBeCloseTo(aBefore.y, 5)
  })

  it('keeps sibling leaves spaced by at least node height + gap', () => {
    const map = createEmptyMap('测试')
    const root = map.nodes[0]
    for (let i = 0; i < 4; i++) {
      map.nodes.push({
        id: `c${i}`,
        parentId: root.id,
        text: `子${i}`,
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: i
      })
    }

    const { vGap } = styleMetrics('classic')
    const laid = layoutMindMap(map.nodes, 'classic')
    const kids = laid
      .filter((n) => n.parentId === root.id)
      .sort((a, b) => a.y - b.y)
    const rootNode = laid.find((n) => n.id === root.id)!
    const rootSize = estimateNodeSize(rootNode, 0, 'classic')

    for (let i = 1; i < kids.length; i++) {
      const prevH = estimateNodeSize(kids[i - 1], 1, 'classic').h
      expect(kids[i].y - kids[i - 1].y).toBeGreaterThanOrEqual(prevH + vGap - 0.01)
    }
    expect(kids[0].x - rootNode.x).toBe(rootSize.w + styleMetrics('classic').hGap)
  })

  it('expands parent span when nested children are added', () => {
    const map = createEmptyMap('测试')
    const root = map.nodes[0]
    map.nodes.push(
      {
        id: 'a',
        parentId: root.id,
        text: 'A',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      },
      {
        id: 'b',
        parentId: root.id,
        text: 'B',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 1
      },
      {
        id: 'a1',
        parentId: 'a',
        text: 'A1',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      },
      {
        id: 'a2',
        parentId: 'a',
        text: 'A2',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 1
      }
    )

    const { vGap } = styleMetrics('classic')
    const laid = layoutMindMap(map.nodes, 'classic')
    const a2 = laid.find((n) => n.id === 'a2')!
    const b = laid.find((n) => n.id === 'b')!
    const a2H = estimateNodeSize(a2, 2, 'classic').h
    // B sits below A's nested children, not just below A itself
    expect(b.y).toBeGreaterThanOrEqual(a2.y + a2H + vGap - 0.01)
  })
})

describe('estimateNodeSize', () => {
  it('wraps long text within max width and grows height', () => {
    const short = estimateNodeSize(
      {
        id: 'a',
        parentId: null,
        text: '短',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      },
      1,
      'classic'
    )
    const long = estimateNodeSize(
      {
        id: 'b',
        parentId: null,
        text: '这是一段很长很长很长很长很长很长很长很长很长很长很长的节点文案需要换行展示',
        x: 0,
        y: 0,
        color: null,
        collapsed: false,
        order: 0
      },
      1,
      'classic'
    )
    expect(long.w).toBeLessThanOrEqual(260)
    expect(long.w).toBeGreaterThan(short.w)
    expect(long.h).toBeGreaterThan(short.h)
  })
})

describe('schema roundtrip', () => {
  it('parses valid file', () => {
    const map = createEmptyMap('往返')
    const file = {
      schemaVersion: 1 as const,
      app: 'deep-mind-map' as const,
      updatedAt: new Date().toISOString(),
      map
    }
    const parsed = parseMindMapFile(file)
    expect(parsed.success).toBe(true)
  })
})

describe('markdown convert', () => {
  it('roundtrips structure loosely', () => {
    const draft = markdownToDraft('# 标题\n\n## 中心\n\n- A\n  - A1\n- B\n')
    const map = draftToMindMap(draft)
    const md = mapToMarkdown(map)
    expect(md).toContain('A')
    expect(md).toContain('B')
  })
})
