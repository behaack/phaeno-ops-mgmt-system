namespace PhaenoPortal.App.Features.LabOperations.Controllers;

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using PSeq.Operations.Laboratory.Domain;
using PhaenoPortal.App.Features.LabOperations.DTOs;

public sealed partial class LabOperationsController
{
    private async Task RequireMaterialExceptionReviewAsync(LabSpecimenAttempt attempt, bool supervisor, CancellationToken ct)
    {
        var memberships = await dbContext.LabPreparationMembers.AsNoTracking()
            .Where(m => m.LabSpecimenAttemptId == attempt.Id).Select(m => new { m.Id, m.LabPreparationBatchId }).ToListAsync(ct);
        var batchIds = memberships.Select(m => m.LabPreparationBatchId).ToArray();
        var memberIds = memberships.Select(m => m.Id).ToHashSet();
        var records = await dbContext.LabPreparationRecords.AsNoTracking()
            .Where(r => batchIds.Contains(r.LabPreparationBatchId) && r.Action == "step").Select(r => r.DetailsJson).ToListAsync(ct);
        var exceptions = records.Select(r => JsonSerializer.Deserialize<LabPreparationCommand>(r, JsonOptions))
            .SelectMany(r => r?.Step?.ResourceEntries ?? []).Where(e => e.MemberId.HasValue && memberIds.Contains(e.MemberId.Value) && e.Disposition == "hold").ToArray();
        if (exceptions.Length == 0) return;
        if (!supervisor) throw Conflict("material_exception_review_required", "A Supervisor must review and resolve this material exception hold.");
        var uncertainLotIds = exceptions.Where(e => e.AmountUnknown && e.ResourceId.HasValue).Select(e => e.ResourceId!.Value).ToArray();
        if (await dbContext.LabMaterialLots.AnyAsync(l => uncertainLotIds.Contains(l.Id) && l.QuantityHoldReason != null, ct))
            throw Conflict("material_quantity_reconciliation_required", "Reconcile the uncertain material lot balance in Materials before resolving this tube hold.");
    }

    // Operational choices use the existing preparation authorization; supplier administration remains separate.
    private async Task<IReadOnlyList<SupplierCatalogEntryDto>> PreparationMaterialCatalogAsync(CancellationToken ct)
    {
        var suppliers = await dbContext.LabSuppliers.AsNoTracking().Where(s => s.IsActive && !s.IsInternalProducer).OrderBy(s => s.Name).ToListAsync(ct);
        var products = await (from p in dbContext.LabSupplierProducts.AsNoTracking()
            join t in dbContext.LabProductTypes.AsNoTracking() on p.ProductTypeId equals t.Id
            where p.IsActive && t.IsActive
            orderby p.ProductNumber
            select new SupplierCatalogProductDto(p.Id, p.SupplierId, p.ProductNumber, p.Description, t.KitUse.ToString(), p.IsActive, p.Version, t.Id, t.Name, t.IsActive, p.CanExpire, p.DefaultQuantityUnit)).ToListAsync(ct);
        return suppliers.Select(s => new SupplierCatalogEntryDto(s.Id, s.Name, s.IsActive, s.Version, products.Where(p => p.SupplierId == s.Id).ToArray())).ToArray();
    }

    private static IReadOnlyList<LabProtocolCaptureDefinition> PreparationResourceFields(LabProtocolStepDefinition step)
    {
        var fields = step.Captures.Where(c => c.IsResource).ToList();
        void Legacy(IEnumerable<string> labels, string type) => fields.AddRange(labels.Select((label, i) => new LabProtocolCaptureDefinition
        {
            Key = $"_legacy_{type}_{i}", Label = label, Type = type, Scope = type == "output" ? "tube" : "batch",
            Required = false, IncludeTracking = type != "output", QuantityBasis = type == "material" ? "total" : null
        }));
        Legacy(step.InputMaterials, "material");
        Legacy(step.EquipmentTypes, "equipment");
        if (step.PreparedOutputs.Count > 0 && !fields.Any(f => f.Type == "output")) Legacy([string.Join(", ", step.PreparedOutputs)], "output");
        return fields;
    }

    private async Task<Dictionary<Guid, Dictionary<string, JsonElement>>> RecordPreparationFieldsAsync(
        LabProtocolStepDefinition step, LabPreparationStepInput input, List<LabPreparationMember> members,
        List<LabSpecimenAttempt> attempts, List<LabProtocolExecution> executions, LabPreparationCommand request, Guid actorId, CancellationToken ct)
    {
        var fields = PreparationResourceFields(step);
        var entries = input.ResourceEntries ?? [];
        var result = input.CoveredMemberIds.ToDictionary(id => id, _ => new Dictionary<string, JsonElement>());
        if (input.SharedCaptures.Keys.Concat(input.Tubes.SelectMany(t => t.Captures.Keys)).Any(key => step.Captures.Any(c => c.Key == key && c.IsResource)))
            throw new ArgumentException("Resource identities are resolved from the step's resource fields, not manually supplied values.");
        if (entries.Count > fields.Count * (members.Count + 1) || entries.Any(e => e is null)
            || entries.Select(e => (e.FieldKey, e.MemberId)).Distinct().Count() != entries.Count
            || entries.Any(e => !fields.Any(f => f.Key == e.FieldKey && (f.Scope == "batch" ? e.MemberId is null : f.Scope == "shared" ? e.MemberId is null || input.CoveredMemberIds.Contains(e.MemberId.Value) : e.MemberId.HasValue && input.CoveredMemberIds.Contains(e.MemberId.Value)))))
            throw new ArgumentException("Resource fields must match the defined fields and included tubes, without duplicates.");
        if (input.Outcome == "skipped")
        {
            if (entries.Count > 0) throw new ArgumentException("A skipped step cannot record resource use or create outputs.");
            return result;
        }
        if (input.Action == "correct")
        {
            if (entries.Count > 0) throw new ArgumentException("A correction retains recorded resource use. Arrange a separate inventory or output correction when needed.");
            foreach (var member in members.Where(m => result.ContainsKey(m.Id)))
            {
                var previous = LabProtocolEvidence.Read(executions.Single(e => e.LabSpecimenAttemptId == member.LabSpecimenAttemptId).CapturedResultsJson)
                    .Records.LastOrDefault(r => r.StepKey == step.Key);
                foreach (var field in step.Captures.Where(c => c.IsResource))
                    if (previous?.Captures.TryGetValue(field.Key, out var value) == true) result[member.Id][field.Key] = value.Clone();
            }
            return result;
        }
        var uncertainLots = new Dictionary<Guid, (LabMaterialLot Lot, string Reason)>();
        var exhaustedLots = new Dictionary<Guid, LabMaterialLot>();
        foreach (var entry in entries)
        {
            var field = fields.Single(f => f.Key == entry.FieldKey);
            if (field.Type != "biologicalMaterial" && entry.QuantityText is not null)
                throw new ArgumentException("Decimal text amounts are only available for biological material transfers.");
            if (field.Type != "biologicalMaterial" && (entry.ExhaustionReason is not null || entry.Barcode is not null || entry.SourceBarcode is not null))
                throw new ArgumentException("A biological material field is required to confirm a tube transfer or exhausted source.");
            if (entry.MaterialExhausted && field.Type != "biologicalMaterial" && !(field.Type == "material" && field.IncludeTracking))
                throw new ArgumentException("Material exhausted requires a tracked material lot or a biological source tube.");
            var isException = field.Type == "material" && field.Scope == "shared" && entry.MemberId.HasValue;
            if (!isException && (entry.AmountUnknown || entry.ExceptionReason is not null || entry.Disposition is not null))
                throw new ArgumentException("Material exceptions require shared material recording and an included tube.");
            if (!isException) continue;
            if (string.IsNullOrWhiteSpace(entry.ExceptionReason) || entry.ExceptionReason.Length > 2000) throw new ArgumentException("Record a material exception reason using 2,000 characters or fewer.");
            if (entry.Disposition is not ("continue" or "hold" or "fail")) throw new ArgumentException("Choose a disposition for each material exception.");
            if (entry.AmountUnknown && (entry.Quantity.HasValue || entry.Disposition == "continue")) throw new ArgumentException("Unknown amounts must be held or failed and cannot include a guessed quantity.");
            var common = entries.SingleOrDefault(e => e.FieldKey == entry.FieldKey && e.MemberId is null)
                ?? throw new ArgumentException("Record the common material amount and lot before sample exceptions.");
            if (entry.ResourceId != common.ResourceId || entry.ResourceVersion != common.ResourceVersion || entry.QuantityUnit != common.QuantityUnit)
                throw new ArgumentException("Sample amount exceptions must retain the common lot and unit.");
        }
        // Input transfers precede yield measurement even when authors reorder the displayed fields.
        foreach (var field in fields.OrderBy(f => f.Type == "output" ? 1 : 0))
        {
            var targets = field.Scope == "batch" ? new Guid?[] { null } : field.Scope == "shared" ? new Guid?[] { null }.Concat(entries.Where(e => e.FieldKey == field.Key && e.MemberId.HasValue).Select(e => e.MemberId)).ToArray() : input.CoveredMemberIds.Select(id => (Guid?)id).ToArray();
            foreach (var target in targets)
            {
                var covered = target.HasValue ? new[] { target.Value } : input.CoveredMemberIds.Where(id => field.Scope != "shared" || !entries.Any(e => e.FieldKey == field.Key && e.MemberId == id)).ToArray();
                var entry = entries.SingleOrDefault(e => e.FieldKey == field.Key && e.MemberId == target);
                string? display = null;
                if (field.Type == "biologicalMaterial")
                {
                    var member = members.Single(m => m.Id == target);
                    display = await RecordPreparationBiologicalMaterialAsync(field, entry, member, attempts.Single(a => a.Id == member.LabSpecimenAttemptId), input, request, actorId, ct);
                }
                else if (field.Type == "output")
                {
                    var member = members.Single(m => m.Id == target);
                    LabContainer? output = null;
                    if (member.OutputContainerId.HasValue)
                    {
                        if (entry is not null) throw new ArgumentException("An output already exists for this tube. Retain its identity rather than creating it again.");
                        output = await dbContext.LabContainers.SingleAsync(c => c.Id == member.OutputContainerId && c.LabSpecimenAttemptId == member.LabSpecimenAttemptId, ct);
                        if (output.Status != LabContainerStatus.Available) throw new InvalidOperationException("The existing output is not available.");
                    }
                    else if (entry is not null)
                    {
                        RequireFieldQuantity(entry, field.Label);
                        if (string.IsNullOrWhiteSpace(entry.Location) || entry.Location.Length > 255) throw new ArgumentException($"{field.Label}: enter the storage location.");
                        output = await PreparationOutputAsync(member, attempts.Single(a => a.Id == member.LabSpecimenAttemptId), request with
                        {
                            Quantity = entry.Quantity, QuantityUnit = entry.QuantityUnit!.Trim(), Location = entry.Location.Trim(), OutputContainerId = null
                        }, actorId, ct);
                    }
                    if (output is not null) display = $"{output.Barcode} · {output.Quantity} {output.QuantityUnit} · {output.Location} · Container {output.Id}";
                }
                else if (entry is not null)
                {
                    var name = field.Type == "material" ? field.Material?.Name ?? field.Label : entry.Name?.Trim();
                    if (field.Type == "material" && (entry.ProductId.HasValue || entry.Name is not null || entry.Vendor is not null))
                        throw new ArgumentException("Material identity is fixed by the step configuration. Record only quantity and the requested lot.");
                    if (field.Type != "material" && (entry.ProductId.HasValue || entry.Vendor is not null)) throw new ArgumentException("Product and vendor are configured only for materials.");
                    if (field.Type == "material" && !field.IncludeTracking && entry.ResourceId.HasValue) throw new ArgumentException("This field does not include lot tracking.");
                    if (field.Material?.Vendor is { Length: > 0 } vendor) name += $" · Vendor {vendor}";
                    if (field.Material?.ProductId is Guid productId) name += $" · Product {field.Material.ProductNumber} · {productId}";
                    if (field.Type == "material")
                    {
                        var isException = field.Scope == "shared" && target.HasValue;
                        if (!entry.AmountUnknown)
                        {
                            if (isException && entry.Quantity == 0) { if (string.IsNullOrWhiteSpace(entry.QuantityUnit)) throw new ArgumentException("A quantity unit is required."); }
                            else RequireFieldQuantity(entry, field.Label);
                        }
                        if (!string.IsNullOrWhiteSpace(field.Unit) && !string.Equals(field.Unit.Trim(), entry.QuantityUnit?.Trim(), StringComparison.Ordinal))
                            throw new ArgumentException($"{field.Label}: use the quantity unit defined by this step ({field.Unit}).");
                        if (entry.Quantity > decimal.MaxValue / Math.Max(1, covered.Length)) throw new ArgumentException("The total quantity is too large.");
                        var total = entry.AmountUnknown ? 0 : !target.HasValue && field.Scope is "batch" or "shared" && field.QuantityBasis != "total" ? entry.Quantity!.Value * covered.Length : entry.Quantity!.Value;
                        if (field.IncludeTracking)
                        {
                            var lot = await dbContext.LabMaterialLots.SingleOrDefaultAsync(l => l.Id == entry.ResourceId, ct) ?? throw Missing();
                            if (!string.IsNullOrWhiteSpace(field.Unit) && !string.Equals(field.Unit.Trim(), lot.QuantityUnit.Trim(), StringComparison.Ordinal))
                                throw new ArgumentException($"{field.Label}: choose a lot using the configured unit ({field.Unit}).");
                            if (!lot.MatchesConfiguredMaterial(field.Material)) throw new ArgumentException("Choose a lot of the exact product or prepared reagent defined by this step. Unlinked purchased lots need a product assignment in Materials.");
                            EnsureVersion(lot.Version, entry.ResourceVersion ?? -1);
                            if (lot.QuantityHoldReason is not null) throw new InvalidOperationException("Reconcile this lot’s quantity before further use.");
                            if (lot.QcDisposition is not (LabQcDisposition.Passed or LabQcDisposition.ApprovedException) || lot.ExpirationOrRetestDate < DateOnly.FromDateTime(DateTime.UtcNow))
                                throw new InvalidOperationException("The material lot must be released and within date.");
                            if (entry.AmountUnknown) uncertainLots[lot.Id] = (lot, entry.ExceptionReason!);
                            if (entry.MaterialExhausted) exhaustedLots[lot.Id] = lot;
                            if (total > 0 && covered.Length > 0) await PreparationResourceAsync(members, attempts, request with { Action = "material", StageId = input.StageId, Confirmed = true,
                                CoveredMemberIds = covered, ResourceId = lot.Id, ResourceVersion = entry.ResourceVersion, Quantity = total, QuantityUnit = entry.QuantityUnit, MaterialExhausted = false }, actorId, ct);
                            var materialName = await dbContext.LabMaterialDefinitions.Where(m => m.Id == lot.MaterialDefinitionId).Select(m => m.Name).SingleAsync(ct);
                            name = $"{(string.IsNullOrWhiteSpace(name) ? materialName : name)} · Lot {lot.LotNumber} · {lot.Id}";
                        }
                        display = entry.AmountUnknown ? $"{name} · Amount unknown ({entry.QuantityUnit})" : $"{name} · {entry.Quantity} {entry.QuantityUnit}{(!target.HasValue && field.Scope is "batch" or "shared" && field.QuantityBasis != "total" ? $" per sample · {total} {entry.QuantityUnit} total" : " total")}";
                        if (isException) display += $" · Exception: {entry.ExceptionReason} · Disposition: {entry.Disposition}";
                        if (entry.MaterialExhausted) display += " · Lot exhausted (operator override after all recorded use)";
                    }
                    else
                    {
                        if (entry.RunReference?.Length > 1000) throw new ArgumentException("Use a run reference of at most 1000 characters.");
                        if (!entry.ResourceId.HasValue) throw new ArgumentException("Select the equipment used.");
                        var equipment = await dbContext.LabEquipment.SingleOrDefaultAsync(e => e.Id == entry.ResourceId, ct) ?? throw Missing();
                        await PreparationResourceAsync(members, attempts, request with { Action = "equipment", StageId = input.StageId, Confirmed = true,
                            CoveredMemberIds = covered, ResourceId = equipment.Id, Reason = entry.RunReference }, actorId, ct);
                        name = $"{equipment.Name} · Equipment barcode {equipment.AssetCode} · {equipment.Id}";
                        display = name + (string.IsNullOrWhiteSpace(entry.RunReference) ? "" : $" · Run {entry.RunReference.Trim()}");
                    }
                }
                if (display is null && (field.Required || field.Type == "equipment")) throw new ArgumentException($"{field.Label} is required for every included sample.");
                if (display is not null && step.Captures.Any(c => c.Key == field.Key))
                    foreach (var id in covered) result[id][field.Key] = JsonSerializer.SerializeToElement(display);
            }
        }
        if (exhaustedLots.Keys.Any(uncertainLots.ContainsKey)) throw new ArgumentException("Resolve unknown material amounts before confirming a lot exhausted. Unknown sample usage still requires quantity reconciliation.");
        foreach (var lot in exhaustedLots.Values) lot.ConfirmExhausted(request.RequestId, actorId, DateTime.UtcNow);
        foreach (var item in uncertainLots.Values) item.Lot.HoldQuantity(item.Reason, request.RequestId, actorId, DateTime.UtcNow);
        return result;
    }

    private static void RequireFieldQuantity(LabPreparationResourceFieldInput entry, string label)
    {
        if (entry.Quantity is null or <= 0 || string.IsNullOrWhiteSpace(entry.QuantityUnit) || entry.QuantityUnit.Length > 50)
            throw new ArgumentException($"{label}: enter a positive quantity and its unit.");
    }
}
