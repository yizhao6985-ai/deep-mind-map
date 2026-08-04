import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent
} from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { IconCollapse, IconPlus } from '@/components/ui/icons'

export type MindNodeData = {
  label: string
  isRoot: boolean
  depth: number
  selected: boolean
  collapsed: boolean
  childCount: number
  mapStyle: string
  onChangeLabel: (v: string) => void
  onAddChild: () => void
  onAddSibling: () => void
  onToggleCollapse: () => void
}

type MindNodeType = Node<MindNodeData, 'mind'>

function stop(e: MouseEvent) {
  e.stopPropagation()
  e.preventDefault()
}

function MindNodeView({ data, id }: NodeProps<MindNodeType>) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(data.label)
  const [editWidth, setEditWidth] = useState(72)
  const inputRef = useRef<HTMLInputElement>(null)
  const labelRef = useRef<HTMLButtonElement>(null)
  const sizerRef = useRef<HTMLSpanElement>(null)
  const depthClass = data.isRoot ? 'depth-0' : data.depth >= 3 ? 'depth-deep' : `depth-${data.depth}`

  useEffect(() => {
    if (!editing) setDraft(data.label)
  }, [data.label, editing])

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  useLayoutEffect(() => {
    if (!editing || !sizerRef.current) return
    const w = Math.ceil(sizerRef.current.offsetWidth)
    setEditWidth((prev) => Math.max(prev, w))
  }, [draft, editing])

  const beginEdit = (seed = data.label) => {
    const w = labelRef.current?.offsetWidth
    if (w && w > 0) setEditWidth(Math.ceil(w))
    setDraft(seed)
    setEditing(true)
  }

  useEffect(() => {
    const onEdit = (e: Event) => {
      const detail = (e as CustomEvent<{ id: string }>).detail
      if (detail?.id !== id) return
      beginEdit(data.label)
    }
    window.addEventListener('mind-node-edit', onEdit)
    return () => window.removeEventListener('mind-node-edit', onEdit)
    // beginEdit closes over labelRef / data.label
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, data.label])

  const commit = () => {
    const next = draft.trim()
    setEditing(false)
    if (next && next !== data.label) data.onChangeLabel(next)
    else setDraft(data.label)
  }

  const cancel = () => {
    setDraft(data.label)
    setEditing(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      commit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  const startEdit = (e: MouseEvent) => {
    e.preventDefault()
    beginEdit(data.label)
  }

  const foldTip = data.collapsed ? '展开子节点' : '折叠子节点'
  const showFold = !editing && data.childCount > 0
  const showChrome = !editing

  return (
    <div
      className={`mind-node ${depthClass} ${data.isRoot ? 'is-root' : ''} ${data.selected ? 'is-selected' : ''} ${editing ? 'is-editing' : ''} ${data.collapsed ? 'is-collapsed' : ''}`}
    >
      {!data.isRoot && <Handle type="target" position={Position.Left} className="mind-handle" />}

      {editing ? (
        <>
          <span ref={sizerRef} className="mind-node__sizer" aria-hidden>
            {draft || ' '}
          </span>
          <input
            ref={inputRef}
            className="mind-node__input nodrag nopan"
            value={draft}
            style={{ width: editWidth }}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </>
      ) : (
        <button
          ref={labelRef}
          type="button"
          className="mind-node__label"
          onDoubleClick={startEdit}
          title="双击编辑 · F2"
        >
          <span className="mind-node__text">{data.label}</span>
        </button>
      )}

      {showChrome && (
        <button
          type="button"
          className="mind-node__add nodrag nopan"
          data-tip="添加子节点 · Tab"
          aria-label="添加子节点 · Tab"
          onMouseDown={stop}
          onClick={(e) => {
            stop(e)
            data.onAddChild()
          }}
        >
          <IconPlus size={11} />
        </button>
      )}

      {showFold && (
        <button
          type="button"
          className="mind-node__fold nodrag nopan"
          data-tip={foldTip}
          aria-label={foldTip}
          onMouseDown={stop}
          onClick={(e) => {
            stop(e)
            data.onToggleCollapse()
          }}
        >
          {data.collapsed ? (
            <span className="mind-node__fold-count">{data.childCount}</span>
          ) : (
            <IconCollapse size={12} />
          )}
        </button>
      )}

      {showChrome && !data.isRoot && (
        <button
          type="button"
          className="mind-node__add-sibling nodrag nopan"
          data-tip="添加同级 · Enter"
          aria-label="添加同级 · Enter"
          onMouseDown={stop}
          onClick={(e) => {
            stop(e)
            data.onAddSibling()
          }}
        >
          <IconPlus size={11} />
        </button>
      )}

      <Handle type="source" position={Position.Right} className="mind-handle" />
    </div>
  )
}

export default memo(MindNodeView)
