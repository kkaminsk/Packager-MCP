$PathToAdd = "$env:USERPROFILE\.local\bin"
$CurrentPath = [Environment]::GetEnvironmentVariable("Path", "User")

if ($CurrentPath -notlike "*$PathToAdd*") {
    [Environment]::SetEnvironmentVariable("Path", "$CurrentPath;$PathToAdd", "User")
    Write-Host "Success: Added '$PathToAdd' to User Path."
} else {
    Write-Host "Info: Path already exists."
}