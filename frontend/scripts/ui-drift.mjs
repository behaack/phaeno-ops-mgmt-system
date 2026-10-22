import { createHash } from 'node:crypto'
import ts from 'typescript'

const returnLabel = /^(?:←\s*|back\b|return to\b)/i
const tabOverride = /(?:^|\s)(?:[\w-]+:)*!?(?:h-|min-h-|max-h-|p[xytrblse]?-|text-(?:xs|sm|base|lg|xl|\d|\[)|leading-|font-)/
const pageTitleOverride = /(?:^|\s)(?:[\w-]+:)*!?(?:text-(?:xs|sm|base|lg|xl|\d|\[|primary|destructive|muted|foreground)|leading-|font-(?!mono\b))/

/** Deliberately bounded source rules; rendering/permissions still need browser review. */
export function inspectUiSource(source, file, messages = {}) {
  const kind = /\.[jt]sx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind)
  const imports = new Map()
  const classConstants = new Map()
  const diagnostics = []
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue
    const bindings = statement.importClause?.namedBindings
    if (bindings && ts.isNamedImports(bindings)) for (const item of bindings.elements) {
      imports.set(item.name.text, { name: item.propertyName?.text ?? item.name.text, from: statement.moduleSpecifier.text })
    }
  }
  function collectConstants(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))) classConstants.set(node.name.text, node.initializer)
    ts.forEachChild(node, collectConstants)
  }
  collectConstants(ast)
  const opening = node => !node ? null : ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null
  const name = node => opening(node)?.tagName.getText(ast)
  const shared = (node, component, module) => {
    const imported = imports.get(name(node))
    return imported?.name === component && new RegExp(`^(?:#|@)/components/ui/${module}$`).test(imported.from)
  }
  const attr = (node, key) => opening(node)?.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.getText(ast) === key)
  const strings = node => {
    if (!node) return []
    if (ts.isIdentifier(node) && classConstants.has(node.text)) return strings(classConstants.get(node.text))
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
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && /^toLocale(?:Date|Time)?String$/.test(node.expression.name.text) && ts.isNewExpression(node.expression.expression) && node.expression.expression.expression.getText(ast) === 'Date') report(node, 'shared-timestamp', 'Use shared display helpers; preserve calendar days, timezone, precision and Customer locale.')
    const editorialDate = file === 'src/features/documentation/DocumentationPage.tsx' && ancestors(node).some(parent => ts.isFunctionDeclaration(parent) && parent.name?.text === 'formatReviewDate')
    if (file !== 'src/lib/display-format.ts' && !editorialDate && ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'format' && ts.isNewExpression(node.expression.expression) && node.expression.expression.expression.getText(ast) === 'Intl.DateTimeFormat') report(node, 'shared-timestamp', 'Use shared display helpers instead of a local Intl date renderer.')
    if (file.startsWith('src/') && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /(?:^|\/)(?:ui-gallery|navigation-preview|workspace-preview)(?:\/|$)/.test(node.text)) report(node, 'gallery-isolation', 'Keep the engineering gallery outside production Portal imports, routes and asset links.')
    if (ts.isFunctionDeclaration(node) && /^(?:formatDate|formatDateTime|formatTime|formatBytes|formatMoney)$/.test(node.name?.text ?? '') && /new Intl\.|toLocale(?:Date|Time)?String|\/\s*(?:1024|1_000)/.test(node.body?.getText(ast) ?? '')) report(node, 'shared-display-format', 'Use shared display-format helpers; retain calendar-day, timezone, precision and domain missing-value meaning.')
    const element = opening(node)
    if (element) {
      const parents = ancestors(node)
      const inBackLink = parents.some(p => shared(p, 'BackLink', 'back-link'))
      const inRecordLink = parents.some(p => shared(p, 'RecordLink', 'record-link'))
      const label = text(node).replace(/\s+/g, ' ').trim()
      const imported = imports.get(name(node))
      if (name(node) === 'thead') report(node, 'shared-table-header', 'Use RecordTableHeader for the shared shaded column-label band and retain native th scopes.')
      if (shared(node, 'RecordTableHeader', 'record-list') && (/(?:^|\s)(?:[\w-]+:)*bg-/.test(attrText(node, 'className')) || attr(node, 'style'))) report(node, 'table-header-appearance', 'RecordTableHeader owns its shaded surface; preserve layout and native column semantics.')
      if (shared(node, 'CardHeader', 'card') && (/(?:^|\s)(?:[\w-]+:)*(?:bg-|border-b(?:-|$)|p[xytrblse]?-(?:\d|\[))/.test(attrText(node, 'className')) || attr(node, 'style'))) report(node, 'panel-header-appearance', 'CardHeader owns the shaded surface, divider and padding. Keep layout on its children.')
      if ((shared(node, 'StatusBadge', 'status-badge') || shared(node, 'DomainStatusBadge', 'domain-status-badge')) && (/(?:^|\s)(?:[\w-]+:)*(?:bg-|border-|text-|font-|rounded-|p[xytrblse]?-)/.test(attrText(node, 'className')) || attr(node, 'style'))) report(node, 'status-appearance', 'StatusBadge owns tone, shape, typography and padding; use explicit domain maps and keep only layout margins.')
      if (shared(node, 'Badge', 'badge') && ts.isJsxElement(node) && node.children.some(child => ts.isJsxExpression(child) && /\.\s*\w*(?:status|state)\b/i.test(child.expression?.getText(ast) ?? ''))) report(node, 'domain-status', 'Use an explicit domain status adapter; retain label, unknown fallback and scientific meaning.')
      const navigation = name(node) === 'a' || imported?.name === 'Link' && imported.from === '@tanstack/react-router'
      const button = name(node) === 'button' || shared(node, 'Button', 'button')
      const inDialog = parents.some(p => shared(p, 'Dialog', 'dialog') || shared(p, 'DialogContent', 'dialog'))
      const inPrintDocument = parents.some(p => name(p) === 'article' && attr(p, 'data-print-document'))
      const scientificInstructions = parents.some(p => name(p) === 'article' && /\bprocedure-document\b/.test(attrText(p, 'className')))
      const contentChildren = ts.isJsxElement(node) ? node.children.filter(p => !ts.isJsxText(p) || p.text.trim()) : []
      const firstChild = contentChildren[0]
      const groupedHeading = firstChild && name(firstChild) === 'div' && ts.isJsxElement(firstChild) ? firstChild.children.find(p => !ts.isJsxText(p) || p.text.trim()) : undefined
      const titledBox = ['section', 'div'].includes(name(node)) && /(?:^|\s)border(?:\s|$)/.test(attrText(node, 'className')) && /\brounded(?:-[\w]+)?\b/.test(attrText(node, 'className')) && [firstChild, groupedHeading].some(child => /^h[23]$/.test(name(child) ?? ''))
      if (titledBox && !['alert', 'status'].includes(attrText(node, 'role')) && !attr(node, 'data-preparation-step') && !inPrintDocument && !scientificInstructions && !/^src\/features\/invitations\//.test(file)) report(node, 'shared-section-panel', 'Use SectionPanel for equivalent titled bordered sections; retain native heading levels, identity, actions and scientific/print layout.')
      if (name(node) === 'p' && !attr(node, 'id') && /^(?:Loading|Refreshing|Checking)\b/.test(label) && attrText(node, 'role') !== 'alert') report(node, 'shared-loading-state', 'Use LoadingState for consistent initial/background feedback and accessible announcements.')
      const panelHeading = attr(node, 'heading')?.initializer?.expression
      const panelOverride = /(?:^|\s)(?:[\w-]+:)*(?:bg-|rounded|p[xytrblse]?-(?:\d|\[)|border(?:-|\s|$))/
      if (shared(node, 'SectionPanel', 'section-panel') && (panelOverride.test(attrText(node, 'className')) || attr(node, 'style') || panelOverride.test(attrText(panelHeading, 'className').replace(/(?:^|\s)rounded(?:-\S+)?/g,'')) || attr(panelHeading, 'style') || pageTitleOverride.test(attrText(panelHeading, 'className')))) report(node, 'section-panel-appearance', 'SectionPanel owns its surface, border, spacing and heading band; keep call-site classes for layout.')
      if (name(node) === 'select') report(node, 'shared-native-select', 'Use NativeSelect to preserve native form behavior with shared sizing.')
      if (name(node) === 'input' && attrText(node, 'type') === 'checkbox') report(node, 'shared-native-checkbox', 'Use NativeCheckbox for registered/native events or Checkbox for controlled Radix state.')
      if ((shared(node, 'NativeSelect', 'native-select') || shared(node, 'NativeCheckbox', 'native-checkbox')) && /(?:^|\s)(?:[\w-]+:)*!?(?:h-|min-h-|max-h-|size-|p[xytrblse]?-|text-(?:xs|sm|base|lg)|rounded|border|bg-|font-|leading-)/.test(attrText(node, 'className'))) report(node, 'native-control-appearance', 'Shared native controls own height, typography and chrome; put layout on Field.')
      if (shared(node, 'Input', 'input') && /(?:^|\s)(?:[\w-]+:)*!?(?:h-|min-h-|max-h-|size-)/.test(attrText(node, 'className'))) report(node, 'single-line-control-size', 'Input owns its height; align text and select controls with Field instead of local sizes.')
      if ((name(node) === 'Label' || name(node) === 'label') && /\S\s+\*$/.test(label)) report(node, 'shared-required-marker', 'Use RequiredFieldName so the required marker stays attached and consistent.')
      if ((name(node) === 'Button' || name(node) === 'button') && /^(?:Clear all|Clear filters|Reset filters)$/.test(label)) report(node, 'shared-clear-filters', 'Use ClearFiltersButton; retain existing filter/reset callbacks and guards.')
      if (name(node) === 'h1' && /^src\/(?:features|routes)\//.test(file) && !/^src\/features\/(?:auth|invitations)\//.test(file) && !inPrintDocument) report(node, 'shared-page-title', 'Use PageTitle or PageHeader for Portal page headings; retain identifiers and focus targets.')
      if (shared(node, 'PageTitle', 'page-header') && (pageTitleOverride.test(attrText(node, 'className')) || /\b(?:fontSize|fontWeight|lineHeight|color)\b/.test(attr(node, 'style')?.getText(ast) ?? ''))) report(node, 'page-title-appearance', 'PageTitle owns heading typography and color; keep only layout classes or an identifier font.')
      if (shared(node, 'RecordLink', 'record-link') && (attr(node, 'className') || attr(node, 'style') || descendants(node).some(p => (name(p) === 'a' || imports.get(name(p))?.name === 'Link') && (attr(p, 'className') || attr(p, 'style'))))) report(node, 'record-link-appearance', 'RecordLink owns title-link typography, color, underline and focus; move layout to a non-interactive wrapper.')
      const toExpression = attr(node, 'to')?.initializer
      const destination = toExpression && ts.isJsxExpression(toExpression) ? toExpression.expression : undefined
      const destinationIdentifier = destination && ts.isCallExpression(destination) ? destination.expression : destination
      const routeHelper = destinationIdentifier && ts.isIdentifier(destinationIdentifier) ? imports.get(destinationIdentifier.text)?.name ?? destinationIdentifier.text : ''
      const knownRecordHelper = ['commercialRecordRoute', 'workDestination', 'procedureDetailRoute'].includes(routeHelper)
      const recordDestination = navigation && (/\$/.test(attrText(node, 'to')) || knownRecordHelper) && !attrText(node, 'to').startsWith('/docs/')
      const hasRecordIdentity = ts.isJsxElement(node) && node.children.some(child => ts.isJsxExpression(child) && /(?:\.\s*(?:name|title|label|reference|\w*Number|barcode)|\b(?:recordTitle|labWorkOrderLabel|kitRequestReference)\b)/i.test(child.expression?.getText(ast) ?? ''))
      if (recordDestination && (hasRecordIdentity || knownRecordHelper) && !inBackLink && !inRecordLink && !parents.some(p => shared(p, 'Button', 'button') || shared(p, 'DropdownMenuItem', 'dropdown-menu'))) report(node, 'shared-record-link', 'Use RecordLink for a primary record identifier while preserving its router props and handlers.')
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
