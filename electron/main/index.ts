import { app, BrowserWindow, shell } from 'electron'
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

function createWindow(): void {
  const isMac = process.platform === 'darwin'
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    show: false,
    title: 'Deep Mind Map',
    backgroundColor: '#fafafa',
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
      sandbox: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    if (isMac) {
      win.setWindowButtonPosition({ x: TRAFFIC_LIGHT.x, y: TRAFFIC_LIGHT.y })
    }
  })

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
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
