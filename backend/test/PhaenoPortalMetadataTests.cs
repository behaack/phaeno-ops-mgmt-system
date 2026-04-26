namespace PhaenoPortal.Test;

using PhaenoPortal.App.Features.Health.DTOs;
using PhaenoPortal.App.Features.Health.Endpoints;

public class PhaenoPortalMetadataTests
{
    [Fact]
    public void HealthMetadataIdentifiesTheApi()
    {
        HealthStatusDto health = HealthMetadata.Current;

        Assert.Equal("Phaeno Portal API", health.Service);
        Assert.Equal("healthy", health.Status);
    }
}
