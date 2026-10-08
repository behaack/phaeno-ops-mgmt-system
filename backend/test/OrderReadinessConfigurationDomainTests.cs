namespace PhaenoPortal.Test;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed class OrderReadinessConfigurationDomainTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("{}")]
    [InlineData("{\"configured\":true}")]
    [InlineData("{\"mode\":true,\"destination\":true}")]
    [InlineData("{\"mode\":\"AnySample\",\"destination\":\"Email\"}")]
    [InlineData("{\"mode\":\"ExactSampleRoster\",\"destination\":\"GovernedPortal\"}")]
    [InlineData("{\"mode\":\"ExactSampleRoster\",\"legacy\":true}")]
    [InlineData("{\"destination\":\"GovernedPortal\",\"legacy\":true}")]
    [InlineData("{\"mode\":\"AnySample\",\"mode\":\"ExactSampleRoster\"}")]
    [InlineData("{\"destination\":\"Email\",\"destination\":\"GovernedPortal\"}")]
    [InlineData("[]")]
    [InlineData("true")]
    [InlineData("\"ExactSampleRoster\"")]
    [InlineData("null")]
    [InlineData("not-json")]
    public void ArbitraryOrLegacyJsonDoesNotEstablishReadiness(string? configuration)
    {
        Assert.False(OrderSystemConfiguration.HasSupportedSampleConfiguration(configuration));
        Assert.False(OrderSystemConfiguration.HasSupportedResultDestination(configuration));
    }

    [Fact]
    public void SupportedWorkflowsAreRecognizedByTheirOwnSetting()
    {
        const string samples = "{\"mode\":\"ExactSampleRoster\"}";
        const string results = "{\"destination\":\"GovernedPortal\"}";

        Assert.True(OrderSystemConfiguration.HasSupportedSampleConfiguration(samples));
        Assert.True(OrderSystemConfiguration.HasSupportedResultDestination(results));
        Assert.False(OrderSystemConfiguration.HasSupportedSampleConfiguration(results));
        Assert.False(OrderSystemConfiguration.HasSupportedResultDestination(samples));

        var configuration = new OrderSystemConfiguration(30, "Follow the shipment instructions.", "{}");
        configuration.UpdatePSeqReadinessConfiguration(samples, results);
        Assert.Equal(samples, configuration.SampleConfigurationJson);
        Assert.Equal(results, configuration.ResultDestinationConfigurationJson);
    }

    [Theory]
    [InlineData("{\"configured\":true}", "{\"destination\":\"GovernedPortal\"}")]
    [InlineData("{\"mode\":\"ExactSampleRoster\"}", "{\"configured\":true}")]
    public void InvalidUpdatePreservesBothPreviouslyApprovedSettings(string samples, string results)
    {
        const string originalSamples = "{\"mode\":\"ExactSampleRoster\"}";
        const string originalResults = "{\"destination\":\"GovernedPortal\"}";
        var configuration = new OrderSystemConfiguration(30, "Follow the shipment instructions.", "{}");
        configuration.UpdatePSeqReadinessConfiguration(originalSamples, originalResults);

        Assert.Throws<ArgumentException>(() => configuration.UpdatePSeqReadinessConfiguration(samples, results));

        Assert.Equal(originalSamples, configuration.SampleConfigurationJson);
        Assert.Equal(originalResults, configuration.ResultDestinationConfigurationJson);
    }
}
