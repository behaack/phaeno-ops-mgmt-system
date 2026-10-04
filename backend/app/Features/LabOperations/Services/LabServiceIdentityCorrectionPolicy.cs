namespace PhaenoPortal.App.Features.LabOperations.Services;

using System.Text.Json;
using System.Text.Json.Serialization;
using PSeq.Operations.Commercial.LabOperations.Application;
using PSeq.Operations.Laboratory.Domain;

public static class LabServiceIdentityCorrectionPolicy
{
    public const string ReasonCode = "purchased_service_identity_correction";
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    { Converters = { new JsonStringEnumConverter() } };

    public static AuthorizeLabWorkCommand? ReadCommercialSnapshot(string json)
        => JsonSerializer.Deserialize<AuthorizeLabWorkCommand>(json, Options);

    public static bool PreservesScope(AuthorizeLabWorkCommand previous, AuthorizeLabWorkCommand replacement)
        => previous.SourceType == LabWorkAuthorizationSource.CommercialOrder
            && previous.Metadata.ContractVersion == replacement.Metadata.ContractVersion
            && previous.Metadata.CorrelationId == replacement.Metadata.CorrelationId
            && previous.ServiceKey != replacement.ServiceKey
            && previous.AuthorizationVersion + 1 == replacement.AuthorizationVersion
            && JsonSerializer.Serialize(previous with
            {
                Metadata = replacement.Metadata,
                AuthorizationVersion = replacement.AuthorizationVersion,
                ServiceKey = replacement.ServiceKey,
            }, Options) == JsonSerializer.Serialize(replacement, Options);

    public static bool HasUnstartedStatus(LabWorkOrder work)
        => work.AuthorizationSource == LabAuthorizationSource.CommercialOrder
            && work.Status is (LabWorkOrderStatus.AwaitingSpecimens or LabWorkOrderStatus.Received)
            && !work.LabServiceWorkflowVersionId.HasValue;
}
