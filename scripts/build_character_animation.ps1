param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^[a-z0-9-]+$')]
  [string] $Character
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$bundledLibreSpriteDirectory = Join-Path $projectRoot '.codex-local\tools\LibreSprite-v1.1'
$libreSprite = Join-Path $bundledLibreSpriteDirectory 'libresprite.exe'
$specificGenerator = Join-Path $projectRoot "scripts\libresprite\create_${Character}_pilot.py"
$rosterGenerator = Join-Path $projectRoot 'scripts\libresprite\create_roster_pilot.py'
$packer = Join-Path $projectRoot 'scripts\libresprite\pack_animation_frames.mjs'
$sourceDirectory = Join-Path $projectRoot 'art\libresprite'
$outputDirectory = Join-Path $projectRoot "public\assets\animations\$Character"
$sourceSprite = Join-Path $sourceDirectory "$Character-pilot.aseprite"
$sheet = Join-Path $outputDirectory "$Character.png"
$metadata = Join-Path $outputDirectory "$Character.json"
$stagingDirectory = Join-Path $env:TEMP "grand-line-auto-chess-$Character-$([Guid]::NewGuid().ToString('N'))"
$stagedFrames = Join-Path $stagingDirectory 'frames'
$stagedAnimation = Join-Path $stagingDirectory "$Character-pilot.gif"
$stagedSource = Join-Path $stagingDirectory "$Character-pilot.aseprite"
$stagedSheet = Join-Path $stagingDirectory "$Character.png"
$stagedMetadata = Join-Path $stagingDirectory "$Character.json"

if (-not (Test-Path -LiteralPath $libreSprite)) {
  throw "LibreSprite was not found at $bundledLibreSpriteDirectory"
}
if (Test-Path -LiteralPath $specificGenerator) {
  $generator = $specificGenerator
  $generatorArguments = @($generator, '--output-dir', $stagedFrames)
} elseif (Test-Path -LiteralPath $rosterGenerator) {
  $generator = $rosterGenerator
  $generatorArguments = @($generator, '--character', $Character, '--output-dir', $stagedFrames)
} else {
  throw "No generator was found for $Character"
}

New-Item -ItemType Directory -Force -Path $sourceDirectory, $outputDirectory, $stagingDirectory, $stagedFrames | Out-Null

& python $generatorArguments
if ($LASTEXITCODE -ne 0) { throw "$Character frame generation failed with exit code $LASTEXITCODE" }
& node $packer $stagedFrames $stagedAnimation
if ($LASTEXITCODE -ne 0) { throw "$Character frame packing failed with exit code $LASTEXITCODE" }

function Invoke-LibreSprite([string[]] $Arguments) {
  # The portable Windows build uses the GUI subsystem even in batch mode, so
  # Start-Process is required to wait and receive the real exit code.
  $quotedArguments = $Arguments | ForEach-Object {
    if ($_ -match '[\s"]') { '"' + ($_ -replace '"', '\"') + '"' } else { $_ }
  }
  $toolDirectory = Split-Path -Parent $libreSprite
  $process = Start-Process `
    -FilePath $libreSprite `
    -WorkingDirectory $toolDirectory `
    -ArgumentList ($quotedArguments -join ' ') `
    -WindowStyle Hidden `
    -Wait `
    -PassThru
  if ($process.ExitCode -ne 0) {
    throw "LibreSprite failed with exit code $($process.ExitCode)"
  }
}

Invoke-LibreSprite @('-b', $stagedAnimation, '--save-as', $stagedSource)
Invoke-LibreSprite @('-b', $stagedSource, '--sheet', $stagedSheet, '--data', $stagedMetadata, '--format', 'json-array', '--sheet-type', 'horizontal', '--list-layers')

foreach ($file in @($stagedSource, $stagedSheet, $stagedMetadata)) {
  if (-not (Test-Path -LiteralPath $file)) { throw "LibreSprite did not create $file" }
}

# LibreSprite records the absolute temporary sheet path in its JSON export.
# Keep generated metadata portable and safe to commit publicly.
$metadataDocument = Get-Content -LiteralPath $stagedMetadata -Raw | ConvertFrom-Json
$metadataDocument.meta.image = "$Character.png"
$metadataDocument | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $stagedMetadata -Encoding utf8NoBOM

Copy-Item -LiteralPath $stagedSource -Destination $sourceSprite -Force
Copy-Item -LiteralPath $stagedSheet -Destination $sheet -Force
Copy-Item -LiteralPath $stagedMetadata -Destination $metadata -Force

Write-Output "Generated $sourceSprite"
Write-Output "Exported $sheet"
Write-Output "Exported $metadata"
