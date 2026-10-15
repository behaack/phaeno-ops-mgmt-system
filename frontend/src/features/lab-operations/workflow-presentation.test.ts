import { describe, expect, it } from 'vitest'
import type { LabProtocol, LabServiceWorkflowStage } from '#/api/lab-operations'
import { resolveWorkflowPresentation } from './workflow-presentation'
import { createEmptyProtocolStep, serializeProtocolDefinition } from './protocol-definition'

const stage = { id: 'stage', name: 'Preparation', labProtocolId: 'protocol', labProtocolVersionId: 'pin', protocolVersion: 1, protocolName: 'Method', requirement: 'Required' } as LabServiceWorkflowStage
const definitionJson = serializeProtocolDefinition({ preparationBatchEnabled: true, steps: [{ ...createEmptyProtocolStep(), name: 'Inspect', instructions: 'Inspect the preparation.' }] })
const protocol = { id: 'protocol', versions: [{ id: 'pin', protocolVersion: 1, status: 'Retired', definitionJson }] } as LabProtocol

describe('complete pinned workflow presentation', () => {
  it('resolves the exact retained revision even after retirement', () => {
    expect(resolveWorkflowPresentation([stage], [protocol]).map(s => s.name)).toEqual(['Preparation', 'Inspect'])
  })
  it('blocks the whole presentation for a missing or unreadable pin', () => {
    expect(() => resolveWorkflowPresentation([stage], [])).toThrow('cannot be presented or printed')
    expect(() => resolveWorkflowPresentation([stage], [{ ...protocol, versions: [{ ...protocol.versions[0], definitionJson: '{}' }] }])).toThrow('unavailable or unreadable')
    expect(() => resolveWorkflowPresentation([{ ...stage, protocolVersion: 2 }], [protocol])).toThrow('unavailable or unreadable')
  })
})
