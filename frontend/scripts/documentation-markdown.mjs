/** Shared by rendered MDX and the search artifact generator. Never evaluates MDX. */
export function plainText(node) {
  if (node.type === 'image') return node.alt ?? ''
  if (typeof node.value === 'string') return node.value
  return (node.children ?? []).map(plainText).join(node.type === 'paragraph' || node.type === 'heading' ? '' : ' ')
}

export function documentationMarkdown(options = {}) {
  return (tree) => {
    const used = new Set()
    function visit(node) {
      if (/^mdx|^html$/.test(node.type)) throw new Error('Portal guides must contain portable Markdown only.')
      if (node.type === 'heading') {
        const base = plainText(node).normalize('NFKC').toLowerCase()
          .replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/gu, '-') || 'section'
        let id = base
        let suffix = 1
        while (used.has(id)) id = `${base}-${suffix++}`
        used.add(id)
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id, tabIndex: -1 } }
      }
      for (const child of node.children ?? []) visit(child)
    }
    visit(tree)
    const sections = []
    let current = { heading: '', anchor: '', text: '' }
    for (const node of tree.children) {
      if (node.type === 'heading') {
        if (current.text || current.heading) sections.push(current)
        current = { heading: plainText(node), anchor: node.data.hProperties.id, text: '' }
      } else if (!['definition', 'thematicBreak'].includes(node.type)) {
        current.text += `${plainText(node)}\n`
      }
    }
    if (current.text || current.heading) sections.push(current)
    options.collect?.(sections.map(section => ({ ...section, text: section.text.replace(/\s+/gu, ' ').trim() })))
  }
}
