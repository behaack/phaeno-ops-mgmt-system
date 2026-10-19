import { createElement, type ReactNode } from 'react'

const tags = new Set(['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'])
const discarded = new Set(['script', 'style', 'iframe', 'object', 'svg', 'math', 'template'])
const aliases: Record<string, string> = { b: 'strong', i: 'em', div: 'p' }
const escapeText = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const decodeText = (text: string) => text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, entity => {
  const name = entity.slice(1, -1).toLowerCase()
  if (name.startsWith('#')) {
    const code = name.startsWith('#x') ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10)
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '\ufffd'
  }
  return ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' } as Record<string, string>)[name]
})

/** Browser-only normalization used for the editor and pasted HTML. No attributes survive. */
export function normalizeOrderRichText(html: string): string {
  const document = new DOMParser().parseFromString(html, 'text/html')
  function visit(node: Node, depth = 0): string {
    if (depth > 32) return ''
    if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '')
    if (!(node instanceof HTMLElement) || discarded.has(node.localName)) return ''
    const tag = aliases[node.localName] ?? node.localName
    let content = Array.from(node.childNodes, child => visit(child, depth + 1)).join('')
    // Word/browser paste commonly represents inline formatting with spans.
    if (tag === 'span') {
      if (node.style.fontWeight === 'bold' || Number(node.style.fontWeight) >= 600) content = `<strong>${content}</strong>`
      if (node.style.fontStyle === 'italic') content = `<em>${content}</em>`
      if (node.style.textDecoration.includes('underline') || node.style.textDecorationLine.includes('underline')) content = `<u>${content}</u>`
    }
    return tags.has(tag) ? tag === 'br' ? '<br>' : `<${tag}>${content}</${tag}>` : content
  }
  const result = Array.from(document.body.childNodes, node => visit(node)).join('')
  return richTextPlainText(result).trim() ? result : ''
}

export function richTextPlainText(value: string) {
  return decodeText(value.replace(/<[^>]*>/g, ''))
}

export const orderRichTextClassName = 'space-y-2 whitespace-pre-wrap wrap-anywhere [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_p]:min-h-[1em] [&_strong]:font-bold [&_em]:italic [&_u]:underline'

/** Render only the formatting vocabulary as React nodes; never inject stored HTML. */
export function OrderRichText({ value }: { value: string }) {
  const root: { tag: string; children: ReactNode[] } = { tag: '', children: [] }
  const stack = [root]
  let key = 0
  const close = () => {
    const item = stack.pop()!
    stack[stack.length - 1].children.push(createElement(item.tag, { key: key++ }, ...item.children))
  }
  for (const token of value.match(/<[^>]*>|[^<]+|</g) ?? []) {
    const match = token.match(/^<(\/?)(p|br|strong|em|u|ul|ol|li)>$/)
    if (!match) { stack[stack.length - 1].children.push(decodeText(token)); continue }
    const [, end, tag] = match
    if (tag === 'br') { stack[stack.length - 1].children.push(createElement('br', { key: key++ })); continue }
    if (end) { if (stack.length > 1 && stack[stack.length - 1].tag === tag) close() }
    else if (stack.length <= 32) stack.push({ tag, children: [] })
  }
  while (stack.length > 1) close()
  return <div className={orderRichTextClassName}>{root.children}</div>
}
