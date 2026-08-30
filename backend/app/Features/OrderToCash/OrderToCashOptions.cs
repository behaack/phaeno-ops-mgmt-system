namespace PhaenoPortal.App.Features.OrderToCash;

using PSeq.Operations.Commercial.OrderToCash.Domain;

public sealed class OrderToCashOptions
{
    public const string SectionName = "OrderToCash";
    public OrderToCashFeatureFlags Features { get; init; } = new();
    public InvitationDeliveryOptions InvitationDelivery { get; init; } = new();
    public PipelineRegistrationOptions PipelineRegistration { get; init; } = new();
    public ResultDeliveryOptions ResultDelivery { get; init; } = new();
    public DualControlMode DualControlMode { get; init; } = DualControlMode.AuditOnly;
    public bool DualControlStaffingValidated { get; init; }

    public bool IsValid()
    {
        if (Features.InvitationDelivery && !InvitationDelivery.IsValid) return false;
        if (Features.GovernedPSeqResults && string.IsNullOrWhiteSpace(PipelineRegistration.ApiKey)) return false;
        if (!ResultDelivery.IsValid) return false;
        if (DualControlMode == DualControlMode.Enforced && !DualControlStaffingValidated) return false;
        return true;
    }
}

public sealed class ResultDeliveryOptions
{
    public int LifecyclePollSeconds { get; init; } = 300;
    public int RetentionWarningDays { get; init; } = 330;
    public int RetentionCutoffDays { get; init; } = 365;
    public int RetentionGraceDays { get; init; } = 30;

    public bool IsValid => LifecyclePollSeconds is >= 5 and <= 86_400
        && RetentionWarningDays >= 1
        && RetentionCutoffDays > RetentionWarningDays
        && RetentionGraceDays >= 1;
}

public sealed class OrderToCashFeatureFlags
{
    public bool InvitationDelivery { get; init; }
    public bool DerivedReadiness { get; init; }
    public bool BusinessRoles { get; init; }
    public bool GovernedPSeqResults { get; init; }
    public bool NativePSeqAccountsReceivable { get; init; }
    public bool AttentionOperations { get; init; }
}

public sealed class InvitationDeliveryOptions
{
    public int MaximumAttempts { get; init; } = 5;
    public int LeaseSeconds { get; init; } = 60;
    public int PollSeconds { get; init; } = 5;
    public string WebhookBasicUsername { get; init; } = string.Empty;
    public string WebhookBasicPassword { get; init; } = string.Empty;
    public string WebhookHeaderName { get; init; } = string.Empty;
    public string WebhookHeaderValue { get; init; } = string.Empty;

    public bool HasWebhookCredentials =>
        (!string.IsNullOrWhiteSpace(WebhookBasicUsername) && !string.IsNullOrWhiteSpace(WebhookBasicPassword))
        || (!string.IsNullOrWhiteSpace(WebhookHeaderName) && !string.IsNullOrWhiteSpace(WebhookHeaderValue));

    public bool IsValid => MaximumAttempts is >= 1 and <= 20
        && LeaseSeconds is >= 15 and <= 900
        && PollSeconds is >= 1 and <= 300
        && HasWebhookCredentials;
}

public sealed class PipelineRegistrationOptions
{
    public string ApiKey { get; init; } = string.Empty;
}
