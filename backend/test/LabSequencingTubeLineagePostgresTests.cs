namespace PhaenoPortal.Test;

using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Commercial.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public Task SequencingTubeManifestRetainsActualAliquotAndRejectsWrongTubeOrAmount()
        => VerifySequencingTubeManifestAsync(2);

    [PostgreSqlReferenceFact]
    public Task CatalogSendoutSchemaV3RetainsActualAliquotAndRejectsWrongTubeOrAmount()
        => VerifySequencingTubeManifestAsync(3);

    private async Task VerifySequencingTubeManifestAsync(int manifestSchema)
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        var db = scope.DbContext;
        await using var transaction = await db.Database.BeginTransactionAsync();
        try
        {
            var now = DateTime.UtcNow; var actor = scope.PlatformUser.Id;
            var order = new LabServiceOrder(scope.CustomerOrganization.Id,
                scope.CustomerOrganization.Departments.Single(d => d.IsDefault).Id, $"TUBE-{scope.Suffix}",
                "TEST ONLY aliquot lineage", null, 1, false, "TEST ONLY source", "Frozen", "TEST ONLY safe", "TEST ONLY instructions");
            var sample = new LabSample(order.Id, "TEST-ALIQUOT", "RNA", "TEST ONLY source", 100, "uL", "Frozen", "TEST ONLY safe", null, null, null, "[]");
            order.Samples.Add(sample);
            var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id,
                scope.CustomerOrganization.Id, "tube-lineage-test", 1, "test", null);
            work.RecordMilestone(LabWorkOrderStatus.Received); work.RecordMilestone(LabWorkOrderStatus.Processing);
            work.RecordMilestone(LabWorkOrderStatus.DataProcessing);
            var specimen = new LabSpecimen(work.Id, sample.Id); work.Specimens.Add(specimen);
            var protocol = new LabProtocol($"tube-{scope.Suffix}", "TEST ONLY preparation", null);
            var version = new LabProtocolVersion(protocol.Id, 1, LabProtocolTestData.Definition(), actor, now);
            version.Approve(scope.CustomerUser.Id, now);
            var workflow = new LabServiceWorkflow($"tube-{scope.Suffix}", "TEST ONLY preparation", null);
            var workflowVersion = new LabServiceWorkflowVersion(workflow.Id, 1, actor, now);
            workflowVersion.Approve(scope.CustomerUser.Id, now);
            var stage = new LabServiceWorkflowStage(workflowVersion.Id, 1, "Preparation", version.Id, LabServiceWorkflowStageRequirement.Required, null, null);
            var source = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen,
                $"TUBE-SOURCE-{scope.Suffix}", "TEST source", "TEST freezer", 100, "uL", null);
            source.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now);
            var attempt = new LabSpecimenAttempt(work.Id, specimen.Id, source.Id, workflowVersion.Id, 1, null);
            attempt.Start(source.Barcode, source.Barcode, now);
            var libraryTube = new LabContainer(work.Id, specimen.Id, source.Id, LabContainerKind.Library,
                $"TUBE-LIBRARY-{scope.Suffix}", "TEST library", "TEST freezer", 20, "uL", null);
            libraryTube.AttachAttempt(attempt);
            var execution = new LabProtocolExecution(work.Id, specimen.Id, version.Id, actor, stage.Id);
            execution.AttachAttempt(attempt); execution.Start(now);
            execution.RecordStep(version, LabProtocolTestData.Input(), actor, new HashSet<LabRole> { LabRole.Operator }, now);
            execution.Complete(version, null, now); attempt.Refresh(false, true, actor, now);
            var library = new LabLibrary(work.Id, specimen.Id, source.Id, libraryTube.Id, execution.Id, libraryTube.Barcode);
            library.RecordQc(true, "{}");
            var batch = new LabOperationalBatch($"TUBE-SEQ-{scope.Suffix}", "TEST ONLY sequencing", null); batch.Start(now);
            var member = new LabBatchMember(batch.Id, work.Id, library.Id, now);
            var sequencingTube = new LabContainer(work.Id, specimen.Id, libraryTube.Id, LabContainerKind.Sequencing,
                $"TUBE-SEND-{scope.Suffix}", "TEST sequencing aliquot", "TEST sendout rack", null, null, null, LabContainerBarcodeSource.Manufacturer,
                barcodeNamespace: "TEST-SEQUENCING-MANUFACTURER");
            sequencingTube.AttachAttempt(attempt); member.AssignSequencingTube(sequencingTube.Id);
            db.AddRange(order, work, protocol, version, workflow, workflowVersion, stage, source, attempt,
                libraryTube, execution, library, batch, member, sequencingTube);
            await db.SaveChangesAsync();
            var transfer = LabBiologicalMaterialTransfer.Record(Guid.NewGuid(), new string('A', 64), libraryTube, sequencingTube,
                attempt, 5, "uL", false, actor, now, sequencingBatchMemberId: member.Id);
            member.AttachSequencingTube(sequencingTube.Id, transfer.Id);
            db.LabBiologicalMaterialTransfers.Add(transfer);
            var manifest = JsonSerializer.Serialize(new
            {
                schemaVersion = manifestSchema,
                members = new[] { new { memberId = member.Id, libraryId = library.Id, libraryKey = library.LibraryKey,
                    libraryContainerId = libraryTube.Id, libraryContainerBarcode = libraryTube.Barcode,
                    sequencingContainerId = sequencingTube.Id, containerBarcode = sequencingTube.Barcode,
                    materialTransferId = transfer.Id, quantity = transfer.Quantity, quantityUnit = transfer.QuantityUnit } }
            });
            var sendout = new LabNgsSendout(batch.Id, "TEST provider", "TEST aliquot submission", manifest, null);
            VendorSendoutFixture.Complete(sendout, now);
            db.LabNgsSendouts.Add(sendout); await db.SaveChangesAsync();
            var request = new RegisterSequencingOutputRequest(Guid.NewGuid(), work.Id, specimen.Id, library.Id, sendout.Id,
                "TEST provider", "TEST aliquot run", "sample:TEST-ALIQUOT", "TEST raw file", new string('B', 64), 100);
            var service = new LabResultLineageService(db);

            // Deliberately corrupt this disposable fixture's frozen evidence to verify rejection.
            foreach (var changed in new[] { "containerBarcode", "quantity", "materialTransferId" })
            {
                var corrupted = JsonNode.Parse(manifest)!.AsObject();
                var submitted = corrupted["members"]![0]!.AsObject();
                if (changed == "containerBarcode") submitted[changed] = libraryTube.Barcode;
                else if (changed == "quantity") submitted[changed] = 6;
                else submitted[changed] = Guid.NewGuid().ToString();
                db.Entry(sendout).Property(s => s.ManifestJson).CurrentValue = corrupted.ToJsonString();
                await db.SaveChangesAsync();
                var rejected = await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(request, actor, "lab-staff", default));
                Assert.Equal("result_lineage_invalid", rejected.ErrorCode);
                Assert.False(await db.LabSequencingOutputs.AnyAsync(o => o.Id == request.Id));
            }
            foreach (var unsupportedSchema in new[] { 0, 4 })
            {
                var unsupported = JsonNode.Parse(manifest)!.AsObject();
                unsupported["schemaVersion"] = unsupportedSchema;
                db.Entry(sendout).Property(s => s.ManifestJson).CurrentValue = unsupported.ToJsonString();
                await db.SaveChangesAsync();
                var rejected = await Assert.ThrowsAsync<OrderManagementException>(() => service.RegisterOutputAsync(request, actor, "lab-staff", default));
                Assert.Contains("unsupported manifest version", rejected.Message);
                Assert.False(await db.LabSequencingOutputs.AnyAsync(o => o.Id == request.Id));
            }
            db.Entry(sendout).Property(s => s.ManifestJson).CurrentValue = manifest;
            await db.SaveChangesAsync();
            var output = await service.RegisterOutputAsync(request, actor, "lab-staff", default);
            Assert.Equal(output.Id, (await service.RegisterOutputAsync(request, actor, "lab-staff", default)).Id);
            using var saved = JsonDocument.Parse(output.LineageSnapshotJson);
            Assert.Equal(2, saved.RootElement.GetProperty("schemaVersion").GetInt32());
            var chain = saved.RootElement.GetProperty("sequencingChain");
            Assert.Equal(sequencingTube.Id, chain[0].GetProperty("id").GetGuid());
            Assert.Equal(libraryTube.Id, chain[1].GetProperty("id").GetGuid());
            Assert.Equal(source.Id, chain[2].GetProperty("id").GetGuid());
            Assert.Equal(transfer.Id, saved.RootElement.GetProperty("submittedMember").GetProperty("materialTransferId").GetGuid());
            Assert.Equal(15m, libraryTube.Quantity);
            Assert.Equal(5m, sequencingTube.Quantity);
            Assert.Equal(100m, source.Quantity);

            // Job reads retain physical membership and use only the latest result-version exceptions.
            var api = scope.CreateLabController();
            var linked = Assert.Single(await api.JobSequencing(work.Id, default));
            Assert.Equal(batch.Id, linked.Batch.Id);
            var linkedLibrary = Assert.Single(linked.Libraries);
            Assert.Equal(library.Id, linkedLibrary.LibraryId);
            Assert.Equal(sequencingTube.Barcode, linkedLibrary.SequencingTubeBarcode);
            Assert.Equal("Success", linkedLibrary.Outcome);
            var oldVersion = new LabVendorResultsVersion(Guid.NewGuid(), sendout.Id, 1, "{}", null, actor, "TEST actor", now);
            var currentVersion = new LabVendorResultsVersion(Guid.NewGuid(), sendout.Id, 2, "{}", "TEST correction", actor, "TEST actor", now);
            db.AddRange(oldVersion, currentVersion, new LabVendorLibraryException(sendout.Id, member.Id, oldVersion.Id, LabVendorOutcome.Failure, "Retired failure"));
            await db.SaveChangesAsync();
            linked = Assert.Single(await api.JobSequencing(work.Id, default));
            Assert.Equal(2, linked.Batch.ResultsVersion);
            Assert.Equal("Success", Assert.Single(linked.Libraries).Outcome);
            var latestVersion = new LabVendorResultsVersion(Guid.NewGuid(), sendout.Id, 3, "{}", "TEST latest correction", actor, "TEST actor", now);
            db.AddRange(latestVersion, new LabVendorLibraryException(sendout.Id, member.Id, latestVersion.Id, LabVendorOutcome.Failure, "Current failure"));
            var otherOrder = new LabServiceOrder(scope.CustomerOrganization.Id,
                scope.CustomerOrganization.Departments.Single(d => d.IsDefault).Id, $"OTHER-{scope.Suffix}",
                "TEST ONLY unassigned job", null, 1, false, "TEST source", "Frozen", "TEST safe", "TEST instructions");
            var otherWork = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, otherOrder.Id,
                scope.CustomerOrganization.Id, "TEST unassigned job", 1, "test", null);
            db.AddRange(otherOrder, otherWork);
            await db.SaveChangesAsync();
            linked = Assert.Single(await api.JobSequencing(work.Id, default));
            Assert.Equal("Failure", Assert.Single(linked.Libraries).Outcome);
            Assert.Equal("Current failure", Assert.Single(linked.Libraries).OutcomeReason);
            Assert.Empty(await api.JobSequencing(otherWork.Id, default));
            var specimenRead = Assert.Single(await api.JobSequencing(work.Id, default, specimen.Id));
            Assert.Equal(library.Id, Assert.Single(specimenRead.Libraries).LibraryId);
            await Assert.ThrowsAsync<OrderManagementException>(() => api.JobSequencing(work.Id, default, Guid.NewGuid()));
            var otherSpecimen = new LabSpecimen(work.Id, Guid.NewGuid());
            var otherLibrary = new LabLibrary(work.Id, otherSpecimen.Id, source.Id, libraryTube.Id, execution.Id, $"OTHER-{scope.Suffix}");
            var otherMember = new LabBatchMember(batch.Id, work.Id, otherLibrary.Id, now);
            db.AddRange(otherSpecimen, otherLibrary, otherMember);
            await db.SaveChangesAsync();
            specimenRead = Assert.Single(await api.JobSequencing(work.Id, default, specimen.Id));
            Assert.Equal(2, specimenRead.Batch.MemberCount);
            Assert.Equal(library.Id, Assert.Single(specimenRead.Libraries).LibraryId);
            Assert.Equal(otherLibrary.Id, Assert.Single(Assert.Single(await api.JobSequencing(work.Id, default, otherSpecimen.Id)).Libraries).LibraryId);
            Assert.False(db.ChangeTracker.HasChanges());

        }
        finally
        {
            await transaction.RollbackAsync();
            db.ChangeTracker.Clear();
        }
    }
}
