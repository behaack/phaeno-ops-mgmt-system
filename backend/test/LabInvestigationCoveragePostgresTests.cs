namespace PhaenoPortal.Test;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PhaenoPortal.App.Features.LabOperations.DTOs;
using PhaenoPortal.App.Features.LabOperations.Services;
using PhaenoPortal.App.Features.OrderManagement.Domain;
using PSeq.Operations.Laboratory.Domain;

public partial class SampleShippingPostgresTests
{
    [PostgreSqlReferenceFact]
    public async Task InvestigationMasterMixExposureExcludesZeroUseOtherOrganizationsAndVoidedDispensing()
    {
        await using var isolated = await SampleTrackingReviewDatabase.CreateAsync();
        await using var scope = await ShippingTestScope.CreateAsync(isolated.ConnectionString);
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var db = scope.DbContext; var now = LabEvidenceTime.UtcNow; var actor = scope.PlatformUser.Id;
            var material = new LabMaterialDefinition("mix-source-" + scope.Suffix, "TEST ONLY mix reagent", LabMaterialLotKind.PreparedReagent);
            var storage = new LabStorageLocation("MIX-" + scope.Suffix);
            var equipment = new LabEquipment("MIX-EQUIP-" + scope.Suffix, "TEST ONLY shared instrument", "Test", "TEST bench", null, null);
            var mixingEquipment = new LabEquipment("UPSTREAM-EQUIP-" + scope.Suffix, "TEST ONLY mix preparation instrument", "Test", "TEST mixing bench", DateOnly.FromDateTime(now), DateOnly.FromDateTime(now).AddDays(30));
            var source = new LabMaterialLot(LabMaterialLotKind.PreparedReagent, material.Id, "MIX-SOURCE-" + scope.Suffix, null, null, storage.Id, 10, "uL");
            source.RecordQc(LabQcDisposition.Passed, DateOnly.FromDateTime(now), null, "{}", actor, now);
            db.AddRange(material, storage, equipment, mixingEquipment, source); await db.SaveChangesAsync();
            var recipeStep = new LabProtocolStepDefinition { Key = "prepare", Name = "Prepare mix", Instructions = "TEST ONLY", ProcessType = "masterMix",
                Required = true, Repeatable = false, OperatorConfirmation = true, InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [],
                Captures = [new() { Key = "source", Label = "Source", Type = "material", Required = true, IncludeTracking = true, Scope = "batch",
                    QuantityBasis = "total", Unit = "uL", PlannedQuantityText = "1", Material = new("Source", MaterialDefinitionId: material.Id) },
                    new() { Key = "mixing-equipment", Label = "Mix preparation equipment", Type = "equipment", Required = true, Scope = "batch" }] };
            var mixWorkflow = new LabMasterMixWorkflow("TEST ONLY mix workflow", "uL", [recipeStep], actor);
            mixWorkflow.Approve(scope.CustomerUser.Id, now);
            var mix = new LabMasterMixPreparation(mixWorkflow, actor, now, Guid.NewGuid());
            var ingredient = new LabMasterMixIngredientUse(Guid.NewGuid(), mix.Id, source.Id, 1, "uL", false, actor, now, 0, "source",
                await LabResourceSnapshot.MaterialAsync(db, source, default));
            source.Consume(1, false, ingredient.Id, actor, now); mix.RecordIngredientUse(now);
            db.AddRange(mixWorkflow, mix, ingredient); await db.SaveChangesAsync();
            var mixController = scope.CreatePreparationController(db);
            var mixRequest = new PhaenoPortal.App.Features.LabOperations.Controllers.RecordLabMasterMixStepRequest(Guid.NewGuid(), 0, "TEST ONLY upstream equipment capture", mix.Version,
                new("prepare", "record", "recorded", new Dictionary<string, JsonElement> { ["mixing-equipment"] = JsonSerializer.SerializeToElement(mixingEquipment.Id.ToString()) },
                    true, true, null, null, Performance: new("now", true)));
            var recordedMix = await mixController.RecordMasterMixStep(mix.Id, mixRequest, default);
            var frozenEquipment = Assert.Single(Assert.Single(recordedMix.RecordedSteps).Evidence.EquipmentUses!);
            Assert.Equal(mixingEquipment.Id, frozenEquipment.EquipmentId);
            Assert.Equal("TEST mixing bench", JsonDocument.Parse(frozenEquipment.ResourceSnapshotJson).RootElement.GetProperty("location").GetString());
            Assert.Equal(frozenEquipment, Assert.Single(Assert.Single((await mixController.RecordMasterMixStep(mix.Id, mixRequest, default)).RecordedSteps).Evidence.EquipmentUses!));
            mix.Complete(10, true, actor, DateTime.UtcNow);
            var applyStep = recipeStep with { Key = "apply", Name = "Apply mix", ProcessType = null,
                Captures = [new() { Key = "mix", Label = "Mix used", Type = "material", Required = true, Scope = "shared", QuantityBasis = "perSample", Unit = "uL",
                    Material = new("Mix", MasterMixWorkflowId: mixWorkflow.Id, MasterMixWorkflowRevision: 1) },
                    new() { Key = "shared-equipment", Label = "Shared instrument", Type = "equipment", Required = true, Scope = "batch" },
                    new() { Key = "tube-equipment", Label = "Tube instrument run", Type = "equipment", Required = true, Scope = "tube" }] };
            var protocol = new LabProtocol("mix-apply-" + scope.Suffix, "TEST ONLY mix application", null);
            var pv = new LabProtocolVersion(protocol.Id, 1, new LabProtocolDefinition { SchemaVersion = 1, PreparationBatchEnabled = true, Steps = [applyStep] }.ToJson(), actor, now);
            pv.Approve(scope.CustomerUser.Id, now); protocol.RecordVersion(1);
            var workflow = new LabServiceWorkflow("mix-apply-" + scope.Suffix, "TEST ONLY mix application", null);
            var wv = new LabServiceWorkflowVersion(workflow.Id, 1, actor, now); wv.Approve(scope.CustomerUser.Id, now); workflow.RecordVersion(1);
            var stage = new LabServiceWorkflowStage(wv.Id, 1, "Apply", pv.Id, LabServiceWorkflowStageRequirement.Required, null, null);
            var tray = new LabTrayFormat(new("TEST mix tray", 1, 3, "numeric", []));
            var batch = new LabPreparationBatch("TEST mix application", tray, wv.Id); batch.AssignTray("TEST-MIX-TRAY-" + scope.Suffix, false);
            db.AddRange(protocol, pv, workflow, wv, stage, tray, batch);
            var members = new List<LabPreparationMember>(); var executions = new List<LabProtocolExecution>(); var workIds = new List<Guid>(); var specimenIds = new List<Guid>();
            for (var i = 0; i < 3; i++)
            {
                var organization = i == 2 ? scope.OtherCustomerOrganization : scope.CustomerOrganization;
                var order = new LabServiceOrder(organization.Id, organization.Departments.Single(d => d.IsDefault).Id,
                    $"MIX-{scope.Suffix}-{i}", $"TEST ONLY mix {i}", null, 1, false, "TEST source", "Frozen", "TEST safe", "TEST instructions");
                var sample = new LabSample(order.Id, i == 2 ? "FOREIGN-ONLY" : $"MIX-{i}", "RNA", "TEST source", 1, "uL", "Frozen", "TEST safe", null, null, null, "[]");
                order.Samples.Add(sample);
                var work = new LabWorkOrder(Guid.NewGuid(), 1, LabAuthorizationSource.CommercialOrder, order.Id, organization.Id, workflow.ServiceKey, 1, "test", null, wv.Id);
                work.RecordMilestone(LabWorkOrderStatus.Received);
                var specimen = new LabSpecimen(work.Id, sample.Id); specimen.RecordReceipt(now, "TEST ONLY", "TEST freezer"); specimen.AssignAccession($"MIX-{scope.Suffix}-{i}"); work.Specimens.Add(specimen);
                var tube = new LabContainer(work.Id, specimen.Id, null, LabContainerKind.SubmittedSpecimen, $"MIX-TUBE-{scope.Suffix}-{i}", "TEST tube", "TEST freezer", 1, "uL", null);
                tube.ReviewIntake(LabSpecimenIntakeDisposition.Accepted, null, null, actor, now);
                var attempt = new LabSpecimenAttempt(work.Id, specimen.Id, tube.Id, wv.Id, 1, null); attempt.Start(tube.Barcode, tube.Barcode, now);
                var execution = new LabProtocolExecution(work.Id, specimen.Id, pv.Id, actor, stage.Id); execution.AttachAttempt(attempt); execution.Start(now);
                var member = new LabPreparationMember(batch.Id, attempt.Id, (i + 1).ToString(), tube.Barcode);
                db.AddRange(order, work, tube, attempt, execution, member); members.Add(member); executions.Add(execution); workIds.Add(work.Id); specimenIds.Add(specimen.Id);
            }
            batch.Start(members, true, now); await db.SaveChangesAsync();
            var input = new LabPreparationStepInput(stage.Id, "apply", "record", "recorded", members.Select(m => m.Id).ToArray(), new Dictionary<string, JsonElement>(), [], null, null, true, true, true,
                [new("mix", ResourceId: mix.Id, ResourceVersion: mix.Version, Quantity: 2, QuantityUnit: "uL", MixBarcode: mix.Barcode),
                    new("mix", members[1].Id, mix.Id, mix.Version, 0, "uL", ExceptionReason: "No mix dispensed to this sample", Disposition: "continue", MixBarcode: mix.Barcode),
                    new("shared-equipment", ResourceId: equipment.Id, RunReference: " SHARED-RUN "),
                    new("tube-equipment", members[0].Id, equipment.Id, RunReference: "RUN-A"),
                    new("tube-equipment", members[1].Id, equipment.Id, RunReference: "RUN-B"),
                    new("tube-equipment", members[2].Id, equipment.Id, RunReference: "FOREIGN-ONLY-RUN")], new("now", true));
            var command = new LabPreparationCommand(Guid.NewGuid(), batch.Version, "step", Step: input);
            var record = new LabPreparationRecord(command.RequestId, batch.Id, actor, "step", new string('A', 64), JsonSerializer.Serialize(command, JsonSerializerOptions.Web), now);
            for (var i = 0; i < executions.Count; i++) executions[i].RecordStep(pv,
                new("apply", "record", "recorded", new Dictionary<string, JsonElement> {
                    ["mix"] = JsonSerializer.SerializeToElement(i == 1 ? "Recorded zero use" : mix.Barcode),
                    ["shared-equipment"] = JsonSerializer.SerializeToElement(equipment.AssetCode),
                    ["tube-equipment"] = JsonSerializer.SerializeToElement(equipment.AssetCode) },
                    true, true, null, null, record.Id, new("now", true)), actor, new HashSet<LabRole> { LabRole.Operator }, now);
            var dispensing = new LabMasterMixTrayUse(mix.Id, batch.Id, record.Id, "mix", 4, "uL", actor, now); mix.Use(4, now);
            db.LabEquipmentUsages.Add(new(executions[0].Id, equipment.Id, now, actor, "SHARED-RUN", record.Id, "{}"));
            for (var i = 0; i < executions.Count; i++) db.LabEquipmentUsages.Add(new(executions[i].Id, equipment.Id, now, actor,
                i == 2 ? "FOREIGN-ONLY-RUN" : i == 0 ? "RUN-A" : "RUN-B", record.Id, "{}"));
            db.AddRange(record, dispensing); await db.SaveChangesAsync();
            var controller = scope.CreatePreparationController(db);
            var related = JsonSerializer.SerializeToElement(await controller.RelatedInvestigationSamples(workIds[0], "lot", source.LotNumber, default), JsonSerializerOptions.Web);
            Assert.Equal(specimenIds[0], Assert.Single(related.EnumerateArray()).GetProperty("id").GetGuid());
            var foreign = JsonSerializer.SerializeToElement(await controller.RelatedInvestigationSamples(workIds[2], "lot", source.LotNumber, default), JsonSerializerOptions.Web);
            Assert.Equal(specimenIds[2], Assert.Single(foreign.EnumerateArray()).GetProperty("id").GetGuid());
            var evidence = await controller.Investigation(workIds[0], specimenIds[0], default);
            var json = JsonSerializer.SerializeToElement(evidence, JsonSerializerOptions.Web);
            Assert.Single(json.GetProperty("evidence").GetProperty("masterMixes").EnumerateArray());
            Assert.Equal(source.Id, json.GetProperty("evidence").GetProperty("masterMixes")[0].GetProperty("ingredients")[0].GetProperty("sourceMaterialLotId").GetGuid());
            Assert.Equal(frozenEquipment.ResourceSnapshotJson, json.GetProperty("evidence").GetProperty("masterMixes")[0].GetProperty("stepPerformance")[0].GetProperty("evidence").GetProperty("equipmentUses")[0].GetProperty("resourceSnapshotJson").GetString());
            mixingEquipment.Retire("TEST later retirement", actor, DateTime.UtcNow);
            await db.SaveChangesAsync();
            var equipmentExposure = JsonSerializer.SerializeToElement(await controller.RelatedInvestigationSamples(workIds[0], "equipment", mixingEquipment.AssetCode, default), JsonSerializerOptions.Web);
            Assert.Equal(specimenIds[0], Assert.Single(equipmentExposure.EnumerateArray()).GetProperty("id").GetGuid());
            var foreignEquipmentExposure = JsonSerializer.SerializeToElement(await controller.RelatedInvestigationSamples(workIds[2], "equipment", mixingEquipment.AssetCode, default), JsonSerializerOptions.Web);
            Assert.Equal(specimenIds[2], Assert.Single(foreignEquipmentExposure.EnumerateArray()).GetProperty("id").GetGuid());
            Assert.DoesNotContain("FOREIGN-ONLY", json.GetRawText());
            Assert.DoesNotContain("RUN-B", json.GetRawText());
            var frozenIngredient = json.GetProperty("evidence").GetProperty("masterMixes")[0].GetProperty("ingredients")[0].GetProperty("resourceSnapshotJson").GetString();
            Assert.Equal("Passed", JsonDocument.Parse(frozenIngredient!).RootElement.GetProperty("qcDisposition").GetString());
            source.RecordQc(LabQcDisposition.Failed, DateOnly.FromDateTime(now), "TEST changed later", "{}", actor, now);
            await db.SaveChangesAsync();
            var laterEvidence = JsonSerializer.SerializeToElement(await controller.Investigation(workIds[0], specimenIds[0], default), JsonSerializerOptions.Web);
            Assert.Equal(frozenEquipment.ResourceSnapshotJson, laterEvidence.GetProperty("evidence").GetProperty("masterMixes")[0].GetProperty("stepPerformance")[0].GetProperty("evidence").GetProperty("equipmentUses")[0].GetProperty("resourceSnapshotJson").GetString());
            Assert.Equal(frozenIngredient, laterEvidence.GetProperty("evidence").GetProperty("masterMixes")[0].GetProperty("ingredients")[0].GetProperty("resourceSnapshotJson").GetString());
            var instrument = Assert.Single(json.GetProperty("evidence").GetProperty("preparationResources").EnumerateArray(),
                resource => resource.GetProperty("resourceType").GetString() == "equipment");
            Assert.Equal(new[] { "RUN-A", "SHARED-RUN" }, instrument.GetProperty("recordedEquipmentUses").EnumerateArray()
                .Select(use => use.GetProperty("runReference").GetString()).Order().ToArray());
            var instrumentRelated = JsonSerializer.SerializeToElement(await controller.RelatedInvestigationSamples(workIds[0], "equipment", equipment.AssetCode, default), JsonSerializerOptions.Web);
            Assert.Equal(specimenIds.Take(2).Order(), instrumentRelated.EnumerateArray().Select(sample => sample.GetProperty("id").GetGuid()).Order());
            var zero = await controller.Investigation(workIds[1], specimenIds[1], default);
            Assert.Equal("equipment", Assert.Single(JsonSerializer.SerializeToElement(zero.Evidence["preparationResources"]).EnumerateArray()).GetProperty("resourceType").GetString());
            Assert.Empty(JsonSerializer.SerializeToElement(zero.Evidence["masterMixes"]).EnumerateArray());
            // Simulate an older receipt without inventing calibration history; this is a rollback-only fixture.
            var originalMixStep = await db.LabMasterMixStepRecords.AsNoTracking().SingleAsync(s => s.PreparationId == mix.Id);
            var oldShape = JsonSerializer.Serialize(JsonSerializer.Deserialize<LabProtocolStepRecord>(originalMixStep.EvidenceJson, JsonSerializerOptions.Web)! with { EquipmentUses = null }, JsonSerializerOptions.Web);
            await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE lab_ops.lab_master_mix_steps SET evidence_json = {oldShape}::jsonb WHERE id = {originalMixStep.Id}");
            var unknownExposure = await Assert.ThrowsAsync<PhaenoPortal.App.Features.OrderManagement.Services.OrderManagementException>(() => controller.RelatedInvestigationSamples(workIds[0], "equipment", mixingEquipment.AssetCode, default));
            Assert.Equal("investigation_exposure_unknown", unknownExposure.ErrorCode);
            var unknownEvidence = await controller.Investigation(workIds[0], specimenIds[0], default);
            Assert.Contains(unknownEvidence.Coverage, c => c.Area == "Resource snapshots" && c.Status == "Legacy unknown");
            await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE lab_ops.lab_master_mix_steps SET evidence_json = {originalMixStep.EvidenceJson}::jsonb WHERE id = {originalMixStep.Id}");
            dispensing.VoidUndispensed(actor, now); await db.SaveChangesAsync();
            Assert.Empty(JsonSerializer.SerializeToElement(await controller.RelatedInvestigationSamples(workIds[0], "lot", source.LotNumber, default)).EnumerateArray());
            Assert.Empty(JsonSerializer.SerializeToElement(await controller.RelatedInvestigationSamples(workIds[0], "equipment", mixingEquipment.AssetCode, default)).EnumerateArray());
            var afterVoid = JsonSerializer.SerializeToElement(await controller.Investigation(workIds[0], specimenIds[0], default), JsonSerializerOptions.Web);
            var voidedMix = Assert.Single(afterVoid.GetProperty("evidence").GetProperty("preparationResources").EnumerateArray(),
                resource => resource.GetProperty("resourceType").GetString() == "masterMix");
            Assert.NotEqual(JsonValueKind.Null, voidedMix.GetProperty("recordedMixUses")[0].GetProperty("voidedAtUtc").ValueKind);
            Assert.Equal(9, (await db.LabMaterialLots.AsNoTracking().SingleAsync(l => l.Id == source.Id)).AvailableQuantity);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }

    [PostgreSqlReferenceFact]
    public async Task InvestigationIncludesFrozenFailedVendorHistoryWithoutCurrentMembershipOrOtherSampleDetails()
    {
        await using var scope = await ShippingTestScope.CreateAsync();
        await using var transaction = await scope.DbContext.Database.BeginTransactionAsync();
        try
        {
            var fixture = await SeedRestoreEvidence(scope, new PreparationReportTestFiles(), includeResult: false);
            var db = scope.DbContext; var controller = scope.CreatePreparationController(db); var now = LabEvidenceTime.UtcNow;
            await controller.GenerateInvestigationReport(fixture.WorkId, fixture.SpecimenId, new(Guid.NewGuid()), default);
            var originalReport = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.LabSpecimenId == fixture.SpecimenId);
            var library = await db.LabLibraries.AsNoTracking().SingleAsync(l => l.LabSpecimenId == fixture.SpecimenId);
            var definition = new LabMaterialDefinition("orphan-" + scope.Suffix, "TEST ONLY recorded resource", LabMaterialLotKind.PreparedReagent);
            var location = new LabStorageLocation("TEST-ORPHAN-" + scope.Suffix);
            var lot = new LabMaterialLot(LabMaterialLotKind.PreparedReagent, definition.Id, "ORPHAN-" + scope.Suffix, null, null, location.Id, 9, "uL");
            db.AddRange(definition, location, lot);
            db.LabMaterialConsumptions.Add(new(library.PreparationExecutionId, lot.Id, null, 1, "uL", scope.PlatformUser.Id, now, fixture.RecordId, "{}"));
            var selectedMember = Guid.NewGuid(); var otherMember = Guid.NewGuid(); var otherLibrary = Guid.NewGuid();
            var batch = new LabOperationalBatch("TEST-FROZEN-" + scope.Suffix, "TEST ONLY frozen vendor history", null);
            var manifest = JsonSerializer.Serialize(new { schemaVersion = 3, members = new[] {
                new { memberId = selectedMember, libraryId = library.Id, libraryKey = library.LibraryKey },
                new { memberId = otherMember, libraryId = otherLibrary, libraryKey = "OTHER-SAMPLE-SECRET" } } });
            var sendout = new LabNgsSendout(batch.Id, "TEST vendor", "TEST submission", manifest, null);
            db.AddRange(batch, sendout); await db.SaveChangesAsync();
            foreach (var number in new[] { 1, 2 })
            {
                var snapshot = new VendorResultsSnapshot(batch.Id, batch.BatchNumber, batch.Name, sendout.Id, "TEST vendor", "TEST vendor job",
                    true, null, null, null, "Failure", "Shared batch explanation", now, manifest,
                    [new(selectedMember, library.Id, library.LibraryKey, "Failure", "Selected library run not performed"),
                        new(otherMember, otherLibrary, "OTHER-SAMPLE-SECRET", "Failure", "OTHER-SAMPLE-SECRET")], [], []);
                var version = new LabVendorResultsVersion(Guid.NewGuid(), sendout.Id, number,
                    JsonSerializer.Serialize(snapshot, JsonSerializerOptions.Web), number == 1 ? null : "Corrected vendor evidence",
                    scope.PlatformUser.Id, "TEST operator", now);
                db.LabVendorResultsVersions.Add(version);
                db.LabCustodyEvents.Add(LabCustodyEvent.ForCommand(version.Id, sendout.Id,
                    number == 1 ? "VENDOR_RUN_NOT_PERFORMED" : "VENDOR_RESULTS_CORRECTED", "TEST vendor",
                    JsonSerializer.Serialize(new { resultVersion = number, previous = new { secret = "OTHER-SAMPLE-SECRET" },
                        exceptions = new[] { new { memberId = otherMember, reason = "OTHER-SAMPLE-SECRET" } } }), scope.PlatformUser.Id, now));
            }
            await db.SaveChangesAsync();
            Assert.False(await db.LabBatchMembers.AnyAsync(m => m.LabOperationalBatchId == batch.Id));
            var investigation = await controller.Investigation(fixture.WorkId, fixture.SpecimenId, default);
            var json = JsonSerializer.SerializeToElement(investigation, JsonSerializerOptions.Web);
            Assert.Equal(2, json.GetProperty("evidence").GetProperty("vendorResults").GetArrayLength());
            Assert.Equal(lot.Id, Assert.Single(json.GetProperty("evidence").GetProperty("materials").EnumerateArray()).GetProperty("labMaterialLotId").GetGuid());
            Assert.Contains(investigation.Coverage, c => c.Area == "Resource snapshots" && c.Status == "Legacy unknown");
            Assert.All(json.GetProperty("evidence").GetProperty("vendorResults").EnumerateArray(), version =>
            {
                Assert.True(version.GetProperty("runNotPerformed").GetBoolean());
                Assert.Equal(library.Id, Assert.Single(version.GetProperty("libraries").EnumerateArray()).GetProperty("libraryId").GetGuid());
            });
            Assert.Contains(json.GetProperty("evidence").GetProperty("custody").EnumerateArray(), e => e.GetProperty("eventCode").GetString() == "VENDOR_RESULTS_CORRECTED");
            Assert.DoesNotContain("OTHER-SAMPLE-SECRET", json.GetRawText());
            Assert.DoesNotContain(otherMember.ToString(), json.GetRawText());
            var limited = await new LabInvestigationService(db).ReadAsync(fixture.WorkId, fixture.SpecimenId, default, 1);
            Assert.NotEmpty(limited.LimitedSections);
            var saved = JsonSerializer.SerializeToElement(await controller.GenerateInvestigationReport(fixture.WorkId, fixture.SpecimenId, new(Guid.NewGuid()), default), JsonSerializerOptions.Web);
            var report = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == saved.GetProperty("id").GetGuid());
            Assert.Contains("vendorResults", report.BodyJson); Assert.Contains("Selected library run not performed", report.BodyJson);
            Assert.DoesNotContain("OTHER-SAMPLE-SECRET", report.BodyJson);
            var unchanged = await db.LabInvestigationReports.AsNoTracking().SingleAsync(r => r.Id == originalReport.Id);
            Assert.Equal(originalReport.BodyJson, unchanged.BodyJson); Assert.Equal(originalReport.Sha256, unchanged.Sha256);
        }
        finally { await transaction.RollbackAsync(); scope.ClearTrackedState(); }
    }
}
