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
describe('Transport Configuration', () => {
    afterEach(() => {
        if (existsSync(TEST_CONFIG_PATH)) {
            unlinkSync(TEST_CONFIG_PATH);
        }
        // Clean up environment variables
        delete process.env.TRANSPORT_TYPE;
        delete process.env.TRANSPORT_PORT;
        delete process.env.TRANSPORT_HOST;
    });
    it('should return default transport config', () => {
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.transport.type).toBe('stdio');
        expect(config.transport.port).toBe(8081);
        expect(config.transport.host).toBe('127.0.0.1');
        expect(config.transport.sessionTimeoutMs).toBe(30 * 60 * 1000);
    });
    it('should load transport config from YAML', () => {
        const yamlContent = `
transport:
  type: http
  port: 9000
  host: 0.0.0.0
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        const config = loader.load(TEST_CONFIG_PATH);
        expect(config.transport.type).toBe('http');
        expect(config.transport.port).toBe(9000);
        expect(config.transport.host).toBe('0.0.0.0');
    });
    it('should support both transport type', () => {
        const yamlContent = `
transport:
  type: both
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        const config = loader.load(TEST_CONFIG_PATH);
        expect(config.transport.type).toBe('both');
    });
    it('should override transport type with TRANSPORT_TYPE env var', () => {
        const yamlContent = `
transport:
  type: stdio
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        process.env.TRANSPORT_TYPE = 'http';
        const loader = new ConfigLoader();
        const config = loader.load(TEST_CONFIG_PATH);
        expect(config.transport.type).toBe('http');
    });
    it('should override transport port with TRANSPORT_PORT env var', () => {
        process.env.TRANSPORT_PORT = '3000';
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.transport.port).toBe(3000);
    });
    it('should override transport host with TRANSPORT_HOST env var', () => {
        process.env.TRANSPORT_HOST = '0.0.0.0';
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.transport.host).toBe('0.0.0.0');
    });
    it('should ignore invalid TRANSPORT_TYPE values', () => {
        process.env.TRANSPORT_TYPE = 'invalid';
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.transport.type).toBe('stdio');
    });
    it('should ignore invalid TRANSPORT_PORT values', () => {
        process.env.TRANSPORT_PORT = 'not-a-number';
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.transport.port).toBe(8081);
    });
    it('should reject port numbers out of range', () => {
        process.env.TRANSPORT_PORT = '70000';
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.transport.port).toBe(8081);
    });
    it('should reject negative port numbers', () => {
        process.env.TRANSPORT_PORT = '-1';
        const loader = new ConfigLoader();
        const config = loader.load();
        expect(config.transport.port).toBe(8081);
    });
    it('should throw on invalid transport type in YAML', () => {
        const yamlContent = `
transport:
  type: invalid
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        expect(() => loader.load(TEST_CONFIG_PATH)).toThrow();
    });
    it('should throw on invalid port in YAML', () => {
        const yamlContent = `
transport:
  port: 70000
`;
        writeFileSync(TEST_CONFIG_PATH, yamlContent);
        const loader = new ConfigLoader();
        expect(() => loader.load(TEST_CONFIG_PATH)).toThrow();
    });
});
//# sourceMappingURL=config-loader.test.js.map