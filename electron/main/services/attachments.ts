import fs from 'fs'
import path from 'path'
import {
  kindFromMime,
  mimeFromExt,
  resolveModelCapabilities
} from '@shared/ai/modelCapabilities'
import type { AiAttachment, AiProviderType } from '@shared/types/domain'
import { readSettings } from './settings'

const TEXT_EXTS = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'html', 'log'])
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])

export function readAttachment(filePath: string): AiAttachment {
  const settings = readSettings()
  const caps = resolveModelCapabilities(settings.ai.model, settings.ai.providerType as AiProviderType)
  const name = path.basename(filePath)
  const ext = path.extname(filePath).slice(1).toLowerCase()
  const mimeType = mimeFromExt(ext)
  const kind = kindFromMime(mimeType)

  if (!fs.existsSync(filePath)) {
    const err = new Error('文件不存在')
    ;(err as Error & { code: string }).code = 'NOT_FOUND'
    throw err
  }

  const stat = fs.statSync(filePath)
  if (!stat.isFile()) {
    const err = new Error('不是有效文件')
    ;(err as Error & { code: string }).code = 'VALIDATION'
    throw err
  }

  if (IMAGE_EXTS.has(ext) || kind === 'image') {
    if (!caps.images) {
      const err = new Error('当前模型不支持图片素材，请切换到支持视觉的模型，或改用文本文件')
      ;(err as Error & { code: string }).code = 'VALIDATION'
      throw err
    }
    if (stat.size > caps.maxImageBytes) {
      const err = new Error(`图片过大（上限 ${Math.round(caps.maxImageBytes / 1024 / 1024)}MB）`)
      ;(err as Error & { code: string }).code = 'VALIDATION'
      throw err
    }
    const buf = fs.readFileSync(filePath)
    return {
      id: crypto.randomUUID(),
      name,
      kind: 'image',
      mimeType: mimeType.startsWith('image/') ? mimeType : 'image/png',
      size: stat.size,
      base64: buf.toString('base64')
    }
  }

  if (TEXT_EXTS.has(ext) || kind === 'text') {
    if (stat.size > caps.maxTextBytes) {
      const err = new Error(`文本过大（上限 ${Math.round(caps.maxTextBytes / 1000)}KB）`)
      ;(err as Error & { code: string }).code = 'VALIDATION'
      throw err
    }
    const text = fs.readFileSync(filePath, 'utf8')
    return {
      id: crypto.randomUUID(),
      name,
      kind: 'text',
      mimeType: mimeType.startsWith('text/') || mimeType === 'application/json' ? mimeType : 'text/plain',
      size: Buffer.byteLength(text, 'utf8'),
      text
    }
  }

  const err = new Error('不支持的素材类型。可上传文本（md/txt/json 等）' + (caps.images ? '或图片' : ''))
  ;(err as Error & { code: string }).code = 'VALIDATION'
  throw err
}
