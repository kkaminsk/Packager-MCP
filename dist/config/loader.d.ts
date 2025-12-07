import { type ServerConfig } from '../types/config.js';
export declare class ConfigLoader {
    private config;
    constructor();
    load(customPath?: string): ServerConfig;
    getConfig(): ServerConfig;
    private findConfigFile;
    private mergeWithDefaults;
}
export declare function getConfigLoader(): ConfigLoader;
export declare function loadConfig(customPath?: string): ServerConfig;
//# sourceMappingURL=loader.d.ts.map