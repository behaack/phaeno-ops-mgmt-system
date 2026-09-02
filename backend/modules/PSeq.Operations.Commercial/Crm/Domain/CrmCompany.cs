namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

/// <summary>
/// The canonical commercial organization in POMS. Portal access is an optional
/// capability of the Company; the associated Organization is an internal
/// tenant-isolation scope rather than a second customer record.
/// </summary>
public sealed class CrmCompany : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public string? WebsiteUrl { get; private set; }
    public string? DomainName { get; private set; }
    public string? Phone { get; private set; }
    public string? Industry { get; private set; }
    public string? Description { get; private set; }
    public string? AddressLine1 { get; private set; }
    public string? AddressLine2 { get; private set; }
    public string? City { get; private set; }
    public string? Region { get; private set; }
    public string? PostalCode { get; private set; }
    public string? CountryCode { get; private set; }
    public int? EmployeeCount { get; private set; }
    public CrmCompanyLifecycleState LifecycleState { get; private set; } = CrmCompanyLifecycleState.Target;
    public string? Source { get; private set; }
    public string[] Tags { get; private set; } = [];
    public string[] Aliases { get; private set; } = [];
    public Guid? MergedIntoCompanyId { get; private set; }
    public CrmCompany? MergedIntoCompany { get; private set; }
    public Guid OwnerUserId { get; private set; }
    public User Owner { get; private set; } = null!;
    public Guid? AccessOrganizationId { get; private set; }
    public Organization? AccessOrganization { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmCompany()
    {
    }

    public CrmCompany(
        string name,
        Guid ownerUserId,
        string? websiteUrl = null,
        string? domainName = null,
        string? phone = null,
        string? industry = null,
        string? description = null,
        string? addressLine1 = null,
        string? addressLine2 = null,
        string? city = null,
        string? region = null,
        string? postalCode = null,
        string? countryCode = null,
        int? employeeCount = null,
        CrmCompanyLifecycleState lifecycleState = CrmCompanyLifecycleState.Target,
        string? source = null,
        IEnumerable<string>? tags = null)
    {
        if (ownerUserId == Guid.Empty)
        {
            throw new ArgumentException("An owner is required.", nameof(ownerUserId));
        }

        OwnerUserId = ownerUserId;
        SetProfile(
            name,
            websiteUrl,
            domainName,
            phone,
            industry,
            description,
            addressLine1,
            addressLine2,
            city,
            region,
            postalCode,
            countryCode,
            employeeCount,
            lifecycleState,
            source,
            tags);
    }

    public void UpdateProfile(
        string name,
        string? websiteUrl,
        string? domainName,
        string? phone,
        string? industry,
        string? description,
        string? addressLine1 = null,
        string? addressLine2 = null,
        string? city = null,
        string? region = null,
        string? postalCode = null,
        string? countryCode = null,
        int? employeeCount = null,
        CrmCompanyLifecycleState lifecycleState = CrmCompanyLifecycleState.Target,
        string? source = null,
        IEnumerable<string>? tags = null)
    {
        SetProfile(
            name,
            websiteUrl,
            domainName,
            phone,
            industry,
            description,
            addressLine1,
            addressLine2,
            city,
            region,
            postalCode,
            countryCode,
            employeeCount,
            lifecycleState,
            source,
            tags);
    }

    public void AssignOwner(Guid ownerUserId)
    {
        if (ownerUserId == Guid.Empty)
        {
            throw new ArgumentException("An owner is required.", nameof(ownerUserId));
        }

        OwnerUserId = ownerUserId;
    }

    public void MergeInto(Guid targetCompanyId, string targetCompanyName)
    {
        if (targetCompanyId == Guid.Empty || targetCompanyId == Id)
        {
            throw new InvalidOperationException("Select a different target company for the merge.");
        }

        MergedIntoCompanyId = targetCompanyId;
        IsActive = false;
        Aliases = NormalizeTags(Aliases.Append(targetCompanyName), 255);
    }

    public void AddAlias(string alias)
    {
        Aliases = NormalizeTags(Aliases.Append(alias), 255);
    }

    public void EnablePortalAccess(Guid organizationId)
    {
        if (organizationId == Guid.Empty)
        {
            throw new ArgumentException("An access organization is required.", nameof(organizationId));
        }

        if (AccessOrganizationId.HasValue && AccessOrganizationId.Value != organizationId)
        {
            throw new InvalidOperationException("Portal access is already enabled for this Company.");
        }

        AccessOrganizationId = organizationId;
    }

    public void TransferPortalAccessTo(CrmCompany target)
    {
        ArgumentNullException.ThrowIfNull(target);
        if (!AccessOrganizationId.HasValue)
        {
            return;
        }

        if (target.AccessOrganizationId.HasValue)
        {
            throw new InvalidOperationException("Both Companies already have Portal access. Resolve access before merging them.");
        }

        target.AccessOrganizationId = AccessOrganizationId;
        AccessOrganizationId = null;
    }

    public void Deactivate() => IsActive = false;

    public void Reactivate() => IsActive = true;

    public void MarkCreated(DateTime utcNow, Guid? actorUserId)
    {
        CreatedAt = utcNow;
        CreatedByUserId = actorUserId;
    }

    public void MarkUpdated(DateTime utcNow, Guid? actorUserId)
    {
        UpdatedAt = utcNow;
        UpdatedByUserId = actorUserId;
    }

    public void IncrementVersion() => Version++;

    private void SetProfile(
        string name,
        string? websiteUrl,
        string? domainName,
        string? phone,
        string? industry,
        string? description,
        string? addressLine1,
        string? addressLine2,
        string? city,
        string? region,
        string? postalCode,
        string? countryCode,
        int? employeeCount,
        CrmCompanyLifecycleState lifecycleState,
        string? source,
        IEnumerable<string>? tags)
    {
        Name = Required(name, nameof(name), 255);
        WebsiteUrl = NormalizeWebsite(websiteUrl);
        DomainName = NormalizeDomain(domainName);
        Phone = Optional(phone, 50);
        Industry = Optional(industry, 150);
        Description = Optional(description, 2000);
        AddressLine1 = Optional(addressLine1, 255);
        AddressLine2 = Optional(addressLine2, 255);
        City = Optional(city, 150);
        Region = Optional(region, 150);
        PostalCode = Optional(postalCode, 30);
        CountryCode = NormalizeCountryCode(countryCode);
        if (employeeCount is < 0)
        {
            throw new ArgumentException("Employee count cannot be negative.", nameof(employeeCount));
        }

        EmployeeCount = employeeCount;
        LifecycleState = lifecycleState;
        Source = Optional(source, 150);
        Tags = NormalizeTags(tags, 50);
    }

    private static string? NormalizeWebsite(string? value)
    {
        var normalized = Optional(value, 2048);
        if (normalized is null)
        {
            return null;
        }

        if (!Uri.TryCreate(normalized, UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            throw new ArgumentException("Website must be an absolute HTTP or HTTPS URL.", nameof(value));
        }

        return uri.AbsoluteUri;
    }

    private static string? NormalizeDomain(string? value)
    {
        var normalized = Optional(value, 253)?.TrimEnd('.').ToLowerInvariant();
        if (normalized is null)
        {
            return null;
        }

        if (normalized.Contains('/')
            || normalized.Contains(':')
            || normalized.Any(char.IsWhiteSpace)
            || !normalized.Contains('.'))
        {
            throw new ArgumentException("Domain must be a hostname such as example.com.", nameof(value));
        }

        return normalized;
    }

    private static string Required(string? value, string parameterName, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("A value is required.", parameterName);
        }

        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", parameterName);
        }

        return normalized;
    }

    private static string? Optional(string? value, int maximumLength)
    {
        var normalized = value?.Trim();
        if (string.IsNullOrWhiteSpace(normalized))
        {
            return null;
        }

        if (normalized.Length > maximumLength)
        {
            throw new ArgumentException($"The value cannot exceed {maximumLength} characters.", nameof(value));
        }

        return normalized;
    }

    private static string? NormalizeCountryCode(string? value)
    {
        var normalized = Optional(value, 2)?.ToUpperInvariant();
        if (normalized is not null && normalized.Length != 2)
        {
            throw new ArgumentException("Country code must contain two letters.", nameof(value));
        }

        return normalized;
    }

    private static string[] NormalizeTags(IEnumerable<string>? values, int maximumLength) =>
        (values ?? [])
            .Select(value => value.Trim())
            .Where(value => value.Length > 0)
            .Select(value => value.Length <= maximumLength
                ? value
                : throw new ArgumentException($"Tags cannot exceed {maximumLength} characters.", nameof(values)))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(value => value, StringComparer.OrdinalIgnoreCase)
            .ToArray();
}
