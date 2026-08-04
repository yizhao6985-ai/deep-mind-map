import fs from 'fs'
import { dialog, BrowserWindow } from 'electron'
import { parseMindMapFile } from '@shared/schema/mindmap'
import type { MindMapFile } from '@shared/types/domain'
import * as library from './library'

export async function saveExport(args: {
  format: 'dmm' | 'markdown' | 'svg' | 'png' | 'pdf'
  defaultName: string
  content: string
  encoding?: 'utf8' | 'base64'
}): Promise<string> {
  const ext =
    args.format === 'dmm'
      ? 'dmm.json'
      : args.format === 'markdown'
        ? 'md'
        : args.format

  const win = BrowserWindow.getFocusedWindow()
  const { filePath, canceled } = await (win
    ? dialog.showSaveDialog(win, {
        defaultPath: args.defaultName.endsWith(`.${ext}`)
          ? args.defaultName
          : `${args.defaultName}.${ext}`,
        filters: [{ name: ext, extensions: [ext === 'dmm.json' ? 'dmm.json' : ext] }]
      })
    : dialog.showSaveDialog({
        defaultPath: args.defaultName.endsWith(`.${ext}`)
          ? args.defaultName
          : `${args.defaultName}.${ext}`,
        filters: [{ name: ext, extensions: [ext === 'dmm.json' ? 'dmm.json' : ext] }]
      }))
  if (canceled || !filePath) {
    const err = new Error('已取消')
    ;(err as Error & { code: string }).code = 'CANCELLED'
    throw err
  }

  if (args.encoding === 'base64') {
    fs.writeFileSync(filePath, Buffer.from(args.content, 'base64'))
  } else {
    fs.writeFileSync(filePath, args.content, 'utf8')
  }
  return filePath
}

export async function openDmmFile(): Promise<MindMapFile | null> {
  const win = BrowserWindow.getFocusedWindow()
  const { canceled, filePaths } = await (win
    ? dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [
          { name: 'Deep Mind Map', extensions: ['dmm.json', 'json'] },
          { name: 'All', extensions: ['*'] }
        ]
      })
    : dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Deep Mind Map', extensions: ['dmm.json', 'json'] },
          { name: 'All', extensions: ['*'] }
        ]
      }))
  if (canceled || !filePaths[0]) return null
  const raw = JSON.parse(fs.readFileSync(filePaths[0], 'utf8'))
  const parsed = parseMindMapFile(raw)
  if (!parsed.success) {
    const err = new Error('文件格式无效或版本不兼容')
    ;(err as Error & { code: string }).code = 'SCHEMA_INCOMPATIBLE'
    throw err
  }
  return library.importMapFile(parsed.data)
}

export async function openMarkdownFile(): Promise<{ title: string; markdown: string } | null> {
  const win = BrowserWindow.getFocusedWindow()
  const { canceled, filePaths } = await (win
    ? dialog.showOpenDialog(win, {
        properties: ['openFile'],
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      })
    : dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }]
      }))
  if (canceled || !filePaths[0]) return null
  const markdown = fs.readFileSync(filePaths[0], 'utf8')
  const title = filePaths[0].split(/[/\\]/).pop()?.replace(/\.md$/i, '') || '导入的思维导图'
  return { title, markdown }
}
