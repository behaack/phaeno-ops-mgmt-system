param(
    [Parameter(Mandatory = $true)][ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9.-]+$')][string]$SshHost,
    [Parameter(Mandatory = $true)][string]$IdentityFile,
    [Parameter(Mandatory = $true)][string]$KnownHostsFile,
    [ValidateRange(1, 65535)][int]$BrokerPort = 11883,
    [ValidateRange(1, 65535)][int]$RemoteBrokerPort = 1883
)

$ErrorActionPreference = 'Stop'
$apiRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\app'))
$apiProject = Join-Path $apiRoot 'PSeq.Operations.Api.csproj'
$temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$keyDirectory = Join-Path $temporaryRoot ('phaeno-local-dps-' + [guid]::NewGuid().ToString('N'))
$tunnel = $null
$apiExitCode = 1
try {
    $occupied = $false
    $existing = [Net.Sockets.TcpClient]::new()
    try { $existing.Connect('127.0.0.1', $BrokerPort); $occupied = $true }
    catch { }
    finally { $existing.Dispose() }
    if ($occupied) { throw "Local port $BrokerPort is already in use; stop its existing tunnel before starting this launcher." }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $acl = [Security.AccessControl.DirectorySecurity]::new()
    $acl.SetOwner($identity.User)
    $acl.SetAccessRuleProtection($true, $false)
    $rule = [Security.AccessControl.FileSystemAccessRule]::new(
        $identity.User, [Security.AccessControl.FileSystemRights]::FullControl,
        ([Security.AccessControl.InheritanceFlags]::ContainerInherit -bor [Security.AccessControl.InheritanceFlags]::ObjectInherit),
        [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Allow)
    $acl.AddAccessRule($rule)
    New-Item -ItemType Directory -Path $keyDirectory | Out-Null
    Set-Acl -LiteralPath $keyDirectory -AclObject $acl
    $temporaryKey = Join-Path $keyDirectory 'identity.pem'
    Copy-Item -LiteralPath (Resolve-Path -LiteralPath $IdentityFile).Path -Destination $temporaryKey
    $trustedHosts = (Resolve-Path -LiteralPath $KnownHostsFile).Path
    $sshArguments = @(
        '-N', '-T', '-a', '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes',
        '-o', 'IdentityAgent=none', '-o', 'StrictHostKeyChecking=yes',
        '-o', ('UserKnownHostsFile="' + $trustedHosts + '"'),
        '-o', 'ExitOnForwardFailure=yes', '-o', 'ConnectTimeout=10',
        '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2',
        '-i', ('"' + $temporaryKey + '"'),
        '-L', ("127.0.0.1:${BrokerPort}:127.0.0.1:${RemoteBrokerPort}"), "ubuntu@$SshHost"
    )
    $tunnel = Start-Process -FilePath (Get-Command ssh.exe).Source -ArgumentList $sshArguments -WindowStyle Hidden -PassThru
    $deadline = [DateTime]::UtcNow.AddSeconds(15)
    $listening = $false
    while ([DateTime]::UtcNow -lt $deadline) {
        if ($tunnel.HasExited) { throw 'SSH tunnel exited before the local broker connection was ready.' }
        $probe = [Net.Sockets.TcpClient]::new()
        try {
            $probe.Connect('127.0.0.1', $BrokerPort)
            $listening = $true
            break
        } catch { Start-Sleep -Milliseconds 200 }
        finally { $probe.Dispose() }
    }
    if (-not $listening) { throw 'SSH tunnel did not become ready within 15 seconds.' }
    Write-Output "DPS SSH tunnel ready: local 127.0.0.1:$BrokerPort to EC2 127.0.0.1:$RemoteBrokerPort."
    $env:ASPNETCORE_ENVIRONMENT = 'Development'
    $env:PSeqOrderToCash__NativePSeqAccountsReceivable = 'true'
    Push-Location $apiRoot
    try {
        & dotnet run --no-build --no-launch-profile --project $apiProject --urls 'https://localhost:44399;http://localhost:48056'
        $apiExitCode = $LASTEXITCODE
    } finally { Pop-Location }
} finally {
    if ($null -ne $tunnel -and -not $tunnel.HasExited) { Stop-Process -Id $tunnel.Id -Force }
    if (Test-Path -LiteralPath $keyDirectory) {
        $resolved = (Resolve-Path -LiteralPath $keyDirectory).Path
        if ($resolved -ne $keyDirectory -or -not $resolved.StartsWith($temporaryRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Temporary-key cleanup path is outside the expected task directory.'
        }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}
exit $apiExitCode
