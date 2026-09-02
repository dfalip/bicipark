[CmdletBinding()]
param(
    [int]$Port = 8000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ModuleRoot = $PSScriptRoot
$ProjectRoot = Split-Path -Parent $ModuleRoot
$ModuleName = Split-Path -Leaf $ModuleRoot
$Url = "http://localhost:$Port/$ModuleName/"

$PythonCommand = Get-Command py -ErrorAction SilentlyContinue

if (-not $PythonCommand) {
    $PythonCommand = Get-Command python -ErrorAction SilentlyContinue
}

if (-not $PythonCommand) {
    throw @"
No s'ha trobat Python.

Alternatives:
- Instal·la Python i torna-ho a provar.
- Utilitza l'extensió Live Server de Visual Studio Code.
- Publica la branca a Vercel.
"@
}

Write-Host "Servidor local de Bicipark" -ForegroundColor Cyan
Write-Host "Arrel: $ProjectRoot"
Write-Host "Joc:   $Url"
Write-Host ""
Write-Host "Prem Ctrl+C per aturar el servidor." -ForegroundColor Yellow

Start-Process $Url

$PythonExecutable = $PythonCommand.Source
& $PythonExecutable -m http.server $Port --directory $ProjectRoot
