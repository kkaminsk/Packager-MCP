// Test get_psadt_template tool via MCP server handler
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'node:child_process';

async function testTemplate() {
  console.log('Starting MCP server...');

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/server.js'],
    cwd: process.cwd()
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0'
  });

  console.log('Connecting to server...');
  await client.connect(transport);
  console.log('Connected!');

  console.log('\nCalling get_psadt_template tool...');
  const startTime = Date.now();

  try {
    const result = await client.callTool({
      name: 'get_psadt_template',
      arguments: {
        application_name: 'TestApp',
        application_vendor: 'TestVendor',
        application_version: '1.0.0',
        installer_type: 'exe',
        complexity: 'standard',
        installer_file_name: 'TestApp_1.0.0.exe',
        silent_args: '/S',
      }
    });

    const elapsed = Date.now() - startTime;
    console.log(`\nTool returned in ${elapsed}ms`);
    console.log('Success:', result.content[0]?.text?.substring(0, 200) + '...');
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\nTool failed after ${elapsed}ms:`, error.message);
  }

  await client.close();
  console.log('\nTest complete');
}

testTemplate().catch(console.error);
