<#
.SYNOPSIS
Importa una ruta real a l'Explorador de rutes.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\import-route.ps1 `
  -FilePath C:\rutes\carrilet.gpx `
  -Name "Via Verda del Carrilet" `
  -Region girona `
  -Area "Gironès i Garrotxa" `
  -Modality greenway `
  -Difficulty facil `
  -Featured `
  -Priority 1 `
  -ElevationGain 320
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$FilePath,

    [Parameter(Mandatory)]
    [string]$Name,

    [Parameter(Mandatory)]
    [ValidateSet('barcelona', 'girona', 'tarragona', 'lleida')]
    [string]$Region,

    [Parameter(Mandatory)]
    [ValidateSet('road', 'btt', 'gravel', 'urban', 'greenway')]
    [string]$Modality,

    [Parameter(Mandatory)]
    [ValidateSet('facil', 'moderada', 'dificil', 'experta')]
    [string]$Difficulty,

    [string]$Area = '',

    [string]$Description = '',

    [double]$DistanceKm = 0,

    [double]$ElevationGain = 0,

    [switch]$Featured,

    [int]$Priority = 100,

    [int]$MinimumZoom = 8
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

function Convert-ToSlug {
    param([string]$Text)

    $Normalized = $Text.Normalize(
        [Text.NormalizationForm]::FormD
    )

    $Builder = New-Object Text.StringBuilder

    foreach ($Character in $Normalized.ToCharArray()) {
        $Category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory(
            $Character
        )

        if ($Category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$Builder.Append($Character)
        }
    }

    $Result = $Builder.ToString().Normalize(
        [Text.NormalizationForm]::FormC
    ).ToLowerInvariant()

    $Result = [regex]::Replace($Result, '[^a-z0-9]+', '-')
    return $Result.Trim('-')
}

function Get-GpxPoints {
    param([string]$Path)

    [xml]$Xml = Get-Content -LiteralPath $Path -Raw

    return @(
        $Xml.SelectNodes(
            "//*[local-name()='trkpt' or local-name()='rtept']"
        ) | ForEach-Object {
            [ordered]@{
                lat = [double]::Parse(
                    $_.lat,
                    [Globalization.CultureInfo]::InvariantCulture
                )
                lng = [double]::Parse(
                    $_.lon,
                    [Globalization.CultureInfo]::InvariantCulture
                )
            }
        }
    )
}

function Add-CoordinatePairs {
    param(
        $Coordinates,
        [System.Collections.Generic.List[object]]$Points
    )

    if ($null -eq $Coordinates) {
        return
    }

    if (
        $Coordinates.Count -ge 2 -and
        $Coordinates[0] -is [ValueType] -and
        $Coordinates[1] -is [ValueType]
    ) {
        $Points.Add(
            [ordered]@{
                lat = [double]$Coordinates[1]
                lng = [double]$Coordinates[0]
            }
        )

        return
    }

    foreach ($Item in $Coordinates) {
        Add-CoordinatePairs -Coordinates $Item -Points $Points
    }
}

function Get-GeoJsonPoints {
    param([string]$Path)

    $Json = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
    $Points = New-Object 'System.Collections.Generic.List[object]'

    function Visit-Geometry {
        param($Geometry)

        if ($null -eq $Geometry) {
            return
        }

        if ($Geometry.type -eq 'GeometryCollection') {
            foreach ($Child in $Geometry.geometries) {
                Visit-Geometry $Child
            }

            return
        }

        Add-CoordinatePairs `
            -Coordinates $Geometry.coordinates `
            -Points $Points
    }

    if ($Json.type -eq 'FeatureCollection') {
        foreach ($Feature in $Json.features) {
            Visit-Geometry $Feature.geometry
        }
    }
    elseif ($Json.type -eq 'Feature') {
        Visit-Geometry $Json.geometry
    }
    else {
        Visit-Geometry $Json
    }

    return @($Points)
}

$ModuleRoot = $PSScriptRoot
$RoutesPath = Join-Path $ModuleRoot 'data\routes.json'

if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) {
    throw "No s'ha trobat el fitxer: $FilePath"
}

if (-not (Test-Path -LiteralPath $RoutesPath -PathType Leaf)) {
    throw "No s'ha trobat: $RoutesPath"
}

$Extension = [IO.Path]::GetExtension($FilePath).ToLowerInvariant()

if ($Extension -notin @('.gpx', '.geojson', '.json')) {
    throw "Només s'admeten GPX, GeoJSON o JSON."
}

$Points = if ($Extension -eq '.gpx') {
    Get-GpxPoints -Path $FilePath
}
else {
    Get-GeoJsonPoints -Path $FilePath
}

if ($Points.Count -lt 2) {
    throw "No s'han pogut extreure prou coordenades."
}

$South = ($Points | Measure-Object -Property lat -Minimum).Minimum
$North = ($Points | Measure-Object -Property lat -Maximum).Maximum
$West = ($Points | Measure-Object -Property lng -Minimum).Minimum
$East = ($Points | Measure-Object -Property lng -Maximum).Maximum

$ComputedDistance = 0.0

for ($Index = 1; $Index -lt $Points.Count; $Index += 1) {
    $Previous = $Points[$Index - 1]
    $Current = $Points[$Index]

    $ComputedDistance += Get-HaversineDistanceKm `
        -Latitude1 $Previous.lat `
        -Longitude1 $Previous.lng `
        -Latitude2 $Current.lat `
        -Longitude2 $Current.lng
}

if ($DistanceKm -le 0) {
    $DistanceKm = [Math]::Round($ComputedDistance, 2)
}

$Slug = Convert-ToSlug $Name
$DestinationDirectory = Join-Path $ModuleRoot "data\routes\$Region"

New-Item `
    -ItemType Directory `
    -Path $DestinationDirectory `
    -Force | Out-Null

$DestinationFileName = "$Slug$Extension"
$DestinationPath = Join-Path $DestinationDirectory $DestinationFileName

$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BackupDirectory = Join-Path $ModuleRoot ".backups\import-$Timestamp"

New-Item `
    -ItemType Directory `
    -Path $BackupDirectory `
    -Force | Out-Null

Copy-Item `
    -LiteralPath $RoutesPath `
    -Destination (Join-Path $BackupDirectory 'routes.json') `
    -Force

if (Test-Path -LiteralPath $DestinationPath -PathType Leaf) {
    Copy-Item `
        -LiteralPath $DestinationPath `
        -Destination (Join-Path $BackupDirectory $DestinationFileName) `
        -Force
}

Copy-Item `
    -LiteralPath $FilePath `
    -Destination $DestinationPath `
    -Force

$Routes = @(
    Get-Content -LiteralPath $RoutesPath -Raw |
    ConvertFrom-Json
)

$Existing = $Routes | Where-Object { $_.id -eq $Slug }

$NewRoute = [ordered]@{
    id = $Slug
    name = $Name
    region = $Region
    area = $Area
    modality = $Modality
    difficulty = $Difficulty
    featured = [bool]$Featured
    priority = $Priority
    minimumZoom = $MinimumZoom
    distanceKm = [Math]::Round($DistanceKm, 2)
    elevationGain = [Math]::Round($ElevationGain, 0)
    description = $Description
    center = [ordered]@{
        lat = [Math]::Round(($South + $North) / 2, 6)
        lng = [Math]::Round(($West + $East) / 2, 6)
    }
    bounds = [ordered]@{
        south = [Math]::Round($South, 6)
        west = [Math]::Round($West, 6)
        north = [Math]::Round($North, 6)
        east = [Math]::Round($East, 6)
    }
    geometryFile =
        "./data/routes/$Region/$DestinationFileName"
    enabled = $true
}

if ($Existing) {
    $Routes = @(
        $Routes | Where-Object { $_.id -ne $Slug }
    )
}

$Routes += [pscustomobject]$NewRoute

$Routes |
    ConvertTo-Json -Depth 10 |
    Set-Content -LiteralPath $RoutesPath -Encoding utf8

Write-Host ""
Write-Host "[OK] Ruta importada: $Name" -ForegroundColor Green
Write-Host "[OK] ID: $Slug" -ForegroundColor Green
Write-Host "[OK] Distància: $DistanceKm km" -ForegroundColor Green
Write-Host "[OK] Còpia: $BackupDirectory" -ForegroundColor Green
