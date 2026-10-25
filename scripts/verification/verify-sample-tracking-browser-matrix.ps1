[CmdletBinding()]
param(
    [string] $EvidenceDirectory,
    [ValidateSet('phase1', 'phase2', 'phase3', 'phase4')] [string[]] $Phases = @('phase1', 'phase2', 'phase3', 'phase4'),
    [switch] $NoBuild
)
$ErrorActionPreference = 'Stop'
$repository = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if (-not $EvidenceDirectory) { $EvidenceDirectory = Join-Path $repository ('.tmp/sample-tracking-browser-' + [Guid]::NewGuid().ToString('N')) }
$evidence = [IO.Path]::GetFullPath($EvidenceDirectory, $repository)
if (-not $evidence.StartsWith($repository + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or (Test-Path -LiteralPath $evidence)) {
    throw 'Use a new evidence directory inside the repository.'
}
$configuration = Get-Content -LiteralPath (Join-Path $repository 'backend/app/appsettings.Development.json') -Raw | ConvertFrom-Json
$reference = $configuration.ConnectionStrings.DefaultConnection
$settings = [System.Data.Common.DbConnectionStringBuilder]::new(); $settings.set_ConnectionString($reference)
if ($settings['Host'] -notin @('localhost', '127.0.0.1', '::1')) { throw 'Browser verification requires local PostgreSQL.' }
$keys = @('PSEQ_OPERATIONS_REFERENCE_CONNECTION', 'PSEQ_POSTGRES_TOOLS_DIRECTORY', 'PSEQ_SAMPLE_BROWSER_MATRIX', 'PSEQ_SAMPLE_MATRIX_ARTIFACTS', 'PSEQ_SAMPLE_MATRIX_PHASES')
$previous = @{}; foreach ($key in $keys) { $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
New-Item -ItemType Directory -Path $evidence | Out-Null
try {
    [Environment]::SetEnvironmentVariable($keys[0], $reference, 'Process')
    [Environment]::SetEnvironmentVariable($keys[1], 'C:\Program Files\PostgreSQL\18\bin', 'Process')
    [Environment]::SetEnvironmentVariable($keys[2], '1', 'Process')
    [Environment]::SetEnvironmentVariable($keys[3], $evidence, 'Process')
    [Environment]::SetEnvironmentVariable($keys[4], ($Phases -join ','), 'Process')
    $project = Join-Path $repository 'backend/test/PSeq.Operations.Test.csproj'
    if (-not $NoBuild) {
        & dotnet build $project --no-restore --verbosity quiet *> (Join-Path $evidence 'build.log')
        if ($LASTEXITCODE -ne 0) { throw "Build failed; inspect $evidence/build.log" }
    }
    & dotnet test $project --no-build --no-restore --filter 'FullyQualifiedName~FullSampleTrackingBrowserMatrixUsesOwnedDatabasesAndPreservesDevelopment' --logger 'trx;LogFileName=matrix.trx' --results-directory $evidence --verbosity normal *> (Join-Path $evidence 'test.log')
    if ($LASTEXITCODE -ne 0) { throw "Browser matrix failed; inspect $evidence/test.log and per-phase receipts." }
    Write-Output "Sample-tracking browser matrix passed. Evidence: $evidence"
}
finally { foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') } }
