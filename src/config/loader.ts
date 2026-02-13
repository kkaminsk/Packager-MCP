import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { serverConfigSchema, type ServerConfigOutput } from './schema.js';
import { DEFAULT_CONFIG, type ServerConfig, type TransportType } from '../types/config.js';

/**
 * Environment variable names for transport configuration overrides
 */
const ENV_VARS = {
  TRANSPORT_TYPE: 'TRANSPORT_TYPE',
  TRANSPORT_PORT: 'TRANSPORT_PORT',
  TRANSPORT_HOST: 'TRANSPORT_HOST',
} as const;

const CONFIG_PATHS = [
  './packager-mcp.yaml',
  './packager-mcp.yml',
  './config.yaml',
  './config.yml',
];

export class ConfigLoader {
  private config: ServerConfig;

  constructor() {
    this.config = DEFAULT_CONFIG;
  }

  load(customPath?: string): ServerConfig {
    const configPath = customPath ?? this.findConfigFile();

    if (!configPath) {
      return this.config;
    }

    try {
      const fileContent = readFileSync(configPath, 'utf-8');
      const parsed = parseYaml(fileContent) as unknown;
      const validated = serverConfigSchema.parse(parsed);
      this.config = this.mergeWithDefaults(validated);
      return this.config;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
      }
      throw error;
    }
  }

  getConfig(): ServerConfig {
    return this.config;
  }

  private findConfigFile(): string | undefined {
    for (const path of CONFIG_PATHS) {
      if (existsSync(path)) {
        return path;
      }
    }
    return undefined;
  }

  private mergeWithDefaults(validated: ServerConfigOutput): ServerConfig {
    // Get transport config with environment variable overrides
    const transportConfig = this.getTransportConfigWithEnvOverrides(validated);

    return {
      name: validated.name,
      version: validated.version,
      cache: {
        maxSize: validated.cache.maxSize,
        defaultTtlMs: validated.cache.defaultTtlMs,
        manifestTtlMs: validated.cache.manifestTtlMs,
        searchTtlMs: validated.cache.searchTtlMs,
      },
      logging: {
        level: validated.logging.level,
        format: validated.logging.format,
      },
      github: {
        token: validated.github.token,
        rateLimitRetries: validated.github.rateLimitRetries,
      },
      transport: transportConfig,
      security: validated.security ?? undefined,
    };
  }

  /**
   * Get transport configuration with environment variable overrides
   */
  private getTransportConfigWithEnvOverrides(validated: ServerConfigOutput): ServerConfig['transport'] {
    const envType = process.env[ENV_VARS.TRANSPORT_TYPE];
    const envPort = process.env[ENV_VARS.TRANSPORT_PORT];
    const envHost = process.env[ENV_VARS.TRANSPORT_HOST];

    // Validate transport type from env
    let transportType = validated.transport.type;
    if (envType) {
      if (envType === 'stdio' || envType === 'http' || envType === 'both') {
        transportType = envType as TransportType;
      }
      // Invalid values are silently ignored, using config file value
    }

    // Parse port from env
    let port = validated.transport.port;
    if (envPort) {
      const parsedPort = parseInt(envPort, 10);
      if (!isNaN(parsedPort) && parsedPort >= 1 && parsedPort <= 65535) {
        port = parsedPort;
      }
    }

    return {
      type: transportType,
      port,
      host: envHost ?? validated.transport.host,
      sessionTimeoutMs: validated.transport.sessionTimeoutMs,
      corsOrigin: validated.transport.corsOrigin,
    };
  }
}

let configLoader: ConfigLoader | undefined;

export function getConfigLoader(): ConfigLoader {
  if (!configLoader) {
    configLoader = new ConfigLoader();
  }
  return configLoader;
}

export function loadConfig(customPath?: string): ServerConfig {
  return getConfigLoader().load(customPath);
}
