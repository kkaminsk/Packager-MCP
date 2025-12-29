// Test parsing of .intunewin file
import { readFileSync } from 'node:fs';

const filePath = 'C:\\temp\\Packager-MCP\\testing\\test_vscode_package\\VisualStudioCode-v1.107.1.intunewin';
const fileBuffer = readFileSync(filePath);

console.log('File size:', fileBuffer.length);

// Try to find Detection.xml content
const binaryContent = fileBuffer.toString('binary');
const match = binaryContent.match(/<ApplicationInfo[\s\S]*?<\/ApplicationInfo>/);

if (match) {
  console.log('\nFound ApplicationInfo XML:');
  console.log(match[0].substring(0, 2000) + '...');

  // Parse specific fields
  const getName = (tag) => {
    const m = match[0].match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return m ? m[1] : undefined;
  };

  console.log('\n--- Parsed Fields ---');
  console.log('Name:', getName('Name'));
  console.log('SetupFile:', getName('SetupFile'));
  console.log('UnencryptedContentSize:', getName('UnencryptedContentSize'));
  console.log('EncryptionKey:', getName('EncryptionKey')?.substring(0, 50) + '...');
  console.log('MacKey:', getName('MacKey')?.substring(0, 50) + '...');
  console.log('InitializationVector:', getName('InitializationVector'));
  console.log('Mac:', getName('Mac')?.substring(0, 50) + '...');
  console.log('ProfileIdentifier:', getName('ProfileIdentifier'));
  console.log('FileDigest:', getName('FileDigest')?.substring(0, 50) + '...');
  console.log('FileDigestAlgorithm:', getName('FileDigestAlgorithm'));
} else {
  console.log('ApplicationInfo not found!');

  // Try to find any XML in the file
  const anyXml = binaryContent.match(/<[A-Za-z]+[\s\S]*?>/);
  if (anyXml) {
    console.log('Found some XML:', anyXml[0].substring(0, 200));
  }
}
