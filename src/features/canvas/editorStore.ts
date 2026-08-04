import { create } from 'zustand'
import type { MindMap, MindMapFile, MapStyle } from '@shared/types/domain'
import { layoutMindMap, anchorLayout, type NodeSizeMap } from '@shared/mindmap/layout'
import { collectSubtreeIds, getChildren, getRootNode } from '@shared/mindmap/tree'
import { v4 as uuid } from 'uuid'

type Snapshot = MindMap

type EditorState = {
  file: MindMapFile | null
  selectedId: string | null
  dirty: boolean
  past: Snapshot[]
  future: Snapshot[]
  aiBusy: boolean
  load: (file: MindMapFile) => void
  setSelected: (id: string | null) => void
  pushHistory: () => void
  undo: () => void
  redo: () => void
  updateMap: (updater: (m: MindMap) => MindMap, recordHistory?: boolean) => void
  setMapStyle: (style: MapStyle) => void
  addChild: (parentId: string, text?: string, nodeId?: string) => void
  addSibling: (nodeId: string) => void
  deleteNode: (nodeId: string) => void
  setText: (nodeId: string, text: string) => void
  toggleCollapse: (nodeId: string) => void
  /** Re-pack with DOM-measured sizes; no history / dirty. */
  refineLayout: (measured: NodeSizeMap) => void
  replaceMap: (map: MindMap) => void
  markSaved: (file: MindMapFile) => void
  setAiBusy: (v: boolean) => void
}

export const useEditorStore = create<EditorState>((set, get) => ({
  file: null,
  selectedId: null,
  dirty: false,
  past: [],
  future: [],
  aiBusy: false,

  load: (file) => {
    // Re-run layout so older maps with cramped positions open cleanly.
    const map = {
      ...file.map,
      nodes: layoutMindMap(file.map.nodes, file.map.mapStyle)
    }
    set({
      file: { ...file, map },
      selectedId: map.nodes.find((n) => n.parentId === null)?.id ?? null,
      dirty: false,
      past: [],
      future: []
    })
  },

  setSelected: (id) => set({ selectedId: id }),

  pushHistory: () => {
    const { file, past } = get()
    if (!file) return
    set({ past: [...past.slice(-49), structuredClone(file.map)], future: [] })
  },

  undo: () => {
    const { past, file, future } = get()
    if (!file || past.length === 0) return
    const prev = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      future: [structuredClone(file.map), ...future],
      file: { ...file, map: prev },
      dirty: true
    })
  },

  redo: () => {
    const { past, file, future } = get()
    if (!file || future.length === 0) return
    const next = future[0]
    set({
      future: future.slice(1),
      past: [...past, structuredClone(file.map)],
      file: { ...file, map: next },
      dirty: true
    })
  },

  updateMap: (updater, recordHistory = true) => {
    const { file } = get()
    if (!file) return
    if (recordHistory) get().pushHistory()
    const map = updater(file.map)
    set({ file: { ...file, map }, dirty: true })
  },

  setMapStyle: (style) => {
    get().updateMap((m) => ({
      ...m,
      mapStyle: style,
      nodes: layoutMindMap(m.nodes, style)
    }))
  },

  addChild: (parentId, text = '新节点', nodeId) => {
    get().updateMap((m) => {
      const order = getChildren(m.nodes, parentId).length
      const nodes = [
        ...m.nodes,
        {
          id: nodeId || uuid(),
          parentId,
          text,
          x: 0,
          y: 0,
          color: null,
          collapsed: false,
          order
        }
      ]
      return { ...m, nodes: layoutMindMap(nodes, m.mapStyle) }
    })
  },

  addSibling: (nodeId) => {
    const { file } = get()
    if (!file) return
    const node = file.map.nodes.find((n) => n.id === nodeId)
    if (!node || !node.parentId) {
      get().addChild(nodeId)
      return
    }
    get().addChild(node.parentId)
  },

  deleteNode: (nodeId) => {
    get().updateMap((m) => {
      const target = m.nodes.find((n) => n.id === nodeId)
      if (!target || target.parentId === null) return m
      const remove = collectSubtreeIds(m.nodes, nodeId)
      const nodes = m.nodes.filter((n) => !remove.has(n.id))
      return { ...m, nodes: layoutMindMap(nodes, m.mapStyle) }
    })
    set({ selectedId: null })
  },

  setText: (nodeId, text) => {
    get().updateMap((m) => {
      const nodes = m.nodes.map((n) => (n.id === nodeId ? { ...n, text } : n))
      return {
        ...m,
        title: m.nodes.find((n) => n.id === nodeId)?.parentId === null ? text : m.title,
        nodes: layoutMindMap(nodes, m.mapStyle)
      }
    })
  },

  toggleCollapse: (nodeId) => {
    get().updateMap((m) => {
      const prev = m.nodes
      const nodes = prev.map((n) =>
        n.id === nodeId ? { ...n, collapsed: !n.collapsed } : n
      )
      const laid = layoutMindMap(nodes, m.mapStyle)
      return { ...m, nodes: anchorLayout(laid, prev, nodeId) }
    })
  },

  refineLayout: (measured) => {
    const { file, selectedId } = get()
    if (!file) return
    const prev = file.map.nodes
    const laid = layoutMindMap(prev, file.map.mapStyle, measured)
    const anchorId = selectedId ?? getRootNode(prev)?.id
    const nodes = anchorLayout(laid, prev, anchorId)
    const changed = nodes.some((n) => {
      const p = prev.find((x) => x.id === n.id)
      return !p || Math.abs(p.x - n.x) > 0.5 || Math.abs(p.y - n.y) > 0.5
    })
    if (!changed) return
    set({ file: { ...file, map: { ...file.map, nodes } } })
  },

  replaceMap: (map) => {
    get().updateMap(() => map)
  },

  markSaved: (file) => set({ file, dirty: false }),

  setAiBusy: (v) => set({ aiBusy: v })
}))
