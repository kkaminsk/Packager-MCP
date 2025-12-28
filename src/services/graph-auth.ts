// Graph API authentication service using certificate-based service principal

import { ClientCertificateCredential } from '@azure/identity';
import { getLogger } from '../utils/logger.js';
import type { AzureAuthConfig, AuthResult } from '../types/azure-auth.js';
import { AZURE_AUTH_ENV_VARS, INTUNE_GRAPH_SCOPES } from '../types/azure-auth.js';
import {
  loadIntuneConfig,
  getCertificatePassword,
  validateConfig,
} from '../config/intune-config.js';

const logger = getLogger().child({ service: 'graph-auth' });

/**
 * Graph API authentication service
 * Handles certificate-based service principal authentication to Microsoft Graph API
 */
class GraphAuthService {
  private credential: ClientCertificateCredential | null = null;
  private config: AzureAuthConfig | null = null;
  private cachedToken: { token: string; expiresOn: Date } | null = null;

  /**
   * Load authentication configuration from environment variables (legacy method)
   */
  loadConfigFromEnv(): { config: AzureAuthConfig | null; missing: string[] } {
    const missing: string[] = [];

    const tenantId = process.env[AZURE_AUTH_ENV_VARS.TENANT_ID];
    const clientId = process.env[AZURE_AUTH_ENV_VARS.CLIENT_ID];
    const certificatePath = process.env[AZURE_AUTH_ENV_VARS.CERTIFICATE_PATH];
    const certificatePassword = process.env[AZURE_AUTH_ENV_VARS.CERTIFICATE_PASSWORD];

    if (!tenantId) missing.push(AZURE_AUTH_ENV_VARS.TENANT_ID);
    if (!clientId) missing.push(AZURE_AUTH_ENV_VARS.CLIENT_ID);
    if (!certificatePath) missing.push(AZURE_AUTH_ENV_VARS.CERTIFICATE_PATH);

    if (missing.length > 0) {
      return { config: null, missing };
    }

    return {
      config: {
        tenantId: tenantId!,
        clientId: clientId!,
        certificatePath: certificatePath!,
        certificatePassword,
      },
      missing: [],
    };
  }

  /**
   * Load authentication configuration from YAML file or environment variables
   * Priority: Environment variables > YAML config file > Default locations
   */
  loadConfig(): { config: AzureAuthConfig | null; missing: string[]; source: string } {
    // Try loading from YAML config first (which checks env vars internally with proper priority)
    const configResult = loadIntuneConfig();

    if (configResult) {
      const certPassword = getCertificatePassword();
      logger.debug(`Loaded configuration from ${configResult.source}`, {
        source: configResult.source,
        configPath: configResult.configPath,
      });

      return {
        config: {
          tenantId: configResult.config.azure.tenantId,
          clientId: configResult.config.azure.clientId,
          certificatePath: configResult.config.azure.certificatePath,
          certificatePassword: certPassword || undefined,
        },
        missing: [],
        source: configResult.source,
      };
    }

    // Fallback to legacy env-only loading for backward compatibility
    const envResult = this.loadConfigFromEnv();
    return {
      ...envResult,
      source: 'environment',
    };
  }

  /**
   * Initialize the authentication credential
   */
  async initialize(config?: AzureAuthConfig): Promise<AuthResult> {
    logger.debug('Initializing Graph authentication');

    // Use provided config or load from YAML/environment
    if (config) {
      this.config = config;
    } else {
      const configResult = this.loadConfig();
      if (configResult.missing.length > 0) {
        const error = `Missing required configuration: ${configResult.missing.join(', ')}`;
        logger.error('Authentication initialization failed', { missing: configResult.missing });
        return {
          success: false,
          error,
          suggestions: [
            'Option 1: Run the setup script to configure authentication:',
            '  powershell -File scripts/Setup-PackagerMcpIntune.ps1',
            '',
            'Option 2: Set environment variables:',
            `  ${AZURE_AUTH_ENV_VARS.TENANT_ID}=<your-tenant-id>`,
            `  ${AZURE_AUTH_ENV_VARS.CLIENT_ID}=<your-app-client-id>`,
            `  ${AZURE_AUTH_ENV_VARS.CERTIFICATE_PATH}=<path-to-certificate.pfx>`,
            `  ${AZURE_AUTH_ENV_VARS.CERTIFICATE_PASSWORD}=<certificate-password>`,
            '',
            'Option 3: Create intune_mcp_config.yaml with:',
            '  azure:',
            '    tenantId: "<your-tenant-id>"',
            '    clientId: "<your-client-id>"',
            '    certificatePath: "<path-to-certificate.pfx>"',
            '  Then set INTUNE_CERT_PASSWORD environment variable',
          ],
        };
      }
      this.config = configResult.config;
      logger.info(`Configuration loaded from ${configResult.source}`);
    }

    try {
      // Validate certificate file exists
      const { existsSync } = await import('node:fs');
      if (!existsSync(this.config!.certificatePath)) {
        throw new Error(`Certificate file not found: ${this.config!.certificatePath}`);
      }

      // Create the credential
      this.credential = new ClientCertificateCredential(
        this.config!.tenantId,
        this.config!.clientId,
        {
          certificatePath: this.config!.certificatePath,
          certificatePassword: this.config!.certificatePassword,
        }
      );

      logger.info('Graph authentication initialized', {
        tenantId: this.config!.tenantId,
        clientId: this.config!.clientId,
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to initialize authentication', { error: message });
      return {
        success: false,
        error: `Failed to initialize authentication: ${message}`,
        suggestions: [
          'Verify the certificate file path is correct',
          'Ensure the certificate file is a valid PFX or PEM file',
          'Check that the certificate password is correct (if using PFX)',
          'Verify the tenant ID and client ID are correct',
        ],
      };
    }
  }

  /**
   * Get an access token for Microsoft Graph API
   */
  async getAccessToken(): Promise<AuthResult> {
    if (!this.credential) {
      const initResult = await this.initialize();
      if (!initResult.success) {
        return initResult;
      }
    }

    // Check if we have a valid cached token
    if (this.cachedToken) {
      const now = new Date();
      // Token is still valid if it expires more than 5 minutes from now
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      if (this.cachedToken.expiresOn > fiveMinutesFromNow) {
        logger.debug('Using cached access token');
        return {
          success: true,
          accessToken: this.cachedToken.token,
          expiresOn: this.cachedToken.expiresOn,
        };
      }
    }

    try {
      logger.debug('Acquiring new access token');
      const tokenResponse = await this.credential!.getToken(INTUNE_GRAPH_SCOPES[0]);

      if (!tokenResponse) {
        throw new Error('No token received from Azure');
      }

      // Cache the token
      this.cachedToken = {
        token: tokenResponse.token,
        expiresOn: new Date(tokenResponse.expiresOnTimestamp),
      };

      logger.debug('Access token acquired', {
        expiresOn: this.cachedToken.expiresOn.toISOString(),
      });

      return {
        success: true,
        accessToken: tokenResponse.token,
        expiresOn: this.cachedToken.expiresOn,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('Failed to acquire access token', { error: message });

      // Parse Azure error for better guidance
      const suggestions: string[] = [];
      if (message.includes('AADSTS')) {
        if (message.includes('AADSTS700016')) {
          suggestions.push('The application was not found in the tenant');
          suggestions.push('Verify the client ID is correct');
          suggestions.push('Ensure the app is registered in the correct tenant');
        } else if (message.includes('AADSTS7000215')) {
          suggestions.push('Invalid client secret or certificate');
          suggestions.push('The certificate may have expired');
          suggestions.push('Verify the certificate is properly uploaded to Azure');
        } else if (message.includes('AADSTS700027')) {
          suggestions.push('Client assertion failed');
          suggestions.push('The certificate may not be valid or properly configured');
        } else if (message.includes('AADSTS65001')) {
          suggestions.push('The user or administrator has not consented to use the application');
          suggestions.push('Grant admin consent for DeviceManagementApps.ReadWrite.All in Azure portal');
        }
      } else {
        suggestions.push('Check network connectivity to Azure');
        suggestions.push('Verify the certificate is not expired');
        suggestions.push('Ensure the service principal has required permissions');
      }

      return {
        success: false,
        error: `Failed to acquire access token: ${message}`,
        suggestions,
      };
    }
  }

  /**
   * Check if authentication is configured
   */
  isConfigured(): boolean {
    const configResult = this.loadConfig();
    return configResult.missing.length === 0;
  }

  /**
   * Get configuration status
   */
  getConfigStatus(): {
    configured: boolean;
    missing: string[];
    configured_vars: string[];
    source: string;
  } {
    const configResult = this.loadConfig();
    const allVars = Object.values(AZURE_AUTH_ENV_VARS);
    const configuredVars = allVars.filter((v) => !configResult.missing.includes(v));

    return {
      configured: configResult.missing.length === 0,
      missing: configResult.missing,
      configured_vars: configuredVars,
      source: configResult.source,
    };
  }

  /**
   * Clear cached credentials (for testing)
   */
  reset(): void {
    this.credential = null;
    this.config = null;
    this.cachedToken = null;
  }
}

// Singleton instance
let graphAuthServiceInstance: GraphAuthService | null = null;

/**
 * Get the Graph authentication service instance
 */
export function getGraphAuthService(): GraphAuthService {
  if (!graphAuthServiceInstance) {
    graphAuthServiceInstance = new GraphAuthService();
  }
  return graphAuthServiceInstance;
}

/**
 * Reset the Graph authentication service (for testing)
 */
export function resetGraphAuthService(): void {
  if (graphAuthServiceInstance) {
    graphAuthServiceInstance.reset();
  }
  graphAuthServiceInstance = null;
}

export { GraphAuthService };
