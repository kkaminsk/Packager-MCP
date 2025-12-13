# Detection script for WinRAR
# Exit 0 if detected, Exit 1 if not detected
# Customize this script with your detection logic

# Example: Check for application in common locations
$PossiblePaths = @(
    "$env:ProgramFiles\WinRAR\*.exe",
    "$env:ProgramFiles(x86)\WinRAR\*.exe"
)

foreach ($PathPattern in $PossiblePaths) {
    $Found = Get-ChildItem -Path $PathPattern -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($Found) {
        Write-Host "Detected: WinRAR found at $($Found.FullName)"
        exit 0
    }
}

# Example: Check uninstall registry
$UninstallKeys = @(
    "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
    "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
)

foreach ($Key in $UninstallKeys) {
    $App = Get-ChildItem -Path $Key -ErrorAction SilentlyContinue |
           Get-ItemProperty |
           Where-Object { $_.DisplayName -like "*WinRAR*" } |
           Select-Object -First 1
    if ($App) {
        Write-Host "Detected: WinRAR found in registry (Version: $($App.DisplayVersion))"
        exit 0
    }
}

Write-Host "Not detected: WinRAR not found"
exit 1
