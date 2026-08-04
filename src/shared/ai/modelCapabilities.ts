import type { AiModelCapabilities, AiProviderType } from '@shared/types/domain'

const VISION_PATTERNS = [
  /gpt-4o/i,
  /gpt-4\.1/i,
  /gpt-4-turbo/i,
  /gpt-4-vision/i,
  /gpt-5/i,
  /o[1-9]/i,
  /claude-3/i,
  /claude-4/i,
  /claude-sonnet/i,
  /claude-opus/i,
  /claude-haiku/i,
  /gemini/i,
  /llava/i,
  /vision/i,
  /qwen.*vl/i,
  /vl-/i,
  /-vl$/i,
  /llama3\.2-vision/i,
  /moondream/i,
  /minicpm-v/i,
  /phi-3-vision/i,
  /pixtral/i
]

/** 根据当前 Provider + 模型名推断可上传素材能力（启发式，可被设置覆盖的空间留给后续） */
export function resolveModelCapabilities(
  model: string,
  providerType: AiProviderType
): AiModelCapabilities {
  const name = model.trim()
  const images =
    Boolean(name) &&
    (providerType === 'anthropic' || VISION_PATTERNS.some((re) => re.test(name)))

  return {
    textFiles: true,
    images,
    maxTextBytes: 120_000,
    maxImageBytes: 4 * 1024 * 1024
  }
}

export function attachmentDialogFilters(caps: AiModelCapabilities): {
  name: string
  extensions: string[]
}[] {
  const filters: { name: string; extensions: string[] }[] = [
    { name: '文本素材', extensions: ['txt', 'md', 'markdown', 'json', 'csv', 'html', 'log'] }
  ]
  if (caps.images) {
    filters.unshift({
      name: '图片',
      extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp']
    })
    filters.push({
      name: '全部支持',
      extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'txt', 'md', 'markdown', 'json', 'csv', 'html', 'log']
    })
  }
  return filters
}

export function mimeFromExt(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, '')
  const map: Record<string, string> = {
    txt: 'text/plain',
    md: 'text/markdown',
    markdown: 'text/markdown',
    json: 'application/json',
    csv: 'text/csv',
    html: 'text/html',
    log: 'text/plain',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp'
  }
  return map[e] ?? 'application/octet-stream'
}

export function kindFromMime(mime: string): 'text' | 'image' | null {
  if (mime.startsWith('image/')) return 'image'
  if (
    mime.startsWith('text/') ||
    mime === 'application/json' ||
    mime === 'application/csv'
  ) {
    return 'text'
  }
  return null
}

export const AGENT_WELCOME =
  '你好，我是 AI 助手（Agent）。可以说「展开内存管理」「把刚才讨论沉淀成思维导图」——我会自己查看思维导图并定位修改，不用先选中节点。'

export const ASK_WELCOME =
  '你好，我是 AI 助手（Ask）。可以提问、讨论思维导图内容；此模式不会修改思维导图。需要改图时请切换到 Agent。'

export function welcomeTextForMode(mode: 'ask' | 'agent'): string {
  return mode === 'ask' ? ASK_WELCOME : AGENT_WELCOME
}

export function createWelcomeMessage(mode: 'ask' | 'agent' = 'agent'): {
  id: string
  role: 'assistant'
  content: string
  createdAt: string
} {
  return {
    id: 'welcome',
    role: 'assistant',
    content: welcomeTextForMode(mode),
    createdAt: new Date().toISOString()
  }
}

export function conversationTitleFromMessage(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '新对话'
  return cleaned.length > 28 ? `${cleaned.slice(0, 28)}…` : cleaned
}
