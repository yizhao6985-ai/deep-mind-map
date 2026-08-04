import { app, BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { registerIpc } from './ipc'
import { resolveRoot, readSettings } from './services/settings'

/** Keep in sync with --chrome-a / --titlebar-traffic-* in tokens.css */
const TRAFFIC_LIGHT = {
  x: 16,
  // Visual center target is 24 ((48-12)/2+6). On macOS the rendered
  // lights sit ~2px lower than trafficLightPosition, so ask for 16.
  y: 16,
  size: 12
} as const

function resolveAppIcon(): string | undefined {
  // Dev: repo build/; packaged macOS uses .icns from the app bundle.
  const candidates = [
    join(__dirname, '../../build/icon.png'),
    join(process.resourcesPath, 'icon.png')
  ]
  return candidates.find((p) => existsSync(p))
}

/** Packaged builds: no DevTools menu items or reload shortcuts. */
function setupApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const allowDevTools = !app.isPackaged

  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' as const },
              { role: 'delete' as const },
              { role: 'selectAll' as const }
            ]
          : [
              { role: 'delete' as const },
              { type: 'separator' as const },
              { role: 'selectAll' as const }
            ])
      ]
    },
    {
      label: 'View',
      submenu: [
        ...(allowDevTools
          ? [
              { role: 'reload' as const },
              { role: 'forceReload' as const },
              { role: 'toggleDevTools' as const },
              { type: 'separator' as const }
            ]
          : []),
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' as const }, { role: 'front' as const }]
          : [{ role: 'close' as const }])
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function isDevToolsShortcut(input: Electron.Input): boolean {
  const key = input.key.toLowerCase()
  if (key === 'f12') return true
  const mod = input.control || input.meta
  if (!mod || !input.shift) return false
  return key === 'i' || key === 'j' || key === 'c'
}

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  const allowDevTools = !app.isPackaged
  const icon = resolveAppIcon()
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    title: 'Deep Mind Map',
    backgroundColor: '#fafafa',
    ...(icon ? { icon } : {}),
    ...(isMac
      ? {
          titleBarStyle: 'hidden' as const,
          trafficLightPosition: { x: TRAFFIC_LIGHT.x, y: TRAFFIC_LIGHT.y }
        }
      : {
          titleBarStyle: 'hidden' as const,
          titleBarOverlay: {
            color: '#fafafa',
            symbolColor: '#171717',
            height: 48
          }
        }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      // Packaged: users must not open Chromium DevTools.
      devTools: allowDevTools
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    if (isMac) {
      win.setWindowButtonPosition({ x: TRAFFIC_LIGHT.x, y: TRAFFIC_LIGHT.y })
    }
  })

  if (!allowDevTools) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && isDevToolsShortcut(input)) {
        event.preventDefault()
      }
    })
    win.webContents.on('devtools-opened', () => {
      win.webContents.closeDevTools()
    })
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  resolveRoot(readSettings())
  registerIpc()
  setupApplicationMenu()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
