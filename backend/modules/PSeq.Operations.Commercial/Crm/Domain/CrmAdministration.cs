namespace PSeq.Operations.Commercial.Crm.Domain;

using PSeq.Operations.Commercial.Accounts.Domain;
using PSeq.Operations.Commercial.Common.Persistence;

public sealed class CrmSavedView : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public CrmRecordType RecordType { get; private set; }
    public string FilterJson { get; private set; } = "{}";
    public bool IsShared { get; private set; }
    public Guid OwnerUserId { get; private set; }
    public User Owner { get; private set; } = null!;
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmSavedView() { }

    public CrmSavedView(string name, CrmRecordType recordType, string filterJson, bool isShared, Guid ownerUserId)
    {
        OwnerUserId = ownerUserId;
        RecordType = recordType;
        Update(name, filterJson, isShared);
    }

    public void Update(string name, string filterJson, bool isShared)
    {
        Name = CrmPipeline.Required(name, 150);
        FilterJson = ValidateJson(filterJson);
        IsShared = isShared;
    }

    public void Deactivate() => IsActive = false;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;

    internal static string ValidateJson(string value)
    {
        var normalized = CrmPipeline.Required(value, 12000);
        try { using var document = System.Text.Json.JsonDocument.Parse(normalized); }
        catch (System.Text.Json.JsonException) { throw new ArgumentException("Enter valid JSON."); }
        return normalized;
    }
}

public sealed class CrmCustomFieldDefinition : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = null!;
    public CrmRecordType RecordType { get; private set; }
    public CrmCustomFieldDataType DataType { get; private set; }
    public CrmFieldSensitivity Sensitivity { get; private set; }
    public string? OptionsJson { get; private set; }
    public bool IsRequired { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmCustomFieldDefinition() { }

    public CrmCustomFieldDefinition(
        string name,
        CrmRecordType recordType,
        CrmCustomFieldDataType dataType,
        CrmFieldSensitivity sensitivity,
        string? optionsJson,
        bool isRequired)
    {
        RecordType = recordType;
        Update(name, dataType, sensitivity, optionsJson, isRequired);
    }

    public void Update(
        string name,
        CrmCustomFieldDataType dataType,
        CrmFieldSensitivity sensitivity,
        string? optionsJson,
        bool isRequired)
    {
        Name = CrmPipeline.Required(name, 150);
        DataType = dataType;
        Sensitivity = sensitivity;
        OptionsJson = string.IsNullOrWhiteSpace(optionsJson) ? null : CrmSavedView.ValidateJson(optionsJson);
        if (dataType == CrmCustomFieldDataType.Option)
        {
            if (OptionsJson is null)
            {
                throw new ArgumentException("Option fields require a JSON array of choices.");
            }

            using var document = System.Text.Json.JsonDocument.Parse(OptionsJson);
            if (document.RootElement.ValueKind != System.Text.Json.JsonValueKind.Array
                || document.RootElement.GetArrayLength() == 0
                || document.RootElement.EnumerateArray().Any(value => value.ValueKind != System.Text.Json.JsonValueKind.String || string.IsNullOrWhiteSpace(value.GetString())))
            {
                throw new ArgumentException("Option fields require a non-empty JSON array of text choices.");
            }
        }

        IsRequired = isRequired;
    }

    public void Deactivate() => IsActive = false;
    public void Reactivate() => IsActive = true;
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class CrmCustomFieldValue : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid DefinitionId { get; private set; }
    public CrmCustomFieldDefinition Definition { get; private set; } = null!;
    public Guid RecordId { get; private set; }
    public string ValueJson { get; private set; } = null!;
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmCustomFieldValue() { }

    public CrmCustomFieldValue(Guid definitionId, Guid recordId, string valueJson)
    {
        if (definitionId == Guid.Empty || recordId == Guid.Empty) throw new ArgumentException("A definition and record are required.");
        DefinitionId = definitionId;
        RecordId = recordId;
        Update(valueJson);
    }

    public void Update(string valueJson) => ValueJson = CrmSavedView.ValidateJson(valueJson);
    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class CrmMergeRecord
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public CrmRecordType RecordType { get; private set; }
    public Guid SourceRecordId { get; private set; }
    public Guid TargetRecordId { get; private set; }
    public string Reason { get; private set; } = null!;
    public Guid MergedByUserId { get; private set; }
    public User MergedByUser { get; private set; } = null!;
    public DateTime MergedAt { get; private set; }

    private CrmMergeRecord() { }

    public CrmMergeRecord(CrmRecordType recordType, Guid sourceRecordId, Guid targetRecordId, string reason, Guid mergedByUserId, DateTime mergedAt)
    {
        if (sourceRecordId == targetRecordId) throw new ArgumentException("Merge source and target must differ.");
        RecordType = recordType;
        SourceRecordId = sourceRecordId;
        TargetRecordId = targetRecordId;
        Reason = CrmPipeline.Required(reason, 1000);
        MergedByUserId = mergedByUserId;
        MergedAt = mergedAt;
    }
}

public sealed class CrmImportBatch : IAudit, IConcurrency
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public CrmRecordType RecordType { get; private set; }
    public string IdempotencyKey { get; private set; } = null!;
    public string FileName { get; private set; } = null!;
    public CrmImportStatus Status { get; private set; } = CrmImportStatus.Previewed;
    public string RowsJson { get; private set; } = null!;
    public int TotalRows { get; private set; }
    public int ValidRows { get; private set; }
    public int DuplicateRows { get; private set; }
    public int InvalidRows { get; private set; }
    public string? ErrorReportJson { get; private set; }
    public DateTime? CommittedAt { get; private set; }
    public DateTime CreatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? CreatedByUserId { get; private set; }
    public DateTime UpdatedAt { get; private set; } = DateTime.UtcNow;
    public Guid? UpdatedByUserId { get; private set; }
    public long Version { get; private set; } = 1;

    private CrmImportBatch() { }

    public CrmImportBatch(CrmRecordType recordType, string idempotencyKey, string fileName, string rowsJson, int totalRows, int validRows, int duplicateRows, int invalidRows, string? errorReportJson)
    {
        RecordType = recordType;
        IdempotencyKey = CrmPipeline.Required(idempotencyKey, 255);
        FileName = CrmPipeline.Required(fileName, 255);
        RowsJson = CrmSavedView.ValidateJson(rowsJson);
        TotalRows = totalRows;
        ValidRows = validRows;
        DuplicateRows = duplicateRows;
        InvalidRows = invalidRows;
        ErrorReportJson = string.IsNullOrWhiteSpace(errorReportJson) ? null : CrmSavedView.ValidateJson(errorReportJson);
    }

    public void Commit(DateTime committedAt)
    {
        if (Status == CrmImportStatus.Committed) return;
        if (InvalidRows > 0) throw new InvalidOperationException("Resolve invalid rows before committing the import.");
        Status = CrmImportStatus.Committed;
        CommittedAt = committedAt;
    }

    public void Fail(string errorReportJson)
    {
        Status = CrmImportStatus.Failed;
        ErrorReportJson = CrmSavedView.ValidateJson(errorReportJson);
    }

    public void MarkCreated(DateTime utcNow, Guid? actorUserId) { CreatedAt = utcNow; CreatedByUserId = actorUserId; }
    public void MarkUpdated(DateTime utcNow, Guid? actorUserId) { UpdatedAt = utcNow; UpdatedByUserId = actorUserId; }
    public void IncrementVersion() => Version++;
}

public sealed class CrmExportRecord
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public CrmRecordType RecordType { get; private set; }
    public string FilterJson { get; private set; } = "{}";
    public int RowCount { get; private set; }
    public Guid RequestedByUserId { get; private set; }
    public User RequestedByUser { get; private set; } = null!;
    public DateTime RequestedAt { get; private set; }

    private CrmExportRecord() { }

    public CrmExportRecord(CrmRecordType recordType, string filterJson, int rowCount, Guid requestedByUserId, DateTime requestedAt)
    {
        RecordType = recordType;
        FilterJson = CrmSavedView.ValidateJson(filterJson);
        RowCount = rowCount;
        RequestedByUserId = requestedByUserId;
        RequestedAt = requestedAt;
    }
}
