import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent
} from 'react'
import { useNavigate } from 'react-router-dom'
import type { LibraryFolder, LibraryMapMeta, LibraryTree } from '@shared/types/domain'
import { useUiStore } from '@/app/uiStore'
import { useTabStore } from '@/app/tabStore'
import { useEditorStore } from '@/features/canvas/editorStore'
import { askConfirm, askPrompt } from '@/app/dialogs'
import { IconButton } from '@/components/ui/IconButton'
import {
  IconChevronDown,
  IconChevronRight,
  IconFolderPlus,
  IconPanelLeftClose,
  IconPlus,
  IconTrash
} from '@/components/ui/icons'
import { buildVisibleItems } from './buildVisibleItems'

type Props = {
  activeId?: string
  onMapsChanged?: () => void
}

type MapRowProps = {
  map: LibraryMapMeta
  active: boolean
  depth: number
  onOpen: (id: string, title: string) => void
  onRenamed: () => void
  onDeleted: (id: string) => void
}

type FolderRowProps = {
  folder: LibraryFolder
  depth: number
  expanded: boolean
  selected: boolean
  onToggle: () => void
  onSelect: () => void
  onRenamed: () => void
  onDeleted: (id: string) => void
}

function depthStyle(depth: number): CSSProperties {
  return {
    paddingLeft: `calc(var(--s2) + ${depth} * 12px)`
  }
}

function stopRowClick(e: ReactMouseEvent) {
  e.preventDefault()
  e.stopPropagation()
}

function MapRow({ map, active, depth, onOpen, onRenamed, onDeleted }: MapRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(map.title)
  const inputRef = useRef<HTMLInputElement>(null)
  const showToast = useUiStore((s) => s.showToast)

  useEffect(() => {
    if (!editing) setDraft(map.title)
  }, [map.title, editing])

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  const startRename = () => {
    setDraft(map.title)
    setEditing(true)
  }

  const requestDelete = async () => {
    if (!(await askConfirm(`删除「${map.title}」？`))) return
    onDeleted(map.id)
  }

  const commit = async () => {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === map.title) {
      setDraft(map.title)
      return
    }
    const res = await window.dmm.library.renameMap(map.id, next)
    if (!res.ok) {
      showToast(res.message, 'error')
      setDraft(map.title)
      return
    }
    useTabStore.getState().updateTabTitle(map.id, next)
    const editor = useEditorStore.getState()
    if (editor.file?.map.id === map.id) {
      const saved = res.data
      const rootId = saved.map.nodes.find((n) => n.parentId === null)?.id
      const rootText = saved.map.nodes.find((n) => n.parentId === null)?.text
      useEditorStore.setState({
        file: {
          ...editor.file,
          map: {
            ...editor.file.map,
            title: next,
            nodes: editor.file.map.nodes.map((n) =>
              n.id === rootId && rootText != null ? { ...n, text: rootText } : n
            )
          },
          updatedAt: saved.updatedAt
        }
      })
    }
    onRenamed()
  }

  const cancel = () => {
    setDraft(map.title)
    setEditing(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      void commit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  return (
    <div
      className={`library-row library-row--map ${active ? 'is-active' : ''} ${editing ? 'is-editing' : ''}`}
      role="treeitem"
      tabIndex={editing ? -1 : 0}
      title="双击改名 · Delete 删除"
      style={depthStyle(depth)}
      onClick={() => {
        if (!editing) onOpen(map.id, map.title)
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        startRename()
      }}
      onKeyDown={(e) => {
        if (editing) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen(map.id, map.title)
        }
        if (e.key === 'F2') {
          e.preventDefault()
          startRename()
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          void requestDelete()
        }
      }}
    >
      <span className="library-row__twist" aria-hidden />
      <div className="library-row__body">
        {editing ? (
          <input
            ref={inputRef}
            className="library-row__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="library-row__title">{map.title}</span>
        )}
      </div>
      {!editing && (
        <div className="library-row__actions">
          <IconButton
            className="library-row__delete"
            label="删除"
            icon={<IconTrash size={13} />}
            onClick={(e) => {
              stopRowClick(e)
              void requestDelete()
            }}
            onDoubleClick={stopRowClick}
          />
        </div>
      )}
    </div>
  )
}

function FolderRow({
  folder,
  depth,
  expanded,
  selected,
  onToggle,
  onSelect,
  onRenamed,
  onDeleted
}: FolderRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(folder.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const showToast = useUiStore((s) => s.showToast)

  useEffect(() => {
    if (!editing) setDraft(folder.name)
  }, [folder.name, editing])

  useEffect(() => {
    if (!editing) return
    const el = inputRef.current
    if (!el) return
    el.focus()
    el.select()
  }, [editing])

  const startRename = () => {
    setDraft(folder.name)
    setEditing(true)
  }

  const requestDelete = async () => {
    if (
      !(await askConfirm(
        `删除文件夹「${folder.name}」及其内所有子文件夹与思维导图？此操作不可恢复。`
      ))
    ) {
      return
    }
    onDeleted(folder.id)
  }

  const commit = async () => {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === folder.name) {
      setDraft(folder.name)
      return
    }
    const res = await window.dmm.library.renameFolder(folder.id, next)
    if (!res.ok) {
      showToast(res.message, 'error')
      setDraft(folder.name)
      return
    }
    onRenamed()
  }

  const cancel = () => {
    setDraft(folder.name)
    setEditing(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      void commit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      cancel()
    }
  }

  return (
    <div
      className={`library-row library-row--folder ${selected ? 'is-selected' : ''} ${editing ? 'is-editing' : ''}`}
      role="treeitem"
      aria-expanded={expanded}
      tabIndex={editing ? -1 : 0}
      title="单击展开/收起 · 双击改名 · Delete 删除"
      style={depthStyle(depth)}
      onClick={() => {
        if (!editing) {
          onSelect()
          onToggle()
        }
      }}
      onDoubleClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        startRename()
      }}
      onKeyDown={(e) => {
        if (editing) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
          onToggle()
        }
        if (e.key === 'ArrowRight' && !expanded) {
          e.preventDefault()
          onToggle()
        }
        if (e.key === 'ArrowLeft' && expanded) {
          e.preventDefault()
          onToggle()
        }
        if (e.key === 'F2') {
          e.preventDefault()
          startRename()
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault()
          void requestDelete()
        }
      }}
    >
      <button
        type="button"
        className="library-row__twist is-button"
        aria-label={expanded ? '折叠' : '展开'}
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
      >
        {expanded ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
      </button>
      <div className="library-row__body">
        {editing ? (
          <input
            ref={inputRef}
            className="library-row__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void commit()}
            onKeyDown={onKeyDown}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="library-row__title">{folder.name}</span>
        )}
      </div>
      {!editing && (
        <div className="library-row__actions">
          <IconButton
            className="library-row__delete"
            label="删除"
            icon={<IconTrash size={13} />}
            onClick={(e) => {
              stopRowClick(e)
              void requestDelete()
            }}
            onDoubleClick={stopRowClick}
          />
        </div>
      )}
    </div>
  )
}

export function WorkspaceSidebar({ activeId, onMapsChanged }: Props) {
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [maps, setMaps] = useState<LibraryMapMeta[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [resizing, setResizing] = useState(false)
  const navigate = useNavigate()
  const showToast = useUiStore((s) => s.showToast)
  const rightPanel = useUiStore((s) => s.rightPanel)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const setSidebarWidth = useUiStore((s) => s.setSidebarWidth)
  const libraryEpoch = useUiStore((s) => s.libraryEpoch)
  const openTab = useTabStore((s) => s.openTab)

  useEffect(() => {
    if (!resizing) return
    const onMove = (e: PointerEvent) => {
      setSidebarWidth(e.clientX)
    }
    const onUp = () => setResizing(false)
    document.body.classList.add('is-sidebar-resizing')
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      document.body.classList.remove('is-sidebar-resizing')
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [resizing, setSidebarWidth])

  const refresh = useCallback(async () => {
    const res = await window.dmm.library.list()
    if (!res.ok) return
    const tree: LibraryTree = res.data
    setFolders(tree.folders)
    setMaps(tree.maps)
    setExpanded((prev) => {
      const known = new Set(tree.folders.map((f) => f.id))
      if (prev.size === 0) {
        return new Set(tree.folders.filter((f) => f.parentId == null).map((f) => f.id))
      }
      const next = new Set<string>()
      for (const id of prev) {
        if (known.has(id)) next.add(id)
      }
      return next
    })
    setSelectedFolderId((cur) =>
      cur && tree.folders.some((f) => f.id === cur) ? cur : null
    )
    onMapsChanged?.()
  }, [onMapsChanged])

  useEffect(() => {
    void refresh()
  }, [refresh, activeId, libraryEpoch])

  const items = useMemo(
    () => buildVisibleItems(folders, maps, expanded),
    [folders, maps, expanded]
  )

  const openMap = (id: string, title: string) => {
    if (rightPanel === 'settings') useUiStore.getState().setRightPanel(null)
    setSelectedFolderId(null)
    openTab(id, title)
    navigate(`/maps/${id}`)
  }

  /** VS Code explorer: folder selected → inside it; else active map's parent; else root. */
  const resolveCreateParentId = (): string | null => {
    if (selectedFolderId) return selectedFolderId
    if (!activeId) return null
    return maps.find((m) => m.id === activeId)?.folderId ?? null
  }

  const createMap = async () => {
    const folderId = resolveCreateParentId()
    const res = await window.dmm.library.createMap('未命名思维导图', folderId)
    if (!res.ok) {
      showToast(res.message, 'error')
      return
    }
    if (folderId) {
      setExpanded((prev) => new Set(prev).add(folderId))
    }
    await refresh()
    openMap(res.data.map.id, res.data.map.title)
  }

  const createFolder = async () => {
    const parentId = resolveCreateParentId()
    const name = await askPrompt(
      parentId ? '新建子文件夹' : '新建文件夹',
      '未命名文件夹'
    )
    if (name == null) return
    const trimmed = name.trim()
    if (!trimmed) {
      showToast('文件夹名称不能为空', 'error')
      return
    }
    const res = await window.dmm.library.createFolder(trimmed, parentId)
    if (!res.ok) {
      showToast(res.message, 'error')
      return
    }
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId))
    }
    setExpanded((prev) => new Set(prev).add(res.data.id))
    setSelectedFolderId(res.data.id)
    await refresh()
  }

  const deleteMap = async (id: string) => {
    const { closeTab } = useTabStore.getState()
    closeTab(id)
    await window.dmm.library.deleteMap(id)
    await refresh()
    if (id === activeId) navigate('/')
  }

  const deleteFolder = async (id: string) => {
    const descendantIds = new Set<string>([id])
    let changed = true
    while (changed) {
      changed = false
      for (const f of folders) {
        if (f.parentId && descendantIds.has(f.parentId) && !descendantIds.has(f.id)) {
          descendantIds.add(f.id)
          changed = true
        }
      }
    }
    const removedMaps = maps.filter((m) => m.folderId && descendantIds.has(m.folderId))
    const res = await window.dmm.library.deleteFolder(id)
    if (!res.ok) {
      showToast(res.message, 'error')
      return
    }
    const { closeTab } = useTabStore.getState()
    for (const m of removedMaps) closeTab(m.id)
    if (selectedFolderId && descendantIds.has(selectedFolderId)) setSelectedFolderId(null)
    await refresh()
    if (activeId && removedMaps.some((m) => m.id === activeId)) navigate('/')
  }

  const toggleFolder = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (sidebarCollapsed) return null

  const isEmpty = folders.length === 0 && maps.length === 0

  return (
    <aside className="workspace-sidebar">
      <div
        className={`workspace-sidebar__edge ${resizing ? 'is-dragging' : ''}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="调整侧栏宽度"
        onPointerDown={(e) => {
          e.preventDefault()
          setResizing(true)
        }}
      />
      <div className="workspace-sidebar__brand">
        <IconButton
          className="workspace-sidebar__toggle"
          label="收起思维导图列表"
          icon={<IconPanelLeftClose />}
          onClick={toggleSidebar}
        />
      </div>

      <div className="workspace-sidebar__header">
        <h1 className="workspace-sidebar__title">Deep Mind Map</h1>
      </div>

      <div className="workspace-sidebar__label-row">
        <div className="workspace-sidebar__label">Library</div>
        <div className="workspace-sidebar__actions">
          <IconButton
            label="新建思维导图"
            icon={<IconPlus size={14} />}
            onClick={() => void createMap()}
          />
          <IconButton
            label="新建文件夹"
            icon={<IconFolderPlus size={14} />}
            onClick={() => void createFolder()}
          />
        </div>
      </div>

      <div
        className="library-tree"
        role="tree"
        aria-label="图库"
        onClick={(e) => {
          if (e.target === e.currentTarget) setSelectedFolderId(null)
        }}
      >
        {isEmpty && (
          <p className="library-tree__empty">还没有内容，点击上方 + 新建思维导图或文件夹</p>
        )}
        {items.map((item) =>
          item.kind === 'folder' ? (
            <FolderRow
              key={`f-${item.folder.id}`}
              folder={item.folder}
              depth={item.depth}
              expanded={expanded.has(item.folder.id)}
              selected={selectedFolderId === item.folder.id}
              onToggle={() => toggleFolder(item.folder.id)}
              onSelect={() => setSelectedFolderId(item.folder.id)}
              onRenamed={() => void refresh()}
              onDeleted={(id) => void deleteFolder(id)}
            />
          ) : (
            <MapRow
              key={`m-${item.map.id}`}
              map={item.map}
              active={item.map.id === activeId}
              depth={item.depth}
              onOpen={openMap}
              onRenamed={() => void refresh()}
              onDeleted={(id) => void deleteMap(id)}
            />
          )
        )}
      </div>
    </aside>
  )
}
