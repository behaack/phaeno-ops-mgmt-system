import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectUiSource, compareUiBaseline } from './ui-drift.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const messagesSource = fs.readFileSync(path.join(root, 'src/features/customer-i18n/customer-messages.generated.ts'), 'utf8')
const messages = Object.fromEntries([...messagesSource.matchAll(/^\s*"([^"]+)": ("(?:[^"\\]|\\.)*")/gm)].map(m => [m[1], JSON.parse(m[2])]))
const files = ['src', 'ui-gallery'].flatMap(directory => fs.existsSync(path.join(root, directory))
  ? fs.readdirSync(path.join(root, directory), { recursive: true }).map(file => `${directory}/${file.replaceAll('\\', '/')}`) : [])
  .filter(file => /\.[jt]sx?$/.test(file) && !/\.(?:test|spec|d)\./.test(file) && !file.startsWith('src/components/ui/') && !file.endsWith('routeTree.gen.ts'))
const diagnostics = files.flatMap(file => inspectUiSource(fs.readFileSync(path.join(root, file), 'utf8'), file, messages))
if (process.argv.includes('--inventory')) {
  process.stdout.write(`${JSON.stringify(diagnostics, null, 2)}\n`)
} else {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'scripts/ui-drift-baseline.json'), 'utf8'))
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.allowances)) throw new Error('Invalid UI drift baseline schema')
  const failures = compareUiBaseline(diagnostics, baseline.allowances)
  if (failures.length) {
    process.stderr.write(`${failures.join('\n')}\nUI drift check failed. Fix the pattern or review an exact, reasoned exception. Never regenerate allowances just to pass.\n`)
    process.exitCode = 1
  } else process.stdout.write(`UI drift check passed: ${files.length} source files; ${diagnostics.length} explicitly recorded existing exceptions.\n`)
}
