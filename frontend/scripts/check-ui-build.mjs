import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
function artifacts(directory) {
  if (!fs.existsSync(directory)) throw new Error(`Build output missing: ${directory}`)
  return fs.readdirSync(directory, { recursive: true }).map(name => path.join(directory, name)).filter(file => /\.(?:css|js|mjs|html)$/.test(file))
}
const production = artifacts(path.join(root, '.output'))
const gallery = artifacts(path.join(root, 'dist/ui-gallery'))
const markers = ['--gallery-reference', 'data-gallery-section', 'navigation-preview', 'workspace-preview', 'Edit fictional sample', 'Fictional record workspace', 'data-guide-scene', 'Unregistered fictional request:', 'fictionalData', 'DEMO-ASM-20261022']
for (const file of production) {
  const contents = fs.readFileSync(file, 'utf8')
  for (const marker of markers) if (contents.includes(marker)) throw new Error(`Engineering gallery leaked into production output: ${path.relative(root, file)} (${marker})`)
}
const galleryCss = gallery.filter(file => file.endsWith('.css')).map(file => fs.readFileSync(file, 'utf8')).join('\n')
if (!galleryCss.includes('--gallery-reference')) throw new Error('Gallery CSS source scope is missing its engineering examples')
const galleryJs = gallery.filter(file => /\.(?:js|mjs)$/.test(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n')
if (!galleryJs.includes('navigation-preview')) throw new Error('Gallery navigation preview is missing from its independent build')
if (!galleryJs.includes('workspace-preview')) throw new Error('Complete-page examples are missing from the independent gallery build')
process.stdout.write(`UI build isolation passed: ${production.length} production artifacts; ${gallery.length} separate gallery artifacts.\n`)
