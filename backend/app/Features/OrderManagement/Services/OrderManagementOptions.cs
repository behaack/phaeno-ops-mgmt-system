namespace PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class OrderManagementOptions
{
    public const string SectionName = "OrderManagement";
    public long MaximumFileBytes { get; set; } = 100 * 1024 * 1024;
    public int DownloadLeaseMinutes { get; set; } = 60;
    public int DownloadReconciliationIntervalSeconds { get; set; } = 30;
    public bool ReleasedDeliverableRetentionEnforcement { get; set; }
    public bool ReleasedDeliverableRetentionProcessing { get; set; }
    public bool ReleasedDeliverableByteDeletion { get; set; }
    public bool UseTrustedDevelopmentScanner { get; set; }
    public Dictionary<string, string> AllowedFileKinds { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    public TimeSpan DownloadLeaseDuration => TimeSpan.FromMinutes(DownloadLeaseMinutes);
    public TimeSpan DownloadReconciliationInterval => TimeSpan.FromSeconds(DownloadReconciliationIntervalSeconds);

    public bool CanProcessRetention(bool attentionOperations) => ReleasedDeliverableRetentionProcessing
        && ReleasedDeliverableRetentionEnforcement && attentionOperations;

    public bool HasValidDownloadSettings => DownloadLeaseMinutes is >= 1 and <= 24 * 60
        && DownloadReconciliationIntervalSeconds is >= 5 and <= 300;
}
public sealed class QuickBooksOptions
{
    public const string SectionName = "QuickBooks";
    public string Environment { get; set; } = "Sandbox";
    public string RealmId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string WebhookVerifierToken { get; set; } = string.Empty;
    public string ApiBaseUrl { get; set; } = "https://sandbox-quickbooks.api.intuit.com";
    public string OAuthTokenUrl { get; set; } = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
    public bool IsConfigured => !string.IsNullOrWhiteSpace(RealmId)
        && !string.IsNullOrWhiteSpace(ClientId)
        && !string.IsNullOrWhiteSpace(ClientSecret)
        && !string.IsNullOrWhiteSpace(RefreshToken);
}
