namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class InternalLabOperationsProvider(PSeqOperationsDbContext dbContext)
    : ILabOperationsProvider
{
    private static readonly JsonSerializerOptions SerializerOptions = CreateSerializerOptions();

    public Task<LabCommandAcknowledgment> AuthorizeWorkAsync(
        AuthorizeLabWorkCommand command,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return ExecuteIdempotentAsync(
            command,
            command.Metadata,
            command.AuthorizationId,
            LabProviderCommandType.AuthorizeWork,
            (payloadJson, payloadSha256, acknowledgedAtUtc) =>
                ApplyAuthorizationAsync(command, payloadJson, payloadSha256, acknowledgedAtUtc, cancellationToken),
            outcome => outcome.LabWorkOrderId,
            outcome => outcome.AppliedAuthorizationVersion,
            outcome => outcome.Disposition.ToString(),
            outcome => outcome.ReasonCode,
            (metadata, acknowledgedAtUtc) => RejectedAcknowledgment(
                metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc),
            (metadata, acknowledgedAtUtc) => RejectedAcknowledgment(
                metadata,
                LabCommandReasonCodes.CommandIdConflict,
                acknowledgedAtUtc),
            cancellationToken);
    }

    public Task<LabCommandAcknowledgment> AmendAuthorizationAsync(
        AmendLabWorkAuthorizationCommand command,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return ExecuteIdempotentAsync(
            command,
            command.Metadata,
            command.AuthorizationId,
            LabProviderCommandType.AmendAuthorization,
            (payloadJson, payloadSha256, acknowledgedAtUtc) =>
                ApplyAmendmentAsync(command, payloadJson, payloadSha256, acknowledgedAtUtc, cancellationToken),
            outcome => outcome.LabWorkOrderId,
            outcome => outcome.AppliedAuthorizationVersion,
            outcome => outcome.Disposition.ToString(),
            outcome => outcome.ReasonCode,
            (metadata, acknowledgedAtUtc) => RejectedAcknowledgment(
                metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc),
            (metadata, acknowledgedAtUtc) => RejectedAcknowledgment(
                metadata,
                LabCommandReasonCodes.CommandIdConflict,
                acknowledgedAtUtc),
            cancellationToken);
    }

    public Task<LabCancellationOutcome> RequestCancellationAsync(
        RequestLabWorkCancellationCommand command,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(command);

        return ExecuteIdempotentAsync(
            command,
            command.Metadata,
            command.AuthorizationId,
            LabProviderCommandType.RequestCancellation,
            (_, _, acknowledgedAtUtc) => ApplyCancellationAsync(command, acknowledgedAtUtc, cancellationToken),
            outcome => outcome.LabWorkOrderId,
            _ => null,
            outcome => outcome.Disposition.ToString(),
            outcome => outcome.ReasonCode,
            (metadata, acknowledgedAtUtc) => RejectedCancellation(
                metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc),
            (metadata, acknowledgedAtUtc) => RejectedCancellation(
                metadata,
                LabCommandReasonCodes.CommandIdConflict,
                acknowledgedAtUtc),
            cancellationToken);
    }

    public async Task<LabWorkProjection?> GetWorkProjectionAsync(
        Guid authorizationId,
        CancellationToken cancellationToken)
    {
        if (authorizationId == Guid.Empty)
        {
            return null;
        }

        var workOrder = await dbContext.LabWorkOrders
            .AsNoTracking()
            .SingleOrDefaultAsync(
                candidate => candidate.AuthorizationId == authorizationId,
                cancellationToken);

        if (workOrder is null)
        {
            return null;
        }

        return new LabWorkProjection(
            workOrder.AuthorizationId,
            workOrder.Id,
            workOrder.CurrentAuthorizationVersion,
            MapMilestone(workOrder.Status),
            MapScheduleHealth(workOrder.Status),
            CurrentExpectedCompletionAtUtc: null,
            ActiveCustomerActionCount: 0,
            workOrder.UpdatedAt,
            workOrder.Version);
    }

    private async Task<LabCommandAcknowledgment> ApplyAuthorizationAsync(
        AuthorizeLabWorkCommand command,
        string payloadJson,
        string payloadSha256,
        DateTime acknowledgedAtUtc,
        CancellationToken cancellationToken)
    {
        if (!IsValidAuthorization(command))
        {
            return RejectedAcknowledgment(
                command.Metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc);
        }

        var existingWorkOrder = await dbContext.LabWorkOrders
            .AsNoTracking()
            .SingleOrDefaultAsync(
                candidate => candidate.AuthorizationId == command.AuthorizationId,
                cancellationToken);
        if (existingWorkOrder is not null)
        {
            return new LabCommandAcknowledgment(
                command.Metadata.CommandId,
                command.Metadata.CorrelationId,
                LabCommandDisposition.Rejected,
                existingWorkOrder.Id,
                existingWorkOrder.CurrentAuthorizationVersion,
                LabCommandReasonCodes.AuthorizationVersionConflict,
                acknowledgedAtUtc);
        }

        var workOrder = new LabWorkOrder(
            command.AuthorizationId,
            command.AuthorizationVersion,
            MapSource(command.SourceType),
            command.AuthorizationSourceId,
            command.SubmittingOrganizationId,
            command.ServiceKey,
            command.ServiceVersion,
            command.TurnaroundPolicyKey,
            command.OpaqueSubmitterReference);

        workOrder.AuthorizationVersions.Add(new LabWorkAuthorizationVersion(
            workOrder.Id,
            command.Metadata.CommandId,
            command.Metadata.CorrelationId,
            command.AuthorizationVersion,
            command.Metadata.ContractVersion,
            payloadJson,
            payloadSha256,
            command.Metadata.OccurredAtUtc));

        foreach (var specimen in command.Specimens)
        {
            workOrder.Specimens.Add(new LabSpecimen(workOrder.Id, specimen.SubmittedSpecimenId));
        }

        dbContext.LabWorkOrders.Add(workOrder);

        return new LabCommandAcknowledgment(
            command.Metadata.CommandId,
            command.Metadata.CorrelationId,
            LabCommandDisposition.Accepted,
            workOrder.Id,
            command.AuthorizationVersion,
            ReasonCode: null,
            acknowledgedAtUtc);
    }

    private async Task<LabCommandAcknowledgment> ApplyAmendmentAsync(
        AmendLabWorkAuthorizationCommand command,
        string payloadJson,
        string payloadSha256,
        DateTime acknowledgedAtUtc,
        CancellationToken cancellationToken)
    {
        var replacement = command.ReplacementAuthorization;
        if (!IsValidAmendment(command))
        {
            return RejectedAcknowledgment(
                command.Metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc);
        }

        var workOrder = await dbContext.LabWorkOrders
            .Include(candidate => candidate.Specimens)
            .SingleOrDefaultAsync(
                candidate => candidate.AuthorizationId == command.AuthorizationId,
                cancellationToken);
        if (workOrder is null)
        {
            return RejectedAcknowledgment(
                command.Metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc);
        }

        if (workOrder.CurrentAuthorizationVersion != command.ExpectedAuthorizationVersion)
        {
            return new LabCommandAcknowledgment(
                command.Metadata.CommandId,
                command.Metadata.CorrelationId,
                LabCommandDisposition.Rejected,
                workOrder.Id,
                workOrder.CurrentAuthorizationVersion,
                LabCommandReasonCodes.AuthorizationVersionConflict,
                acknowledgedAtUtc);
        }

        if (workOrder.Status != LabWorkOrderStatus.AwaitingSpecimens)
        {
            return ManualReviewAcknowledgment(command.Metadata, workOrder, acknowledgedAtUtc);
        }

        if (workOrder.AuthorizationSource != MapSource(replacement.SourceType)
            || workOrder.AuthorizationSourceId != replacement.AuthorizationSourceId
            || workOrder.SubmittingOrganizationId != replacement.SubmittingOrganizationId)
        {
            return new LabCommandAcknowledgment(
                command.Metadata.CommandId,
                command.Metadata.CorrelationId,
                LabCommandDisposition.Rejected,
                workOrder.Id,
                workOrder.CurrentAuthorizationVersion,
                LabCommandReasonCodes.ChangeNotSafe,
                acknowledgedAtUtc);
        }

        var replacementSpecimenIds = replacement.Specimens
            .Select(specimen => specimen.SubmittedSpecimenId)
            .ToHashSet();
        var removedSpecimens = workOrder.Specimens
            .Where(specimen => !replacementSpecimenIds.Contains(specimen.SubmittedSpecimenId))
            .ToList();
        var reactivatedSpecimens = workOrder.Specimens
            .Where(specimen => replacementSpecimenIds.Contains(specimen.SubmittedSpecimenId)
                && specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled)
            .ToList();

        if (removedSpecimens.Any(specimen =>
                specimen.IntakeDisposition != LabSpecimenIntakeDisposition.AwaitingReceipt)
            || reactivatedSpecimens.Count > 0)
        {
            return ManualReviewAcknowledgment(command.Metadata, workOrder, acknowledgedAtUtc);
        }

        workOrder.RecordAuthorizationVersion(
            command.NewAuthorizationVersion,
            replacement.ServiceKey,
            replacement.ServiceVersion,
            replacement.TurnaroundPolicyKey,
            replacement.OpaqueSubmitterReference);

        foreach (var removedSpecimen in removedSpecimens)
        {
            removedSpecimen.CancelBeforeReceipt(command.CommercialReasonCode);
        }

        var existingSpecimenIds = workOrder.Specimens
            .Select(specimen => specimen.SubmittedSpecimenId)
            .ToHashSet();
        foreach (var specimen in replacement.Specimens
                     .Where(specimen => !existingSpecimenIds.Contains(specimen.SubmittedSpecimenId)))
        {
            workOrder.Specimens.Add(new LabSpecimen(workOrder.Id, specimen.SubmittedSpecimenId));
        }

        workOrder.AuthorizationVersions.Add(new LabWorkAuthorizationVersion(
            workOrder.Id,
            command.Metadata.CommandId,
            command.Metadata.CorrelationId,
            command.NewAuthorizationVersion,
            command.Metadata.ContractVersion,
            payloadJson,
            payloadSha256,
            command.Metadata.OccurredAtUtc));

        return new LabCommandAcknowledgment(
            command.Metadata.CommandId,
            command.Metadata.CorrelationId,
            LabCommandDisposition.Accepted,
            workOrder.Id,
            command.NewAuthorizationVersion,
            ReasonCode: null,
            acknowledgedAtUtc);
    }

    private async Task<LabCancellationOutcome> ApplyCancellationAsync(
        RequestLabWorkCancellationCommand command,
        DateTime acknowledgedAtUtc,
        CancellationToken cancellationToken)
    {
        if (!IsValidMetadata(command.Metadata)
            || command.ExpectedAuthorizationVersion < 1
            || string.IsNullOrWhiteSpace(command.ReasonCode)
            || command.SubmittedSpecimenIds is { Count: 0 }
            || command.SubmittedSpecimenIds?.Contains(Guid.Empty) == true
            || command.SubmittedSpecimenIds?.Distinct().Count() != command.SubmittedSpecimenIds?.Count)
        {
            return RejectedCancellation(
                command.Metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc);
        }

        var workOrder = await dbContext.LabWorkOrders
            .Include(candidate => candidate.Specimens)
            .SingleOrDefaultAsync(
                candidate => candidate.AuthorizationId == command.AuthorizationId,
                cancellationToken);
        if (workOrder is null)
        {
            return RejectedCancellation(
                command.Metadata,
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc);
        }

        if (workOrder.CurrentAuthorizationVersion != command.ExpectedAuthorizationVersion)
        {
            return new LabCancellationOutcome(
                command.Metadata.CommandId,
                command.Metadata.CorrelationId,
                LabCancellationDisposition.Rejected,
                workOrder.Id,
                [],
                LabCommandReasonCodes.AuthorizationVersionConflict,
                acknowledgedAtUtc);
        }

        var requestedIds = command.SubmittedSpecimenIds?.ToHashSet();
        if (requestedIds is not null
            && requestedIds.Except(workOrder.Specimens.Select(specimen => specimen.SubmittedSpecimenId)).Any())
        {
            return new LabCancellationOutcome(
                command.Metadata.CommandId,
                command.Metadata.CorrelationId,
                LabCancellationDisposition.Rejected,
                workOrder.Id,
                [],
                LabCommandReasonCodes.AuthorizationInvalid,
                acknowledgedAtUtc);
        }

        var targets = workOrder.Specimens
            .Where(specimen => requestedIds?.Contains(specimen.SubmittedSpecimenId)
                ?? specimen.IntakeDisposition != LabSpecimenIntakeDisposition.Cancelled)
            .ToList();
        var cancellable = targets
            .Where(specimen => specimen.IntakeDisposition == LabSpecimenIntakeDisposition.AwaitingReceipt)
            .ToList();
        var blockedCount = targets.Count(specimen =>
            specimen.IntakeDisposition is not LabSpecimenIntakeDisposition.AwaitingReceipt
                and not LabSpecimenIntakeDisposition.Cancelled);

        foreach (var specimen in cancellable)
        {
            specimen.CancelBeforeReceipt(command.ReasonCode);
        }

        if (workOrder.Status == LabWorkOrderStatus.AwaitingSpecimens
            && workOrder.Specimens.All(specimen =>
                specimen.IntakeDisposition == LabSpecimenIntakeDisposition.Cancelled))
        {
            workOrder.CancelBeforeExecution();
        }

        var disposition = blockedCount == 0
            ? LabCancellationDisposition.Accepted
            : cancellable.Count > 0
                ? LabCancellationDisposition.PartiallyAccepted
                : LabCancellationDisposition.ManualReviewRequired;
        var reasonCode = blockedCount == 0 ? null : LabCommandReasonCodes.WorkAlreadyStarted;

        return new LabCancellationOutcome(
            command.Metadata.CommandId,
            command.Metadata.CorrelationId,
            disposition,
            workOrder.Id,
            cancellable.Select(specimen => specimen.SubmittedSpecimenId).ToList(),
            reasonCode,
            acknowledgedAtUtc);
    }

    private async Task<TOutcome> ExecuteIdempotentAsync<TCommand, TOutcome>(
        TCommand command,
        LabOperationsCommandMetadata metadata,
        Guid authorizationId,
        LabProviderCommandType commandType,
        Func<string, string, DateTime, Task<TOutcome>> applyAsync,
        Func<TOutcome, Guid?> workOrderId,
        Func<TOutcome, int?> appliedAuthorizationVersion,
        Func<TOutcome, string> disposition,
        Func<TOutcome, string?> reasonCode,
        Func<LabOperationsCommandMetadata, DateTime, TOutcome> invalidIdentity,
        Func<LabOperationsCommandMetadata, DateTime, TOutcome> commandIdConflict,
        CancellationToken cancellationToken)
    {
        var acknowledgedAtUtc = DateTime.UtcNow;
        if (metadata.CommandId == Guid.Empty
            || metadata.CorrelationId == Guid.Empty
            || authorizationId == Guid.Empty)
        {
            return invalidIdentity(metadata, acknowledgedAtUtc);
        }

        var payloadJson = JsonSerializer.Serialize(command, SerializerOptions);
        var payloadSha256 = Convert.ToHexStringLower(
            SHA256.HashData(Encoding.UTF8.GetBytes(payloadJson)));

        var existingReceipt = await FindReceiptAsync(metadata.CommandId, cancellationToken);
        if (existingReceipt is not null)
        {
            return ReadExistingOutcome(
                existingReceipt,
                metadata,
                commandType,
                payloadSha256,
                commandIdConflict);
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable,
            cancellationToken);
        try
        {
            existingReceipt = await FindReceiptAsync(metadata.CommandId, cancellationToken);
            if (existingReceipt is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ReadExistingOutcome(
                    existingReceipt,
                    metadata,
                    commandType,
                    payloadSha256,
                    commandIdConflict);
            }

            var outcome = await applyAsync(payloadJson, payloadSha256, acknowledgedAtUtc);
            dbContext.LabProviderCommandReceipts.Add(new LabProviderCommandReceipt(
                metadata.CommandId,
                metadata.CorrelationId,
                authorizationId,
                commandType,
                payloadSha256,
                disposition(outcome),
                workOrderId(outcome),
                appliedAuthorizationVersion(outcome),
                reasonCode(outcome),
                JsonSerializer.Serialize(outcome, SerializerOptions),
                acknowledgedAtUtc));

            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return outcome;
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);
            dbContext.ChangeTracker.Clear();

            var concurrentReceipt = await FindReceiptAsync(metadata.CommandId, cancellationToken);
            if (concurrentReceipt is not null)
            {
                return ReadExistingOutcome(
                    concurrentReceipt,
                    metadata,
                    commandType,
                    payloadSha256,
                    commandIdConflict);
            }

            throw;
        }
    }

    private async Task<LabProviderCommandReceipt?> FindReceiptAsync(
        Guid commandId,
        CancellationToken cancellationToken) =>
        await dbContext.LabProviderCommandReceipts
            .AsNoTracking()
            .SingleOrDefaultAsync(receipt => receipt.CommandId == commandId, cancellationToken);

    private static TOutcome ReadExistingOutcome<TOutcome>(
        LabProviderCommandReceipt receipt,
        LabOperationsCommandMetadata metadata,
        LabProviderCommandType commandType,
        string payloadSha256,
        Func<LabOperationsCommandMetadata, DateTime, TOutcome> commandIdConflict)
    {
        if (!receipt.Matches(commandType, payloadSha256))
        {
            return commandIdConflict(metadata, DateTime.UtcNow);
        }

        return JsonSerializer.Deserialize<TOutcome>(receipt.OutcomeJson, SerializerOptions)
            ?? throw new InvalidOperationException("The stored Lab provider outcome is invalid.");
    }

    private static bool IsValidAmendment(AmendLabWorkAuthorizationCommand command) =>
        command.ReplacementAuthorization is not null
        && IsValidMetadata(command.Metadata)
        && command.ExpectedAuthorizationVersion > 0
        && command.NewAuthorizationVersion > command.ExpectedAuthorizationVersion
        && !string.IsNullOrWhiteSpace(command.CommercialReasonCode)
        && command.ReplacementAuthorization.AuthorizationId == command.AuthorizationId
        && command.ReplacementAuthorization.AuthorizationVersion == command.NewAuthorizationVersion
        && command.ReplacementAuthorization.Metadata == command.Metadata
        && IsValidAuthorization(command.ReplacementAuthorization);

    private static bool IsValidAuthorization(AuthorizeLabWorkCommand command) =>
        IsValidMetadata(command.Metadata)
        && command.AuthorizationId != Guid.Empty
        && command.AuthorizationVersion > 0
        && Enum.IsDefined(command.SourceType)
        && command.AuthorizationSourceId != Guid.Empty
        && command.SubmittingOrganizationId != Guid.Empty
        && command.ServiceVersion > 0
        && HasValue(command.ServiceKey)
        && HasValue(command.TurnaroundPolicyKey)
        && command.Specimens is { Count: > 0 }
        && command.Specimens.All(IsValidSpecimen)
        && command.Specimens.Select(specimen => specimen.SubmittedSpecimenId).Distinct().Count()
            == command.Specimens.Count;

    private static bool IsValidSpecimen(AuthorizedSpecimen specimen) =>
        specimen is not null
        && specimen.SubmittedSpecimenId != Guid.Empty
        && HasValue(specimen.SubmitterSpecimenReference)
        && HasValue(specimen.DeclaredMaterialType)
        && HasValue(specimen.DeclaredBiologicalSource)
        && specimen.DeclaredQuantity > 0
        && HasValue(specimen.DeclaredQuantityUnit)
        && HasValue(specimen.DeclaredStorageRequirements)
        && HasValue(specimen.DeclaredSafetyInformation)
        && (specimen.DeclaredConcentration is null or > 0)
        && specimen.RequestedServiceKeys is { Count: > 0 }
        && specimen.RequestedServiceKeys.All(HasValue);

    private static bool IsValidMetadata(LabOperationsCommandMetadata metadata) =>
        metadata is not null
        && metadata.CommandId != Guid.Empty
        && metadata.CorrelationId != Guid.Empty
        && metadata.OccurredAtUtc.Kind == DateTimeKind.Utc
        && metadata.ContractVersion == LabOperationsContractVersions.V1;

    private static bool HasValue(string value) => !string.IsNullOrWhiteSpace(value);

    private static LabAuthorizationSource MapSource(LabWorkAuthorizationSource source) =>
        source switch
        {
            LabWorkAuthorizationSource.CommercialOrder => LabAuthorizationSource.CommercialOrder,
            LabWorkAuthorizationSource.TrialProject => LabAuthorizationSource.TrialProject,
            _ => throw new ArgumentOutOfRangeException(nameof(source))
        };

    private static LabWorkMilestone MapMilestone(LabWorkOrderStatus status) =>
        status switch
        {
            LabWorkOrderStatus.AwaitingSpecimens => LabWorkMilestone.AwaitingSpecimens,
            LabWorkOrderStatus.OnHold => LabWorkMilestone.OnHold,
            LabWorkOrderStatus.Processing => LabWorkMilestone.Processing,
            LabWorkOrderStatus.ScientificReview => LabWorkMilestone.ScientificReview,
            LabWorkOrderStatus.ReadyForRelease => LabWorkMilestone.ReadyForRelease,
            LabWorkOrderStatus.Cancelled => LabWorkMilestone.Cancelled,
            _ => throw new ArgumentOutOfRangeException(nameof(status))
        };

    private static LabScheduleHealth MapScheduleHealth(LabWorkOrderStatus status) =>
        status switch
        {
            LabWorkOrderStatus.OnHold => LabScheduleHealth.AtRisk,
            LabWorkOrderStatus.ReadyForRelease or LabWorkOrderStatus.Cancelled => LabScheduleHealth.Complete,
            _ => LabScheduleHealth.OnTrack
        };

    private static LabCommandAcknowledgment RejectedAcknowledgment(
        LabOperationsCommandMetadata metadata,
        string reasonCode,
        DateTime acknowledgedAtUtc) =>
        new(
            metadata.CommandId,
            metadata.CorrelationId,
            LabCommandDisposition.Rejected,
            LabWorkOrderId: null,
            AppliedAuthorizationVersion: null,
            reasonCode,
            acknowledgedAtUtc);

    private static LabCommandAcknowledgment ManualReviewAcknowledgment(
        LabOperationsCommandMetadata metadata,
        LabWorkOrder workOrder,
        DateTime acknowledgedAtUtc) =>
        new(
            metadata.CommandId,
            metadata.CorrelationId,
            LabCommandDisposition.ManualReviewRequired,
            workOrder.Id,
            workOrder.CurrentAuthorizationVersion,
            LabCommandReasonCodes.WorkAlreadyStarted,
            acknowledgedAtUtc);

    private static LabCancellationOutcome RejectedCancellation(
        LabOperationsCommandMetadata metadata,
        string reasonCode,
        DateTime acknowledgedAtUtc) =>
        new(
            metadata.CommandId,
            metadata.CorrelationId,
            LabCancellationDisposition.Rejected,
            LabWorkOrderId: null,
            AffectedSubmittedSpecimenIds: [],
            reasonCode,
            acknowledgedAtUtc);

    private static JsonSerializerOptions CreateSerializerOptions()
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        options.Converters.Add(new JsonStringEnumConverter(allowIntegerValues: false));
        return options;
    }
}
