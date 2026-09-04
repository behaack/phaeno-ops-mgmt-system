import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import {
  createLabServiceWorkflow,
  getLabOperationsError,
  transitionLabServiceWorkflowVersion,
  type LabMarketedService,
  type LabServiceWorkflow,
} from '#/api/lab-operations'
import { Alert, AlertDescription, AlertTitle } from '#/components/ui/alert'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { RequiredDialogFooter, RequiredFieldName } from '#/components/ui/required-field'

type ConfirmedWorkflowAction = 'discard' | 'promote' | 'retire' | 'withdraw'

const transitionCopy: Record<ConfirmedWorkflowAction, { title: string; description: string; label: string }> = {
  discard: {
    title: 'Discard workflow draft?',
    description: 'This version will remain in history as Discarded and cannot be approved or promoted. The canonical service workflow will remain available for a new version.',
    label: 'Discard draft',
  },
  promote: {
    title: 'Promote workflow to production?',
    description: 'This exact ordered workflow will govern new laboratory jobs. Its Approved protocols will enter Production, and the previous Production workflow and replaced protocol versions will be retired.',
    label: 'Promote to production',
  },
  retire: {
    title: 'Retire production workflow?',
    description: 'Existing jobs will keep this pinned version, but new laboratory jobs cannot start this service until another workflow version is promoted.',
    label: 'Retire workflow',
  },
  withdraw: {
    title: 'Withdraw workflow approval?',
    description: 'This version will return to Draft and must be reviewed and approved again before it can enter Production.',
    label: 'Withdraw approval',
  },
}

export function ServiceWorkflowList({
  workflows,
  marketedServices,
  canManage,
  refresh,
}: {
  workflows: LabServiceWorkflow[]
  marketedServices: LabMarketedService[]
  canManage: boolean
  refresh: () => Promise<unknown>
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    workflow: LabServiceWorkflow
    versionId: string
    workflowVersion: number
    action: ConfirmedWorkflowAction
  } | null>(null)
  const transition = useMutation({
    mutationFn: ({ workflow, versionId, action }: { workflow: LabServiceWorkflow; versionId: string; action: string }) =>
      transitionLabServiceWorkflowVersion(versionId, { action, workflowVersion: workflow.version }),
    onSuccess: async () => {
      setConfirmation(null)
      await refresh()
    },
  })
  // Keep the canonical service identity visible even when its only candidate was
  // discarded; otherwise the unique service key would make the next version unreachable.
  const visibleWorkflows = workflows

  return (
    <>
      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Controlled service workflows</CardTitle>
              <CardDescription>
                One canonical workflow per marketed service stitches approved protocols into an ordered production process.
              </CardDescription>
            </div>
            {canManage ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus data-icon="inline-start" /> New service workflow
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {transition.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Workflow status was not changed</AlertTitle>
              <AlertDescription>{getLabOperationsError(transition.error, 'Refresh the workflow and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          <div className="space-y-4">
            {visibleWorkflows.map((workflow) => {
              const openCandidate = workflow.versions.find((version) => version.status === 'Draft' || version.status === 'Approved')
              return (
                <section key={workflow.id} className="rounded-lg border bg-background p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{workflow.name}</h3>
                      {workflow.description ? <p className="mt-1 text-sm text-muted-foreground">{workflow.description}</p> : null}
                      <p className="mt-1 text-xs text-muted-foreground">{workflow.serviceKey} · latest v{workflow.latestVersion || 'none'}</p>
                    </div>
                    {canManage && !openCandidate ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/lab-operations/workflows/$workflowId/versions/new" params={{ workflowId: workflow.id }} search={{ section: undefined }}>
                          Add version
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2">
                    {workflow.versions.filter((version) => version.status !== 'Discarded').map((version) => (
                      <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-muted px-3 py-2 text-sm">
                        <div>
                          <span className="font-medium">v{version.workflowVersion}</span>
                          <Status value={version.status} />
                          <span className="ml-2 text-muted-foreground">{version.stages.length} stage(s)</span>
                        </div>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            {version.status === 'Draft' ? (
                              <>
                                <Button asChild size="sm">
                                  <Link to="/lab-operations/workflows/$workflowId/versions/$versionId/edit" params={{ workflowId: workflow.id, versionId: version.id }} search={{ section: undefined }}>
                                    Continue editing
                                  </Link>
                                </Button>
                                <Button type="button" size="sm" variant="outline" disabled={transition.isPending} onClick={() => transition.mutate({ workflow, versionId: version.id, action: 'approve' })}>Approve</Button>
                                <Button type="button" size="sm" variant="ghost" disabled={transition.isPending} onClick={() => setConfirmation({ workflow, versionId: version.id, workflowVersion: version.workflowVersion, action: 'discard' })}>Discard</Button>
                              </>
                            ) : null}
                            {version.status === 'Approved' ? (
                              <>
                                <Button type="button" size="sm" disabled={transition.isPending} onClick={() => setConfirmation({ workflow, versionId: version.id, workflowVersion: version.workflowVersion, action: 'promote' })}>Promote to production</Button>
                                <Button type="button" size="sm" variant="outline" disabled={transition.isPending} onClick={() => setConfirmation({ workflow, versionId: version.id, workflowVersion: version.workflowVersion, action: 'withdraw' })}>Withdraw approval</Button>
                              </>
                            ) : null}
                            {version.status === 'Production' ? (
                              <Button type="button" size="sm" variant="ghost" disabled={transition.isPending} onClick={() => setConfirmation({ workflow, versionId: version.id, workflowVersion: version.workflowVersion, action: 'retire' })}>Retire</Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
          {visibleWorkflows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No service workflow has been defined.</p> : null}
        </CardContent>
      </Card>

      <CreateServiceWorkflowDialog
        open={createOpen}
        marketedServices={marketedServices.filter((service) => !workflows.some((workflow) => workflow.serviceKey === service.serviceKey))}
        onOpenChange={setCreateOpen}
        onSaved={async () => {
          setCreateOpen(false)
          await refresh()
        }}
      />

      <Dialog
        open={confirmation !== null}
        onOpenChange={(open) => {
          if (open) return
          setConfirmation(null)
          transition.reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmation ? transitionCopy[confirmation.action].title : 'Change workflow status?'}</DialogTitle>
          </DialogHeader>
          {confirmation ? (
            <div className="my-4 space-y-2 text-sm leading-6 text-muted-foreground" data-slot="dialog-body">
              <p>{transitionCopy[confirmation.action].description}</p>
              <p className="font-medium text-foreground">{confirmation.workflow.name} · v{confirmation.workflowVersion}</p>
            </div>
          ) : null}
          {transition.error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Workflow status was not changed</AlertTitle>
              <AlertDescription>{getLabOperationsError(transition.error, 'Refresh the workflow and try again.')}</AlertDescription>
            </Alert>
          ) : null}
          <RequiredDialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button
              type="button"
              variant={confirmation?.action === 'discard' || confirmation?.action === 'retire' ? 'destructive' : 'default'}
              disabled={!confirmation || transition.isPending}
              onClick={() => {
                if (!confirmation) return
                transition.mutate({ workflow: confirmation.workflow, versionId: confirmation.versionId, action: confirmation.action })
              }}
            >
              {transition.isPending ? 'Saving…' : confirmation ? transitionCopy[confirmation.action].label : 'Continue'}
            </Button>
          </RequiredDialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function CreateServiceWorkflowDialog({
  open,
  marketedServices,
  onOpenChange,
  onSaved,
}: {
  open: boolean
  marketedServices: LabMarketedService[]
  onOpenChange: (open: boolean) => void
  onSaved: () => Promise<unknown>
}) {
  const [serviceKey, setServiceKey] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const mutation = useMutation({
    mutationFn: () => createLabServiceWorkflow({ serviceKey, name, description: description || null }),
    onSuccess: async () => {
      setServiceKey('')
      setName('')
      setDescription('')
      await onSaved()
    },
  })
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Create service workflow</DialogTitle>
            <DialogDescription>Create the single controlled workflow identity for a marketed laboratory service. Add its ordered protocol stages next.</DialogDescription>
          </DialogHeader>
          <div className="my-5 grid gap-4">
            <div>
              <Label htmlFor="workflow-service"><RequiredFieldName>Marketed service</RequiredFieldName></Label>
              <select id="workflow-service" className="mt-2 h-9 w-full rounded-lg border bg-background px-3 text-sm" value={serviceKey} required onChange={(event) => {
                const next = event.target.value
                setServiceKey(next)
                const service = marketedServices.find((item) => item.serviceKey === next)
                if (!name || marketedServices.some((item) => item.name === name)) setName(service?.name ?? '')
              }}>
                <option value="">Select…</option>
                {marketedServices.map((service) => <option key={service.serviceKey} value={service.serviceKey}>{service.name}</option>)}
              </select>
              {marketedServices.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Every active marketed lab service already has a workflow.</p> : null}
            </div>
            <div>
              <Label htmlFor="workflow-name"><RequiredFieldName>Workflow name</RequiredFieldName></Label>
              <Input id="workflow-name" className="mt-2" value={name} required onChange={(event) => setName(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="workflow-description">Description</Label>
              <textarea id="workflow-description" className="mt-2 min-h-24 w-full rounded-lg border bg-background px-3 py-2 text-sm" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>
          {mutation.error ? <Alert variant="destructive" className="mb-4"><AlertTitle>Workflow was not created</AlertTitle><AlertDescription>{getLabOperationsError(mutation.error, 'Check the entered values.')}</AlertDescription></Alert> : null}
          <RequiredDialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={mutation.isPending || marketedServices.length === 0}>{mutation.isPending ? 'Creating…' : 'Create workflow'}</Button>
          </RequiredDialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Status({ value }: { value: string }) {
  return <span className="ml-2 rounded-full border bg-background px-2.5 py-1 text-xs font-medium">{value}</span>
}
