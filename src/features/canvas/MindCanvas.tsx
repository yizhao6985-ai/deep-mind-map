import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ReactFlow,
  Panel,
  getNodesBounds,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  useStore,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeTypes
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import MindBranchEdge from './MindBranchEdge'
import MindNodeView, { type MindNodeData } from './MindNodeView'
import { useEditorStore } from './editorStore'
import {
  FIT_VIEW_OPTIONS,
  getViewportForBoundsAtFocus,
  isReactFlowSizeFallback,
  shouldScheduleFitView
} from './fitViewOnce'
import { nodeDepth } from '@shared/mindmap/depth'
import { getChildren } from '@shared/mindmap/tree'
import { IconButton } from '@/components/ui/IconButton'
import {
  IconFitView,
  IconMinus,
  IconPlus,
  IconRedo,
  IconUndo
} from '@/components/ui/icons'

const nodeTypes: NodeTypes = { mind: MindNodeView }
const edgeTypes: EdgeTypes = { mindBranch: MindBranchEdge }

/** Past RF's resize-settle grace; also used as a reveal safety timeout. */
const FIT_VIEW_GRACE_MS = 400

/**
 * Fit once per map open — not on collapse / expand / refine.
 * Wait for panZoom + settled pane size: React Flow falls back to 500×500 when
 * the DOM briefly reports 0, and an early fit leaves a new root off-center.
 * A short grace window re-fits if the pane size corrects right after open.
 * Focus sits at the left third so the floating AI panel does not cover the map.
 *
 * Parent keeps the viewport hidden until `onSettled` so the default (0,0,1)
 * viewport never flashes the root at the top-left before this fit runs.
 */
function FitViewOnce({
  mapId,
  onSettled
}: {
  mapId: string
  onSettled: () => void
}) {
  const { getNodes, setViewport } = useReactFlow()
  const nodesReady = useNodesInitialized()
  const viewportReady = useStore((s) => !!s.panZoom)
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)
  const fittedFor = useRef<string | null>(null)
  const openedAt = useRef(0)
  const settledFor = useRef<string | null>(null)

  const markSettled = useCallback(() => {
    if (settledFor.current === mapId) return
    settledFor.current = mapId
    onSettled()
  }, [mapId, onSettled])

  useEffect(() => {
    fittedFor.current = null
    settledFor.current = null
    openedAt.current = Date.now()
  }, [mapId])

  // Safety: never leave the canvas invisible if fit cannot commit.
  useEffect(() => {
    if (!nodesReady || !viewportReady) return
    const timer = window.setTimeout(markSettled, FIT_VIEW_GRACE_MS + 80)
    return () => window.clearTimeout(timer)
  }, [mapId, nodesReady, viewportReady, markSettled])

  useEffect(() => {
    const withinGrace = Date.now() - openedAt.current < FIT_VIEW_GRACE_MS
    if (
      !shouldScheduleFitView({
        mapId,
        // During grace, ignore prior fit so a 500→real resize can correct centering.
        fittedFor: withinGrace ? null : fittedFor.current,
        nodesReady,
        viewportReady,
        width,
        height
      })
    ) {
      return
    }

    // Debounce so a 0→500 fallback→real-size ResizeObserver burst settles first.
    const timer = window.setTimeout(() => {
      const nodes = getNodes()
      if (nodes.length === 0) return
      fittedFor.current = mapId
      const bounds = getNodesBounds(nodes)
      void setViewport(
        getViewportForBoundsAtFocus(
          bounds,
          width,
          height,
          FIT_VIEW_OPTIONS.minZoom,
          FIT_VIEW_OPTIONS.maxZoom,
          FIT_VIEW_OPTIONS.padding
        )
      ).then(() => {
        // Keep hidden through the 500×500 placeholder fit; reveal on real size
        // or once the grace window has passed.
        const stillInGrace = Date.now() - openedAt.current < FIT_VIEW_GRACE_MS
        if (stillInGrace && isReactFlowSizeFallback(width, height)) return
        markSettled()
      })
    }, 50)

    return () => window.clearTimeout(timer)
  }, [
    mapId,
    nodesReady,
    viewportReady,
    width,
    height,
    getNodes,
    setViewport,
    markSettled
  ])

  return null
}

/** After DOM measure, re-pack so parent centers match real node heights. */
function LayoutRefiner() {
  const refineLayout = useEditorStore((s) => s.refineLayout)
  const sizeKey = useStore((s) =>
    s.nodes.map((n) => `${n.id}:${n.measured?.width ?? 0}x${n.measured?.height ?? 0}`).join('|')
  )
  const { getNodes } = useReactFlow()

  useEffect(() => {
    const flowNodes = getNodes()
    if (flowNodes.length === 0) return
    const sizes = new Map<string, { w: number; h: number }>()
    for (const n of flowNodes) {
      const w = n.measured?.width
      const h = n.measured?.height
      if (!w || !h) return
      sizes.set(n.id, { w, h })
    }
    refineLayout(sizes)
  }, [sizeKey, getNodes, refineLayout])

  return null
}

function CanvasHistoryIsland() {
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)

  return (
    <Panel position="top-left" className="canvas-hud">
      <IconButton label="撤销 ⌘Z" icon={<IconUndo size={15} />} onClick={() => undo()} />
      <IconButton label="重做 ⌘⇧Z" icon={<IconRedo size={15} />} onClick={() => redo()} />
    </Panel>
  )
}

function CanvasZoomIsland() {
  const { zoomIn, zoomOut, getNodes, setViewport, getViewport } = useReactFlow()
  const width = useStore((s) => s.width)
  const height = useStore((s) => s.height)
  const zoom = useStore((s) => s.transform[2])
  const pct = Math.round(zoom * 100)

  const resetZoom = () => {
    const { x, y } = getViewport()
    void setViewport({ x, y, zoom: 1 }, { duration: 160 })
  }

  const fitToView = () => {
    const nodes = getNodes()
    if (nodes.length === 0 || width <= 0 || height <= 0) return
    void setViewport(
      getViewportForBoundsAtFocus(
        getNodesBounds(nodes),
        width,
        height,
        FIT_VIEW_OPTIONS.minZoom,
        FIT_VIEW_OPTIONS.maxZoom,
        FIT_VIEW_OPTIONS.padding
      ),
      { duration: 200 }
    )
  }

  return (
    <Panel position="bottom-left" className="canvas-hud canvas-zoom">
      <IconButton
        label="缩小"
        icon={<IconMinus size={15} />}
        onClick={() => void zoomOut({ duration: 160 })}
      />
      <button
        type="button"
        className="canvas-zoom__pct"
        title="重置为 100%"
        aria-label={`当前缩放 ${pct}%，点击重置为 100%`}
        onClick={resetZoom}
      >
        {pct}%
      </button>
      <IconButton
        label="放大"
        icon={<IconPlus size={15} />}
        onClick={() => void zoomIn({ duration: 160 })}
      />
      <span className="canvas-hud__rule" aria-hidden />
      <IconButton
        label="适应画布"
        icon={<IconFitView size={15} />}
        onClick={fitToView}
      />
    </Panel>
  )
}

export function MindCanvas() {
  const file = useEditorStore((s) => s.file)
  const selectedId = useEditorStore((s) => s.selectedId)
  const setSelected = useEditorStore((s) => s.setSelected)
  const setText = useEditorStore((s) => s.setText)
  const addChild = useEditorStore((s) => s.addChild)
  const addSibling = useEditorStore((s) => s.addSibling)
  const deleteNode = useEditorStore((s) => s.deleteNode)
  const toggleCollapse = useEditorStore((s) => s.toggleCollapse)
  const undo = useEditorStore((s) => s.undo)
  const redo = useEditorStore((s) => s.redo)
  const [viewSettled, setViewSettled] = useState(false)

  const map = file?.map

  useEffect(() => {
    setViewSettled(false)
  }, [map?.id])

  const onViewSettled = useCallback(() => setViewSettled(true), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return
      }
      const meta = e.metaKey || e.ctrlKey
      const id = useEditorStore.getState().selectedId
      if (meta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      }
      if (meta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
      if (e.key === 'Tab' && id) {
        e.preventDefault()
        addChild(id)
      }
      if (e.key === 'Enter' && id) {
        e.preventDefault()
        addSibling(id)
      }
      if (e.key === 'F2' && id) {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent('mind-node-edit', { detail: { id } }))
      }
      if ((e.key === 'Backspace' || e.key === 'Delete') && id) {
        e.preventDefault()
        deleteNode(id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, addChild, addSibling, deleteNode])

  const visibleIds = useMemo(() => {
    if (!map) return new Set<string>()
    const root = map.nodes.find((n) => n.parentId === null)
    if (!root) return new Set<string>()
    const visible = new Set<string>([root.id])
    const walk = (id: string) => {
      const n = map.nodes.find((x) => x.id === id)
      if (!n || n.collapsed) return
      for (const c of getChildren(map.nodes, id)) {
        visible.add(c.id)
        walk(c.id)
      }
    }
    walk(root.id)
    return visible
  }, [map])

  const flowNodes: Node[] = useMemo(() => {
    if (!map) return []
    return map.nodes
      .filter((n) => visibleIds.has(n.id))
      .map((n) => ({
        id: n.id,
        type: 'mind',
        position: { x: n.x, y: n.y },
        draggable: false,
        selected: n.id === selectedId,
        zIndex: n.id === selectedId ? 1000 : undefined,
        data: {
          label: n.text,
          isRoot: n.parentId === null,
          depth: nodeDepth(map.nodes, n.id),
          selected: n.id === selectedId,
          collapsed: n.collapsed,
          childCount: getChildren(map.nodes, n.id).length,
          mapStyle: map.mapStyle,
          onChangeLabel: (v: string) => setText(n.id, v),
          onAddChild: () => addChild(n.id),
          onAddSibling: () => addSibling(n.id),
          onToggleCollapse: () => toggleCollapse(n.id)
        } satisfies MindNodeData
      }))
  }, [
    map,
    selectedId,
    setText,
    visibleIds,
    addChild,
    addSibling,
    toggleCollapse
  ])

  const flowEdges: Edge[] = useMemo(() => {
    if (!map) return []
    return map.nodes
      .filter((n) => n.parentId && visibleIds.has(n.id) && visibleIds.has(n.parentId))
      .map((n) => {
        const parentSelected = n.parentId === selectedId
        const childSelected = n.id === selectedId
        return {
          id: `${n.parentId}-${n.id}`,
          source: n.parentId!,
          target: n.id,
          type: 'mindBranch' as const,
          data: { selected: parentSelected || childSelected },
          style: { stroke: 'var(--branch)', strokeWidth: 1.6 }
        }
      })
  }, [map, visibleIds, selectedId])

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges)

  useEffect(() => {
    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return flowNodes.map((n) => {
        const old = prevById.get(n.id)
        return old?.measured ? { ...n, measured: old.measured } : n
      })
    })
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => setSelected(node.id),
    [setSelected]
  )

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelected(node.id)
    window.dispatchEvent(new CustomEvent('mind-node-edit', { detail: { id: node.id } }))
  }, [setSelected])

  if (!map) return null

  return (
    <div className={`canvas-wrap${viewSettled ? '' : ' is-settling'}`}>
      <ReactFlow
        key={map.id}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        onPaneClick={() => setSelected(null)}
        edgeTypes={edgeTypes}
        minZoom={FIT_VIEW_OPTIONS.minZoom}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        elementsSelectable
        panOnScroll
        zoomOnScroll
        zoomOnDoubleClick={false}
        defaultEdgeOptions={{
          type: 'mindBranch',
          style: { stroke: 'var(--branch)', strokeWidth: 1.6 }
        }}
      >
        <FitViewOnce mapId={map.id} onSettled={onViewSettled} />
        <LayoutRefiner />
        <CanvasHistoryIsland />
        <CanvasZoomIsland />
      </ReactFlow>
    </div>
  )
}
