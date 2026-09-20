import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, Circle, Clock, ClipboardList } from 'lucide-react'
import type { RelationshipRequest } from '#/api/organization-management'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { ActionMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '#/components/ui/dropdown-menu'
import type { RequestAction } from '#/features/organizations/RequestActionDialog'
import { useCrmRequestWork } from './use-crm-request-work'

export function CrmRequestCard({ request, isPending, onAction, onRecover }: {
  request: RelationshipRequest
  isPending: boolean
  onAction: (action: RequestAction, request: RelationshipRequest) => void
  onRecover: (request: RelationshipRequest) => void
}) {
  const work = useCrmRequestWork(request)
  const approved = request.status === 'Approved'
  const automatic = work.completion?.completesAutomatically === true
  const waitingForAcceptance = approved && automatic && work.steps.some(step => step.id === 'activate-admin' && step.status === 'waiting')
  const onlineAccess = request.requestType === 'Onboarding' || request.requestType === 'Evaluation'
  const needsAccess = onlineAccess && !request.organizationId
  const relationship = request.requestType === 'RelationshipChange'
  const checklistId = 'request-work-' + request.id
  const companySection = onlineAccess ? 'people' : request.requestType === 'ServiceChange' ? 'services' : 'overview'
  const companyAction = onlineAccess ? 'Manage people and invitations'
    : request.requestType === 'ServiceChange' ? 'Manage services and readiness'
      : request.requestType === 'Offboarding' ? 'Review Company offboarding' : 'Review Company setup'
  const completionAllowed = !work.isPending && !work.isError && work.completion?.canComplete === true
  const verified = work.steps.filter(step => step.status === 'done').length

  return (
    <article className="rounded-lg border p-4" aria-label={request.candidateOrganizationName + ' request ' + request.requestNumber}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {request.companyId ? (
              <Link to="/crm/companies/$companyId" params={{ companyId: request.companyId }}
                search={previous => ({ ...previous, section: 'requests' })}
                className="cursor-pointer break-words font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                {request.candidateOrganizationName}
              </Link>
            ) : <span className="break-words font-medium">{request.candidateOrganizationName}</span>}
            <Badge variant="outline" className="h-auto min-h-5 max-w-full break-all whitespace-normal">{request.requestNumber}</Badge>
            <Badge variant={approved ? 'secondary' : 'outline'}>{request.status === 'PendingReview' ? 'Pending review' : request.status === 'Applied' ? 'Completed' : waitingForAcceptance ? 'Waiting for acceptance' : request.status}</Badge>
          </div>
          <p className="text-sm">{request.summary}</p>
          {request.decisionReason ? <p className="text-sm text-muted-foreground">Decision: {request.decisionReason}</p> : null}
          {request.applicationNotes ? <p className="text-sm text-muted-foreground">Completed work: {request.applicationNotes}</p> : null}
          <p className="text-xs text-muted-foreground">
            {work.handoff?.type === 'TrialProject' ? 'Trial Project' : request.requestType.replace(/([a-z])([A-Z])/g, '$1 $2')}
            {request.requestedOrganizationKind ? ' → ' + request.requestedOrganizationKind : ''} ·{' '}
            {request.requestedServices.length ? request.requestedServices.map(service => service === 'PSeqLabService' ? 'PSeq Lab Service' : 'PSeq Kit + data assembly').join(', ') : 'No service change'}
          </p>
        </div>
        <ActionMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0" aria-label={'Actions for ' + request.requestNumber}>
              Actions <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {request.status === 'PendingReview' ? <>
              <DropdownMenuItem disabled={isPending} onSelect={() => onAction('approve', request)}>{needsAccess ? 'Approve and enable access' : 'Approve request'}</DropdownMenuItem>
              <DropdownMenuItem disabled={isPending} onSelect={() => onAction('decline', request)}>Decline request</DropdownMenuItem>
            </> : null}
            {approved && needsAccess ? <DropdownMenuItem disabled={isPending} onSelect={() => onRecover(request)}>Complete access enablement</DropdownMenuItem> : null}
            {approved && request.companyId ? <DropdownMenuItem asChild>
              <Link to="/crm/companies/$companyId" params={{ companyId: request.companyId }}
                search={previous => ({ ...previous, section: companySection })}>{companyAction}</Link>
            </DropdownMenuItem> : null}
            {approved && work.handoff?.type === 'TrialProject' ? <DropdownMenuItem asChild>
              {work.handoff.trialProjectId ? (
                <Link to="/trial-projects/$trialId" params={{ trialId: work.handoff.trialProjectId }} search={{ fromCompanyId: request.companyId ?? undefined }}>Open Trial</Link>
              ) : (
                <Link to="/trial-projects" search={{ requestId: work.handoff.id, fromCompanyId: request.companyId ?? undefined }}>Start Trial</Link>
              )}
            </DropdownMenuItem> : null}
            {approved && (request.requestType === 'SalesAssistedOrder' || request.requestType === 'Offboarding') ? <DropdownMenuItem asChild>
              <Link to="/order-operations">Open Order operations</Link>
            </DropdownMenuItem> : null}
            {approved && work.handoff?.opportunityId ? <DropdownMenuItem asChild>
              <Link to="/crm/opportunities/$opportunityId" params={{ opportunityId: work.handoff.opportunityId }}>Open Opportunity</Link>
            </DropdownMenuItem> : null}
            {approved && !needsAccess && work.completion && !automatic ? <DropdownMenuItem disabled={isPending || !completionAllowed}
              aria-describedby={checklistId} onSelect={() => onAction('apply', request)}>
              {relationship ? 'Apply ' + request.requestedOrganizationKind + ' relationship' : 'Complete request'}
            </DropdownMenuItem> : null}
            {request.status === 'PendingReview' || approved ? <DropdownMenuItem variant="destructive" disabled={isPending} onSelect={() => onAction('cancel', request)}>Cancel request</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </ActionMenu>
      </div>
      {approved ? <section className="mt-4 space-y-3 border-t pt-3" aria-label="Work needed">
        <div className="flex flex-wrap items-baseline justify-between gap-1">
          <h2 className="text-sm font-medium">Work needed</h2>
          {!work.isPending && !work.isError ? <p className="text-xs text-muted-foreground">{verified} of {work.steps.length} verified</p> : null}
        </div>
        {work.isError ? <div role="alert" className="space-y-2 text-sm">
          <p>Could not verify current progress. Completion is unavailable until the latest requirements can be checked.</p>
          <Button variant="outline" size="sm" onClick={() => { void work.refetch() }}>Retry progress</Button>
        </div> : work.isPending ? <p role="status" className="text-sm text-muted-foreground">Checking saved progress…</p> : (
          <ol className="space-y-3">
            {work.steps.map(step => {
              const Icon = step.status === 'done' ? Check : step.status === 'waiting' ? Clock : step.status === 'review' ? ClipboardList : Circle
              const status = step.status === 'done' ? 'Done' : step.status === 'waiting' ? 'Waiting' : step.status === 'review' ? 'Needs review' : 'Needs attention'
              return <li key={step.id} className="flex items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <span className="text-xs text-muted-foreground">{status}</span>
                  </div>
                  <details className="group/work-instructions mt-1 text-sm">
                    <summary className="flex min-h-7 w-fit cursor-pointer list-none items-center gap-1 rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
                      <ChevronDown className="size-4 shrink-0 group-open/work-instructions:rotate-180" aria-hidden="true" />
                      {step.status === 'done' ? 'Completion details' : step.status === 'waiting' ? 'Waiting details' : 'Instructions'}
                    </summary>
                    <div className="mt-2 space-y-2 text-muted-foreground">
                      <p>{step.detail}</p>
                      {step.instructions?.length ? <ol className="list-decimal space-y-1 pl-5">
                        {step.instructions.map(instruction => <li key={instruction}>{instruction}</li>)}
                      </ol> : null}
                    </div>
                  </details>
                </div>
              </li>
            })}
          </ol>
        )}
        <div id={checklistId} role="status" aria-live="polite" className="space-y-1 text-sm">
          {work.isError ? <p>Completion requirements could not be verified.</p> : work.isPending ? <p>Completion is unavailable while requirements are checked.</p>
            : automatic ? <p>{work.isCompleting ? 'Finishing onboarding automatically…'
              : waitingForAcceptance ? 'When the administrator accepts, this request moves to Completed / history automatically.'
                : 'Once Company access is enabled and an administrator has accepted access, this request moves to Completed / history automatically.'}</p>
            : completionAllowed ? <p>{relationship
              ? 'Minimum requirements met. Use Actions to apply the approved relationship change.'
              : 'Minimum requirements met. Finish any items marked Needs review, then use Actions → Complete request to record the completed work.'}</p>
              : <p>Complete the remaining Work needed items above to finish this request.</p>}
        </div>
        {work.completionFailed ? <div role="alert" className="space-y-2 text-sm">
          <p>Access is ready, but automatic completion could not be recorded. Progress will retry on refresh.</p>
          <Button variant="outline" size="sm" onClick={() => { void work.refetch() }}>Retry completion</Button>
        </div> : null}
        <p className="text-xs text-muted-foreground">Progress updates every 15 seconds while this page is open and when you return.{automatic ? '' : ' Items marked Needs review require your confirmation in completion notes.'}</p>
      </section> : null}
    </article>
  )
}