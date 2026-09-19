namespace PhaenoPortal.Test;

using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Infrastructure.Persistence;
using PSeq.Operations.Laboratory.Domain;

public sealed class LabInvestigationTests
{
    [Fact]
    public void Report_keeps_exact_manifest_bytes_and_escapes_readable_output()
    {
        const string body = "{\"note\":\"<script>alert('x')</script>\",\"snapshot\":{\"missing\":null,\"records\":[]}}";
        var report = new LabInvestigationReport(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow, body);
        Assert.Equal(body, report.BodyJson);
        Assert.Equal(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body))), report.Sha256);
        var html = LabInvestigationReportRenderer.Html(report);
        Assert.DoesNotContain("<script>", html);
        Assert.Contains("&lt;script&gt;", html);
        Assert.Contains(report.Sha256, html);
        Assert.Contains("Not recorded", html);
        Assert.Contains("No records", html);
        Assert.Contains("default-src 'none'", html);
    }

    [Fact]
    public void Saved_reports_cannot_be_overwritten_or_deleted()
    {
        using var db = new PSeqOperationsDbContext(new DbContextOptionsBuilder<PSeqOperationsDbContext>()
            .UseNpgsql("Host=localhost;Database=not_used").Options, Options.Create(new PersistenceOptions()));
        var report = new LabInvestigationReport(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow, "{}");
        db.Attach(report);
        db.Entry(report).Property(x => x.BodyJson).CurrentValue = "{\"changed\":true}";
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
        db.ChangeTracker.Clear();
        db.Remove(report);
        Assert.Throws<InvalidOperationException>(() => db.SaveChanges());
    }
}
