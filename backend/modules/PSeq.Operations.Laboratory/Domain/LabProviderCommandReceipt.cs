namespace PSeq.Operations.Laboratory.Domain;

public enum LabProviderCommandType
{
    AuthorizeWork,
    AmendAuthorization,
    RequestCancellation
}

public sealed class LabProviderCommandReceipt
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CommandId { get; private set; }
    public Guid CorrelationId { get; private set; }
    public Guid AuthorizationId { get; private set; }
    public LabProviderCommandType CommandType { get; private set; }
    public string PayloadSha256 { get; private set; } = null!;
    public string Disposition { get; private set; } = null!;
    public Guid? LabWorkOrderId { get; private set; }
    public int? AppliedAuthorizationVersion { get; private set; }
    public string? ReasonCode { get; private set; }
    public string OutcomeJson { get; private set; } = null!;
    public DateTime AcknowledgedAtUtc { get; private set; }

    private LabProviderCommandReceipt()
    {
    }

    public LabProviderCommandReceipt(
        Guid commandId,
        Guid correlationId,
        Guid authorizationId,
        LabProviderCommandType commandType,
        string payloadSha256,
        string disposition,
        Guid? labWorkOrderId,
        int? appliedAuthorizationVersion,
        string? reasonCode,
        string outcomeJson,
        DateTime acknowledgedAtUtc)
    {
        if (commandId == Guid.Empty || correlationId == Guid.Empty || authorizationId == Guid.Empty)
        {
            throw new ArgumentException("Command, correlation, and authorization identifiers must be non-empty.");
        }

        if (payloadSha256.Length != 64 || payloadSha256.Any(character => !Uri.IsHexDigit(character)))
        {
            throw new ArgumentException("Payload SHA-256 must be a 64-character hexadecimal value.", nameof(payloadSha256));
        }

        if (string.IsNullOrWhiteSpace(disposition) || string.IsNullOrWhiteSpace(outcomeJson))
        {
            throw new ArgumentException("Disposition and serialized outcome are required.");
        }

        if (acknowledgedAtUtc.Kind != DateTimeKind.Utc)
        {
            throw new ArgumentException("Acknowledgment time must be UTC.", nameof(acknowledgedAtUtc));
        }

        CommandId = commandId;
        CorrelationId = correlationId;
        AuthorizationId = authorizationId;
        CommandType = commandType;
        PayloadSha256 = payloadSha256.ToLowerInvariant();
        Disposition = disposition;
        LabWorkOrderId = labWorkOrderId;
        AppliedAuthorizationVersion = appliedAuthorizationVersion;
        ReasonCode = string.IsNullOrWhiteSpace(reasonCode) ? null : reasonCode.Trim();
        OutcomeJson = outcomeJson;
        AcknowledgedAtUtc = acknowledgedAtUtc;
    }

    public bool Matches(LabProviderCommandType commandType, string payloadSha256) =>
        CommandType == commandType
        && string.Equals(PayloadSha256, payloadSha256, StringComparison.OrdinalIgnoreCase);
}
