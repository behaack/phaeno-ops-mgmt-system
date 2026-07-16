namespace PSeq.Operations.Commercial.LabOperations.Application;

public interface ILabOperationsProvider
{
    Task<LabCommandAcknowledgment> AuthorizeWorkAsync(
        AuthorizeLabWorkCommand command,
        CancellationToken cancellationToken);

    Task<LabCommandAcknowledgment> AmendAuthorizationAsync(
        AmendLabWorkAuthorizationCommand command,
        CancellationToken cancellationToken);

    Task<LabCancellationOutcome> RequestCancellationAsync(
        RequestLabWorkCancellationCommand command,
        CancellationToken cancellationToken);

    Task<LabWorkProjection?> GetWorkProjectionAsync(
        Guid authorizationId,
        CancellationToken cancellationToken);
}
