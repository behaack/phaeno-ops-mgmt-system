import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { getOrderErrorMessage } from '#/api/order-management'
import { setShippingAssignmentStatus, setShippingDestinationStatus, type SampleShippingConfiguration, type SampleShippingDestination, type SampleShippingInstructionRule } from '#/api/sample-shipping'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { RequiredDialogFooter } from '#/components/ui/required-field'

export type ShippingStatusChange = { isActive: boolean } & ({ kind: 'destination'; item: SampleShippingDestination } | { kind: 'assignment'; item: SampleShippingInstructionRule })
type Problem = { message: string; section: 'destinations' | 'sample-types' | 'procedures' | 'instructions' }
export function assignmentActivationProblems(item: Pick<SampleShippingInstructionRule, 'destinationId' | 'sampleTypeDefinitionId' | 'shippingProcedureId' | 'effectiveFrom'>, configuration: SampleShippingConfiguration, now = Date.now()): Problem[] {
  const at = Math.max(now, new Date(item.effectiveFrom).getTime())
  const problems: Problem[] = []
  const destination = configuration.destinations.find(value => value.id === item.destinationId)
  if (!destination) problems.push({ message: 'Select an available destination revision.', section: 'destinations' })
  else if (destination.effectiveTo && new Date(destination.effectiveTo).getTime() <= at) problems.push({ message: `${destination.name} revision ${destination.revision} has ended. Create an assignment for a current destination revision.`, section: 'destinations' })
  else if (!destination.isActive) problems.push({ message: `${destination.name} revision ${destination.revision} is inactive. Activate that destination first.`, section: 'destinations' })
  else if (new Date(destination.effectiveFrom).getTime() > at) problems.push({ message: `${destination.name} starts on ${new Date(destination.effectiveFrom).toLocaleString()}. The assignment cannot start earlier.`, section: 'destinations' })
  const anchor = configuration.sampleTypes.find(value => value.id === item.sampleTypeDefinitionId)
  if (!anchor || !configuration.sampleTypes.some(value => value.definitionKey === anchor.definitionKey && value.isActive && new Date(value.effectiveFrom).getTime() <= at && (!value.effectiveTo || new Date(value.effectiveTo).getTime() > at)))
    problems.push({ message: `${anchor?.name ?? 'The sample type'} has no active revision at activation time. Activate the appropriate sample revision first.`, section: 'sample-types' })
  if (item.shippingProcedureId && !configuration.procedures?.some(value => value.id === item.shippingProcedureId && value.isActive))
    problems.push({ message: 'The selected shipping procedure is not approved. Review that procedure before activating this assignment.', section: 'procedures' })
  return problems
}

export function ShippingAvailabilityDialog({ change, configuration, onClose, restoreFocus }: {
  change: ShippingStatusChange
  configuration: SampleShippingConfiguration
  onClose: () => void
  restoreFocus: () => void
}) {
  const client = useQueryClient()
  const mutation = useMutation({
    mutationFn: async () => {
      const input = { isActive: change.isActive, version: change.item.version }
      return change.kind === 'destination' ? setShippingDestinationStatus(change.item.id, input) : setShippingAssignmentStatus(change.item.id, input)
    },
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onClose() },
  })
  const name = change.kind === 'destination' ? change.item.name : `${change.item.destinationName} + ${change.item.sampleTypeName}`
  const action = change.isActive ? 'Activate' : 'Deactivate'
  const problems = change.isActive && change.kind === 'assignment' ? assignmentActivationProblems(change.item, configuration) : []
  const future = new Date(change.item.effectiveFrom).getTime() > Date.now()
  return <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose() }}><DialogContent showCloseButton={!mutation.isPending} onCloseAutoFocus={event => { event.preventDefault(); restoreFocus() }}>
    <DialogHeader><DialogTitle>{action} {change.kind === 'destination' ? 'destination' : 'shipping assignment'}?</DialogTitle><DialogDescription>{name} · revision {change.item.revision}. {change.isActive
      ? `Makes this revision available for new shipping work${future ? ` from ${new Date(change.item.effectiveFrom).toLocaleString()}` : ' now'}, replacing earlier active revisions at that time.`
      : 'Stops new shipping work from using this revision. Older revisions will not be reactivated.'} The revision number and issued shipping instructions stay unchanged.</DialogDescription></DialogHeader>
    {problems.length ? <Alert variant="destructive"><AlertTitle>Complete setup before activation</AlertTitle><AlertDescription><ul className="list-disc space-y-2 pl-4">{problems.map(problem => <li key={problem.section}>{problem.message} <Link className="underline" to="/sample-shipping-settings" search={{ shippingSection: problem.section }} onClick={onClose}>Open {problem.section === 'destinations' ? 'Ship-to destinations' : problem.section === 'sample-types' ? 'Sample types' : 'Shipping procedures'}</Link></li>)}</ul></AlertDescription></Alert> : null}
    {mutation.error ? <Alert variant="destructive"><AlertTitle>Status was not changed</AlertTitle><AlertDescription>{getOrderErrorMessage(mutation.error, 'Refresh the configuration and try again.')}<Button type="button" variant="outline" onClick={async () => { await client.invalidateQueries({ queryKey: ['sample-shipping-configuration'] }); onClose() }}>Refresh configuration</Button></AlertDescription></Alert> : null}
    <RequiredDialogFooter showLegend={false}><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>Cancel</Button><Button type="button" variant={change.isActive ? 'default' : 'destructive'} disabled={mutation.isPending || problems.length > 0} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Saving…' : action}</Button></RequiredDialogFooter>
  </DialogContent></Dialog>
}
