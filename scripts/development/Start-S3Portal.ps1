[CmdletBinding()]
param(
    [string]$Bucket = 'phaeno-dev-01',
    [string]$Region = 'us-east-2',
    [string]$Profile = 'phaeno',
    [string]$CredentialFile = (Join-Path $env:USERPROFILE 'Downloads\credentials'),
    [string]$LaunchProfile = 'https',
    [switch]$Activate,
    [switch]$ExistingFilesPreserved
)

$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\backend\app\PSeq.Operations.Api.csproj'))
if ($Bucket -notmatch '^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$' -or $Bucket.Contains('..')) { throw 'Invalid S3 bucket name.' }
if ($Region -notmatch '^[a-z]{2}(-gov)?-[a-z0-9-]+-[0-9]+$') { throw 'Invalid AWS region.' }
if (-not $Activate) {
    Write-Output "Prepared local configuration: S3 bucket $Bucket, region $Region, customer-first keys, profile $Profile."
    Write-Output 'No runtime settings changed. Before activation, preserve referenced Local files and their database mappings using the S3 integration plan.'
    Write-Output 'Start only after that checkpoint with -Activate -ExistingFilesPreserved, with the current API stopped by its operator.'
    return
}
if (-not $ExistingFilesPreserved) { throw 'S3 activation requires verified preservation of existing referenced Local files and storage-key mappings.' }
if (-not (Test-Path -LiteralPath $CredentialFile -PathType Leaf)) { throw 'The supplied AWS credentials file is missing.' }

# Parse data only; never execute file contents or write credentials to source/config files.
$credentialValues = @{}
$currentProfile = ''
foreach ($line in [IO.File]::ReadAllLines($CredentialFile)) {
    if ($line -match '^\s*\[([^\]]+)\]\s*$') { $currentProfile = $Matches[1]; continue }
    if ($currentProfile -eq $Profile -and $line -match '^\s*(aws_access_key_id|aws_secret_access_key|aws_session_token)\s*=\s*(.*?)\s*$') {
        $credentialValues[$Matches[1]] = $Matches[2]
    }
}
if ([string]::IsNullOrWhiteSpace($credentialValues['aws_access_key_id']) -or [string]::IsNullOrWhiteSpace($credentialValues['aws_secret_access_key'])) {
    throw 'The selected AWS profile does not contain the required credentials.'
}
$runtimeValues = @{
    FileStorage__Provider = 'S3'
    FileStorage__S3__BucketName = $Bucket
    FileStorage__S3__Region = $Region
    FileStorage__S3__KeyPrefix = ''
    FileStorage__S3__ServiceUrl = ''
    FileStorage__S3__ForcePathStyle = 'false'
    AWS_ACCESS_KEY_ID = $credentialValues['aws_access_key_id']
    AWS_SECRET_ACCESS_KEY = $credentialValues['aws_secret_access_key']
    AWS_SESSION_TOKEN = $credentialValues['aws_session_token']
}
$previousValues = @{}
try {
    foreach ($name in $runtimeValues.Keys) {
        $previousValues[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        [Environment]::SetEnvironmentVariable($name, $runtimeValues[$name], 'Process')
    }
    & dotnet run --project $projectPath --launch-profile $LaunchProfile
    if ($LASTEXITCODE -ne 0) { throw 'The S3-configured local API exited unsuccessfully.' }
} finally {
    foreach ($name in $previousValues.Keys) { [Environment]::SetEnvironmentVariable($name, $previousValues[$name], 'Process') }
    $credentialValues.Clear(); $runtimeValues.Clear()
}
