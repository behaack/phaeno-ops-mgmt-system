import type { LabProtocol, LabServiceWorkflowStage } from '#/api/lab-operations'
import { deserializeSavedProcedure, serializeProtocolDefinition, type ProtocolDefinition } from './protocol-definition'
import type { PresentedInstruction } from './ProcedurePresentation'

/** Resolve every exact pin before offering a complete bench document or printout. */
export function resolveWorkflowPresentation(stages: LabServiceWorkflowStage[], protocols: LabProtocol[]): PresentedInstruction[] {
  return stages.flatMap(stage => {
    const pinned = protocols.find(p => p.id === stage.labProtocolId)?.versions.find(v => v.id === stage.labProtocolVersionId && v.protocolVersion === stage.protocolVersion)
    const parsed = pinned ? deserializeSavedProcedure(pinned.definitionJson) : null
    if (!parsed) throw new Error(`The pinned protocol for “${stage.name}” is unavailable or unreadable. The complete procedure cannot be presented or printed. Refresh and contact a Protocol Administrator if this continues.`)
    const content = (JSON.parse(serializeProtocolDefinition(parsed)) as ProtocolDefinition).steps
    const protocolLabel = `${stage.protocolName} · v${stage.protocolVersion}`
    return [{ key: stage.id, name: stage.name, instructions: '', condition: stage.condition, required: stage.requirement === 'Required', protocolLabel, handoffCriteria: stage.handoffCriteria }, ...content.map(step => ({ ...step, key: `${stage.id}:${step.key}`, protocolLabel }))]
  })
}
