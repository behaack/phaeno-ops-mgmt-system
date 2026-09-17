namespace PSeq.Operations.Laboratory.Domain;

/// <summary>A bounded compatibility rule for the established conditional QC-review fixture.</summary>
public static class LabPreparationConditionalReview
{
    public const string Condition = "Perform when step 2 history contains a Hold or Fail, even if a permitted repeat now passes; otherwise skip with a reason.";
    public const string SkipReason = "Automatically skipped: no active sample has a Hold or Fail in its input QC history; all have passing input QC.";

    public static LabProtocolStepDefinition? SkippableStep(LabProtocolDefinition definition, IReadOnlyList<LabProtocolEvidence> histories)
    {
        if (histories.Count == 0 || definition.Steps.Count < 3) return null;
        var step = definition.Steps[2];
        var source = definition.Steps[1];
        if (step.Required || step.Condition?.Trim() != Condition || step.QcGate is not null || source.QcGate is null
            || !step.Captures.Any(c => c.Key == "review-rationale" && c.Type == "text" && c.Required)
            || step.InputMaterials.Count + step.EquipmentTypes.Count + step.PreparedOutputs.Count != 0) return null;
        foreach (var history in histories)
        {
            // Never overwrite a performed review or an existing manual/automatic skip.
            if (history.Records.Any(r => r.StepKey == step.Key)) return null;
            var qc = history.Records.Where(r => r.StepKey == source.Key).ToList();
            if (qc.Count == 0 || qc[^1].QcOutcome != "pass" || qc.Any(r => r.QcOutcome is "hold" or "fail")) return null;
            try
            {
                if (definition.Steps.Take(2).Any(prior => history.StepBlocker(definition, prior) is not null)) return null;
            }
            catch (ArgumentException) { return null; }
        }
        return step;
    }
}
