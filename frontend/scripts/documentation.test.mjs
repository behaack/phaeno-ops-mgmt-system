import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validateCatalog, validateComponentMap, extractSections, generateDocumentation } from './generate-documentation.mjs'

const catalog = JSON.parse(await readFile(new URL('../src/features/documentation/documentation-catalog.json', import.meta.url), 'utf8'))

test('published catalog and packaged artifacts agree', async () => {
  const corpus = await generateDocumentation({ check: true })
  assert.equal(corpus.guides.length, catalog.guides.filter(guide => guide.publicationStatus === 'published').length)
  assert.ok(corpus.guides.every(guide => !('sourcePath' in guide) && guide.sections.length))
})

test('invalid scope, metadata, relationships, and sources fail publication', () => {
  for (const change of [
    c => c.guides.push(structuredClone(c.guides[0])),
    c => { c.guides[0].topicIds = ['unknown'] },
    c => { c.guides[0].reviewedAt = '2026-02-30' },
    c => { c.guides[0].locale = 'fr-FR' },
    c => { c.guides[0].sourcePath = '../website/secret.mdx' },
    c => { c.guides[0].relatedGuideIds = ['customer/en-US/getting-started'] },
    c => { c.guides[0].parentSlug = c.guides[0].slug },
  ]) {
    const copy = structuredClone(catalog)
    change(copy)
    assert.throws(() => validateCatalog(copy), /Documentation catalog/)
  }
})

test('MDX extraction and rendering share duplicate and Unicode heading anchors', async () => {
  const sections = await extractSections('# QC & RNA\n\nFirst body.\n\n## Résultats β\n\n[Useful link](https://example.invalid) and **bold**.\n\n## QC & RNA\n\nSecond body.\n\n## QC & RNA-1\n\nThird body.')
  assert.deepEqual(sections.map(section => section.anchor), ['qc-rna', 'résultats-β', 'qc-rna-1', 'qc-rna-1-1'])
  assert.equal(sections[1].text, 'Useful link and bold.')
  assert.ok(sections.every(section => !section.text.includes('https://')))
})

test('guide extraction rejects executable MDX and raw HTML', async () => {
  for (const source of ['import x from "danger"\n\n# Guide', '# Guide\n\n{process.env.SECRET}', '# Guide\n\n<script>bad()</script>']) {
    await assert.rejects(extractSections(source), /portable Markdown/)
  }
})

test('publication refuses a missing or incorrectly mapped guide renderer', async () => {
  const source = await readFile(new URL('../src/features/documentation/documentation-registry.ts', import.meta.url), 'utf8')
  assert.throws(() => validateComponentMap(catalog, source.replace("'customer/en-US/getting-started': CustomerGettingStarted", "'customer/en-US/getting-started': PartnerGettingStarted")), /incorrect documentation component/)
})
