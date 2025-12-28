// Azure authentication types for Microsoft Graph API access

/**
 * Configuration for certificate-based service principal authentication
 */
export interface AzureAuthConfig {
  /** Entra ID tenant identifier */
  tenantId: string;
  /** Service principal application (client) ID */
  clientId: string;
  /** Path to PFX or PEM certificate file */
  certificatePath: string;
  /** Certificate password (optional, for PFX files) */
  certificatePassword?: string;
}

/**
 * Result of authentication attempt
 */
export interface AuthResult {
  /** Whether authentication succeeded */
  success: boolean;
  /** Access token (if successful) */
  accessToken?: string;
  /** Token expiration time */
  expiresOn?: Date;
  /** Error message (if failed) */
  error?: string;
  /** Remediation suggestions */
  suggestions?: string[];
}

/**
 * Environment variables for Azure authentication
 */
export const AZURE_AUTH_ENV_VARS = {
  TENANT_ID: 'AZURE_TENANT_ID',
  CLIENT_ID: 'AZURE_CLIENT_ID',
  CERTIFICATE_PATH: 'AZURE_CLIENT_CERTIFICATE_PATH',
  CERTIFICATE_PASSWORD: 'AZURE_CLIENT_CERTIFICATE_PASSWORD',
} as const;

/**
 * Required Graph API scopes for Intune operations
 */
export const INTUNE_GRAPH_SCOPES = [
  'https://graph.microsoft.com/.default',
] as const;
