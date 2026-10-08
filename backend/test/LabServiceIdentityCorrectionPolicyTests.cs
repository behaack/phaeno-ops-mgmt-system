namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.Services;
using System.Text.Json;
using System.Text.Json.Serialization;

public class LabServiceIdentityCorrectionPolicyTests
{
    [Fact]
    public void ReadsCommercialSnapshotWithStringEnums()
    {
        var original = Authorization();
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web)
        { Converters = { new JsonStringEnumConverter() } };
        var json = JsonSerializer.Serialize(original, options);
        Assert.Contains("\"sourceType\":\"CommercialOrder\"", json);
        var read = LabServiceIdentityCorrectionPolicy.ReadCommercialSnapshot(json)!;
        Assert.True(LabServiceIdentityCorrectionPolicy.PreservesScope(read, Corrected(original)));
    }

    [Fact]
    public void CorrectionOnlyChangesServiceReferenceAndAuthorizationEnvelope()
    {
        var original = Authorization();
        var corrected = Corrected(original);
        Assert.True(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected));
        var sample = original.Specimens.Single();
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { Specimens = [] }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { Specimens = [sample with { SequencingRunCount = 2 }] }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { MinimumTurnaroundDays = 15 }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { IncludedScientificScopeJson = "{}" }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { SubmittingOrganizationId = Guid.NewGuid() }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { TubeUsePolicyVersion = 2 }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { AuthorizationVersion = 3 }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { Metadata = corrected.Metadata with { ContractVersion = 1 } }));
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, corrected with { Metadata = corrected.Metadata with { CorrelationId = Guid.NewGuid() } }));
    }

    [Fact]
    public void TrialAndUnchangedServiceAreNotCorrections()
    {
        var original = Authorization();
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(original, Corrected(original) with { ServiceKey = original.ServiceKey }));
        var trial = original with { SourceType = LabWorkAuthorizationSource.TrialProject };
        Assert.False(LabServiceIdentityCorrectionPolicy.PreservesScope(trial, Corrected(trial)));
    }

    [Theory]
    [InlineData(LabWorkOrderStatus.AwaitingSpecimens, true)]
    [InlineData(LabWorkOrderStatus.Received, true)]
    [InlineData(LabWorkOrderStatus.OnHold, false)]
    [InlineData(LabWorkOrderStatus.Processing, false)]
    [InlineData(LabWorkOrderStatus.Cancelled, false)]
    [InlineData(LabWorkOrderStatus.ReadyForRelease, false)]
    public void StatusGuardOnlyAllowsUnstartedCommercialWork(LabWorkOrderStatus status, bool expected)
    {
        var command = Authorization();
        var work = new LabWorkOrder(command.AuthorizationId, 1, LabAuthorizationSource.CommercialOrder,
            command.AuthorizationSourceId, command.SubmittingOrganizationId, command.ServiceKey, 1, "standard", null);
        if (status == LabWorkOrderStatus.Cancelled) work.CancelBeforeExecution();
        else if (status == LabWorkOrderStatus.ReadyForRelease)
        {
            work.RecordMilestone(LabWorkOrderStatus.Processing);
            work.RecordMilestone(LabWorkOrderStatus.ScientificReview);
            work.RecordMilestone(status);
        }
        else if (status != LabWorkOrderStatus.AwaitingSpecimens) work.RecordMilestone(status);
        Assert.Equal(expected, LabServiceIdentityCorrectionPolicy.HasUnstartedStatus(work));
        var pinned = new LabWorkOrder(command.AuthorizationId, 1, LabAuthorizationSource.CommercialOrder,
            command.AuthorizationSourceId, command.SubmittingOrganizationId, command.ServiceKey, 1, "standard", null, Guid.NewGuid());
        Assert.False(LabServiceIdentityCorrectionPolicy.HasUnstartedStatus(pinned));
    }

    private static AuthorizeLabWorkCommand Authorization() => new(
        new(Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow, LabOperationsContractVersions.V2),
        Guid.NewGuid(), 1, LabWorkAuthorizationSource.CommercialOrder, Guid.NewGuid(), Guid.NewGuid(),
        "pseq-lab-service", 1, "standard", "demo", [new(Guid.NewGuid(), "DEMO", "RNA", "demo", 1m,
            "mL", "frozen", "demo only", null, null, null, ["pseq-lab-service"])],
        MinimumTurnaroundDays: 14, MaximumTurnaroundDays: 14);

    private static AuthorizeLabWorkCommand Corrected(AuthorizeLabWorkCommand original) => original with
    {
        Metadata = original.Metadata with { CommandId = Guid.NewGuid(), OccurredAtUtc = DateTime.UtcNow },
        AuthorizationVersion = original.AuthorizationVersion + 1, ServiceKey = "item-demo-service",
    };
}
