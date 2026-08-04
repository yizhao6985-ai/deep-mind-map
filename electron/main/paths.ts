import { app } from 'electron'
import fs from 'fs'
import path from 'path'

const APP_DIR = 'DeepMindMap'

export function getDefaultLibraryRoot(): string {
  return path.join(app.getPath('documents'), APP_DIR)
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

export function getLibraryRoot(customPath?: string | null): string {
  const root = customPath && customPath.trim() ? customPath : getDefaultLibraryRoot()
  ensureDir(root)
  ensureDir(path.join(root, 'library'))
  return root
}

export function settingsPath(root: string): string {
  return path.join(root, 'settings.json')
}

export function secretsPath(root: string): string {
  return path.join(root, 'secrets.bin')
}

export function libraryDir(root: string): string {
  return path.join(root, 'library')
}

export function indexPath(root: string): string {
  return path.join(libraryDir(root), 'index.json')
}
