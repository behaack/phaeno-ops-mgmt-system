[CmdletBinding(DefaultParameterSetName = 'ManagedTunnel')]
param(
    [Parameter(Mandatory = $true, ParameterSetName = 'ManagedTunnel')][ValidatePattern('^[a-zA-Z0-9][a-zA-Z0-9.-]+$')][string]$SshHost,
    [Parameter(Mandatory = $true, ParameterSetName = 'ManagedTunnel')][string]$IdentityFile,
    [Parameter(Mandatory = $true, ParameterSetName = 'ManagedTunnel')][string]$KnownHostsFile,
    [Parameter(Mandatory = $true, ParameterSetName = 'ExistingTunnel')][switch]$UseExistingTunnel,
    [ValidateRange(1, 65535)][int]$BrokerPort = 18883,
    [ValidateRange(1, 65535)][int]$RemoteBrokerPort = 18883,
    [string]$CertificateDirectory = (Join-Path $env:USERPROFILE '.phaeno\certs'),
    [ValidateNotNullOrEmpty()][string]$TlsServerName = 'localhost'
)

$ErrorActionPreference = 'Stop'
$apiRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\app'))
$apiProject = Join-Path $apiRoot 'PSeq.Operations.Api.csproj'
$temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\')
$keyDirectory = Join-Path $temporaryRoot ('phaeno-local-dps-' + [guid]::NewGuid().ToString('N'))
$tunnel = $null
$apiExitCode = 1
$previousEnvironment = @{}
$runtimeEnvironment = @{}
try {
    $caPath = if ($env:MQTT_CA_CERT_PATH) { $env:MQTT_CA_CERT_PATH } else { Join-Path $CertificateDirectory 'dps-ca.crt' }
    $certificatePath = if ($env:MQTT_CLIENT_CERT_PATH) { $env:MQTT_CLIENT_CERT_PATH } else { Join-Path $CertificateDirectory 'PSeq-client-01.pfx' }
    $caPath = (Resolve-Path -LiteralPath $caPath -ErrorAction Stop).Path
    $certificatePath = (Resolve-Path -LiteralPath $certificatePath -ErrorAction Stop).Path
    $certificatePassword = $env:MQTT_CLIENT_CERT_PASSWORD
    if ([string]::IsNullOrEmpty($certificatePassword)) {
        $passwordPath = $certificatePath + '.pass'
        if (-not (Test-Path -LiteralPath $passwordPath -PathType Leaf)) {
            throw 'Set MQTT_CLIENT_CERT_PASSWORD or provide the protected .pfx.pass file beside the client certificate.'
        }
        $certificatePassword = [IO.File]::ReadAllText($passwordPath).TrimEnd("`r", "`n")
    }
    $occupied = $false
    $existing = [Net.Sockets.TcpClient]::new()
    try { $existing.Connect('127.0.0.1', $BrokerPort); $occupied = $true }
    catch { }
    finally { $existing.Dispose() }
    if ($UseExistingTunnel) {
        if (-not $occupied) { throw "No existing tunnel is listening on local port $BrokerPort." }
        Write-Output "Using existing DPS tunnel on 127.0.0.1:$BrokerPort; it will remain running when the API stops."
    } else {
        if ($occupied) { throw "Local port $BrokerPort is already in use; use -UseExistingTunnel for an intentional existing tunnel." }
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
            '-o', 'IdentityAgent=none', '-o', 'StrictHostKeyChecking=yes', '-o', 'UpdateHostKeys=no',
            '-o', ('UserKnownHostsFile="' + $trustedHosts + '"'),
            '-o', 'ExitOnForwardFailure=yes', '-o', 'ConnectTimeout=10',
            '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2',
            '-i', ('"' + $temporaryKey + '"'),
            '-L', ("127.0.0.1:${BrokerPort}:localhost:${RemoteBrokerPort}"), "ubuntu@$SshHost"
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
        Write-Output "DPS SSH tunnel ready: local 127.0.0.1:$BrokerPort to EC2 localhost:$RemoteBrokerPort."
    }
    $runtimeEnvironment = @{
        ASPNETCORE_ENVIRONMENT = 'Development'
        PSeqOrderToCash__NativePSeqAccountsReceivable = 'true'
        Dps__Host = '127.0.0.1'
        Dps__Port = $BrokerPort.ToString()
        Dps__UseTls = 'true'
        Dps__TlsServerName = $TlsServerName
        Dps__CaCertificatePath = $caPath
        Dps__ClientCertificatePath = $certificatePath
        Dps__ClientCertificatePassword = $certificatePassword
    }
    foreach ($name in $runtimeEnvironment.Keys) {
        $previousEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        [Environment]::SetEnvironmentVariable($name, $runtimeEnvironment[$name], 'Process')
    }
    Push-Location $apiRoot
    try {
        & dotnet run --no-build --no-launch-profile --project $apiProject --urls 'https://localhost:44399;http://localhost:48056'
        $apiExitCode = $LASTEXITCODE
    } finally { Pop-Location }
} finally {
    foreach ($name in $previousEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($name, $previousEnvironment[$name], 'Process')
    }
    $previousEnvironment.Clear()
    $certificatePassword = $null
    if ($null -ne $runtimeEnvironment) { $runtimeEnvironment.Clear() }
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
