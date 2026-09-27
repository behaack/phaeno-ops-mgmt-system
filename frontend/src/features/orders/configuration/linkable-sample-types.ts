import type { SampleTypeDefinition } from '#/api/sample-shipping'

export function linkableSampleTypes(sampleTypes: readonly SampleTypeDefinition[], now = Date.now()): SampleTypeDefinition[] {
  const current = new Map<string, SampleTypeDefinition>()
  const drafts = new Map<string, SampleTypeDefinition>()
  for (const item of sampleTypes) {
    if (item.isActive && Date.parse(item.effectiveFrom) <= now
      && (!item.effectiveTo || Date.parse(item.effectiveTo) > now)) {
      const previous = current.get(item.definitionKey)
      if (!previous || previous.revision < item.revision) current.set(item.definitionKey, item)
    } else if (item.lifecycle === 'Draft') {
      const previous = drafts.get(item.definitionKey)
      if (!previous || previous.revision < item.revision) drafts.set(item.definitionKey, item)
    }
  }
  for (const [key, draft] of drafts) if (!current.has(key)) current.set(key, draft)
  return [...current.values()].sort((a, b) => a.name.localeCompare(b.name))
}
