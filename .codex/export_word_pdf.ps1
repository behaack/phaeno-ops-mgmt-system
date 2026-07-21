param(
    [Parameter(Mandatory = $true)]
    [string]$InputDocx,
    [Parameter(Mandatory = $true)]
    [string]$OutputPdf
)

$word = $null
$document = $null

try {
    $resolvedDocx = (Resolve-Path -LiteralPath $InputDocx).Path
    $resolvedPdf = [System.IO.Path]::GetFullPath($OutputPdf)
    $pdfDirectory = [System.IO.Path]::GetDirectoryName($resolvedPdf)
    [System.IO.Directory]::CreateDirectory($pdfDirectory) | Out-Null

    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $document = $word.Documents.Open($resolvedDocx, $false, $false)

    foreach ($toc in $document.TablesOfContents) {
        $toc.Update()
    }
    $document.Fields.Update() | Out-Null
    $document.Save()
    $document.ExportAsFixedFormat($resolvedPdf, 17)
}
finally {
    if ($null -ne $document) {
        $document.Close(0)
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null
    }
    if ($null -ne $word) {
        $word.Quit()
        [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
