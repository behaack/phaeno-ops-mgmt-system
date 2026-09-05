import { createHash } from 'node:crypto'
import { readFile, writeFile, mkdir, realpath } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'
import mdx from '@mdx-js/rollup'
import ts from 'typescript'
import { documentationMarkdown } from './documentation-markdown.mjs'

export const frontendRoot = fileURLToPath(new URL('../', import.meta.url))
export const guideIdentity = guide => guide.locale
  ? `${guide.audience}/${guide.locale}/${guide.slug}` : `${guide.audience}/${guide.slug}`
const hash = value => createHash('sha256').update(value).digest('hex')
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateCatalog(catalog) {
  const fail = message => { throw new Error(`Documentation catalog: ${message}`) }
  if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.guides) || !catalog.guides.length) fail('invalid schema or empty guide set')
  const identities = new Map()
  const sources = new Set()
  for (const group of ['topics', 'workflows', 'navigationGroups', 'contentTypes', 'roles']) {
    if (!catalog.taxonomy[group]) fail(`missing taxonomy ${group}`)
    for (const [id, labels] of Object.entries(catalog.taxonomy[group])) {
      if (!slugPattern.test(id) || typeof labels['en-US'] !== 'string' || !labels['en-US'].trim() || labels['en-US'].length > 120) fail(`invalid taxonomy ${group}/${id}`)
    }
  }
  for (const guide of catalog.guides) {
    const id = guideIdentity(guide)
    if (!['prospect', 'customer', 'partner', 'phaeno'].includes(guide.audience) || guide.locale !== (guide.audience === 'phaeno' ? null : 'en-US')) fail(`invalid scope ${id}`)
    if (!slugPattern.test(guide.slug) || identities.has(id)) fail(`duplicate or invalid identity ${id}`)
    identities.set(id, guide)
    const expected = `src/content/docs/${guide.locale ? `${guide.locale}/` : ''}${guide.audience}/${guide.slug}.mdx`
    if (guide.sourcePath !== expected || sources.has(guide.sourcePath)) fail(`invalid source ${id}`)
    sources.add(guide.sourcePath)
    for (const field of ['title', 'summary']) if (typeof guide[field] !== 'string' || !guide[field].trim() || guide[field].length > 600) fail(`invalid ${field} ${id}`)
    if (!Number.isFinite(guide.order) || !/^\d{4}-\d{2}-\d{2}$/.test(guide.reviewedAt) || Number.isNaN(Date.parse(guide.reviewedAt)) || new Date(guide.reviewedAt).toISOString().slice(0, 10) !== guide.reviewedAt) fail(`invalid order or review date ${id}`)
    if (!['published', 'draft'].includes(guide.publicationStatus)) fail(`invalid publication status ${id}`)
    for (const [field, group] of [['topicIds', 'topics'], ['workflowIds', 'workflows'], ['applicableRoles', 'roles']]) {
      if (!Array.isArray(guide[field]) || guide[field].length > 12 || (field !== 'applicableRoles' && !guide[field].length) || guide[field].some(value => !Object.hasOwn(catalog.taxonomy[group], value))) fail(`unknown or invalid ${field} ${id}`)
    }
    if (!Object.hasOwn(catalog.taxonomy.navigationGroups, guide.navigationGroup) || !Object.hasOwn(catalog.taxonomy.contentTypes, guide.contentType)) fail(`unknown classification ${id}`)
    for (const field of ['taskKeywords', 'aliases', 'relatedGuideIds']) if (!Array.isArray(guide[field]) || guide[field].length > 30 || guide[field].some(value => typeof value !== 'string' || !value.trim() || value.length > 160)) fail(`invalid ${field} ${id}`)
  }
  for (const [id, guide] of identities) {
    for (const relatedId of guide.relatedGuideIds) {
      const related = identities.get(relatedId)
      if (!related || relatedId === id || related.audience !== guide.audience || related.locale !== guide.locale || (guide.publicationStatus === 'published' && related.publicationStatus !== 'published')) fail(`invalid related guide ${id} -> ${relatedId}`)
    }
    if (guide.parentSlug) {
      const parent = identities.get(guideIdentity({ ...guide, slug: guide.parentSlug }))
      if (!parent || parent === guide || parent.parentSlug || (guide.publicationStatus === 'published' && parent.publicationStatus !== 'published')) fail(`invalid navigation parent ${id}`)
    }
  }
}

export async function extractSections(source, sourcePath = 'guide.mdx') {
  let sections
  const plugin = mdx({ remarkPlugins: [[documentationMarkdown, { collect: value => { sections = value } }]] })
  await plugin.transform(source, sourcePath)
  if (!sections?.length) throw new Error(`Empty documentation source: ${sourcePath}`)
  return sections
}

export function validateComponentMap(catalog, source) {
  const ast = ts.createSourceFile('documentation-registry.ts', source, ts.ScriptTarget.Latest, true)
  const imports = new Map()
  for (const node of ast.statements) if (ts.isImportDeclaration(node) && node.importClause?.name)
    imports.set(node.importClause.name.text, node.moduleSpecifier.text.replace('#/', 'src/'))
  const mappings = new Map()
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === 'documentationComponents' && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const property of node.initializer.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name) || !ts.isIdentifier(property.initializer))
          throw new Error('Documentation component map must use explicit identities and MDX imports.')
        if (mappings.has(property.name.text)) throw new Error('Duplicate documentation component mapping.')
        mappings.set(property.name.text, imports.get(property.initializer.text))
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  for (const guide of catalog.guides) if (guide.publicationStatus === 'published' && mappings.get(guideIdentity(guide)) !== guide.sourcePath)
    throw new Error(`Missing or incorrect documentation component mapping: ${guideIdentity(guide)}`)
  for (const id of mappings.keys()) if (!catalog.guides.some(guide => guideIdentity(guide) === id))
    throw new Error(`Unregistered documentation component: ${id}`)
}

export async function generateDocumentation({ check = false, uiOnly = false } = {}) {
  const catalog = JSON.parse(await readFile(path.join(frontendRoot, 'src/features/documentation/documentation-catalog.json'), 'utf8'))
  validateCatalog(catalog)
  validateComponentMap(catalog, await readFile(path.join(frontendRoot, 'src/features/documentation/documentation-registry.ts'), 'utf8'))
  const contentRoot = await realpath(path.join(frontendRoot, 'src/content/docs'))
  const guides = []
  for (const guide of catalog.guides.filter(guide => guide.publicationStatus === 'published').sort((a, b) => guideIdentity(a).localeCompare(guideIdentity(b), 'en'))) {
    const absolutePath = await realpath(path.join(frontendRoot, guide.sourcePath))
    if (!absolutePath.startsWith(contentRoot + path.sep)) throw new Error(`Guide escapes content root: ${guide.sourcePath}`)
    const source = (await readFile(absolutePath, 'utf8')).replaceAll('\r\n', '\n')
    const sections = await extractSections(source, absolutePath)
    const { sourcePath: _sourcePath, ...metadata } = guide
    guides.push({ ...metadata, id: guideIdentity(guide), route: `/docs/${guide.audience}/${guide.slug}`, contentHash: hash(source), sections })
  }
  const content = { schemaVersion: 1, taxonomy: catalog.taxonomy, guides }
  const corpusHash = hash(JSON.stringify(content))
  const manifest = { ...content, corpusHash }
  const outputs = [
    [path.join(frontendRoot, 'src/features/documentation/documentation-version.json'), { schemaVersion: 1, corpusHash }],
    ...uiOnly ? [] : [[path.join(frontendRoot, '../backend/app/Documentation/corpus.json'), manifest]],
  ]
  for (const [target, value] of outputs) {
    const text = JSON.stringify(value, null, 2) + '\n'
    if (check) {
      if (await readFile(target, 'utf8') !== text) throw new Error(`Stale documentation artifact: ${target}. Run pnpm docs:generate.`)
    } else {
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, text, 'utf8')
    }
  }
  return manifest
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await generateDocumentation({ check: process.argv.includes('--check'), uiOnly: process.argv.includes('--ui-only') })
  console.log(`Documentation corpus: ${result.guides.length} guides, ${result.corpusHash.slice(0, 12)}.`)
}
