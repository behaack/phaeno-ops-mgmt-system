import { describe, expect, it } from 'vitest'
import { noSessionCapabilities } from '#/test-helpers/session'
import { getLabWorkspaceSections } from './LabOperationsSidebar'
import { parseLabSection, resolveLabWorkspaceSection } from './lab-sections'

describe('Lab workspace section access and saved links', () => {
  it('isolates result release from laboratory execution responsibilities', () => {
    expect(getLabWorkspaceSections({ ...noSessionCapabilities, canReleasePSeqResults: true }).map(item => item.value)).toEqual(['release'])
    const operatorSections = getLabWorkspaceSections({ ...noSessionCapabilities, canManageLabOperations: true })
    expect(operatorSections[0].value).toBe('jobs')
    expect(operatorSections[0].group).toBeUndefined()
    expect(operatorSections.some(item => item.value === 'release')).toBe(false)
    expect(operatorSections.some(item => item.value === 'kit-requests')).toBe(true)
    expect(getLabWorkspaceSections(noSessionCapabilities)).toEqual([])
  })

  it('defaults to the Jobs overview while respecting explicit sample tasks', () => {
    expect(resolveLabWorkspaceSection(undefined, undefined)).toBe('jobs')
    expect(resolveLabWorkspaceSection(undefined, 'receiving')).toBe('receipt')
    expect(resolveLabWorkspaceSection(undefined, 'accession')).toBe('receipt')
    expect(resolveLabWorkspaceSection('receipt', undefined)).toBe('receipt')
    expect(resolveLabWorkspaceSection('jobs', 'kit-requests')).toBe('jobs')
    expect(parseLabSection('kit-requests')).toBe('kit-requests')
  })

  it.each([undefined, 'receipt', 'transportation-kits'] as const)('keeps saved request and inventory links in their owning sections (%s)', section => {
    expect(resolveLabWorkspaceSection(section, 'kit-requests')).toBe('kit-requests')
    expect(resolveLabWorkspaceSection(section, 'return-kits')).toBe('kit-requests')
    expect(resolveLabWorkspaceSection(section, 'standard-kits')).toBe('transportation-kits')
  })
})
