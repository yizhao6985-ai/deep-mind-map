import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MindCanvas } from '@/features/canvas/MindCanvas'
import { useEditorStore } from '@/features/canvas/editorStore'
import { AiPanel } from '@/features/ai-panel/AiPanel'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { WorkspaceSidebar } from './WorkspaceSidebar'
import { useUiStore } from '@/app/uiStore'
import { useTabStore } from '@/app/tabStore'
import { IconButton } from '@/components/ui/IconButton'
import {
  IconClose,
  IconPanelLeftOpen,
  IconPlus,
  IconSettings,
  IconSparkles
} from '@/components/ui/icons'
export function WorkspacePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const load = useEditorStore((s) => s.load)
  const file = useEditorStore((s) => s.file)
  const dirty = useEditorStore((s) => s.dirty)
  const markSaved = useEditorStore((s) => s.markSaved)
  const rightPanel = useUiStore((s) => s.rightPanel)
  const toggleRightPanel = useUiStore((s) => s.toggleRightPanel)
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const sidebarWidth = useUiStore((s) => s.sidebarWidth)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const showToast = useUiStore((s) => s.showToast)
  const tabs = useTabStore((s) => s.tabs)
  const openTab = useTabStore((s) => s.openTab)
  const closeTab = useTabStore((s) => s.closeTab)
  const updateTabTitle = useTabStore((s) => s.updateTabTitle)
  const saveTimer = useRef<number | null>(null)
  const flushSave = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!id) {
      useEditorStore.setState({ file: null, selectedId: null, dirty: false, past: [], future: [] })
      return
    }
    void (async () => {
      const res = await window.dmm.library.readMap(id)
      if (!res.ok) {
        showToast(res.message, 'error')
        navigate('/')
        return
      }
      load(res.data)
      openTab(res.data.map.id, res.data.map.title)
    })()
  }, [id, load, navigate, showToast, openTab])

  useEffect(() => {
    if (file?.map.id) {
      updateTabTitle(file.map.id, file.map.title)
    }
  }, [file?.map.id, file?.map.title, updateTabTitle])

  useEffect(() => {
    flushSave.current = async () => {
      const current = useEditorStore.getState().file
      const isDirty = useEditorStore.getState().dirty
      if (!current || !isDirty) return
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      const res = await window.dmm.library.writeMap(current)
      if (res.ok) markSaved(res.data)
    }
  }, [markSaved])

  useEffect(() => {
    if (!file || !dirty) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      const res = await window.dmm.library.writeMap(file)
      if (res.ok) markSaved(res.data)
    }, 700)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [file, dirty, markSaved])

  const switchToTab = async (tabId: string) => {
    if (tabId === id) return
    await flushSave.current?.()
    navigate(`/maps/${tabId}`)
  }

  const handleCloseTab = async (tabId: string, e: MouseEvent) => {
    e.stopPropagation()
    if (tabId === id) await flushSave.current?.()
    const nextId = closeTab(tabId)
    if (tabId !== id) return
    if (nextId) navigate(`/maps/${nextId}`)
    else navigate('/')
  }

  const createMap = async () => {
    await flushSave.current?.()
    const res = await window.dmm.library.createMap('未命名思维导图')
    if (!res.ok) {
      showToast(res.message, 'error')
      return
    }
    openTab(res.data.map.id, res.data.map.title)
    navigate(`/maps/${res.data.map.id}`)
  }

  const hasDocument = Boolean(id && file && file.map.id === id)
  const showSettings = rightPanel === 'settings'
  const showAi = rightPanel === 'ai' && hasDocument && !showSettings

  return (
    <div
      className={`workspace ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}
      style={
        sidebarCollapsed
          ? undefined
          : ({ '--rail': `${sidebarWidth}px` } as CSSProperties)
      }
    >
      <WorkspaceSidebar activeId={id} />

      <div className="workspace-main">
        {showSettings ? (
          <SettingsPanel />
        ) : (
          <>
            <div className="chrome-a">
              {sidebarCollapsed && (
                <IconButton
                  className="chrome-a__sidebar-toggle"
                  label="展开思维导图列表"
                  icon={<IconPanelLeftOpen />}
                  onClick={toggleSidebar}
                />
              )}
              <div className="chrome-a__tabs" role="tablist" aria-label="已打开的思维导图">
                {tabs.length === 0 ? (
                  <span className="chrome-a__hint">从左侧打开思维导图</span>
                ) : (
                  <div className="chrome-a__tab-strip">
                    {tabs.map((tab) => {
                      const isActive = tab.id === id
                      const showDirty = isActive && dirty
                      return (
                        <div
                          key={tab.id}
                          role="tab"
                          aria-selected={isActive}
                          className={`editor-tab ${isActive ? 'is-active' : ''} ${showDirty ? 'is-dirty' : ''}`}
                          onClick={() => void switchToTab(tab.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              void switchToTab(tab.id)
                            }
                          }}
                          tabIndex={0}
                        >
                          <span className="editor-tab__title">{tab.title}</span>
                          {showDirty && (
                            <span className="editor-tab__dot" title="未保存" aria-label="未保存" />
                          )}
                          <button
                            type="button"
                            className="editor-tab__close"
                            title="关闭"
                            aria-label={`关闭 ${tab.title}`}
                            onClick={(e) => void handleCloseTab(tab.id, e)}
                          >
                            <IconClose size={11} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <IconButton
                  className="chrome-a__new"
                  label="新建思维导图"
                  icon={<IconPlus />}
                  onClick={() => void createMap()}
                />
              </div>

              <div className="chrome-a__end">
                <IconButton
                  label="设置"
                  icon={<IconSettings />}
                  onClick={() => toggleRightPanel('settings')}
                />
              </div>
            </div>

            {hasDocument ? (
              <div className="canvas-stage">
                <MindCanvas />
                {showAi ? (
                  <AiPanel />
                ) : (
                  <div className="ai-dock">
                    <IconButton
                      label="AI 助手"
                      className="ai-dock__btn"
                      icon={<IconSparkles size={15} />}
                      showLabel
                      onClick={() => toggleRightPanel('ai')}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="workspace-empty">
                <h2>选择或新建思维导图</h2>
                <p className="caption">左侧列表打开已有思维导图，或点击新建开始。</p>
                <IconButton
                  label="新建思维导图"
                  tone="primary"
                  showLabel
                  icon={<IconPlus />}
                  onClick={() => void createMap()}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
