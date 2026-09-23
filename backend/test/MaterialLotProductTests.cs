namespace PhaenoPortal.Test;

using PSeq.Operations.Laboratory.Domain;

public class MaterialLotProductTests
{
    [Fact]
    public void ProductExpirationDefaultsFalseAndOmittedEditsPreserveTheRule()
    {
        var product = new LabSupplierProduct(Guid.NewGuid(), "TEST", "TEST reagent", LabProductType.ReagentId);
        Assert.False(product.CanExpire);
        product.Update(product.ProductNumber, product.Description, product.ProductTypeId, true, true);
        product.Update(product.ProductNumber, "Corrected description", product.ProductTypeId, false);
        Assert.True(product.CanExpire);
        product.Update(product.ProductNumber, product.Description, product.ProductTypeId, true, false);
        Assert.False(product.CanExpire);
    }

    [Fact]
    public void UnknownConsumptionBlocksAllUseUntilAuditedReconciliation()
    {
        var lot = new LabMaterialLot(LabMaterialLotKind.PreparedReagent, Guid.NewGuid(), "TEST", null, null, Guid.NewGuid(), 100, "µL");
        lot.Consume(20);
        lot.HoldQuantity("Unknown amount in tube B", Guid.NewGuid(), Guid.NewGuid(), DateTime.UtcNow);
        Assert.Equal(80, lot.AvailableQuantity);
        Assert.Throws<InvalidOperationException>(() => lot.Consume(1));
        Assert.Throws<ArgumentException>(() => lot.ReconcileQuantity(81, "Counted", Guid.NewGuid(), DateTime.UtcNow));
        lot.ReconcileQuantity(65, "Measured remaining volume", Guid.NewGuid(), DateTime.UtcNow);
        Assert.Null(lot.QuantityHoldReason);
        Assert.Equal(65, lot.AvailableQuantity);
        Assert.Contains("Unknown amount", lot.QuantityHistoryJson);
        Assert.Contains("Measured remaining volume", lot.QuantityHistoryJson);
        lot.Consume(5);
        Assert.Equal(60, lot.AvailableQuantity);
    }

    [Fact]
    public void PurchasedLotRequiresExactProductAndAssignmentCannotReplaceIdentity()
    {
        var supplier = Guid.NewGuid(); var product = Guid.NewGuid();
        var lot = new LabMaterialLot(LabMaterialLotKind.SupplierLot, Guid.NewGuid(), "TEST", supplier, null, Guid.NewGuid(), 10, "mL");
        var configured = new LabConfiguredMaterial("TEST product", ProductId: product, SupplierId: supplier);
        Assert.False(lot.MatchesConfiguredMaterial(configured));
        Assert.Throws<ArgumentException>(() => lot.AssignProduct(product, Guid.NewGuid()));
        lot.AssignProduct(product, supplier);
        Assert.True(lot.MatchesConfiguredMaterial(configured));
        Assert.False(lot.MatchesConfiguredMaterial(configured with { ProductId = Guid.NewGuid() }));
        Assert.False(lot.MatchesConfiguredMaterial(configured with { SupplierId = Guid.NewGuid() }));
        Assert.Throws<InvalidOperationException>(() => lot.AssignProduct(Guid.NewGuid(), supplier));
        Assert.Equal(10, lot.AvailableQuantity);
        Assert.Equal(LabQcDisposition.Pending, lot.QcDisposition);
    }

    [Fact]
    public void PreparedLotMatchesOnlyItsDefinitionAndCannotTakeProduct()
    {
        var definition = Guid.NewGuid();
        var lot = new LabMaterialLot(LabMaterialLotKind.PreparedReagent, definition, "TEST", null, null, Guid.NewGuid(), 10, "mL");
        Assert.True(lot.MatchesConfiguredMaterial(new("Prepared", MaterialDefinitionId: definition)));
        Assert.False(lot.MatchesConfiguredMaterial(new("Other prepared", MaterialDefinitionId: Guid.NewGuid())));
        Assert.False(lot.MatchesConfiguredMaterial(new("Purchased", ProductId: Guid.NewGuid(), SupplierId: Guid.NewGuid())));
        Assert.Throws<ArgumentException>(() => lot.AssignProduct(Guid.NewGuid(), Guid.NewGuid()));
        Assert.True(lot.MatchesConfiguredMaterial(null)); // Frozen legacy label-only steps remain readable/executable.
    }
}
