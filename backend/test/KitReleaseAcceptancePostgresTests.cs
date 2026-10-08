namespace PhaenoPortal.Test;

using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PhaenoPortal.App.Features.Accounts.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;

public sealed partial class KitBundlePostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task SimulatedCorrectedKitOutputRetainsInputLineageAndCreditsMemberBytesUnderOriginalInvoice()
    {
        await using var scope = await Scope.Create();
        var order = await scope.ShipAndFulfill(2);
        var included = order.AssemblyCases![0]; var sibling = order.AssemblyCases[1];
        var draft = await scope.Assembly().PrepareIncludedCase(order.Id, included.Id,
            new(included.Version, "SIMULATED KIT05 CORRECTION", "{}", "Included scope", null, true), default);
        var storage = new InputBytes(); var scanner = new InputScanner();
        var first = await Upload(scope, draft.Id, storage, scanner, "original.fasta", Encoding.UTF8.GetBytes(">SIMULATED original\nAAAA\n"));
        static string Manifest(Guid id) => JsonSerializer.Serialize(new { files = new[] { new { id } } });
        var submitted = await scope.Assembly().Submit(draft.Id, new(draft.Version, Manifest(first.Id)), default);
        var originalRevision = Assert.Single(submitted.InputRevisions);
        var validating = await scope.Scientific().BeginIntake(draft.Id, new(submitted.Version), default);
        var correction = await scope.Scientific().RequestChanges(draft.Id, new(validating.Version, "SIMULATED replace original.fasta and correct reference", null), default);
        correction = await scope.Assembly().Update(draft.Id, new(correction.AssemblyProfileId, "SIMULATED CORRECTED REFERENCE", "{}", correction.RequestedOutput, null, true, correction.Version), default);
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => scope.Assembly().DeleteInput(draft.Id, first.Id, first.Version, default));
        await scope.Assembly().DeleteInput(draft.Id, first.Id, Assert.Single(correction.InputFiles).Version, default);
        var replacement = await Upload(scope, draft.Id, storage, scanner, "corrected.fasta", Encoding.UTF8.GetBytes(">SIMULATED corrected\nACGT\n"));
        var resubmitted = await scope.Assembly().Submit(draft.Id, new(correction.Version, Manifest(replacement.Id)), default);
        var revisions = await scope.Db.AssemblyInputRevisions.AsNoTracking().Where(x => x.DataAssemblyRequestId == draft.Id).OrderBy(x => x.Revision).ToListAsync();
        Assert.Equal(2, revisions.Count); Assert.Equal(originalRevision.Id, revisions[1].PreviousRevisionId);
        Assert.Contains(first.Id.ToString(), revisions[0].ManifestJson); Assert.Contains(replacement.Id.ToString(), revisions[1].ManifestJson);
        var oldInput = await scope.Db.ManagedOperationalFiles.AsNoTracking().SingleAsync(x => x.Id == first.Id);
        Assert.Equal(FileReleaseStatus.Withdrawn, oldInput.ReleaseStatus); Assert.Equal(originalRevision.Id, oldInput.ParentRecordId);
        Assert.True(storage.Files.ContainsKey(oldInput.StorageKey));
        var intake = await scope.Scientific().BeginIntake(draft.Id, new(resubmitted.Version), default);
        var queued = await scope.Scientific().AcceptIntake(draft.Id, new(intake.Version), default);
        Assert.Empty(queued.Quotes);
        var processing = await scope.Scientific().StartProcessing(draft.Id, new(queued.Version, "1", "SIMULATED-PIPELINE", "SIMULATED no scientific validity asserted"), default);
        var run = Assert.Single(processing.ProcessingRuns); Assert.Equal(revisions[1].Id, run.InputRevisionId);
        var reviewed = await scope.Scientific().DecideProcessing(draft.Id, run.Id, new(processing.Version, run.Id, true, "SIMULATED Pass"), default);
        var bytes = Encoding.UTF8.GetBytes(">SIMULATED OUTPUT ONLY\nACGT\n");
        var outputKey = Guid.NewGuid().ToString("N") + ".fasta"; storage.Files.Add(outputKey, bytes);
        var output = new ManagedOperationalFile(scope.Partner.Id, OrderWorkflowTypes.DataAssembly, draft.Id, run.Id, OperationalFilePurpose.AssemblyOutput,
            "SIMULATED-result.fasta", ".fasta", "text/plain", bytes.Length, Convert.ToHexString(SHA256.HashData(bytes)), outputKey);
        output.RecordScan(OperationalFileScanStatus.Clean, "SIMULATED clean output"); scope.Db.Add(output); await scope.Db.SaveChangesAsync();
        var ready = await scope.Scientific().ReleaseOutput(draft.Id, new(reviewed.Version, run.Id, "{}", "SIMULATED-PIPELINE", "SIMULATED output", "SIMULATED Pass"), default);
        var release = Assert.Single(ready.OutputReleases); Assert.Equal("PaymentHold", release.ReleaseStatus);
        Assert.Equal(revisions[1].Id, release.InputRevisionId);
        await Assert.ThrowsAsync<OrderManagementException>(() => scope.Assembly(storage: storage).DownloadOutput(draft.Id, release.Id, output.Id, default));
        var billingId = (await scope.Db.KitAssemblyCases.AsNoTracking().SingleAsync(x => x.Id == included.Id)).BillingDocumentId;
        var invoice = await scope.Db.CommercialDocumentLinks.SingleAsync(x => x.Id == billingId);
        invoice.MarkSynchronized("SIMULATED-original-payment", "SIMULATED-PAID", null, invoice.Total, 0m, invoice.Currency, DateTime.UtcNow);
        await scope.Db.SaveChangesAsync();
        using var workerServices = new ServiceCollection().AddSingleton(scope.Db).AddSingleton(scope.ReleaseService()).BuildServiceProvider();
        await KitCaseLifecycleWorker.ProcessCaseAsync(workerServices, included.Id, DateTime.UtcNow, default);
        scope.Db.ChangeTracker.Clear();
        var savedRelease = await scope.Db.AssemblyOutputReleases.AsNoTracking().SingleAsync(x => x.Id == release.Id);
        Assert.Equal(FileReleaseStatus.Released, savedRelease.ReleaseStatus);
        Assert.Contains(output.Sha256, savedRelease.ManifestJson);
        Assert.False(await scope.Db.CommercialDocumentLinks.AnyAsync(x => x.WorkflowId == draft.Id));
        Assert.Single(await scope.Db.CommercialDocumentLinks.Where(x => x.WorkflowId == order.Id && x.Kind == CommercialDocumentKind.Invoice).ToListAsync());

        var identity = new ExternalIdentity("test", Guid.NewGuid().ToString("N"), $"kit-member-{Guid.NewGuid():N}@example.test", true);
        var member = new User(identity.Email, "Simulated", "Member"); member.Activate(); member.LinkExternalIdentity(identity.Provider, identity.SubjectId);
        var membership = new OrganizationMembership(member.Id, scope.Partner.Id, false);
        scope.Db.AddRange(member, membership, new OrganizationDepartmentMembership(membership.Id, scope.Department.Id)); await scope.Db.SaveChangesAsync();
        using var mvc = new ServiceCollection().AddLogging().AddControllers().Services.BuildServiceProvider();
        async Task<byte[]> Download(bool zip)
        {
            var controller = scope.Assembly(storage: storage, identity: identity);
            controller.HttpContext.Request.Method = "GET"; controller.HttpContext.RequestServices = mvc; controller.HttpContext.Response.Body = new MemoryStream();
            var result = zip ? await controller.DownloadOutputRelease(draft.Id, release.Id, default) : await controller.DownloadOutput(draft.Id, release.Id, output.Id, default);
            await result.ExecuteResultAsync(new ActionContext(controller.HttpContext, new RouteData(), new ActionDescriptor()));
            return ((MemoryStream)controller.HttpContext.Response.Body).ToArray();
        }
        Assert.Equal(bytes, await Download(false));
        using (var archive = new ZipArchive(new MemoryStream(await Download(true)), ZipArchiveMode.Read))
        {
            var entry = Assert.Single(archive.Entries); await using var entryStream = entry.Open(); using var extracted = new MemoryStream();
            await entryStream.CopyToAsync(extracted); Assert.Equal(bytes, extracted.ToArray());
        }
        var receipt = await scope.Assembly(identity: identity).GetOutput(draft.Id, release.Id, default);
        Assert.True(Assert.Single(receipt.Files).Download!.IsDownloaded);
        var wrongDepartment = scope.Assembly(storage: storage, identity: identity);
        wrongDepartment.HttpContext.Request.Headers["X-Department-Id"] = scope.OtherDepartment.Id.ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => wrongDepartment.DownloadOutput(draft.Id, release.Id, output.Id, default))).StatusCode);
        var wrongPartner = scope.Assembly(storage: storage, identity: identity);
        wrongPartner.HttpContext.Request.Headers["X-Organization-Id"] = Guid.NewGuid().ToString();
        Assert.Equal(404, (await Assert.ThrowsAsync<OrderManagementException>(() => wrongPartner.DownloadOutputRelease(draft.Id, release.Id, default))).StatusCode);

        var parent = await scope.Platform().Get(order.Id, default);
        Assert.Equal("KitFulfilledAssemblyPending", parent.Status);
        Assert.Equal("AwaitingSubmission", Assert.Single(parent.AssemblyCases!, x => x.Id == sibling.Id).Status);
        sibling = Assert.Single(parent.AssemblyCases!, x => x.Id == sibling.Id);
        parent = await scope.Platform().CancelIncludedCase(order.Id, sibling.Id, new(sibling.Version, "SIMULATED unused sibling closed"), default);
        Assert.Equal("Completed", parent.Status);
        Assert.Equal(savedRelease.ManifestJson, (await scope.Db.AssemblyOutputReleases.AsNoTracking().SingleAsync(x => x.Id == release.Id)).ManifestJson);
    }
}
