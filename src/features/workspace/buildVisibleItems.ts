import type { LibraryFolder, LibraryMapMeta } from '@shared/types/domain'

export type TreeItem =
  | { kind: 'folder'; folder: LibraryFolder; depth: number }
  | { kind: 'map'; map: LibraryMapMeta; depth: number }

export function buildVisibleItems(
  folders: LibraryFolder[],
  maps: LibraryMapMeta[],
  expanded: Set<string>
): TreeItem[] {
  const byParent = new Map<string | null, LibraryFolder[]>()
  for (const f of folders) {
    const key = f.parentId
    const list = byParent.get(key) ?? []
    list.push(f)
    byParent.set(key, list)
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  }

  const mapsByFolder = new Map<string | null, LibraryMapMeta[]>()
  for (const m of maps) {
    const key = m.folderId
    const list = mapsByFolder.get(key) ?? []
    list.push(m)
    mapsByFolder.set(key, list)
  }
  for (const list of mapsByFolder.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  }

  const items: TreeItem[] = []

  const walk = (parentId: string | null, depth: number) => {
    for (const folder of byParent.get(parentId) ?? []) {
      items.push({ kind: 'folder', folder, depth })
      if (expanded.has(folder.id)) {
        walk(folder.id, depth + 1)
        for (const map of mapsByFolder.get(folder.id) ?? []) {
          items.push({ kind: 'map', map, depth: depth + 1 })
        }
      }
    }
  }

  walk(null, 0)
  for (const map of mapsByFolder.get(null) ?? []) {
    items.push({ kind: 'map', map, depth: 0 })
  }

  // 远程拉取等场景：folderId 指向本地不存在的文件夹时，仍展示在根级，避免“写了磁盘但列表空白”
  const knownFolderIds = new Set(folders.map((f) => f.id))
  const orphanMaps: LibraryMapMeta[] = []
  for (const [folderId, list] of mapsByFolder) {
    if (folderId != null && !knownFolderIds.has(folderId)) {
      orphanMaps.push(...list)
    }
  }
  orphanMaps.sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'))
  for (const map of orphanMaps) {
    items.push({ kind: 'map', map, depth: 0 })
  }

  return items
}
