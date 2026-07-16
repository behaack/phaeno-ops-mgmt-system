namespace PSeq.Operations.Laboratory.Common.Persistence;

public interface IConcurrency
{
    long Version { get; }

    void IncrementVersion();
}
