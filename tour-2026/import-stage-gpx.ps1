<#
.SYNOPSIS
Importa o substitueix el GPX d'una etapa del Tour 2026.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\import-stage-gpx.ps1 `
  -Stage 9 `
  -FilePath C:\rutes\tour-stage-9-final.gpx
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidateRange(1, 21)]
    [int]$Stage,

    [Parameter(Mandatory)]
    [string]$FilePath,

    [switch]$AcceptDistanceMismatch
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Convert-DegreesToRadians {
    param([double]$Degrees)
    return $Degrees * [Math]::PI / 180
}

function Get-HaversineDistanceKm {
    param(
        [double]$Latitude1,
        [double]$Longitude1,
        [double]$Latitude2,
        [double]$Longitude2
    )

    $EarthRadiusKm = 6371.0088
    $Lat1 = Convert-DegreesToRadians $Latitude1
    $Lon1 = Convert-DegreesToRadians $Longitude1
    $Lat2 = Convert-DegreesToRadians $Latitude2
    $Lon2 = Convert-DegreesToRadians $Longitude2
    $DeltaLatitude = $Lat2 - $Lat1
    $DeltaLongitude = $Lon2 - $Lon1

    $A =
        [Math]::Sin($DeltaLatitude / 2) *
        [Math]::Sin($DeltaLatitude / 2) +
        [Math]::Cos($Lat1) *
        [Math]::Cos($Lat2) *
        [Math]::Sin($DeltaLongitude / 2) *
        [Math]::Sin($DeltaLongitude / 2)

    return 2 * $EarthRadiusKm * [Math]::Atan2(
        [Math]::Sqrt($A),
        [Math]::Sqrt(1 - $A)
    )
}

function Get-GpxDistanceKm {
    param([string]$Path)

    [xml]$Xml = Get-Content -LiteralPath $Path -Raw
    $Nodes = @(
        $Xml.SelectNodes(
            "//*[local-name()='trkpt' or local-name()='rtept']"
        )
    )

    if ($Nodes.Count -lt 2) {
        throw "El GPX no conté prou punts."
    }

    $Distance = 0.0

    for ($Index = 1; $Index -lt $Nodes.Count; $Index += 1) {
        $Previous = $Nodes[$Index - 1]
        $Current = $Nodes[$Index]

        $Distance += Get-HaversineDistanceKm `
            -Latitude1 ([double]::Parse(
                $Previous.lat,
                [Globalization.CultureInfo]::InvariantCulture
            )) `
            -Longitude1 ([double]::Parse(
                $Previous.lon,
                [Globalization.CultureInfo]::InvariantCulture
            )) `
            -Latitude2 ([double]::Parse(
                $Current.lat,
                [Globalization.CultureInfo]::InvariantCulture
            )) `
            -Longitude2 ([double]::Parse(
                $Current.lon,
                [Globalization.CultureInfo]::InvariantCulture
            ))
    }

    return $Distance
}

$ModuleRoot = $PSScriptRoot
$GeometryStatusPath = Join-Path `
    $ModuleRoot `
    "data\geometry-status.json"

if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
    throw "No s'ha trobat el GPX: $FilePath"
}

if (-not (Test-Path -LiteralPath $GeometryStatusPath -PathType Leaf)) {
    throw "No s'ha trobat geometry-status.json."
}

$Status = Get-Content `
    -LiteralPath $GeometryStatusPath `
    -Raw |
    ConvertFrom-Json

$Entry = $Status.stages."$Stage"

if (-not $Entry) {
    throw "No s'ha trobat l'etapa $Stage al catàleg."
}

$ComputedDistance = Get-GpxDistanceKm -Path $FilePath
$OfficialDistance = [double]$Entry.officialDistanceKm
$Tolerance = [double]$Entry.toleranceKm
$Difference = [Math]::Abs(
    $ComputedDistance - $OfficialDistance
)

$Accepted =
    $AcceptDistanceMismatch -or
    ($Difference -le $Tolerance)

$GpxDirectory = Join-Path $ModuleRoot "data\gpx"
New-Item -ItemType Directory -Path $GpxDirectory -Force | Out-Null

$Destination = Join-Path `
    $GpxDirectory `
    ("stage-{0:00}.gpx" -f $Stage)

$BackupDirectory = Join-Path `
    $ModuleRoot `
    (".backups\stage-{0:00}-{1}" -f $Stage, (Get-Date -Format "yyyyMMdd-HHmmss"))

if (Test-Path -LiteralPath $Destination -PathType Leaf) {
    New-Item `
        -ItemType Directory `
        -Path $BackupDirectory `
        -Force | Out-Null

    Copy-Item `
        -LiteralPath $Destination `
        -Destination (Join-Path $BackupDirectory "route.gpx") `
        -Force

    Copy-Item `
        -LiteralPath $GeometryStatusPath `
        -Destination (Join-Path $BackupDirectory "geometry-status.json") `
        -Force
}

Copy-Item `
    -LiteralPath $FilePath `
    -Destination $Destination `
    -Force

$Entry.available = $true
$Entry.accepted = $Accepted
$Entry.file = "data/gpx/stage-{0:00}.gpx" -f $Stage
$Entry.computedDistanceKm = [Math]::Round($ComputedDistance, 2)
$Entry.differenceKm = [Math]::Round($Difference, 2)
$Entry.sourceUrl = $null

if ($Accepted) {
    $Entry.status = "accepted-local-import"
    $Entry.message =
        "GPX local importat i acceptat per la validació de distància."
}
else {
    $Entry.status = "rejected-distance-mismatch"
    $Entry.message =
        "GPX importat, però rebutjat: la diferència de distància supera la tolerància."
}

$Status.generatedAt = (Get-Date).ToString("o")

$Status |
    ConvertTo-Json -Depth 10 |
    Set-Content `
        -LiteralPath $GeometryStatusPath `
        -Encoding utf8

Write-Host ""
Write-Host "Etapa:             $Stage" -ForegroundColor Cyan
Write-Host "Distància oficial: $OfficialDistance km"
Write-Host "Distància GPX:     $([Math]::Round($ComputedDistance, 2)) km"
Write-Host "Diferència:        $([Math]::Round($Difference, 2)) km"
Write-Host "Tolerància:        $Tolerance km"

if ($Accepted) {
    Write-Host "Resultat:          ACCEPTAT" -ForegroundColor Green
}
else {
    Write-Host "Resultat:          REBUTJAT" -ForegroundColor Red
    Write-Host ""
    Write-Host "Revisa que sigui el recorregut final real." -ForegroundColor Yellow
    Write-Host "Utilitza -AcceptDistanceMismatch només després de validar-lo manualment." -ForegroundColor Yellow
}
