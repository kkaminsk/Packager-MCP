/**
 * Intune MCP Configuration Loader
 *
 * Loads Azure AD and Intune configuration from environment variables or YAML file.
 * Priority order:
 * 1. Environment variables
 * 2. YAML config file specified by INTUNE_MCP_CONFIG
 * 3. Default YAML locations
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { getLogger } from '../utils/logger.js';

const logger = getLogger();
import type {
  IntuneMcpConfig,
  AzureConfig,
  ConfigLoadResult,
  ConfigSource,
} from '../types/intune-config.js';

/** Default config file locations to search */
const DEFAULT_CONFIG_LOCATIONS = [
  './intune_mcp_config.yaml',
  './intune_mcp_config.yml',
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.packager-mcp', 'config.yaml'),
  path.join(process.env.HOME || process.env.USERPROFILE || '', '.packager-mcp', 'config.yml'),
];

/**
 * Loads configuration from environment variables
 */
function loadFromEnvironment(): AzureConfig | null {
  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const certificatePath = process.env.AZURE_CERT_PATH;
  const certificateThumbprint = process.env.AZURE_CERT_THUMBPRINT;

  if (!tenantId || !clientId || !certificatePath) {
    return null;
  }

  logger.debug('Loading Azure config from environment variables');

  return {
    tenantId,
    clientId,
    authMethod: 'certificate',
    certificatePath,
    certificateThumbprint: certificateThumbprint || '',
  };
}

/**
 * Loads configuration from a YAML file
 */
function loadFromYaml(configPath: string): IntuneMcpConfig | null {
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.parse(content) as IntuneMcpConfig;

    // Validate required fields
    if (!config.azure?.tenantId || !config.azure?.clientId || !config.azure?.certificatePath) {
      logger.warn(`Config file ${configPath} is missing required azure fields`);
      return null;
    }

    // Resolve relative certificate path
    if (config.azure.certificatePath && !path.isAbsolute(config.azure.certificatePath)) {
      config.azure.certificatePath = path.resolve(path.dirname(configPath), config.azure.certificatePath);
    }

    logger.debug(`Loaded config from ${configPath}`);
    return config;
  } catch (error) {
    logger.warn(`Failed to load config from ${configPath}: ${error}`);
    return null;
  }
}

/**
 * Finds and loads the configuration file from default locations
 */
function findDefaultConfig(): { config: IntuneMcpConfig; path: string } | null {
  for (const location of DEFAULT_CONFIG_LOCATIONS) {
    const resolvedPath = path.resolve(location);
    const config = loadFromYaml(resolvedPath);
    if (config) {
      return { config, path: resolvedPath };
    }
  }
  return null;
}

/**
 * Loads Intune MCP configuration from available sources
 *
 * Priority:
 * 1. Environment variables (AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CERT_PATH)
 * 2. YAML config file specified by INTUNE_MCP_CONFIG environment variable
 * 3. Default YAML locations (./intune_mcp_config.yaml, ~/.packager-mcp/config.yaml)
 *
 * @returns Configuration load result or null if no config found
 */
export function loadIntuneConfig(): ConfigLoadResult | null {
  // Try environment variables first
  const envConfig = loadFromEnvironment();
  if (envConfig) {
    return {
      config: { azure: envConfig },
      source: 'environment',
    };
  }

  // Try INTUNE_MCP_CONFIG environment variable
  const configPathEnv = process.env.INTUNE_MCP_CONFIG;
  if (configPathEnv) {
    const resolvedPath = path.resolve(configPathEnv);
    const config = loadFromYaml(resolvedPath);
    if (config) {
      return {
        config,
        source: 'yaml',
        configPath: resolvedPath,
      };
    }
    logger.warn(`INTUNE_MCP_CONFIG points to ${configPathEnv} but file could not be loaded`);
  }

  // Try default locations
  const defaultResult = findDefaultConfig();
  if (defaultResult) {
    return {
      config: defaultResult.config,
      source: 'default',
      configPath: defaultResult.path,
    };
  }

  logger.debug('No Intune configuration found');
  return null;
}

/**
 * Gets the certificate password from environment variable
 *
 * @returns Certificate password or null if not set
 */
export function getCertificatePassword(): string | null {
  return process.env.INTUNE_CERT_PASSWORD || process.env.AZURE_CERT_PASSWORD || null;
}

/**
 * Validates that all required configuration is available
 *
 * @param config - Configuration to validate
 * @returns Array of missing configuration items
 */
export function validateConfig(config: IntuneMcpConfig | null): string[] {
  const missing: string[] = [];

  if (!config) {
    missing.push('No configuration found. Run Setup-PackagerMcpIntune.ps1 or set environment variables.');
    return missing;
  }

  if (!config.azure.tenantId) {
    missing.push('Azure tenant ID (azure.tenantId or AZURE_TENANT_ID)');
  }

  if (!config.azure.clientId) {
    missing.push('Azure client ID (azure.clientId or AZURE_CLIENT_ID)');
  }

  if (!config.azure.certificatePath) {
    missing.push('Certificate path (azure.certificatePath or AZURE_CERT_PATH)');
  } else if (!fs.existsSync(config.azure.certificatePath)) {
    missing.push(`Certificate file not found: ${config.azure.certificatePath}`);
  }

  if (!getCertificatePassword()) {
    missing.push('Certificate password (INTUNE_CERT_PASSWORD or AZURE_CERT_PASSWORD environment variable)');
  }

  return missing;
}

/**
 * Re-exports for convenience
 */
export type { IntuneMcpConfig, AzureConfig, ConfigLoadResult, ConfigSource };
export type { IntuneConfig } from '../types/intune-config.js';
