<#
.SYNOPSIS
    Builds the Packager-MCP MSI installer using WiX Toolset v5.
.DESCRIPTION
    This script:
    1. Ensures dist/ folder is up to date (npm run build)
    2. Installs production node_modules (npm ci --production)
    3. Harvests directory contents into WiX fragment files
    4. Builds the MSI using dotnet build
.PARAMETER Version
    Version number for the MSI (e.g., "1.0.0"). Defaults to version from package.json.
.PARAMETER SkipBuild
    Skip npm build step (use existing dist/ folder).
.PARAMETER SkipNpmCi
    Skip npm ci --production step (use existing node_modules/).
.PARAMETER Clean
    Clean build artifacts before building.
.EXAMPLE
    .\build-msi.ps1
    Builds MSI with default settings.
.EXAMPLE
    .\build-msi.ps1 -Version "1.0.1" -SkipBuild
    Builds MSI version 1.0.1, skipping npm build.
#>
[CmdletBinding()]
param(
    [Parameter()]
    [string]$Version,

    [Parameter()]
    [switch]$SkipBuild,

    [Parameter()]
    [switch]$SkipNpmCi,

    [Parameter()]
    [switch]$Clean
)

$ErrorActionPreference = 'Stop'
# $PSScriptRoot is scripts/, so parent is the project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InstallerDir = Join-Path $ProjectRoot 'installer'
$DistDir = Join-Path $ProjectRoot 'dist'
$OutputDir = Join-Path $InstallerDir 'bin'

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Packager-MCP MSI Build Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project Root: $ProjectRoot"
Write-Host "Installer Dir: $InstallerDir"
Write-Host ""

# Get version from package.json if not specified
if (-not $Version) {
    $PackageJson = Get-Content (Join-Path $ProjectRoot 'package.json') | ConvertFrom-Json
    $Version = $PackageJson.version
}
Write-Host "Version: $Version" -ForegroundColor Green

# Clean if requested
if ($Clean) {
    Write-Host ""
    Write-Host "Cleaning build artifacts..." -ForegroundColor Yellow
    if (Test-Path $OutputDir) {
        Remove-Item -Path $OutputDir -Recurse -Force
    }
    $HarvestedFiles = Get-ChildItem -Path $InstallerDir -Filter "Harvested*.wxs" -ErrorAction SilentlyContinue
    foreach ($file in $HarvestedFiles) {
        Remove-Item -Path $file.FullName -Force
    }
}

# Step 1: Build TypeScript
if (-not $SkipBuild) {
    Write-Host ""
    Write-Host "Step 1: Building TypeScript (npm run build)..." -ForegroundColor Yellow
    Push-Location $ProjectRoot
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
    Write-Host "Build complete." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 1: Skipping npm build (--SkipBuild)" -ForegroundColor Yellow
}

# Verify dist folder exists
if (-not (Test-Path $DistDir)) {
    throw "dist/ folder not found. Run without -SkipBuild to create it."
}

# Step 2: Install production dependencies
if (-not $SkipNpmCi) {
    Write-Host ""
    Write-Host "Step 2: Installing production dependencies (npm ci --production)..." -ForegroundColor Yellow
    Push-Location $ProjectRoot
    try {
        # Create a temporary package-lock.json for production if needed
        npm ci --omit=dev
        if ($LASTEXITCODE -ne 0) {
            throw "npm ci failed with exit code $LASTEXITCODE"
        }
    } finally {
        Pop-Location
    }
    Write-Host "Dependencies installed." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 2: Skipping npm ci (--SkipNpmCi)" -ForegroundColor Yellow
}

# Step 3: Check for WiX Toolset
Write-Host ""
Write-Host "Step 3: Checking WiX Toolset installation..." -ForegroundColor Yellow

$WixInstalled = $false
try {
    $wixVersion = dotnet tool list -g | Select-String "wix"
    if ($wixVersion) {
        $WixInstalled = $true
        Write-Host "WiX Toolset found: $wixVersion" -ForegroundColor Green
    }
} catch {
    # Ignore
}

if (-not $WixInstalled) {
    Write-Host "WiX Toolset not found. Installing globally..." -ForegroundColor Yellow
    dotnet tool install --global wix
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to install WiX Toolset. Please install manually: dotnet tool install --global wix"
    }
    Write-Host "WiX Toolset installed." -ForegroundColor Green
}

# Step 4: Harvest directories
Write-Host ""
Write-Host "Step 4: Harvesting directory contents..." -ForegroundColor Yellow

function Invoke-HarvestDirectory {
    param(
        [string]$SourcePath,
        [string]$OutputFile,
        [string]$ComponentGroupId,
        [string]$DirectoryRefId,
        [string]$ProjectRootPath
    )

    if (-not (Test-Path $SourcePath)) {
        Write-Warning "Source path not found, skipping: $SourcePath"
        # Create empty component group
        $emptyWxs = @"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Fragment>
    <ComponentGroup Id="$ComponentGroupId" />
  </Fragment>
</Wix>
"@
        $emptyWxs | Set-Content -Path $OutputFile -Encoding UTF8
        return
    }

    Write-Host "  Harvesting: $SourcePath -> $OutputFile"

    # Generate WiX XML directly from PowerShell (more reliable than heat)
    $files = Get-ChildItem -Path $SourcePath -Recurse -File
    $componentId = 0

    $xmlContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Fragment>
    <ComponentGroup Id="$ComponentGroupId" Directory="$DirectoryRefId">

"@

    foreach ($file in $files) {
        $componentId++
        $relativePath = $file.FullName.Substring($SourcePath.Length).TrimStart('\')
        $fileId = ($ComponentGroupId + "_" + $componentId).Replace("-", "_")
        $componentGuid = [guid]::NewGuid().ToString().ToUpper()
        # Calculate relative path from project root
        $relativeFromRoot = $SourcePath.Substring($ProjectRootPath.Length + 1)
        $wixSourcePath = "`$(var.SourceDir)\$relativeFromRoot\$relativePath"

        $xmlContent += @"
      <Component Id="$fileId" Guid="$componentGuid">
        <File Id="File_$fileId" Source="$wixSourcePath" KeyPath="yes" />
      </Component>

"@
    }

    $xmlContent += @"
    </ComponentGroup>
  </Fragment>
</Wix>
"@

    $xmlContent | Set-Content -Path $OutputFile -Encoding UTF8
}

# Harvest each directory
# Note: node_modules is excluded - users run npm install after installation
$HarvestTargets = @(
    @{ Source = "dist\handlers"; Output = "HarvestedHandlers.wxs"; ComponentGroup = "HandlersComponents"; DirectoryRef = "DistHandlersDir" },
    @{ Source = "dist\services"; Output = "HarvestedServices.wxs"; ComponentGroup = "ServicesComponents"; DirectoryRef = "DistServicesDir" },
    @{ Source = "dist\templates"; Output = "HarvestedTemplates.wxs"; ComponentGroup = "TemplatesComponents"; DirectoryRef = "DistTemplatesDir" },
    @{ Source = "dist\knowledge"; Output = "HarvestedKnowledge.wxs"; ComponentGroup = "KnowledgeComponents"; DirectoryRef = "DistKnowledgeDir" },
    @{ Source = "dist\types"; Output = "HarvestedTypes.wxs"; ComponentGroup = "TypesComponents"; DirectoryRef = "DistTypesDir" },
    @{ Source = "dist\utils"; Output = "HarvestedUtils.wxs"; ComponentGroup = "UtilsComponents"; DirectoryRef = "DistUtilsDir" },
    @{ Source = "dist\cache"; Output = "HarvestedCache.wxs"; ComponentGroup = "CacheComponents"; DirectoryRef = "DistCacheDir" },
    @{ Source = "dist\config"; Output = "HarvestedConfig.wxs"; ComponentGroup = "ConfigComponents"; DirectoryRef = "DistConfigDir" },
    @{ Source = "dist\workflows"; Output = "HarvestedWorkflows.wxs"; ComponentGroup = "WorkflowsComponents"; DirectoryRef = "DistWorkflowsDir" }
)

# Create empty NodeModulesComponents (not bundled - user runs npm install)
$emptyNodeModules = @"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Fragment>
    <ComponentGroup Id="NodeModulesComponents" />
  </Fragment>
</Wix>
"@
$emptyNodeModules | Set-Content -Path (Join-Path $InstallerDir "HarvestedNodeModules.wxs") -Encoding UTF8

foreach ($target in $HarvestTargets) {
    $sourcePath = Join-Path $ProjectRoot $target.Source
    $outputPath = Join-Path $InstallerDir $target.Output

    Invoke-HarvestDirectory `
        -SourcePath $sourcePath `
        -OutputFile $outputPath `
        -ComponentGroupId $target.ComponentGroup `
        -DirectoryRefId $target.DirectoryRef `
        -ProjectRootPath $ProjectRoot
}

Write-Host "Directory harvesting complete." -ForegroundColor Green

# Step 5: Build MSI
Write-Host ""
Write-Host "Step 5: Building MSI package..." -ForegroundColor Yellow

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

Push-Location $InstallerDir
try {
    # Collect all wxs files
    $wxsFiles = Get-ChildItem -Path $InstallerDir -Filter "*.wxs" | ForEach-Object { $_.Name }

    # Build with wix CLI directly (more reliable than dotnet build)
    $buildArgs = @("build") + $wxsFiles + @(
        "-d", "SourceDir=$ProjectRoot",
        "-o", "$OutputDir\Packager-MCP-$Version.msi"
    )

    Write-Host "Running: wix $($buildArgs -join ' ')"
    & wix $buildArgs

    if ($LASTEXITCODE -ne 0) {
        throw "WiX build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

$MsiPath = Join-Path $OutputDir "Packager-MCP-$Version.msi"
if (Test-Path $MsiPath) {
    $MsiSize = [math]::Round((Get-Item $MsiPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host " Build Complete!" -ForegroundColor Cyan
    Write-Host "======================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "MSI Package: $MsiPath" -ForegroundColor Green
    Write-Host "Size: $MsiSize MB" -ForegroundColor Green
    Write-Host ""
    Write-Host "Installation commands:" -ForegroundColor Yellow
    Write-Host "  Interactive: msiexec /i `"$MsiPath`""
    Write-Host "  Silent:      msiexec /i `"$MsiPath`" /qn"
    Write-Host ""
} else {
    throw "MSI file not found at expected location: $MsiPath"
}
