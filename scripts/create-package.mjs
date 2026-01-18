#!/usr/bin/env node
/**
 * create-package.mjs - CLI tool to create PSADT packages directly
 *
 * This tool bypasses AI clients and directly uses the MCP services
 * to ensure correct PSADT v4 function names are used.
 *
 * Usage:
 *   node scripts/create-package.mjs --name "WinRAR" --vendor "RARLab" --version "7.13.0" --output "./MyPackage"
 *   node scripts/create-package.mjs --winget "RARLab.WinRAR" --output "./MyPackage"
 */

import { getPsadtService } from '../dist/services/psadt.js';
import { getWingetService } from '../dist/services/winget.js';
import { getDetectionService } from '../dist/services/detection.js';
import { initCacheManager } from '../dist/cache/lru-cache.js';
import { existsSync, mkdirSync, writeFileSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Initialize cache for Winget service
initCacheManager({ maxSize: 100, ttlMinutes: 60 });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse command line arguments
const { values: args } = parseArgs({
  options: {
    name: { type: 'string', short: 'n' },
    vendor: { type: 'string', short: 'v' },
    version: { type: 'string' },
    output: { type: 'string', short: 'o' },
    winget: { type: 'string', short: 'w' },
    type: { type: 'string', short: 't', default: 'exe' },
    installer: { type: 'string', short: 'i' },
    'silent-args': { type: 'string' },
    'close-apps': { type: 'string' },
    complexity: { type: 'string', default: 'standard' },
    help: { type: 'boolean', short: 'h' }
  }
});

function printHelp() {
  console.log(`
create-package.mjs - Create PSADT packages with correct v4 function names

USAGE:
  node scripts/create-package.mjs [options]

OPTIONS:
  -n, --name <name>        Application name (required unless --winget)
  -v, --vendor <vendor>    Application vendor (required unless --winget)
      --version <version>  Application version (required unless --winget)
  -o, --output <dir>       Output directory (required)
  -w, --winget <id>        Winget package ID (auto-fills name/vendor/version)
  -t, --type <type>        Installer type: exe, msi, msix, inno, nullsoft (default: exe)
  -i, --installer <file>   Installer filename
      --silent-args <args> Silent install arguments
      --close-apps <apps>  Comma-separated list of processes to close
      --complexity <level> Template complexity: basic, standard, advanced (default: standard)
  -h, --help               Show this help

EXAMPLES:
  # Create package from Winget:
  node scripts/create-package.mjs --winget "RARLab.WinRAR" --output "./WinRAR_Package"

  # Create package manually:
  node scripts/create-package.mjs --name "WinRAR" --vendor "RARLab" --version "7.13.0" \\
    --type exe --installer "winrar-x64-713.exe" --silent-args "/s" --output "./WinRAR_Package"

OUTPUT:
  Creates a complete PSADT v4 package with:
  - Invoke-AppDeployToolkit.ps1 (deployment script with CORRECT function names)
  - Invoke-AppDeployToolkit.exe (frontend executable)
  - PSAppDeployToolkit/ (module files)
  - Config/, Assets/, Files/ (supporting directories)
  - Detection.ps1 (Intune detection script)
  - README.md (deployment instructions)
`);
}

async function lookupWinget(packageId) {
  console.log(`\nSearching Winget for: ${packageId}`);

  const wingetService = getWingetService();

  // Search for exact match
  const searchResult = await wingetService.searchPackages({
    query: packageId,
    exactMatch: true,
    includeVersions: false,
    limit: 1
  });

  if (searchResult.totalResults === 0) {
    throw new Error(`Package not found in Winget: ${packageId}`);
  }

  const pkg = searchResult.results[0];
  console.log(`  Found: ${pkg.packageName} v${pkg.latestVersion} by ${pkg.publisher}`);

  // Get manifest for installer details
  const manifest = await wingetService.getManifest(pkg.packageIdentifier, pkg.latestVersion);
  const installer = manifest?.installers?.[0];

  // Get silent args
  const silentArgsResult = await wingetService.getSilentInstallArgs({
    packageId: pkg.packageIdentifier,
    installerType: installer?.installerType
  });

  return {
    name: pkg.packageName,
    vendor: pkg.publisher,
    version: pkg.latestVersion,
    description: pkg.description,
    installerType: installer?.installerType || 'exe',
    installerUrl: installer?.installerUrl,
    installerSha256: installer?.installerSha256,
    productCode: installer?.productCode,
    silentArgs: silentArgsResult.args.silent,
    uninstallArgs: silentArgsResult.args.uninstall
  };
}

function copyToolkitFiles(outputDir) {
  const toolkitSource = join(projectRoot, 'ReferenceKnowledge', 'PSAppDeployToolkit_Template_v4');
  const copiedFiles = [];

  // Copy main directories
  const dirsToCopy = ['PSAppDeployToolkit', 'Config', 'Assets', 'Files'];
  for (const dir of dirsToCopy) {
    const src = join(toolkitSource, dir);
    const dest = join(outputDir, dir);
    if (existsSync(src)) {
      cpSync(src, dest, { recursive: true });
      copiedFiles.push(`${dir}/`);
    }
  }

  // Copy frontend files
  const frontendSrc = join(toolkitSource, 'PSAppDeployToolkit', 'Frontend', 'v4');
  if (existsSync(frontendSrc)) {
    for (const file of readdirSync(frontendSrc)) {
      const srcFile = join(frontendSrc, file);
      if (statSync(srcFile).isFile()) {
        cpSync(srcFile, join(outputDir, file));
        copiedFiles.push(file);
      }
    }
  }

  return copiedFiles;
}

async function generateDetectionScript(pkgInfo) {
  const detectionService = getDetectionService();

  // Generate script-based detection
  const result = await detectionService.generateDetection({
    detectionType: 'script',
    script: {
      applicationName: pkgInfo.name,
      version: pkgInfo.version
    }
  });

  return result.powershellScript;
}

function generateReadme(pkgInfo, outputDir) {
  const installerFile = pkgInfo.installerFileName || `${pkgInfo.name.replace(/[^a-zA-Z0-9]/g, '')}_${pkgInfo.version}.exe`;

  return `# ${pkgInfo.name} ${pkgInfo.version} - Intune Deployment Package

## Package Information

| Property | Value |
|----------|-------|
| **Application** | ${pkgInfo.name} |
| **Vendor** | ${pkgInfo.vendor} |
| **Version** | ${pkgInfo.version} |
| **Installer Type** | ${pkgInfo.installerType} |
${pkgInfo.installerUrl ? `| **Download URL** | ${pkgInfo.installerUrl} |` : ''}
${pkgInfo.productCode ? `| **Product Code** | ${pkgInfo.productCode} |` : ''}

## Setup Instructions

### 1. Download the Installer

${pkgInfo.installerUrl ? `Download from: ${pkgInfo.installerUrl}` : 'Obtain the installer from the vendor.'}

Place the installer file in the \`Files/\` directory:
\`\`\`
${outputDir}/Files/${installerFile}
\`\`\`

${pkgInfo.installerSha256 ? `**SHA256:** \`${pkgInfo.installerSha256}\`` : ''}

### 2. Test Locally

Run a test installation:
\`\`\`powershell
.\\Invoke-AppDeployToolkit.ps1 -DeploymentType Install -DeployMode Interactive
\`\`\`

Run silent installation:
\`\`\`powershell
.\\Invoke-AppDeployToolkit.ps1 -DeploymentType Install -DeployMode Silent
\`\`\`

### 3. Create IntuneWin Package

Use the Microsoft Win32 Content Prep Tool:
\`\`\`cmd
IntuneWinAppUtil.exe -c "${outputDir}" -s "Invoke-AppDeployToolkit.exe" -o "C:\\Output"
\`\`\`

### 4. Intune Configuration

**Install Command:**
\`\`\`
Invoke-AppDeployToolkit.exe -DeploymentType Install -DeployMode Silent
\`\`\`

**Uninstall Command:**
\`\`\`
Invoke-AppDeployToolkit.exe -DeploymentType Uninstall -DeployMode Silent
\`\`\`

**Detection Method:**
- Use the provided \`Detection.ps1\` script, OR
${pkgInfo.productCode ? `- MSI Product Code: \`${pkgInfo.productCode}\`` : '- Registry detection for the application'}

**Return Codes:**
| Code | Description |
|------|-------------|
| 0 | Success |
| 1641 | Success, restart initiated |
| 3010 | Success, restart required |

## Package Contents

\`\`\`
${pkgInfo.vendor}_${pkgInfo.name}_${pkgInfo.version}/
├── Invoke-AppDeployToolkit.exe    # Frontend executable (run this)
├── Invoke-AppDeployToolkit.ps1    # Main deployment script
├── Detection.ps1                   # Intune detection script
├── README.md                       # This file
├── PSAppDeployToolkit/            # PSADT v4.1.8 module
├── Config/                         # Configuration files
├── Assets/                         # UI assets (icons, banners)
└── Files/                          # Place installer here
    └── ${installerFile}
\`\`\`

## Silent Install Arguments

\`\`\`
${pkgInfo.silentArgs || '/S /silent /quiet'}
\`\`\`

## Notes

- Generated by Packager-MCP CLI tool
- Uses PSADT v4.1.8 with correct function names (Open-ADTSession, Close-ADTSession)
- Test in a lab environment before production deployment

---
Generated: ${new Date().toISOString()}
`;
}

async function main() {
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // Validate required arguments
  if (!args.output) {
    console.error('Error: --output is required');
    printHelp();
    process.exit(1);
  }

  let pkgInfo = {};

  // Get package info from Winget or manual args
  if (args.winget) {
    try {
      pkgInfo = await lookupWinget(args.winget);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  } else {
    if (!args.name || !args.vendor || !args.version) {
      console.error('Error: --name, --vendor, and --version are required (or use --winget)');
      printHelp();
      process.exit(1);
    }
    pkgInfo = {
      name: args.name,
      vendor: args.vendor,
      version: args.version,
      installerType: args.type || 'exe',
      silentArgs: args['silent-args'],
      uninstallArgs: args['silent-args']
    };
  }

  // Override with manual args if provided
  if (args.type) pkgInfo.installerType = args.type;
  if (args['silent-args']) pkgInfo.silentArgs = args['silent-args'];
  if (args.installer) pkgInfo.installerFileName = args.installer;
  if (args['close-apps']) pkgInfo.closeApps = args['close-apps'].split(',').map(s => s.trim());

  const outputDir = resolve(args.output);

  console.log(`\nCreating PSADT package for: ${pkgInfo.name} ${pkgInfo.version}`);
  console.log(`Output directory: ${outputDir}`);

  // Create output directory
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Copy toolkit files
  console.log('\nCopying PSADT toolkit files...');
  const copiedFiles = copyToolkitFiles(outputDir);
  copiedFiles.forEach(f => console.log(`  ✓ ${f}`));

  // Generate PSADT script using MCP service
  console.log('\nGenerating deployment script...');
  const psadtService = getPsadtService();
  const templateResult = psadtService.generateScript({
    applicationName: pkgInfo.name,
    applicationVendor: pkgInfo.vendor,
    applicationVersion: pkgInfo.version,
    installerType: pkgInfo.installerType,
    complexity: args.complexity || 'standard',
    installerFileName: pkgInfo.installerFileName || `${pkgInfo.name.replace(/[^a-zA-Z0-9]/g, '')}_${pkgInfo.version}.exe`,
    silentArgs: pkgInfo.silentArgs,
    uninstallArgs: pkgInfo.uninstallArgs,
    closeApps: pkgInfo.closeApps,
    includeUninstall: true
  });

  // Write deployment script
  const scriptPath = join(outputDir, 'Invoke-AppDeployToolkit.ps1');
  writeFileSync(scriptPath, templateResult.script, 'utf-8');
  console.log('  ✓ Invoke-AppDeployToolkit.ps1');

  // Generate and write detection script
  console.log('\nGenerating detection script...');
  const detectionScript = await generateDetectionScript(pkgInfo);
  writeFileSync(join(outputDir, 'Detection.ps1'), detectionScript, 'utf-8');
  console.log('  ✓ Detection.ps1');

  // Generate and write README
  console.log('\nGenerating README...');
  const readme = generateReadme(pkgInfo, outputDir);
  writeFileSync(join(outputDir, 'README.md'), readme, 'utf-8');
  console.log('  ✓ README.md');

  // Summary
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Package created successfully!                                  ║
╚════════════════════════════════════════════════════════════════╝

Location: ${outputDir}

Next steps:
1. Download the installer and place it in: ${outputDir}\\Files\\
${pkgInfo.installerUrl ? `   URL: ${pkgInfo.installerUrl}` : ''}
2. Test: cd "${outputDir}" && .\\Invoke-AppDeployToolkit.ps1
3. Create .intunewin using Win32 Content Prep Tool

This package uses CORRECT PSADT v4.1.8 function names:
  ✓ Open-ADTSession (not Initialize-ADTDeployment)
  ✓ Close-ADTSession (not Complete-ADTDeployment)
  ✓ Get-ADTApplication (not Get-ADTInstalledApplication)
`);
}

main().catch(error => {
  console.error(`\nFatal error: ${error.message}`);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});
