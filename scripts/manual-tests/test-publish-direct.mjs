// Direct test of Intune publishing with new code
import { getIntunePublisherService } from './dist/services/intune-publisher.js';

const service = getIntunePublisherService();

// Test detection rule conversion first
const detection = {
  '@odata.type': '#microsoft.graph.win32LobAppFileSystemDetection',
  path: 'C:\\Program Files\\Microsoft VS Code',
  fileOrFolderName: 'Code.exe',
  check32BitOn64System: false,
  detectionType: 'exists'
};

console.log('Testing detection rule conversion...');
const rule = service.convertDetectionToRule(detection);
console.log('Converted rule:', JSON.stringify(rule, null, 2));

// Now test full publish
console.log('\nPublishing to Intune...');
try {
  const result = await service.publishApp({
    intunewinPath: 'C:\\temp\\Packager-MCP\\testing\\test_vscode_package\\VisualStudioCode-v1.107.1.intunewin',
    appName: 'Visual Studio Code',
    appVendor: 'Microsoft',
    appVersion: '1.107.1',
    detectionRule: detection,
    skipLogo: true
  });

  console.log('Result:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Error:', err.message);
}
