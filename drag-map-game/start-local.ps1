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

Pots:
- instal·lar Python;
- utilitzar l'extensió Live Server de Visual Studio Code;
- o publicar el projecte a Vercel.
"@
}

$PythonExecutable = $PythonCommand.Source

Write-Host "Servidor local de Bicipark" -ForegroundColor Cyan
Write-Host "Arrel: $ProjectRoot"
Write-Host "Joc:   $Url"
Write-Host ""
Write-Host "Prem Ctrl+C per aturar el servidor." -ForegroundColor Yellow

Start-Process $Url

& $PythonExecutable -m http.server $Port --directory $ProjectRoot
