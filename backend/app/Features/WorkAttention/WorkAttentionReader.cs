namespace PhaenoPortal.App.Features.WorkAttention;

using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.Accounts.DTOs;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.Crm.Services;
using PSeq.Operations.Commercial.Relationships.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Crm.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Commercial.Trials.Domain;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.Website.Entities;
using PhaenoPortal.App.Features.FileManagement.Services;

public sealed partial class WorkAttentionReader(PSeqOperationsDbContext db, PSeqOrderToCashOptions options, SessionDto session, bool staff, DateTime now)
{
    public List<string> DisabledSources { get; } = [];
    private SessionCapabilitiesDto Caps => session.Capabilities;
    public List<IQueryable<WorkItem>> Queries()
    {
        var queries = new List<IQueryable<WorkItem>>();
        if (staff) AddStaff(queries); else AddExternal(queries);
        return queries;
    }

    public async Task<IQueryable<WorkItem>> WithScientificEligibilityAsync(IQueryable<WorkItem> all, CancellationToken token)
    {
        var candidates = await all.Where(item => item.SourceType == "ScientificReview" || item.SourceType == "ResultRelease")
            .Select(item => new { item.SourceId, item.SourceType }).ToArrayAsync(token);
        if (candidates.Length == 0) return all;
        var eligibility = new LabResultEligibilityReader(db, options);
        var reviewIds = candidates.Where(item => item.SourceType == "ScientificReview").Select(item => item.SourceId).ToArray();
        var releaseIds = candidates.Where(item => item.SourceType == "ResultRelease").Select(item => item.SourceId).ToArray();
        var eligibleReview = await eligibility.EligiblePackageIdsAsync(db.ResultOutputPackages.Where(p => reviewIds.Contains(p.Id)), true, token);
        var eligibleRelease = await eligibility.EligiblePackageIdsAsync(db.ResultOutputPackages.Where(p => releaseIds.Contains(p.Id)), false, token);
        return all.Where(item => (item.SourceType != "ScientificReview" || eligibleReview.Contains(item.SourceId))
            && (item.SourceType != "ResultRelease" || eligibleRelease.Contains(item.SourceId)));
    }

    private void AddStaff(List<IQueryable<WorkItem>> queries)
    {
        if (Caps.CanQuoteLabServiceWork || Caps.CanOperateCommercialWork)
            queries.Add(db.LabServiceOrders.AsNoTracking().Where(order => !order.IsDiscarded && order.CommercialDraftJson == null
                && (order.Status == LabServiceOrderStatus.SubmittedForQuote || order.Status == LabServiceOrderStatus.QuoteInPreparation))
                .Select(order => new WorkItem { SourceId = order.Id, SourceType = "LabOrder", Domain = "commercial", MessageKey = "orders.price", RecordLabel = order.OrderNumber,
                    Destination = "/order-operations/lab-services/orders/", OwnerUserId = order.AssignedToUserId, DueAtUtc = order.DueAt, CreatedAtUtc = order.CreatedAt, Priority = order.DueAt < now ? 1 : 3, TargetId = (Guid?)null, Kind = "action" }));
        if (Caps.CanAccessCrm)
        {
            queries.Add(db.CrmTasks.AsNoTracking().Where(task => task.IsActive && task.Status != CrmTaskStatus.Completed && task.Status != CrmTaskStatus.Cancelled)
                .Select(task => new WorkItem { SourceId = task.Id, SourceType = "CrmTask", Domain = "crm", MessageKey = "crm.task", RecordLabel = task.Title,
                    Destination = "/crm/tasks?taskId=", OwnerUserId = task.OwnerUserId, DueAtUtc = task.DueAt, CreatedAtUtc = task.CreatedAt, Priority = task.Status == CrmTaskStatus.Blocked ? 0 : task.DueAt < now ? 1 : task.DueAt <= now.AddDays(7) ? 2 : 3, TargetId = (Guid?)null, Kind = "action" }));
            queries.Add(CrmAttentionFilters.MissingNextAction(db.CrmLeads.AsNoTracking()).Select(lead => new WorkItem { SourceId = lead.Id, SourceType = "LeadFollowUp", Domain = "crm", MessageKey = "crm.nextAction", RecordLabel = "Lead follow-up", Destination = "/crm/leads/", OwnerUserId = lead.OwnerUserId, CreatedAtUtc = lead.CreatedAt, Priority = 2, TargetId = null, Kind = "action", DueAtUtc = null }));
            queries.Add(CrmAttentionFilters.StaleOpportunities(db.CrmOpportunities.AsNoTracking(), now).Select(opportunity => new WorkItem { SourceId = opportunity.Id, SourceType = "OpportunityFollowUp", Domain = "crm", MessageKey = "crm.stale", RecordLabel = "Opportunity follow-up", Destination = "/crm/opportunities/", OwnerUserId = opportunity.OwnerUserId, CreatedAtUtc = opportunity.UpdatedAt, Priority = 2, TargetId = null, Kind = "action", DueAtUtc = null }));
        }
        if (Caps.CanQuoteLabServiceWork)
            queries.Add(db.LabServiceQuoteExtensionRequests.AsNoTracking().Where(request => request.ResolvedAt == null
                && db.LabServiceOrders.Any(order => order.Id == request.LabServiceOrderId && !order.IsDiscarded && order.Status == LabServiceOrderStatus.QuoteIssued && order.CurrentQuoteId == request.QuoteId))
                .Select(request => new WorkItem { SourceId = request.Id, TargetId = request.LabServiceOrderId, SourceType = "QuoteExtension", Domain = "commercial", MessageKey = "orders.extension", RecordLabel = "Quote extension request", Destination = "/order-operations/lab-services/orders/", OwnerUserId = db.LabServiceOrders.Where(order => order.Id == request.LabServiceOrderId).Select(order => order.AssignedToUserId).FirstOrDefault(), CreatedAtUtc = request.RequestedAt, Priority = 2, Kind = "action", DueAtUtc = null }));
        if (Caps.CanCreateTrialProjects || Caps.CanOperateCommercialWork)
            queries.Add(db.TrialProjects.AsNoTracking().Where(trial => !trial.IsOnHold && (trial.Status == TrialStatus.Requested || trial.Status == TrialStatus.UnderReview && (session.IsPlatformAdmin || db.BusinessRoleAssignments.Any(role => role.UserId == session.User!.Id && role.IsActive && role.Role == BusinessRole.CommercialLeadership))))
                .Select(trial => new WorkItem { SourceId = trial.Id, SourceType = "Trial", Domain = "commercial", MessageKey = "trials.review", RecordLabel = trial.Number,
                    Destination = "/order-operations/lab-services/trials/", OwnerUserId = trial.Status == TrialStatus.UnderReview ? (Guid?)null : trial.SalesOwnerUserId, CreatedAtUtc = trial.CreatedAt, TargetId = (Guid?)null, Kind = "action", DueAtUtc = (DateTime?)null, Priority = 3 }));
        if (Caps.CanOperateLabWork || Caps.CanSuperviseLabWork)
        {
            queries.Add(db.ResultOutputPackages.AsNoTracking().Where(package => package.State == ResultOutputPackageState.ReadyForReview
                && db.Set<LabAssemblyJob>().Any(job => job.OrganizationId == package.OrganizationId && job.LabWorkOrderId == package.LabWorkOrderId && job.LabAnalysisRunId == package.LabAnalysisRunId && job.State == "Succeeded" && job.AttentionReason == null)
                && !db.Set<LabAssemblyQc>().Any(qc => qc.ResultOutputPackageId == package.Id && qc.Decision == "Pass"
                    && !db.Set<LabAssemblyQc>().Any(later => later.ResultOutputPackageId == package.Id && later.ReviewVersion > qc.ReviewVersion)))
                .Select(package => new WorkItem { SourceId = package.Id, TargetId = db.Set<LabAssemblyJob>().Where(job => job.LabAnalysisRunId == package.LabAnalysisRunId && job.LabWorkOrderId == package.LabWorkOrderId && job.OrganizationId == package.OrganizationId).Select(job => (Guid?)job.Id).FirstOrDefault(),
                    SourceType = "OutputQc", Domain = "scientific", MessageKey = "results.qc", RecordLabel = "Assembly output QC", Destination = "/lab-operations/assembly-jobs/", Kind = "action", OwnerUserId = null, DueAtUtc = null, CreatedAtUtc = package.CreatedAt, Priority = 2 }));
            queries.Add(db.Set<LabAssemblyJob>().AsNoTracking().Where(job => job.AttentionReason != null).Select(job => new WorkItem { SourceId = job.Id,
                SourceType = "ProcessingAttention", Domain = "recovery", MessageKey = "operations.processing", RecordLabel = "Saved processing attempt", Destination = "/lab-operations/assembly-jobs/",
                Kind = "action", OwnerUserId = job.RequestedByUserId, DueAtUtc = null, CreatedAtUtc = job.RequestedAtUtc, Priority = 0, TargetId = null }));
            queries.Add(db.SampleShipments.AsNoTracking().Where(shipment => !shipment.IsPackingPool && shipment.Status == SampleShipmentStatus.Shipped)
                .Select(shipment => new WorkItem { SourceId = shipment.Id, SourceType = "Shipment", Domain = "laboratory", MessageKey = "shipping.receive", RecordLabel = shipment.ShipmentNumber,
                    Destination = "/lab-operations?section=receipt&receiptTab=receiving&shipmentId=", CreatedAtUtc = shipment.CreatedAt, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
            queries.Add(db.LabWorkOrders.AsNoTracking().Where(work => work.Status != LabWorkOrderStatus.OnHold && work.Status != LabWorkOrderStatus.Cancelled
                && db.LabSpecimens.Any(specimen => specimen.LabWorkOrderId == work.Id && specimen.ReceivedAtUtc.HasValue && specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Received))
                .Select(work => new WorkItem { SourceId = work.Id, TargetId = null, SourceType = "Accession", Domain = "laboratory", MessageKey = "lab.accession", RecordLabel = work.OpaqueSubmitterReference ?? "Lab Job",
                    Destination = "/lab-operations/", Kind = "action", OwnerUserId = null, DueAtUtc = null, CreatedAtUtc = work.UpdatedAt, Priority = 3 }));
            queries.Add(db.LabPreparationBatches.AsNoTracking().Where(batch => batch.Status == LabBatchStatus.Draft || batch.Status == LabBatchStatus.InProgress)
                .Select(batch => new WorkItem { SourceId = batch.Id, SourceType = "Preparation", Domain = "laboratory", MessageKey = "lab.prepare", RecordLabel = batch.Name,
                    Destination = "/lab-operations/preparation/", CreatedAtUtc = batch.CreatedAt, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
            queries.Add(db.LabExceptions.AsNoTracking().Where(issue => issue.Status == LabExceptionStatus.Open)
                .Select(issue => new WorkItem { SourceId = issue.Id, TargetId = issue.LabWorkOrderId, SourceType = "LabException", Domain = "laboratory", MessageKey = "lab.exception", RecordLabel = "Laboratory exception",
                    Destination = "/lab-operations/", CreatedAtUtc = issue.CreatedAt, DueAtUtc = issue.ResponseDueAtUtc, Priority = issue.IsBlocking ? 0 : 2, Kind = "action", OwnerUserId = (Guid?)null }));
            queries.Add(db.Set<TransportationKitRequest>().AsNoTracking().Where(request => request.Status == TransportationKitRequestStatus.Pending || request.Status == TransportationKitRequestStatus.PartiallyDispatched)
                .Select(request => new WorkItem { SourceId = request.Id, SourceType = "KitRequest", Domain = "fulfillment", MessageKey = "kits.fulfill", RecordLabel = "Transportation kit request",
                    Destination = "/lab-operations/kit-requests/", CreatedAtUtc = request.CreatedAt, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
            queries.Add(db.LabNgsSendouts.AsNoTracking().Where(sendout => sendout.Status == LabNgsSendoutStatus.Preparing || sendout.Status == LabNgsSendoutStatus.ReceivedByProvider
                    || sendout.Status == LabNgsSendoutStatus.Exception)
                .Select(sendout => new WorkItem { SourceId = sendout.Id, TargetId = sendout.LabOperationalBatchId, SourceType = "VendorHandoff", Domain = "laboratory", MessageKey = "lab.vendor", RecordLabel = "Sequencing vendor handoff",
                    Destination = "/lab-operations/batches/", CreatedAtUtc = sendout.CreatedAt, DueAtUtc = sendout.ExpectedCompletionAtUtc, Priority = sendout.Status == LabNgsSendoutStatus.Exception ? 0 : 3, Kind = "action", OwnerUserId = (Guid?)null }));
        }
        if (Caps.CanOperateLabWork || Caps.CanSuperviseLabWork)
        {
            queries.Add(db.Set<LabJobPhase>().AsNoTracking().Where(phase => phase.SupersededAtUtc == null && phase.CancelledAtUtc == null && phase.FirstDeliveredAtUtc == null
                && (phase.AdjustedDueAtUtc ?? phase.OriginalDueAtUtc) <= now.AddDays(3)
                && db.LabWorkOrders.Any(work => work.AuthorizationSource == LabAuthorizationSource.CommercialOrder && work.AuthorizationSourceId == phase.LabServiceOrderId && work.Status != LabWorkOrderStatus.Cancelled))
                .Select(phase => new WorkItem { SourceId = phase.Id, SourceType = "PhaseDeadline", Domain = "laboratory", MessageKey = "lab.deadline", RecordLabel = phase.Name,
                    Destination = "/lab-operations/", TargetId = db.LabWorkOrders.Where(work => work.AuthorizationSource == LabAuthorizationSource.CommercialOrder && work.AuthorizationSourceId == phase.LabServiceOrderId).Select(work => (Guid?)work.Id).FirstOrDefault(),
                    DueAtUtc = phase.AdjustedDueAtUtc ?? phase.OriginalDueAtUtc, CreatedAtUtc = phase.CreatedAt, Priority = (phase.AdjustedDueAtUtc ?? phase.OriginalDueAtUtc) < now ? 1 : 2, Kind = "action", OwnerUserId = null }));
            queries.Add(db.LabWorkOrders.AsNoTracking().Where(work => work.Status != LabWorkOrderStatus.Cancelled && work.FirstDeliveredAtUtc == null
                    && work.AuthorizationSource != LabAuthorizationSource.CommercialOrder
                    && (work.AdjustedDeliveryDueAtUtc ?? work.OriginalDeliveryDueAtUtc) < now)
                .Select(work => new WorkItem { SourceId = work.Id, SourceType = "Deadline", Domain = "laboratory", MessageKey = "lab.deadline", RecordLabel = work.OpaqueSubmitterReference ?? "Lab Job",
                    Destination = "/lab-operations/", DueAtUtc = work.AdjustedDeliveryDueAtUtc ?? work.OriginalDeliveryDueAtUtc, CreatedAtUtc = work.CreatedAt, Priority = 1, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null }));
        }
        if (Caps.CanReviewLabWork)
            queries.Add(LabScientificReviewQueueQuery.PendingPackages(db).Where(package =>
                db.LabWorkOrders.Any(work => work.Id == package.LabWorkOrderId && (work.Status == LabWorkOrderStatus.ScientificReview || options.GovernedPSeqResults && work.Status == LabWorkOrderStatus.ReadyForRelease))
                && !db.LabExceptions.Any(issue => issue.LabWorkOrderId == package.LabWorkOrderId && issue.Status == LabExceptionStatus.Open && issue.IsBlocking)
                && !db.LabProtocolExecutions.Any(execution => execution.LabWorkOrderId == package.LabWorkOrderId && execution.Status != LabExecutionStatus.Completed && execution.Status != LabExecutionStatus.Abandoned)
                && (!options.DualControlEnforced || !db.LabWorkEvents.Any(workEvent => workEvent.LabWorkOrderId == package.LabWorkOrderId
                    && workEvent.ActorUserId == session.User!.Id && workEvent.EventCode != "ScientificApprovalRecorded" && workEvent.EventCode != "ReadyForRelease")))
                .Select(package => new WorkItem { SourceId = package.Id, TargetId = package.LabWorkOrderId,
                SourceType = "ScientificReview", Domain = "scientific", MessageKey = "results.review", RecordLabel = "Scientific package", Destination = "/lab-operations/", CreatedAtUtc = package.CreatedAt, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
        if (Caps.CanReleasePSeqResults)
        {
            if (!options.GovernedPSeqResults || options.ValidateGovernedResults().Count > 0) DisabledSources.Add("result-release");
            else queries.Add(db.ResultOutputPackages.AsNoTracking().Where(package => package.TrialProjectId == null
                    && (package.State == ResultOutputPackageState.ScientificallyApproved || package.State == ResultOutputPackageState.ReadyForRelease))
                .Select(package => new WorkItem { SourceId = package.Id, SourceType = "ResultRelease", Domain = "scientific", MessageKey = "results.release", RecordLabel = "Approved result package",
                    Destination = "/lab-operations/result-packages/", CreatedAtUtc = package.CreatedAt, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
        }
        if (Caps.CanOperateCommercialWork || Caps.CanManageOrderConfiguration)
        {
            queries.Add(db.LabServiceOrders.AsNoTracking().Where(order => !order.IsDiscarded && (order.Status == LabServiceOrderStatus.CancellationRequested || order.Status == LabServiceOrderStatus.OnHold))
                .Select(order => new WorkItem { SourceId = order.Id, TargetId = null, SourceType = "CommercialDecision", Domain = "commercial", MessageKey = "orders.decision", RecordLabel = order.OrderNumber,
                    Destination = "/order-operations/lab-services/orders/", Kind = "action", OwnerUserId = order.AssignedToUserId, DueAtUtc = order.DueAt, CreatedAtUtc = order.UpdatedAt, Priority = 0 }));
            queries.Add(db.Set<LabPhaseCancellationRequest>().AsNoTracking().Where(request => request.Status == "Pending")
                .Select(request => new WorkItem { SourceId = request.Id, TargetId = db.Set<LabJobPhase>().Where(phase => phase.Id == request.LabJobPhaseId).Select(phase => (Guid?)phase.LabServiceOrderId).FirstOrDefault(),
                    SourceType = "PhaseCancellation", Domain = "commercial", MessageKey = "orders.phaseDecision", RecordLabel = "Phase cancellation request", Destination = "/order-operations/lab-services/orders/",
                    Kind = "action", OwnerUserId = null, DueAtUtc = null, CreatedAtUtc = request.RequestedAtUtc, Priority = 0 }));
        }
        AddFinance(queries);
        AddRecovery(queries);
    }

    private void AddFinance(List<IQueryable<WorkItem>> queries)
    {
        if (Caps.CanManagePSeqBilling)
            queries.Add(db.Set<OrganizationCommercialProfile>().AsNoTracking().Where(profile => profile.FinanceApprovedAtUtc == null
                && db.LabServiceOrders.Any(order => order.OrganizationId == profile.OrganizationId && !order.IsDiscarded && order.Status != LabServiceOrderStatus.DraftRequest))
                .Select(profile => new WorkItem { SourceId = profile.Id, TargetId = profile.OrganizationId, SourceType = "BillingSetup", Domain = "finance", MessageKey = "finance.tax", RecordLabel = "Customer billing setup",
                    Destination = "/finance/customer/", Kind = "action", OwnerUserId = null, DueAtUtc = null, CreatedAtUtc = profile.CreatedAt, Priority = 2 }));
        if (Caps.CanManagePSeqCash)
            queries.Add(db.PaymentReceipts.AsNoTracking().Where(receipt => receipt.UnappliedAmount > 0 && receipt.Status != PaymentReceiptStatus.Reversed)
                .Select(receipt => new WorkItem { SourceId = receipt.Id, SourceType = "Receipt", Domain = "finance", MessageKey = "finance.allocate", RecordLabel = receipt.ReceiptNumber,
                    Destination = "/finance/receipt/", CreatedAtUtc = receipt.CreatedAt, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
        if (Caps.CanReconcilePSeqCash)
            queries.Add(db.ReconciliationBatches.AsNoTracking().Where(batch => batch.Status == ReconciliationBatchStatus.Submitted
                    && (!options.DualControlEnforced || batch.CreatedByUserIdValue != session.User!.Id && batch.SubmittedByUserId != session.User.Id))
                .Select(batch => new WorkItem { SourceId = batch.Id, SourceType = "Reconciliation", Domain = "finance", MessageKey = "finance.reconcile", RecordLabel = batch.BatchNumber,
                    Destination = "/finance/reconciliation/", CreatedAtUtc = batch.CreatedAt, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
        if (Caps.CanManagePSeqBilling)
            queries.Add(db.Invoices.AsNoTracking().Where(invoice => invoice.Balance > 0 && (invoice.Status == InvoiceStatus.Issued || invoice.Status == InvoiceStatus.PartiallyPaid)
                    && invoice.DueOn < DateOnly.FromDateTime(now))
                .Select(invoice => new WorkItem { SourceId = invoice.Id, SourceType = "Invoice", Domain = "finance", MessageKey = "finance.overdue", RecordLabel = invoice.InvoiceNumber,
                    Destination = "/finance/invoice/", CreatedAtUtc = invoice.CreatedAt, Priority = 1, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null }));
    }

    private void AddRecovery(List<IQueryable<WorkItem>> queries)
    {
        if (Caps.CanOperateCommercialWork || Caps.CanReleasePSeqResults || Caps.CanManagePSeqBilling || Caps.CanManagePSeqCash || Caps.CanReconcilePSeqCash)
        {
            if (!options.AttentionOperations) DisabledSources.Add("operational-recovery");
            else
            {
                // Read live failure facts. Visiting the recovery workspace must not be
                // required to create a summary, and manual summary resolution cannot
                // hide a failure that still exists at its source.
                queries.Add(db.ReleasedDeliverableRetentionSnapshots.AsNoTracking().Where(snapshot => db.OrderNotifications.Any(notice =>
                        notice.WorkflowType == GovernedRetentionCheckpointService.WorkflowType && notice.WorkflowId == snapshot.Id
                        && notice.Status == OrderNotificationStatus.Failed))
                    .Select(snapshot => new WorkItem { SourceId = snapshot.Id, SourceType = "RetentionRecovery", Domain = "recovery", MessageKey = "operations.recover",
                        RecordLabel = "Retention notification", Destination = "/operations-recovery?attentionSource=ReleasedDeliverableRetention&sourceId=",
                        OwnerUserId = db.OperationalAttentionItems.Where(item => item.SourceType == GovernedRetentionCheckpointService.WorkflowType && item.SourceId == snapshot.Id
                            && item.Status != OperationalAttentionStatus.Resolved).Select(item => item.OwnerUserId).FirstOrDefault(),
                        CreatedAtUtc = snapshot.CreatedAt, Priority = 0, TargetId = (Guid?)null, Kind = "action", DueAtUtc = (DateTime?)null }));
                if (Caps.CanOperateCommercialWork || Caps.CanReleasePSeqResults)
                    queries.Add(db.ResultOutputPackages.AsNoTracking().Where(package => package.State == ResultOutputPackageState.Failed)
                        .Select(package => new WorkItem { SourceId = package.Id, SourceType = "ResultRecovery", Domain = "recovery", MessageKey = "operations.recover",
                            RecordLabel = "Result package processing", Destination = "/operations-recovery?attentionSource=ResultOutputPackage&sourceId=",
                            OwnerUserId = db.OperationalAttentionItems.Where(item => item.SourceType == "ResultOutputPackage" && item.SourceId == package.Id
                                && item.Status != OperationalAttentionStatus.Resolved).Select(item => item.OwnerUserId).FirstOrDefault(),
                            CreatedAtUtc = package.CreatedAt, Priority = 0, TargetId = (Guid?)null, Kind = "action", DueAtUtc = (DateTime?)null }));
                if (session.IsPlatformAdmin)
                    queries.Add(db.InvitationDeliveryAttempts.AsNoTracking().Where(attempt => attempt.State == InvitationDeliveryState.Bounced
                            || attempt.State == InvitationDeliveryState.Failed || attempt.State == InvitationDeliveryState.NeedsAttention)
                        .Select(attempt => new WorkItem { SourceId = attempt.Id, SourceType = "InvitationRecovery", Domain = "recovery", MessageKey = "operations.recover",
                            RecordLabel = "Invitation delivery", Destination = "/operations-recovery?attentionSource=InvitationDeliveryAttempt&sourceId=",
                            OwnerUserId = db.OperationalAttentionItems.Where(item => item.SourceType == "InvitationDeliveryAttempt" && item.SourceId == attempt.Id
                                && item.Status != OperationalAttentionStatus.Resolved).Select(item => item.OwnerUserId).FirstOrDefault(),
                            CreatedAtUtc = attempt.CreatedAt, Priority = 0, TargetId = (Guid?)null, Kind = "action", DueAtUtc = (DateTime?)null }));
            }
        }
        if (!session.IsPlatformAdmin) return;
        queries.Add(db.PortalIntegrationRequests.AsNoTracking().Where(request => request.Status == PortalIntegrationRequestStatus.PendingReview)
            .Select(request => new WorkItem { SourceId = request.Id, SourceType = "CompanyRequest", Domain = "access", MessageKey = "access.review", RecordLabel = request.RequestNumber,
                Destination = "/crm/requests?requestId=", TargetId = null, Kind = "action", OwnerUserId = null, DueAtUtc = null, CreatedAtUtc = request.CreatedAt, Priority = 3 }));
        queries.Add(db.WebOrders.AsNoTracking().Where(request => request.CompletedAtUtc == null)
            .Select(request => new WorkItem { SourceId = request.Id, SourceType = "DemoRequest", Domain = "web", MessageKey = "web.demo", RecordLabel = "Demo request", Destination = "/?dashboardSection=webOps&requestId=", CreatedAtUtc = null, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null, Priority = 3 }));
        queries.Add(db.Set<WebNotificationDelivery>().AsNoTracking().Where(delivery => delivery.State == WebNotificationState.Failed
                || delivery.State == WebNotificationState.Processing && delivery.LeaseExpiresAtUtc < now)
            .Select(delivery => new WorkItem { SourceId = delivery.Id, SourceType = "WebEmail", Domain = "web", MessageKey = "web.recover", RecordLabel = "Email delivery", Destination = "/?dashboardSection=webOps&deliveryId=", CreatedAtUtc = delivery.CreatedAtUtc.UtcDateTime, Priority = 0, TargetId = (Guid?)null, Kind = "action", OwnerUserId = (Guid?)null, DueAtUtc = (DateTime?)null }));
    }
}
