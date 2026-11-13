# Wrapper Windows pour scripts/start-fork.sh (Git Bash).
# Usage : powershell -File scripts/start-fork.ps1
$ErrorActionPreference = 'Stop'
$bash = @(
  "$env:ProgramFiles\Git\bin\bash.exe",
  "${env:ProgramFiles(x86)}\Git\bin\bash.exe",
  "$env:LOCALAPPDATA\Programs\Git\bin\bash.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $bash) {
  Write-Error "Git Bash introuvable. Installez Git for Windows ou lancez start-fork.sh depuis un shell bash."
}

& $bash (Join-Path $PSScriptRoot 'start-fork.sh') @args
