namespace PSeq.Operations.Commercial.Trials.Domain;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class TrialApprovalAuthority : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public TrialApprovalDomain Domain { get; private set; }
    public bool IsPrimary { get; private set; }
    public Guid? PrimaryAuthorityId { get; private set; }
    public Guid DesignatedByUserId { get; private set; }
    public DateTime EffectiveAtUtc { get; private set; }
    public string Reason { get; private set; } = null!;
    public DateTime? RevokedAtUtc { get; private set; }
    public Guid? RevokedByUserId { get; private set; }
    public string? RevocationReason { get; private set; }
    private TrialApprovalAuthority() { }
    public TrialApprovalAuthority(Guid userId, TrialApprovalDomain domain, bool primary, Guid? primaryAuthorityId, Guid actorId, string reason, DateTime now)
    {
        if (userId == Guid.Empty || actorId == Guid.Empty || !Enum.IsDefined(domain) || primary == primaryAuthorityId.HasValue)
            throw new ArgumentException("Select an eligible Phaeno user and the correct primary or delegated authority.");
        TrialRules.Utc(now); UserId = userId; Domain = domain; IsPrimary = primary; PrimaryAuthorityId = primaryAuthorityId;
        DesignatedByUserId = actorId; Reason = TrialRules.Text(reason); EffectiveAtUtc = now;
    }
    public void Revoke(Guid actorId, string reason, DateTime now)
    {
        if (RevokedAtUtc.HasValue) throw new InvalidOperationException("This authority is already revoked.");
        TrialRules.Utc(now); RevokedAtUtc = now; RevokedByUserId = actorId; RevocationReason = TrialRules.Text(reason);
    }
}

public sealed class TrialDeliverableDefinition : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Key { get; private set; } = null!;
    public string Name { get; private set; } = null!;
    public int Revision { get; private set; }
    public bool IsActive { get; private set; }
    public bool IsDefault { get; private set; }
    private TrialDeliverableDefinition() { }
    public TrialDeliverableDefinition(string key, string name, int revision, bool isDefault)
    { Key = TrialRules.SampleReference(key).ToUpperInvariant(); Name = TrialRules.Text(name, 255);
        if (revision < 1) throw new ArgumentException("A positive revision is required."); Revision = revision; IsActive = true; IsDefault = isDefault; }
    public void Retire() { IsActive = false; IsDefault = false; }
}

public sealed class TrialSample : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TrialProjectId { get; private set; }
    public int ScopeRevision { get; private set; }
    public string Reference { get; private set; } = null!;
    public string BiologicalSource { get; private set; } = null!;
    public int TubeCount { get; private set; }
    public decimal Quantity { get; private set; }
    public string QuantityUnit { get; private set; } = null!;
    public decimal? Concentration { get; private set; }
    public string StorageRequirements { get; private set; } = null!;
    public string SafetyDeclaration { get; private set; } = null!;
    public string InputsJson { get; private set; } = "{}";
    public Guid? ReplacesSampleId { get; private set; }
    public Guid? ReplacementAuthorizationId { get; private set; }
    public Guid AuthorizationId { get; private set; } = Guid.NewGuid();
    public Guid? LabWorkOrderId { get; private set; }
    public DateTime SubmittedAtUtc { get; private set; }
    public Guid SubmittedByUserId { get; private set; }
    public string Status { get; private set; } = "Submitted";
    public string? OutcomeReason { get; private set; }
    public bool HasSuccessfulResult => Status == "ResultsReleased";
    private TrialSample() { }
    public TrialSample(Guid trialId, int scopeRevision, string reference, string biologicalSource, int tubeCount,
        decimal quantity, string quantityUnit, decimal? concentration, string storage, string safety, string inputsJson,
        Guid? replacesSampleId, Guid? replacementAuthorizationId, Guid actorId, DateTime now)
    {
        if (trialId == Guid.Empty || scopeRevision < 1 || actorId == Guid.Empty || tubeCount < 1 || quantity <= 0 || concentration < 0
            || replacesSampleId.HasValue != replacementAuthorizationId.HasValue)
            throw new ArgumentException("Provide valid sample metadata and an explicit authorization for any replacement.");
        TrialRules.Utc(now); TrialProjectId = trialId; ScopeRevision = scopeRevision; Reference = TrialRules.SampleReference(reference);
        BiologicalSource = TrialRules.Text(biologicalSource, 500); TubeCount = tubeCount; Quantity = quantity;
        QuantityUnit = TrialRules.Text(quantityUnit, 50); Concentration = concentration;
        StorageRequirements = TrialRules.Text(storage, 2000); SafetyDeclaration = TrialRules.Text(safety, 2000);
        InputsJson = OrderText.Json(inputsJson); ReplacesSampleId = replacesSampleId; ReplacementAuthorizationId = replacementAuthorizationId;
        SubmittedAtUtc = now; SubmittedByUserId = actorId;
    }
    public void Authorize(Guid authorizationId, Guid workOrderId)
    { if (LabWorkOrderId.HasValue || workOrderId == Guid.Empty || authorizationId == Guid.Empty) throw new InvalidOperationException("Sample work authorization is immutable."); AuthorizationId = authorizationId; LabWorkOrderId = workOrderId; }
    public void RecordFailure(string reason)
    { if (HasSuccessfulResult) throw new InvalidOperationException("Withdraw released results through their release record."); Status = "Failed"; OutcomeReason = TrialRules.Text(reason); }
    public void RecordReleased()
    { if (Status == "Failed" || !LabWorkOrderId.HasValue) throw new InvalidOperationException("Only authorized, successful sample work can be released."); Status = "ResultsReleased"; }
}

public sealed class TrialReplacementAuthorization : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TrialProjectId { get; private set; }
    public Guid OriginalSampleId { get; private set; }
    public bool PhaenoCausedFailure { get; private set; }
    public string Reason { get; private set; } = null!;
    public Guid ApprovedByUserId { get; private set; }
    public DateTime ApprovedAtUtc { get; private set; }
    public Guid? UsedBySampleId { get; private set; }
    private TrialReplacementAuthorization() { }
    public TrialReplacementAuthorization(Guid trialId, Guid sampleId, bool phaenoCaused, string reason, Guid actorId, DateTime now)
    { TrialProjectId = trialId; OriginalSampleId = sampleId; PhaenoCausedFailure = phaenoCaused;
        Reason = TrialRules.Text(reason); ApprovedByUserId = actorId; TrialRules.Utc(now); ApprovedAtUtc = now; }
    public void Consume(TrialSample sample)
    {
        if (UsedBySampleId.HasValue || sample.TrialProjectId != TrialProjectId || sample.ReplacesSampleId != OriginalSampleId || sample.ReplacementAuthorizationId != Id)
            throw new InvalidOperationException("This replacement slot is unavailable for the selected sample.");
        UsedBySampleId = sample.Id;
    }
}

public sealed class TrialResultRelease : CommercialReceivableEntity
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TrialProjectId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public Guid DepartmentId { get; private set; }
    public int ReleaseVersion { get; private set; }
    public int ScopeRevision { get; private set; }
    public string ManifestJson { get; private set; } = null!;
    public bool IsCompletePackage { get; private set; }
    public Guid ReleasedByUserId { get; private set; }
    public DateTime ReleasedAtUtc { get; private set; }
    public bool IsWithdrawn { get; private set; }
    public string? WithdrawalReason { get; private set; }
    public Guid? SupersedesReleaseId { get; private set; }
    private TrialResultRelease() { }
    public TrialResultRelease(Guid trialId, Guid organizationId, Guid departmentId, int version, int scopeRevision,
        string manifestJson, bool complete, Guid actorId, DateTime now, Guid? supersedesReleaseId = null)
    {
        if (new[] { trialId, organizationId, departmentId, actorId }.Contains(Guid.Empty) || version < 1 || scopeRevision < 1)
            throw new ArgumentException("A complete Trial release identity is required.");
        TrialRules.Utc(now); TrialProjectId = trialId; OrganizationId = organizationId; DepartmentId = departmentId;
        ReleaseVersion = version; ScopeRevision = scopeRevision; ManifestJson = OrderText.Json(manifestJson);
        IsCompletePackage = complete; ReleasedByUserId = actorId; ReleasedAtUtc = now; SupersedesReleaseId = supersedesReleaseId;
    }
    public void Withdraw(string reason) { if (IsWithdrawn) throw new InvalidOperationException("The release is already withdrawn."); IsWithdrawn = true; WithdrawalReason = TrialRules.Text(reason); }
}

public sealed class TrialEvent
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TrialProjectId { get; private set; }
    public string Kind { get; private set; } = null!;
    public string Summary { get; private set; } = null!;
    public string InternalDetailsJson { get; private set; } = "{}";
    public Guid ActorUserId { get; private set; }
    public DateTime OccurredAtUtc { get; private set; }
    private TrialEvent() { }
    public TrialEvent(Guid trialId, string kind, string summary, Guid actorId, DateTime now, string detailsJson = "{}")
    { TrialProjectId = trialId; Kind = TrialRules.Text(kind, 100); Summary = TrialRules.Text(summary, 2000);
        InternalDetailsJson = OrderText.Json(detailsJson); ActorUserId = actorId; TrialRules.Utc(now); OccurredAtUtc = now; }
}

public sealed class TrialResultFile
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TrialSampleId { get; private set; }
    public Guid ResultOutputPackageId { get; private set; }
    public Guid ResultArtifactId { get; private set; }
    public Guid ManagedOperationalFileId { get; private set; }
    private TrialResultFile() { }
    public TrialResultFile(Guid sampleId, Guid packageId, Guid artifactId, Guid fileId)
    { TrialSampleId = sampleId; ResultOutputPackageId = packageId; ResultArtifactId = artifactId; ManagedOperationalFileId = fileId; }
}
