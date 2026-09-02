Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Implementació compatible amb Windows PowerShell 5.1.
# Utilitza arrays normals i evita Generic.List, que pot provocar
# "Los tipos de argumentos no coinciden" quan es combina amb @(...).

function ConvertTo-RouteSlug {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Text
    )

    $Normalized = $Text.Normalize(
        [Text.NormalizationForm]::FormD
    )

    $Builder = New-Object Text.StringBuilder

    foreach ($Character in $Normalized.ToCharArray()) {
        $Category =
            [Globalization.CharUnicodeInfo]::GetUnicodeCategory(
                $Character
            )

        if (
            $Category -ne
            [Globalization.UnicodeCategory]::NonSpacingMark
        ) {
            [void]$Builder.Append($Character)
        }
    }

    $Result = $Builder.ToString().Normalize(
        [Text.NormalizationForm]::FormC
    ).ToLowerInvariant()

    $Result = [regex]::Replace(
        $Result,
        '[^a-z0-9]+',
        '-'
    )

    return $Result.Trim('-')
}

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

function New-Point {
    param(
        [double]$Latitude,
        [double]$Longitude
    )

    return [pscustomobject]@{
        lat = $Latitude
        lng = $Longitude
    }
}

function Get-GpxSequences {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    [xml]$Xml = Get-Content -LiteralPath $Path -Raw
    $Sequences = @()

    $TrackSegments = @(
        $Xml.SelectNodes(
            "//*[local-name()='trkseg']"
        )
    )

    foreach ($TrackSegment in $TrackSegments) {
        $Points = @()

        $TrackPoints = @(
            $TrackSegment.SelectNodes(
                "./*[local-name()='trkpt']"
            )
        )

        foreach ($Node in $TrackPoints) {
            $Latitude = [double]::Parse(
                [string]$Node.lat,
                [Globalization.CultureInfo]::InvariantCulture
            )

            $Longitude = [double]::Parse(
                [string]$Node.lon,
                [Globalization.CultureInfo]::InvariantCulture
            )

            $Points += ,(New-Point `
                -Latitude $Latitude `
                -Longitude $Longitude)
        }

        if ($Points.Count -ge 2) {
            $Sequences += ,([pscustomobject]@{
                points = [object[]]$Points
            })
        }
    }

    if ($Sequences.Count -eq 0) {
        $RouteNodes = @(
            $Xml.SelectNodes(
                "//*[local-name()='rtept']"
            )
        )

        if ($RouteNodes.Count -ge 2) {
            $Points = @()

            foreach ($Node in $RouteNodes) {
                $Latitude = [double]::Parse(
                    [string]$Node.lat,
                    [Globalization.CultureInfo]::InvariantCulture
                )

                $Longitude = [double]::Parse(
                    [string]$Node.lon,
                    [Globalization.CultureInfo]::InvariantCulture
                )

                $Points += ,(New-Point `
                    -Latitude $Latitude `
                    -Longitude $Longitude)
            }

            $Sequences += ,([pscustomobject]@{
                points = [object[]]$Points
            })
        }
    }

    Write-Output -NoEnumerate ([object[]]$Sequences)
}

function Convert-CoordinateSequence {
    param($Coordinates)

    $Points = @()

    foreach ($Coordinate in @($Coordinates)) {
        $Pair = @($Coordinate)

        if ($null -eq $Coordinate -or $Pair.Count -lt 2) {
            continue
        }

        $Longitude = [double]$Pair[0]
        $Latitude = [double]$Pair[1]

        $Points += ,(New-Point `
            -Latitude $Latitude `
            -Longitude $Longitude)
    }

    Write-Output -NoEnumerate ([object[]]$Points)
}

function Get-GeoJsonGeometrySequences {
    param($Geometry)

    if ($null -eq $Geometry) {
        return
    }

    switch ([string]$Geometry.type) {
        'LineString' {
            $Points = @(
                Convert-CoordinateSequence `
                    -Coordinates $Geometry.coordinates
            )

            # Write-Output -NoEnumerate fa que, en alguns contextos,
            # arribi un array dins d'un array. El normalitzem.
            if (
                $Points.Count -eq 1 -and
                $Points[0] -is [System.Array]
            ) {
                $Points = @($Points[0])
            }

            if ($Points.Count -ge 2) {
                [pscustomobject]@{
                    points = [object[]]$Points
                }
            }
        }

        'MultiLineString' {
            foreach ($Line in @($Geometry.coordinates)) {
                $Points = @(
                    Convert-CoordinateSequence `
                        -Coordinates $Line
                )

                if (
                    $Points.Count -eq 1 -and
                    $Points[0] -is [System.Array]
                ) {
                    $Points = @($Points[0])
                }

                if ($Points.Count -ge 2) {
                    [pscustomobject]@{
                        points = [object[]]$Points
                    }
                }
            }
        }

        'GeometryCollection' {
            foreach ($Child in @($Geometry.geometries)) {
                Get-GeoJsonGeometrySequences -Geometry $Child
            }
        }
    }
}

function Get-GeoJsonSequences {
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    $Json = Get-Content `
        -LiteralPath $Path `
        -Raw |
        ConvertFrom-Json

    $Sequences = @()

    switch ([string]$Json.type) {
        'FeatureCollection' {
            foreach ($Feature in @($Json.features)) {
                $Sequences += @(
                    Get-GeoJsonGeometrySequences `
                        -Geometry $Feature.geometry
                )
            }
        }

        'Feature' {
            $Sequences += @(
                Get-GeoJsonGeometrySequences `
                    -Geometry $Json.geometry
            )
        }

        default {
            $Sequences += @(
                Get-GeoJsonGeometrySequences `
                    -Geometry $Json
            )
        }
    }

    Write-Output -NoEnumerate ([object[]]$Sequences)
}

function Get-RouteGeometrySummary {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "No s'ha trobat el fitxer: $Path"
    }

    $Extension = [IO.Path]::GetExtension(
        $Path
    ).ToLowerInvariant()

    $Sequences = if ($Extension -eq '.gpx') {
        @(Get-GpxSequences -Path $Path)
    }
    elseif ($Extension -eq '.geojson') {
        @(Get-GeoJsonSequences -Path $Path)
    }
    else {
        throw "Format no admès: $Extension"
    }

    if (
        $Sequences.Count -eq 1 -and
        $Sequences[0] -is [System.Array]
    ) {
        $Sequences = @($Sequences[0])
    }

    if ($Sequences.Count -eq 0) {
        throw "No s'han trobat línies de ruta."
    }

    $AllPoints = @()
    $DistanceKm = 0.0

    foreach ($Sequence in $Sequences) {
        $Points = @($Sequence.points)

        if (
            $Points.Count -eq 1 -and
            $Points[0] -is [System.Array]
        ) {
            $Points = @($Points[0])
        }

        foreach ($Point in $Points) {
            $AllPoints += ,$Point
        }

        for (
            $Index = 1;
            $Index -lt $Points.Count;
            $Index += 1
        ) {
            $Previous = $Points[$Index - 1]
            $Current = $Points[$Index]

            $DistanceKm += Get-HaversineDistanceKm `
                -Latitude1 ([double]$Previous.lat) `
                -Longitude1 ([double]$Previous.lng) `
                -Latitude2 ([double]$Current.lat) `
                -Longitude2 ([double]$Current.lng)
        }
    }

    if ($AllPoints.Count -lt 2) {
        throw "No s'han trobat prou punts de ruta."
    }

    $South = (
        $AllPoints |
        Measure-Object -Property lat -Minimum
    ).Minimum

    $North = (
        $AllPoints |
        Measure-Object -Property lat -Maximum
    ).Maximum

    $West = (
        $AllPoints |
        Measure-Object -Property lng -Minimum
    ).Minimum

    $East = (
        $AllPoints |
        Measure-Object -Property lng -Maximum
    ).Maximum

    return [pscustomobject]@{
        pointCount = $AllPoints.Count
        sequenceCount = $Sequences.Count
        distanceKm = [Math]::Round($DistanceKm, 2)
        center = [ordered]@{
            lat = [Math]::Round(
                ([double]$South + [double]$North) / 2,
                6
            )
            lng = [Math]::Round(
                ([double]$West + [double]$East) / 2,
                6
            )
        }
        bounds = [ordered]@{
            south = [Math]::Round([double]$South, 6)
            west = [Math]::Round([double]$West, 6)
            north = [Math]::Round([double]$North, 6)
            east = [Math]::Round([double]$East, 6)
        }
    }
}

function Get-RouteRegion {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        $Summary,

        [string]$HintText = ''
    )

    $Text = $HintText.ToLowerInvariant()

    if ($Text -match 'girona|gironès|garrotxa|empord|costa.brava') {
        return 'girona'
    }

    if ($Text -match 'tarragona|ebre|priorat|camp.de.tarragona') {
        return 'tarragona'
    }

    if ($Text -match 'lleida|segr|pallars|aran|urgell|solson') {
        return 'lleida'
    }

    if ($Text -match 'barcelona|collserola|maresme|vallès|penedès|garraf') {
        return 'barcelona'
    }

    $Latitude = [double]$Summary.center.lat
    $Longitude = [double]$Summary.center.lng

    $InsideCatalonia =
        $Latitude -ge 40.45 -and
        $Latitude -le 42.95 -and
        $Longitude -ge -0.20 -and
        $Longitude -le 3.40

    if (-not $InsideCatalonia) {
        return 'international'
    }

    if (
        $Latitude -ge 41.55 -and
        $Longitude -ge 2.15
    ) {
        return 'girona'
    }

    if (
        $Latitude -le 41.55 -and
        $Longitude -le 1.75
    ) {
        return 'tarragona'
    }

    if ($Longitude -lt 1.55) {
        return 'lleida'
    }

    return 'barcelona'
}

function Get-RouteModality {
    [CmdletBinding()]
    param(
        [string]$HintText = ''
    )

    $Text = $HintText.ToLowerInvariant()

    if ($Text -match 'btt|mtb|mountain.?bike|sender|singletrack') {
        return 'btt'
    }

    if ($Text -match 'gravel') {
        return 'gravel'
    }

    if ($Text -match 'via.?verda|greenway|carrilet') {
        return 'greenway'
    }

    if ($Text -match 'urban|urbana|carril.?bici') {
        return 'urban'
    }

    return 'road'
}

function Get-RouteDifficulty {
    [CmdletBinding()]
    param(
        [string]$HintText = ''
    )

    $Text = $HintText.ToLowerInvariant()

    if ($Text -match 'expert|extrem|molt.?dif') {
        return 'experta'
    }

    if ($Text -match 'dif[ií]cil|hard') {
        return 'dificil'
    }

    if ($Text -match 'f[aà]cil|easy|family|familiar') {
        return 'facil'
    }

    return 'moderada'
}

function ConvertTo-RouteDisplayName {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [string]$FileName
    )

    $BaseName = [IO.Path]::GetFileNameWithoutExtension(
        $FileName
    )

    $Words = [regex]::Split(
        $BaseName,
        '[-_\.\s]+'
    ) | Where-Object { $_ }

    $TextInfo = (
        [Globalization.CultureInfo]::GetCultureInfo(
            'ca-ES'
        )
    ).TextInfo

    return $TextInfo.ToTitleCase(
        ($Words -join ' ').ToLowerInvariant()
    )
}

Export-ModuleMember -Function @(
    'ConvertTo-RouteSlug',
    'Get-RouteGeometrySummary',
    'Get-RouteRegion',
    'Get-RouteModality',
    'Get-RouteDifficulty',
    'ConvertTo-RouteDisplayName'
)
