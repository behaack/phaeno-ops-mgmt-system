[CmdletBinding()]
param(
    [string] $EvidenceDirectory,
    [string] $PostgresToolsDirectory = 'C:\Program Files\PostgreSQL\18\bin',
    [switch] $NoBuild,
    [switch] $Browser
)

$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if (-not $EvidenceDirectory) {
    $EvidenceDirectory = Join-Path $repository ('docs/testing/runs/{0}-sample-tracking-phase4-evidence' -f (Get-Date -Format 'yyyy-MM-dd-HHmmss'))
}
$evidence = [IO.Path]::GetFullPath($EvidenceDirectory, $repository)
if (-not $evidence.StartsWith($repository + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Evidence must use a new directory within this repository.'
}
if (Test-Path -LiteralPath $evidence) { throw 'Choose a new evidence directory; existing receipts are never overwritten.' }
foreach ($tool in @('pg_dump.exe', 'pg_restore.exe')) {
    if (-not (Test-Path -LiteralPath (Join-Path $PostgresToolsDirectory $tool) -PathType Leaf)) { throw "Missing PostgreSQL recovery tool: $tool" }
}
# Read credentials internally. The test uses them only to create two generated loopback databases;
# its configured-development connection is read-only fingerprinting, never a fixture target.
$configuration = Get-Content -LiteralPath (Join-Path $repository 'backend/app/appsettings.Development.json') -Raw | ConvertFrom-Json
$reference = $configuration.ConnectionStrings.DefaultConnection
$settings = [System.Data.Common.DbConnectionStringBuilder]::new()
$settings.set_ConnectionString($reference)
if ($settings['Host'] -notin @('localhost', '127.0.0.1', '::1')) { throw 'Phase 4 only supports the local development PostgreSQL server.' }
$envKeys = @('PSEQ_OPERATIONS_REFERENCE_CONNECTION', 'PSEQ_POSTGRES_TOOLS_DIRECTORY', 'PSEQ_PHASE4_VALIDATION', 'PSEQ_PHASE4_STAGE', 'PSEQ_PHASE4_ARTIFACTS', 'PSEQ_RECOVERY_EXPORT_DIR', 'PSEQ_PHASE4_BROWSER_VERIFICATION')
$previous = @{}
foreach ($key in $envKeys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
New-Item -ItemType Directory -Path $evidence | Out-Null
try {
    [Environment]::SetEnvironmentVariable('PSEQ_OPERATIONS_REFERENCE_CONNECTION', $reference, 'Process')
    [Environment]::SetEnvironmentVariable('PSEQ_POSTGRES_TOOLS_DIRECTORY', $PostgresToolsDirectory, 'Process')
    [Environment]::SetEnvironmentVariable('PSEQ_PHASE4_VALIDATION', '1', 'Process')
    [Environment]::SetEnvironmentVariable('PSEQ_PHASE4_STAGE', 'run', 'Process')
    [Environment]::SetEnvironmentVariable('PSEQ_PHASE4_ARTIFACTS', $evidence, 'Process')
    [Environment]::SetEnvironmentVariable('PSEQ_RECOVERY_EXPORT_DIR', $null, 'Process')
    [Environment]::SetEnvironmentVariable('PSEQ_PHASE4_BROWSER_VERIFICATION', $(if ($Browser) { '1' } else { $null }), 'Process')
    $project = Join-Path $repository 'backend/test/PSeq.Operations.Test.csproj'
    if (-not $NoBuild) {
        & dotnet build $project --no-restore --verbosity quiet
        if ($LASTEXITCODE -ne 0) { throw 'Phase 4 build failed.' }
    }
    $selection = @(
        'FullyQualifiedName~Phase4ConnectedJourneySurvivesIndependentRestoreAndRecoveryFailures',
        'FullyQualifiedName~AuthorizedOrderCompletesTheDatabaseBackedLabOperatorJourney',
        'FullyQualifiedName~LabPhysicalLifecycleTests',
        'FullyQualifiedName~LabResultLineageTests',
        'FullyQualifiedName~LabScientificEvidenceTests',
        'FullyQualifiedName~LabInvestigationScopeTests'
        'FullyQualifiedName~Phase4CleanupTests'
        'FullyQualifiedName~ClosedTrialPhysicalCustodyUsesRealMvcGuardAndActualHistoryTimes'
        'FullyQualifiedName~InvestigationMasterMixExposureExcludesZeroUseOtherOrganizationsAndVoidedDispensing'
    ) -join '|'
    if ($Browser) { $selection = 'FullyQualifiedName~Phase4ConnectedJourneySurvivesIndependentRestoreAndRecoveryFailures' }
    & dotnet test $project --no-build --no-restore --filter $selection --logger 'trx;LogFileName=phase4.trx' --results-directory $evidence --verbosity normal *> (Join-Path $evidence 'test.log')
    if ($LASTEXITCODE -ne 0) { throw "Phase 4 checks failed. Review $evidence/test.log and cleanup.json." }
    Write-Output "Phase 4 local validation and recovery passed. Evidence: $evidence"
}
finally {
    foreach ($key in $envKeys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
    $reference = $null
}
