# Create source.properties in NDK folder to fix [CXX1101] error
# Run from GTXShopApp folder: powershell -ExecutionPolicy Bypass -File scripts\fix-ndk-source-properties.ps1

$ndkVersion = "27.1.12297006"
$ndkDir = Join-Path $env:LOCALAPPDATA "Android\Sdk\ndk\$ndkVersion"
$targetFile = Join-Path $ndkDir "source.properties"
$content = "Pkg.Revision=$ndkVersion"

if (-not (Test-Path $ndkDir)) {
    Write-Host "NDK folder not found: $ndkDir"
    Write-Host "Install NDK $ndkVersion via Android Studio SDK Manager first."
    exit 1
}

Set-Content -Path $targetFile -Value $content -Encoding ASCII
Write-Host "Created: $targetFile"
Write-Host "You can run: npx expo run:android"
