namespace PhaenoPortal.Test;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PhaenoPortal.App.Infrastructure.Persistence;

public sealed class CustomerLabDashboardCandidateQueryTests
{
    [Fact]
    public void CandidateFilterTranslatesToPostgreSql()
    {
        var options = new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql("Host=localhost;Database=translation_only;Username=unused;Password=unused").Options;
        using var db = new PSeqOperationsDbContext(options, Options.Create(new PersistenceOptions()));
        var sql = new CustomerLabDashboardService(db)
            .NewResultCandidates(Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow).ToQueryString();
        Assert.Contains("result_artifacts", sql);
        Assert.Contains("operational_file_downloads", sql);
        Assert.Contains("operational_download_commit_evidence", sql);
        Assert.Contains("NOT EXISTS", sql);
    }
}
