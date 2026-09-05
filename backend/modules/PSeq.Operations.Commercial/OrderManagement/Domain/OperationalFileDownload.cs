namespace PSeq.Operations.Commercial.OrderManagement.Domain;

using PSeq.Operations.Commercial.Common.Persistence;

public enum ReleasedDeliverablePackageType
{
    LabResult = 1,
    AssemblyOutput = 2,
    PSeqResult = 3
}

public enum OperationalFileDownloadScope
{
    IndividualFile = 1,
    PackageArchive = 2
}

public enum OperationalFileDownloadOutcome
{
    Started = 1,
    Succeeded = 2,
    Failed = 3,
    Cancelled = 4,
    TimedOut = 5,
    Revoked = 6
}

public sealed class OperationalFileDownload : IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TransferId { get; private set; }
    public Guid? ManagedOperationalFileId { get; private set; }
    public Guid? ResultArtifactId { get; private set; }
    public Guid FileId => ManagedOperationalFileId ?? ResultArtifactId!.Value;
    public Guid OrganizationId { get; private set; }
    public Guid UserId { get; private set; }
    public ReleasedDeliverablePackageType ReleasedPackageType { get; private set; }
    public Guid ReleasedPackageId { get; private set; }
    public OperationalFileDownloadScope Scope { get; private set; }
    public DateTime StartedAtUtc { get; private set; }
    public DateTime LeaseExpiresAtUtc { get; private set; }
    public DateTime? TerminalAtUtc { get; private set; }
    public DateTime? CompletedAtUtc { get; private set; }
    public OperationalFileDownloadOutcome Outcome { get; private set; } = OperationalFileDownloadOutcome.Started;
    public string? TerminalReasonCode { get; private set; }
    public bool CountsForReleasedPackageRetention { get; private set; }
    public string? RemoteAddress { get; private set; }
    public string? UserAgent { get; private set; }
    public long Version { get; private set; } = 1;

    private OperationalFileDownload() { }

    public OperationalFileDownload(
        Guid transferId,
        Guid managedOperationalFileId,
        Guid organizationId,
        Guid userId,
        ReleasedDeliverablePackageType releasedPackageType,
        Guid releasedPackageId,
        OperationalFileDownloadScope scope,
        DateTime startedAtUtc,
        DateTime leaseExpiresAtUtc,
        string? remoteAddress,
        string? userAgent)
        : this(transferId, managedOperationalFileId, null, organizationId, userId,
            releasedPackageType, releasedPackageId, scope, startedAtUtc, leaseExpiresAtUtc, remoteAddress, userAgent)
    { }

    public static OperationalFileDownload ForPSeqArtifact(Guid transferId, Guid artifactId,
        Guid organizationId, Guid userId, Guid packageId, DateTime startedAtUtc,
        DateTime leaseExpiresAtUtc, string? remoteAddress, string? userAgent) =>
        new(transferId, null, artifactId, organizationId, userId,
            ReleasedDeliverablePackageType.PSeqResult, packageId, OperationalFileDownloadScope.IndividualFile,
            startedAtUtc, leaseExpiresAtUtc, remoteAddress, userAgent);

    private OperationalFileDownload(Guid transferId, Guid? managedOperationalFileId, Guid? resultArtifactId,
        Guid organizationId, Guid userId, ReleasedDeliverablePackageType releasedPackageType,
        Guid releasedPackageId, OperationalFileDownloadScope scope, DateTime startedAtUtc,
        DateTime leaseExpiresAtUtc, string? remoteAddress, string? userAgent)
    {
        if ((managedOperationalFileId.HasValue == resultArtifactId.HasValue)
            || managedOperationalFileId == Guid.Empty || resultArtifactId == Guid.Empty
            || (resultArtifactId.HasValue != (releasedPackageType == ReleasedDeliverablePackageType.PSeqResult)))
            throw new ArgumentException("Exactly one file matching the package type is required.");
        if (transferId == Guid.Empty) throw new ArgumentException("A transfer is required.", nameof(transferId));
        if (managedOperationalFileId == Guid.Empty) throw new ArgumentException("A managed file is required.", nameof(managedOperationalFileId));
        if (organizationId == Guid.Empty) throw new ArgumentException("An organization is required.", nameof(organizationId));
        if (userId == Guid.Empty) throw new ArgumentException("A user is required.", nameof(userId));
        if (releasedPackageId == Guid.Empty) throw new ArgumentException("A released package is required.", nameof(releasedPackageId));
        if (!Enum.IsDefined(releasedPackageType)) throw new ArgumentOutOfRangeException(nameof(releasedPackageType));
        if (!Enum.IsDefined(scope)) throw new ArgumentOutOfRangeException(nameof(scope));
        RequireUtc(startedAtUtc, nameof(startedAtUtc));
        RequireUtc(leaseExpiresAtUtc, nameof(leaseExpiresAtUtc));
        if (leaseExpiresAtUtc <= startedAtUtc)
            throw new ArgumentException("The download lease must expire after it starts.", nameof(leaseExpiresAtUtc));

        TransferId = transferId;
        ManagedOperationalFileId = managedOperationalFileId;
        ResultArtifactId = resultArtifactId;
        OrganizationId = organizationId;
        UserId = userId;
        ReleasedPackageType = releasedPackageType;
        ReleasedPackageId = releasedPackageId;
        Scope = scope;
        StartedAtUtc = startedAtUtc;
        LeaseExpiresAtUtc = leaseExpiresAtUtc;
        RemoteAddress = OrderText.Optional(remoteAddress, 100);
        UserAgent = OrderText.Optional(userAgent, 1000);
    }

    public void Complete(
        OperationalFileDownloadOutcome outcome,
        DateTime terminalAtUtc,
        string? terminalReasonCode = null,
        bool countsForReleasedPackageRetention = false)
    {
        if (Outcome != OperationalFileDownloadOutcome.Started)
            throw new InvalidOperationException("A terminal download attempt is immutable.");
        if (outcome == OperationalFileDownloadOutcome.Started)
            throw new ArgumentException("A terminal outcome is required.", nameof(outcome));
        if (!Enum.IsDefined(outcome)) throw new ArgumentOutOfRangeException(nameof(outcome));
        RequireUtc(terminalAtUtc, nameof(terminalAtUtc));
        if (terminalAtUtc < StartedAtUtc)
            throw new ArgumentException("A download cannot finish before it starts.", nameof(terminalAtUtc));
        if (countsForReleasedPackageRetention && outcome != OperationalFileDownloadOutcome.Succeeded)
            throw new ArgumentException("Only a successful download can count for released-package retention.", nameof(countsForReleasedPackageRetention));

        Outcome = outcome;
        TerminalAtUtc = terminalAtUtc;
        CompletedAtUtc = outcome == OperationalFileDownloadOutcome.Succeeded ? terminalAtUtc : null;
        TerminalReasonCode = OrderText.Optional(terminalReasonCode, 100);
        CountsForReleasedPackageRetention = countsForReleasedPackageRetention;
    }

    public void IncrementVersion() => Version++;

    private static void RequireUtc(DateTime value, string parameterName)
    {
        if (value.Kind != DateTimeKind.Utc)
            throw new ArgumentException("Download timestamps must use UTC.", parameterName);
    }
}
