<#
.SYNOPSIS
    PSAppDeployToolkit – WinRAR 7.13 (x64) silent install / uninstall / repair package.

.DESCRIPTION
    Drop this script into a PSAppDeployToolkit v4 package folder (v4 native template).
    Place the WinRAR installer into the .\Files folder as: winrar-x64-713.exe

    Tested with PSADT v4.1 RC and WinRAR 7.13 x64.

.NOTES
    Author: PSADT Coach
    Date: 2025-09-16
    Tested on: Windows 10/11 x64

.EXAMPLES
    Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent
    Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
#>

[CmdletBinding()]
param(
    # Default deployment type is Install
    [Parameter(Mandatory = $false)]
    [ValidateSet('Install','Uninstall','Repair')]
    [string]$DeploymentType = 'Install',

    # Default DeployMode is Auto (PSADT 4.1+). Use Silent for non‑interactive.
    [Parameter(Mandatory = $false)]
    [ValidateSet('Auto','Interactive','NonInteractive','Silent')]
    [string]$DeployMode = 'Silent',

    [Parameter(Mandatory = $false)]
    [switch]$SuppressRebootPassThru,

    [Parameter(Mandatory = $false)]
    [switch]$TerminalServerMode,

    [Parameter(Mandatory = $false)]
    [switch]$DisableLogging
)

#region Session definition
# ---------------------------------------------------------------------------------
# Define the ADT session (PSADT v4.1 style). Make sure InstallName and InstallTitle
# are set to avoid template validation errors in environments that expect them.
# ---------------------------------------------------------------------------------
$adtSession = @{
    # App variables
    AppVendor            = 'win.rar GmbH'
    AppName              = 'WinRAR'
    AppVersion           = '7.13'
    AppArch              = 'x64'
    AppLang              = 'EN'
    AppRevision          = '01'
    AppSuccessExitCodes  = @(0)
    AppRebootExitCodes   = @(1641,3010)
    AppProcessesToClose  = @(@{ Name = 'WinRAR'; Description = 'WinRAR' })
    RequireAdmin         = $true

    # UI titles (override as desired)
    InstallName          = 'WinRAR'
    InstallTitle         = 'WinRAR 7.13 (x64)'

    # Script metadata
    AppScriptVersion     = '1.0.0'
    AppScriptDate        = '2025-09-16'
    AppScriptAuthor      = 'PSADT Coach'

    # Internal wiring – do not edit
    DeploymentType       = $DeploymentType
    DeployMode           = $DeployMode
    SuppressRebootPassThru = $SuppressRebootPassThru
    TerminalServerMode   = $TerminalServerMode
    DisableLogging       = $DisableLogging
}

# Clean out null/empty values then open the session (returns the ADT session object)
$adtSession = Remove-ADTHashtableNullOrEmptyValues -Hashtable $adtSession
$adtSession = Open-ADTSession @adtSession -PassThru
#endregion

#region Helper: Common pre‑install welcome/close logic
function Invoke-PreInstallTasks {
    # Show welcome, allow deferral, and close processes if found
    $params = @{
        AllowDeferCloseProcesses = $true
        DeferTimes              = 3
        PersistPrompt           = $true
    }
    if ($adtSession.AppProcessesToClose.Count -gt 0) {
        $params.Add('CloseProcesses', $adtSession.AppProcessesToClose)
    }
    Show-ADTInstallationWelcome @params

    # Show a generic progress ring
    Show-ADTInstallationProgress
}
#endregion

#region INSTALL
function Install-ADTDeployment {
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Invoke-PreInstallTasks

    $adtSession.InstallPhase = 'Install'

    # -------------------------------------------------
    # Place the installer in .\files as winrar-x64-713.exe
    # WinRAR supports silent install with /S
    # -------------------------------------------------
    $installer = Join-Path $PSScriptRoot "files\winrar-x64-713.exe"
    if (-not (Test-Path -LiteralPath $installer)) {
        Throw "Installer not found: $installer"
    }

    # Optional: language code can be forced via /L=1033 (English) but WinRAR EN build is already English.
    $args = '/S'

    # Run the installer silently
    Start-ADTProcess -FilePath $installer -ArgumentList $args

    # Post-Install – example: pin or shortcuts adjustments can go here
    $adtSession.InstallPhase = 'Post-Install'

    # Example: display a non-blocking completion toast in interactive modes
    if ($adtSession.DeployMode -ne 'Silent') {
        Show-ADTInstallationPrompt -Message "$("$($adtSession.AppName) installation complete.")" -Icon Information -ButtonRightText 'OK' -NoWait
    }
}
#endregion

#region UNINSTALL
function Uninstall-ADTDeployment {
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Invoke-PreInstallTasks

    $adtSession.InstallPhase = 'Uninstall'

    # Try vendor uninstall silently first
    $uninstPath = Join-Path $env:ProgramFiles 'WinRAR\uninstall.exe'
    if (Test-Path -LiteralPath $uninstPath) {
        Start-ADTProcess -FilePath $uninstPath -ArgumentList '/S'
    }
    else {
        # Fallback: use Uninstall-ADTApplication to locate any WinRAR entries
        Uninstall-ADTApplication -FilterScript { $_.DisplayName -match 'WinRAR' } -ApplicationType EXE -ArgumentList '/S' -ErrorAction SilentlyContinue
    }

    $adtSession.InstallPhase = 'Post-Uninstall'
}
#endregion

#region REPAIR
function Repair-ADTDeployment {
    # For WinRAR, repair = reinstall silently
    Install-ADTDeployment
}
#endregion

#region MAIN
try {
    switch ($adtSession.DeploymentType) {
        'Install'   { Install-ADTDeployment }
        'Uninstall' { Uninstall-ADTDeployment }
        'Repair'    { Repair-ADTDeployment }
        default     { Throw "Unsupported DeploymentType: $($adtSession.DeploymentType)" }
    }
}
catch {
    # Minimal error handler – you can expand this as needed
    Write-ADTLogEntry -Message ("ERROR: " + $_.Exception.Message) -Severity 3
    if ($adtSession.DeployMode -ne 'Silent') {
        Show-ADTInstallationPrompt -Message ("$($adtSession.AppName) install failed. `n`n" + $_.Exception.Message) -Icon Stop -ButtonRightText 'Close'
    }
    throw
}
finally {
    Close-ADTSession
}
#endregion
