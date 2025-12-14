// Test all installer types and complexities
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const installerTypes = ['msi', 'exe', 'msix', 'zip', 'inno', 'nullsoft', 'wix', 'burn', 'portable'];
const complexities = ['basic', 'standard', 'advanced'];

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

  await client.connect(transport);
  console.log('Connected!\n');

  for (const installerType of installerTypes) {
    for (const complexity of complexities) {
      process.stdout.write(`Testing ${installerType}-${complexity}... `);
      const startTime = Date.now();

      try {
        await client.callTool({
          name: 'get_psadt_template',
          arguments: {
            application_name: 'TestApp',
            application_vendor: 'TestVendor',
            application_version: '1.0.0',
            installer_type: installerType,
            complexity: complexity,
            installer_file_name: `TestApp.${installerType === 'msi' ? 'msi' : installerType === 'msix' ? 'msix' : installerType === 'zip' || installerType === 'portable' ? 'zip' : 'exe'}`,
            silent_args: '/S',
          }
        });

        const elapsed = Date.now() - startTime;
        console.log(`OK (${elapsed}ms)`);
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.log(`FAILED (${elapsed}ms): ${error.message}`);
      }
    }
  }

  await client.close();
  console.log('\nAll tests complete');
}

testTemplate().catch(console.error);
