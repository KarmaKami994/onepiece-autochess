param(
  [ValidatePattern('^(all|[a-z0-9-]+)$')]
  [string] $Asset = 'all',
  [switch] $SkipEditable
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$matrixPath = Join-Path $projectRoot 'art\animation-v2\source-matrix.json'
$builder = Join-Path $projectRoot 'scripts\assets\build_v2_animation.mjs'
$libreSprite = Join-Path $projectRoot '.codex-local\tools\LibreSprite-v1.1\libresprite.exe'
$runtimeRoot = Join-Path $projectRoot 'public\assets\animations'
$editableRoot = Join-Path $projectRoot 'art\libresprite'

foreach ($required in @($matrixPath, $builder)) {
  if (-not (Test-Path -LiteralPath $required)) {
    throw "Required v2 pipeline input was not found: $required"
  }
}
if (-not $SkipEditable -and -not (Test-Path -LiteralPath $libreSprite)) {
  throw "LibreSprite was not found at $libreSprite. Install the local CLI or pass -SkipEditable to build only PNG/JSON outputs."
}

$matrix = Get-Content -LiteralPath $matrixPath -Raw | ConvertFrom-Json
$entries = @($matrix.entries)
if ($Asset -ne 'all') {
  $entries = @($entries | Where-Object { $_.id -eq $Asset })
  if ($entries.Count -eq 0) { throw "Unknown v2 asset: $Asset" }
}

foreach ($entry in $entries) {
  $stagingRoot = Join-Path ([IO.Path]::GetTempPath()) "grand-line-v2-$($entry.id)-$([Guid]::NewGuid().ToString('N'))"
  $frames = Join-Path $stagingRoot 'frames'
  $sheet = Join-Path $stagingRoot "$($entry.outputAssetKey).png"
  $metadata = Join-Path $stagingRoot "$($entry.outputAssetKey).json"
  $gif = Join-Path $stagingRoot "$($entry.outputAssetKey).gif"
  $editable = Join-Path $stagingRoot "$($entry.outputAssetKey).aseprite"
  New-Item -ItemType Directory -Force -Path $frames | Out-Null

  & node $builder `
    --matrix $matrixPath `
    --asset $entry.id `
    --sheet $sheet `
    --metadata $metadata `
    --frames-dir $frames `
    --gif $gif
  if ($LASTEXITCODE -ne 0) {
    throw "$($entry.id) v2 import failed with exit code $LASTEXITCODE"
  }
  if (-not (Test-Path -LiteralPath $sheet)) {
    Remove-Item -LiteralPath $stagingRoot -Recurse -Force
    continue
  }

  if (-not $SkipEditable) {
    $arguments = @('-b', $gif, '--save-as', $editable)
    $quotedArguments = $arguments | ForEach-Object {
      if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
    }
    $process = Start-Process `
      -FilePath $libreSprite `
      -WorkingDirectory (Split-Path -Parent $libreSprite) `
      -ArgumentList ($quotedArguments -join ' ') `
      -WindowStyle Hidden `
      -Wait `
      -PassThru
    if ($process.ExitCode -ne 0) {
      throw "LibreSprite failed for $($entry.id) with exit code $($process.ExitCode)"
    }
    if (-not (Test-Path -LiteralPath $editable)) {
      throw "LibreSprite did not create $editable"
    }
  }

  $outputDirectory = Join-Path $runtimeRoot $entry.outputAssetKey
  New-Item -ItemType Directory -Force -Path $outputDirectory, $editableRoot | Out-Null
  Copy-Item -LiteralPath $sheet -Destination (Join-Path $outputDirectory "$($entry.outputAssetKey).png") -Force
  Copy-Item -LiteralPath $metadata -Destination (Join-Path $outputDirectory "$($entry.outputAssetKey).json") -Force
  if (-not $SkipEditable) {
    Copy-Item -LiteralPath $editable -Destination (Join-Path $editableRoot "$($entry.outputAssetKey).aseprite") -Force
  }
  Remove-Item -LiteralPath $stagingRoot -Recurse -Force
  Write-Output "Built $($entry.outputAssetKey)"
}

Write-Output 'V2 asset pipeline complete. Missing or unapproved external sources stayed on their v1 fallbacks.'
