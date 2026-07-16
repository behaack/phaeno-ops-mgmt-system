namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial;
using PSeq.Operations.Commercial.LabOperations.Application;
using PhaenoPortal.App.Features.LabOperations.Services;

public class LabOperationsContractTests
{
    [Fact]
    public void CommandMetadataDefaultsToVersionOne()
    {
        var metadata = new LabOperationsCommandMetadata(
            Guid.NewGuid(),
            Guid.NewGuid(),
            new DateTime(2026, 7, 16, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(LabOperationsContractVersions.V1, metadata.ContractVersion);
    }

    [Fact]
    public void AuthorizationContractContainsNoCommercialOrPipelineImplementationFields()
    {
        var propertyNames = typeof(AuthorizeLabWorkCommand)
            .GetProperties()
            .Concat(typeof(AuthorizedSpecimen).GetProperties())
            .Select(property => property.Name)
            .ToArray();
        var forbiddenFragments = new[]
        {
            "Price",
            "Quote",
            "Invoice",
            "Payment",
            "QuickBooks",
            "HubSpot",
            "CustomerKind",
            "Partner",
            "DownstreamCustomer",
            "Pipeline",
            "Output",
            "Checksum",
            "DownloadUrl"
        };

        foreach (var fragment in forbiddenFragments)
        {
            Assert.DoesNotContain(
                propertyNames,
                propertyName => propertyName.Contains(fragment, StringComparison.OrdinalIgnoreCase));
        }

        Assert.Equal(
            [LabWorkAuthorizationSource.CommercialOrder, LabWorkAuthorizationSource.TrialProject],
            Enum.GetValues<LabWorkAuthorizationSource>());
    }

    [Fact]
    public void ProviderContractIsCommercialOwnedAndTransportNeutral()
    {
        var providerType = typeof(ILabOperationsProvider);
        var commercialAssembly = typeof(CommercialAssembly).Assembly;

        Assert.Equal(commercialAssembly, providerType.Assembly);
        Assert.Equal(4, providerType.GetMethods().Length);
        Assert.All(
            providerType.GetMethods(),
            method => Assert.DoesNotContain(
                method.GetParameters(),
                parameter => parameter.ParameterType.Name.Contains("DbContext", StringComparison.Ordinal)
                    || parameter.ParameterType.Name.Contains("IQueryable", StringComparison.Ordinal)));
    }

    [Fact]
    public void InternalProviderImplementsTheCommercialOwnedPort()
    {
        Assert.True(typeof(ILabOperationsProvider).IsAssignableFrom(
            typeof(InternalLabOperationsProvider)));
    }

    [Fact]
    public void CancellationOutcomeRepresentsPartialAcceptanceWithoutCustomerWording()
    {
        var affectedSpecimenId = Guid.NewGuid();
        var outcome = new LabCancellationOutcome(
            Guid.NewGuid(),
            Guid.NewGuid(),
            LabCancellationDisposition.PartiallyAccepted,
            Guid.NewGuid(),
            [affectedSpecimenId],
            LabCommandReasonCodes.WorkAlreadyStarted,
            new DateTime(2026, 7, 16, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(LabCancellationDisposition.PartiallyAccepted, outcome.Disposition);
        Assert.Equal([affectedSpecimenId], outcome.AffectedSubmittedSpecimenIds);
        Assert.Equal("work_already_started", outcome.ReasonCode);
    }
}
