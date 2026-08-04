import { BrowserWindow } from 'electron'
import { generateObject, generateText, streamText, APICallError, stepCountIs } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import type {
  AiAction,
  AiAgentProgress,
  AiAgentResponse,
  AiAttachment,
  AiProviderType,
  AiTreeDraft
} from '@shared/types/domain'
import { createMindMapAgentTools } from './agent-tools'
import { getSecret } from './secrets'
import { readSettings } from './settings'

function emitAiProgress(event: AiAgentProgress): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('ai:progress', event)
  }
}

let activeAiAbort: AbortController | null = null

export function abortActiveAi(): boolean {
  if (!activeAiAbort) return false
  activeAiAbort.abort()
  return true
}

function throwCancelled(): never {
  const err = new Error('已停止生成')
  ;(err as Error & { code: string }).code = 'CANCELLED'
  throw err
}

function toolLabel(name: string): string {
  switch (name) {
    case 'getMapOutline':
      return '读取思维导图大纲'
    case 'findNodes':
      return '查找节点'
    case 'getNode':
      return '查看节点'
    case 'replaceMap':
      return '重建整图'
    case 'expandNode':
      return '展开节点'
    case 'updateNodeText':
      return '改写节点'
    case 'addChild':
      return '添加子节点'
    case 'deleteNode':
      return '删除节点'
    default:
      return name
  }
}

function toolDetail(name: string, input: unknown): string | undefined {
  if (!input || typeof input !== 'object') return undefined
  const i = input as Record<string, unknown>
  if (name === 'findNodes' && typeof i.query === 'string' && i.query.trim()) {
    return i.query.trim().slice(0, 48)
  }
  if (name === 'updateNodeText' && typeof i.text === 'string') {
    return i.text.trim().slice(0, 40)
  }
  if (name === 'addChild' && typeof i.text === 'string') {
    return i.text.trim().slice(0, 40)
  }
  if (name === 'expandNode' && Array.isArray(i.children)) {
    return `${i.children.length} 个子节点`
  }
  if (name === 'replaceMap') return '整图替换'
  if (name === 'deleteNode') return '删除节点'
  return undefined
}

export const PROMPT_VERSION = 3

const treeNodeSchema: z.ZodType<{ text: string; children?: Array<{ text: string; children?: unknown[] }> }> =
  z.lazy(() =>
    z.object({
      text: z.string(),
      children: z.array(treeNodeSchema).optional()
    })
  )

const treeDraftSchema = z.object({
  title: z.string().optional(),
  rootText: z.string(),
  children: z.array(treeNodeSchema).optional().default([])
})

const explanationSchema = z.object({
  explanation: z.string()
})

const agentOpSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({ type: z.literal('replaceMap'), draft: treeDraftSchema }),
  z.object({
    type: z.literal('expandNode'),
    nodeId: z.string(),
    children: z.array(treeNodeSchema).default([])
  }),
  z.object({ type: z.literal('updateNodeText'), nodeId: z.string(), text: z.string() }),
  z.object({
    type: z.literal('addChild'),
    parentId: z.string(),
    text: z.string(),
    nodeId: z.string().optional()
  }),
  z.object({ type: z.literal('deleteNode'), nodeId: z.string() })
])

const agentResponseSchema = z.object({
  reply: z.string(),
  operations: z.array(agentOpSchema).default([])
})

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '')
}

function ollamaOpenAiBase(host: string): string {
  const base = normalizeBaseUrl(host || 'http://127.0.0.1:11434')
  return base.endsWith('/v1') ? base : `${base}/v1`
}

function getLanguageModel() {
  const settings = readSettings()
  const { providerType, baseUrl, model } = settings.ai
  const apiKey = getSecret('ai.apiKey')

  if (!model?.trim()) {
    const err = new Error('请先配置模型名')
    ;(err as Error & { code: string }).code = 'VALIDATION'
    throw err
  }

  if (providerType === 'anthropic') {
    if (!apiKey) {
      const err = new Error('请先配置 Anthropic API Key')
      ;(err as Error & { code: string }).code = 'UNAUTHORIZED'
      throw err
    }
    const anthropic = createAnthropic({
      apiKey,
      ...(baseUrl.trim() ? { baseURL: normalizeBaseUrl(baseUrl) } : {})
    })
    return anthropic(model)
  }

  if (providerType === 'ollama') {
    const openai = createOpenAI({
      apiKey: apiKey || 'ollama',
      baseURL: ollamaOpenAiBase(baseUrl || 'http://127.0.0.1:11434'),
      name: 'ollama'
    })
    return openai.chat(model)
  }

  if (!apiKey) {
    const err = new Error('请先配置 API Key')
    ;(err as Error & { code: string }).code = 'UNAUTHORIZED'
    throw err
  }
  const openai = createOpenAI({
    apiKey,
    baseURL: normalizeBaseUrl(baseUrl || 'https://api.openai.com/v1'),
    name: 'openai-compatible'
  })
  return openai.chat(model)
}

function mapSdkError(e: unknown): never {
  if (APICallError.isInstance(e)) {
    const status = e.statusCode
    if (status === 401 || status === 403) {
      const err = new Error('Token 无效或已过期，请检查 API Key')
      ;(err as Error & { code: string }).code = 'UNAUTHORIZED'
      throw err
    }
    if (status === 404) {
      const err = new Error('模型或接口不存在，请检查 Base URL 与模型名')
      ;(err as Error & { code: string }).code = 'NOT_FOUND'
      throw err
    }
    const err = new Error(`AI 请求失败（${status ?? '网络'}）：${e.message.slice(0, 200)}`)
    ;(err as Error & { code: string }).code = status ? 'UNKNOWN' : 'NETWORK'
    throw err
  }
  if (e instanceof Error && (e.name === 'AbortError' || /timeout|aborted/i.test(e.message))) {
    const err = new Error('请求超时，请稍后重试')
    ;(err as Error & { code: string }).code = 'TIMEOUT'
    throw err
  }
  if (e instanceof TypeError) {
    const err = new Error('网络不可用，请稍后重试')
    ;(err as Error & { code: string }).code = 'NETWORK'
    throw err
  }
  throw e instanceof Error ? e : new Error(String(e))
}

type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mediaType?: string }

async function chatText(system: string, user: string): Promise<string> {
  const settings = readSettings()
  try {
    const { text } = await generateText({
      model: getLanguageModel(),
      system,
      prompt: user,
      temperature: settings.ai.temperature,
      abortSignal: AbortSignal.timeout(60_000)
    })
    if (!text?.trim()) throw new Error('AI 返回为空')
    return text
  } catch (e) {
    mapSdkError(e)
  }
}

async function chatObject<T>(
  system: string,
  user: string,
  schema: z.ZodType<T>,
  imageParts?: UserContentPart[]
): Promise<T> {
  const settings = readSettings()
  const images = (imageParts ?? []).filter((p): p is Extract<UserContentPart, { type: 'image' }> => p.type === 'image')

  try {
    if (images.length > 0) {
      const { object } = await generateObject({
        model: getLanguageModel(),
        schema,
        system,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: user }, ...images]
          }
        ],
        temperature: settings.ai.temperature,
        abortSignal: AbortSignal.timeout(90_000)
      })
      return object
    }

    const { object } = await generateObject({
      model: getLanguageModel(),
      schema,
      system,
      prompt: user,
      temperature: settings.ai.temperature,
      abortSignal: AbortSignal.timeout(60_000)
    })
    return object
  } catch (e) {
    try {
      if (images.length > 0) throw e
      const text = await chatText(
        `${system}\n请只返回合法 JSON，不要 Markdown 代码围栏。`,
        user
      )
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim()
      const parsed = schema.safeParse(JSON.parse(cleaned))
      if (!parsed.success) throw new Error('AI 返回结构无效')
      return parsed.data
    } catch (inner) {
      if ((inner as Error & { code?: string }).code) throw inner
      mapSdkError(e)
    }
  }
}

function toDraft(data: {
  title?: string
  rootText: string
  children?: Array<{ text: string; children?: unknown[] }>
}): AiTreeDraft {
  return {
    title: data.title,
    rootText: data.rootText || data.title || '中心主题',
    children: (data.children ?? []) as AiTreeDraft['children']
  }
}

function formatAttachmentsBlock(attachments: AiAttachment[] | undefined): {
  textBlock: string
  imageParts: UserContentPart[]
} {
  if (!attachments?.length) return { textBlock: '', imageParts: [] }

  const textChunks: string[] = []
  const imageParts: UserContentPart[] = []

  for (const a of attachments) {
    if (a.kind === 'text' && a.text) {
      const body = a.text.length > 12_000 ? `${a.text.slice(0, 12_000)}\n…(已截断)` : a.text
      textChunks.push(`【素材: ${a.name}】\n${body}`)
    } else if (a.kind === 'image' && a.base64) {
      textChunks.push(`【图片素材: ${a.name}】（见附图）`)
      imageParts.push({
        type: 'image',
        image: `data:${a.mimeType};base64,${a.base64}`,
        mediaType: a.mimeType
      })
    }
  }

  return {
    textBlock: textChunks.length ? `\n\n用户上传的素材：\n${textChunks.join('\n\n')}` : '',
    imageParts
  }
}

function buildOutlineFromSnaps(
  nodes: Array<{ id: string; parentId: string | null; text: string; order: number }>
): string {
  const root = nodes.find((n) => n.parentId === null)
  if (!root) return '（空图）'
  const childrenOf = (pid: string) =>
    nodes.filter((n) => n.parentId === pid).sort((a, b) => a.order - b.order)
  const lines: string[] = []
  const walk = (id: string, depth: number) => {
    const node = nodes.find((n) => n.id === id)
    if (!node) return
    lines.push(`${'  '.repeat(depth)}- [${node.id}] ${node.text}`)
    for (const c of childrenOf(id)) walk(c.id, depth + 1)
  }
  walk(root.id, 0)
  return lines.join('\n')
}

export async function testConnection(): Promise<{ model: string; providerType: AiProviderType }> {
  const settings = readSettings()
  await chatText('你是连通性测试助手。只回复：ok', 'ping')
  return { model: settings.ai.model, providerType: settings.ai.providerType }
}

const AGENT_SYSTEM = `你是 Deep Mind Map 的 AI 助手：讨论知识，并用工具读写当前思维导图。

工作方式：
1. 不要要求用户选中节点。用 getMapOutline / findNodes / getNode 自行了解思维导图并定位要改的位置。
2. 纯讨论时只回复文字，不要调用改图工具。
3. 用户要求整理/展开/改写/删除时，先定位节点，再调用 replaceMap / expandNode / updateNodeText / addChild / deleteNode。
4. 改图工具返回的 id 才是真实节点 id，禁止编造。
5. 本轮最多约 5 次改图；优先完成用户明确要求。
6. 最终用简洁中文回复用户（1～4 句），说明你做了什么或讨论结论。`

const ASK_SYSTEM = `你是 Deep Mind Map 的问答助手：只回答问题与讨论知识，绝不修改思维导图。

工作方式：
1. 可用 getMapOutline / findNodes / getNode 只读了解当前思维导图，以便结合内容作答。
2. 禁止改图：没有也不要假装有 replaceMap / expandNode / updateNodeText / addChild / deleteNode。
3. 若用户要求改图，用简洁中文说明需切换到 Agent 模式，并仍可先给出建议或思路。
4. 最终用简洁中文回复（可稍详，但避免废话）。`

async function runAgentChatWithTools(
  action: Extract<AiAction, { type: 'agentChat' }>
): Promise<AiAgentResponse> {
  const settings = readSettings()
  const mode = action.mode === 'ask' ? 'ask' : 'agent'
  const { textBlock, imageParts } = formatAttachmentsBlock(action.attachments)
  const { tools, getOperations } = createMindMapAgentTools(action.mapNodes, action.mapTitle, {
    readOnly: mode === 'ask'
  })
  const systemBase = mode === 'ask' ? ASK_SYSTEM : AGENT_SYSTEM

  const historyMessages = action.history.slice(-8).map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content
  }))

  const userText = `${action.message || '（见素材）'}${textBlock}`
  const userContent: UserContentPart[] =
    imageParts.length > 0
      ? [{ type: 'text', text: userText }, ...imageParts]
      : [{ type: 'text', text: userText }]

  emitAiProgress({ type: 'status', status: 'started' })

  const runAbort = new AbortController()
  activeAiAbort = runAbort
  try {
    const result = streamText({
      model: getLanguageModel(),
      system: `${systemBase}\n当前思维导图标题：${action.mapTitle}`,
      messages: [...historyMessages, { role: 'user', content: userContent }],
      tools,
      stopWhen: stepCountIs(mode === 'ask' ? 6 : 10),
      temperature: settings.ai.temperature,
      abortSignal: AbortSignal.any([AbortSignal.timeout(120_000), runAbort.signal]),
      onStepStart: () => {
        emitAiProgress({ type: 'status', status: 'thinking' })
      },
      onToolExecutionStart: ({ toolCall }) => {
        const name = String(toolCall.toolName)
        emitAiProgress({
          type: 'tool-start',
          id: toolCall.toolCallId,
          toolName: name,
          label: toolLabel(name),
          detail: toolDetail(name, toolCall.input)
        })
      },
      onToolExecutionEnd: ({ toolCall, toolOutput }) => {
        const name = String(toolCall.toolName)
        const failed =
          toolOutput != null &&
          typeof toolOutput === 'object' &&
          'type' in toolOutput &&
          (toolOutput as { type: string }).type === 'tool-error'
        emitAiProgress({
          type: 'tool-end',
          id: toolCall.toolCallId,
          label: toolLabel(name),
          detail: toolDetail(name, toolCall.input),
          ok: !failed
        })
      },
      onChunk: ({ chunk }) => {
        if (chunk.type === 'text-delta' && 'text' in chunk && chunk.text) {
          emitAiProgress({ type: 'text-delta', delta: chunk.text })
        }
      }
    })

    const text = await result.text
    if (runAbort.signal.aborted) throwCancelled()
    const operations = mode === 'ask' ? [] : getOperations()
    return {
      reply:
        text?.trim() ||
        (operations.length ? '已按你的要求更新思维导图。' : '好的。'),
      operations: operations.length ? operations : [{ type: 'none' }]
    }
  } catch (e) {
    if (runAbort.signal.aborted) throwCancelled()
    throw e
  } finally {
    if (activeAiAbort === runAbort) activeAiAbort = null
  }
}

async function runAskChatFallback(
  action: Extract<AiAction, { type: 'agentChat' }>
): Promise<AiAgentResponse> {
  emitAiProgress({ type: 'status', status: 'fallback' })
  const outline = buildOutlineFromSnaps(action.mapNodes)
  const historyBlock =
    action.history.length === 0
      ? '（无）'
      : action.history
          .slice(-8)
          .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
          .join('\n')

  const { textBlock } = formatAttachmentsBlock(action.attachments)

  const system = `${ASK_SYSTEM}

当前模型可能不支持工具调用：请直接根据大纲作答，只输出纯文字回复，不要输出 JSON，不要给出任何改图操作。`

  const user = `当前思维导图大纲：
${outline}

对话历史：
${historyBlock}

用户本轮：
${action.message || '（见素材）'}${textBlock}`

  const reply = await chatText(system, user)
  return {
    reply: reply?.trim() || '好的。',
    operations: [{ type: 'none' }]
  }
}

async function runAgentChatFallback(
  action: Extract<AiAction, { type: 'agentChat' }>
): Promise<AiAgentResponse> {
  emitAiProgress({ type: 'status', status: 'fallback' })
  const outline = buildOutlineFromSnaps(action.mapNodes)
  const historyBlock =
    action.history.length === 0
      ? '（无）'
      : action.history
          .slice(-8)
          .map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`)
          .join('\n')

  const { textBlock, imageParts } = formatAttachmentsBlock(action.attachments)

  const system = `${AGENT_SYSTEM}

当前模型可能不支持工具调用：请直接根据大纲中的真实 nodeId 返回 JSON（reply + operations）。
操作类型同工具：replaceMap / expandNode / updateNodeText / addChild / deleteNode / none。
不要依赖用户选中节点；从大纲自行定位。`

  const user = `当前思维导图大纲：
${outline}

对话历史：
${historyBlock}

用户本轮：
${action.message || '（见素材）'}${textBlock}`

  const data = await chatObject(system, user, agentResponseSchema, imageParts)
  const operations = (data.operations ?? [])
    .map((op) => {
      if (op.type === 'replaceMap') {
        return { type: 'replaceMap' as const, draft: toDraft(op.draft) }
      }
      if (op.type === 'expandNode') {
        return {
          type: 'expandNode' as const,
          nodeId: op.nodeId,
          children: (op.children ?? []) as AiTreeDraft['children']
        }
      }
      return op
    })
    .filter((op) => op.type !== 'none')

  return {
    reply: data.reply?.trim() || '好的。',
    operations: operations.length ? operations : [{ type: 'none' }]
  }
}

function isCancelled(e: unknown): boolean {
  return (e as { code?: string })?.code === 'CANCELLED'
}

async function runAgentChat(action: Extract<AiAction, { type: 'agentChat' }>): Promise<AiAgentResponse> {
  const mode = action.mode === 'ask' ? 'ask' : 'agent'
  try {
    return await runAgentChatWithTools(action)
  } catch (e) {
    if (isCancelled(e)) throw e
    try {
      return mode === 'ask' ? await runAskChatFallback(action) : await runAgentChatFallback(action)
    } catch {
      mapSdkError(e)
    }
  }
}

export async function complete(
  action: AiAction
): Promise<AiTreeDraft | { explanation: string } | AiAgentResponse> {
  if (action.type === 'agentChat') {
    return runAgentChat(action)
  }

  if (action.type === 'explainNode') {
    const data = await chatObject(
      '你是学习助手。用简洁中文解释给定节点概念。',
      action.nodeText,
      explanationSchema
    )
    return { explanation: data.explanation }
  }

  if (action.type === 'generateFromTopic') {
    const data = await chatObject(
      '你是思维导图生成器。根据主题生成结构化思维导图，层数按主题复杂度自行决定，不做层数上限；中文简明。',
      action.topic,
      treeDraftSchema
    )
    return toDraft(data)
  }

  if (action.type === 'generateFromNotes') {
    const data = await chatObject(
      '你是思维导图生成器。从笔记提取结构化思维导图，中文简明。',
      action.text.slice(0, 12000),
      treeDraftSchema
    )
    return toDraft(data)
  }

  if (action.type === 'expandNode') {
    const data = await chatObject(
      `为给定节点生成 3～6 个子节点。思维导图主题：${action.mapTitle}。rootText 填原节点文案。`,
      `展开节点：${action.nodeText}`,
      treeDraftSchema
    )
    return toDraft(data)
  }

  if (action.type === 'simplifyNode') {
    const data = await chatObject(
      '将节点文案简化为更短的中文短语。children 为空数组。',
      action.nodeText,
      treeDraftSchema
    )
    return toDraft(data)
  }

  throw new Error('未知 AI 操作')
}
