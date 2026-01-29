<#
.SYNOPSIS
    Builds the Packager-MCP MSI installer using WiX Toolset v5.
.DESCRIPTION
    This script:
    1. Ensures dist/ folder is up to date (npm run build)
    2. Installs production node_modules (npm ci --production)
    3. Downloads and bundles Node.js runtime
    4. Harvests directory contents into WiX fragment files
    5. Builds the MSI using dotnet build
    6. Signs the MSI using Azure Trusted Signing (optional)
.PARAMETER Version
    Version number for the MSI (e.g., "1.0.0"). Defaults to version from package.json.
.PARAMETER SkipBuild
    Skip npm build step (use existing dist/ folder).
.PARAMETER SkipNpmCi
    Skip npm ci --production step (use existing node_modules/).
.PARAMETER SkipNodeDownload
    Skip Node.js download step (use existing nodejs-bundle/ folder).
.PARAMETER NodeVersion
    Node.js version to bundle (e.g., "20.18.1"). Defaults to 20.18.1 LTS.
.PARAMETER Clean
    Clean build artifacts before building.
.PARAMETER Sign
    Sign the MSI using Azure Trusted Signing after build.
.PARAMETER SigningMetadataPath
    Path to the Azure Trusted Signing metadata JSON file.
    Defaults to C:\Temp\tsscat\CodeSigning\metadata-packager-mcp.json
.PARAMETER SigningDlibPath
    Path to the Azure Code Signing DLib DLL.
    Defaults to C:\Temp\tsscat\CodeSigning\Microsoft.Trusted.Signing.Client.1.0.95\bin\x64\Azure.CodeSigning.Dlib.dll
.EXAMPLE
    .\build-msi.ps1
    Builds MSI with default settings (unsigned).
.EXAMPLE
    .\build-msi.ps1 -Version "1.0.1" -SkipBuild
    Builds MSI version 1.0.1, skipping npm build.
.EXAMPLE
    .\build-msi.ps1 -Sign
    Builds and signs the MSI using Azure Trusted Signing.
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
    [switch]$SkipNodeDownload,

    [Parameter()]
    [string]$NodeVersion = "20.20.0",

    [Parameter()]
    [switch]$Clean,

    [Parameter()]
    [switch]$Sign,

    [Parameter()]
    [string]$SigningMetadataPath = "C:\Temp\tsscat\CodeSigning\metadata-packager-mcp.json",

    [Parameter()]
    [string]$SigningDlibPath = "C:\Temp\tsscat\CodeSigning\Microsoft.Trusted.Signing.Client.1.0.95\bin\x64\Azure.CodeSigning.Dlib.dll"
)

$ErrorActionPreference = 'Stop'
# $PSScriptRoot is scripts/, so parent is the project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$InstallerDir = Join-Path $ProjectRoot 'installer'
$DistDir = Join-Path $ProjectRoot 'dist'
$OutputDir = Join-Path $InstallerDir 'bin'
$NodeBundleDir = Join-Path $InstallerDir 'nodejs-bundle'

# Node.js download checksums (SHA256) - update when changing NodeVersion
# Get checksums from: https://nodejs.org/dist/vX.Y.Z/SHASUMS256.txt
$NodeChecksums = @{
    "20.18.1" = "56e5aacdeee7168871721b75819ccacf2367de8761b78eaceacdecd41e04ca03"
    "20.20.0" = "32f24e1405b113d4e01ad2585c92024df673b6156ef6f43a5469a75bf52c0a5a"
    "22.11.0" = "2c8d66c8f83de91178ec26eb73f74c1be54dce2c06e3b7a4e0d1e51d2e6a88f7"
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Packager-MCP MSI Build Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Project Root: $ProjectRoot"
Write-Host "Installer Dir: $InstallerDir"
Write-Host "Node.js Version: $NodeVersion"
Write-Host ""

#region Functions

function Get-NodeJsBundle {
    <#
    .SYNOPSIS
        Downloads and extracts Node.js Windows x64 binary.
    #>
    param(
        [string]$Version,
        [string]$DestinationPath,
        [hashtable]$Checksums
    )

    $nodeFolderName = "node-v$Version-win-x64"
    $nodeZipName = "$nodeFolderName.zip"
    $nodeUrl = "https://nodejs.org/dist/v$Version/$nodeZipName"
    $zipPath = Join-Path $DestinationPath $nodeZipName
    $extractPath = Join-Path $DestinationPath $nodeFolderName

    # Check if already extracted
    $nodeExe = Join-Path $extractPath "node.exe"
    if (Test-Path $nodeExe) {
        Write-Host "  Node.js $Version already extracted at: $extractPath" -ForegroundColor Green
        return $extractPath
    }

    # Create destination directory
    if (-not (Test-Path $DestinationPath)) {
        New-Item -ItemType Directory -Path $DestinationPath -Force | Out-Null
    }

    # Download if not cached
    if (-not (Test-Path $zipPath)) {
        Write-Host "  Downloading Node.js $Version from: $nodeUrl"
        try {
            $ProgressPreference = 'SilentlyContinue'  # Speeds up download
            Invoke-WebRequest -Uri $nodeUrl -OutFile $zipPath -UseBasicParsing
            $ProgressPreference = 'Continue'
        } catch {
            throw "Failed to download Node.js: $_"
        }
        Write-Host "  Downloaded: $zipPath" -ForegroundColor Green
    } else {
        Write-Host "  Using cached download: $zipPath" -ForegroundColor Green
    }

    # Verify checksum if available
    if ($Checksums.ContainsKey($Version)) {
        Write-Host "  Verifying SHA256 checksum..."
        $expectedHash = $Checksums[$Version]
        $actualHash = (Get-FileHash -Path $zipPath -Algorithm SHA256).Hash.ToLower()
        if ($actualHash -ne $expectedHash.ToLower()) {
            Remove-Item -Path $zipPath -Force
            throw "Checksum mismatch! Expected: $expectedHash, Got: $actualHash"
        }
        Write-Host "  Checksum verified." -ForegroundColor Green
    } else {
        Write-Warning "No checksum available for Node.js $Version - skipping verification"
    }

    # Extract
    Write-Host "  Extracting Node.js..."
    Expand-Archive -Path $zipPath -DestinationPath $DestinationPath -Force

    if (-not (Test-Path $nodeExe)) {
        throw "Extraction failed - node.exe not found at: $nodeExe"
    }

    Write-Host "  Extracted to: $extractPath" -ForegroundColor Green
    return $extractPath
}

#endregion Functions

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
    if (Test-Path $NodeBundleDir) {
        Remove-Item -Path $NodeBundleDir -Recurse -Force
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

# Step 3: Download and extract Node.js
if (-not $SkipNodeDownload) {
    Write-Host ""
    Write-Host "Step 3: Downloading Node.js $NodeVersion..." -ForegroundColor Yellow
    $NodeExtractPath = Get-NodeJsBundle -Version $NodeVersion -DestinationPath $NodeBundleDir -Checksums $NodeChecksums
    Write-Host "Node.js bundle ready." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 3: Skipping Node.js download (--SkipNodeDownload)" -ForegroundColor Yellow
    $NodeExtractPath = Join-Path $NodeBundleDir "node-v$NodeVersion-win-x64"
    if (-not (Test-Path (Join-Path $NodeExtractPath "node.exe"))) {
        throw "Node.js bundle not found at $NodeExtractPath. Run without -SkipNodeDownload."
    }
}

# Step 4: Check for WiX Toolset
Write-Host ""
Write-Host "Step 4: Checking WiX Toolset installation..." -ForegroundColor Yellow

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

# Step 5: Harvest directories
Write-Host ""
Write-Host "Step 5: Harvesting directory contents..." -ForegroundColor Yellow

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

# Create empty NodeModulesComponents (not bundled - users run npm install after installation)
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

# Harvest Node.js bundle - use a custom harvester since paths differ from project root
Write-Host "  Harvesting Node.js bundle..."
$nodeHarvestOutput = Join-Path $InstallerDir "HarvestedNodeJS.wxs"

# Generate WiX XML for Node.js with correct paths
$nodeFiles = Get-ChildItem -Path $NodeExtractPath -Recurse -File
$nodeComponentId = 0
$nodeXmlContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">
  <Fragment>
    <ComponentGroup Id="NodeJSComponents" Directory="NodeJSDir">

"@

foreach ($file in $nodeFiles) {
    $nodeComponentId++
    $relativePath = $file.FullName.Substring($NodeExtractPath.Length).TrimStart('\')
    $fileId = ("NodeJS_" + $nodeComponentId).Replace("-", "_")
    $componentGuid = [guid]::NewGuid().ToString().ToUpper()
    # Use absolute path for Node.js files
    $nodeSourcePath = $file.FullName.Replace('\', '\\')

    $nodeXmlContent += @"
      <Component Id="$fileId" Guid="$componentGuid">
        <File Id="File_$fileId" Source="$nodeSourcePath" KeyPath="yes" />
      </Component>

"@
}

$nodeXmlContent += @"
    </ComponentGroup>
  </Fragment>
</Wix>
"@

$nodeXmlContent | Set-Content -Path $nodeHarvestOutput -Encoding UTF8
Write-Host "  Harvested $nodeComponentId Node.js files"

Write-Host "Directory harvesting complete." -ForegroundColor Green

# Step 6: Build MSI
Write-Host ""
Write-Host "Step 6: Building MSI package..." -ForegroundColor Yellow

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
        "-ext", "WixToolset.UI.wixext",
        "-ext", "WixToolset.Util.wixext",
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
if (-not (Test-Path $MsiPath)) {
    throw "MSI file not found at expected location: $MsiPath"
}

$MsiSize = [math]::Round((Get-Item $MsiPath).Length / 1MB, 2)
Write-Host "MSI Package created: $MsiPath ($MsiSize MB)" -ForegroundColor Green

# Step 7: Sign MSI (if requested)
if ($Sign) {
    Write-Host ""
    Write-Host "Step 7: Signing MSI with Azure Trusted Signing..." -ForegroundColor Yellow

    # Validate signing prerequisites
    if (-not (Test-Path $SigningMetadataPath)) {
        throw "Signing metadata file not found: $SigningMetadataPath`nCreate it based on the template in the documentation."
    }

    if (-not (Test-Path $SigningDlibPath)) {
        throw "Azure Code Signing DLib not found: $SigningDlibPath`nDownload Microsoft.Trusted.Signing.Client from NuGet."
    }

    # Find Windows SDK signtool.exe (requires 10.0.26100.0 or newer for modern signing)
    $sdkBasePath = "C:\Program Files (x86)\Windows Kits\10\bin"
    $sdkVersions = Get-ChildItem $sdkBasePath -Directory -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -match '^\d+\.\d+\.\d+\.\d+$' } |
        Sort-Object { [version]$_.Name } -Descending

    $signtoolPath = $null
    foreach ($sdk in $sdkVersions) {
        $candidate = Join-Path $sdk.FullName "x64\signtool.exe"
        if (Test-Path $candidate) {
            # Check version - need 10.0.26100.0 or newer for Azure Trusted Signing
            $sdkVersion = [version]$sdk.Name
            if ($sdkVersion -ge [version]"10.0.26100.0") {
                $signtoolPath = $candidate
                Write-Host "  Using signtool.exe from SDK $($sdk.Name)" -ForegroundColor Green
                break
            }
        }
    }

    if (-not $signtoolPath) {
        throw "Windows SDK 10.0.26100.0 or newer required for Azure Trusted Signing.`nInstall from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/"
    }

    # Sign the MSI
    Write-Host "  Signing: $MsiPath"
    $signArgs = @(
        "sign",
        "/fd", "SHA256",
        "/tr", "http://timestamp.acs.microsoft.com",
        "/td", "SHA256",
        "/dlib", $SigningDlibPath,
        "/dmdf", $SigningMetadataPath,
        $MsiPath
    )

    Write-Host "  Running: signtool.exe $($signArgs -join ' ')"
    & $signtoolPath $signArgs

    if ($LASTEXITCODE -ne 0) {
        throw "Signing failed with exit code $LASTEXITCODE"
    }

    # Verify signature
    Write-Host "  Verifying signature..."
    $sig = Get-AuthenticodeSignature $MsiPath
    if ($sig.Status -ne 'Valid') {
        throw "Signature verification failed: $($sig.Status)"
    }

    Write-Host "  Signature valid: $($sig.SignerCertificate.Subject)" -ForegroundColor Green
    Write-Host "  Timestamp: $($sig.TimeStamperCertificate.Subject)" -ForegroundColor Green
    Write-Host "Signing complete." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Step 7: Skipping signing (use -Sign to enable)" -ForegroundColor Yellow
}

# Final summary
Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host " Build Complete!" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "MSI Package: $MsiPath" -ForegroundColor Green
Write-Host "Size: $MsiSize MB" -ForegroundColor Green

if ($Sign) {
    $sig = Get-AuthenticodeSignature $MsiPath
    Write-Host "Signed by: $($sig.SignerCertificate.Subject)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Installation commands:" -ForegroundColor Yellow
Write-Host "  Interactive: msiexec /i `"$MsiPath`""
Write-Host "  Silent:      msiexec /i `"$MsiPath`" /qn"
Write-Host ""
