namespace PSeq.Operations.Laboratory.Domain;

using System.ComponentModel.DataAnnotations.Schema;
using PSeq.Operations.Laboratory.Common.Persistence;

[NotMapped]
public abstract class LabAuditedEntity : IAudit, IConcurrency
{
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    internal static string Required(string value, string parameterName, int maximumLength = 4000)
    {
        var normalized = string.IsNullOrWhiteSpace(value)
            ? throw new ArgumentException("A value is required.", parameterName)
            : value.Trim();
        return normalized.Length <= maximumLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", parameterName);
    }

    internal static string? Optional(string? value, int maximumLength = 4000)
    {
        var normalized = string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        return normalized?.Length <= maximumLength
            ? normalized
            : throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", nameof(value));
    }
}

public enum LabRole
{
    Operator,
    Supervisor,
    ProtocolAdministrator,
    ScientificReviewer,
    OperationsAdministrator
}

public sealed class LabRoleAssignment : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public LabRole Role { get; private set; }
    public bool IsActive { get; private set; } = true;

    private LabRoleAssignment() { }

    public LabRoleAssignment(Guid userId, LabRole role)
    {
        UserId = userId != Guid.Empty ? userId : throw new ArgumentException("A user is required.", nameof(userId));
        Role = role;
    }

    public void SetActive(bool isActive) => IsActive = isActive;
}

public enum LabContainerKind
{
    SubmittedSpecimen,
    Aliquot,
    PreparedReagent,
    Library,
    Other
}

public enum LabContainerStatus
{
    Available,
    Consumed,
    Failed,
    Disposed
}

public sealed class LabContainer : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid? LabSpecimenId { get; private set; }
    public Guid? ParentContainerId { get; private set; }
    public LabContainerKind Kind { get; private set; }
    public string Barcode { get; private set; } = null!;
    public string Label { get; private set; } = null!;
    public int LabelPrintCount { get; private set; }
    public DateTime? LastLabelPrintedAtUtc { get; private set; }
    public Guid? LastLabelPrintedByUserId { get; private set; }
    public string Location { get; private set; } = null!;
    public decimal? Quantity { get; private set; }
    public string? QuantityUnit { get; private set; }
    public LabContainerStatus Status { get; private set; } = LabContainerStatus.Available;
    public string? DispositionReason { get; private set; }
    public DateTime? RetainUntilUtc { get; private set; }

    private LabContainer() { }

    public LabContainer(Guid labWorkOrderId, Guid? labSpecimenId, Guid? parentContainerId,
        LabContainerKind kind, string barcode, string label, string location,
        decimal? quantity, string? quantityUnit, DateTime? retainUntilUtc)
    {
        LabWorkOrderId = labWorkOrderId != Guid.Empty
            ? labWorkOrderId
            : throw new ArgumentException("A work order is required.", nameof(labWorkOrderId));
        LabSpecimenId = labSpecimenId;
        ParentContainerId = parentContainerId;
        Kind = kind;
        Barcode = Required(barcode, nameof(barcode), 100);
        Label = Required(label, nameof(label), 255);
        Location = Required(location, nameof(location), 255);
        if (quantity is <= 0) throw new ArgumentOutOfRangeException(nameof(quantity));
        Quantity = quantity;
        QuantityUnit = quantity.HasValue ? Required(quantityUnit!, nameof(quantityUnit), 50) : Optional(quantityUnit, 50);
        RetainUntilUtc = retainUntilUtc;
    }

    public void RecordLabelPrint(Guid actorUserId, DateTime printedAtUtc)
    {
        LabelPrintCount++;
        LastLabelPrintedAtUtc = printedAtUtc;
        LastLabelPrintedByUserId = actorUserId;
    }

    public void Move(string location) => Location = Required(location, nameof(location), 255);

    public void Dispose(string reason)
    {
        if (Status == LabContainerStatus.Disposed) throw new InvalidOperationException("The container is already disposed.");
        Status = LabContainerStatus.Disposed;
        DispositionReason = Required(reason, nameof(reason), 1000);
    }
}

public enum LabProtocolStatus
{
    Draft,
    Approved,
    Active,
    Retired
}

public sealed class LabProtocol : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Key { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string? Description { get; private set; }
    public int LatestVersion { get; private set; }

    private LabProtocol() { }

    public LabProtocol(string key, string name, string? description)
    {
        Key = Required(key, nameof(key), 100);
        Name = Required(name, nameof(name), 255);
        Description = Optional(description, 2000);
    }

    public void RecordVersion(int version)
    {
        if (version != LatestVersion + 1) throw new InvalidOperationException("Protocol versions must be sequential.");
        LatestVersion = version;
    }
}

public sealed class LabProtocolVersion
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabProtocolId { get; private set; }
    public int ProtocolVersion { get; private set; }
    public LabProtocolStatus Status { get; private set; } = LabProtocolStatus.Draft;
    public string DefinitionJson { get; private set; } = null!;
    public Guid AuthoredByUserId { get; private set; }
    public DateTime AuthoredAtUtc { get; private set; }
    public Guid? ApprovedByUserId { get; private set; }
    public DateTime? ApprovedAtUtc { get; private set; }

    private LabProtocolVersion() { }

    public LabProtocolVersion(Guid labProtocolId, int protocolVersion, string definitionJson,
        Guid authoredByUserId, DateTime authoredAtUtc)
    {
        LabProtocolId = labProtocolId != Guid.Empty ? labProtocolId : throw new ArgumentException("A protocol is required.");
        ProtocolVersion = protocolVersion > 0 ? protocolVersion : throw new ArgumentOutOfRangeException(nameof(protocolVersion));
        DefinitionJson = RequiredDefinition(definitionJson);
        AuthoredByUserId = authoredByUserId != Guid.Empty ? authoredByUserId : throw new ArgumentException("An author is required.");
        AuthoredAtUtc = authoredAtUtc;
    }

    public void Approve(Guid actorUserId, DateTime utcNow)
    {
        if (Status != LabProtocolStatus.Draft) throw new InvalidOperationException("Only a draft protocol can be approved.");
        Status = LabProtocolStatus.Approved;
        ApprovedByUserId = actorUserId;
        ApprovedAtUtc = utcNow;
    }

    public void Activate()
    {
        if (Status != LabProtocolStatus.Approved) throw new InvalidOperationException("Only an approved protocol can be activated.");
        Status = LabProtocolStatus.Active;
    }

    public void Retire()
    {
        if (Status is not (LabProtocolStatus.Approved or LabProtocolStatus.Active))
            throw new InvalidOperationException("Only an approved or active protocol can be retired.");
        Status = LabProtocolStatus.Retired;
    }

    private static string RequiredDefinition(string value) =>
        string.IsNullOrWhiteSpace(value) ? throw new ArgumentException("A protocol definition is required.") : value;
}

public enum LabExecutionStatus
{
    Planned,
    InProgress,
    Blocked,
    Completed,
    Abandoned
}

public sealed class LabProtocolExecution : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid? LabSpecimenId { get; private set; }
    public Guid LabProtocolVersionId { get; private set; }
    public Guid? AssignedToUserId { get; private set; }
    public LabExecutionStatus Status { get; private set; } = LabExecutionStatus.Planned;
    public string CapturedResultsJson { get; private set; } = "{}";
    public string? DeviationNote { get; private set; }
    public DateTime? StartedAtUtc { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }

    private LabProtocolExecution() { }

    public LabProtocolExecution(Guid labWorkOrderId, Guid? labSpecimenId,
        Guid labProtocolVersionId, Guid? assignedToUserId)
    {
        LabWorkOrderId = labWorkOrderId != Guid.Empty ? labWorkOrderId : throw new ArgumentException("A work order is required.");
        LabSpecimenId = labSpecimenId;
        LabProtocolVersionId = labProtocolVersionId != Guid.Empty ? labProtocolVersionId : throw new ArgumentException("A protocol version is required.");
        AssignedToUserId = assignedToUserId;
    }

    public void Start(DateTime utcNow)
    {
        if (Status != LabExecutionStatus.Planned) throw new InvalidOperationException("Only planned work can start.");
        Status = LabExecutionStatus.InProgress;
        StartedAtUtc = utcNow;
    }

    public void Complete(string capturedResultsJson, string? deviationNote, DateTime utcNow)
    {
        if (Status is not (LabExecutionStatus.InProgress or LabExecutionStatus.Blocked))
            throw new InvalidOperationException("Only started work can complete.");
        CapturedResultsJson = string.IsNullOrWhiteSpace(capturedResultsJson) ? "{}" : capturedResultsJson;
        DeviationNote = Optional(deviationNote, 4000);
        Status = LabExecutionStatus.Completed;
        CompletedAtUtc = utcNow;
    }
}

public enum LabMaterialLotKind
{
    SupplierLot,
    PreparedReagent
}

public enum LabQcDisposition
{
    Pending,
    Passed,
    Failed,
    ApprovedException
}

public sealed class LabMaterialLot : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public LabMaterialLotKind Kind { get; private set; }
    public string MaterialKey { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string LotNumber { get; private set; } = null!;
    public string? Supplier { get; private set; }
    public string? ComponentsJson { get; private set; }
    public DateTime? ExpiresAtUtc { get; private set; }
    public string StorageLocation { get; private set; } = null!;
    public decimal AvailableQuantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public LabQcDisposition QcDisposition { get; private set; } = LabQcDisposition.Pending;
    public string? QcResultsJson { get; private set; }
    public Guid? QcApprovedByUserId { get; private set; }
    public DateTime? QcApprovedAtUtc { get; private set; }

    private LabMaterialLot() { }

    public LabMaterialLot(LabMaterialLotKind kind, string materialKey, string name,
        string lotNumber, string? supplier, string? componentsJson, DateTime? expiresAtUtc,
        string storageLocation, decimal availableQuantity, string quantityUnit)
    {
        if (availableQuantity < 0) throw new ArgumentOutOfRangeException(nameof(availableQuantity));
        Kind = kind;
        MaterialKey = Required(materialKey, nameof(materialKey), 100);
        Name = Required(name, nameof(name), 255);
        LotNumber = Required(lotNumber, nameof(lotNumber), 100);
        Supplier = Optional(supplier, 255);
        ComponentsJson = string.IsNullOrWhiteSpace(componentsJson) ? null : componentsJson;
        ExpiresAtUtc = expiresAtUtc;
        StorageLocation = Required(storageLocation, nameof(storageLocation), 255);
        AvailableQuantity = availableQuantity;
        QuantityUnit = Required(quantityUnit, nameof(quantityUnit), 50);
    }

    public void RecordQc(LabQcDisposition disposition, string resultsJson, Guid actorUserId, DateTime utcNow)
    {
        if (disposition == LabQcDisposition.Pending) throw new ArgumentOutOfRangeException(nameof(disposition));
        QcDisposition = disposition;
        QcResultsJson = string.IsNullOrWhiteSpace(resultsJson) ? "{}" : resultsJson;
        QcApprovedByUserId = actorUserId;
        QcApprovedAtUtc = utcNow;
    }

    public void Consume(decimal quantity)
    {
        if (quantity <= 0 || quantity > AvailableQuantity) throw new InvalidOperationException("The requested quantity is not available.");
        AvailableQuantity -= quantity;
    }
}

public sealed class LabMaterialConsumption
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabProtocolExecutionId { get; private set; }
    public Guid LabMaterialLotId { get; private set; }
    public Guid? OutputContainerId { get; private set; }
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public Guid RecordedByUserId { get; private set; }
    public DateTime RecordedAtUtc { get; private set; }

    private LabMaterialConsumption() { }

    public LabMaterialConsumption(Guid executionId, Guid lotId, Guid? outputContainerId,
        decimal quantity, string quantityUnit, Guid actorUserId, DateTime utcNow)
    {
        if (executionId == Guid.Empty || lotId == Guid.Empty || actorUserId == Guid.Empty || quantity <= 0)
            throw new ArgumentException("Execution, lot, actor, and positive quantity are required.");
        LabProtocolExecutionId = executionId;
        LabMaterialLotId = lotId;
        OutputContainerId = outputContainerId;
        Quantity = quantity;
        QuantityUnit = string.IsNullOrWhiteSpace(quantityUnit) ? throw new ArgumentException("A unit is required.") : quantityUnit.Trim();
        RecordedByUserId = actorUserId;
        RecordedAtUtc = utcNow;
    }
}

public enum LabEquipmentStatus
{
    Active,
    OutOfService,
    Retired
}

public sealed class LabEquipment : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string AssetCode { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public string EquipmentType { get; private set; } = null!;
    public string Location { get; private set; } = null!;
    public LabEquipmentStatus Status { get; private set; } = LabEquipmentStatus.Active;
    public DateTime? LastCalibrationAtUtc { get; private set; }
    public DateTime? CalibrationDueAtUtc { get; private set; }

    private LabEquipment() { }

    public LabEquipment(string assetCode, string name, string equipmentType, string location,
        DateTime? lastCalibrationAtUtc, DateTime? calibrationDueAtUtc)
    {
        AssetCode = Required(assetCode, nameof(assetCode), 100);
        Name = Required(name, nameof(name), 255);
        EquipmentType = Required(equipmentType, nameof(equipmentType), 100);
        Location = Required(location, nameof(location), 255);
        LastCalibrationAtUtc = lastCalibrationAtUtc;
        CalibrationDueAtUtc = calibrationDueAtUtc;
    }
}

public sealed class LabEquipmentUsage
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabProtocolExecutionId { get; private set; }
    public Guid LabEquipmentId { get; private set; }
    public DateTime UsedAtUtc { get; private set; }
    public Guid UsedByUserId { get; private set; }
    public string? RunReference { get; private set; }

    private LabEquipmentUsage() { }

    public LabEquipmentUsage(Guid executionId, Guid equipmentId, DateTime usedAtUtc,
        Guid usedByUserId, string? runReference)
    {
        if (executionId == Guid.Empty || equipmentId == Guid.Empty || usedByUserId == Guid.Empty)
            throw new ArgumentException("Execution, equipment, and user are required.");
        LabProtocolExecutionId = executionId;
        LabEquipmentId = equipmentId;
        UsedAtUtc = usedAtUtc;
        UsedByUserId = usedByUserId;
        RunReference = LabAuditedEntity.Optional(runReference, 255);
    }
}

public enum LabLibraryStatus
{
    Prepared,
    QcPassed,
    Batched,
    SentForSequencing,
    Complete,
    Failed
}

public sealed class LabLibrary : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid SourceContainerId { get; private set; }
    public Guid LibraryContainerId { get; private set; }
    public Guid PreparationExecutionId { get; private set; }
    public string LibraryKey { get; private set; } = null!;
    public LabLibraryStatus Status { get; private set; } = LabLibraryStatus.Prepared;
    public string? QcResultsJson { get; private set; }

    private LabLibrary() { }

    public LabLibrary(Guid workOrderId, Guid specimenId, Guid sourceContainerId,
        Guid libraryContainerId, Guid preparationExecutionId, string libraryKey)
    {
        if (new[] { workOrderId, specimenId, sourceContainerId, libraryContainerId, preparationExecutionId }.Any(id => id == Guid.Empty))
            throw new ArgumentException("Library lineage identifiers are required.");
        LabWorkOrderId = workOrderId;
        LabSpecimenId = specimenId;
        SourceContainerId = sourceContainerId;
        LibraryContainerId = libraryContainerId;
        PreparationExecutionId = preparationExecutionId;
        LibraryKey = Required(libraryKey, nameof(libraryKey), 100);
    }

    public void RecordQc(bool passed, string resultsJson)
    {
        QcResultsJson = string.IsNullOrWhiteSpace(resultsJson) ? "{}" : resultsJson;
        Status = passed ? LabLibraryStatus.QcPassed : LabLibraryStatus.Failed;
    }

    public void SetStatus(LabLibraryStatus status) => Status = status;
}

public enum LabBatchStatus
{
    Draft,
    InProgress,
    Complete,
    Cancelled
}

public sealed class LabOperationalBatch : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string BatchNumber { get; private set; } = null!;
    public string BatchType { get; private set; } = null!;
    public LabBatchStatus Status { get; private set; } = LabBatchStatus.Draft;
    public string? Notes { get; private set; }

    private LabOperationalBatch() { }

    public LabOperationalBatch(string batchNumber, string batchType, string? notes)
    {
        BatchNumber = Required(batchNumber, nameof(batchNumber), 100);
        BatchType = Required(batchType, nameof(batchType), 100);
        Notes = Optional(notes, 4000);
    }

    public void Start()
    {
        if (Status != LabBatchStatus.Draft) throw new InvalidOperationException("Only a draft batch can start.");
        Status = LabBatchStatus.InProgress;
    }

    public void Complete()
    {
        if (Status != LabBatchStatus.InProgress) throw new InvalidOperationException("Only an active batch can complete.");
        Status = LabBatchStatus.Complete;
    }
}

public sealed class LabBatchMember
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabOperationalBatchId { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabLibraryId { get; private set; }
    public DateTime AddedAtUtc { get; private set; }

    private LabBatchMember() { }

    public LabBatchMember(Guid batchId, Guid workOrderId, Guid libraryId, DateTime addedAtUtc)
    {
        if (batchId == Guid.Empty || workOrderId == Guid.Empty || libraryId == Guid.Empty)
            throw new ArgumentException("Batch, work order, and library are required.");
        LabOperationalBatchId = batchId;
        LabWorkOrderId = workOrderId;
        LabLibraryId = libraryId;
        AddedAtUtc = addedAtUtc;
    }
}

public enum LabNgsSendoutStatus
{
    Preparing,
    Shipped,
    ReceivedByProvider,
    Sequencing,
    Complete,
    Exception
}

public sealed class LabNgsSendout : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabOperationalBatchId { get; private set; }
    public string ProviderName { get; private set; } = null!;
    public string? ProviderReference { get; private set; }
    public string ManifestJson { get; private set; } = "{}";
    public LabNgsSendoutStatus Status { get; private set; } = LabNgsSendoutStatus.Preparing;
    public DateTime? ShippedAtUtc { get; private set; }
    public DateTime? ProviderReceivedAtUtc { get; private set; }
    public DateTime? ExpectedCompletionAtUtc { get; private set; }

    private LabNgsSendout() { }

    public LabNgsSendout(Guid batchId, string providerName, string? providerReference,
        string manifestJson, DateTime? expectedCompletionAtUtc)
    {
        LabOperationalBatchId = batchId != Guid.Empty ? batchId : throw new ArgumentException("A batch is required.");
        ProviderName = Required(providerName, nameof(providerName), 255);
        ProviderReference = Optional(providerReference, 255);
        ManifestJson = string.IsNullOrWhiteSpace(manifestJson) ? "{}" : manifestJson;
        ExpectedCompletionAtUtc = expectedCompletionAtUtc;
    }

    public void SetStatus(LabNgsSendoutStatus status, DateTime utcNow)
    {
        Status = status;
        if (status == LabNgsSendoutStatus.Shipped) ShippedAtUtc ??= utcNow;
        if (status == LabNgsSendoutStatus.ReceivedByProvider) ProviderReceivedAtUtc ??= utcNow;
    }
}

public sealed class LabCustodyEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabNgsSendoutId { get; private set; }
    public Guid? LabContainerId { get; private set; }
    public string EventCode { get; private set; } = null!;
    public string LocationOrParty { get; private set; } = null!;
    public string DetailsJson { get; private set; } = "{}";
    public Guid RecordedByUserId { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }

    private LabCustodyEvent() { }

    public LabCustodyEvent(Guid sendoutId, Guid? containerId, string eventCode,
        string locationOrParty, string detailsJson, Guid actorUserId, DateTime utcNow)
    {
        if (sendoutId == Guid.Empty || actorUserId == Guid.Empty) throw new ArgumentException("Sendout and actor are required.");
        LabNgsSendoutId = sendoutId;
        LabContainerId = containerId;
        EventCode = LabAuditedEntity.Required(eventCode, nameof(eventCode), 100);
        LocationOrParty = LabAuditedEntity.Required(locationOrParty, nameof(locationOrParty), 255);
        DetailsJson = string.IsNullOrWhiteSpace(detailsJson) ? "{}" : detailsJson;
        RecordedByUserId = actorUserId;
        OccurredAtUtc = utcNow;
    }
}

public enum LabExceptionAudience
{
    Internal,
    CustomerActionRequired
}

public enum LabExceptionStatus
{
    Open,
    Resolved
}

public sealed class LabException : LabAuditedEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid? LabSpecimenId { get; private set; }
    public Guid? LabProtocolExecutionId { get; private set; }
    public LabExceptionAudience Audience { get; private set; }
    public string CategoryCode { get; private set; } = null!;
    public string Title { get; private set; } = null!;
    public string InternalDescription { get; private set; } = null!;
    public string? CustomerSafeSummary { get; private set; }
    public bool IsBlocking { get; private set; }
    public LabExceptionStatus Status { get; private set; } = LabExceptionStatus.Open;
    public DateTime? ResponseDueAtUtc { get; private set; }
    public DateTime? ResolvedAtUtc { get; private set; }
    public Guid? ResolvedByUserId { get; private set; }
    public string? ResolutionNote { get; private set; }

    private LabException() { }

    public LabException(Guid workOrderId, Guid? specimenId, Guid? executionId,
        LabExceptionAudience audience, string categoryCode, string title,
        string internalDescription, string? customerSafeSummary, bool isBlocking,
        DateTime? responseDueAtUtc)
    {
        LabWorkOrderId = workOrderId != Guid.Empty ? workOrderId : throw new ArgumentException("A work order is required.");
        LabSpecimenId = specimenId;
        LabProtocolExecutionId = executionId;
        Audience = audience;
        CategoryCode = Required(categoryCode, nameof(categoryCode), 100);
        Title = Required(title, nameof(title), 255);
        InternalDescription = Required(internalDescription, nameof(internalDescription), 4000);
        CustomerSafeSummary = audience == LabExceptionAudience.CustomerActionRequired
            ? Required(customerSafeSummary!, nameof(customerSafeSummary), 2000)
            : Optional(customerSafeSummary, 2000);
        IsBlocking = isBlocking;
        ResponseDueAtUtc = responseDueAtUtc;
    }

    public void Resolve(Guid actorUserId, DateTime utcNow, string resolutionNote)
    {
        if (Status == LabExceptionStatus.Resolved) throw new InvalidOperationException("The exception is already resolved.");
        Status = LabExceptionStatus.Resolved;
        ResolvedAtUtc = utcNow;
        ResolvedByUserId = actorUserId;
        ResolutionNote = Required(resolutionNote, nameof(resolutionNote), 4000);
    }
}

public sealed class LabOperationsOutboxEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CorrelationId { get; private set; }
    public Guid AuthorizationId { get; private set; }
    public Guid LabWorkOrderId { get; private set; }
    public long ProjectionVersion { get; private set; }
    public string EventType { get; private set; } = null!;
    public string PayloadJson { get; private set; } = null!;
    public DateTime OccurredAtUtc { get; private set; }
    public DateTime? PublishedAtUtc { get; private set; }
    public int AttemptCount { get; private set; }
    public string? LastError { get; private set; }

    private LabOperationsOutboxEvent() { }

    public LabOperationsOutboxEvent(Guid correlationId, Guid authorizationId,
        Guid workOrderId, long projectionVersion, string eventType,
        string payloadJson, DateTime occurredAtUtc)
    {
        if (correlationId == Guid.Empty || authorizationId == Guid.Empty || workOrderId == Guid.Empty || projectionVersion < 1)
            throw new ArgumentException("Event identity and projection version are required.");
        CorrelationId = correlationId;
        AuthorizationId = authorizationId;
        LabWorkOrderId = workOrderId;
        ProjectionVersion = projectionVersion;
        EventType = LabAuditedEntity.Required(eventType, nameof(eventType), 100);
        PayloadJson = string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson;
        OccurredAtUtc = occurredAtUtc;
    }

    public void MarkPublished(DateTime utcNow)
    {
        AttemptCount++;
        PublishedAtUtc = utcNow;
        LastError = null;
    }

    public void MarkFailed(string error)
    {
        AttemptCount++;
        LastError = LabAuditedEntity.Optional(error, 4000);
    }
}
