import { appendChildrenFromDraft, draftToMindMap } from '@shared/mindmap/convert'
import type { AiAgentOp } from '@shared/types/domain'
import { useEditorStore } from '../canvas/editorStore'

export function describeOp(op: AiAgentOp): string | null {
  switch (op.type) {
    case 'replaceMap':
      return '已重建整图'
    case 'expandNode':
      return '已展开节点'
    case 'updateNodeText':
      return '已改写节点'
    case 'addChild':
      return '已添加子节点'
    case 'deleteNode':
      return '已删除节点'
    default:
      return null
  }
}

export function applyAgentOps(ops: AiAgentOp[]): string[] {
  const { replaceMap, setText, addChild, deleteNode } = useEditorStore.getState()
  const applied: string[] = []

  for (const op of ops) {
    if (op.type === 'none') continue
    const map = useEditorStore.getState().file?.map
    if (!map) break

    if (op.type === 'replaceMap') {
      const next = draftToMindMap(op.draft, map.folderId)
      next.id = map.id
      next.mapStyle = map.mapStyle
      replaceMap(next)
      const label = describeOp(op)
      if (label) applied.push(label)
      continue
    }
    if (op.type === 'expandNode') {
      if (!map.nodes.some((n) => n.id === op.nodeId)) continue
      replaceMap(appendChildrenFromDraft(map, op.nodeId, op.children))
      const label = describeOp(op)
      if (label) applied.push(label)
      continue
    }
    if (op.type === 'updateNodeText') {
      if (!map.nodes.some((n) => n.id === op.nodeId)) continue
      setText(op.nodeId, op.text)
      const label = describeOp(op)
      if (label) applied.push(label)
      continue
    }
    if (op.type === 'addChild') {
      if (!map.nodes.some((n) => n.id === op.parentId)) continue
      addChild(op.parentId, op.text, op.nodeId)
      const label = describeOp(op)
      if (label) applied.push(label)
      continue
    }
    if (op.type === 'deleteNode') {
      const target = map.nodes.find((n) => n.id === op.nodeId)
      if (!target || target.parentId === null) continue
      deleteNode(op.nodeId)
      const label = describeOp(op)
      if (label) applied.push(label)
    }
  }
  return applied
}
