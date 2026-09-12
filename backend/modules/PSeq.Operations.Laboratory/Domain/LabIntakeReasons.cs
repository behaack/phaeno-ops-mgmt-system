namespace PSeq.Operations.Laboratory.Domain;

public sealed record LabIntakeReason(string Code, string Label);

public static class LabIntakeReasons
{
    public static IReadOnlyList<LabIntakeReason> All { get; } =
    [
        new("identity_mismatch", "Identity or labeling mismatch"),
        new("damaged_container", "Damaged container"),
        new("leaking_container", "Leaking container"),
        new("insufficient_material", "Insufficient material"),
        new("receipt_condition", "Unacceptable receipt condition"),
        new("missing_information", "Missing required information"),
        new("other", "Other")
    ];

    public static void Validate(LabSpecimenIntakeDisposition disposition, string? code,
        string? notes, bool resolvingHold = false)
    {
        if (disposition is not (LabSpecimenIntakeDisposition.Accepted or LabSpecimenIntakeDisposition.OnHold
            or LabSpecimenIntakeDisposition.Rejected))
            throw new ArgumentException("Choose Accepted, On hold or Rejected.");
        if (notes?.Length > 2000) throw new ArgumentException("Use notes of up to 2,000 characters.");
        if (disposition == LabSpecimenIntakeDisposition.Accepted)
        {
            if (!string.IsNullOrWhiteSpace(code)) throw new ArgumentException("Routine acceptance does not require a reason code.");
            if (resolvingHold && string.IsNullOrWhiteSpace(notes))
                throw new ArgumentException("Explain how the previous hold or rejection was resolved.");
            return;
        }
        if (!All.Any(item => item.Code == code))
            throw new ArgumentException("Choose a predefined intake reason.");
        if (code == "other" && string.IsNullOrWhiteSpace(notes))
            throw new ArgumentException("Explain the reason when choosing Other.");
    }
}
