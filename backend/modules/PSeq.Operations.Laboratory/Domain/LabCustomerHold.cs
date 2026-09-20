namespace PSeq.Operations.Laboratory.Domain;

public sealed class LabCustomerHold
{
    private LabCustomerHold() { }
    public LabCustomerHold(Guid work, Guid specimen, Guid actor, string reason, DateTime now)
    { LabWorkOrderId = work; LabSpecimenId = specimen; RequestedByUserId = actor; Reason = Text(reason); RequestedAtUtc = now; }
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid LabWorkOrderId { get; private set; }
    public Guid LabSpecimenId { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public DateTime RequestedAtUtc { get; private set; }
    public string Reason { get; private set; } = "";
    public string State { get; private set; } = "Requested";
    public DateTime? PausedAtUtc { get; private set; }
    public string? Response { get; private set; }
    public Guid? RespondedByUserId { get; private set; }
    public DateTime? RespondedAtUtc { get; private set; }
    public int Version { get; private set; }
    public void RequestResume(string reason)
    {
        if (State is "Released" or "ResumeRequested") throw new InvalidOperationException("This hold is released or already awaiting resumption.");
        Response = Text(reason); State = "ResumeRequested"; Version++;
    }
    public void Decide(string action, string reason, Guid actor, DateTime now)
    {
        var state = action switch
        {
            "apply" when State is "Requested" or "UnableToPause" => "Applied",
            "unable" when State == "Requested" => "UnableToPause",
            "resume" when State == "ResumeRequested" => "Released",
            "keep-held" when State == "ResumeRequested" => "Applied",
            _ => throw new InvalidOperationException("Reload the hold and choose an available decision.")
        };
        Response = Text(reason); State = state;
        if (state == "Applied") PausedAtUtc = now;
        if (state == "Released") PausedAtUtc = null; RespondedByUserId = actor; RespondedAtUtc = now; Version++;
    }
    private static string Text(string value) => !string.IsNullOrWhiteSpace(value) && value.Trim().Length <= 2000
        ? value.Trim() : throw new ArgumentException("Enter a reason of at most 2,000 characters.");
}
