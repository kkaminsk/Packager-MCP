<#

.SYNOPSIS
PSAppDeployToolkit - This script performs the installation or uninstallation of an application(s).

.DESCRIPTION
- The script is provided as a template to perform an install, uninstall, or repair of an application(s).
- The script either performs an "Install", "Uninstall", or "Repair" deployment type.
- The install deployment type is broken down into 3 main sections/phases: Pre-Install, Install, and Post-Install.

The script imports the PSAppDeployToolkit module which contains the logic and functions required to install or uninstall an application.

.PARAMETER DeploymentType
The type of deployment to perform.

.PARAMETER DeployMode
Specifies whether the installation should be run in Interactive (shows dialogs), Silent (no dialogs), NonInteractive (dialogs without prompts) mode, or Auto (shows dialogs if a user is logged on, device is not in the OOBE, and there's no running apps to close).

Silent mode is automatically set if it is detected that the process is not user interactive, no users are logged on, the device is in Autopilot mode, or there's specified processes to close that are currently running.

.PARAMETER SuppressRebootPassThru
Suppresses the 3010 return code (requires restart) from being passed back to the parent process (e.g. SCCM) if detected from an installation. If 3010 is passed back to SCCM, a reboot prompt will be triggered.

.PARAMETER TerminalServerMode
Changes to "user install mode" and back to "user execute mode" for installing/uninstalling applications for Remote Desktop Session Hosts/Citrix servers.

.PARAMETER DisableLogging
Disables logging to file for the script.

.EXAMPLE
powershell.exe -File Invoke-AppDeployToolkit.ps1

.EXAMPLE
powershell.exe -File Invoke-AppDeployToolkit.ps1 -DeployMode Silent

.EXAMPLE
powershell.exe -File Invoke-AppDeployToolkit.ps1 -DeploymentType Uninstall

.EXAMPLE
Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent

.INPUTS
None. You cannot pipe objects to this script.

.OUTPUTS
None. This script does not generate any output.

.NOTES
Toolkit Exit Code Ranges:
- 60000 - 68999: Reserved for built-in exit codes in Invoke-AppDeployToolkit.ps1, and Invoke-AppDeployToolkit.exe
- 69000 - 69999: Recommended for user customized exit codes in Invoke-AppDeployToolkit.ps1
- 70000 - 79999: Recommended for user customized exit codes in PSAppDeployToolkit.Extensions module.

.LINK
https://psappdeploytoolkit.com

#>

[CmdletBinding()]
param
(
    # Default is 'Install'.
    [Parameter(Mandatory = $false)]
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [System.String]$DeploymentType,

    # Default is 'Auto'. Don't hard-code this unless required.
    [Parameter(Mandatory = $false)]
    [ValidateSet('Auto', 'Interactive', 'NonInteractive', 'Silent')]
    [System.String]$DeployMode,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$SuppressRebootPassThru,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$TerminalServerMode,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$DisableLogging
)


##================================================
## MARK: Variables
##================================================

$adtSession = @{
    # App variables.
    AppVendor = 'Marcin Otorowski'
    AppName = 'MSIX Hero'
    AppVersion = '3.1.0.0'
    AppArch = 'neutral'
    AppLang = 'EN'
    AppRevision = '01'
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)
    AppProcessesToClose = @(@{ Name = 'MSIXHero'; Description = 'MSIX Hero' })
    AppScriptVersion = '1.0.0'
    AppScriptDate = '2024-12-09'
    AppScriptAuthor = 'PSAppDeployToolkit'
    RequireAdmin = $false  # MSIX can install in user context

    # Install Titles (Only set here to override defaults set by the toolkit).
    InstallName = ''
    InstallTitle = ''

    # Script variables.
    DeployAppScriptFriendlyName = $MyInvocation.MyCommand.Name
    DeployAppScriptParameters = $PSBoundParameters
    DeployAppScriptVersion = '4.1.7'
}

# MSIX-specific variables
$PackageName = 'MSIXHero'
$PackageFamilyName = 'MSIXHero_zxq1da1qqbeze'
$MsixFile = 'msix-hero-3.1.0.0.msix'

function Install-ADTDeployment
{
    [CmdletBinding()]
    param
    (
    )

    ##================================================
    ## MARK: Pre-Install
    ##================================================
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"

    ## Show Welcome Message, close MSIX Hero if running
    $saiwParams = @{
        AllowDeferCloseProcesses = $true
        DeferTimes = 3
        PersistPrompt = $true
    }
    if ($adtSession.AppProcessesToClose.Count -gt 0)
    {
        $saiwParams.Add('CloseProcesses', $adtSession.AppProcessesToClose)
    }
    Show-ADTInstallationWelcome @saiwParams

    ## Show Progress Message
    Show-ADTInstallationProgress -StatusMessage "Installing $($adtSession.AppName)..."

    ## Check for and remove existing installation
    $existingPackage = Get-AppxPackage -Name $PackageName -ErrorAction SilentlyContinue
    if ($existingPackage)
    {
        Write-ADTLogEntry -Message "Found existing package: $($existingPackage.Name) v$($existingPackage.Version)"
        Write-ADTLogEntry -Message "Removing existing package for clean install"
        Remove-AppxPackage -Package $existingPackage.PackageFullName
    }


    ##================================================
    ## MARK: Install
    ##================================================
    $adtSession.InstallPhase = $adtSession.DeploymentType

    ## Install MSIX package
    $msixPath = Join-Path -Path $adtSession.DirFiles -ChildPath $MsixFile
    Write-ADTLogEntry -Message "Installing MSIX package: $msixPath"

    try
    {
        if ($adtSession.IsSystemAccount)
        {
            # Running as SYSTEM - provision for all users
            Write-ADTLogEntry -Message "Provisioning package for all users (SYSTEM context)"
            Add-AppxProvisionedPackage -Online -PackagePath $msixPath -SkipLicense -ErrorAction Stop
        }
        else
        {
            # Running as current user
            Write-ADTLogEntry -Message "Installing package for current user"
            Add-AppxPackage -Path $msixPath -ErrorAction Stop
        }

        Write-ADTLogEntry -Message "MSIX installation completed successfully"
    }
    catch
    {
        Write-ADTLogEntry -Message "MSIX installation failed: $($_.Exception.Message)" -Severity 3
        throw
    }


    ##================================================
    ## MARK: Post-Install
    ##================================================
    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"

    ## Verify installation
    Start-Sleep -Seconds 2
    $installedPackage = Get-AppxPackage -Name $PackageName -ErrorAction SilentlyContinue
    if ($installedPackage)
    {
        Write-ADTLogEntry -Message "Installation verified: $($installedPackage.Name) v$($installedPackage.Version)"
        Write-ADTLogEntry -Message "Package Family Name: $($installedPackage.PackageFamilyName)"
        Write-ADTLogEntry -Message "Install Location: $($installedPackage.InstallLocation)"
    }
    else
    {
        Write-ADTLogEntry -Message "Warning: Package not found after installation" -Severity 2
    }

    ## Display completion message
    Show-ADTInstallationPrompt -Message "$($adtSession.AppName) installation complete." -ButtonRightText 'OK' -Icon Information -NoWait
}

function Uninstall-ADTDeployment
{
    [CmdletBinding()]
    param
    (
    )

    ##================================================
    ## MARK: Pre-Uninstall
    ##================================================
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"

    ## If there are processes to close, show Welcome Message with a 60 second countdown
    if ($adtSession.AppProcessesToClose.Count -gt 0)
    {
        Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
    }

    ## Show Progress Message
    Show-ADTInstallationProgress -StatusMessage "Uninstalling $($adtSession.AppName)..."


    ##================================================
    ## MARK: Uninstall
    ##================================================
    $adtSession.InstallPhase = $adtSession.DeploymentType

    ## Find and remove the MSIX package
    $installedPackage = Get-AppxPackage -Name $PackageName -ErrorAction SilentlyContinue
    if ($installedPackage)
    {
        Write-ADTLogEntry -Message "Removing package: $($installedPackage.PackageFullName)"
        try
        {
            Remove-AppxPackage -Package $installedPackage.PackageFullName -ErrorAction Stop
            Write-ADTLogEntry -Message "Package removed successfully"
        }
        catch
        {
            Write-ADTLogEntry -Message "Failed to remove package: $($_.Exception.Message)" -Severity 3
            throw
        }
    }
    else
    {
        Write-ADTLogEntry -Message "Package not found - may already be uninstalled" -Severity 2
    }

    ## Remove provisioned package if running as SYSTEM
    if ($adtSession.IsSystemAccount)
    {
        $provisionedPackage = Get-AppxProvisionedPackage -Online | Where-Object { $_.DisplayName -eq $PackageName }
        if ($provisionedPackage)
        {
            Write-ADTLogEntry -Message "Removing provisioned package"
            Remove-AppxProvisionedPackage -Online -PackageName $provisionedPackage.PackageName
        }
    }


    ##================================================
    ## MARK: Post-Uninstallation
    ##================================================
    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"

    ## Verify removal
    $remainingPackage = Get-AppxPackage -Name $PackageName -ErrorAction SilentlyContinue
    if (-not $remainingPackage)
    {
        Write-ADTLogEntry -Message "Uninstallation verified - package removed"
    }
    else
    {
        Write-ADTLogEntry -Message "Warning: Package still present after uninstall" -Severity 2
    }
}

function Repair-ADTDeployment
{
    [CmdletBinding()]
    param
    (
    )

    ##================================================
    ## MARK: Pre-Repair
    ##================================================
    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"

    ## If there are processes to close, show Welcome Message
    if ($adtSession.AppProcessesToClose.Count -gt 0)
    {
        Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
    }

    ## Show Progress Message
    Show-ADTInstallationProgress -StatusMessage "Repairing $($adtSession.AppName)..."


    ##================================================
    ## MARK: Repair
    ##================================================
    $adtSession.InstallPhase = $adtSession.DeploymentType

    ## For MSIX, repair means remove and reinstall
    Write-ADTLogEntry -Message "MSIX repair: Removing and reinstalling package"

    # Remove existing package
    $existingPackage = Get-AppxPackage -Name $PackageName -ErrorAction SilentlyContinue
    if ($existingPackage)
    {
        Write-ADTLogEntry -Message "Removing existing package: $($existingPackage.PackageFullName)"
        Remove-AppxPackage -Package $existingPackage.PackageFullName
    }

    # Reinstall
    $msixPath = Join-Path -Path $adtSession.DirFiles -ChildPath $MsixFile
    Write-ADTLogEntry -Message "Reinstalling MSIX package: $msixPath"

    try
    {
        if ($adtSession.IsSystemAccount)
        {
            Add-AppxProvisionedPackage -Online -PackagePath $msixPath -SkipLicense -ErrorAction Stop
        }
        else
        {
            Add-AppxPackage -Path $msixPath -ErrorAction Stop
        }
        Write-ADTLogEntry -Message "MSIX repair completed successfully"
    }
    catch
    {
        Write-ADTLogEntry -Message "MSIX repair failed: $($_.Exception.Message)" -Severity 3
        throw
    }


    ##================================================
    ## MARK: Post-Repair
    ##================================================
    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"

    ## Verify repair
    $installedPackage = Get-AppxPackage -Name $PackageName -ErrorAction SilentlyContinue
    if ($installedPackage)
    {
        Write-ADTLogEntry -Message "Repair verified: $($installedPackage.Name) v$($installedPackage.Version)"
    }
    else
    {
        Write-ADTLogEntry -Message "Warning: Package not found after repair" -Severity 2
    }
}


##================================================
## MARK: Initialization
##================================================

# Set strict error handling across entire operation.
$ErrorActionPreference = [System.Management.Automation.ActionPreference]::Stop
$ProgressPreference = [System.Management.Automation.ActionPreference]::SilentlyContinue
Set-StrictMode -Version 1

# Import the module and instantiate a new session.
try
{
    # Import the module locally if available, otherwise try to find it from PSModulePath.
    if (Test-Path -LiteralPath "$PSScriptRoot\PSAppDeployToolkit\PSAppDeployToolkit.psd1" -PathType Leaf)
    {
        Get-ChildItem -LiteralPath "$PSScriptRoot\PSAppDeployToolkit" -Recurse -File | Unblock-File -ErrorAction Ignore
        Import-Module -FullyQualifiedName @{ ModuleName = "$PSScriptRoot\PSAppDeployToolkit\PSAppDeployToolkit.psd1"; Guid = '8c3c366b-8606-4576-9f2d-4051144f7ca2'; ModuleVersion = '4.1.7' } -Force
    }
    else
    {
        Import-Module -FullyQualifiedName @{ ModuleName = 'PSAppDeployToolkit'; Guid = '8c3c366b-8606-4576-9f2d-4051144f7ca2'; ModuleVersion = '4.1.7' } -Force
    }

    # Open a new deployment session, replacing $adtSession with a DeploymentSession.
    $iadtParams = Get-ADTBoundParametersAndDefaultValues -Invocation $MyInvocation
    $adtSession = Remove-ADTHashtableNullOrEmptyValues -Hashtable $adtSession
    $adtSession = Open-ADTSession @adtSession @iadtParams -PassThru
}
catch
{
    $Host.UI.WriteErrorLine((Out-String -InputObject $_ -Width ([System.Int32]::MaxValue)))
    exit 60008
}


##================================================
## MARK: Invocation
##================================================

# Commence the actual deployment operation.
try
{
    # Import any found extensions before proceeding with the deployment.
    Get-ChildItem -LiteralPath $PSScriptRoot -Directory | & {
        process
        {
            if ($_.Name -match 'PSAppDeployToolkit\..+$')
            {
                Get-ChildItem -LiteralPath $_.FullName -Recurse -File | Unblock-File -ErrorAction Ignore
                Import-Module -Name $_.FullName -Force
            }
        }
    }

    # Invoke the deployment and close out the session.
    & "$($adtSession.DeploymentType)-ADTDeployment"
    Close-ADTSession
}
catch
{
    # An unhandled error has been caught.
    $mainErrorMessage = "An unhandled error within [$($MyInvocation.MyCommand.Name)] has occurred.`n$(Resolve-ADTErrorRecord -ErrorRecord $_)"
    Write-ADTLogEntry -Message $mainErrorMessage -Severity 3

    ## Error details hidden from the user by default. Show a simple dialog with full stack trace:
    # Show-ADTDialogBox -Text $mainErrorMessage -Icon Stop -NoWait

    ## Or, a themed dialog with basic error message:
    Show-ADTInstallationPrompt -Message "$($adtSession.DeploymentType) failed at line $($_.InvocationInfo.ScriptLineNumber), char $($_.InvocationInfo.OffsetInLine):`n$($_.InvocationInfo.Line.Trim())`n`nMessage:`n$($_.Exception.Message)" -MessageAlignment Left -ButtonRightText OK -Icon Error -NoWait
    Close-ADTSession -ExitCode 60001
}