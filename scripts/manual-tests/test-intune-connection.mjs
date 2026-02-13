// Test Intune connection using the compiled graph-auth service
import { getGraphAuthService } from './dist/services/graph-auth.js';

async function testConnection() {
  console.log('=== Intune Connection Test ===\n');

  const authService = getGraphAuthService();

  // Check configuration status
  const status = authService.getConfigStatus();
  console.log('Configuration status:');
  console.log('  Configured:', status.configured);
  console.log('  Source:', status.source);
  console.log('  Variables:', status.configured_vars.join(', '));

  if (status.missing.length > 0) {
    console.log('  Missing:', status.missing.join(', '));
    console.log('\n❌ Configuration incomplete');
    process.exit(1);
  }

  console.log('\n✅ Configuration loaded successfully');

  // Try to get an access token
  console.log('\nTesting Graph API authentication...');
  const tokenResult = await authService.getAccessToken();

  if (!tokenResult.success) {
    console.log('\n❌ Authentication failed:', tokenResult.error);
    if (tokenResult.suggestions) {
      console.log('\nSuggestions:');
      tokenResult.suggestions.forEach(s => console.log('  -', s));
    }
    process.exit(1);
  }

  console.log('\n✅ Access token acquired!');
  console.log('  Token expires:', tokenResult.expiresOn?.toISOString());
  console.log('  Token length:', tokenResult.accessToken?.length, 'chars');

  // Test Intune access directly (this is what we actually need)
  console.log('\nTesting Intune API access...');
  try {
    const response = await fetch('https://graph.microsoft.com/beta/deviceAppManagement/mobileApps?$top=5', {
      headers: {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    const data = await response.json();
    console.log('\n✅ Intune access confirmed!');
    console.log('  Apps returned:', data.value?.length || 0);

    if (data.value && data.value.length > 0) {
      console.log('\n  Sample apps:');
      data.value.forEach((app, i) => {
        const type = app['@odata.type']?.split('.').pop() || 'unknown';
        console.log(`    ${i+1}. ${app.displayName} (${type})`);
      });
    }
  } catch (error) {
    console.log('\n❌ Intune API call failed:', error.message);

    if (error.message.includes('403')) {
      console.log('\nThis likely means the DeviceManagementApps.ReadWrite.All permission');
      console.log('is not granted or admin consent is pending.');
      console.log('\nTo fix:');
      console.log('1. Go to Azure Portal > App registrations > packager-mcp');
      console.log('2. API permissions > Grant admin consent');
    }
    process.exit(1);
  }

  // Test creating a category (read-only, to verify write permissions will work)
  console.log('\nTesting Intune categories access...');
  try {
    const response = await fetch('https://graph.microsoft.com/beta/deviceAppManagement/mobileAppCategories', {
      headers: {
        'Authorization': `Bearer ${tokenResult.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    const data = await response.json();
    console.log('✅ App categories accessible');
    console.log('  Categories:', data.value?.map(c => c.displayName).join(', '));
  } catch (error) {
    console.log('⚠️ Categories access failed:', error.message);
  }

  console.log('\n=== All tests passed! ===');
  console.log('\nThe Intune connection is working. You can use publish_to_intune.');
}

testConnection().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
