namespace PSeq.Operations.Commercial.Common.Persistence;

public interface IConcurrency
{
    long Version { get; }

    void IncrementVersion();
}
