[CmdletBinding()]
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExcludedDirectories = @(
    '.git',
    '.bicipark-backups',
    'node_modules',
    'route-explorer',
    'tour-2026'
)

$Candidates = Get-ChildItem `
    -LiteralPath $ProjectRoot `
    -Recurse `
    -File `
    -ErrorAction SilentlyContinue |
    Where-Object {
        $_.Extension.ToLowerInvariant() -in @(
            '.gpx',
            '.geojson'
        )
    } |
    Where-Object {
        $FullName = $_.FullName

        -not (
            $ExcludedDirectories |
            Where-Object {
                $FullName -match
                    [regex]::Escape(
                        [IO.Path]::DirectorySeparatorChar +
                        $_ +
                        [IO.Path]::DirectorySeparatorChar
                    )
            }
        )
    } |
    Select-Object `
        FullName,
        Name,
        Extension,
        Length,
        LastWriteTime

$OutputPath = Join-Path `
    $PSScriptRoot `
    'route-candidates.csv'

$Candidates |
    Export-Csv `
        -LiteralPath $OutputPath `
        -NoTypeInformation `
        -Encoding utf8

Write-Host "[OK] Fitxers candidats: $($Candidates.Count)" -ForegroundColor Green
Write-Host "[OK] Informe: $OutputPath" -ForegroundColor Green
