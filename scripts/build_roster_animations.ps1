$ErrorActionPreference = 'Stop'

$characters = @(
  'luffy', 'zoro', 'nami', 'usopp', 'chopper', 'tashigi',
  'sanji', 'robin', 'smoker', 'sabo', 'kid', 'crocodile',
  'law', 'ace', 'hancock', 'doflamingo', 'garp', 'mihawk'
)

$builder = Join-Path $PSScriptRoot 'build_character_animation.ps1'
foreach ($character in $characters) {
  Write-Output "Building $character..."
  & $builder -Character $character
  if ($LASTEXITCODE -ne 0) {
    throw "$character animation build failed with exit code $LASTEXITCODE"
  }
}

Write-Output "Built $($characters.Count) character animation sets."
