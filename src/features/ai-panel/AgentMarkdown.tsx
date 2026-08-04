import { Fragment, type ReactNode } from 'react'

/** 轻量 Markdown → React，仅输出元素节点（无 HTML 注入） */
export function AgentMarkdown({ text, live }: { text: string; live?: boolean }) {
  const blocks = splitBlocks(text)
  if (!blocks.length && live) {
    return (
      <div className="agent-md agent-md--live">
        <span className="agent-md__caret" aria-hidden />
      </div>
    )
  }

  return (
    <div className={`agent-md${live ? ' agent-md--live' : ''}`}>
      {blocks.map((block, i) => {
        const isLast = i === blocks.length - 1
        return (
          <Fragment key={i}>
            {renderBlock(block, live && isLast)}
          </Fragment>
        )
      })}
    </div>
  )
}

type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; level: 1 | 2 | 3; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'quote'; text: string }

function splitBlocks(raw: string): Block[] {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i += 1
      continue
    }

    const fence = line.match(/^```(\w*)\s*$/)
    if (fence) {
      const lang = fence[1] || ''
      const body: string[] = []
      i += 1
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        body.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push({ type: 'code', lang, code: body.join('\n') })
      continue
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      blocks.push({
        type: 'h',
        level: heading[1].length as 1 | 2 | 3,
        text: heading[2].trim()
      })
      i += 1
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i += 1
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    if (/^>\s?/.test(line)) {
      const parts: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        parts.push(lines[i].replace(/^>\s?/, ''))
        i += 1
      }
      blocks.push({ type: 'quote', text: parts.join('\n') })
      continue
    }

    const parts: string[] = [line]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^```/.test(lines[i]) &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !/^>\s?/.test(lines[i])
    ) {
      parts.push(lines[i])
      i += 1
    }
    blocks.push({ type: 'p', text: parts.join('\n') })
  }

  return blocks
}

function renderBlock(block: Block, withCaret?: boolean): ReactNode {
  const caret = withCaret ? <span className="agent-md__caret" aria-hidden /> : null

  switch (block.type) {
    case 'h': {
      const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3'
      return (
        <Tag className={`agent-md__h agent-md__h--${block.level}`}>
          {renderInline(block.text)}
          {caret}
        </Tag>
      )
    }
    case 'ul':
      return (
        <ul className="agent-md__ul">
          {block.items.map((item, i) => (
            <li key={i}>
              {renderInline(item)}
              {withCaret && i === block.items.length - 1 ? caret : null}
            </li>
          ))}
        </ul>
      )
    case 'ol':
      return (
        <ol className="agent-md__ol">
          {block.items.map((item, i) => (
            <li key={i}>
              {renderInline(item)}
              {withCaret && i === block.items.length - 1 ? caret : null}
            </li>
          ))}
        </ol>
      )
    case 'code':
      return (
        <pre className="agent-md__pre">
          <code data-lang={block.lang || undefined}>
            {block.code}
            {caret}
          </code>
        </pre>
      )
    case 'quote':
      return (
        <blockquote className="agent-md__quote">
          {renderInline(block.text)}
          {caret}
        </blockquote>
      )
    case 'p':
    default:
      return (
        <p className="agent-md__p">
          {renderInline(block.text)}
          {caret}
        </p>
      )
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // `code` | **bold** | *italic* | plain
  const re = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(<Fragment key={key++}>{text.slice(last, m.index)}</Fragment>)
    }
    const token = m[0]
    if (token.startsWith('`')) {
      nodes.push(
        <code key={key++} className="agent-md__code">
          {token.slice(1, -1)}
        </code>
      )
    } else if (token.startsWith('**')) {
      nodes.push(
        <strong key={key++} className="agent-md__strong">
          {token.slice(2, -2)}
        </strong>
      )
    } else {
      nodes.push(
        <em key={key++} className="agent-md__em">
          {token.slice(1, -1)}
        </em>
      )
    }
    last = m.index + token.length
  }

  if (last < text.length) {
    nodes.push(<Fragment key={key++}>{text.slice(last)}</Fragment>)
  }

  return nodes.length ? nodes : [<Fragment key={0}>{text}</Fragment>]
}
