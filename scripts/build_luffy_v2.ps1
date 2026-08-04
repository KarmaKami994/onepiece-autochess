$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$libreSprite = Join-Path $projectRoot '.codex-local\tools\LibreSprite-v1.1\libresprite.exe'
$builder = Join-Path $projectRoot 'scripts\licensed\build_luffy_v2.mjs'
$mapping = Join-Path $projectRoot 'scripts\licensed\luffy-v2-map.json'
$licensedSource = Join-Path $projectRoot 'art\licensed-reference\gigant-battle\MonkeyDLuffy.png'
$outputDirectory = Join-Path $projectRoot 'public\assets\animations\luffy-v2'
$sourceDirectory = Join-Path $projectRoot 'art\libresprite'
$finalSheet = Join-Path $outputDirectory 'luffy-v2.png'
$finalMetadata = Join-Path $outputDirectory 'luffy-v2.json'
$finalAseprite = Join-Path $sourceDirectory 'luffy-v2.aseprite'
$stagingDirectory = Join-Path $env:TEMP "grand-line-luffy-v2-$([Guid]::NewGuid().ToString('N'))"
$stagedFrames = Join-Path $stagingDirectory 'frames'
$stagedSheet = Join-Path $stagingDirectory 'luffy-v2.png'
$stagedMetadata = Join-Path $stagingDirectory 'luffy-v2.json'
$stagedGif = Join-Path $stagingDirectory 'luffy-v2.gif'
$stagedAseprite = Join-Path $stagingDirectory 'luffy-v2.aseprite'

foreach ($file in @($libreSprite, $builder, $mapping, $licensedSource)) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Required Luffy v2 input was not found: $file"
  }
}

New-Item -ItemType Directory -Force -Path $stagingDirectory, $stagedFrames, $outputDirectory, $sourceDirectory | Out-Null

& node $builder `
  --source $licensedSource `
  --map $mapping `
  --sheet $stagedSheet `
  --metadata $stagedMetadata `
  --frames-dir $stagedFrames `
  --gif $stagedGif
if ($LASTEXITCODE -ne 0) {
  throw "Luffy v2 frame build failed with exit code $LASTEXITCODE"
}

$quotedArguments = @('-b', $stagedGif, '--save-as', $stagedAseprite) | ForEach-Object {
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
  throw "LibreSprite failed with exit code $($process.ExitCode)"
}

foreach ($file in @($stagedSheet, $stagedMetadata, $stagedAseprite)) {
  if (-not (Test-Path -LiteralPath $file)) {
    throw "Luffy v2 build did not create $file"
  }
}

Copy-Item -LiteralPath $stagedSheet -Destination $finalSheet -Force
Copy-Item -LiteralPath $stagedMetadata -Destination $finalMetadata -Force
Copy-Item -LiteralPath $stagedAseprite -Destination $finalAseprite -Force

Write-Output "Generated $finalAseprite"
Write-Output "Exported $finalSheet"
Write-Output "Exported $finalMetadata"
