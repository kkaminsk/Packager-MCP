import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { serverConfigSchema, type ServerConfigOutput } from './schema.js';
import { DEFAULT_CONFIG, type ServerConfig } from '../types/config.js';

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
      download: {
        largeFileSizeThreshold: validated.download.largeFileSizeThreshold,
        timeoutMs: validated.download.timeoutMs,
      },
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
