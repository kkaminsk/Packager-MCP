// Debug test of Intune publishing
import { readFileSync } from 'node:fs';
import AdmZip from 'adm-zip';

const filePath = 'C:\\temp\\Packager-MCP\\testing\\test_vscode_package\\VisualStudioCode-v1.107.1.intunewin';

// Extract the ZIP structure
const zip = new AdmZip(filePath);
const entries = zip.getEntries();

console.log('--- ZIP Entries ---');
entries.forEach(e => {
  console.log(`${e.entryName} (${e.header.size} bytes, compressed: ${e.header.compressedSize})`);
});

// Find content file
const contentEntry = entries.find(e =>
  e.entryName.endsWith('IntunePackage.intunewin') ||
  e.entryName.includes('Contents/') && e.entryName.endsWith('.intunewin')
);

if (contentEntry) {
  console.log('\n--- Content File ---');
  console.log(`Entry: ${contentEntry.entryName}`);
  console.log(`Uncompressed size: ${contentEntry.header.size}`);
  console.log(`Compressed size: ${contentEntry.header.compressedSize}`);

  const data = contentEntry.getData();
  console.log(`Extracted buffer size: ${data.length}`);
}

// Parse the encryption info from Detection.xml
const fileBuffer = readFileSync(filePath);
const binaryContent = fileBuffer.toString('binary');
const match = binaryContent.match(/<ApplicationInfo[\s\S]*?<\/ApplicationInfo>/);

if (match) {
  const xmlContent = match[0];
  const getName = (tag) => {
    const m = xmlContent.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return m ? m[1] : undefined;
  };

  console.log('\n--- Encryption Info Structure ---');
  const encryptionInfo = {
    encryptionKey: getName('EncryptionKey'),
    macKey: getName('MacKey'),
    initializationVector: getName('InitializationVector'),
    mac: getName('Mac'),
    profileIdentifier: getName('ProfileIdentifier'),
    fileDigest: getName('FileDigest'),
    fileDigestAlgorithm: getName('FileDigestAlgorithm'),
  };
  console.log(JSON.stringify(encryptionInfo, null, 2));
}
