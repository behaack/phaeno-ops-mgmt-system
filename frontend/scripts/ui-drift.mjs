import { createHash } from 'node:crypto'
import ts from 'typescript'

const returnLabel = /^(?:←\s*|back\b|return to\b)/i
const tabOverride = /(?:^|\s)(?:[\w-]+:)*!?(?:h-|min-h-|max-h-|p[xytrblse]?-|text-(?:xs|sm|base|lg|xl|\d|\[)|leading-|font-)/

/** Deliberately bounded source rules; rendering/permissions still need browser review. */
export function inspectUiSource(source, file, messages = {}) {
  const kind = /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind)
  const imports = new Map()
  const diagnostics = []
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements) {
      imports.set(item.name.text, { name: item.propertyName?.text ?? item.name.text, from: statement.moduleSpecifier.text })
    }
  }
  const opening = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
  const name = node => opening(node)?.tagName.getText(ast)
  const shared = (node, component, module) => {
    const imported = imports.get(name(node))
    return imported?.name === component && new RegExp(`^(?:#|@)/components/ui/${module}$`).test(imported.from)
  }
  const attr = (node, key) => opening(node)?.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(ast) === key)
  const strings = node => {
    if (!node) return []
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) return [node.text]
    return node.getChildren(ast).flatMap(strings)
  }
  const attrText = (node, key) => strings(attr(node, key)?.initializer).join(' ')
  const descendants = node => {
    const result = []
    function visit(child) { if (opening(child)) result.push(child); ts.forEachChild(child, visit) }
    ts.forEachChild(node, visit)
    return result
  }
  const ancestors = node => { const result = []; for (let p = node.parent; p; p = p.parent) result.push(p); return result }
  function text(node) {
    if (ts.isJsxText(node)) return node.text
    if (ts.isJsxExpression(node)) return strings(node.expression).join(' ')
    if (!opening(node)) return ''
    const imported = imports.get(name(node))
    if (imported?.name === 'CustomerText' && imported.from.endsWith('/customer-text')) return messages[attrText(node, 'message')] ?? ''
    if (imported?.name === 'CustomerSourceText' && imported.from.endsWith('/customer-text')) return attrText(node, 'source')
    return ts.isJsxElement(node) ? node.children.map(text).join(' ') : ''
  }
  function report(node, rule, message) {
    const position = ast.getLineAndCharacterOfPosition(node.getStart(ast))
    const fingerprint = createHash('sha256').update(node.getText(ast).replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 20)
    diagnostics.push({ file, rule, fingerprint, line: position.line + 1, column: position.character + 1, message })
  }
  function walk(node) {
    if (file.startsWith('src/') && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /(?:^|\/)ui-gallery(?:\/|$)/.test(node.text)) report(node, 'gallery-isolation', 'Keep the engineering gallery outside production Portal imports, routes and asset links.')
    const element = opening(node)
    if (element) {
      const parents = ancestors(node)
      const inBackLink = parents.some(p => shared(p, 'BackLink', 'back-link'))
      const label = text(node).replace(/\s+/g, ' ').trim()
      const imported = imports.get(name(node))
      const navigation = name(node) === 'a' || imported?.name === 'Link' && imported.from === '@tanstack/react-router'
      const button = name(node) === 'button' || shared(node, 'Button', 'button')
      const inDialog = parents.some(p => shared(p, 'Dialog', 'dialog') || shared(p, 'DialogContent', 'dialog'))
      if ((navigation || button && !inDialog) && returnLabel.test(label) && !inBackLink) {
        // A Button composing a Link is diagnosed at the Link, once.
        if (!button || !descendants(node).some(p => name(p) === 'a' || imports.get(name(p))?.name === 'Link')) report(node, 'shared-back-link', 'Use the shared BackLink for page returns; document an exact exception for non-page workflow steps.')
      }
      if (shared(node, 'BackLink', 'back-link')) {
        if (attr(node, 'className') || attr(node, 'style') || descendants(node).some(p => ['a', 'Link'].includes(imports.get(name(p))?.name ?? name(p)) && (attr(p, 'className') || attr(p, 'style')))) {
          report(node, 'back-link-appearance', 'BackLink owns appearance; remove wrapper or inner-link visual overrides.')
        }
        if (descendants(node).some(p => ['ArrowLeft', 'ArrowLeftIcon', 'ChevronLeft', 'ChevronLeftIcon'].includes(imports.get(name(p))?.name) && imports.get(name(p))?.from === 'lucide-react') || label.startsWith('←')) report(node, 'back-link-arrow', 'BackLink supplies its arrow; remove the extra arrow.')
      }
      if (shared(node, 'ActionMenu', 'dropdown-menu')) {
        const trigger = descendants(node).find(p => shared(p, 'DropdownMenuTrigger', 'dropdown-menu'))
        if (trigger && descendants(trigger).some(p => ['ChevronDown', 'ChevronDownIcon'].includes(imports.get(name(p))?.name) && imports.get(name(p))?.from === 'lucide-react')) report(trigger, 'action-menu-indicator', 'ActionMenu supplies its chevron; remove the hand-authored indicator.')
      }
      if (shared(node, 'DropdownMenu', 'dropdown-menu')) {
        const trigger = descendants(node).find(p => shared(p, 'DropdownMenuTrigger', 'dropdown-menu'))
        const triggerLabel = trigger ? [text(trigger), ...descendants(trigger).map(p => strings(attr(p, 'aria-label')?.initializer).map(value => messages[value] ?? value).join(' '))].join(' ').trim() : ''
        if (/\bactions\b/i.test(triggerLabel)) report(node, 'shared-action-menu', 'Use ActionMenu for contextual Actions so single/multiple/zero actions have consistent behavior.')
      }
      if (shared(node, 'TabsTrigger', 'tabs') && (tabOverride.test(attrText(node, 'className')) || /\b(?:height|fontSize|lineHeight|padding\w*)\b/.test(attr(node, 'style')?.getText(ast) ?? ''))) report(node, 'shared-tab-sizing', 'TabsTrigger owns typography, height and padding; keep only layout classes here.')
    }
    if (ts.isCallExpression(node)) {
      const call = node.expression
      const nativeConfirm = ts.isPropertyAccessExpression(call) && ['window', 'globalThis'].includes(call.expression.getText(ast)) && call.name.text === 'confirm'
        || ts.isElementAccessExpression(call) && ['window', 'globalThis'].includes(call.expression.getText(ast)) && strings(call.argumentExpression).includes('confirm')
      if (nativeConfirm) report(node, 'portal-confirmation', 'Use the shared Portal confirmation dialog instead of a native browser confirmation.')
    }
    ts.forEachChild(node, walk)
  }
  walk(ast)
  return diagnostics
}

export function compareUiBaseline(diagnostics, baseline) {
  const key = item => `${item.file}|${item.rule}|${item.fingerprint}`
  const counts = new Map()
  const failures = []
  for (const item of diagnostics) counts.set(key(item), (counts.get(key(item)) ?? 0) + 1)
  const allowances = new Map()
  for (const item of baseline) {
    if (!item.reason?.trim() || !Number.isInteger(item.count) || item.count < 1 || allowances.has(key(item))) {
      failures.push(`Invalid or duplicate UI allowance: ${key(item)}`)
      continue
    }
    allowances.set(key(item), item.count)
    const actual = counts.get(key(item)) ?? 0
    if (actual < item.count) failures.push(`Stale UI allowance; remove or reduce it: ${key(item)}`)
  }
  for (const item of diagnostics) {
    const itemKey = key(item)
    const allowed = allowances.get(itemKey) ?? 0
    if ((counts.get(itemKey) ?? 0) > allowed) failures.push(`${item.file}:${item.line}:${item.column} [${item.rule}] ${item.message}`)
    counts.set(itemKey, (counts.get(itemKey) ?? 0) - 1)
  }
  return failures
}
