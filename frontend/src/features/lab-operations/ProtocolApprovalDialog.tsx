import { useEffect, useMemo, useState } from 'react'

import type { LabProtocol } from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'

import { deserializeProtocolDefinition, protocolDefinitionFormSchema } from './protocol-definition'

type ProtocolVersion = LabProtocol['versions'][number]

const captureScopeLabels = { tube: 'Tube — record individually', batch: 'Batch — one shared observation', shared: 'Shared value with tube exceptions' }
const qcScopeLabels = { tube: 'Tube — assess individually', batch: 'Batch — applies to all covered tubes', shared: 'Shared outcome with tube exceptions' }

export function ProtocolApprovalDialog({
  error,
  isPending,
  onApprove,
  onOpenChange,
  protocol,
  version,
}: {
  error?: string
  isPending: boolean
  onApprove: () => void
  onOpenChange: (open: boolean) => void
  protocol: LabProtocol | null
  version: ProtocolVersion | null
}) {
  const [confirmed, setConfirmed] = useState(false)
  const definition = useMemo(
    () => {
      const parsed = version ? deserializeProtocolDefinition(version.definitionJson) : null
      return parsed && protocolDefinitionFormSchema.safeParse(parsed).success ? parsed : null
    },
    [version],
  )

  useEffect(() => {
    setConfirmed(false)
  }, [version?.id])

  return (
    <Dialog open={protocol !== null && version !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Approve {protocol?.name} version {version?.protocolVersion}?
          </DialogTitle>
          <DialogDescription>
            Approval is a formal controlled release. It locks this exact version,
            records you as the approver, and makes it the approved version for
            future use. A later change requires a new draft and a new approval.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Protocol was not approved</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Protocol</p>
            <p className="mt-1 font-medium">{protocol?.name}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Version</p>
            <p className="mt-1 font-medium">{version?.protocolVersion}</p>
          </div>
          {definition ? <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preparation batches</p>
            <p className="mt-1 font-medium">{definition.preparationBatchEnabled ? 'Enabled — review the evidence and QC scopes below.' : 'Not enabled for this version.'}</p>
          </div> : null}
        </div>

        <section aria-labelledby="protocol-approval-definition">
          <h3 id="protocol-approval-definition" className="font-medium">Ordered protocol definition</h3>
          {definition ? (
            <ol className="mt-3 space-y-3">
              {definition.steps.map((step, index) => (
                <li key={`${index}-${step.name}`} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-medium">{index + 1}. {step.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.requirement}
                      {step.requiredRole ? ` · ${step.requiredRole}` : ''}
                    </p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{step.instructions}</p>
                  {step.condition ? <ReviewDetail label="Condition" value={step.condition} /> : null}
                  {step.inputMaterials ? <ReviewDetail label="Inputs" value={step.inputMaterials} /> : null}
                  {step.preparedOutputs ? <ReviewDetail label="Outputs" value={step.preparedOutputs} /> : null}
                  {step.equipmentTypes ? <ReviewDetail label="Equipment" value={step.equipmentTypes} /> : null}
                  {step.captures.length > 0 ? (
                    <ReviewDetail
                      label="Captured values"
                      value={step.captures.map((capture) => `${capture.label} (${capture.type}${capture.required ? ', required' : ''}${capture.unit ? `, ${capture.unit}` : ''}${capture.type === 'choice' ? `; choices: ${capture.choices}` : ''}${definition.preparationBatchEnabled && capture.scope ? `; evidence scope: ${captureScopeLabels[capture.scope]}` : ''}${capture.sourceTube ? '; must match the selected source tube' : ''})`).join('; ')}
                    />
                  ) : null}
                  {step.qcEnabled ? <ReviewDetail label="QC acceptance criteria" value={step.qcCriteria} /> : null}
                  {definition.preparationBatchEnabled && step.qcEnabled && step.qcScope ? <ReviewDetail label="QC scope" value={qcScopeLabels[step.qcScope]} /> : null}
                  {step.repeatable || step.operatorConfirmation ? (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {[step.repeatable ? 'May repeat' : null, step.operatorConfirmation ? 'Confirmation required' : null].filter(Boolean).join(' · ')}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <Alert variant="destructive" className="mt-3">
              <AlertTitle>Definition cannot be reviewed</AlertTitle>
              <AlertDescription>Do not approve this version until its stored definition can be opened.</AlertDescription>
            </Alert>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Checkbox
            id="confirm-protocol-approval"
            checked={confirmed}
            disabled={!definition || isPending}
            onCheckedChange={(checked) => setConfirmed(checked === true)}
          />
          <Label htmlFor="confirm-protocol-approval" className="cursor-pointer text-sm leading-5">
            I reviewed this exact version and confirm that it is complete and ready
            to govern future laboratory work. I understand that approval locks it.
          </Label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!confirmed || !definition || isPending} onClick={onApprove}>
            {isPending ? 'Approving…' : `Approve version ${version?.protocolVersion ?? ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ReviewDetail({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-2 text-xs leading-5 text-muted-foreground">
      <span className="font-medium text-foreground">{label}:</span> {value}
    </p>
  )
}
