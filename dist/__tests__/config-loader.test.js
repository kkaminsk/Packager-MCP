import { describe, it, expect, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, existsSync } from 'node:fs';
import { ConfigLoader, loadConfig } from '../config/loader.js';
const TEST_CONFIG_PATH = './test-config.yaml';
describe('ConfigLoader', () => {
    afterEach(() => {
        if (existsSync(TEST_CONFIG_PATH)) {
            unlinkSync(TEST_CONFIG_PATH);
        }
    });
    it('should return default config when no config file exists', () => {
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.name).toBe('intune-packaging-assistant');
        expect(config.version).toBe('1.0.0');
        expect(config.cache.maxSize).toBe(1000);
        expect(config.logging.level).toBe('info');
        expect(config.github.rateLimitRetries).toBe(3);
    });
    it('should load config from YAML file', () => {
        const yamlContent = `
name: custom-server
version: 2.0.0
cache:
  maxSize: 500
logging:
  level: debug
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        const config = loader.load(TEST_CONFIG_PATH);
        expect(config.name).toBe('custom-server');
        expect(config.version).toBe('2.0.0');
        expect(config.cache.maxSize).toBe(500);
        expect(config.logging.level).toBe('debug');
    });
    it('should merge partial config with defaults', () => {
        const yamlContent = `
cache:
  maxSize: 200
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        const config = loader.load(TEST_CONFIG_PATH);
        expect(config.name).toBe('intune-packaging-assistant');
        expect(config.cache.maxSize).toBe(200);
        expect(config.cache.defaultTtlMs).toBe(15 * 60 * 1000);
    });
    it('should throw on invalid config', () => {
        const yamlContent = `
cache:
  maxSize: -1
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        expect(() => loader.load(TEST_CONFIG_PATH)).toThrow();
    });
    it('should throw on malformed YAML', () => {
        const yamlContent = `
cache:
  maxSize: [invalid
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        expect(() => loader.load(TEST_CONFIG_PATH)).toThrow();
    });
    it('should return current config via getConfig()', () => {
        const loader = new ConfigLoader();
        loader.load();
        const config = loader.getConfig();
        expect(config.name).toBe('intune-packaging-assistant');
    });
});
describe('loadConfig helper', () => {
    it('should load default config', () => {
        const config = loadConfig();
        expect(config.name).toBe('intune-packaging-assistant');
    });
});
//# sourceMappingURL=config-loader.test.js.map