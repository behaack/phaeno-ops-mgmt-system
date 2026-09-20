import type { CrmHandoff } from '#/api/crm'
import type { Department, OperationalReadiness, OrganizationSummary, RelationshipRequest, ServiceEntitlement } from '#/api/organization-management'
import type { TrialDetail } from '#/api/trials'
import { getRequestWorkInstructions } from './crm-request-instructions'

export type RequestWorkStep = {
  id: string
  label: string
  detail: string
  instructions?: string[]
  status: 'done' | 'todo' | 'waiting' | 'review'
}

export type RequestWorkFacts = {
  summary?: OrganizationSummary
  handoff?: CrmHandoff
  entitlements?: ServiceEntitlement[]
  departments?: Department[]
  readiness?: OperationalReadiness
  trial?: TrialDetail
}

export function requestNeedsReadiness(request: RelationshipRequest) {
  return request.requestType !== 'SalesAssistedOrder'
    && request.requestedOrganizationKind === 'Customer'
    && request.requestedServices.includes('PSeqLabService')
}

export function buildRequestWork(request: RelationshipRequest, facts: RequestWorkFacts): RequestWorkStep[] {
  const { summary, handoff, entitlements = [], departments = [], readiness, trial } = facts
  const steps: RequestWorkStep[] = []
  const add = (id: string, label: string, status: RequestWorkStep['status'], detail: string, instructions?: string[]) =>
    steps.push({ id, label, status, detail, instructions: instructions ?? (status === 'done' ? undefined : getRequestWorkInstructions(id)) })

  if (request.requestType === 'Offboarding') {
    add('review-work', 'Review active orders and ongoing work', 'review',
      'Arrange completion, an authorized hold, or cancellation in Order operations and the owning workspace. Record the outcome in completion notes.')
    add('review-obligations', 'Review billing, files, and retention obligations', 'review',
      'Confirm outstanding billing and the approved handling of retained files and materials with the responsible teams. Record the outcome in completion notes.')
    add('disable-access', 'Disable Company Portal access', summary && !summary.isActive ? 'done' : 'todo',
      summary && !summary.isActive
        ? 'Company Portal access is inactive. Historical records are retained.'
        : 'After the offboarding review, open the Company and deactivate its access. Approval alone does not disable access.')
    return steps
  }

  add('company-access', 'Enable Company Portal access', summary?.isActive ? 'done' : 'todo',
    summary?.isActive
      ? 'The Company has an active Portal access scope.'
      : request.organizationId
        ? 'The linked Company access is inactive. Review and reactivate it in the Company workspace before continuing.'
        : request.requestType === 'Onboarding' || request.requestType === 'Evaluation'
          ? 'Use Complete access enablement in Actions to attach the approved Company access.'
          : 'Open the Company Requests tab and complete its approved online-access setup before continuing.')

  if (request.requestType === 'Onboarding' || request.requestType === 'Evaluation') {
    const adminActive = summary?.administratorStatus === 'Active'
    const adminInvited = summary?.administratorStatus === 'Invited'
    add('invite-admin', 'Invite an organization or department administrator', adminActive || adminInvited ? 'done' : 'todo',
      adminActive ? 'An organization or active-department administrator already has accepted Portal access.'
        : adminInvited ? 'A valid organization- or department-administrator invitation is pending.'
          : 'Open Company People and invite the intended contact as an organization administrator or as an administrator of an active department. Organization-wide access is optional.')
    add('activate-admin', 'Administrator accepts the invitation', adminActive ? 'done' : adminInvited ? 'waiting' : 'todo',
      adminActive ? 'An organization or active-department administrator has accepted access.'
        : adminInvited ? 'Waiting for the recipient to sign in and accept. Manage or resend the invitation from Company People if needed.'
          : 'Send the administrator invitation first. Sending it does not activate the recipient’s access.')
  }

  if (handoff?.type === 'TrialProject') {
    add('trial-created', 'Start the Trial from this request', handoff.trialProjectId ? 'done' : 'todo',
      handoff.trialProjectId ? 'A Trial is linked to this exact Company request.' : 'Choose Start Trial in Actions; the originating request is selected for you.')
    if (trial && ['Declined', 'Expired', 'Cancelled', 'ClosedIncomplete'].includes(trial.status)) {
      add('trial-outcome', 'Review the Trial outcome', 'review',
        'The linked Trial is ' + trial.status + '. Review its recorded outcome and close or cancel this request as appropriate.')
      return steps
    }
    const scope = trial?.scope
    add('trial-scope', 'Define and submit the Trial scope', scope ? 'done' : 'todo',
      scope ? 'The current Trial scope is revision ' + scope.revision + '.'
        : 'Open the Trial, define its scientific scope, samples, deliverables, and terms, then submit it for review.')
    for (const [domain, label] of [['Commercial', 'Obtain Commercial approval'], ['ScientificOperations', 'Obtain Scientific Operations approval']] as const) {
      const decision = scope?.decisions.filter(item => item.domain === domain)
        .sort((a, b) => b.atUtc.localeCompare(a.atUtc))[0]?.decision
      add('trial-' + domain, label, decision === 'Approve' ? 'done' : scope ? 'waiting' : 'todo',
        decision === 'Approve' ? 'The current scope revision is approved.'
          : decision === 'RequestChanges' ? 'The reviewer requested changes. Update and resubmit the scope in the Trial workspace.'
            : 'The authorized reviewer must approve the current scope revision in the Trial workspace.')
    }
    const accepted = Boolean(scope && trial?.acceptedScopeRevision === scope.revision && trial.approvedScopeRevision === scope.revision)
    add('trial-accepted', 'Have the Prospect accept the approved scope', accepted ? 'done' : trial?.approvedScopeRevision ? 'waiting' : 'todo',
      accepted ? 'The Prospect accepted the current approved Trial scope.'
        : 'After both approvals, the Prospect administrator accepts the current scope and terms in the Trial workspace.')
    return steps
  }

  if (request.requestType === 'ServiceChange' || (request.requestedServices.length > 0 && request.requestType !== 'SalesAssistedOrder')) {
    for (const service of request.requestedServices) {
      const label = service === 'PSeqLabService' ? 'PSeq Lab Service' : 'PSeq Kit + data assembly'
      const linked = entitlements.filter(item => item.service === service && item.sourceRequestId === request.id)
      const usable = linked.some(item => item.isUsable && (!item.departmentId || departments.some(department => department.id === item.departmentId && department.isActive)))
      const scheduled = linked.some(item => item.configurationStatus === 'Ready' && !item.isEffective && Date.parse(item.effectiveFrom) > Date.now())
      const hasEditablePermission = linked.some(item => !item.endReason)
      const sourceRequest = request.requestNumber || 'this request'
      const serviceOption = service === 'PSeqLabService' ? 'PSeq Lab Service' : 'PSeq Kit (includes data assembly)'
      add('service-' + service, 'Enable ' + label + ' for the approved company or department', usable ? 'done' : scheduled ? 'waiting' : 'todo',
        usable ? 'The saved service permission is Ready, currently effective, and linked to this request.'
          : scheduled ? 'The saved service permission is Ready but starts in the future. This step updates when its start date arrives; no change is needed if that date is correct.'
            : hasEditablePermission ? 'A service permission is already linked to this request. Review and finish that permission rather than adding another.'
              : 'Approval is recorded. Now save the service permission, called an entitlement. This enables the service; it does not create an order.',
        usable || scheduled ? undefined : hasEditablePermission ? [
          'Open this Company → Services → Entitlements, find the permission linked to ' + sourceRequest + ', and select Edit.',
          'Check that Applies to matches the approved scope and review Effective from and Effective to. If the department is inactive, review its status in Company → Departments.',
          'Set Service configuration to Ready when the approved permission is ready to use, then select Save entitlement. Pending, Blocked, or expired permissions keep this step unfinished.',
        ] : [
          'Open this Company → Services → Entitlements.',
          'Select Add entitlement. If a matching permission already exists for the approved service and department, select Edit on that permission instead.',
          'For a new entitlement, select Service: ' + serviceOption + '. Under Applies to, choose the approved department or All departments (organization default).',
          'Set Effective from to the approved start date; leave Effective to blank if there is no end date. Set Service configuration to Ready when the approved permission is ready to use.',
          'Under Approved source request, select ' + sourceRequest + '. Select Add entitlement to save, or Save entitlement when editing. Linking the request lets this checklist verify the saved permission.',
        ])
    }
    if (!request.requestedServices.length) {
      add('service-review', 'Apply and verify the approved service change', 'review',
        'Review the request’s scope in Company Services, including affected services, Departments, and dates. Record the changes in completion notes.')
    }
    if (readiness) {
      if (readiness.state === 'Ready') {
        add('readiness', 'Complete Customer operational readiness', 'done', 'The existing PSeq operational-readiness checks pass.')
      } else {
        for (const blocker of readiness.blockers) {
          add('readiness-' + blocker.code, blocker.label, 'todo', blocker.nextAction)
        }
        if (!readiness.blockers.length) {
          add('readiness', 'Complete Customer operational readiness', 'todo',
            readiness.manualBlockReason || 'Review Department readiness in Company Services.')
        }
      }
    }
  }

  if (request.requestType === 'RelationshipChange') {
    const target = request.requestedOrganizationKind
    add('relationship', 'Apply the approved ' + (target ?? '') + ' relationship', summary?.organizationKind === target ? 'done' : 'todo',
      summary?.organizationKind === target ? 'The Company already has the requested relationship.'
        : 'Review the target relationship, then choose Apply ' + target + ' relationship in Actions. This performs the conversion and completes this request together.')
  }

  if (request.requestType === 'SalesAssistedOrder') {
    const customerOrder = request.requestedOrganizationKind === 'Customer' && request.requestedServices.includes('PSeqLabService')
    if (customerOrder) {
      add('order-eligibility', 'Prepare the Customer order handoff', handoff?.orderId || handoff?.canStartCustomerOrder ? 'done' : 'todo',
        handoff?.orderId ? 'An order was created from this request.'
          : handoff?.canStartCustomerOrder ? 'The existing Customer order-start checks pass.'
            : handoff?.orderBlockingReason || 'Review the linked Opportunity and Customer ordering requirements in Order operations.')
      add('order-created', 'Start the Customer order from this request', handoff?.orderId ? 'done' : 'todo',
        handoff?.orderId ? 'Linked order: ' + (handoff.orderNumber || handoff.orderId) + '.'
          : 'Open Order operations → Intake, select this approved handoff, and start the Customer order. Order creation also completes the request.')
    } else {
      add('custom-work', 'Scope and carry out the approved custom work', 'review',
        'Open the Company and linked Opportunity. Record the agreed scope and commercial decision, then perform the authorized handoff in its owning workflow. Record the outcome in completion notes.')
    }
  }
  return steps
}