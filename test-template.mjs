import { getPsadtService } from './dist/services/psadt.js';
import { existsSync, mkdirSync, writeFileSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const outputDir = './TEST_WinRAR_CORRECT';

// Generate script using MCP service
const service = getPsadtService();
const result = service.generateScript({
  applicationName: 'WinRAR',
  applicationVendor: 'RARLab',
  applicationVersion: '7.13.0',
  installerType: 'exe',
  complexity: 'standard',
  installerFileName: 'winrar-x64-713.exe',
  silentArgs: '/s',
  uninstallArgs: '/s',
  closeApps: ['WinRAR', 'Rar'],
  includeUninstall: true
});

// Create output directory
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Copy PSADT toolkit files
const toolkitSource = join(__dirname, 'ReferenceKnowledge', 'PSAppDeployToolkit_Template_v4');
const dirsToCopy = ['PSAppDeployToolkit', 'Config', 'Assets', 'Files'];
for (const dir of dirsToCopy) {
  const src = join(toolkitSource, dir);
  const dest = join(outputDir, dir);
  if (existsSync(src)) {
    cpSync(src, dest, { recursive: true });
    console.log(`Copied: ${dir}/`);
  }
}

// Copy frontend files
const frontendSrc = join(toolkitSource, 'PSAppDeployToolkit', 'Frontend', 'v4');
if (existsSync(frontendSrc)) {
  for (const file of readdirSync(frontendSrc)) {
    const srcFile = join(frontendSrc, file);
    if (statSync(srcFile).isFile()) {
      cpSync(srcFile, join(outputDir, file));
      console.log(`Copied: ${file}`);
    }
  }
}

// Write the CORRECT script
const scriptPath = join(outputDir, 'Invoke-AppDeployToolkit.ps1');
writeFileSync(scriptPath, result.script, 'utf-8');
console.log(`\nGenerated: Invoke-AppDeployToolkit.ps1`);

console.log(`\n=== Package created at: ${outputDir} ===`);
console.log('\nThis script uses CORRECT PSADT v4 functions:');
console.log('- Open-ADTSession (not Initialize-ADTDeployment)');
console.log('- Close-ADTSession (not Complete-ADTDeployment)');
console.log('\nTo test: cd TEST_WinRAR_CORRECT && .\\Invoke-AppDeployToolkit.ps1');
