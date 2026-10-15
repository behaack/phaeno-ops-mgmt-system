namespace PhaenoPortal.Test;
using PhaenoPortal.App.Features.LabOperations.Controllers;
using PhaenoPortal.App.Features.OrderManagement.Services;
using PSeq.Operations.Laboratory.Domain;

public class LabProcedureDefinitionTests
{
    [Fact]
    public void ProtocolEditRequiresIndependentReviewOfTheLatestAuthor()
    {
        var editor = Guid.NewGuid();
        var draft = new LabProtocolVersion(Guid.NewGuid(), 1, LabProtocolTestData.Definition(), Guid.NewGuid(), DateTime.UtcNow);
        draft.UpdateDraft(LabProtocolTestData.Definition("edited"), editor);
        Assert.Equal(editor, draft.AuthoredByUserId);
        Assert.Throws<InvalidOperationException>(() => draft.Approve(editor, DateTime.UtcNow));
        draft.Approve(Guid.NewGuid(), DateTime.UtcNow);
        Assert.Throws<InvalidOperationException>(() => draft.UpdateDraft(LabProtocolTestData.Definition(), editor));
    }

    [Fact]
    public void IllustrationMetadataRequiresDistinctReceiptsAndDescriptiveAlternativeText()
    {
        var id = Guid.NewGuid();
        LabConfigurationAsset.Validate([new(id, "Transfer from source tube to destination tube", "Approved transfer diagram")]);
        Assert.Throws<ArgumentException>(() => LabConfigurationAsset.Validate([new(id, " ")]));
        Assert.Throws<ArgumentException>(() => LabConfigurationAsset.Validate([new(id, "One"), new(id, "Two")]));
        Assert.Throws<ArgumentException>(() => LabConfigurationAsset.Validate([null!]));
        Assert.Throws<ArgumentException>(() => LabInstructionSource.Validate(new("kit", id, "0", "first")));
        Assert.Throws<ArgumentException>(() => LabInstructionSource.Validate(new("other", id, "1", "first")));
    }

    [Fact]
    public void OwnedMasterMixInstructionsDeriveExactRecipeWithoutCatalogApproval()
    {
        var reagent = Guid.NewGuid();
        LabProtocolStepDefinition Instruction(string key, string amount) => new() {
            Key = key, Name = key, Instructions = "TEST ONLY: add measured reagent.", ProcessType = "masterMix",
            Required = true, Repeatable = false, OperatorConfirmation = true,
            InputMaterials = [], PreparedOutputs = [], EquipmentTypes = [],
            Captures = [new() { Key = "reagent", Label = "Reagent", Type = "material", Required = true, Scope = "batch", Unit = "µL", IncludeTracking = true, QuantityBasis = "total", PlannedQuantityText = amount, Material = new("TEST reagent", ProductId: reagent) }]
        };
        var first = Instruction("first", "0.1"); var second = Instruction("second", "0.2");
        Assert.Null(first.LabStepVersionId);
        Assert.Equal("0.3", Assert.Single(LabMasterMixDefinition.Recipe([first, second])).QuantityText);
        Assert.Throws<ArgumentException>(() => LabMasterMixDefinition.Recipe([first with { Required = false }]));
    }

    [Fact]
    public void IllustrationAdmissionUsesContentAndRejectsExecutableFormatsAndTruncation()
    {
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==");
        Assert.Equal("image/png", LabOperationsController.IllustrationContentType(png));
        Assert.Throws<OrderManagementException>(() => LabOperationsController.IllustrationContentType("<svg><script/></svg>"u8));
        Assert.Throws<OrderManagementException>(() => LabOperationsController.IllustrationContentType(png[..12]));
        Assert.Throws<OrderManagementException>(() => LabOperationsController.IllustrationContentType(new byte[] { 255, 216, 255, 217 }));
        var oversized = png.ToArray();
        System.Buffers.Binary.BinaryPrimitives.WriteUInt32BigEndian(oversized.AsSpan(16, 4), 100_000);
        Assert.Equal("illustration_dimensions_invalid", Assert.Throws<OrderManagementException>(() => LabOperationsController.IllustrationContentType(oversized)).ErrorCode);
    }
}
