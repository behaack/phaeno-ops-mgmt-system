namespace PSeq.Operations.Laboratory.Domain;

public static class LabEvidenceTime
{
    // PostgreSQL timestamps retain microseconds. Use that precision in both JSON evidence and relational receipts.
    public static DateTime UtcNow
    {
        get
        {
            var now = DateTime.UtcNow;
            return new DateTime(now.Ticks - now.Ticks % 10, DateTimeKind.Utc);
        }
    }
}
