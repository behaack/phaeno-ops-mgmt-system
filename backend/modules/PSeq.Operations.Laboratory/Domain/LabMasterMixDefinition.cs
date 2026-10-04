namespace PSeq.Operations.Laboratory.Domain;

using System.Globalization;
using System.Text.RegularExpressions;

public static class LabMasterMixDefinition
{
    public static void ValidateStep(LabProtocolStepDefinition step)
    {
        if (step.ProcessType != "masterMix") throw new ArgumentException("Choose a Lab step configured for master-mix preparation.");
        if (step.InputMaterials.Count != 0 || step.PreparedOutputs.Count != 0 || step.EquipmentTypes.Count != 0
            || step.AttachmentKind is not (null or "none") || step.AttachmentRequired)
            throw new ArgumentException("Master-mix steps record their resources through batch fields; sample outputs and reports do not apply.");
        if (step.QcGate is not null && step.QcGate.Scope != "batch") throw new ArgumentException("Master-mix QC applies to the batch.");
        foreach (var field in step.Captures)
        {
            if (field.Scope != "batch" || field.Type is not ("material" or "equipment" or "number" or "text" or "date" or "choice"))
                throw new ArgumentException("Master-mix fields must be batch measurements, text, dates, choices, reagents or equipment.");
            if (field.Type != "material") continue;
            if (!field.Required || !field.IncludeTracking || field.QuantityBasis != "total" || field.Material is null
                || field.Material.MasterMixWorkflowId.HasValue
                || field.Material.ProductId == Guid.Empty || field.Material.MaterialDefinitionId == Guid.Empty
                || new[] { field.Material.ProductId.HasValue, field.Material.MaterialDefinitionId.HasValue }.Count(x => x) != 1
                || string.IsNullOrWhiteSpace(field.Unit))
                throw new ArgumentException("Every master-mix reagent needs an exact catalog identity, required lot number and unit.");
            ParseAmount(field.PlannedQuantityText);
        }
    }

    public static IReadOnlyList<LabMasterMixRecipeIngredient> Recipe(IReadOnlyList<LabProtocolStepDefinition> steps)
    {
        if (steps.Count is < 1 or > 100) throw new ArgumentException("Assemble 1 to 100 approved Lab step occurrences.");
        foreach (var step in steps)
        {
            ValidateStep(step);
            if (step.LabStepVersionId is null || step.LabStepVersionId == Guid.Empty || !step.Required || step.Condition is not null)
                throw new ArgumentException("Every master-mix occurrence must pin an approved Lab step and be required.");
        }
        var recipe = steps.SelectMany(step => step.Captures).Where(field => field.Type == "material")
            .GroupBy(field => (field.Material!.MaterialDefinitionId, field.Material.ProductId, field.Unit))
            .Select(group =>
            {
                decimal amount;
                try { amount = group.Sum(field => ParseAmount(field.PlannedQuantityText)); }
                catch (OverflowException) { throw new ArgumentException("The assembled recipe amount exceeds the supported exact quantity."); }
                var text = amount.ToString(CultureInfo.InvariantCulture);
                ParseAmount(text);
                return new LabMasterMixRecipeIngredient(group.Key.MaterialDefinitionId, group.First().Material!.Name,
                    amount, group.Key.Unit!, text, group.Key.ProductId);
            }).ToArray();
        if (recipe.Length == 0) throw new ArgumentException("The assembled steps must include at least one planned reagent entry.");
        return recipe;
    }

    public static decimal ParseAmount(string? text)
    {
        if (text is null || text.Length > 40 || !Regex.IsMatch(text, @"^\d+(?:\.\d{1,12})?$", RegexOptions.CultureInvariant)
            || !decimal.TryParse(text, NumberStyles.AllowDecimalPoint,
                CultureInfo.InvariantCulture, out var value) || value <= 0 || value >= 10000000000000000m
            || decimal.Round(value, 12) != value)
            throw new ArgumentException("Enter a positive exact planned amount with at most 12 fractional places.");
        return value;
    }
}
