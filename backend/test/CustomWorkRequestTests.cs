namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.Accounts.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed class CustomWorkRequestTests
{
    [Theory]
    [InlineData(OrganizationKind.Customer, "PSeqLabService")]
    [InlineData(OrganizationKind.Partner, "PSeqLabService")]
    [InlineData(OrganizationKind.Partner, "PSeqKit")]
    public void SupportedRequestsKeepSourceAndTrimUserText(OrganizationKind kind, string service)
    {
        var source = Guid.NewGuid();
        var result = CustomWorkRequestService.Normalize(new(service, "  Custom scope  ", "  Scientific needs  ", source), kind);
        Assert.Equal("Custom scope", result.Subject);
        Assert.Equal("Scientific needs", result.Description);
        Assert.Equal(source, result.SourceOrderId);
    }

    [Theory]
    [InlineData(OrganizationKind.Customer, "PSeqKit")]
    [InlineData(OrganizationKind.Prospect, "PSeqLabService")]
    [InlineData(OrganizationKind.Phaeno, "PSeqLabService")]
    [InlineData(OrganizationKind.Partner, "DataAssembly")]
    [InlineData(OrganizationKind.Partner, "anything")]
    public void UnsupportedRelationshipOrSeparateAssemblySaleIsRejected(OrganizationKind kind, string service)
        => Assert.Equal("custom_work_service_invalid", Assert.Throws<OrderManagementException>(() =>
            CustomWorkRequestService.Normalize(new(service, "Scope", "Needs"), kind)).ErrorCode);

    [Theory]
    [InlineData("", "Needs", "subject")]
    [InlineData("Scope", " ", "description")]
    public void EmptyRequiredTextIsRejected(string subject, string description, string field)
        => Assert.Equal($"custom_work_{field}_invalid", Assert.Throws<OrderManagementException>(() =>
            CustomWorkRequestService.Normalize(new("PSeqLabService", subject, description), OrganizationKind.Customer)).ErrorCode);

    [Fact]
    public void BoundedTextCannotOverflowCrmRequestContext()
    {
        Assert.Throws<OrderManagementException>(() => CustomWorkRequestService.Normalize(
            new("PSeqLabService", new('a', 256), "Needs"), OrganizationKind.Customer));
        Assert.Throws<OrderManagementException>(() => CustomWorkRequestService.Normalize(
            new("PSeqLabService", "Scope", new('a', 1501)), OrganizationKind.Customer));
    }
}
