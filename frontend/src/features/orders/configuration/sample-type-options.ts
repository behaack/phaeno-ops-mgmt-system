import type { SampleTypeDefinition } from '#/api/sample-shipping'

export function sampleTypeChoices(revisions: readonly SampleTypeDefinition[], effectiveAt: number) {
  const families = new Map<string, SampleTypeDefinition[]>()
  for (const revision of revisions) {
    const family = families.get(revision.definitionKey) ?? []
    family.push(revision)
    families.set(revision.definitionKey, family)
  }
  return [...families.entries()].map(([key, family]) => {
    const sorted = [...family].sort((a, b) => b.revision - a.revision || b.effectiveFrom.localeCompare(a.effectiveFrom) || a.id.localeCompare(b.id))
    const current = sorted.find(item => item.isActive && new Date(item.effectiveFrom).getTime() <= effectiveAt
      && (!item.effectiveTo || new Date(item.effectiveTo).getTime() > effectiveAt))
    return { key, revisions: sorted, anchor: sorted[sorted.length - 1], current, name: (current ?? sorted[0]).name }
  }).sort((a, b) => a.name.localeCompare(b.name))
}
