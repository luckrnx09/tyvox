#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Repo = "luckrnx09/tyvox"
$AppName = "Tyvox"

function Get-LatestRelease {
  $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
  return $response.tag_name
}

function Install-Windows {
  param([string]$Tag)

  $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/tags/$Tag"
  $asset = $release.assets | Where-Object { $_.name -like "*Setup*.exe" } | Select-Object -First 1

  if (-not $asset) {
    throw "No Windows installer found for $Tag"
  }

  $tempFile = Join-Path $env:TEMP $asset.name
  Write-Host "Downloading $($asset.browser_download_url)..."
  Invoke-RestMethod -Uri $asset.browser_download_url -OutFile $tempFile

  Write-Host "Installing $AppName..."
  Start-Process -FilePath $tempFile -ArgumentList "/S" -Wait

  Remove-Item -Path $tempFile -Force -ErrorAction SilentlyContinue
  Write-Host "$AppName installed."
}

$tag = Get-LatestRelease
Install-Windows -Tag $tag
