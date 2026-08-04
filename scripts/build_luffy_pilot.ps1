$ErrorActionPreference = 'Stop'
& (Join-Path $PSScriptRoot 'build_character_animation.ps1') -Character 'luffy'
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
