[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [uri]$ApiBaseUrl,

    [Parameter(Mandatory = $true)]
    [uri]$PortalBaseUrl,

    [string]$EvidenceDirectory = (Join-Path $PWD "artifacts/pseq-order-to-cash-acceptance"),

    [switch]$NonInteractive
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$productionHosts = @(
    "portal.phaenobiotech.com"
)

if ($productionHosts -contains $ApiBaseUrl.Host -or
    $productionHosts -contains $PortalBaseUrl.Host) {
    throw "This acceptance script is dedicated-staging only and refuses the production Portal host."
}

$bearerToken = $env:PSEQ_STAGING_BEARER_TOKEN
if ([string]::IsNullOrWhiteSpace($bearerToken)) {
    throw "Set PSEQ_STAGING_BEARER_TOKEN to a short-lived dedicated-staging token. Do not place it in this script or its evidence."
}

$resolvedEvidenceDirectory = [System.IO.Path]::GetFullPath($EvidenceDirectory)
New-Item -ItemType Directory -Force -Path $resolvedEvidenceDirectory | Out-Null

$headers = @{
    Authorization = "Bearer $bearerToken"
    Accept = "application/json"
}

function Invoke-StagingGet {
    param([Parameter(Mandatory = $true)][string]$Path)

    $requestUri = [uri]::new($ApiBaseUrl, $Path)
    Invoke-RestMethod -Method Get -Uri $requestUri -Headers $headers
}

function Save-Evidence {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][object]$Value
    )

    $safeName = $Name -replace '[^a-zA-Z0-9_-]', '-'
    $path = Join-Path $resolvedEvidenceDirectory "$safeName.json"
    $Value | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $path -Encoding utf8NoBOM
}

function Confirm-Checkpoint {
    param(
        [Parameter(Mandatory = $true)][int]$Number,
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$ExpectedEvidence
    )

    $checkpoint = [ordered]@{
        number = $Number
        name = $Name
        expectedEvidence = $ExpectedEvidence
        recordedAtUtc = [DateTime]::UtcNow.ToString("O")
        status = "Pending"
        operatorNote = $null
    }

    if (-not $NonInteractive) {
        Write-Host ""
        Write-Host "[$Number] $Name"
        Write-Host $ExpectedEvidence
        $answer = Read-Host "Record PASS, FAIL, or BLOCKED"
        if ($answer -notin @("PASS", "FAIL", "BLOCKED")) {
            throw "Checkpoint $Number requires PASS, FAIL, or BLOCKED."
        }
        $checkpoint.status = $answer
        $checkpoint.operatorNote = Read-Host "Evidence note or artifact reference"
    }

    Save-Evidence -Name ("checkpoint-{0:d2}-{1}" -f $Number, $Name) -Value $checkpoint
    return $checkpoint
}

$health = Invoke-RestMethod -Method Get -Uri ([uri]::new($ApiBaseUrl, "/api/health"))
Save-Evidence -Name "api-health" -Value $health

$session = Invoke-StagingGet -Path "/api/session"
if ($session.state -ne "ready" -or -not $session.isPlatformAdmin) {
    throw "The staging token must resolve to a ready internal Phaeno session for setup evidence."
}
Save-Evidence -Name "session-capabilities" -Value ([ordered]@{
    state = $session.state
    userId = $session.user.id
    capabilities = $session.capabilities
})

$requiredFlags = @(
    "InvitationDelivery",
    "DerivedReadiness",
    "BusinessRoles",
    "GovernedPSeqResults",
    "NativePSeqAccountsReceivable",
    "AttentionOperations",
    "DualControlAuditOnly"
)

$run = [ordered]@{
    startedAtUtc = [DateTime]::UtcNow.ToString("O")
    apiBaseUrl = $ApiBaseUrl.AbsoluteUri
    portalBaseUrl = $PortalBaseUrl.AbsoluteUri
    productionRefusedHosts = $productionHosts
    requiredFlags = $requiredFlags
    currency = "USD"
    resultReleasePaymentGate = $false
    syntheticRecordPrefix = "SOP-MOCK-OTC-20260829"
}
Save-Evidence -Name "run-context" -Value $run

$checkpoints = @(
    Confirm-Checkpoint 1 "configuration-and-staffing" "Show all additive flags enabled, DualControlEnforced disabled, valid Postmark/webhook/storage/scanner/retention configuration, and distinct Commercial, Lab Operator, Scientific Reviewer, Result Release, Billing, Cash Operator, and Cash Reconciler actors."
    Confirm-Checkpoint 2 "crm-account-and-staging" "Create or reuse the synthetic Customer; show active Customer/entitlement/offering minimum, blockers visible in the selector, and an internal staged order created before an active Customer administrator."
    Confirm-Checkpoint 3 "invitation-delivery-and-acceptance" "Show queued/sending/provider-accepted/delivered attempt evidence, idempotent webhook replay, access still Pending before acceptance, accepted membership afterward, expiry/revoke/resend behavior, and hard-bounce revoke/reissue to a corrected address."
    Confirm-Checkpoint 4 "derived-readiness" "Show structured blocker codes before completion, then Ready after administrator, order/sample/shipping/result-destination/instruction, billing/address/terms/tax, and Finance approval are complete. Show a deliberate manual Blocked override and clear it."
    Confirm-Checkpoint 5 "quote-and-commitment" "Show staged quote preparation, quote issue blocked until full readiness, POMS tax calculation, immutable billing/tax/Net-30 snapshots, Customer approver acceptance, and duplicate-command idempotency."
    Confirm-Checkpoint 6 "samples-and-lab-execution" "Exercise receipt, accession, rejection/replacement, execution, failed QC, library/batch/sendout, and show the contributor actor cannot scientifically approve. Show protocol author cannot approve/activate that version."
    Confirm-Checkpoint 7 "result-package-and-scientific-approval" "Register a manifest twice with one idempotent package, transfer final artifacts directly to object storage, reject incomplete/checksum-failed/malware-failed packages, and pin the clean package/version in scientific approval and LabWorkReadyForRelease."
    Confirm-Checkpoint 8 "release-download-correction-retention" "Release one sample while another remains in progress without checking invoice/credit; show notification and Customer download evidence, corrected package/approval/release version, withdrawal history, notification outage attention, warning/cutoff/grace/deletion evidence, and authorized reissue."
    Confirm-Checkpoint 9 "completion-and-invoice" "Complete the job twice and show one numbered USD invoice from the accepted quote, due date completion plus snapshotted terms, exact decimal/tax totals, immutable Customer-visible PDF, and append-only credit/debit/write-off behavior."
    Confirm-Checkpoint 10 "receipts-import-and-allocation" "Record a manual evidenced receipt; preview then confirm CSV; reject duplicate external ID and non-USD; show no auto-apply, partial payment, one-to-many and many-to-one allocations, overpayment/unapplied cash, reversal history, and aging/open-invoice/unapplied reports."
    Confirm-Checkpoint 11 "reconciliation-and-paid" "Create an imbalanced reconciliation and show attention; balance and submit it; show contributor/submitter approval rejection; approve with a distinct Cash Reconciler; retain immutable closeout; show final invoice Paid."
    Confirm-Checkpoint 12 "attention-accessibility-and-isolation" "Show every owned attention category with owner/age/status/attempts/next action/resolution; verify loading/checking/empty/blocked/stale/failure states, keyboard/focus/zoom/reflow/Axe WCAG 2.2 AA, tenant isolation, audit events, and no production record changes."
)

$failedOrBlocked = @($checkpoints | Where-Object { $_.status -in @("FAIL", "BLOCKED", "Pending") })
$summary = [ordered]@{
    completedAtUtc = [DateTime]::UtcNow.ToString("O")
    checkpointCount = $checkpoints.Count
    passCount = @($checkpoints | Where-Object status -eq "PASS").Count
    failCount = @($checkpoints | Where-Object status -eq "FAIL").Count
    blockedCount = @($checkpoints | Where-Object status -eq "BLOCKED").Count
    pendingCount = @($checkpoints | Where-Object status -eq "Pending").Count
    activationEligible = $failedOrBlocked.Count -eq 0
    requiredSignoff = @("Commercial", "Lab Operations", "Scientific", "Finance", "Security", "Accessibility")
    productionDeploymentAuthorized = $false
}
Save-Evidence -Name "acceptance-summary" -Value $summary

$summary | ConvertTo-Json -Depth 10
if ($failedOrBlocked.Count -gt 0) {
    exit 2
}
