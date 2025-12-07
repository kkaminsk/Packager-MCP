import { readFileSync, existsSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { serverConfigSchema } from './schema.js';
import { DEFAULT_CONFIG } from '../types/config.js';
const CONFIG_PATHS = [
    './packager-mcp.yaml',
    './packager-mcp.yml',
    './config.yaml',
    './config.yml',
];
export class ConfigLoader {
    config;
    constructor() {
        this.config = DEFAULT_CONFIG;
    }
    load(customPath) {
        const configPath = customPath ?? this.findConfigFile();
        if (!configPath) {
            return this.config;
        }
        try {
            const fileContent = readFileSync(configPath, 'utf-8');
            const parsed = parseYaml(fileContent);
            const validated = serverConfigSchema.parse(parsed);
            this.config = this.mergeWithDefaults(validated);
            return this.config;
        }
        catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to load config from ${configPath}: ${error.message}`);
            }
            throw error;
        }
    }
    getConfig() {
        return this.config;
    }
    findConfigFile() {
        for (const path of CONFIG_PATHS) {
            if (existsSync(path)) {
                return path;
            }
        }
        return undefined;
    }
    mergeWithDefaults(validated) {
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
        };
    }
}
let configLoader;
export function getConfigLoader() {
    if (!configLoader) {
        configLoader = new ConfigLoader();
    }
    return configLoader;
}
export function loadConfig(customPath) {
    return getConfigLoader().load(customPath);
}
//# sourceMappingURL=loader.js.map