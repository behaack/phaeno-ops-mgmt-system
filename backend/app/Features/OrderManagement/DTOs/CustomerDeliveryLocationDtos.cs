namespace PhaenoPortal.App.Features.OrderManagement.DTOs;

using PSeq.Operations.Commercial.OrderManagement.Domain;

public sealed record CustomerDeliveryLocationDto(Guid Id, Guid OrganizationId, Guid DepartmentId,
    string Label, string Recipient, string Line1, string? Line2, string City, string Region,
    string PostalCode, string CountryCode, string? Phone, string? DeliveryInstructions,
    bool IsDefault, bool IsActive, long Version);

public sealed record CustomerDeliveryLocationWriteRequest(Guid OrganizationId, Guid DepartmentId,
    string Label, string Recipient, string Line1, string? Line2, string City, string Region,
    string PostalCode, string CountryCode, string? Phone, string? DeliveryInstructions,
    bool IsDefault, long? Version = null);

public static class CustomerDeliveryLocationMapping
{
    public static CustomerDeliveryLocationDto ToDto(this CustomerDeliveryLocation item) => new(
        item.Id, item.OrganizationId, item.DepartmentId, item.Label, item.Recipient, item.Line1,
        item.Line2, item.City, item.Region, item.PostalCode, item.CountryCode, item.Phone,
        item.DeliveryInstructions, item.IsDefault, item.IsActive, item.Version);
}
