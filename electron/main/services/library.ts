import fs from 'fs'
import path from 'path'
import { v4 as uuid } from 'uuid'
import type { LibraryFolder, LibraryMapMeta, LibraryTree, MindMapFile } from '@shared/types/domain'
import { parseMindMapFile } from '@shared/schema/mindmap'
import { createEmptyMap } from '@shared/mindmap/convert'
import { layoutMindMap as layout } from '@shared/mindmap/layout'
import { indexPath, libraryDir } from '../paths'
import { patchSettings, readSettings, resolveRoot } from './settings'

type IndexFile = {
  folders: LibraryFolder[]
}

function readIndex(root: string): IndexFile {
  const p = indexPath(root)
  if (!fs.existsSync(p)) {
    const empty: IndexFile = { folders: [] }
    fs.writeFileSync(p, JSON.stringify(empty, null, 2))
    return empty
  }
  return JSON.parse(fs.readFileSync(p, 'utf8')) as IndexFile
}

function writeIndex(root: string, index: IndexFile): void {
  fs.writeFileSync(indexPath(root), JSON.stringify(index, null, 2), 'utf8')
}

function mapFilePath(root: string, relativePath: string): string {
  return path.join(libraryDir(root), relativePath)
}

function sanitizeFolderName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) throw Object.assign(new Error('文件夹名称不能为空'), { code: 'VALIDATION' })
  if (/[\\/:*?"<>|]/.test(trimmed) || trimmed === '.' || trimmed === '..') {
    throw Object.assign(new Error('文件夹名称包含非法字符'), { code: 'VALIDATION' })
  }
  return trimmed
}

function folderById(folders: LibraryFolder[], id: string): LibraryFolder {
  const folder = folders.find((f) => f.id === id)
  if (!folder) throw Object.assign(new Error('文件夹不存在'), { code: 'NOT_FOUND' })
  return folder
}

/** Walk parentId chain → relative directory under library/ (POSIX-style). */
export function folderRelativePath(folders: LibraryFolder[], folderId: string | null): string {
  if (!folderId) return ''
  const parts: string[] = []
  let current: string | null = folderId
  const seen = new Set<string>()
  while (current) {
    if (seen.has(current)) throw Object.assign(new Error('文件夹层级存在循环'), { code: 'VALIDATION' })
    seen.add(current)
    const folder = folderById(folders, current)
    parts.unshift(folder.name)
    current = folder.parentId
  }
  return parts.join('/')
}

function assertParentExists(folders: LibraryFolder[], parentId: string | null): void {
  if (parentId == null) return
  folderById(folders, parentId)
}

function assertUniqueSiblingName(
  folders: LibraryFolder[],
  parentId: string | null,
  name: string,
  exceptId?: string
): void {
  const clash = folders.some(
    (f) => f.parentId === parentId && f.name === name && f.id !== exceptId
  )
  if (clash) throw Object.assign(new Error('同级已存在同名文件夹'), { code: 'VALIDATION' })
}

function isDescendant(folders: LibraryFolder[], ancestorId: string, maybeChildId: string): boolean {
  let current: string | null = maybeChildId
  const seen = new Set<string>()
  while (current) {
    if (current === ancestorId) return true
    if (seen.has(current)) return false
    seen.add(current)
    current = folders.find((f) => f.id === current)?.parentId ?? null
  }
  return false
}

function collectDescendantFolderIds(folders: LibraryFolder[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const f of folders) {
      if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        changed = true
      }
    }
  }
  return ids
}

function scanMaps(root: string): LibraryMapMeta[] {
  const lib = libraryDir(root)
  const maps: LibraryMapMeta[] = []

  const walk = (dir: string, rel = '') => {
    if (!fs.existsSync(dir)) return
    for (const name of fs.readdirSync(dir)) {
      if (name === 'index.json') continue
      const full = path.join(dir, name)
      const st = fs.statSync(full)
      if (st.isDirectory()) {
        walk(full, path.join(rel, name))
        continue
      }
      if (!name.endsWith('.dmm.json')) continue
      try {
        const raw = JSON.parse(fs.readFileSync(full, 'utf8'))
        const parsed = parseMindMapFile(raw)
        if (!parsed.success) continue
        const relativePath = path.join(rel, name).replace(/\\/g, '/')
        maps.push({
          id: parsed.data.map.id,
          title: parsed.data.map.title,
          folderId: parsed.data.map.folderId,
          updatedAt: parsed.data.updatedAt,
          relativePath
        })
      } catch {
        /* skip */
      }
    }
  }

  walk(lib, '')
  return maps
}

export function listLibrary(): LibraryTree {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  return { folders: index.folders, maps: scanMaps(root) }
}

function findMapMeta(id: string): { root: string; meta: LibraryMapMeta } | null {
  const root = resolveRoot(readSettings())
  const meta = scanMaps(root).find((m) => m.id === id)
  if (!meta) return null
  return { root, meta }
}

export function readMap(id: string): MindMapFile {
  const found = findMapMeta(id)
  if (!found) throw Object.assign(new Error('思维导图不存在'), { code: 'NOT_FOUND' })
  const full = mapFilePath(found.root, found.meta.relativePath)
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'))
  const parsed = parseMindMapFile(raw)
  if (!parsed.success) throw Object.assign(new Error('思维导图文件损坏或版本不兼容'), { code: 'SCHEMA_INCOMPATIBLE' })
  touchRecent(id)
  return parsed.data
}

function touchRecent(id: string): void {
  const s = readSettings()
  const recent = [id, ...s.recentMapIds.filter((x) => x !== id)].slice(0, 20)
  patchSettings({ recentMapIds: recent })
}

function relativePathForMap(
  folders: LibraryFolder[],
  mapId: string,
  folderId: string | null
): string {
  const dir = folderRelativePath(folders, folderId)
  const file = `${mapId}.dmm.json`
  return dir ? `${dir}/${file}` : file
}

function pruneEmptyDirs(startDir: string, stopAt: string): void {
  let dir = startDir
  while (dir && dir !== stopAt && dir.startsWith(stopAt)) {
    if (!fs.existsSync(dir)) break
    if (fs.readdirSync(dir).length > 0) break
    const parent = path.dirname(dir)
    try {
      fs.rmdirSync(dir)
    } catch {
      break
    }
    dir = parent
  }
}

function moveFileIfNeeded(root: string, from: string, to: string): void {
  if (from === to) return
  fs.mkdirSync(path.dirname(to), { recursive: true })
  fs.renameSync(from, to)
  pruneEmptyDirs(path.dirname(from), libraryDir(root))
}

export function writeMap(file: MindMapFile): MindMapFile {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  if (file.map.folderId) {
    folderById(index.folders, file.map.folderId)
  }
  const next: MindMapFile = {
    ...file,
    schemaVersion: 1,
    app: 'deep-mind-map',
    updatedAt: new Date().toISOString()
  }
  const existing = scanMaps(root).find((m) => m.id === file.map.id)
  const desired = relativePathForMap(index.folders, file.map.id, file.map.folderId)
  const relativePath = existing?.relativePath ?? desired
  const full = mapFilePath(root, relativePath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  const tmp = full + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
  fs.renameSync(tmp, full)

  // If folderId changed vs on-disk path, relocate after write
  if (existing && existing.relativePath !== desired) {
    const dest = mapFilePath(root, desired)
    moveFileIfNeeded(root, full, dest)
  }

  touchRecent(file.map.id)
  return next
}

export function createMap(title: string, folderId: string | null = null): MindMapFile {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  if (folderId) folderById(index.folders, folderId)

  let map = createEmptyMap(title, folderId)
  map = { ...map, nodes: layout(map.nodes, map.mapStyle) }
  const file: MindMapFile = {
    schemaVersion: 1,
    app: 'deep-mind-map',
    updatedAt: new Date().toISOString(),
    map
  }

  const relativePath = relativePathForMap(index.folders, map.id, folderId)
  const full = mapFilePath(root, relativePath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  const tmp = full + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(file, null, 2), 'utf8')
  fs.renameSync(tmp, full)
  touchRecent(map.id)
  return file
}

export function deleteMap(id: string): void {
  const found = findMapMeta(id)
  if (!found) throw Object.assign(new Error('思维导图不存在'), { code: 'NOT_FOUND' })
  const full = mapFilePath(found.root, found.meta.relativePath)
  fs.unlinkSync(full)
}

export function renameMap(id: string, title: string): MindMapFile {
  const file = readMap(id)
  const prevTitle = file.map.title
  file.map.title = title
  const root = file.map.nodes.find((n) => n.parentId === null)
  if (root && (root.text === '中心主题' || root.text === prevTitle)) {
    root.text = title
  }
  return writeMap(file)
}

export function moveMap(id: string, folderId: string | null): MindMapFile {
  const file = readMap(id)
  file.map.folderId = folderId
  return writeMap(file)
}

export function createFolder(name: string, parentId: string | null = null): string {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  const clean = sanitizeFolderName(name)
  assertParentExists(index.folders, parentId)
  assertUniqueSiblingName(index.folders, parentId, clean)

  const id = uuid()
  index.folders.push({ id, name: clean, parentId })
  writeIndex(root, index)

  const rel = folderRelativePath(index.folders, id)
  const dir = path.join(libraryDir(root), ...rel.split('/'))
  fs.mkdirSync(dir, { recursive: true })
  return id
}

export function renameFolder(id: string, name: string): LibraryFolder {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  const folder = folderById(index.folders, id)
  const clean = sanitizeFolderName(name)
  if (clean === folder.name) return folder

  assertUniqueSiblingName(index.folders, folder.parentId, clean, id)

  const oldRel = folderRelativePath(index.folders, id)
  folder.name = clean
  const newRel = folderRelativePath(index.folders, id)

  const oldDir = path.join(libraryDir(root), ...oldRel.split('/'))
  const newDir = path.join(libraryDir(root), ...newRel.split('/'))
  if (fs.existsSync(oldDir) && oldDir !== newDir) {
    fs.mkdirSync(path.dirname(newDir), { recursive: true })
    fs.renameSync(oldDir, newDir)
  } else {
    fs.mkdirSync(newDir, { recursive: true })
  }

  writeIndex(root, index)
  return { ...folder }
}

export function deleteFolder(id: string): void {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  folderById(index.folders, id)

  const removeIds = collectDescendantFolderIds(index.folders, id)
  const maps = scanMaps(root)
  for (const map of maps) {
    if (map.folderId && removeIds.has(map.folderId)) {
      const full = mapFilePath(root, map.relativePath)
      if (fs.existsSync(full)) fs.unlinkSync(full)
    }
  }

  const rel = folderRelativePath(index.folders, id)
  const dir = path.join(libraryDir(root), ...rel.split('/'))
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true })
  }

  index.folders = index.folders.filter((f) => !removeIds.has(f.id))
  writeIndex(root, index)
}

/** Move a folder under a new parent (supports multi-level reorg). */
export function moveFolder(id: string, parentId: string | null): LibraryFolder {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  const folder = folderById(index.folders, id)
  assertParentExists(index.folders, parentId)

  if (parentId === id || (parentId && isDescendant(index.folders, id, parentId))) {
    throw Object.assign(new Error('不能将文件夹移动到自身或其子文件夹下'), { code: 'VALIDATION' })
  }
  if (folder.parentId === parentId) return folder

  assertUniqueSiblingName(index.folders, parentId, folder.name, id)

  const oldRel = folderRelativePath(index.folders, id)
  folder.parentId = parentId
  const newRel = folderRelativePath(index.folders, id)

  const oldDir = path.join(libraryDir(root), ...oldRel.split('/'))
  const newDir = path.join(libraryDir(root), ...newRel.split('/'))
  if (fs.existsSync(oldDir) && oldDir !== newDir) {
    fs.mkdirSync(path.dirname(newDir), { recursive: true })
    fs.renameSync(oldDir, newDir)
  } else {
    fs.mkdirSync(newDir, { recursive: true })
  }

  writeIndex(root, index)
  return { ...folder }
}

export function importMapFile(file: MindMapFile): MindMapFile {
  const id = uuid()
  const next: MindMapFile = {
    ...file,
    map: { ...file.map, id, folderId: null },
    updatedAt: new Date().toISOString()
  }
  return writeMap(next)
}

export function listMapFilesForSync(): { relativePath: string; file: MindMapFile }[] {
  const root = resolveRoot(readSettings())
  return scanMaps(root).map((meta) => {
    const full = mapFilePath(root, meta.relativePath)
    const file = JSON.parse(fs.readFileSync(full, 'utf8')) as MindMapFile
    return { relativePath: meta.relativePath, file }
  })
}

export function writeMapAtRelativePath(relativePath: string, file: MindMapFile): void {
  const root = resolveRoot(readSettings())
  const index = readIndex(root)
  const folderId =
    file.map.folderId && index.folders.some((f) => f.id === file.map.folderId)
      ? file.map.folderId
      : null
  const next: MindMapFile =
    folderId === file.map.folderId
      ? file
      : { ...file, map: { ...file.map, folderId: null } }
  const full = mapFilePath(root, relativePath)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  const tmp = full + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8')
  fs.renameSync(tmp, full)
}
