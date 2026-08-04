import { describe, expect, it } from 'vitest'
import {
  attachmentDialogFilters,
  conversationTitleFromMessage,
  resolveModelCapabilities
} from './modelCapabilities'

describe('resolveModelCapabilities', () => {
  it('enables images for gpt-4o', () => {
    const caps = resolveModelCapabilities('gpt-4o-mini', 'openai-compatible')
    expect(caps.images).toBe(true)
    expect(caps.textFiles).toBe(true)
  })

  it('enables images for anthropic models', () => {
    const caps = resolveModelCapabilities('claude-3-5-haiku-latest', 'anthropic')
    expect(caps.images).toBe(true)
  })

  it('disables images for plain llama', () => {
    const caps = resolveModelCapabilities('llama3.2', 'ollama')
    expect(caps.images).toBe(false)
  })

  it('enables images for llava', () => {
    const caps = resolveModelCapabilities('llava', 'ollama')
    expect(caps.images).toBe(true)
  })
})

describe('attachmentDialogFilters', () => {
  it('omits image filter when no vision', () => {
    const filters = attachmentDialogFilters({
      textFiles: true,
      images: false,
      maxTextBytes: 1,
      maxImageBytes: 1
    })
    expect(filters.some((f) => f.name === '图片')).toBe(false)
  })
})

describe('conversationTitleFromMessage', () => {
  it('truncates long titles', () => {
    const title = conversationTitleFromMessage(
      '这是一段用来测试会话标题截断逻辑的非常非常非常非常非常长的用户消息'
    )
    expect(title.endsWith('…')).toBe(true)
    expect([...title].length).toBeLessThanOrEqual(29)
  })
})
