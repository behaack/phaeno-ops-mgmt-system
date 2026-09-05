namespace PhaenoPortal.App.Features.Accounts.Services;

public sealed class PSeqOrderToCashOptions
{
    public const string SectionName = "PSeqOrderToCash";

    public bool InvitationDelivery { get; init; }
    public bool DerivedReadiness { get; init; }
    public bool BusinessRoles { get; init; }
    public bool GovernedPSeqResults { get; init; }
    public bool GovernedRetentionProcessing { get; init; }
    public bool NativePSeqAccountsReceivable { get; init; }
    public bool AttentionOperations { get; init; }
    public bool DualControlAuditOnly { get; init; } = true;
    public bool DualControlEnforced { get; init; }
    public string PipelineServiceSecretHeaderName { get; init; } = "X-Phaeno-Pipeline-Secret";
    public string PipelineServiceSecret { get; init; } = string.Empty;
    public string PipelineProviderKey { get; init; } = string.Empty;
    public string ObjectStorageTransferBaseUrl { get; init; } = string.Empty;
    // Legacy configuration retained for compatibility. New releases use the versioned File Management policy.
    public int ResultRetentionWarningDays { get; init; }
    public int ResultRetentionCutoffDays { get; init; }
    public int ResultRetentionGraceDays { get; init; }
    public int ResultRetentionDeleteDays { get; init; }

    public IReadOnlyList<string> ValidateGovernedResults()
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(PipelineServiceSecretHeaderName))
            errors.Add("A pipeline service secret header name is required.");
        if (PipelineServiceSecret.Trim().Length < 24)
            errors.Add("The pipeline service secret must contain at least 24 characters.");
        if (string.IsNullOrWhiteSpace(PipelineProviderKey))
            errors.Add("A pipeline provider key is required.");
        if (!Uri.TryCreate(ObjectStorageTransferBaseUrl, UriKind.Absolute, out var transferUri)
            || transferUri.Scheme != Uri.UriSchemeHttps)
            errors.Add("The object-storage transfer base URL must be an absolute HTTPS URL.");
        return errors;
    }
}
