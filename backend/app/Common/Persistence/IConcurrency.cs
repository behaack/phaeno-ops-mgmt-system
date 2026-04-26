namespace PhaenoPortal.App.Common.Persistence;

public interface IConcurrency
{
    long Version { get; }

    void IncrementVersion();
}
