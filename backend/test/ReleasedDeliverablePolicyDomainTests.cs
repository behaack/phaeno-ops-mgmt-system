namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.FileManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.DTOs;

public sealed class ReleasedDeliverablePolicyDomainTests
{
    private static readonly DateTime Now = new(2026, 8, 18, 12, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void ApprovedGlobalDefaultsAreValidAndVersioned()
    {
        var values = ReleasedDeliverablePolicyValues.Create(30, 5, 5);
        var policy = new ReleasedDeliverablePolicyDefault(
            3,
            values,
            "Adjust the global policy for future releases.");

        Assert.Equal(values, policy.ReadValues());
        Assert.Equal(3, policy.Revision);
        Assert.Equal(3, policy.Version);
        Assert.True(policy.IsActive);
    }

    [Theory]
    [InlineData(0, 5, 5)]
    [InlineData(30, 0, 5)]
    [InlineData(30, 30, 5)]
    [InlineData(30, 31, 5)]
    [InlineData(30, 5, 0)]
    public void GlobalValuesRejectInvalidDayCombinations(
        int retentionDays,
        int warningDays,
        int graceDays)
    {
        Assert.ThrowsAny<ArgumentException>(() =>
            ReleasedDeliverablePolicyValues.Create(retentionDays, warningDays, graceDays));
    }

    [Fact]
    public void PartialOrganizationOverrideInheritsTheOtherGlobalValues()
    {
        var global = ReleasedDeliverablePolicyValues.Create(30, 5, 5);
        var policyOverride = new OrganizationReleasedDeliverablePolicyOverride(
            Guid.NewGuid(),
            2,
            standardRetentionDays: 45,
            undownloadedWarningLeadDays: null,
            undownloadedGraceDays: 7,
            global,
            "Honor the organization's contracted retention period.");

        Assert.Equal(
            ReleasedDeliverablePolicyValues.Create(45, 5, 7),
            policyOverride.Resolve(global));
        Assert.Equal(2, policyOverride.Version);
    }

    [Fact]
    public void OrganizationOverrideRejectsEmptyAndInvalidResolvedPolicies()
    {
        var organizationId = Guid.NewGuid();
        var global = ReleasedDeliverablePolicyValues.Create(30, 5, 5);

        Assert.ThrowsAny<ArgumentException>(() =>
            new OrganizationReleasedDeliverablePolicyOverride(
                organizationId,
                1,
                null,
                null,
                null,
                global,
                "No effective change."));
        Assert.ThrowsAny<ArgumentException>(() =>
            new OrganizationReleasedDeliverablePolicyOverride(
                organizationId,
                1,
                standardRetentionDays: 4,
                undownloadedWarningLeadDays: null,
                undownloadedGraceDays: null,
                global,
                "This makes the inherited warning invalid."));
    }

    [Fact]
    public void DeactivationRetainsActorTimeAndReason()
    {
        var actorId = Guid.NewGuid();
        var policy = new ReleasedDeliverablePolicyDefault(
            1,
            ReleasedDeliverablePolicyValues.Create(30, 5, 5),
            "Initial policy.");

        policy.Deactivate(Now, actorId, "Replaced for future releases only.");

        Assert.False(policy.IsActive);
        Assert.Equal(Now, policy.DeactivatedAt);
        Assert.Equal(actorId, policy.DeactivatedByUserId);
        Assert.Equal("Replaced for future releases only.", policy.DeactivationReason);
        Assert.Throws<InvalidOperationException>(() =>
            policy.Deactivate(Now.AddMinutes(1), actorId, "Cannot deactivate twice."));
    }

    [Fact]
    public void ReleaseSnapshotFreezesEffectiveValuesSourcesAndExactUtcDeadlines()
    {
        var organizationId = Guid.NewGuid();
        var releaseId = Guid.NewGuid();
        var global = new ReleasedDeliverablePolicyDefault(
            4,
            ReleasedDeliverablePolicyValues.Create(30, 5, 5),
            "Current global policy.");
        var policyOverride = new OrganizationReleasedDeliverablePolicyOverride(
            organizationId,
            2,
            standardRetentionDays: 45,
            undownloadedWarningLeadDays: null,
            undownloadedGraceDays: 7,
            global.ReadValues(),
            "Contracted organization policy.");

        var snapshot = ReleasedDeliverableRetentionSnapshot.ForLabResult(
            organizationId,
            releaseId,
            global,
            policyOverride,
            Now);

        Assert.Equal(releaseId, snapshot.LabResultReleaseId);
        Assert.Null(snapshot.AssemblyOutputReleaseId);
        Assert.Equal(global.Id, snapshot.GlobalPolicyId);
        Assert.Equal(4, snapshot.GlobalPolicyRevision);
        Assert.Equal(policyOverride.Id, snapshot.OrganizationPolicyOverrideId);
        Assert.Equal(2, snapshot.OrganizationPolicyOverrideRevision);
        Assert.Equal(45, snapshot.StandardRetentionDays);
        Assert.Equal(
            ReleasedDeliverablePolicyValueSource.OrganizationOverride,
            snapshot.StandardRetentionSource);
        Assert.Equal(5, snapshot.UndownloadedWarningLeadDays);
        Assert.Equal(
            ReleasedDeliverablePolicyValueSource.GlobalDefault,
            snapshot.UndownloadedWarningLeadSource);
        Assert.Equal(7, snapshot.UndownloadedGraceDays);
        Assert.Equal(
            ReleasedDeliverablePolicyValueSource.OrganizationOverride,
            snapshot.UndownloadedGraceSource);
        Assert.Equal(Now, snapshot.ReleasedAtUtc);
        Assert.Equal(Now.AddDays(40), snapshot.WarningAtUtc);
        Assert.Equal(Now.AddDays(45), snapshot.StandardDeletionAtUtc);
        Assert.Equal(Now.AddDays(52), snapshot.PotentialFinalDeletionAtUtc);
    }

    [Fact]
    public void ReleaseSnapshotRejectsAPolicyOverrideForAnotherOrganization()
    {
        var global = new ReleasedDeliverablePolicyDefault(
            1,
            ReleasedDeliverablePolicyValues.Create(30, 5, 5),
            "Current global policy.");
        var policyOverride = new OrganizationReleasedDeliverablePolicyOverride(
            Guid.NewGuid(),
            1,
            60,
            null,
            null,
            global.ReadValues(),
            "Another organization's policy.");

        Assert.Throws<ArgumentException>(() =>
            ReleasedDeliverableRetentionSnapshot.ForAssemblyOutput(
                Guid.NewGuid(),
                Guid.NewGuid(),
                global,
                policyOverride,
                Now));
    }

    [Fact]
    public void PackageApiProjectionExposesDatesWithoutPolicyConfigurationHistory()
    {
        var global = new ReleasedDeliverablePolicyDefault(
            3,
            ReleasedDeliverablePolicyValues.Create(30, 5, 5),
            "Current global policy.");
        var snapshot = ReleasedDeliverableRetentionSnapshot.ForAssemblyOutput(
            Guid.NewGuid(),
            Guid.NewGuid(),
            global,
            organizationOverride: null,
            Now);

        var dto = snapshot.ToDto();

        Assert.Equal(Now.AddDays(30), dto.StandardDeletionAtUtc);
        Assert.Equal(Now.AddDays(35), dto.PotentialFinalDeletionAtUtc);
        Assert.DoesNotContain(
            typeof(ReleasedDeliverableRetentionDto).GetProperties(),
            property => property.Name.Contains("Policy", StringComparison.OrdinalIgnoreCase));
    }
}
